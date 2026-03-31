package com.expensetracker.service;

import com.expensetracker.dto.LineItem;
import com.expensetracker.dto.ReceiptScanResponse;
import com.expensetracker.exception.BadRequestException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@Slf4j
public class ReceiptScanService {

    @Value("${gemini.api-key}")
    private String apiKey;

    @Value("${gemini.model}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private static final String PROMPT = """
            Analyze this receipt image and extract the following information. \
            Return ONLY a valid JSON object with no markdown formatting, no backticks, no explanation.

            {
              "storeName": "store or merchant name",
              "totalAmount": numeric total amount (number, not string),
              "date": "YYYY-MM-DD format, best guess if unclear",
              "description": "a short 5-8 word summary like: Grocery shopping at DMart",
              "suggestedCategory": "one of: Food, Transport, Shopping, Bills, Entertainment, Health, Education, Other",
              "confidence": "HIGH if text is clearly readable, MEDIUM if partially unclear, LOW if mostly guessing",
              "items": [
                {"name": "item name", "quantity": 1, "price": 0.00}
              ]
            }

            If you cannot read the receipt at all, return:
            {"error": "Could not read receipt", "confidence": "LOW"}""";

    public ReceiptScanResponse scanReceipt(MultipartFile file) {
        try {
            byte[] fileBytes = file.getBytes();
            String base64Image = Base64.getEncoder().encodeToString(fileBytes);
            String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";

            String url = String.format(GEMINI_URL, model, apiKey);

            Map<String, Object> requestBody = buildGeminiRequest(base64Image, mimeType);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            return parseGeminiResponse(response.getBody());
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error scanning receipt", e);
            throw new BadRequestException("Could not extract receipt details. Please try a clearer image or enter manually.");
        }
    }

    private Map<String, Object> buildGeminiRequest(String base64Image, String mimeType) {
        Map<String, Object> inlineData = new LinkedHashMap<>();
        inlineData.put("mimeType", mimeType);
        inlineData.put("data", base64Image);

        Map<String, Object> imagePart = Map.of("inlineData", inlineData);
        Map<String, Object> textPart = Map.of("text", PROMPT);

        Map<String, Object> content = Map.of("parts", List.of(imagePart, textPart));

        return Map.of("contents", List.of(content));
    }

    private ReceiptScanResponse parseGeminiResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (candidates.isEmpty()) {
                throw new BadRequestException("Could not extract receipt details. Please try a clearer image or enter manually.");
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

            // Check for error response
            if (json.has("error")) {
                throw new BadRequestException("Could not extract receipt details. Please try a clearer image or enter manually.");
            }

            List<LineItem> items = new ArrayList<>();
            JsonNode itemsNode = json.path("items");
            if (itemsNode.isArray()) {
                for (JsonNode item : itemsNode) {
                    items.add(LineItem.builder()
                            .name(item.path("name").asText(""))
                            .quantity(item.path("quantity").asInt(1))
                            .price(new BigDecimal(item.path("price").asText("0")))
                            .build());
                }
            }

            return ReceiptScanResponse.builder()
                    .extractedDescription(json.path("description").asText("Receipt purchase"))
                    .extractedAmount(new BigDecimal(json.path("totalAmount").asText("0")))
                    .extractedDate(parseDate(json.path("date").asText("")))
                    .suggestedCategory(json.path("suggestedCategory").asText("Other"))
                    .confidence(json.path("confidence").asText("LOW"))
                    .allItems(items)
                    .build();

        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error parsing Gemini response", e);
            throw new BadRequestException("Could not extract receipt details. Please try a clearer image or enter manually.");
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
