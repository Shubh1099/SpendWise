package com.expensetracker.service;

import com.expensetracker.dto.ReceiptScanResponse;
import com.expensetracker.dto.TransactionResponse;
import com.expensetracker.dto.ReceiptResponse;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.model.Category;
import com.expensetracker.model.Receipt;
import com.expensetracker.model.Transaction;
import com.expensetracker.model.User;
import com.expensetracker.repository.CategoryRepository;
import com.expensetracker.repository.ReceiptRepository;
import com.expensetracker.repository.TransactionRepository;
import com.expensetracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SmartTransactionService {

    private final ReceiptScanService receiptScanService;
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final ReceiptRepository receiptRepository;
    private final FileStorageService fileStorageService;

    @Transactional
    public TransactionResponse createFromReceipt(MultipartFile file, BigDecimal userShare, UUID userId) {
        ReceiptScanResponse scanResult = receiptScanService.scanReceipt(file);

        // Determine amount
        BigDecimal amount = (userShare != null && userShare.compareTo(BigDecimal.ZERO) > 0)
                ? userShare
                : scanResult.getExtractedAmount();

        // Match category by name (case-insensitive)
        Category category = categoryRepository.findAll().stream()
                .filter(c -> c.getName().equalsIgnoreCase(scanResult.getSuggestedCategory()))
                .findFirst()
                .orElseGet(() -> categoryRepository.findAll().stream()
                        .filter(c -> c.getName().equalsIgnoreCase("Other"))
                        .findFirst()
                        .orElseThrow(() -> new ResourceNotFoundException("No default category 'Other' found")));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Create transaction
        Transaction transaction = Transaction.builder()
                .amount(amount)
                .description(scanResult.getExtractedDescription())
                .category(category)
                .user(user)
                .transactionDate(scanResult.getExtractedDate())
                .source("RECEIPT")
                .build();

        transaction = transactionRepository.save(transaction);

        // Store receipt file and link to transaction
        String s3Key = fileStorageService.storeFile(file);

        Receipt receipt = Receipt.builder()
                .transaction(transaction)
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .s3Key(s3Key)
                .build();

        receipt = receiptRepository.save(receipt);

        return TransactionResponse.builder()
                .id(transaction.getId())
                .amount(transaction.getAmount())
                .description(transaction.getDescription())
                .categoryId(category.getId())
                .categoryName(category.getName())
                .categoryIcon(category.getIcon())
                .transactionDate(transaction.getTransactionDate())
                .createdAt(transaction.getCreatedAt())
                .updatedAt(transaction.getUpdatedAt())
                .source(transaction.getSource())
                .receipt(ReceiptResponse.builder()
                        .id(receipt.getId())
                        .transactionId(transaction.getId())
                        .fileName(receipt.getFileName())
                        .fileType(receipt.getFileType())
                        .downloadUrl(fileStorageService.generatePresignedUrl(receipt.getS3Key()))
                        .uploadedAt(receipt.getUploadedAt())
                        .build())
                .build();
    }

    private UUID getCurrentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return user.getId();
    }
}
