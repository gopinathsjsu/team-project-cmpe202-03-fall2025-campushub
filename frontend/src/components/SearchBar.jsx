import { Search } from "lucide-react";

export default function SearchBar({ value, onChange }) {
    return (
        <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={20} />
            </div>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search by title or description..."
                className="w-full border-2 border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
            />
        </div>
    );
}
