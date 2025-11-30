/* eslint-disable no-unused-vars */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Loader2, Package, DollarSign, ShoppingBag, CheckCircle, Edit, Trash2, Eye, ToggleLeft, ToggleRight} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";

export default function MyListingsPage() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const [filterTab, setFilterTab] = useState("all"); 
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    sold: 0,
    revenue: 0,
  });

  useEffect(() => {
    if (!hasLoadedRef.current) { // Only run once
      hasLoadedRef.current = true;
      loadMyListings();
    }
  }, []);

  useEffect(() => {
    if (listings.length > 0) {
      calculateStats(listings);
    }
  }, [listings]);

  const loadMyListings = async () => {
    // Check if user is authenticated and has token
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.error("No auth token found, redirecting to login");
      toast.error("Please log in to view your listings");
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      const res = await api.getMyListings();
      const responseData = res.data || res;
      const myItems = responseData.items || [];

      setListings(myItems);
      
    } catch (error) {
      console.error("Failed to load listings:", error);
      // If unauthorized, redirect to login
      if (error.message && (error.message.includes("401") || error.message.includes("unauthorized") || error.message.includes("Unauthorized"))) {
        toast.error("Your session has expired. Please log in again.");
        navigate("/login");
      } else {
        toast.error("Failed to load your listings");
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (items) => {
    const total = items.length;
    const active = items.filter((item) => item.status === "active").length; 
    const sold = items.filter((item) => item.status === "sold").length;     
    const revenue = items
        .filter((item) => item.status === "sold")
        .reduce((sum, item) => sum + item.price, 0)
        .toFixed(2);

    setStats({ total, active, sold, revenue });
  };

  const handleToggleSold = async (item) => {
 
    const toastId = toast.loading("Updating listing...");
  
    try {
        const res = await api.markAsSold(item.id);

        setListings((prevListings) => {
        const newListings = prevListings.map((listing) =>
            listing.id === item.id 
            ? { ...listing, status: "sold" }  
            : listing
        );
       
        return newListings;
        });

        toast.success("Marked as sold!", { id: toastId });
    } catch (error) {
        console.error("Toggle error:", error);
        toast.error("Failed to update listing", { id: toastId });
    }
    };

  const handleDelete = async (item) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${item.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    const toastId = toast.loading("Deleting listing...");
    try {
      await api.deleteListing(item.id);
      setListings((prev) => prev.filter((listing) => listing.id !== item.id));
     
      toast.success("Listing deleted successfully!", { id: toastId });
    } catch (error) {
      toast.error("Failed to delete listing", { id: toastId });
    }
  };

  const filteredListings = listings.filter((item) => {
    if (filterTab === "active") return item.status === "active"; 
    if (filterTab === "sold") return item.status === "sold";  
    return true;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">
                  My Listings
                </h1>
                <p className="text-primary-100">
                  Manage your marketplace items
                </p>
              </div>
              <Link
                to="/sell"
                className="inline-flex items-center justify-center space-x-2 bg-accent-500 hover:bg-accent-600 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                <Plus size={20} />
                <span>Create New Listing</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mx-auto max-w-7xl px-4 -mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-primary-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Listings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                </div>
                <Package size={32} className="text-primary-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.active}
                  </p>
                </div>
                <ShoppingBag size={32} className="text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Sold</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.sold}
                  </p>
                </div>
                <CheckCircle size={32} className="text-orange-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-accent-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats.revenue}
                  </p>
                </div>
                <DollarSign size={32} className="text-accent-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-7xl px-4 py-6">
          {/* Filter Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="flex border-b">
              <button
                onClick={() => setFilterTab("all")}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  filterTab === "all"
                    ? "border-b-2 border-primary-500 text-primary-600 bg-primary-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilterTab("active")}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  filterTab === "active"
                    ? "border-b-2 border-green-500 text-green-600 bg-green-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Active ({stats.active})
              </button>
              <button
                onClick={() => setFilterTab("sold")}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  filterTab === "sold"
                    ? "border-b-2 border-orange-500 text-orange-600 bg-orange-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Sold ({stats.sold})
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2
                size={48}
                className="text-primary-500 animate-spin mb-4"
              />
              <p className="text-gray-600">Loading your listings...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {filterTab === "all"
                  ? "No listings yet"
                  : filterTab === "active"
                  ? "No active listings"
                  : "No sold items"}
              </h3>
              <p className="text-gray-600 mb-6">
                {filterTab === "all"
                  ? "Start selling by creating your first listing!"
                  : filterTab === "active"
                  ? "All your listings are marked as sold"
                  : "You haven't sold anything yet"}
              </p>
              {filterTab === "all" && (
                <Link
                  to="/sell"
                  className="inline-flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <Plus size={20} />
                  <span>Create Your First Listing</span>
                </Link>
              )}
            </div>
          ) : (
            /* Listings Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-md border-2 border-gray-200 overflow-hidden hover:border-primary-300 hover:shadow-lg transition-all"
                >
                  {/* Image */}
                  <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200">
                    {item.images?.[0] ? (
                      <img
                        src={item.images[0].url}
                        alt={item.key}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={48} className="text-gray-400" />
                      </div>
                    )}
                    {item.sold && (
                      <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg">
                        SOLD
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1 text-lg">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xl font-bold text-accent-600">
                        ${item.price}
                      </span>
                      <span className="text-xs text-gray-500">
                        {item.createdAt && formatDate(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {item.description}
                    </p>

                    {/* Sold Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
                      <span className="text-sm font-medium text-gray-700">
                        Mark as Sold
                      </span>
                    
                        {item.status === "sold" && (  
                        <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg">
                            SOLD
                        </div>
                        )}

                        <button
                        onClick={() => handleToggleSold(item)}
                        disabled={item.status === "sold"} 
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                            item.status === "sold" 
                            ? 'bg-red-500 cursor-not-allowed opacity-50' 
                            : 'bg-green-500'
                        }`}
                        >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            item.status === "sold" ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <Link
                        to={`/listing/${item.id}`}
                        className="flex items-center justify-center space-x-1 px-3 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Eye size={16} />
                        <span>View</span>
                      </Link>

                      <button
                        onClick={() => navigate(`/listing/${item.id}/edit`)}
                        className="flex items-center justify-center space-x-1 px-3 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Edit size={16} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDelete(item)}
                        className="flex items-center justify-center space-x-1 px-3 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}