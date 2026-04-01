package com.expensetracker.service;

import com.expensetracker.dto.ParsedTransaction;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.model.Category;
import com.expensetracker.model.Receipt;
import com.expensetracker.model.Transaction;
import com.expensetracker.model.User;
import com.expensetracker.repository.CategoryRepository;
import com.expensetracker.repository.ReceiptRepository;
import com.expensetracker.repository.TransactionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.client.okhttp.OkHttpTelegramClient;
import org.telegram.telegrambots.longpolling.BotSession;
import org.telegram.telegrambots.longpolling.interfaces.LongPollingUpdateConsumer;
import org.telegram.telegrambots.longpolling.starter.SpringLongPollingBot;
import org.telegram.telegrambots.longpolling.util.LongPollingSingleThreadUpdateConsumer;
import org.telegram.telegrambots.meta.api.methods.GetFile;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.Document;
import org.telegram.telegrambots.meta.api.objects.PhotoSize;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.math.BigDecimal;
import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
@ConditionalOnProperty(name = "telegram.bot.enabled", havingValue = "true")
@Slf4j
public class TelegramBotService implements SpringLongPollingBot, LongPollingSingleThreadUpdateConsumer {

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${telegram.bot.username}")
    private String botUsername;

    private final TelegramLinkService telegramLinkService;
    private final TransactionParserService transactionParserService;
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final ReceiptRepository receiptRepository;
    private final FileStorageService fileStorageService;

    private TelegramClient telegramClient;

    // Pending confirmations: chatId -> ParsedTransaction
    private final Map<Long, ParsedTransaction> pendingConfirmations = new ConcurrentHashMap<>();

    // Rate limiting: chatId -> list of message timestamps
    private final Map<Long, List<Instant>> rateLimitMap = new ConcurrentHashMap<>();
    private static final int RATE_LIMIT = 30;

    public TelegramBotService(
            TelegramLinkService telegramLinkService,
            TransactionParserService transactionParserService,
            TransactionRepository transactionRepository,
            CategoryRepository categoryRepository,
            ReceiptRepository receiptRepository,
            FileStorageService fileStorageService) {
        this.telegramLinkService = telegramLinkService;
        this.transactionParserService = transactionParserService;
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
        this.receiptRepository = receiptRepository;
        this.fileStorageService = fileStorageService;
    }

    @PostConstruct
    public void init() {
        this.telegramClient = new OkHttpTelegramClient(getBotToken());
        log.info("Telegram bot initialized: @{}", botUsername);
    }

    @Override
    public String getBotToken() {
        return botToken;
    }

    @Override
    public LongPollingUpdateConsumer getUpdatesConsumer() {
        return this;
    }

    @Override
    public void consume(Update update) {
        try {
            if (update.hasMessage()) {
                Long chatId = update.getMessage().getChatId();

                if (update.getMessage().hasText()) {
                    handleTextMessage(update);
                } else if (update.getMessage().hasPhoto()) {
                    handlePhotoMessage(update);
                } else if (update.getMessage().hasDocument()) {
                    handleDocumentMessage(update);
                }
            }
        } catch (Exception e) {
            log.error("Error processing Telegram update", e);
            try {
                if (update.hasMessage()) {
                    sendReply(update.getMessage().getChatId(),
                            "\u26a0\ufe0f Something went wrong. Please try again.");
                }
            } catch (Exception ex) {
                log.error("Error sending error reply", ex);
            }
        }
    }

    private void handleTextMessage(Update update) {
        String text = update.getMessage().getText().trim();
        Long chatId = update.getMessage().getChatId();
        String username = update.getMessage().getFrom().getUserName();

        if (text.startsWith("/start")) {
            handleStartCommand(chatId, text, username);
            return;
        }

        if (text.equals("/help")) {
            handleHelpCommand(chatId);
            return;
        }

        if (text.equals("/status")) {
            handleStatusCommand(chatId);
            return;
        }

        if (text.equals("/unlink")) {
            handleUnlinkCommand(chatId);
            return;
        }

        // Check for pending confirmation responses
        if (pendingConfirmations.containsKey(chatId)) {
            handleConfirmationResponse(chatId, text);
            return;
        }

        // Regular text message - check if linked
        Optional<User> userOpt = telegramLinkService.findUserByChatId(chatId);
        if (userOpt.isEmpty()) {
            sendReply(chatId, "\u274c Please link your account first. Send /start <code>");
            return;
        }

        if (isRateLimited(chatId)) {
            sendReply(chatId, "\u23f3 Rate limit reached. Try again in a few minutes.");
            return;
        }

        User user = userOpt.get();

        ParsedTransaction parsed;
        try {
            parsed = transactionParserService.parseTransactionMessage(text);
        } catch (Exception e) {
            log.error("Error calling AI service for text message", e);
            sendReply(chatId, "\u26a0\ufe0f AI service is temporarily unavailable. Please try again in a moment.");
            return;
        }

        if (!parsed.isTransaction()) {
            sendReply(chatId, "\ud83e\udd14 Doesn't look like a transaction. " +
                    "Try forwarding a bank SMS or type like: 'spent 300 on groceries'");
            return;
        }

        if ("LOW".equals(parsed.getConfidence())) {
            pendingConfirmations.put(chatId, parsed);
            sendReply(chatId, String.format(
                    "\u26a0\ufe0f I'm not very confident about this:\n" +
                    "Amount: \u20b9%s\n" +
                    "Description: %s\n" +
                    "Category: %s\n" +
                    "Date: %s\n\n" +
                    "Reply YES to save, or NO to discard.",
                    parsed.getAmount().toPlainString(),
                    parsed.getDescription(),
                    parsed.getSuggestedCategory(),
                    parsed.getDate()));
            return;
        }

        // HIGH or MEDIUM confidence - save directly
        saveTransaction(chatId, user, parsed, null);
    }

