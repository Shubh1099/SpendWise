package com.expensetracker.controller;

import com.expensetracker.dto.ReceiptResponse;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.model.Receipt;
import com.expensetracker.model.Transaction;
import com.expensetracker.model.User;
import com.expensetracker.repository.ReceiptRepository;
import com.expensetracker.repository.TransactionRepository;
import com.expensetracker.repository.UserRepository;
import com.expensetracker.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/transactions/{transactionId}/receipt")
@RequiredArgsConstructor
public class ReceiptController {

    private final TransactionRepository transactionRepository;
    private final ReceiptRepository receiptRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<ReceiptResponse> uploadReceipt(
            @PathVariable UUID transactionId,
            @RequestParam("file") MultipartFile file) {

        Transaction transaction = findTransaction(transactionId);

        // Replace existing receipt if present
        receiptRepository.findByTransactionId(transactionId).ifPresent(existing -> {
            fileStorageService.deleteFile(existing.getS3Key());
            receiptRepository.delete(existing);
            receiptRepository.flush();
        });

        String s3Key = fileStorageService.storeFile(file);

        Receipt receipt = Receipt.builder()
                .transaction(transaction)
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .s3Key(s3Key)
                .build();

        receipt = receiptRepository.save(receipt);

        return ResponseEntity.status(201).body(toResponse(receipt, transactionId));
    }

    @GetMapping
    public ResponseEntity<ReceiptResponse> getReceipt(@PathVariable UUID transactionId) {
        findTransaction(transactionId);
        Receipt receipt = findReceipt(transactionId);

        return ResponseEntity.ok(toResponse(receipt, transactionId));
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<Void> deleteReceipt(@PathVariable UUID transactionId) {
        findTransaction(transactionId);
        Receipt receipt = findReceipt(transactionId);

        fileStorageService.deleteFile(receipt.getS3Key());
        receiptRepository.delete(receipt);

        return ResponseEntity.noContent().build();
    }

    private Transaction findTransaction(UUID transactionId) {
        User user = getCurrentUser();
        return transactionRepository.findByIdAndUserId(transactionId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Transaction not found with id: " + transactionId));
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Receipt findReceipt(UUID transactionId) {
        return receiptRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Receipt not found for transaction: " + transactionId));
    }

    private ReceiptResponse toResponse(Receipt receipt, UUID transactionId) {
        return ReceiptResponse.builder()
                .id(receipt.getId())
                .transactionId(transactionId)
                .fileName(receipt.getFileName())
                .fileType(receipt.getFileType())
                .downloadUrl(fileStorageService.generatePresignedUrl(receipt.getS3Key()))
                .uploadedAt(receipt.getUploadedAt())
                .build();
    }
}
