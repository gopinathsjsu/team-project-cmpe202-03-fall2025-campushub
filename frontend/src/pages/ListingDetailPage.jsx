import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";

export default function ListingDetailPage() {
  const { role, userId } = useAuth();
  const { id } = useParams();
  const [item, setItem] = useState(null);

  useEffect(()=>{ 
    api.getListing(id).then(setItem).catch(err => {
      console.error("Failed to load listing:", err);
    });
  },[id]);

  if (!item) return <div className="mx-auto max-w-4xl px-4 py-6">Loading…</div>;

  const toggleSold = async ()=>{ 
    try {
      await api.markAsSold(item.id);
      setItem({...item, status: "sold"});
      alert("Listing marked as sold!");
    } catch (err) {
      alert("Failed to update listing: " + err.message);
    }
  };
  
  const report = async ()=>{ 
    if (!userId) {
      alert("Please sign in to report a listing.");
      return;
    }
    const reason=prompt("Reason for report?"); 
    if(!reason || !reason.trim()) return; 
    try {
      await api.reportListing(item.id, userId, reason); 
      alert("Reported!");
    } catch (err) {
      alert("Failed to report: " + err.message);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 grid md:grid-cols-2 gap-6">
      <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
        {item.images?.[0] ? <img src={item.images[0]} alt="" className="w-full h-full object-cover rounded-xl"/> : "No Photo"}
      </div>
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">{item.title}</h1>
        <div className="text-gray-600">{item.category}</div>
        <div className="text-lg">${item.price}</div>
        <p className="text-gray-700">{item.description}</p>
        <div className="flex gap-2 mt-2">
          {role==="Seller" && <button onClick={toggleSold} className="px-3 py-2 rounded-xl border">{item.sold?"Mark as Available":"Mark as Sold"}</button>}
          <Link to="/chat" className="px-3 py-2 rounded-xl bg-gray-900 text-white">Message Seller</Link>
          <button onClick={report} className="px-3 py-2 rounded-xl border">Report</button>
        </div>
      </div>
    </div>
  );
}
