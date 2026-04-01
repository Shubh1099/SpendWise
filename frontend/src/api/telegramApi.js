import api from "./axiosInstance";

export const generateTelegramCode = () => api.post("/telegram/generate-code");

export const getTelegramStatus = () => api.get("/telegram/status");

export const unlinkTelegram = () => api.delete("/telegram/unlink");
