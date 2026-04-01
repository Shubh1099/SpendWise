package com.expensetracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedTransaction {

    private boolean isTransaction;
    private BigDecimal amount;
    private String type;
    private String merchant;
    private String description;
    private LocalDate date;
    private String suggestedCategory;
    private String confidence;
}
