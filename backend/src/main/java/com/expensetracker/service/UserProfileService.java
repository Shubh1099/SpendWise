package com.expensetracker.service;

import com.expensetracker.dto.UserProfileResponse;

import java.util.UUID;

public interface UserProfileService {

    UserProfileResponse getProfile(UUID userId);
}
