package com.expensetracker.controller;

import com.expensetracker.dto.TelegramLinkCodeResponse;
import com.expensetracker.dto.TelegramLinkResponse;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.model.User;
import com.expensetracker.repository.UserRepository;
import com.expensetracker.service.TelegramLinkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/telegram")
@RequiredArgsConstructor
public class TelegramLinkController {

    private final TelegramLinkService telegramLinkService;
    private final UserRepository userRepository;

    @PostMapping("/generate-code")
    public ResponseEntity<TelegramLinkCodeResponse> generateCode() {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(telegramLinkService.generateLinkCode(userId));
    }

    @GetMapping("/status")
    public ResponseEntity<TelegramLinkResponse> getStatus() {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(telegramLinkService.getLinkStatus(userId));
    }

    @DeleteMapping("/unlink")
    public ResponseEntity<Void> unlink() {
        UUID userId = getCurrentUserId();
        telegramLinkService.unlinkTelegram(userId);
        return ResponseEntity.noContent().build();
    }

    private UUID getCurrentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return user.getId();
    }
}
