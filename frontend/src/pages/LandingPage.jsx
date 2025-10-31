import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { 
    ShoppingBag, 
    Store, 
    MessageCircle, 
    Shield, 
    Users, 
    BookOpen, 
    Laptop, 
    Home,
    ArrowRight,
    CheckCircle
} from "lucide-react";

export default function LandingPage() {
    const { isAuthenticated, isAdmin } = useAuth();
    const navigate = useNavigate();

    // Redirect authenticated users to appropriate page
    useEffect(() => {
        if (isAuthenticated) {
            if (isAdmin) {
                navigate("/admin", { replace: true });
            } else {
                navigate("/browse", { replace: true });
            }
        }
    }, [isAuthenticated, isAdmin, navigate]);
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="mx-auto max-w-7xl px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-lg">CH</span>
                            </div>
                            <div>
                                <div className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                                    CampusHub
                                </div>
                                <div className="text-[10px] text-accent-600 font-medium -mt-1">
                                    Campus Marketplace
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link
                                to="/login"
                                className="px-4 py-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
                            >
                                Login
                            </Link>
                            <Link
                                to="/signup"
                                className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Sign Up
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-20">
                <div className="mx-auto max-w-7xl px-4">
                    <div className="text-center max-w-4xl mx-auto">
                        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                            Welcome to{" "}
                            <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                                CampusHub
                            </span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                            The ultimate marketplace for campus students. Buy, sell, and trade textbooks, 
                            electronics, furniture, and more with your fellow students.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/signup"
                                className="inline-flex items-center space-x-2 px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
                            >
                                <span>Get Started</span>
                                <ArrowRight size={20} />
                            </Link>
                            <Link
                                to="/login"
                                className="inline-flex items-center space-x-2 px-8 py-4 border-2 border-primary-500 text-primary-600 hover:bg-primary-50 rounded-xl font-semibold text-lg transition-all"
                            >
                                <span>Login</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-16 bg-white">
                <div className="mx-auto max-w-7xl px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Why Choose CampusHub?
                        </h2>
                        <p className="text-lg text-gray-600">
                            Built specifically for campus students, by campus students
                        </p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100">
                            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <ShoppingBag size={32} className="text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Buying</h3>
                            <p className="text-gray-600">
                                Browse thousands of items from fellow campus students with powerful search and filters
                            </p>
                        </div>

                        <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-accent-50 to-accent-100">
                            <div className="w-16 h-16 bg-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Store size={32} className="text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Simple Selling</h3>
                            <p className="text-gray-600">
                                List your items in minutes with our intuitive posting system
                            </p>
                        </div>

                        <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-green-50 to-green-100">
                            <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <MessageCircle size={32} className="text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Direct Chat</h3>
                            <p className="text-gray-600">
                                Communicate directly with buyers and sellers through our built-in chat
                            </p>
                        </div>

                        <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100">
                            <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Shield size={32} className="text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Safe & Secure</h3>
                            <p className="text-gray-600">
                                Verified campus students only with admin moderation for your safety
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories Section */}
            <section className="py-16">
                <div className="mx-auto max-w-7xl px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Popular Categories
                        </h2>
                        <p className="text-lg text-gray-600">
                            Find exactly what you're looking for
                        </p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                                <BookOpen size={24} className="text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Textbooks</h3>
                            <p className="text-gray-600 text-sm">
                                Course books, study guides, and academic materials
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                                <Laptop size={24} className="text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Electronics</h3>
                            <p className="text-gray-600 text-sm">
                                Laptops, phones, gadgets, and tech accessories
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                                <Home size={24} className="text-orange-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Furniture</h3>
                            <p className="text-gray-600 text-sm">
                                Dorm furniture, desks, chairs, and home essentials
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                                <Users size={24} className="text-purple-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Clothing</h3>
                            <p className="text-gray-600 text-sm">
                                Campus gear, casual wear, and seasonal clothing
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-16 bg-white">
                <div className="mx-auto max-w-7xl px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            How It Works
                        </h2>
                        <p className="text-lg text-gray-600">
                            Get started in just a few simple steps
                        </p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                                1
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Sign Up</h3>
                            <p className="text-gray-600">
                                Create your account with your campus email address
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-accent-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                                2
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Browse or List</h3>
                            <p className="text-gray-600">
                                Search for items you need or list items you want to sell
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                                3
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect & Trade</h3>
                            <p className="text-gray-600">
                                Chat with other students and arrange meetups to complete trades
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 bg-gradient-to-r from-primary-600 to-accent-600">
                <div className="mx-auto max-w-4xl px-4 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Ready to Get Started?
                    </h2>
                    <p className="text-xl text-primary-100 mb-8">
                        Join thousands of campus students already using CampusHub
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/signup"
                            className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-primary-600 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl hover:bg-gray-50"
                        >
                            <span>Create Account</span>
                            <ArrowRight size={20} />
                        </Link>
                        <Link
                            to="/login"
                            className="inline-flex items-center space-x-2 px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-primary-600 rounded-xl font-semibold text-lg transition-all"
                        >
                            <span>Login</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="mx-auto max-w-7xl px-4">
                    <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-lg">CH</span>
                            </div>
                            <div className="text-xl font-bold">CampusHub</div>
                        </div>
                        <p className="text-gray-400 mb-4">
                            Campus's premier student marketplace
                        </p>
                        <p className="text-sm text-gray-500">
                            © 2024 CampusHub. Built for campus students.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
