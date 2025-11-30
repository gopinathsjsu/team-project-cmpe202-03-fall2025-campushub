/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {ArrowLeft, Tag, DollarSign, Package, User, MessageCircle, Flag, CheckCircle, XCircle, Loader2, Calendar, AlertCircle, ChevronLeft, ChevronRight} from "lucide-react";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import ReportModal from "../components/ReportModal";
import toast, { Toaster } from "react-hot-toast";

export default function ListingDetailPage() {
  const { userId } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    loadListing();
  }, [id]);

  const loadListing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getListing(id);
      const listing = res.data || res;
      setItem(listing);
    } catch (error) {
      console.error("Failed to load listing:", error);
      setError(error.message || "Failed to load listing");
    } finally {
      setLoading(false);
    }
  };

  const handleReport = () => {
    setReportModalOpen(true);
  };

  const handleSubmitReport = async (reason) => {
    const toastId = toast.loading("Submitting report...");
    
    try {
      await api.reportListing(item.id, reason, userId);
      setReportModalOpen(false);
      toast.success("Thank you! Your report has been submitted to the Admin team for review.", { 
        id: toastId,
        duration: 4000 
      });
    } catch (error) {
      console.error("Failed to submit report:", error);
      toast.error("Failed to submit report. Please try again.", { 
        id: toastId 
      });
    }
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const nextImage = () => {
    if (item.images && item.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % item.images.length);
    }
  };

  const prevImage = () => {
    if (item.images && item.images.length > 0) {
      setCurrentImageIndex(
        (prev) => (prev - 1 + item.images.length) % item.images.length
      );
    }
  };

  const hasImages = item?.images && item.images.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading listing details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Listing Not Found
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Browse</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid lg:grid-cols-5 gap-4 lg:gap-6">
     
          <div className="lg:col-span-3 space-y-3">
            <div className="relative bg-white rounded-xl overflow-hidden shadow-md border border-gray-200">
              <div className="aspect-square w-full h-96 p-2 bg-gray-50 flex items-center justify-center">
               {hasImages ? (
                <>
                  <img
                    src={item.images[currentImageIndex].url}
                    alt={item.key}
                    className="w-full h-full object-contain p-2 sm:p-4"
                    style={{ maxHeight: '100%' }}
                  />
                  {item.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        aria-label="previous image"
                        className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all shadow-lg"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={nextImage}
                        aria-label="next image"
                        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all shadow-lg"
                      >
                        <ChevronRight size={20} />
                      </button>
                      <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium shadow-lg">
                          {currentImageIndex + 1} / {item.images.length}
                        </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8">
                  <Package size={64} className="text-gray-400 mb-4" />
                  <p className="text-gray-500 font-medium">No Image Available</p>
                </div>
              )}

              {item.sold && (
                <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-red-500 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow-lg flex items-center space-x-1 sm:space-x-1.5">
                    <XCircle size={14} className="sm:w-4 sm:h-4" />
                    <span>SOLD</span>
                  </div>
              )}
            </div>
            </div>

            {hasImages && item.images.length > 1 && (
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                {item.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-square rounded-md overflow-hidden border-2 transition-all bg-white ${
                      currentImageIndex === index
                         ? "border-blue-500 ring-1 ring-blue-200"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={`${item.key}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
          
           <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                  {item.title}
                </h1>
                {item.condition && (
                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                    {item.condition}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1 text-2xl sm:text-3xl font-bold text-green-600">
                <DollarSign size={24} className="sm:w-7 sm:h-7" />
                <span>{item.price}</span>
              </div>
            </div>

            {/* Category & Info */}
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 rounded-lg">
                <Tag size={14} className="text-gray-600" />
                <span className="text-gray-700 text-sm font-medium">{item.category}</span>
              </div>
              {item.createdAt && (
                <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 rounded-lg">
                  <Calendar size={14} className="text-gray-600" />
                  <span className="text-gray-700 text-xs sm:text-sm">
                    Posted {formatDate(item.createdAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                Description
              </h2>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>

            {/* Seller Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center space-x-2.5 mb-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Seller</h3>
                  <p className="text-xs text-gray-600">
                    {item.seller || "Campus Student"}
                  </p>
                </div>
              </div>
              {!item.sold && (
                <button
                  className="flex items-center justify-center space-x-2 w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  <MessageCircle size={18} />
                  <span>Contact Seller</span>
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleReport}
                disabled={actionLoading}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg border-2 border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Flag size={18} />
                )}
                <span>Report Listing</span>
              </button>
            </div>
          </div>
        </div>
      </div>
          <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleSubmitReport}
        listingTitle={item?.title}
      />  
      
    </div>
  );
}
