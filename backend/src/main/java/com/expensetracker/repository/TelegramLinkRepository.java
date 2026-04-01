package com.expensetracker.repository;

import com.expensetracker.model.TelegramLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TelegramLinkRepository extends JpaRepository<TelegramLink, UUID> {

    Optional<TelegramLink> findByUserId(UUID userId);

    Optional<TelegramLink> findByTelegramChatId(Long telegramChatId);

    @Query("SELECT tl FROM TelegramLink tl JOIN FETCH tl.user WHERE tl.telegramChatId = :chatId")
    Optional<TelegramLink> findByTelegramChatIdWithUser(@Param("chatId") Long chatId);

    boolean existsByUserId(UUID userId);

    boolean existsByTelegramChatId(Long telegramChatId);

    void deleteByUserId(UUID userId);
}
