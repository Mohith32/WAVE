package com.wave.wave.controller;

import com.wave.wave.dto.ApiResponse;
import com.wave.wave.service.FileStorageService;
import com.wave.wave.service.FileStorageService.StoredFile;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Path;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private static final long MAX_FILE_SIZE = 50L * 1024 * 1024;

    @Autowired
    private FileStorageService fileStorageService;

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("No file provided"));
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body(ApiResponse.error("File too large (max 50MB)"));
        }
        try {
            StoredFile stored = fileStorageService.storeFile(file);
            return ResponseEntity.ok(ApiResponse.ok("File uploaded", Map.of(
                    "fileName", stored.fileName(),
                    "originalName", file.getOriginalFilename() != null ? file.getOriginalFilename() : stored.fileName(),
                    "fileSize", String.valueOf(stored.size()),
                    "fileUrl", stored.fileUrl()
            )));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to upload file"));
        }
    }

    /**
     * For local storage, streams the file. For Supabase, 302-redirects to the
     * public Supabase URL so we don't proxy bytes through our (small) server.
     */
    @GetMapping("/{fileName}")
    public ResponseEntity<Resource> getFile(@PathVariable String fileName) {
        if (fileStorageService.isSupabase()) {
            String url = fileStorageService.getPublicUrl(fileName);
            return ResponseEntity.status(302).location(URI.create(url)).build();
        }
        try {
            Path filePath = fileStorageService.getLocalFilePath(fileName);
            if (filePath == null) return ResponseEntity.notFound().build();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists()) {
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000, immutable")
                        .contentType(MediaType.APPLICATION_OCTET_STREAM)
                        .body(resource);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
