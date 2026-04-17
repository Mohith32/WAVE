package com.wave.wave.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "wave.ratelimit")
public class RateLimitProperties {

    private final Bucket auth = new Bucket(10, 60);
    private final Bucket upload = new Bucket(30, 60);

    public Bucket getAuth() { return auth; }
    public Bucket getUpload() { return upload; }

    public static class Bucket {
        private int capacity;
        private int refillSeconds;

        public Bucket() {}
        public Bucket(int capacity, int refillSeconds) {
            this.capacity = capacity;
            this.refillSeconds = refillSeconds;
        }

        public int getCapacity() { return capacity; }
        public void setCapacity(int capacity) { this.capacity = capacity; }
        public int getRefillSeconds() { return refillSeconds; }
        public void setRefillSeconds(int refillSeconds) { this.refillSeconds = refillSeconds; }
    }
}
