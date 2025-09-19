import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/apiClient";

export default function ChatbotModal({ onClose }) {
  const [q, setQ] = useState("used textbook for cmpe202");
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const ask = async ()=>{
    setLoading(true);
    const res = await api.chatbotSearch(q);
    setAnswer(res.answer);
    setResults(res.results);
    setLoading(false);
  };

  useEffect(()=>{ ask(); },[]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow grid">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-medium">Search Assistant</div>
          <button onClick={onClose} className="text-sm px-2 py-1 border rounded">Close</button>
        </div>
        <div className="p-3 grid gap-3">
          <div className="flex gap-2">
            <input className="flex-1 border rounded-xl px-3 py-2" value={q} onChange={e=>setQ(e.target.value)} />
            <button onClick={ask} className="px-4 py-2 rounded-xl bg-gray-900 text-white" disabled={loading}>
              {loading? "Searching…":"Ask"}
            </button>
          </div>
          {answer && <div className="text-sm text-gray-700">{answer}</div>}
          <div className="grid gap-2">
            {results.map(r=> (
              <div key={r.id} className="border rounded-xl p-2 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{r.title}</div>
                  <div className="text-xs text-gray-600">{r.category} · ${r.price}</div>
                </div>
                <Link to={`/listing/${r.id}`} className="px-3 py-1.5 rounded-xl border text-sm">Open</Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
