import api from "./axiosInstance";

export const getProfile = async () => {
  const { data } = await api.get("/user/profile");
  return data;
};

export const sendOtp = async (email) => {
  const { data } = await api.post("/user/change-password/send-otp", { email });
  return data;
};

export const verifyOtpAndChangePassword = async (otp, newPassword, confirmNewPassword) => {
  const { data } = await api.post("/user/change-password/verify", {
    otp,
    newPassword,
    confirmNewPassword,
  });
  return data;
};
