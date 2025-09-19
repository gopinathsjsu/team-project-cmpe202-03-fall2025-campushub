import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import Gate from "./Gate";
import ImagePicker from "../components/ImagePicker";

const CATEGORIES = ["Textbooks","Electronics","Furniture","Clothing","Other"];

export default function SellPage() {
  const { role } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ title:"", description:"", price:"", category:CATEGORIES[0], images:[] });

  if (role !== "Seller") return <Gate role="Seller" />;

  const submit = async (e)=>{
    e.preventDefault();
    if (!form.title || !form.price) return alert("Title and price are required");
    const payload = { ...form, price: Number(form.price) };
    const created = await api.createListing(payload);
    alert("Listing created!");
    nav(`/listing/${created.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Create a Listing</h1>
      <form onSubmit={submit} className="grid gap-4">
        <input className="border rounded-xl px-3 py-2" placeholder="Title" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} />
        <textarea className="border rounded-xl px-3 py-2" rows={4} placeholder="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
        <div className="flex gap-3">
          <select className="border rounded-xl px-3 py-2" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <input type="number" className="border rounded-xl px-3 py-2" placeholder="Price ($)" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} />
        </div>
        <ImagePicker images={form.images} onChange={(imgs)=>setForm(f=>({...f,images:imgs}))} />
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 rounded-xl bg-gray-900 text-white">Publish</button>
          <button type="button" className="px-4 py-2 rounded-xl border" onClick={()=>setForm({title:"",description:"",price:"",category:CATEGORIES[0],images:[]})}>Reset</button>
        </div>
      </form>
    </div>
  );
}