    private void handlePhotoMessage(Update update) {
        Long chatId = update.getMessage().getChatId();

        Optional<User> userOpt = telegramLinkService.findUserByChatId(chatId);
        if (userOpt.isEmpty()) {
            sendReply(chatId, "\u274c Please link your account first. Send /start <code>");
            return;
        }

        if (isRateLimited(chatId)) {
            sendReply(chatId, "\u23f3 Rate limit reached. Try again in a few minutes.");
            return;
        }

        User user = userOpt.get();

        // Get the largest photo size
        List<PhotoSize> photos = update.getMessage().getPhoto();
        PhotoSize largest = photos.stream()
                .max(Comparator.comparingInt(PhotoSize::getFileSize))
                .orElse(photos.get(photos.size() - 1));

        byte[] imageBytes;
        try {
            imageBytes = downloadFile(largest.getFileId());
        } catch (Exception e) {
            log.error("Error downloading photo from Telegram", e);
            sendReply(chatId, "\u26a0\ufe0f Failed to download the image. Please try again.");
            return;
        }

        ParsedTransaction parsed;
        try {
            parsed = transactionParserService.parseTransactionImage(imageBytes, "image/jpeg");
        } catch (Exception e) {
            log.error("Error calling AI service for image", e);
            sendReply(chatId, "\u26a0\ufe0f AI service is temporarily unavailable. Please try again in a moment.");
            return;
        }

        if (!parsed.isTransaction()) {
            sendReply(chatId, "\ud83e\udd14 Couldn't find transaction details in this image. Try a clearer screenshot.");
            return;
        }

        // Check caption for "my share" or a number override
        String caption = update.getMessage().getCaption();
        BigDecimal overrideAmount = parseAmountFromCaption(caption);
        if (overrideAmount != null) {
            parsed.setAmount(overrideAmount);
        }

        if ("LOW".equals(parsed.getConfidence())) {
            pendingConfirmations.put(chatId, parsed);
            sendReply(chatId, String.format(
                    "\u26a0\ufe0f I'm not very confident about this:\n" +
                    "Amount: \u20b9%s\n" +
                    "Description: %s\n" +
                    "Category: %s\n" +
                    "Date: %s\n\n" +
                    "Reply YES to save, or NO to discard.",
                    parsed.getAmount().toPlainString(),
                    parsed.getDescription(),
                    parsed.getSuggestedCategory(),
                    parsed.getDate()));
            return;
        }

        saveTransaction(chatId, user, parsed, imageBytes);
    }

