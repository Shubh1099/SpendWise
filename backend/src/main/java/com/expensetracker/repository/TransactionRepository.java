package com.expensetracker.repository;

import com.expensetracker.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    List<Transaction> findByCategoryId(UUID categoryId);

    List<Transaction> findByTransactionDateBetween(LocalDate start, LocalDate end);

    @Query("SELECT t FROM Transaction t WHERE YEAR(t.transactionDate) = :year AND MONTH(t.transactionDate) = :month")
    List<Transaction> findByYearAndMonth(@Param("year") int year, @Param("month") int month);

    @Query("SELECT t FROM Transaction t WHERE t.user.id = :userId AND YEAR(t.transactionDate) = :year AND MONTH(t.transactionDate) = :month")
    List<Transaction> findByUserIdAndYearAndMonth(@Param("userId") UUID userId, @Param("year") int year, @Param("month") int month);

    Optional<Transaction> findByIdAndUserId(UUID id, UUID userId);

    List<Transaction> findByUserIdOrderByTransactionDateDesc(UUID userId);

    List<Transaction> findByCategoryIdAndUserId(UUID categoryId, UUID userId);
}
