import { Package, SearchX } from "lucide-react";

export default function EmptyState({ title, subtitle, action, icon: Icon }) {
    const DefaultIcon = title?.toLowerCase().includes("search")
        ? SearchX
        : Package;
    const DisplayIcon = Icon || DefaultIcon;

    return (
        <div className="text-center py-16 px-4">
            <div className="max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                    <DisplayIcon size={40} className="text-gray-400" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {title}
                </h3>
                <p className="text-gray-600 mb-6">{subtitle}</p>
                {action && <div className="mt-6">{action}</div>}
            </div>
        </div>
    );
}
