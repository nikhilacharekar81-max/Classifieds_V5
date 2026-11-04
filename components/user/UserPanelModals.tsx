'use client';
import React from 'react';
import { ShieldCheck, X, Upload, Edit3, AlertCircle } from 'lucide-react';
import { Listing } from '@/lib/types';

interface KycDocumentModalProps {
  isOpen: boolean;
  kycDocType: 'Aadhaar' | 'PAN' | 'GSTIN' | 'Passport';
  kycDocNumber: string;
  onDocTypeChange: (type: 'Aadhaar' | 'PAN' | 'GSTIN' | 'Passport') => void;
  onDocNumberChange: (num: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const KycDocumentModal: React.FC<KycDocumentModalProps> = ({
  isOpen,
  kycDocType,
  kycDocNumber,
  onDocTypeChange,
  onDocNumberChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            <span>Submit KYC Seller Document</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block font-bold mb-1">Select Document Type</label>
            <select
              value={kycDocType}
              onChange={(e) => onDocTypeChange(e.target.value as any)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
            >
              <option value="Aadhaar">Aadhaar Card (12-Digit Number)</option>
              <option value="PAN">PAN Card (10-Digit Alphanumeric)</option>
              <option value="GSTIN">GSTIN Certificate (15-Digit Code)</option>
              <option value="Passport">Indian Passport</option>
            </select>
          </div>

          <div>
            <label className="block font-bold mb-1">Document Registration Number</label>
            <input
              type="text"
              value={kycDocNumber}
              onChange={(e) => onDocNumberChange(e.target.value)}
              placeholder="e.g. 5489 1029 4812"
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
              required
            />
          </div>

          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 rounded-xl text-center space-y-1">
            <Upload className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="font-bold text-slate-700 dark:text-slate-300">Upload Front Document Scan</div>
            <div className="text-[10px] text-slate-400">PDF, JPG or PNG up to 5MB</div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg shadow cursor-pointer"
            >
              Submit for Compliance Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditListingModalProps {
  editingListing: Listing | null;
  editTitleError: string | null;
  onChangeListing: (nextListing: Listing) => void;
  onClearTitleError: () => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const EditListingModal: React.FC<EditListingModalProps> = ({
  editingListing,
  editTitleError,
  onChangeListing,
  onClearTitleError,
  onClose,
  onSubmit,
}) => {
  if (!editingListing) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
            <Edit3 className="w-5 h-5 text-blue-500" />
            <span>Edit Listing: {editingListing.title}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block font-bold mb-1">Ad Title</label>
            <input
              type="text"
              value={editingListing.title}
              onChange={(e) => {
                onChangeListing({ ...editingListing, title: e.target.value });
                if (editTitleError) onClearTitleError();
              }}
              className={`w-full text-xs rounded-lg border p-2.5 font-medium transition-all ${
                editTitleError
                  ? 'border-2 border-red-500 bg-red-50/20 text-red-900 focus:ring-2 focus:ring-red-300'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
              }`}
              required
            />
            {editTitleError && (
              <div
                id="edit-duplicate-title-alert"
                className="mt-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 flex items-start gap-2 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="text-[11px] font-semibold">{editTitleError}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Price (₹)</label>
              <input
                type="number"
                value={editingListing.price}
                onChange={(e) => onChangeListing({ ...editingListing, price: Number(e.target.value) })}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                required
              />
            </div>

            <div>
              <label className="block font-bold mb-1">City Location</label>
              <input
                type="text"
                value={editingListing.location.city}
                onChange={(e) =>
                  onChangeListing({
                    ...editingListing,
                    location: { ...editingListing.location, city: e.target.value },
                  })
                }
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1">Description</label>
            <textarea
              value={editingListing.description}
              onChange={(e) => onChangeListing({ ...editingListing, description: e.target.value })}
              rows={4}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
              required
            />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              🔒 Live clickable links are disabled in ad descriptions for safety & anti-spam compliance.
            </span>
          </div>

          {/* Photos Management (Max 5 Photos) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs text-slate-800 dark:text-slate-200">
                Listing Photos ({editingListing.images.length}/5 Max)
              </label>
              {editingListing.images.length < 5 && (
                <button
                  type="button"
                  onClick={() => {
                    onChangeListing({
                      ...editingListing,
                      images: [...editingListing.images, ''],
                    });
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  + Add Photo
                </button>
              )}
            </div>

            <div className="space-y-2">
              {editingListing.images.map((img, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="url"
                    value={img}
                    onChange={(e) => {
                      const updated = [...editingListing.images];
                      updated[idx] = e.target.value;
                      onChangeListing({ ...editingListing, images: updated });
                    }}
                    placeholder={`Photo URL #${idx + 1}`}
                    className="flex-1 text-[11px] border border-slate-300 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-900 font-mono"
                  />
                  {editingListing.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = editingListing.images.filter((_, i) => i !== idx);
                        onChangeListing({ ...editingListing, images: updated });
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:underline px-1 cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg shadow cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
