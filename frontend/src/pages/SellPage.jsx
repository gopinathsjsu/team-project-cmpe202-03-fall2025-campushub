/* eslint-disable no-unused-vars */
import { use, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";
import { Save, RotateCcw, DollarSign, Tag, FileText, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ImagePicker from "../components/ImagePicker";
import toast,{ Toaster } from "react-hot-toast";

const CATEGORIES = [
    "Textbooks",
    "Electronics",
    "Furniture",
    "Clothing",
    "Other",
];

const CONDITIONS = [
    { value: "New", label: "New" },
    { value: "LikeNew", label: "Like New" },
    { value: "Good", label: "Good" },
    { value: "Fair", label: "Fair" },
];

export default function SellPage() {
    
    const nav = useNavigate();
    const { userId } = useAuth();
    const [form, setForm] = useState({
        title: "",
        description: "",
        price: "",
        category: CATEGORIES[0],
        condition: "Good",
    });
    const [imageFiles, setImageFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

    
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
            toast.error('Please fix the form errors before submitting');
            return;
        }

        if (!userId) {
            alert("Please sign in to create a listing.");
            nav("/login");
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Creating your listing...');

        try {
            const payload = {
                sellerId: userId,
                title: form.title,
                description: form.description,
                price: Number(form.price),
                category: form.category,
                condition: form.condition,
            };

            const res = await api.createListing(payload);
            const created = res.data || res;

            toast.loading('Listing created! Uploading images...', { id: toastId });
           
            if (imageFiles.length > 0) {
                setUploadProgress({ current: 0, total: imageFiles.length });
                
                for (let i = 0; i < imageFiles.length; i++) {
                    setUploadProgress({ current: i + 1, total: imageFiles.length });
                    toast.loading(`Uploading image ${i + 1} of ${imageFiles.length}...`, { id: toastId });
                    
                    try {
                        await api.uploadImage(created.id, imageFiles[i], i === 0); 
                    } catch (imageError) {
                        console.error(`Failed to upload image ${i + 1}:`, imageError);
                    }
                }
            }
            
           toast.success('🎉 Listing created successfully!', { id: toastId, duration: 3000 });
        
            setTimeout(() => {
                nav(`/listing/${created.id}`);
            }, 1000);
        } catch (error) {
            console.error("Failed to create listing:", error);
            toast.error(error.message || 'Failed to create listing. Please try again.', { id: toastId });
            setLoading(false);
            setUploadProgress({ current: 0, total: 0 });
        }
    };

    const resetForm = () => {
        setForm({
            title: "",
            description: "",
            price: "",
            category: CATEGORIES[0],
            condition: "Good",
        });
        setImageFiles([]);
        setErrors({});
    };

    const updateField = (field, value) => {
        setForm((f) => ({ ...f, [field]: value }));
        if (errors[field]) {
            setErrors((e) => ({ ...e, [field]: null }));
        }
    };

    return (
        <>
        <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
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
                    <div className="grid md:grid-cols-3 gap-4">
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

                        <div>
                            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                                <span>Condition</span>
                            </label>
                            <div className="relative">
                                <select
                                className="appearance-none w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all cursor-pointer bg-white"
                                value={form.condition}
                                onChange={(e) => updateField("condition", e.target.value)}
                                disabled={loading}
                                >
                                <option value="New">New</option>
                                <option value="Like New">Like New</option>
                                <option value="Good">Good</option>
                                <option value="Fair">Fair</option>
                                <option value="Poor">Poor</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
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
                    <ImagePicker files={imageFiles} onChange={setImageFiles} disabled={loading} />

                    {/* Upload Progress */}
                    {loading && uploadProgress.total > 0 && (
                        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <Loader2 size={20} className="text-primary-600 animate-spin" />
                            <span className="text-sm font-medium text-primary-900">
                            Uploading images... ({uploadProgress.current}/{uploadProgress.total})
                            </span>
                        </div>
                        <div className="w-full bg-primary-200 rounded-full h-2">
                            <div
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                            />
                        </div>
                        </div>
                    )}

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
    </>
    );
}
