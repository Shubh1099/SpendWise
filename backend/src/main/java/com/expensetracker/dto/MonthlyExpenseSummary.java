package com.expensetracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyExpenseSummary {

    private int year;
    private int month;
    private BigDecimal totalAmount;
    private int transactionCount;
    private List<CategoryBreakdown> categoryBreakdown;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryBreakdown {
        private String categoryName;
        private String categoryIcon;
        private BigDecimal amount;
        private int count;
    }
}
