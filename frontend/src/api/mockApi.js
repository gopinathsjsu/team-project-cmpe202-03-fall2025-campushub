// src/api/mockApi.js
let _id = 100;

const mockListings = [
  { id: 1, title: "CMPE 202 Textbook", description: "Used, good condition", price: 25, category: "Textbooks", images: [], seller: "alice@sjsu.edu", sold: false, createdAt: Date.now()-100000 },
  { id: 2, title: "Calculator TI-84", description: "Works great", price: 60, category: "Electronics", images: [], seller: "bob@sjsu.edu", sold: false, createdAt: Date.now()-200000 },
];

let mockReports = [
  { id: "r1", listingId: 2, reason: "Missing photo", status: "open", createdAt: Date.now()-50000 },
];

const mockApi = {
  async listListings(params) {
    const { q = "", category, minPrice, maxPrice } = params;
    let data = [...mockListings];
    if (q) data = data.filter(l => `${l.title} ${l.description}`.toLowerCase().includes(q.toLowerCase()));
    if (category && category !== "All") data = data.filter(l => l.category === category);
    if (minPrice) data = data.filter(l => l.price >= Number(minPrice));
    if (maxPrice) data = data.filter(l => l.price <= Number(maxPrice));
    return { items: data.sort((a,b)=>b.createdAt-a.createdAt) };
  },

  async getListing(id) { return mockListings.find(l => l.id === Number(id)); },

  async createListing(payload) {
    const newListing = { id: ++_id, sold: false, images: [], createdAt: Date.now(), ...payload };
    mockListings.push(newListing);
    return newListing;
  },

  async updateListing(id, payload) {
    const idx = mockListings.findIndex(l => l.id === Number(id));
    mockListings[idx] = { ...mockListings[idx], ...payload };
    return mockListings[idx];
  },

  async reportListing(id, reason) {
    const report = { id: `r${Math.random().toString(36).slice(2,7)}`, listingId: Number(id), reason, status: "open", createdAt: Date.now() };
    mockReports.push(report);
    return report;
  },

  async chatbotSearch(query) {
    const results = mockListings.filter(l => `${l.title} ${l.description}`.toLowerCase().includes(query.toLowerCase()));
    return { answer: results.length ? `I found ${results.length} items for "${query}"` : `No items found for "${query}"`, results };
  },

  async listReports() { return { items: mockReports }; },

  async resolveReport(id, action) {
    const idx = mockReports.findIndex(r => r.id === id);
    mockReports[idx].status = action === "approve" ? "approved" : "rejected";
    return mockReports[idx];
  }
};

export default mockApi;
