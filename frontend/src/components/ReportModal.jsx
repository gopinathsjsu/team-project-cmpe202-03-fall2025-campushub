import { X, Flag, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function ReportModal({ isOpen, onClose, onSubmit, listingTitle }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for reporting");
      return;
    }
    if (reason.trim().length < 10) {
      setError("Reason must be at least 10 characters");
      return;
    }
    onSubmit(reason.trim());
    setReason("");
    setError("");
  };

  const handleClose = () => {
    setReason("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Flag size={20} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Report Listing</h2>
              <p className="text-sm text-gray-500">Help us keep the marketplace safe</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {listingTitle && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Reporting:</p>
              <p className="font-medium text-gray-900 truncate">{listingTitle}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for reporting <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              placeholder="Please describe why you're reporting this listing (e.g., inappropriate content, scam, duplicate listing, etc.)"
              className={`w-full border-2 rounded-lg px-4 py-3 text-sm focus:outline-none transition-all resize-none ${
                error
                  ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              }`}
              rows={5}
              maxLength={500}
            />
            {error && (
              <div className="flex items-center space-x-1 mt-2 text-red-600 text-xs">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              {reason.length}/500 characters (minimum 10)
            </div>
          </div>

          {/* Common Reasons */}
          <div className="mb-6">
            <p className="text-xs text-gray-600 mb-2">Common reasons:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Inappropriate content",
                "Scam or fraud",
                "Duplicate listing",
                "Item already sold",
                "Misleading information",
              ].map((commonReason) => (
                <button
                  key={commonReason}
                  type="button"
                  onClick={() => setReason(commonReason)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs font-medium transition-colors"
                >
                  {commonReason}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}