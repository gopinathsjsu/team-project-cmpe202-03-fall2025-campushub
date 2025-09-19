export default function ImagePicker({ images, onChange }) {
  const onFile = (e)=>{
    const files = Array.from(e.target.files||[]);
    const urls = files.map(f => URL.createObjectURL(f));
    onChange([...(images||[]), ...urls]);
  };
  return (
    <div className="grid gap-2">
      <div className="flex gap-2 flex-wrap">{(images||[]).map((src,i)=> <img key={i} src={src} alt="" className="h-20 w-28 object-cover rounded" />)}</div>
      <label className="w-fit px-4 py-2 border rounded-xl cursor-pointer">
        <input type="file" multiple accept="image/*" className="hidden" onChange={onFile} />
        Upload Photos
      </label>
    </div>
  );
}
