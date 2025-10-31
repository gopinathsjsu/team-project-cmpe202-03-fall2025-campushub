import { useState } from "react";

export default function ChatPage() {
  const [threads, setThreads] = useState([
    { id: "t1", title: "CMPE 202 Textbook · alice", messages: [
      { from:"me", text:"Is $20 okay?" },
      { from:"alice", text:"Could you do $22?" }
    ] },
  ]);
  const [active, setActive] = useState("t1");
  const [input, setInput] = useState("");

  const addMsg = ()=>{
    if (!input.trim()) return;
    setThreads(ts=> ts.map(t=> t.id===active? {...t, messages:[...t.messages,{from:"me",text:input.trim()}]}:t));
    setInput("");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 grid md:grid-cols-3 gap-4">
      <div className="border rounded-2xl overflow-hidden">
        <div className="px-3 py-2 border-b font-medium">Chats</div>
        {threads.map(t=>(
          <button key={t.id} onClick={()=>setActive(t.id)} className={`w-full text-left px-3 py-2 border-b ${active===t.id?"bg-gray-50":""}`}>
            <div className="font-medium text-sm">{t.title}</div>
            <div className="text-xs text-gray-600 line-clamp-1">{t.messages.at(-1)?.text}</div>
          </button>
        ))}
      </div>
      <div className="md:col-span-2 border rounded-2xl flex flex-col">
        <div className="px-3 py-2 border-b font-medium">Negotiation</div>
        <div className="flex-1 p-3 space-y-2 overflow-auto">
          {threads.find(t=>t.id===active)?.messages.map((m,i)=>(
            <div key={i} className={`max-w-[70%] px-3 py-2 rounded-2xl ${m.from==="me"?"ml-auto bg-gray-900 text-white":"bg-gray-100"}`}>{m.text}</div>
          ))}
        </div>
        <div className="p-3 border-t flex gap-2">
          <input className="flex-1 border rounded-xl px-3 py-2" value={input} onChange={e=>setInput(e.target.value)} placeholder="Type a message" />
          <button onClick={addMsg} className="px-4 py-2 rounded-xl bg-gray-900 text-white">Send</button>
        </div>
      </div>
    </div>
  );
}
