// src/api/apiClient.js
import mockApi from "./mockApi";

const USE_MOCK = false; // flip false when backend is ready
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
    console.log(token);
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

  async login(email, password) {
    if (USE_MOCK) return mockApi.login(email, password);
    
    return fetchAPI("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async register(name, email, password, role = "user") {
    if (USE_MOCK) return mockApi.register(name, email, password, role);
    
    return fetchAPI("/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
    });
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
    return fetchAPI(`/listings${queryString ? `?${queryString}` : ""}`,{auth:true});
  },

  async getListing(id) {
    if (USE_MOCK) return mockApi.getListing(id);
    return fetchAPI(`/listings/${id}`,{ auth: true });
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

  async getMyListings() {
    if (USE_MOCK) {
      const userId = localStorage.getItem("userId");
      return mockApi.listListings({}).then(res => {
        const filtered = res.items.filter(item => item.sellerId === userId);
        return { data: { items: filtered, total: filtered.length } };
      });
    }
    
    return fetchAPI("/listings/mine", {
      auth: true,
    });
  },

  async reportListing(listingId, reason, reporterId) {
    if (USE_MOCK) return mockApi.reportListing(listingId, reason);
    
    return fetchAPI(`/reports`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ 
        listingId, 
        reporterId,
        reason 
      }),
    });
  },

  // ==================== Image Uploads ====================

  /**
   * Step 1: Get presigned URL for S3 upload
  
   */
  async presignUpload(fileName, contentType) {    
    return fetchAPI("/uploads/presign", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ fileName, contentType }),
    });
  },

  /**
   * Step 2: Upload file to S3 using presigned URL
   */
  async uploadToS3(presignedUrl, file, contentType) {
    
    const response = await fetch(presignedUrl, {
      method: "PUT",
      auth:true,
      headers: {
        "Content-Type": contentType,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error("Failed to upload to S3");
    }

    return { success: true };
  },

  /**
   * Step 3: Complete upload and attach to listing
   */
  async completeUpload(listingId, key, isPrimary = false) {
   
    return fetchAPI("/uploads/complete", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ listingId, key, isPrimary }),
    });
  },

  async uploadImage(listingId, file, isPrimary = false) {
    try {
      // Step 1: Get presigned URL
      const { data: presignData } = await this.presignUpload(file.name, file.type);
      
      // Step 2: Upload to S3
      await this.uploadToS3(presignData.url, file, file.type);
      
      // Step 3: Complete and attach to listing
      const result = await this.completeUpload(listingId, presignData.key, isPrimary);
      
      return result.data;
    } catch (error) {
      console.error("Image upload failed:", error);
      throw error;
    }
  },

  /** List images for a listing */
  async listImages(listingId) {
    if (USE_MOCK) {
      return { data: [] };
    }
    
    return fetchAPI(`/listings/${listingId}/images`);
  },

  // ==================== AI Chatbot ====================

  chatbotSearch: async (query) => {
    if (USE_MOCK) return mockApi.chatbotSearch(query);
    
    if (wsInstance && wsInstance.connected) {
      try {
        const response = await wsInstance.sendMessage('agent.search', { query });
        return {
          answer: response.answer,
          results: response.results || []
        };
      } catch (error) {
        console.error('WebSocket search failed:', error);
       
      }
    }
    
    return fetchAPI('/chatbot/search', {
      method: 'POST',
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
