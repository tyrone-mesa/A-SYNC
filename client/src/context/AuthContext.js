import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("asiatech_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem("asiatech_token");
    const storedUser = localStorage.getItem("asiatech_user");
    return !(token && storedUser) && !!token;
  });

  useEffect(() => {
    const token = localStorage.getItem("asiatech_token");
    if (!token) {
      setLoading(false);
      return;
    }
    if (user) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("asiatech_user", JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem("asiatech_token");
        localStorage.removeItem("asiatech_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const login = useCallback(async (email, password, portal, otp) => {
    const { data } = await api.post("/auth/login", { email, password, portal, otp });
    localStorage.setItem("asiatech_token", data.token);
    localStorage.setItem("asiatech_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  // A company account is pending admin verification right after signup — there's no token
  // to store yet, just a confirmation message. See the isVerified check in POST /auth/login.
  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    return data;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const { data } = await api.put("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("asiatech_token");
    localStorage.removeItem("asiatech_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, changePassword, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
