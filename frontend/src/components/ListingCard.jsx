import { Link } from "react-router-dom";

export default function ListingCard({ item, onToggleSold, onReport }) {
  return (
    <div className="border rounded-2xl p-3 flex flex-col gap-2 hover:shadow">
      <div className="aspect-video w-full bg-gray-100 rounded-xl flex items-center justify-center text-sm">
        {item.images?.[0] ? <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover rounded-xl"/> : "No Photo"}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{item.title}</div>
          <div className="text-sm text-gray-600">{item.category} · ${item.price}</div>
        </div>
        {item.sold && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">SOLD</span>}
      </div>
      <p className="text-sm text-gray-700 line-clamp-2">{item.description}</p>
      <div className="flex gap-2 mt-auto">
        <Link to={`/listing/${item.id}`} className="px-3 py-1.5 rounded-xl bg-gray-900 text-white text-sm">View</Link>
        {onToggleSold && <button onClick={()=>onToggleSold(item)} className="px-3 py-1.5 rounded-xl border text-sm">{item.sold? "Mark as Available":"Mark as Sold"}</button>}
        <button onClick={()=>onReport(item)} className="px-3 py-1.5 rounded-xl border text-sm">Report</button>
      </div>
    </div>
  );
}
