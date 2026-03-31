package com.expensetracker.service;

import com.expensetracker.dto.CategoryRequest;
import com.expensetracker.dto.CategoryResponse;

import java.util.List;
import java.util.UUID;

public interface CategoryService {

    List<CategoryResponse> getAllCategories();

    CategoryResponse createCategory(CategoryRequest request);

    void deleteCategory(UUID id);
}
