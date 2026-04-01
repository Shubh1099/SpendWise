package com.expensetracker.service.impl;

import com.expensetracker.exception.BadRequestException;
import com.expensetracker.exception.FileStorageException;
import com.expensetracker.service.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageServiceImpl implements FileStorageService {

    private static final Set<String> ALLOWED_TYPES = Set.of("image/png", "image/jpeg", "application/pdf");

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucketName;
    private final Duration presignedUrlExpiry;

    public FileStorageServiceImpl(
            @Value("${aws.s3.bucket}") String bucketName,
            @Value("${aws.s3.region}") String region,
            @Value("${aws.s3.access-key}") String accessKey,
            @Value("${aws.s3.secret-key}") String secretKey,
            @Value("${aws.s3.presigned-url-expiry-minutes}") long expiryMinutes) {

        this.bucketName = bucketName;
        this.presignedUrlExpiry = Duration.ofMinutes(expiryMinutes);

        StaticCredentialsProvider credentials = StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey, secretKey));

        this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(credentials)
                .build();

        this.s3Presigner = S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(credentials)
                .build();
    }

    @Override
    public String storeFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("Cannot upload empty file");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new BadRequestException("File type not allowed. Accepted types: PNG, JPEG, PDF");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        String s3Key = "receipts/" + UUID.randomUUID() + extension;

        try {
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (IOException e) {
            throw new FileStorageException("Failed to read upload file", e);
        } catch (S3Exception e) {
            throw new FileStorageException("Failed to upload file to S3", e);
        }

        return s3Key;
    }

    @Override
    public String storeFileFromBytes(byte[] data, String contentType, String extension) {
        if (data == null || data.length == 0) {
            throw new BadRequestException("Cannot upload empty file");
        }

        String s3Key = "receipts/" + UUID.randomUUID() + extension;

        try {
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(putRequest, RequestBody.fromBytes(data));
        } catch (S3Exception e) {
            throw new FileStorageException("Failed to upload file to S3", e);
        }

        return s3Key;
    }

    @Override
    public String generatePresignedUrl(String s3Key) {
        try {
            GetObjectRequest getRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(presignedUrlExpiry)
                    .getObjectRequest(getRequest)
                    .build();

            return s3Presigner.presignGetObject(presignRequest).url().toString();
        } catch (S3Exception e) {
            throw new FileStorageException("Failed to generate presigned URL", e);
        }
    }

    @Override
    public void deleteFile(String s3Key) {
        try {
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            s3Client.deleteObject(deleteRequest);
        } catch (S3Exception e) {
            throw new FileStorageException("Failed to delete file from S3", e);
        }
    }
}
