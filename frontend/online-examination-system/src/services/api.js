import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://online-examination-system-m5tk.onrender.com/api";


const API = axios.create({
  baseURL: API_URL,
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});
export default API;