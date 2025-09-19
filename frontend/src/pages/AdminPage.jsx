import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import Gate from "./Gate";
import EmptyState from "../components/EmptyState";

export default function AdminPage() {
  const { role } = useAuth();
  const [reports, setReports] = useState([]);

  const load = async ()=>{ const res=await api.listReports(); setReports(res.items); };
  useEffect(()=>{ if(role==="Admin") load(); },[role]);

  if (role !== "Admin") return <Gate role="Admin" />;

  const act = async (r, action)=>{ const updated=await api.resolveReport(r.id,action); setReports(rs=>rs.map(x=>x.id===r.id?updated:x)); };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Moderation Queue</h1>
      {reports.length===0 && <EmptyState title="No reports" subtitle="All clear!" />}
      <div className="grid gap-3">
        {reports.map(r=>(
          <div key={r.id} className="border rounded-2xl p-3 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Report #{r.id} · Listing {r.listingId}</div>
              <div className="text-sm text-gray-700">Reason: {r.reason}</div>
              <div className={`text-xs mt-1 ${r.status==="open"?"text-orange-600":"text-gray-600"}`}>Status: {r.status}</div>
            </div>
            <div className="flex gap-2">
              <Link to={`/listing/${r.listingId}`} className="px-3 py-1.5 rounded-xl border">Open</Link>
              <button onClick={()=>act(r,"approve")} className="px-3 py-1.5 rounded-xl bg-gray-900 text-white">Approve</button>
              <button onClick={()=>act(r,"reject")} className="px-3 py-1.5 rounded-xl border">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
