package com.expensetracker.service;

import com.expensetracker.dto.ParsedTransaction;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@Slf4j
public class TransactionParserService {

    @Value("${gemini.api-key}")
    private String apiKey;

    @Value("${gemini.model}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private static final String TEXT_PROMPT_TEMPLATE = """
            Analyze this Indian bank transaction message or natural language expense \
            description and extract transaction details. \
            Today's date is %s. \
            Return ONLY a valid JSON object with no markdown, no backticks.

            {
              "isTransaction": true,
              "amount": numeric amount (number not string),
              "type": "DEBIT" or "CREDIT",
              "merchant": "merchant/payee name if available, else null",
              "description": "short 5-8 word summary like: UPI payment to Swiggy",
              "date": "YYYY-MM-DD format, use %s if date is not mentioned",
              "suggestedCategory": "one of: Food, Transport, Shopping, Bills, Entertainment, Health, Education, Other, Groceries, Subscriptions",
              "confidence": "HIGH, MEDIUM, or LOW"
            }

            If this is NOT a transaction (OTP, promo, greeting, random text), return:
            {"isTransaction": false}

            Message to analyze:
            """;

    private static final String IMAGE_PROMPT_TEMPLATE = """
            Analyze this transaction screenshot or receipt image and extract transaction details. \
            Today's date is %s. \
            Return ONLY a valid JSON object with no markdown, no backticks.

            {
              "isTransaction": true,
              "amount": numeric total amount (number not string),
              "type": "DEBIT" or "CREDIT",
              "merchant": "merchant/payee name if available, else null",
              "description": "short 5-8 word summary like: Payment to Swiggy via UPI",
              "date": "YYYY-MM-DD format, use %s if date is unclear",
              "suggestedCategory": "one of: Food, Transport, Shopping, Bills, Entertainment, Health, Education, Other, Groceries, Subscriptions",
              "confidence": "HIGH, MEDIUM, or LOW"
            }

            If you cannot find transaction details in the image, return:
            {"isTransaction": false}
            """;

    public ParsedTransaction parseTransactionMessage(String messageText) {
        try {
            String url = String.format(GEMINI_URL, model, apiKey);
            String today = LocalDate.now().toString();
            String prompt = String.format(TEXT_PROMPT_TEMPLATE, today, today) + messageText;

            Map<String, Object> textPart = Map.of("text", prompt);
            Map<String, Object> content = Map.of("parts", List.of(textPart));
            Map<String, Object> requestBody = Map.of("contents", List.of(content));

            return callGeminiAndParse(url, requestBody);
        } catch (Exception e) {
            log.error("Error parsing transaction message", e);
            return ParsedTransaction.builder().isTransaction(false).build();
        }
    }

    public ParsedTransaction parseTransactionImage(byte[] imageBytes, String mimeType) {
        try {
            String url = String.format(GEMINI_URL, model, apiKey);
            String today = LocalDate.now().toString();
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);

            Map<String, Object> inlineData = new LinkedHashMap<>();
            inlineData.put("mimeType", mimeType != null ? mimeType : "image/jpeg");
            inlineData.put("data", base64Image);

            Map<String, Object> imagePart = Map.of("inlineData", inlineData);
            Map<String, Object> textPart = Map.of("text", String.format(IMAGE_PROMPT_TEMPLATE, today, today));

            Map<String, Object> content = Map.of("parts", List.of(imagePart, textPart));
            Map<String, Object> requestBody = Map.of("contents", List.of(content));

            return callGeminiAndParse(url, requestBody);
        } catch (Exception e) {
            log.error("Error parsing transaction image", e);
            return ParsedTransaction.builder().isTransaction(false).build();
        }
    }

    private ParsedTransaction callGeminiAndParse(String url, Map<String, Object> requestBody) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

        return parseGeminiResponse(response.getBody());
    }

    private ParsedTransaction parseGeminiResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (candidates.isEmpty()) {
                return ParsedTransaction.builder().isTransaction(false).build();
            }

            String text = candidates.get(0)
                    .path("content")
                    .path("parts")
                    .get(0)
                    .path("text")
                    .asText();

            // Strip markdown backticks if present
            text = text.trim();
            if (text.startsWith("```json")) {
                text = text.substring(7);
            } else if (text.startsWith("```")) {
                text = text.substring(3);
            }
            if (text.endsWith("```")) {
                text = text.substring(0, text.length() - 3);
            }
            text = text.trim();

            JsonNode json = objectMapper.readTree(text);

            boolean isTransaction = json.path("isTransaction").asBoolean(false);
            if (!isTransaction) {
                return ParsedTransaction.builder().isTransaction(false).build();
            }

            return ParsedTransaction.builder()
                    .isTransaction(true)
                    .amount(new BigDecimal(json.path("amount").asText("0")))
                    .type(json.path("type").asText("DEBIT"))
                    .merchant(json.path("merchant").isNull() ? null : json.path("merchant").asText(null))
                    .description(json.path("description").asText("Transaction"))
                    .date(parseDate(json.path("date").asText("")))
                    .suggestedCategory(json.path("suggestedCategory").asText("Other"))
                    .confidence(json.path("confidence").asText("LOW"))
                    .build();

        } catch (Exception e) {
            log.error("Error parsing Gemini response for transaction", e);
            return ParsedTransaction.builder().isTransaction(false).build();
        }
    }

    private LocalDate parseDate(String dateStr) {
        try {
            return LocalDate.parse(dateStr);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }
}
