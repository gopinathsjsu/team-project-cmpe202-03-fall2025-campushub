import { useState } from "react";
import ChatbotModal from "./ChatbotModal";

export default function ChatbotButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={()=>setOpen(true)} className="px-3 py-1.5 rounded-xl border text-sm">Find via Chatbot</button>
      {open && <ChatbotModal onClose={()=>setOpen(false)} />}
    </>
  );
}
