import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/apiClient";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock,
  Flag,
  User,
  Calendar,
  MessageSquare
} from "lucide-react";
import EmptyState from "../components/EmptyState";

export default function AdminPage() {
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reports"); // reports, users, metrics
  const [usersPagination, setUsersPagination] = useState({ limit: 20, offset: 0, total: 0 });

  const loadReports = async () => {
    try {
      const res = await api.listReports("open");
      setReports(res.items || []);
    } catch (error) {
      console.error("Failed to load reports:", error);
      alert("Failed to load reports: " + error.message);
    }
  };

  const loadMetrics = async () => {
    try {
      const m = await api.getMetrics();
      setMetrics(m);
    } catch (error) {
      console.error("Failed to load metrics:", error);
      alert("Failed to load metrics: " + error.message);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.listUsers(usersPagination.limit, usersPagination.offset);
      setUsers(res.items || []);
      setUsersPagination(prev => ({ ...prev, total: res.total || 0 }));
    } catch (error) {
      console.error("Failed to load users:", error);
      alert("Failed to load users: " + error.message);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      await Promise.all([loadReports(), loadMetrics(), loadUsers()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpdateReportStatus = async (reportId, status) => {
    try {
      await api.updateReportStatus(reportId, status);
      await loadReports();
      await loadMetrics(); // Refresh metrics
    } catch (error) {
      console.error("Failed to update report status:", error);
      alert("Failed to update report status: " + error.message);
    }
  };

  const handleForceRemoveListing = async (listingId) => {
    if (!confirm("Are you sure you want to force remove this listing?")) {
      return;
    }
    try {
      await api.forceRemoveListing(listingId);
      alert("Listing removed successfully");
      await loadMetrics(); // Refresh metrics
    } catch (error) {
      console.error("Failed to remove listing:", error);
      alert("Failed to remove listing: " + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "open": return "text-orange-600 bg-orange-100";
      case "reviewing": return "text-blue-600 bg-blue-100";
      case "resolved": return "text-green-600 bg-green-100";
      case "dismissed": return "text-gray-600 bg-gray-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getPriorityColor = (reason) => {
    const urgentKeywords = ["inappropriate", "spam", "fake", "scam"];
    const hasUrgent = urgentKeywords.some(keyword => 
      reason.toLowerCase().includes(keyword)
    );
    return hasUrgent ? "border-l-red-500" : "border-l-blue-500";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Moderation Dashboard</h1>
              <p className="text-gray-600">Manage reports and moderate content</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Stats Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Listings</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.listings || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageSquare size={24} className="text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.users || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <User size={24} className="text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open Reports</p>
                  <p className="text-2xl font-bold text-orange-600">{metrics.reports?.open || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={24} className="text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Resolved Reports</p>
                  <p className="text-2xl font-bold text-green-600">{metrics.reports?.resolved || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle size={24} className="text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border mb-6">
          <div className="border-b">
            <div className="flex space-x-1 px-6">
              <button
                onClick={() => setActiveTab("reports")}
                className={`px-4 py-3 font-medium text-sm transition-colors ${
                  activeTab === "reports"
                    ? "text-red-600 border-b-2 border-red-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Reports
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`px-4 py-3 font-medium text-sm transition-colors ${
                  activeTab === "users"
                    ? "text-red-600 border-b-2 border-red-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab("metrics")}
                className={`px-4 py-3 font-medium text-sm transition-colors ${
                  activeTab === "metrics"
                    ? "text-red-600 border-b-2 border-red-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Metrics
              </button>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        {activeTab === "reports" && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Report Queue</h2>
              <p className="text-sm text-gray-600">Review and moderate reported content</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">Loading reports...</span>
              </div>
            ) : reports.length === 0 ? (
              <EmptyState 
                title="No reports to review" 
                subtitle="All caught up! No pending reports at the moment."
              />
            ) : (
              <div className="divide-y">
                {reports.map(r => (
                  <div key={r.id} className={`p-6 border-l-4 ${getPriorityColor(r.reason)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-sm font-medium text-gray-900">Report #{r.id.slice(0, 8)}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
                            {r.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            <Clock size={14} className="inline mr-1" />
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm text-gray-700 mb-1">
                            <strong>Listing ID:</strong> {r.listingId.slice(0, 8)}...
                          </p>
                          <p className="text-sm text-gray-700">
                            <strong>Reason:</strong> {r.reason}
                          </p>
                        </div>

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <User size={14} className="mr-1" />
                            Reporter ID: {r.reporterId?.slice(0, 8) || "N/A"}
                          </span>
                          <span className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Link 
                          to={`/listing/${r.listingId}`}
                          className="flex items-center space-x-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Eye size={16} />
                          <span>View</span>
                        </Link>
                        
                        {r.status === "open" && (
                          <>
                            <button 
                              onClick={() => handleUpdateReportStatus(r.id, "resolved")}
                              className="flex items-center space-x-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle size={16} />
                              <span>Resolve</span>
                            </button>
                            
                            <button 
                              onClick={() => handleUpdateReportStatus(r.id, "dismissed")}
                              className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              <XCircle size={16} />
                              <span>Dismiss</span>
                            </button>

                            <button 
                              onClick={() => handleForceRemoveListing(r.listingId)}
                              className="flex items-center space-x-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <XCircle size={16} />
                              <span>Remove Listing</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
              <p className="text-sm text-gray-600">View and manage all users</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">Loading users...</span>
              </div>
            ) : users.length === 0 ? (
              <EmptyState 
                title="No users found" 
                subtitle="No users in the system."
              />
            ) : (
              <>
                <div className="divide-y">
                  {users.map(u => (
                    <div key={u.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-sm font-medium text-gray-900">{u.name}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              u.role === "admin" ? "bg-purple-100 text-purple-600" :
                              u.role === "seller" ? "bg-blue-100 text-blue-600" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {u.role}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{u.email}</p>
                          <p className="text-xs text-gray-500">
                            Joined: {new Date(u.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {usersPagination.total > usersPagination.limit && (
                  <div className="px-6 py-4 border-t flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Showing {usersPagination.offset + 1}-{Math.min(usersPagination.offset + usersPagination.limit, usersPagination.total)} of {usersPagination.total}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setUsersPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
                          loadUsers();
                        }}
                        disabled={usersPagination.offset === 0}
                        className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => {
                          setUsersPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
                          loadUsers();
                        }}
                        disabled={usersPagination.offset + usersPagination.limit >= usersPagination.total}
                        className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "metrics" && metrics && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">System Metrics</h2>
              <p className="text-sm text-gray-600">Overview of platform statistics</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-4">Listings</h3>
                  <p className="text-3xl font-bold text-gray-900">{metrics.listings || 0}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-4">Users</h3>
                  <p className="text-3xl font-bold text-gray-900">{metrics.users || 0}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-4">Reports - Open</h3>
                  <p className="text-3xl font-bold text-orange-600">{metrics.reports?.open || 0}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-4">Reports - Reviewing</h3>
                  <p className="text-3xl font-bold text-blue-600">{metrics.reports?.reviewing || 0}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-4">Reports - Resolved</h3>
                  <p className="text-3xl font-bold text-green-600">{metrics.reports?.resolved || 0}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-4">Reports - Dismissed</h3>
                  <p className="text-3xl font-bold text-gray-600">{metrics.reports?.dismissed || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
