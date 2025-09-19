// src/api/apiClient.js
import mockApi from "./mockApi";

const USE_MOCK = true; // flip false when backend is ready

const api = {
  async listListings(params = {}) {
    if (USE_MOCK) return mockApi.listListings(params);
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`/api/listings?${q}`);
    return res.json();
  },

  async getListing(id) {
    if (USE_MOCK) return mockApi.getListing(id);
    const res = await fetch(`/api/listings/${id}`);
    return res.json();
  },

  async createListing(payload) {
    if (USE_MOCK) return mockApi.createListing(payload);
    const res = await fetch(`/api/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async updateListing(id, payload) {
    if (USE_MOCK) return mockApi.updateListing(id, payload);
    const res = await fetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async reportListing(id, reason) {
    if (USE_MOCK) return mockApi.reportListing(id, reason);
    const res = await fetch(`/api/listings/${id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    return res.json();
  },

  async chatbotSearch(query) {
    if (USE_MOCK) return mockApi.chatbotSearch(query);
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    return res.json();
  },

  async listReports() {
    if (USE_MOCK) return mockApi.listReports();
    const res = await fetch("/api/reports");
    return res.json();
  },

  async resolveReport(id, action) {
    if (USE_MOCK) return mockApi.resolveReport(id, action);
    const res = await fetch(`/api/reports/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    return res.json();
  },
};

export default api;
