/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Loader2, TrendingUp } from "lucide-react";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import SearchBar from "../components/SearchBar";
import Filters from "../components/Filters";
import ListingCard from "../components/ListingCard";
import EmptyState from "../components/EmptyState";

export default function BrowsePage() {
    const { role } = useAuth();
    const [q, setQ] = useState("");
    const [category, setCategory] = useState("All");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.listListings({
                q,
                category,
                minPrice,
                maxPrice,
            });
            setData(res.items);
        } catch (error) {
            console.error("Failed to load listings:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);
    useEffect(() => {
        const id = setTimeout(load, 300);
        return () => clearTimeout(id);
    }, [q, category, minPrice, maxPrice]);

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

    const handleToggleSold = async (item) => {
        try {
            const updated = await api.updateListing(item.id, {
                sold: !item.sold,
            });
            setData((d) => d.map((x) => (x.id === item.id ? updated : x)));
        } catch (error) {
            alert("Failed to update listing status. Please try again.");
        }
    };

    const hasFilters = q || category !== "All" || minPrice || maxPrice;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
                <div className="mx-auto max-w-7xl px-4 py-12">
                    <div className="max-w-3xl">
                        <div className="flex items-center space-x-2 mb-3">
                            <TrendingUp size={24} className="text-accent-400" />
                            <span className="text-accent-300 font-medium text-sm">
                                Campus Marketplace
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                            Find What You Need
                        </h1>
                        <p className="text-lg text-primary-100 mb-6">
                            Browse textbooks, electronics, furniture, and more
                            from fellow SJSU students
                        </p>

                        {(role === "Seller" || role === "Admin") && (
                            <Link
                                to="/sell"
                                className="inline-flex items-center space-x-2 bg-accent-500 hover:bg-accent-600 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
                            >
                                <Plus size={20} />
                                <span>Post a Listing</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="mx-auto max-w-7xl px-4 py-8">
                <div className="space-y-6">
                    {/* Search and Filters */}
                    <div className="space-y-4">
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

                    {/* Results Header */}
                    {!loading && data.length > 0 && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                <span className="font-semibold text-gray-900">
                                    {data.length}
                                </span>{" "}
                                {data.length === 1 ? "listing" : "listings"}{" "}
                                found
                                {hasFilters && " matching your search"}
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2
                                size={48}
                                className="text-primary-500 animate-spin mb-4"
                            />
                            <p className="text-gray-600">Loading listings...</p>
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
                                (role === "Seller" || role === "Admin") && (
                                    <Link
                                        to="/sell"
                                        className="inline-flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                                    >
                                        <Plus size={20} />
                                        <span>Create Listing</span>
                                    </Link>
                                )
                            }
                        />
                    ) : (
                        /* Listings Grid */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {data.map((item) => (
                                <ListingCard
                                    key={item.id}
                                    item={item}
                                    onReport={handleReport}
                                    onToggleSold={
                                        role === "Seller"
                                            ? handleToggleSold
                                            : undefined
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
