import api from "./axiosInstance";

export const createTransaction = (data) => api.post("/transactions", data);

export const getTransactions = (params) => api.get("/transactions", { params });

export const getTransactionById = (id) => api.get(`/transactions/${id}`);

export const updateTransaction = (id, data) =>
  api.put(`/transactions/${id}`, data);

export const deleteTransaction = (id) => api.delete(`/transactions/${id}`);

export const getMonthlySummary = (params) =>
  api.get("/transactions/summary/monthly", { params });

export const exportTransactionsCsv = (params) =>
  api.get("/transactions/export/csv", { params, responseType: "blob" });

export const scanReceiptPreview = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/transactions/scan-receipt/preview", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const scanReceiptCreate = (file, userShare) => {
  const formData = new FormData();
  formData.append("file", file);
  if (userShare) formData.append("userShare", userShare);
  return api.post("/transactions/scan-receipt", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
