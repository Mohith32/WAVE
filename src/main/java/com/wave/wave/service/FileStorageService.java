package com.wave.wave.service;

import com.wave.wave.config.StorageProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.UUID;

/**
 * Pluggable file storage: local disk (dev) or Supabase Storage (prod, free tier).
 * Selection via wave.storage.backend = "local" | "supabase".
 */
@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    @Autowired
    private StorageProperties props;

    private Path localPath;
    private WebClient supabaseClient;

    @PostConstruct
    public void init() {
        if ("local".equalsIgnoreCase(props.getBackend())) {
            localPath = Paths.get(props.getLocal().getDir()).toAbsolutePath().normalize();
            try {
                Files.createDirectories(localPath);
                log.info("File storage: LOCAL at {}", localPath);
            } catch (IOException e) {
                throw new IllegalStateException("Could not create upload directory", e);
            }
        } else if ("supabase".equalsIgnoreCase(props.getBackend())) {
            String url = props.getSupabase().getUrl();
            String key = props.getSupabase().getServiceKey();
            if (url.isBlank() || key.isBlank()) {
                throw new IllegalStateException(
                        "STORAGE_BACKEND=supabase but SUPABASE_URL/SUPABASE_SERVICE_KEY are missing");
            }
            supabaseClient = WebClient.builder()
                    .baseUrl(url)
                    .defaultHeader("apikey", key)
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + key)
                    .build();
            log.info("File storage: SUPABASE bucket={} public={}",
                    props.getSupabase().getBucket(), props.getSupabase().isPublic());
        } else {
            throw new IllegalStateException("Unknown wave.storage.backend: " + props.getBackend());
        }
    }

    public StoredFile storeFile(MultipartFile file) throws IOException {
        String originalName = file.getOriginalFilename();
        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf("."));
        }
        String storedName = UUID.randomUUID() + extension;

        if ("supabase".equalsIgnoreCase(props.getBackend())) {
            return uploadToSupabase(storedName, file);
        } else {
            return uploadToLocal(storedName, file);
        }
    }

    private StoredFile uploadToLocal(String storedName, MultipartFile file) throws IOException {
        Path target = localPath.resolve(storedName);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return new StoredFile(storedName, "/api/files/" + storedName, file.getSize());
    }

    private StoredFile uploadToSupabase(String storedName, MultipartFile file) throws IOException {
        String bucket = props.getSupabase().getBucket();
        String path = "/storage/v1/object/" + bucket + "/" + storedName;
        MediaType contentType = file.getContentType() != null
                ? MediaType.parseMediaType(file.getContentType())
                : MediaType.APPLICATION_OCTET_STREAM;

        byte[] bytes = file.getBytes();
        try {
            supabaseClient.post()
                    .uri(path)
                    .contentType(contentType)
                    .bodyValue(bytes)
                    .retrieve()
                    .toBodilessEntity()
                    .block(Duration.ofSeconds(30));
        } catch (Exception e) {
            log.error("Supabase upload failed for {}: {}", storedName, e.getMessage());
            throw new IOException("Upload to Supabase failed", e);
        }
        return new StoredFile(storedName, getPublicUrl(storedName), file.getSize());
    }

    public String getPublicUrl(String fileName) {
        if ("supabase".equalsIgnoreCase(props.getBackend())) {
            String base = props.getSupabase().getUrl();
            String bucket = props.getSupabase().getBucket();
            if (props.getSupabase().isPublic()) {
                return base + "/storage/v1/object/public/" + bucket + "/" + fileName;
            } else {
                return base + "/storage/v1/object/authenticated/" + bucket + "/" + fileName;
            }
        }
        return "/api/files/" + fileName;
    }

    public Path getLocalFilePath(String fileName) {
        if (!"local".equalsIgnoreCase(props.getBackend())) return null;
        return localPath.resolve(fileName).normalize();
    }

    public boolean isSupabase() {
        return "supabase".equalsIgnoreCase(props.getBackend());
    }

    public record StoredFile(String fileName, String fileUrl, long size) {}
}
