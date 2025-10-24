// src/api/apiClient.js
import mockApi from "./mockApi";

const USE_MOCK = true; // flip false when backend is ready
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

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
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`
    }));
    throw new Error(error.message || "API request failed");
  }
  return response.json();
};

const fetchAPI = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...createHeaders(options.auth, options.contentType),
      ...options.headers,
    },
  });
  return handleResponse(response);
};


const api = {

  // ==================== Authentication ====================

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
    return fetchAPI(`/listings${queryString ? `?${queryString}` : ""}`);
  },

  async getListing(id) {
    if (USE_MOCK) return mockApi.getListing(id);
    return fetchAPI(`/listings/${id}`);
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

  async reportListing(id, reason) {
    if (USE_MOCK) return mockApi.reportListing(id, reason);
    return fetchAPI(`/listings/${id}/report`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ reason }),
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

  // ==================== Admin - Reports ====================

  async listReports() {
    if (USE_MOCK) return mockApi.listReports();
    return fetchAPI("/reports", {
      auth: true,
    });
  },

  async resolveReport(id, action) {
    if (USE_MOCK) return mockApi.resolveReport(id, action);
    return fetchAPI(`/reports/${id}`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ action }),
    });
  },
};

export default api;
