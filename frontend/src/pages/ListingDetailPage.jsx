/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {ArrowLeft, Tag, DollarSign, Package, User, MessageCircle, Flag, CheckCircle, XCircle, Loader2, Calendar, AlertCircle, ChevronLeft, ChevronRight} from "lucide-react";
import api from "../api/apiClient";
//import { useAuth } from "../context/AuthContext";

export default function ListingDetailPage() {
  //const { userId } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

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

  //const toggleSold = async ()=>{ const updated=await api.updateListing(item.id,{sold:!item.sold}); setItem(updated); };
  const report = async ()=>{ const reason=prompt("Reason for report?"); if(!reason) return; await api.reportListing(item.id,reason); alert("Reported!"); };

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
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
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

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
     
          <div className="space-y-4">
            <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden shadow-lg">
              {hasImages ? (
                <>
                  <img
                    src={item.images[currentImageIndex]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  {item.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all"
                      >
                        <ChevronRight size={24} />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {item.images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <Package size={64} className="text-gray-400 mb-4" />
                  <p className="text-gray-500 font-medium">No Image Available</p>
                </div>
              )}

              {item.sold && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center space-x-2">
                  <XCircle size={20} />
                  <span>SOLD</span>
                </div>
              )}
            </div>

            {hasImages && item.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {item.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      currentImageIndex === index
                        ? "border-primary-500 scale-105"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${item.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
          
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {item.title}
                </h1>
                {item.condition && (
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium whitespace-nowrap">
                    {item.condition}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-4xl font-bold text-accent-600">
                <DollarSign size={32} />
                <span>{item.price}</span>
              </div>
            </div>

            {/* Category & Info */}
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg">
                <Tag size={16} className="text-gray-600" />
                <span className="text-gray-700 font-medium">{item.category}</span>
              </div>
              {item.createdAt && (
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg">
                  <Calendar size={16} className="text-gray-600" />
                  <span className="text-gray-700 text-sm">
                    Posted {formatDate(item.createdAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Description
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>

            {/* Seller Info */}
            <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-6 border border-primary-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
                  <User size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Seller</h3>
                  <p className="text-sm text-gray-600">
                    {item.seller || "Campus Student"}
                  </p>
                </div>
              </div>
              { !item.sold && (
                <Link
                  to="/chat"
                  state={{ listingId: item.id, sellerId: item.sellerId }}
                  className="flex items-center justify-center space-x-2 w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  <MessageCircle size={20} />
                  <span>Contact Seller</span>
                </Link>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Mark as Sold/Available (Owner/Admin only) */}
              {/* {canEdit && isOwner && (
                <button
                  onClick={toggleSold}
                  disabled={actionLoading}
                  className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    item.sold
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                  }`}
                >
                  {actionLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : item.sold ? (
                    <CheckCircle size={20} />
                  ) : (
                    <XCircle size={20} />
                  )}
                  <span>{item.sold ? "Mark Available" : "Mark as Sold"}</span>
                </button>
              )} */}

              {/* Report Button
              {!isOwner && ( */}
                <button
                  onClick={report}
                  disabled={actionLoading}
                  className="flex items-center justify-center space-x-2 px-6 py-3 rounded-lg border-2 border-red-300 text-red-600 hover:bg-red-50 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Flag size={20} />
                  )}
                  <span>Report Listing</span>
                </button>
              {/* )} */}
            </div>

            {/* Owner Notice
            {isOwner && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    This is your listing
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    You can manage this listing and mark it as sold when it's purchased.
                  </p>
                </div>
              </div>
            )} */}
          </div>
        </div>
      </div>
    </div>
  );
}
