const rawBaseUrl =
  import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || "";

const API_BASE_URL = rawBaseUrl.replace(/\/$/, "");

export function apiUrl(path = "") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE_URL) return normalizedPath;
  return `${API_BASE_URL}${normalizedPath}`;
}

export { API_BASE_URL };
