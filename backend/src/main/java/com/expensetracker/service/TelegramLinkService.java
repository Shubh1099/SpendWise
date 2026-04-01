package com.expensetracker.service;

import com.expensetracker.dto.TelegramLinkCodeResponse;
import com.expensetracker.dto.TelegramLinkResponse;
import com.expensetracker.exception.BadRequestException;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.model.TelegramLink;
import com.expensetracker.model.TelegramLinkCode;
import com.expensetracker.model.User;
import com.expensetracker.repository.TelegramLinkCodeRepository;
import com.expensetracker.repository.TelegramLinkRepository;
import com.expensetracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramLinkService {

    private final TelegramLinkRepository telegramLinkRepository;
    private final TelegramLinkCodeRepository telegramLinkCodeRepository;
    private final UserRepository userRepository;

    @Value("${telegram.bot.username:your_bot_username}")
    private String botUsername;

    private final Random random = new Random();

    @Transactional
    public TelegramLinkCodeResponse generateLinkCode(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Delete any existing unused codes for this user
        telegramLinkCodeRepository.deleteByUserIdAndUsedFalse(userId);

        // Generate a random 6-digit numeric code
        String code = String.format("%06d", random.nextInt(1_000_000));

        TelegramLinkCode linkCode = TelegramLinkCode.builder()
                .user(user)
                .code(code)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .build();

        linkCode = telegramLinkCodeRepository.save(linkCode);

        return TelegramLinkCodeResponse.builder()
                .code(linkCode.getCode())
                .expiresAt(linkCode.getExpiresAt())
                .botUrl("https://t.me/" + botUsername)
                .build();
    }

    @Transactional
    public boolean verifyAndLink(String code, Long chatId, String telegramUsername) {
        Optional<TelegramLinkCode> optCode = telegramLinkCodeRepository
                .findByCodeAndUsedFalseAndExpiresAtAfter(code, LocalDateTime.now());

        if (optCode.isEmpty()) {
            return false;
        }

        TelegramLinkCode linkCode = optCode.get();

        // Check if this Telegram account is already linked to another user
        Optional<TelegramLink> existingLink = telegramLinkRepository.findByTelegramChatId(chatId);
        if (existingLink.isPresent() && !existingLink.get().getUser().getId().equals(linkCode.getUser().getId())) {
            return false;
        }

        // Remove any existing link for this user (re-linking)
        telegramLinkRepository.findByUserId(linkCode.getUser().getId())
                .ifPresent(telegramLinkRepository::delete);

        // Create new link
        TelegramLink link = TelegramLink.builder()
                .user(linkCode.getUser())
                .telegramChatId(chatId)
                .telegramUsername(telegramUsername)
                .build();

        telegramLinkRepository.save(link);

        // Mark code as used
        linkCode.setUsed(true);
        telegramLinkCodeRepository.save(linkCode);

        return true;
    }

    public boolean isChatIdAlreadyLinkedToOtherUser(Long chatId, UUID userId) {
        Optional<TelegramLink> existingLink = telegramLinkRepository.findByTelegramChatId(chatId);
        return existingLink.isPresent() && !existingLink.get().getUser().getId().equals(userId);
    }

    public Optional<User> findUserByChatId(Long chatId) {
        return telegramLinkRepository.findByTelegramChatIdWithUser(chatId)
                .map(TelegramLink::getUser);
    }

    @Transactional
    public void unlinkTelegram(UUID userId) {
        telegramLinkRepository.deleteByUserId(userId);
    }

    public boolean isLinked(UUID userId) {
        return telegramLinkRepository.existsByUserId(userId);
    }

    public TelegramLinkResponse getLinkStatus(UUID userId) {
        Optional<TelegramLink> link = telegramLinkRepository.findByUserId(userId);

        if (link.isPresent()) {
            TelegramLink tl = link.get();
            return TelegramLinkResponse.builder()
                    .linked(true)
                    .telegramUsername(tl.getTelegramUsername())
                    .linkedAt(tl.getLinkedAt())
                    .build();
        }

        return TelegramLinkResponse.builder()
                .linked(false)
                .build();
    }
}
