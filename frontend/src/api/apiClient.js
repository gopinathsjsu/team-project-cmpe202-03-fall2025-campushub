// src/api/apiClient.js
import mockApi from "./mockApi";

const USE_MOCK = false; // flip false when backend is ready
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8082/v1";

const getAuthToken = () => {
  return localStorage.getItem("authToken");
};

const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem("authToken", token);
  } else {
    localStorage.removeItem("authToken");
  }
};

const createHeaders = (includeAuth = false, contentType = "application/json") => {
  const headers = {};
  
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  return headers;
};


const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({
    error: { message: `HTTP ${response.status}: ${response.statusText}` }
  }));
  
  // Backend returns {data: ...} or {error: ...}
  if (data.error) {
    const errorMsg = data.error.message || data.error.details || "API request failed";
    throw new Error(errorMsg);
  }
  
  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  // Return the data field if present, otherwise return the whole response
  return data.data !== undefined ? data.data : data;
};

const fetchAPI = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const fetchOptions = {
    ...options,
    headers: {
      ...createHeaders(options.auth, options.contentType),
      ...options.headers,
    },
  };
  
  // Add body if provided
  if (options.body) {
    fetchOptions.body = options.body;
  }
  
  const response = await fetch(url, fetchOptions);
  return handleResponse(response);
};


const api = {

  // ==================== Authentication ====================

  async signUp(payload) {
    if (USE_MOCK) return mockApi.signUp(payload);
    return fetchAPI("/auth/sign-up", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async signIn(email, password) {
    if (USE_MOCK) return mockApi.signIn(email, password);
    const result = await fetchAPI("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    // Store token if present
    if (result.token) {
      setAuthToken(result.token);
    }
    return result;
  },

  setToken: (token) => {
    setAuthToken(token);
  },

  getToken: () => {
    return getAuthToken();
  },

  logout: () => {
    setAuthToken(null);
  },

   // ==================== Listings ====================
   
  async listListings(params = {}) {
    if (USE_MOCK) return mockApi.listListings(params);
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    // Backend requires auth for listings
    return fetchAPI(`/listings${queryString ? `?${queryString}` : ""}`, {
      auth: true,
    });
  },

  async getListing(id) {
    if (USE_MOCK) return mockApi.getListing(id);
    // Backend requires auth for listings
    return fetchAPI(`/listings/${id}`, {
      auth: true,
    });
  },

  async createListing(payload) {
    if (USE_MOCK) return mockApi.createListing(payload);
    return fetchAPI("/listings", {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload),
    });
  },

  async updateListing(id, payload) {
    if (USE_MOCK) return mockApi.updateListing(id, payload);
    return fetchAPI(`/listings/${id}`, {
      method: "PATCH",
      auth: true,
      body: JSON.stringify(payload),
    });
  },

  async markAsSold(id) {
    if (USE_MOCK) return mockApi.updateListing(id, { sold: true });
    return fetchAPI(`/listings/${id}/mark-sold`, {
      method: "POST",
      auth: true,
    });
  },

  async deleteListing(id) {
    if (USE_MOCK) return mockApi.deleteListing(id);
    return fetchAPI(`/listings/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  async reportListing(listingId, reporterId, reason) {
    if (USE_MOCK) return mockApi.reportListing(listingId, reporterId, reason);
    return fetchAPI("/reports", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ listingId, reporterId, reason }),
    });
  },

  // ==================== AI Chatbot ====================

  async chatbotSearch(query) {
    if (USE_MOCK) return mockApi.chatbotSearch(query);
    return fetchAPI("/agent", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
  },

  // ==================== Reports ====================

  async createReport(listingId, reporterId, reason) {
    if (USE_MOCK) return mockApi.createReport(listingId, reporterId, reason);
    return fetchAPI("/reports", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ listingId, reporterId, reason }),
    });
  },

  async listReports(status = "") {
    if (USE_MOCK) return mockApi.listReports();
    const query = status ? `?status=${status}` : "";
    return fetchAPI(`/reports${query}`, {
      auth: true,
    });
  },

  async updateReportStatus(id, status) {
    if (USE_MOCK) return mockApi.updateReportStatus(id, status);
    return fetchAPI(`/reports/${id}/status`, {
      method: "PATCH",
      auth: true,
      body: JSON.stringify({ status }),
    });
  },

  // ==================== Admin ====================

  async getMetrics() {
    if (USE_MOCK) return mockApi.getMetrics();
    return fetchAPI("/admin/metrics", {
      auth: true,
    });
  },

  async listUsers(limit = 20, offset = 0) {
    if (USE_MOCK) return mockApi.listUsers(limit, offset);
    return fetchAPI(`/admin/users?limit=${limit}&offset=${offset}`, {
      auth: true,
    });
  },

  async forceRemoveListing(listingId) {
    if (USE_MOCK) return mockApi.forceRemoveListing(listingId);
    return fetchAPI(`/admin/listings/${listingId}/remove`, {
      method: "POST",
      auth: true,
    });
  },
};

export default api;
