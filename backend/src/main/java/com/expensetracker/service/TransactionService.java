package com.expensetracker.service;

import com.expensetracker.dto.MonthlyExpenseSummary;
import com.expensetracker.dto.TransactionRequest;
import com.expensetracker.dto.TransactionResponse;

import java.util.List;
import java.util.UUID;

public interface TransactionService {

    TransactionResponse createTransaction(TransactionRequest request);

    List<TransactionResponse> getTransactions(Integer month, Integer year, UUID categoryId);

    TransactionResponse getTransactionById(UUID id);

    TransactionResponse updateTransaction(UUID id, TransactionRequest request);

    void deleteTransaction(UUID id);

    MonthlyExpenseSummary getMonthlySummary(Integer month, Integer year);

    byte[] exportTransactionsToCsv(Integer month, Integer year, UUID categoryId);
}
