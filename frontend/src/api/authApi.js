import api from "./axiosInstance";

export const login = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify({ fullName: data.fullName, email: data.email }));
  return data;
};

export const register = async (fullName, email, password) => {
  const { data } = await api.post("/auth/register", { fullName, email, password });
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify({ fullName: data.fullName, email: data.email }));
  return data;
};
