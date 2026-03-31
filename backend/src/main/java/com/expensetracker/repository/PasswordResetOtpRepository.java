package com.expensetracker.repository;

import com.expensetracker.model.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, UUID> {

    Optional<PasswordResetOtp> findByUserIdAndOtpCodeAndUsedFalse(UUID userId, String otpCode);

    void deleteByUserIdAndUsedFalse(UUID userId);
}
