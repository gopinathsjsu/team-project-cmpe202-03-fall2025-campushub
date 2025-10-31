/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Send, Loader2, ExternalLink, Tag, DollarSign } from "lucide-react";
import api from "../api/apiClient";

export default function ChatbotModal({ onClose }) {
    const [q, setQ] = useState("used textbook for cmpe202");
    const [answer, setAnswer] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const ask = async () => {
        if (!q.trim()) return;

        setLoading(true);
        try {
            const res = await api.chatbotSearch(q);
            setAnswer(res.answer);
            setResults(res.results);
        } catch (error) {
            setAnswer(
                "Sorry, I couldn't process your request. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        ask();
    }, []);

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            ask();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-700 p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                            <svg
                                className="w-6 h-6 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">
                                AI Search Assistant
                            </h2>
                            <p className="text-xs text-primary-100">
                                Ask me anything about listings
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {/* Search Input */}
                    <div className="mb-6">
                        <div className="flex gap-2">
                            <input
                                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                                placeholder="e.g., used textbook for cmpe202"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={loading}
                            />
                            <button
                                onClick={ask}
                                disabled={loading}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 text-white font-medium hover:from-primary-600 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
                            >
                                {loading ? (
                                    <>
                                        <Loader2
                                            size={18}
                                            className="animate-spin"
                                        />
                                        <span>Searching...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        <span>Ask</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 ml-1">
                            Try: "MacBook under $500" or "Calculus textbook"
                        </p>
                    </div>

                    {/* AI Answer */}
                    {answer && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl border border-primary-100">
                            <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                    <svg
                                        className="w-5 h-5 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 10V3L4 14h7v7l9-11h-7z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-primary-900 mb-1">
                                        AI Response:
                                    </p>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {answer}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Results */}
                    {results.length > 0 ? (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                Found {results.length}{" "}
                                {results.length === 1 ? "listing" : "listings"}
                            </h3>
                            {results.map((r) => (
                                <div
                                    key={r.id}
                                    className="border border-gray-200 rounded-xl p-4 hover:border-primary-300 hover:shadow-md transition-all duration-200 bg-white"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-gray-900 mb-2 line-clamp-1">
                                                {r.title}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                                <span className="inline-flex items-center space-x-1 text-gray-600">
                                                    <Tag size={14} />
                                                    <span>{r.category}</span>
                                                </span>
                                                <span className="inline-flex items-center space-x-1 text-accent-700 font-semibold">
                                                    <DollarSign size={14} />
                                                    <span>{r.price}</span>
                                                </span>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/listing/${r.id}`}
                                            onClick={onClose}
                                            className="flex items-center space-x-1 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors whitespace-nowrap shadow-sm hover:shadow"
                                        >
                                            <span>View</span>
                                            <ExternalLink size={14} />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        !loading &&
                        answer && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
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
                                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-600">
                                    No listings found. Try a different search!
                                </p>
                            </div>
                        )
                    )}

                    {/* Loading State */}
                    {loading && !answer && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2
                                size={40}
                                className="text-primary-500 animate-spin mb-3"
                            />
                            <p className="text-sm text-gray-600">
                                Searching listings...
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
