package com.wave.wave.service;

import com.wave.wave.config.MailProperties;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private MailProperties mailProps;

    @Async("taskExecutor")
    public void sendOtp(String toEmail, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(mailProps.getFrom(), mailProps.getFromName());
            helper.setTo(toEmail);
            helper.setSubject("Your Wave verification code: " + code);
            helper.setText(buildHtml(code), true);
            mailSender.send(message);
            log.info("OTP email sent to {}", toEmail);
        } catch (UnsupportedEncodingException e) {
            log.error("Bad sender encoding for OTP email to {}: {}", toEmail, e.getMessage());
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildHtml(String code) {
        return "<!DOCTYPE html><html><body style=\"margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;\">"
                + "<div style=\"max-width:480px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);\">"
                + "<div style=\"background:#3390EC;padding:28px 24px;text-align:center;\">"
                + "<div style=\"display:inline-block;width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.15);line-height:56px;color:#fff;font-size:26px;font-weight:600;\">W</div>"
                + "<h1 style=\"color:#ffffff;margin:16px 0 0;font-size:22px;font-weight:600;\">Wave</h1>"
                + "</div>"
                + "<div style=\"padding:32px 28px;\">"
                + "<h2 style=\"color:#0f1419;font-size:18px;margin:0 0 8px;font-weight:600;\">Verify your email</h2>"
                + "<p style=\"color:#707579;font-size:14px;line-height:22px;margin:0 0 24px;\">Use this code to finish creating your Wave account. It expires in 10 minutes.</p>"
                + "<div style=\"background:#f4f4f5;border-radius:10px;padding:22px;text-align:center;margin-bottom:24px;\">"
                + "<div style=\"font-size:34px;font-weight:600;letter-spacing:8px;color:#0f1419;font-family:monospace;\">" + code + "</div>"
                + "</div>"
                + "<p style=\"color:#a2acb4;font-size:12px;line-height:18px;margin:0;\">If you didn't request this, you can safely ignore this email.</p>"
                + "</div>"
                + "<div style=\"background:#fafafa;padding:14px 24px;text-align:center;border-top:1px solid #f0f0f0;\">"
                + "<p style=\"color:#a2acb4;font-size:11px;margin:0;\">Wave · End-to-end encrypted messaging</p>"
                + "</div>"
                + "</div></body></html>";
    }
}
