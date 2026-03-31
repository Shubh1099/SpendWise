package com.expensetracker.service.impl;

import com.expensetracker.dto.MonthlyExpenseSummary;
import com.expensetracker.dto.ReceiptResponse;
import com.expensetracker.dto.TransactionRequest;
import com.expensetracker.dto.TransactionResponse;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.model.Category;
import com.expensetracker.model.Receipt;
import com.expensetracker.model.Transaction;
import com.expensetracker.model.User;
import com.expensetracker.repository.CategoryRepository;
import com.expensetracker.repository.TransactionRepository;
import com.expensetracker.repository.UserRepository;
import com.expensetracker.service.FileStorageService;
import com.expensetracker.service.TransactionService;
import com.opencsv.CSVWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransactionServiceImpl implements TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    @Override
    @Transactional
    public TransactionResponse createTransaction(TransactionRequest request) {
        Category category = findCategoryById(request.getCategoryId());
        User user = getCurrentUser();

        Transaction transaction = Transaction.builder()
                .amount(request.getAmount())
                .description(request.getDescription())
                .category(category)
                .transactionDate(request.getTransactionDate())
                .user(user)
                .build();

        return toResponse(transactionRepository.save(transaction));
    }

    @Override
    public List<TransactionResponse> getTransactions(Integer month, Integer year, UUID categoryId) {
        User user = getCurrentUser();
        int resolvedYear = (year != null) ? year : LocalDate.now().getYear();
        int resolvedMonth = (month != null) ? month : LocalDate.now().getMonthValue();

        List<Transaction> transactions;

        if (categoryId != null) {
            findCategoryById(categoryId);
            transactions = transactionRepository.findByUserIdAndYearAndMonth(user.getId(), resolvedYear, resolvedMonth).stream()
                    .filter(t -> t.getCategory().getId().equals(categoryId))
                    .toList();
        } else {
            transactions = transactionRepository.findByUserIdAndYearAndMonth(user.getId(), resolvedYear, resolvedMonth);
        }

        return transactions.stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public TransactionResponse getTransactionById(UUID id) {
        return toResponse(findTransactionById(id));
    }

    @Override
    @Transactional
    public TransactionResponse updateTransaction(UUID id, TransactionRequest request) {
        Transaction transaction = findTransactionById(id);
        Category category = findCategoryById(request.getCategoryId());

        transaction.setAmount(request.getAmount());
        transaction.setDescription(request.getDescription());
        transaction.setCategory(category);
        transaction.setTransactionDate(request.getTransactionDate());

        return toResponse(transactionRepository.save(transaction));
    }

    @Override
    @Transactional
    public void deleteTransaction(UUID id) {
        Transaction transaction = findTransactionById(id);

        if (transaction.getReceipt() != null) {
            deleteReceiptFile(transaction.getReceipt());
        }

        transactionRepository.delete(transaction);
    }

    @Override
    public MonthlyExpenseSummary getMonthlySummary(Integer month, Integer year) {
        User user = getCurrentUser();
        int resolvedYear = (year != null) ? year : LocalDate.now().getYear();
        int resolvedMonth = (month != null) ? month : LocalDate.now().getMonthValue();

        List<Transaction> transactions = transactionRepository.findByUserIdAndYearAndMonth(user.getId(), resolvedYear, resolvedMonth);

        BigDecimal totalAmount = transactions.stream()
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<Category, List<Transaction>> byCategory = transactions.stream()
                .collect(Collectors.groupingBy(Transaction::getCategory));

        List<MonthlyExpenseSummary.CategoryBreakdown> breakdowns = byCategory.entrySet().stream()
                .map(entry -> {
                    Category cat = entry.getKey();
                    List<Transaction> catTransactions = entry.getValue();
                    BigDecimal catTotal = catTransactions.stream()
                            .map(Transaction::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return MonthlyExpenseSummary.CategoryBreakdown.builder()
                            .categoryName(cat.getName())
                            .categoryIcon(cat.getIcon())
                            .amount(catTotal)
                            .count(catTransactions.size())
                            .build();
                })
                .toList();

        return MonthlyExpenseSummary.builder()
                .year(resolvedYear)
                .month(resolvedMonth)
                .totalAmount(totalAmount)
                .transactionCount(transactions.size())
                .categoryBreakdown(breakdowns)
                .build();
    }

    @Override
    public byte[] exportTransactionsToCsv(Integer month, Integer year, UUID categoryId) {
        User user = getCurrentUser();
        List<Transaction> transactions;

        if (month != null && year != null) {
            transactions = transactionRepository.findByUserIdAndYearAndMonth(user.getId(), year, month);
        } else {
            transactions = transactionRepository.findByUserIdOrderByTransactionDateDesc(user.getId());
        }

        if (categoryId != null) {
            findCategoryById(categoryId);
            transactions = transactions.stream()
                    .filter(t -> t.getCategory().getId().equals(categoryId))
                    .toList();
        }

        transactions = transactions.stream()
                .sorted(Comparator.comparing(Transaction::getTransactionDate).reversed())
                .toList();

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             CSVWriter writer = new CSVWriter(new OutputStreamWriter(baos, StandardCharsets.UTF_8))) {

            writer.writeNext(new String[]{"Date", "Description", "Category", "Amount", "Has Receipt"});

            for (Transaction t : transactions) {
                writer.writeNext(new String[]{
                        t.getTransactionDate().toString(),
                        t.getDescription(),
                        t.getCategory().getName(),
                        t.getAmount().toString(),
                        t.getReceipt() != null ? "Yes" : "No"
                });
            }

            writer.flush();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate CSV export", e);
        }
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Transaction findTransactionById(UUID id) {
        User user = getCurrentUser();
        return transactionRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + id));
    }

    private Category findCategoryById(UUID categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
    }

    private void deleteReceiptFile(Receipt receipt) {
        try {
            fileStorageService.deleteFile(receipt.getS3Key());
        } catch (Exception e) {
            // Log but don't fail the transaction delete for a file cleanup issue
        }
    }

    private TransactionResponse toResponse(Transaction transaction) {
        TransactionResponse.TransactionResponseBuilder builder = TransactionResponse.builder()
                .id(transaction.getId())
                .amount(transaction.getAmount())
                .description(transaction.getDescription())
                .categoryId(transaction.getCategory().getId())
                .categoryName(transaction.getCategory().getName())
                .categoryIcon(transaction.getCategory().getIcon())
                .transactionDate(transaction.getTransactionDate())
                .createdAt(transaction.getCreatedAt())
                .updatedAt(transaction.getUpdatedAt());

        if (transaction.getReceipt() != null) {
            Receipt r = transaction.getReceipt();
            builder.receipt(ReceiptResponse.builder()
                    .id(r.getId())
                    .transactionId(transaction.getId())
                    .fileName(r.getFileName())
                    .fileType(r.getFileType())
                    .downloadUrl(fileStorageService.generatePresignedUrl(r.getS3Key()))
                    .uploadedAt(r.getUploadedAt())
                    .build());
        }

        return builder.build();
    }
}
