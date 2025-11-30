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
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] Auth token found, length:', token.length, 'preview:', token.substring(0, 20) + '...');
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[API] WARNING: Auth required but no token found in localStorage');
      }
      console.warn("Auth token not found in localStorage");
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
    if (process.env.NODE_ENV === 'development') {
      console.error('[API] Error response:', { status: response.status, error: data.error, fullData: data });
    }
    throw new Error(errorMsg);
  }
  
  if (!response.ok) {
    const errorMsg = data.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    if (process.env.NODE_ENV === 'development') {
      console.error('[API] Non-OK response:', { status: response.status, statusText: response.statusText, data });
    }
    throw new Error(errorMsg);
  }
  
  // Return the data field if present, otherwise return the whole response
  const result = data.data !== undefined ? data.data : data;
  
  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('API Response:', { endpoint: response.url, hasData: !!result, resultType: typeof result });
  }
  
  return result;
};

const fetchAPI = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const fetchOptions = {
    method: options.method || "GET",
    headers: {
      ...createHeaders(options.auth, options.contentType),
      ...options.headers,
    },
  };
  
  // Add body if provided
  if (options.body) {
    fetchOptions.body = options.body;
  }
  
  const token = getAuthToken();
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${fetchOptions.method} ${url}`, {
      hasAuth: !!token,
      hasBody: !!options.body,
      requiresAuth: options.auth,
      headers: Object.keys(fetchOptions.headers)
    });
    if (options.auth && !token) {
      console.error('[API] ERROR: Auth required but token is missing!');
    }
  }
  
  const response = await fetch(url, fetchOptions);
  const result = await handleResponse(response);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] Response from ${url}:`, {
      status: response.status,
      hasData: !!result,
      resultType: typeof result,
      isArray: Array.isArray(result),
      keys: result && typeof result === 'object' && !Array.isArray(result) ? Object.keys(result) : 'N/A',
      itemsCount: result?.items?.length || (Array.isArray(result) ? result.length : 'N/A')
    });
  }
  
  return result;
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
    // Backend returns {data: {user: ..., token: ...}}, handleResponse extracts data
    // So result should be {user: ..., token: ...}
    if (result && result.token) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] signIn: Storing token from result.token, length:', result.token.length);
      }
      setAuthToken(result.token);
      // Verify it was stored
      const stored = localStorage.getItem("authToken");
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] signIn: Token stored in localStorage:', !!stored);
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[API] signIn: No token in result. Result keys:', result ? Object.keys(result) : 'null');
      }
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
    
    // Map frontend param names to backend param names
    const paramMap = {
      q: params.q,
      category: params.category,
      status: params.status || "active", // Default to active
      sort: params.sort,
      limit: params.limit,
      offset: params.offset,
      // Map price parameters
      priceMin: params.priceMin || params.minPrice,
      priceMax: params.priceMax || params.maxPrice,
    };
    
    Object.entries(paramMap).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    // Listings are now public - no auth required for browsing
    // But send token if available for better experience
    const token = getAuthToken();
    return fetchAPI(`/listings${queryString ? `?${queryString}` : ""}`, {
      auth: !!token, // Only send auth if token exists
    });
  },

  async getListing(id) {
    if (USE_MOCK) return mockApi.getListing(id);
    // Listings are now public - no auth required
    const token = getAuthToken();
    return fetchAPI(`/listings/${id}`, {
      auth: !!token, // Only send auth if token exists
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
