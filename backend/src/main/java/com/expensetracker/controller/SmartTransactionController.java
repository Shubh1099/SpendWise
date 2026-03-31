package com.expensetracker.controller;

import com.expensetracker.dto.ReceiptScanResponse;
import com.expensetracker.dto.TransactionResponse;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.model.User;
import com.expensetracker.repository.UserRepository;
import com.expensetracker.service.ReceiptScanService;
import com.expensetracker.service.SmartTransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/transactions/scan-receipt")
@RequiredArgsConstructor
public class SmartTransactionController {

    private final ReceiptScanService receiptScanService;
    private final SmartTransactionService smartTransactionService;
    private final UserRepository userRepository;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TransactionResponse> scanAndCreateTransaction(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "userShare", required = false) BigDecimal userShare) {

        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        TransactionResponse response = smartTransactionService.createFromReceipt(file, userShare, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReceiptScanResponse> previewReceipt(
            @RequestParam("file") MultipartFile file) {

        ReceiptScanResponse response = receiptScanService.scanReceipt(file);
        return ResponseEntity.ok(response);
    }
}
