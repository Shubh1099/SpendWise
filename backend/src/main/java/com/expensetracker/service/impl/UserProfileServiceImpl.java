package com.expensetracker.service.impl;

import com.expensetracker.dto.UserProfileResponse;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.model.User;
import com.expensetracker.repository.UserRepository;
import com.expensetracker.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserProfileServiceImpl implements UserProfileService {

    private final UserRepository userRepository;

    @Override
    public UserProfileResponse getProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return UserProfileResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .avatarInitials(computeInitials(user.getFullName()))
                .build();
    }

    private String computeInitials(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return "??";
        }
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length >= 2) {
            return (String.valueOf(parts[0].charAt(0)) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
        // Single name: use first two letters
        String name = parts[0];
        if (name.length() >= 2) {
            return name.substring(0, 2).toUpperCase();
        }
        return (name.charAt(0) + "").toUpperCase();
    }
}
