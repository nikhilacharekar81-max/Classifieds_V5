'use client';
import React from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';

interface PhotoUploadSectionProps {
  images: string[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
}

export const PhotoUploadSection: React.FC<PhotoUploadSectionProps> = ({
  images,
  onFileChange,
  onRemoveImage,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-blue-600" />
          5. Upload Listing Photos (Optional - Up to 5 Photos Max)
        </h2>
        <span
          className={`px-3 py-1 rounded-full text-xs font-black ${
            images.length >= 5
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {images.length} / 5 Photos
        </span>
      </div>

      <p className="text-xs text-slate-500">
        Upload actual photographs of your item or service directly from your device (optional). Photo #1 serves as the primary cover image if provided.
      </p>

      {/* Custom Device File Upload Zone */}
      <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 transition-all duration-150 text-center bg-slate-50 relative cursor-pointer group">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={onFileChange}
          disabled={images.length >= 5}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-full shadow-xs border border-slate-100 group-hover:scale-105 transition-transform text-blue-600">
            <Upload className="w-6 h-6" />
          </div>
          <div className="text-xs font-bold text-slate-800">
            {images.length >= 5 ? 'Photo limit reached' : 'Click to Upload or Drag Photos Here'}
          </div>
          <div className="text-[11px] text-slate-500">
            Supports PNG, JPG, JPEG, WEBP (Max 5MB each)
          </div>
        </div>
      </div>

      {/* Render uploaded image previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2">
          {images.map((imgUrl, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-100 group shadow-xs"
            >
              <img src={imgUrl} alt={`Uploaded Preview ${index + 1}`} className="w-full h-full object-cover" />
              <div className="absolute top-1.5 left-1.5">
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm border ${
                    index === 0
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-white/90 text-slate-800 border-slate-200'
                  }`}
                >
                  {index === 0 ? 'Cover' : `#${index + 1}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveImage(index)}
                className="absolute top-1.5 right-1.5 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md hover:scale-110 transition-transform cursor-pointer"
                title="Remove Photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
