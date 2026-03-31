import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as authApi from "../api/authApi";

export default function useAuth() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const isAuthenticated = !!localStorage.getItem("token");

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    setUser({ fullName: data.fullName, email: data.email });
    return data;
  }, []);

  const register = useCallback(async (fullName, email, password) => {
    const data = await authApi.register(fullName, email, password);
    setUser({ fullName: data.fullName, email: data.email });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  }, [navigate]);

  return { user, login, register, logout, isAuthenticated };
}
