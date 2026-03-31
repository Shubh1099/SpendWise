package com.expensetracker.service.impl;

import com.expensetracker.dto.ChangePasswordResponse;
import com.expensetracker.dto.SendOtpResponse;
import com.expensetracker.exception.BadRequestException;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.model.PasswordResetOtp;
import com.expensetracker.model.User;
import com.expensetracker.repository.PasswordResetOtpRepository;
import com.expensetracker.repository.UserRepository;
import com.expensetracker.service.OtpService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OtpServiceImpl implements OtpService {

    private final PasswordResetOtpRepository otpRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;
    private final PasswordEncoder passwordEncoder;

    @Value("${otp.expiry-minutes:5}")
    private int otpExpiryMinutes;

    @Override
    @Transactional
    public SendOtpResponse sendOtp(UUID userId, String email) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!user.getEmail().equalsIgnoreCase(email)) {
            throw new BadRequestException("Email does not match your account email");
        }

        // Clean up old unused OTPs
        otpRepository.deleteByUserIdAndUsedFalse(userId);

        // Generate 6-digit OTP
        String otpCode = String.format("%06d", new SecureRandom().nextInt(1_000_000));

        // Save OTP
        PasswordResetOtp otp = PasswordResetOtp.builder()
                .user(user)
                .otpCode(otpCode)
                .expiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes))
                .used(false)
                .build();
        otpRepository.save(otp);

        // Send email
        sendOtpEmail(user.getFullName(), user.getEmail(), otpCode);

        return SendOtpResponse.builder()
                .message("OTP sent to your email")
                .expiresInMinutes(otpExpiryMinutes)
                .build();
    }

    @Override
    @Transactional
    public ChangePasswordResponse verifyOtpAndChangePassword(UUID userId, String otp, String newPassword, String confirmNewPassword) {
        if (!newPassword.equals(confirmNewPassword)) {
            throw new BadRequestException("Passwords do not match");
        }

        if (newPassword.length() < 8) {
            throw new BadRequestException("Password must be at least 8 characters long");
        }
        if (!newPassword.matches(".*[A-Z].*")) {
            throw new BadRequestException("Password must contain at least one uppercase letter");
        }
        if (!newPassword.matches(".*[a-z].*")) {
            throw new BadRequestException("Password must contain at least one lowercase letter");
        }
        if (!newPassword.matches(".*\\d.*")) {
            throw new BadRequestException("Password must contain at least one digit");
        }

        PasswordResetOtp otpRecord = otpRepository.findByUserIdAndOtpCodeAndUsedFalse(userId, otp)
                .orElseThrow(() -> new BadRequestException("Invalid OTP"));

        if (otpRecord.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }

        // Mark OTP as used
        otpRecord.setUsed(true);
        otpRepository.save(otpRecord);

        // Update password
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ChangePasswordResponse.builder()
                .message("Password changed successfully")
                .build();
    }

    private void sendOtpEmail(String fullName, String email, String otpCode) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(email);
            helper.setSubject("ExpenseTracker — Password Change OTP");
            helper.setText(
                    "<div style=\"font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;\">" +
                    "<p>Hi " + fullName + ",</p>" +
                    "<p>Your one-time password for changing your account password is:</p>" +
                    "<div style=\"font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; " +
                    "padding: 16px; margin: 16px 0; background: #f4f4f4; border-radius: 8px;\">" + otpCode + "</div>" +
                    "<p>This code expires in 5 minutes. If you did not request this, please ignore this email.</p>" +
                    "<p>— ExpenseTracker</p>" +
                    "</div>",
                    true
            );

            mailSender.send(message);
        } catch (Exception e) {
            throw new BadRequestException("Failed to send OTP email. Please check mail configuration.");
        }
    }
}
