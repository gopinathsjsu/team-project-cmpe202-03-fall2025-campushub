/* eslint-disable no-unused-vars */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/apiClient";

export default function SignupPage() {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "buyer"
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { register } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Basic validation
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError("Password must be at least 8 characters long");
            setLoading(false);
            return;
        }

        // Check for campus email (sjsu.edu or campus.edu)
        if (!formData.email.includes("@sjsu.edu") && !formData.email.includes("@campus.edu")) {
            setError("Please use your campus email address (@sjsu.edu)");
            setLoading(false);
            return;
        }

        try {
            const name = `${formData.firstName} ${formData.lastName}`;
            const result = await api.signUp({
                name,
                email: formData.email,
                role: "buyer", // Default role
                password: formData.password
            });
            
            if (result && result.id) {
                // After signup, automatically sign in
                const signInResult = await api.signIn(formData.email, formData.password);
                if (signInResult && signInResult.user) {
                    const { user, token } = signInResult;
                    api.setToken(token);
                    login(user.role || "buyer", user.email, user.name || "", user.id || "");
                    navigate("/browse");
                } else {
                    // If auto sign-in fails, redirect to login
                    setError("Account created successfully! Please sign in.");
                    setTimeout(() => navigate("/login"), 2000);
                }
            } else {
                setError("Account created but failed to authenticate. Please sign in.");
                setTimeout(() => navigate("/login"), 2000);
            }
        } catch (err) {
            setError(err.message || "Failed to create account. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        if (error) setError("");
    };

    const passwordRequirements = [
        { text: "At least 8 characters", met: formData.password.length >= 8 },
        { text: "Passwords match", met: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 },
         {
            text: "Campus email (@sjsu.edu)",
            met: formData.email.endsWith("@sjsu.edu") || formData.email.endsWith("@campus.edu")
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full">
                {/* Back to Landing */}
                <Link
                    to="/"
                    className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 mb-8 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Home</span>
                </Link>

                {/* Signup Form */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="text-white font-bold text-2xl">CH</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Join CampusHub</h1>
                        <p className="text-gray-600">Create your account to start trading</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    First Name
                                </label>
                                <div className="relative">
                                    <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                                        placeholder="John"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Last Name
                                </label>
                                <div className="relative">
                                    <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Campus Email Address
                        </label>
                            <div className="relative">
                                <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                                    placeholder="your.name@campus.edu"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                                    placeholder="Create a password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                                    placeholder="Confirm your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Password Requirements */}
                        <div className="space-y-2">
                            {passwordRequirements.map((req, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <CheckCircle 
                                        size={16} 
                                        className={req.met ? "text-green-500" : "text-gray-300"} 
                                    />
                                    <span className={`text-sm ${req.met ? "text-green-600" : "text-gray-500"}`}>
                                        {req.text}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !passwordRequirements.every(req => req.met)}
                            className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Creating Account...</span>
                                </div>
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            Already have an account?{" "}
                            <Link
                                to="/login"
                                className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                            >
                                Sign in here
                            </Link>
                        </p>
                    </div>

                    {/* Terms */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-500">
                            By creating an account, you agree to our Terms of Service and Privacy Policy
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
