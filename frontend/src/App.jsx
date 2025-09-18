export default function App() {
    return (
        <>
            <div className="p-8 bg-gray-100">
                <h1 className="text-3xl font-bold text-primary-500 mb-4">
                    CampusHub - SJSU Marketplace
                </h1>
                <div className="space-y-4">
                    <button className="btn-primary">
                        Primary Button (SJSU Blue)
                    </button>
                    <button className="btn-secondary">
                        Secondary Button (SJSU Gold)
                    </button>
                    <button className="btn-outline">Outline Button</button>
                    <div className="card p-6 max-w-md">
                        <h2 className="text-xl font-semibold text-primary-700 mb-2">
                            Test Card
                        </h2>
                        <p className="text-gray-600">
                            This card uses SJSU colors and custom styling!
                        </p>
                        <div className="mt-4 space-x-2">
                            <span className="role-badge-buyer">Buyer</span>
                            <span className="role-badge-seller">Seller</span>
                            <span className="role-badge-admin">Admin</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
