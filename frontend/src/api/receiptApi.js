import api from "./axiosInstance";

export const uploadReceipt = (transactionId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`/transactions/${transactionId}/receipt`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getReceipt = (transactionId) =>
  api.get(`/transactions/${transactionId}/receipt`, { responseType: "blob" });

export const deleteReceipt = (transactionId) =>
  api.delete(`/transactions/${transactionId}/receipt`);
