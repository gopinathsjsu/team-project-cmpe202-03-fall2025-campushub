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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReports: 0,
    openReports: 0,
    resolvedToday: 0
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listReports();
      setReports(res.items || []);
      
      // Calculate stats
      const total = res.items?.length || 0;
      const open = res.items?.filter(r => r.status === "open").length || 0;
      const today = new Date().toDateString();
      const resolvedToday = res.items?.filter(r => 
        r.status === "resolved" && new Date(r.resolvedAt).toDateString() === today
      ).length || 0;
      
      setStats({ totalReports: total, openReports: open, resolvedToday });
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (r, action) => {
    try {
      const updated = await api.resolveReport(r.id, action);
      setReports(rs => rs.map(x => x.id === r.id ? updated : x));
      load(); // Reload to update stats
    } catch (error) {
      console.error("Failed to resolve report:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "open": return "text-orange-600 bg-orange-100";
      case "resolved": return "text-green-600 bg-green-100";
      case "rejected": return "text-red-600 bg-red-100";
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalReports}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Flag size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Reports</p>
                <p className="text-2xl font-bold text-orange-600">{stats.openReports}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle size={24} className="text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolvedToday}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle size={24} className="text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Reports Section */}
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
                        <span className="text-sm font-medium text-gray-900">Report #{r.id}</span>
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
                          <strong>Listing ID:</strong> {r.listingId}
                        </p>
                        <p className="text-sm text-gray-700">
                          <strong>Reason:</strong> {r.reason}
                        </p>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <User size={14} className="mr-1" />
                          Reporter: {r.reporterEmail || "Anonymous"}
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
                            onClick={() => act(r, "approve")}
                            className="flex items-center space-x-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle size={16} />
                            <span>Approve</span>
                          </button>
                          
                          <button 
                            onClick={() => act(r, "reject")}
                            className="flex items-center space-x-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <XCircle size={16} />
                            <span>Reject</span>
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
      </div>
    </div>
  );
}