    private void handleDocumentMessage(Update update) {
        Long chatId = update.getMessage().getChatId();
        Document document = update.getMessage().getDocument();

        String mimeType = document.getMimeType();
        if (mimeType == null || (!mimeType.equals("application/pdf") &&
                !mimeType.startsWith("image/"))) {
            sendReply(chatId, "\u274c Only images and PDFs are supported.");
            return;
        }

        Optional<User> userOpt = telegramLinkService.findUserByChatId(chatId);
        if (userOpt.isEmpty()) {
            sendReply(chatId, "\u274c Please link your account first. Send /start <code>");
            return;
        }

        if (isRateLimited(chatId)) {
            sendReply(chatId, "\u23f3 Rate limit reached. Try again in a few minutes.");
            return;
        }

        User user = userOpt.get();

        byte[] fileBytes;
        try {
            fileBytes = downloadFile(document.getFileId());
        } catch (Exception e) {
            log.error("Error downloading document from Telegram", e);
            sendReply(chatId, "\u26a0\ufe0f Failed to download the file. Please try again.");
            return;
        }

        ParsedTransaction parsed;
        try {
            parsed = transactionParserService.parseTransactionImage(fileBytes, mimeType);
        } catch (Exception e) {
            log.error("Error calling AI service for document", e);
            sendReply(chatId, "\u26a0\ufe0f AI service is temporarily unavailable. Please try again in a moment.");
            return;
        }

        if (!parsed.isTransaction()) {
            sendReply(chatId, "\ud83e\udd14 Couldn't find transaction details in this file. Try a clearer image.");
            return;
        }

        // Check caption for amount override
        String caption = update.getMessage().getCaption();
        BigDecimal overrideAmount = parseAmountFromCaption(caption);
        if (overrideAmount != null) {
            parsed.setAmount(overrideAmount);
        }

        if ("LOW".equals(parsed.getConfidence())) {
            pendingConfirmations.put(chatId, parsed);
            sendReply(chatId, String.format(
                    "\u26a0\ufe0f I'm not very confident about this:\n" +
                    "Amount: \u20b9%s\n" +
                    "Description: %s\n" +
                    "Category: %s\n" +
                    "Date: %s\n\n" +
                    "Reply YES to save, or NO to discard.",
                    parsed.getAmount().toPlainString(),
                    parsed.getDescription(),
                    parsed.getSuggestedCategory(),
                    parsed.getDate()));
            return;
        }

        saveTransaction(chatId, user, parsed, fileBytes);
    }

    private void handleStartCommand(Long chatId, String text, String username) {
        String[] parts = text.split("\\s+", 2);
        if (parts.length < 2) {
            sendReply(chatId,
                    "\ud83d\udc4b Welcome to ExpenseTracker Bot!\n\n" +
                    "To connect your account, go to the ExpenseTracker app \u2192 " +
                    "Settings \u2192 Connect Telegram, get a link code, and send:\n" +
                    "/start <your-6-digit-code>");
            return;
        }

        String code = parts[1].trim();

        // Check if this Telegram account is already linked to another user
        Optional<User> existingUser = telegramLinkService.findUserByChatId(chatId);
        if (existingUser.isPresent()) {
            // Check if code belongs to same user
            boolean success = telegramLinkService.verifyAndLink(code, chatId, username);
            if (success) {
                sendReply(chatId, "\u2705 Account linked successfully! " +
                        "You can now forward bank SMS or send receipt photos to log expenses.");
            } else {
                sendReply(chatId, "\u274c This Telegram account is already linked to another user. " +
                        "Unlink it first from the other account.");
            }
            return;
        }

        boolean success = telegramLinkService.verifyAndLink(code, chatId, username);
        if (success) {
            sendReply(chatId, "\u2705 Account linked successfully! " +
                    "You can now forward bank SMS or send receipt photos to log expenses.");
        } else {
            sendReply(chatId, "\u274c Invalid or expired code. " +
                    "Please generate a new code from the app.");
        }
    }

    private void handleHelpCommand(Long chatId) {
        sendReply(chatId,
                "\ud83d\udcdd How to use ExpenseTracker Bot:\n\n" +
                "\u2022 Forward a bank SMS \u2192 auto-logs the transaction\n" +
                "\u2022 Send a receipt photo/screenshot \u2192 AI extracts and logs\n" +
                "\u2022 Type naturally: 'spent 200 on coffee at starbucks'\n" +
                "\u2022 Send /status to check your linked account\n" +
                "\u2022 Send /unlink to disconnect your account");
    }

    private void handleStatusCommand(Long chatId) {
        Optional<User> userOpt = telegramLinkService.findUserByChatId(chatId);
        if (userOpt.isPresent()) {
            sendReply(chatId, "\u2705 Connected as " + userOpt.get().getEmail());
        } else {
            sendReply(chatId, "\u274c Not connected. Use /start <code> to link.");
        }
    }

    private void handleUnlinkCommand(Long chatId) {
        Optional<User> userOpt = telegramLinkService.findUserByChatId(chatId);
        if (userOpt.isPresent()) {
            telegramLinkService.unlinkTelegram(userOpt.get().getId());
            sendReply(chatId, "\u2705 Account disconnected.");
        } else {
            sendReply(chatId, "You're not connected to any account.");
        }
    }

    private void handleConfirmationResponse(Long chatId, String text) {
        String lower = text.toLowerCase().trim();
        ParsedTransaction pending = pendingConfirmations.remove(chatId);

        if (pending == null) return;

        if (lower.equals("yes") || lower.equals("y")) {
            Optional<User> userOpt = telegramLinkService.findUserByChatId(chatId);
            if (userOpt.isPresent()) {
                saveTransaction(chatId, userOpt.get(), pending, null);
            } else {
                sendReply(chatId, "\u274c Your account no longer exists.");
            }
        } else if (lower.equals("no") || lower.equals("n")) {
            sendReply(chatId, "\u274c Discarded.");
        } else {
            // Put it back if they didn't respond with yes/no
            pendingConfirmations.put(chatId, pending);
            sendReply(chatId, "Reply YES to save, or NO to discard.");
        }
    }

