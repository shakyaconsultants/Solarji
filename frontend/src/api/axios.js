import axios from "axios";
import { getToken, clearToken, applyRefreshedToken } from "../utils/session";
import { API_BASE_URL } from "../config/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["Cache-Control"] = "no-cache";
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (res.data?.token) applyRefreshedToken(res.data.token);
    return res;
  },
  (err) => {
    const isLoginRequest = err.config?.url?.includes("/auth/login");
    if (err.response?.status === 401 && !isLoginRequest) {
      clearToken();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export default api;
