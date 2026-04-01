package com.expensetracker.repository;

import com.expensetracker.model.TelegramLinkCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TelegramLinkCodeRepository extends JpaRepository<TelegramLinkCode, UUID> {

    Optional<TelegramLinkCode> findByCodeAndUsedFalseAndExpiresAtAfter(String code, LocalDateTime now);

    void deleteByUserIdAndUsedFalse(UUID userId);

    void deleteByExpiresAtBefore(LocalDateTime now);
}
