/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Loader2, Package, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../api/apiClient";
import SearchBar from "../components/SearchBar";
import Filters from "../components/Filters";
import ListingCard from "../components/ListingCard";
import EmptyState from "../components/EmptyState";

const ITEMS_PER_PAGE = 12;

export default function BrowsePage() {
    
    const [q, setQ] = useState("");
    const [category, setCategory] = useState("All");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const load = async (page=1) => {
        setLoading(true);
        try {
            const offset = (page - 1) * ITEMS_PER_PAGE;
            const res = await api.listListings({
                q,
                category: category !== "All" ? category : undefined,
                priceMin: minPrice || undefined,
                priceMax: maxPrice || undefined,
                limit: ITEMS_PER_PAGE,
                offset: offset,
                sort: "created_desc",
            });
            const responseData = res.data || res;
            const items = responseData.items || [];
            const total = responseData.total || items.length;
            
            setData(Array.isArray(items) ? items : []);
            setTotalItems(total);
        } catch (error) {
            console.error("Failed to load listings:", error);
            setError(error.message || "Failed to load listings");
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
        const debounceTimer = setTimeout(() => {
            load(1);
        }, 300); 
        return () => clearTimeout(debounceTimer);
    }, [q, category, minPrice, maxPrice]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
        load(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleReport = async (item) => {
        const reason = prompt(
            "Please provide a reason for reporting this listing:"
        );
        if (!reason || !reason.trim()) return;
        try {
            await api.reportListing(item.id, reason);
            alert(
                "Thank you! Your report has been submitted to the Admin team for review."
            );
        } catch (error) {
            alert("Failed to submit report. Please try again.");
        }
    };

    const hasFilters = q || category !== "All" || minPrice || maxPrice;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-xl">
                <div className="mx-auto max-w-7xl px-4 py-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center space-x-2 mb-2">
                                <Package size={20} className="text-accent-300" />
                                <span className="text-accent-200 font-medium text-sm">
                                    Campus Marketplace
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white">
                                Browse Listings
                            </h1>
                            <p className="text-primary-100 mt-1 text-sm">
                                {totalItems > 0 ? `${totalItems} items available` : "Find great deals from fellow students"}
                            </p>
                        </div>

                        <Link
                            to="/sell"
                            className="inline-flex items-center space-x-2 bg-accent-500 hover:bg-accent-600 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 duration-200"
                        >
                            <Plus size={20} />
                            <span>Post a Listing</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="mx-auto max-w-7xl px-4 py-6">
                <div className="space-y-6">
                    {/* Search and Filters */}
                    <div className="space-y-3">
                        <SearchBar value={q} onChange={setQ} />
                        <Filters
                            category={category}
                            setCategory={setCategory}
                            minPrice={minPrice}
                            setMinPrice={setMinPrice}
                            maxPrice={maxPrice}
                            setMaxPrice={setMaxPrice}
                            onClear={() => {
                                setCategory("All");
                                setMinPrice("");
                                setMaxPrice("");
                            }}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-red-600 font-semibold mb-1">Failed to load listings</p>
                            <p className="text-red-500 text-sm mb-4">{error}</p>
                            <button
                                onClick={() => load(currentPage)}
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}


                    {/* Results Header */}
                    {!loading && !error && data.length > 0 && (
                        <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
                            <div className="text-sm text-gray-600">
                                Showing <span className="font-semibold text-gray-900">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> - <span className="font-semibold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</span> of <span className="font-semibold text-gray-900">{totalItems}</span> {totalItems === 1 ? "listing" : "listings"}
                                {hasFilters && <span className="text-primary-600"> (filtered)</span>}
                            </div>
                            {totalPages > 1 && (
                                <div className="text-sm text-gray-500">
                                    Page {currentPage} of {totalPages}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <Loader2
                                size={48}
                                className="text-primary-500 animate-spin mb-4"
                            />
                            <p className="text-gray-600">Loading listings...</p>
                            <p className="text-gray-400 text-sm mt-1">Please wait</p>
                        </div>
                    ) : data.length === 0 ? (
                        /* Empty State */
                        <EmptyState
                            title={
                                hasFilters
                                    ? "No listings found"
                                    : "No listings available"
                            }
                            subtitle={
                                hasFilters
                                    ? "Try adjusting your filters or search terms"
                                    : "Be the first to post a listing!"
                            }
                            action={
                                <Link
                                    to="/sell"
                                    className="inline-flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                                >
                                    <Plus size={20} />
                                    <span>Create Listing</span>
                                </Link>
                            }
                        />
                    ): !error && data.length > 0 ? (
                        <>
                            {/* Listings Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {data.map((item) => (
                                    <ListingCard
                                        key={item.id}
                                        item={item}
                                        onReport={handleReport}
                                        
                                    />
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 mt-8 pb-8">
                                    {/* Previous Button */}
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="flex items-center space-x-1 px-4 py-2 rounded-lg border-2 border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft size={18} />
                                        <span className="hidden sm:inline">Previous</span>
                                    </button>

                                    {/* Page Numbers */}
                                    <div className="flex items-center gap-1">
                                        {[...Array(totalPages)].map((_, index) => {
                                            const page = index + 1;
                                            
                                            if (
                                                page === 1 ||
                                                page === totalPages ||
                                                (page >= currentPage - 1 && page <= currentPage + 1)
                                            ) {
                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => handlePageChange(page)}
                                                        className={`w-10 h-10 rounded-lg font-medium transition-all ${
                                                            currentPage === page
                                                                ? "bg-primary-500 text-white shadow-md"
                                                                : "bg-white border-2 border-gray-300 hover:border-primary-300 hover:bg-primary-50"
                                                        }`}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            } else if (
                                                page === currentPage - 2 ||
                                                page === currentPage + 2
                                            ) {
                                                return (
                                                    <span key={page} className="text-gray-400 px-1">
                                                        ...
                                                    </span>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>

                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="flex items-center space-x-1 px-4 py-2 rounded-lg border-2 border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        <span className="hidden sm:inline">Next</span>
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}