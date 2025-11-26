import { Link } from "react-router-dom";
import { Eye, Flag, CheckCircle, XCircle, Tag, DollarSign } from "lucide-react";

export default function ListingCard({ item, onToggleSold, onReport }) {
    return (
        <div className="group border-2 border-gray-200 rounded-2xl overflow-hidden bg-white hover:border-primary-300 hover:shadow-lg transition-all duration-200">
            {/* Image Section */}
            <div className="relative aspect-video w-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                {item.images?.[0] ? (
                    <img
                        src={item.images[0].url}
                        alt={item.key}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-2 bg-gray-300 rounded-full flex items-center justify-center">
                                <svg
                                    className="w-8 h-8 text-gray-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                            <p className="text-xs text-gray-500">No Image</p>
                        </div>
                    </div>
                )}

                {/* Sold Badge */}
                {item.sold && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center space-x-1">
                        <XCircle size={14} />
                        <span>SOLD</span>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-4 space-y-3">
                {/* Title and Category */}
                <div>
                    <h3 className="font-semibold text-gray-900 text-base line-clamp-1 mb-1 group-hover:text-primary-600 transition-colors">
                        {item.title}
                    </h3>
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1 text-gray-600">
                            <Tag size={14} />
                            <span>{item.category}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-accent-700 font-bold">
                            <DollarSign size={16} />
                            <span className="text-lg">{item.price}</span>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {item.description}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                    <Link
                        to={`/listing/${item.id}`}
                        className="flex-1 flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors shadow-sm hover:shadow"
                    >
                        <Eye size={16} />
                        <span>View Details</span>
                    </Link>

                    {onToggleSold && (
                        <button
                            onClick={() => onToggleSold(item)}
                            className={`flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                item.sold
                                    ? "bg-green-50 hover:bg-green-100 text-green-700 border-2 border-green-200"
                                    : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-gray-200"
                            }`}
                        >
                            {item.sold ? (
                                <>
                                    <CheckCircle size={16} />
                                    <span className="hidden sm:inline">
                                        Available
                                    </span>
                                </>
                            ) : (
                                <>
                                    <XCircle size={16} />
                                    <span className="hidden sm:inline">
                                        Mark Sold
                                    </span>
                                </>
                            )}
                        </button>
                    )}

                    <button
                        onClick={() => onReport(item)}
                        className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-lg bg-white hover:bg-red-50 text-gray-700 hover:text-red-600 border-2 border-gray-200 hover:border-red-300 text-sm font-medium transition-all"
                        title="Report listing"
                    >
                        <Flag size={16} />
                        <span className="hidden sm:inline">Report</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
