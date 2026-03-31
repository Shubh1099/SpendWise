import api from "./axiosInstance";

export const getCategories = () => api.get("/categories");

export const createCategory = (data) => api.post("/categories", data);

export const deleteCategory = (id) => api.delete(`/categories/${id}`);
