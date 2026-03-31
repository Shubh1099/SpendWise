package com.expensetracker.service;

import com.expensetracker.dto.ChangePasswordResponse;
import com.expensetracker.dto.SendOtpResponse;

import java.util.UUID;

public interface OtpService {

    SendOtpResponse sendOtp(UUID userId, String email);

    ChangePasswordResponse verifyOtpAndChangePassword(UUID userId, String otp, String newPassword, String confirmNewPassword);
}
