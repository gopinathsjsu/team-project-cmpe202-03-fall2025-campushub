export default function SearchBar({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={(e)=>onChange(e.target.value)}
      placeholder="Search by title or description..."
      className="w-full border rounded-xl px-4 py-2"
    />
  );
}
