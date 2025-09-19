import { useEffect, useState } from "react";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import SearchBar from "../components/SearchBar";
import Filters from "../components/Filters";
import ListingCard from "../components/ListingCard";
import EmptyState from "../components/EmptyState";

export default function BrowsePage() {
  const { role } = useAuth();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await api.listListings({ q, category, minPrice, maxPrice });
    setData(res.items);
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);
  useEffect(()=>{ const id=setTimeout(load,300); return ()=>clearTimeout(id); },[q,category,minPrice,maxPrice]);

  const handleReport = async (item) => {
    const reason = prompt("Reason for report?");
    if (!reason) return;
    await api.reportListing(item.id, reason);
    alert("Report submitted to Admin");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-4">
        <SearchBar value={q} onChange={setQ} />
        <Filters {...{category,setCategory,minPrice,setMinPrice,maxPrice,setMaxPrice}} onClear={()=>{setCategory("All");setMinPrice("");setMaxPrice("");}} />
        {loading ? <div>Loading…</div> : (
          data.length === 0 ? <EmptyState title="No listings" subtitle="Try adjusting filters"/> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.map(item => (
                <ListingCard
                  key={item.id}
                  item={item}
                  onReport={handleReport}
                  onToggleSold={role==="Seller"? async (it)=>{ const updated=await api.updateListing(it.id,{sold:!it.sold}); setData(d=>d.map(x=>x.id===it.id?updated:x)); }:undefined}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
