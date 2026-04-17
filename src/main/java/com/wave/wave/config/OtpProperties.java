package com.wave.wave.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "wave.otp")
public class OtpProperties {

    private int expirationMinutes = 10;
    private int verifiedWindowMinutes = 30;
    private int maxAttempts = 5;
    private boolean requireVerification = true;

    public int getExpirationMinutes() { return expirationMinutes; }
    public void setExpirationMinutes(int expirationMinutes) { this.expirationMinutes = expirationMinutes; }
    public int getVerifiedWindowMinutes() { return verifiedWindowMinutes; }
    public void setVerifiedWindowMinutes(int verifiedWindowMinutes) { this.verifiedWindowMinutes = verifiedWindowMinutes; }
    public int getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
    public boolean isRequireVerification() { return requireVerification; }
    public void setRequireVerification(boolean requireVerification) { this.requireVerification = requireVerification; }
}
