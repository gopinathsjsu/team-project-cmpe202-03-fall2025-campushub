const CATEGORIES = ["Textbooks", "Electronics", "Furniture", "Clothing", "Other"];

export default function Filters({ category, setCategory, minPrice, setMinPrice, maxPrice, setMaxPrice, onClear }) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <select className="border rounded-xl px-3 py-2" value={category} onChange={(e)=>setCategory(e.target.value)}>
        <option>All</option>
        {CATEGORIES.map(c=> <option key={c}>{c}</option>)}
      </select>
      <input type="number" placeholder="Min $" className="border rounded-xl px-3 py-2 w-28" value={minPrice} onChange={(e)=>setMinPrice(e.target.value)} />
      <input type="number" placeholder="Max $" className="border rounded-xl px-3 py-2 w-28" value={maxPrice} onChange={(e)=>setMaxPrice(e.target.value)} />
      <button onClick={onClear} className="border rounded-xl px-3 py-2 hover:bg-gray-50">Clear</button>
    </div>
  );
}
