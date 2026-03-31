package com.expensetracker.repository;

import com.expensetracker.model.Receipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReceiptRepository extends JpaRepository<Receipt, UUID> {

    Optional<Receipt> findByTransactionId(UUID transactionId);
}
