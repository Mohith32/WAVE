package com.wave.wave.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "wave.storage")
public class StorageProperties {

    private String backend = "local";
    private final Local local = new Local();
    private final Supabase supabase = new Supabase();

    public String getBackend() { return backend; }
    public void setBackend(String backend) { this.backend = backend; }
    public Local getLocal() { return local; }
    public Supabase getSupabase() { return supabase; }

    public static class Local {
        private String dir = "./uploads";
        public String getDir() { return dir; }
        public void setDir(String dir) { this.dir = dir; }
    }

    public static class Supabase {
        private String url = "";
        private String serviceKey = "";
        private String bucket = "wave-uploads";
        private boolean publicBucket = true;

        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public String getServiceKey() { return serviceKey; }
        public void setServiceKey(String serviceKey) { this.serviceKey = serviceKey; }
        public String getBucket() { return bucket; }
        public void setBucket(String bucket) { this.bucket = bucket; }
        public boolean isPublic() { return publicBucket; }
        public void setPublic(boolean publicBucket) { this.publicBucket = publicBucket; }
    }
}