    private void saveTransaction(Long chatId, User user, ParsedTransaction parsed, byte[] receiptBytes) {
        try {
            // Check duplicate
            long dupeCount = transactionRepository.countByUserIdAndAmountAndDate(
                    user.getId(), parsed.getAmount(), parsed.getDate());
            if (dupeCount > 0) {
                sendReply(chatId, String.format(
                        "\u26a0\ufe0f Looks like a duplicate. \u20b9%s on %s already exists. Skipped.",
                        parsed.getAmount().toPlainString(), parsed.getDate()));
                return;
            }

            // Match category
            Category category = categoryRepository.findAll().stream()
                    .filter(c -> c.getName().equalsIgnoreCase(parsed.getSuggestedCategory()))
                    .findFirst()
                    .orElseGet(() -> categoryRepository.findAll().stream()
                            .filter(c -> c.getName().equalsIgnoreCase("Other"))
                            .findFirst()
                            .orElseThrow(() -> new ResourceNotFoundException("No default category 'Other' found")));

            Transaction transaction = Transaction.builder()
                    .amount(parsed.getAmount())
                    .description(parsed.getDescription())
                    .category(category)
                    .user(user)
                    .transactionDate(parsed.getDate())
                    .source("TELEGRAM")
                    .build();

            transaction = transactionRepository.save(transaction);

            // Store receipt if we have image bytes
            if (receiptBytes != null && receiptBytes.length > 0) {
                String s3Key = fileStorageService.storeFileFromBytes(receiptBytes, "image/jpeg", ".jpg");
                Receipt receipt = Receipt.builder()
                        .transaction(transaction)
                        .fileName("telegram_receipt_" + transaction.getId() + ".jpg")
                        .fileType("image/jpeg")
                        .s3Key(s3Key)
                        .build();
                receiptRepository.save(receipt);

                sendReply(chatId, String.format(
                        "\u2705 Logged: \u20b9%s \u2014 %s (%s)\n\ud83d\udcce Receipt saved",
                        parsed.getAmount().toPlainString(),
                        parsed.getDescription(),
                        category.getName()));
            } else {
                sendReply(chatId, String.format(
                        "\u2705 Logged: \u20b9%s \u2014 %s (%s)",
                        parsed.getAmount().toPlainString(),
                        parsed.getDescription(),
                        category.getName()));
            }

        } catch (Exception e) {
            log.error("Error saving transaction from Telegram", e);
            sendReply(chatId, "\u26a0\ufe0f Something went wrong saving your transaction. Please try again.");
        }
    }

    private BigDecimal parseAmountFromCaption(String caption) {
        if (caption == null || caption.isBlank()) return null;

        String lower = caption.toLowerCase().trim();

        // "my share 250" pattern
        if (lower.startsWith("my share")) {
            String numStr = lower.replace("my share", "").trim();
            try {
                return new BigDecimal(numStr);
            } catch (NumberFormatException e) {
                return null;
            }
        }

        // Pure number caption like "250"
        try {
            return new BigDecimal(caption.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private byte[] downloadFile(String fileId) throws Exception {
        GetFile getFile = new GetFile(fileId);
        org.telegram.telegrambots.meta.api.objects.File file = telegramClient.execute(getFile);
        String filePath = file.getFilePath();
        String fileUrl = "https://api.telegram.org/file/bot" + botToken + "/" + filePath;

        try (InputStream is = URI.create(fileUrl).toURL().openStream()) {
            return is.readAllBytes();
        }
    }

    private void sendReply(Long chatId, String text) {
        try {
            SendMessage message = SendMessage.builder()
                    .chatId(chatId.toString())
                    .text(text)
                    .build();
            telegramClient.execute(message);
        } catch (Exception e) {
            log.error("Failed to send Telegram message to chatId: {}", chatId, e);
        }
    }

    private boolean isRateLimited(Long chatId) {
        Instant now = Instant.now();
        Instant oneHourAgo = now.minusSeconds(3600);

        rateLimitMap.compute(chatId, (key, timestamps) -> {
            if (timestamps == null) {
                timestamps = new ArrayList<>();
            }
            timestamps.removeIf(t -> t.isBefore(oneHourAgo));
            return timestamps;
        });

        List<Instant> timestamps = rateLimitMap.get(chatId);
        if (timestamps.size() >= RATE_LIMIT) {
            return true;
        }

        timestamps.add(now);
        return false;
    }
}
