package com.expensetracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptScanResponse {

    private String extractedDescription;
    private BigDecimal extractedAmount;
    private LocalDate extractedDate;
    private String suggestedCategory;
    private String confidence;
    private List<LineItem> allItems;
}
