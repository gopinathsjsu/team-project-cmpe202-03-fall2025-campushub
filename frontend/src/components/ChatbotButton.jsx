import { useState } from "react";
import { Sparkles } from "lucide-react";
import ChatbotModal from "./ChatbotModal";

export default function ChatbotButton() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
                <Sparkles size={16} className="animate-pulse" />
                <span className="hidden sm:inline">AI Assistant</span>
                <span className="sm:hidden">AI</span>
            </button>
            {open && <ChatbotModal onClose={() => setOpen(false)} />}
        </>
    );
}
