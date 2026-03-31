package com.expensetracker.service;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {

    String storeFile(MultipartFile file);

    String generatePresignedUrl(String s3Key);

    void deleteFile(String s3Key);
}
