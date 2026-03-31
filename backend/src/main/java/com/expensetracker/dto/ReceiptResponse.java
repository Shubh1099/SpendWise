package com.expensetracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptResponse {

    private UUID id;
    private UUID transactionId;
    private String fileName;
    private String fileType;
    private String downloadUrl;
    private LocalDateTime uploadedAt;
}
