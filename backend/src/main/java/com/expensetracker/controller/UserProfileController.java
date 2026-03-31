package com.expensetracker.controller;

import com.expensetracker.dto.*;
import com.expensetracker.model.User;
import com.expensetracker.repository.UserRepository;
import com.expensetracker.service.OtpService;
import com.expensetracker.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;
    private final OtpService otpService;
    private final UserRepository userRepository;

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile() {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(userProfileService.getProfile(userId));
    }

    @PostMapping("/change-password/send-otp")
    public ResponseEntity<SendOtpResponse> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(otpService.sendOtp(userId, request.getEmail()));
    }

    @PostMapping("/change-password/verify")
    public ResponseEntity<ChangePasswordResponse> verifyOtpAndChangePassword(
            @Valid @RequestBody VerifyOtpAndChangePasswordRequest request) {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(otpService.verifyOtpAndChangePassword(
                userId, request.getOtp(), request.getNewPassword(), request.getConfirmNewPassword()));
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }
}
