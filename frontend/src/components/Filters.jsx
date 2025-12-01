import { Filter, X, DollarSign, Tag, ArrowUpDown} from "lucide-react";

const CATEGORIES = [
    "Textbooks",
    "Electronics",
    "Furniture",
    "Clothing",
    "Other",
];

const SORT_OPTIONS = [
    { value: "created_desc", label: "Newest First" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "price_desc", label: "Price: High to Low" },
];


export default function Filters({
    category,
    setCategory,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    sortBy,
    setSortBy,
    onClear,
}) {
    const hasActiveFilters = category !== "All" || minPrice || maxPrice || sortBy !== "created_desc";;

     return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <Filter size={18} className="text-primary-600" />
                <h3 className="font-semibold text-gray-900">Filters & Sort</h3>
                {hasActiveFilters && (
                    <span className="ml-auto text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                        Active
                    </span>
                )}
            </div>

            <div className="flex flex-wrap gap-3 items-center">
                {/* Category Filter */}
                <div className="relative">
                    <Tag
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <select
                        className="appearance-none border-2 border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all cursor-pointer bg-white"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="All">All Categories</option>
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg
                            className="w-4 h-4 text-gray-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>
                </div>

                {/* Sort By */}
                <div className="relative">
                    <ArrowUpDown
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <select
                        className="appearance-none border-2 border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all cursor-pointer bg-white"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        {SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg
                            className="w-4 h-4 text-gray-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>
                </div>

                {/* Price Range */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <DollarSign
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="number"
                            placeholder="Min"
                            className="border-2 border-gray-200 rounded-xl pl-8 pr-3 py-2.5 w-28 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                        />
                    </div>
                    <span className="text-gray-400 text-sm">to</span>
                    <div className="relative">
                        <DollarSign
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="number"
                            placeholder="Max"
                            className="border-2 border-gray-200 rounded-xl pl-8 pr-3 py-2.5 w-28 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                        />
                    </div>
                </div>

                {/* Clear Button */}
                {hasActiveFilters && (
                    <button
                        onClick={onClear}
                        className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 text-sm font-medium text-gray-700 hover:text-red-600 transition-all ml-auto"
                    >
                        <X size={16} />
                        <span>Clear All</span>
                    </button>
                )}
            </div>
        </div>
    );
}