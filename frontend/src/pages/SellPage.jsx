/* eslint-disable no-unused-vars */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";
// No longer need role-based restrictions
import ImagePicker from "../components/ImagePicker";
import {
    Save,
    RotateCcw,
    DollarSign,
    Tag,
    FileText,
    Image as ImageIcon,
    AlertCircle,
} from "lucide-react";

const CATEGORIES = [
    "Textbooks",
    "Electronics",
    "Furniture",
    "Clothing",
    "Other",
];

export default function SellPage() {
    const nav = useNavigate();
    const [form, setForm] = useState({
        title: "",
        description: "",
        price: "",
        category: CATEGORIES[0],
        images: [],
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // All authenticated users can sell items

    const validateForm = () => {
        const newErrors = {};

        if (!form.title.trim()) {
            newErrors.title = "Title is required";
        } else if (form.title.length < 3) {
            newErrors.title = "Title must be at least 3 characters";
        }

        if (!form.price) {
            newErrors.price = "Price is required";
        } else if (Number(form.price) <= 0) {
            newErrors.price = "Price must be greater than 0";
        }

        if (!form.description.trim()) {
            newErrors.description = "Description is required";
        } else if (form.description.length < 10) {
            newErrors.description =
                "Description must be at least 10 characters";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const payload = { ...form, price: Number(form.price) };
            const created = await api.createListing(payload);
            alert("Listing created successfully!");
            nav(`/listing/${created.id}`);
        } catch (error) {
            alert("Failed to create listing. Please try again.");
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({
            title: "",
            description: "",
            price: "",
            category: CATEGORIES[0],
            images: [],
        });
        setErrors({});
    };

    const updateField = (field, value) => {
        setForm((f) => ({ ...f, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((e) => ({ ...e, [field]: null }));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
                <div className="mx-auto max-w-3xl px-4 py-12">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-accent-500 rounded-xl flex items-center justify-center">
                            <Tag size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl text-white md:text-4xl font-bold">
                                Create a Listing
                            </h1>
                            <p className="text-primary-100 mt-1">
                                Share what you're selling with campus students
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Section */}
            <div className="mx-auto max-w-3xl px-4 py-8">
                <form
                    onSubmit={submit}
                    className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8 space-y-6"
                >
                    {/* Title Field */}
                    <div>
                        <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                            <FileText size={16} className="text-primary-600" />
                            <span>Title</span>
                            <span className="text-red-500">*</span>
                        </label>
                        <input
                            className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none transition-all ${
                                errors.title
                                    ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                                    : "border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                            }`}
                            placeholder="e.g., CMPE 202 Textbook - Software Engineering"
                            value={form.title}
                            onChange={(e) =>
                                updateField("title", e.target.value)
                            }
                            maxLength={100}
                        />
                        {errors.title && (
                            <div className="flex items-center space-x-1 mt-2 text-red-600 text-xs">
                                <AlertCircle size={14} />
                                <span>{errors.title}</span>
                            </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                            {form.title.length}/100 characters
                        </div>
                    </div>

                    {/* Description Field */}
                    <div>
                        <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                            <FileText size={16} className="text-primary-600" />
                            <span>Description</span>
                            <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none transition-all resize-none ${
                                errors.description
                                    ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                                    : "border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                            }`}
                            rows={5}
                            placeholder="Describe the item, its condition, any defects, and why you're selling it..."
                            value={form.description}
                            onChange={(e) =>
                                updateField("description", e.target.value)
                            }
                            maxLength={500}
                        />
                        {errors.description && (
                            <div className="flex items-center space-x-1 mt-2 text-red-600 text-xs">
                                <AlertCircle size={14} />
                                <span>{errors.description}</span>
                            </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                            {form.description.length}/500 characters
                        </div>
                    </div>

                    {/* Category and Price Row */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Category Field */}
                        <div>
                            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                                <Tag size={16} className="text-primary-600" />
                                <span>Category</span>
                            </label>
                            <div className="relative">
                                <select
                                    className="appearance-none w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all cursor-pointer bg-white"
                                    value={form.category}
                                    onChange={(e) =>
                                        updateField("category", e.target.value)
                                    }
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg
                                        className="w-5 h-5 text-gray-400"
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
                        </div>

                        {/* Price Field */}
                        <div>
                            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                                <DollarSign
                                    size={16}
                                    className="text-accent-600"
                                />
                                <span>Price</span>
                                <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <DollarSign
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                    type="number"
                                    className={`w-full border-2 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none transition-all ${
                                        errors.price
                                            ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                                            : "border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                                    }`}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    value={form.price}
                                    onChange={(e) =>
                                        updateField("price", e.target.value)
                                    }
                                />
                            </div>
                            {errors.price && (
                                <div className="flex items-center space-x-1 mt-2 text-red-600 text-xs">
                                    <AlertCircle size={14} />
                                    <span>{errors.price}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Image Picker */}
                    <div>
                        <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                            <ImageIcon size={16} className="text-primary-600" />
                            <span>Photos</span>
                            <span className="text-xs font-normal text-gray-500">
                                (Optional)
                            </span>
                        </label>
                        <ImagePicker
                            images={form.images}
                            onChange={(imgs) => updateField("images", imgs)}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Publishing...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    <span>Publish Listing</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={resetForm}
                            disabled={loading}
                            className="flex items-center justify-center space-x-2 px-6 py-3 rounded-xl border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RotateCcw size={20} />
                            <span>Reset Form</span>
                        </button>
                    </div>

                    {/* Help Text */}
                    <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
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
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-primary-900 mb-1">
                                    Tips for a great listing
                                </h4>
                                <ul className="text-xs text-primary-800 space-y-1">
                                    <li>• Use a clear, descriptive title</li>
                                    <li>
                                        • Include photos from multiple angles
                                    </li>
                                    <li>
                                        • Be honest about the item's condition
                                    </li>
                                    <li>
                                        • Price competitively based on market
                                        value
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
