import { useState, useEffect } from "react";
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";

export default function ImagePicker({ files = [], onChange, disabled = false, maxFiles = 5 }) {
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    previews.forEach(preview => {
      if (preview.url.startsWith("blob:")) {
        URL.revokeObjectURL(preview.url);
      }
    });

    const newPreviews = files.map((file, index) => ({
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      index,
    }));

    setPreviews(newPreviews);

    return () => {
      newPreviews.forEach(preview => {
        if (preview.url.startsWith("blob:")) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, [files]);

  const validateFile = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      return "Invalid file type. Please upload JPG, PNG, GIF, or WebP images.";
    }

    if (file.size > maxSize) {
      return "File size exceeds 10MB. Please upload a smaller image.";
    }

    return null;
  };

  const onFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError(null);

    if (files.length + selectedFiles.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} images.`);
      return;
    }

    const validFiles = [];
    for (const file of selectedFiles) {
      const errorMsg = validateFile(file);
      if (errorMsg) {
        setError(errorMsg);
        return;
      }
      validFiles.push(file);
    }

    onChange([...files, ...validFiles]);
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    onChange(newFiles);
    setError(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
        <ImageIcon size={16} className="text-primary-600" />
        <span>Photos</span>
        <span className="text-xs font-normal text-gray-500">(Optional, max {maxFiles})</span>
      </label>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {previews.map((preview, i) => (
            <div key={i} className="relative group aspect-square">
              <img
                src={preview.url}
                alt={preview.name}
                className="w-full h-full object-cover rounded-xl border-2 border-gray-200"
              />
              
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeFile(preview.index)}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                  title="Remove image"
                >
                  <X size={16} />
                </button>
              )}
              
              {i === 0 && (
                <div className="absolute top-2 left-2 bg-primary-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                  Primary
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-xl">
                <p className="text-white text-xs truncate">{preview.name}</p>
                <p className="text-white/70 text-[10px]">{formatFileSize(preview.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <label
        className={`group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all ${
          disabled
            ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
            : "border-gray-300 hover:border-primary-500 bg-gray-50 hover:bg-primary-50 cursor-pointer"
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={onFileSelect}
          disabled={disabled || files.length >= maxFiles}
        />
        <div className="flex flex-col items-center space-y-2">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            disabled 
              ? "bg-gray-200" 
              : "bg-primary-100 group-hover:bg-primary-200"
          }`}>
            <Upload size={24} className={disabled ? "text-gray-400" : "text-primary-600"} />
          </div>
          <div className="text-center">
            <p className={`text-sm font-medium ${
              disabled 
                ? "text-gray-400" 
                : "text-gray-700 group-hover:text-primary-700"
            }`}>
              {files.length >= maxFiles 
                ? `Maximum ${maxFiles} images reached` 
                : "Click to upload photos"}
            </p>
            {files.length < maxFiles && (
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF, WebP up to 10MB
              </p>
            )}
          </div>
        </div>
      </label>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <ImageIcon size={14} className="text-primary-600" />
            <span>
              {files.length} {files.length === 1 ? "photo" : "photos"} selected
            </span>
          </div>
          {files.length > 0 && (
            <span className="text-primary-600">
              First image will be the primary photo
            </span>
          )}
        </div>
      )}
    </div>
  );
}