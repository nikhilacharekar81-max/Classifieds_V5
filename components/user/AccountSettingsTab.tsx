'use client';
import React from 'react';
import { Building, ShieldCheck } from 'lucide-react';
import { UserAccount } from '@/lib/types';

interface ProfileFormState {
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  companyName: string;
  gstNumber: string;
}

interface AccountSettingsTabProps {
  currentUser: UserAccount;
  profileForm: ProfileFormState;
  onProfileFormChange: (nextForm: ProfileFormState) => void;
  onSaveProfile: (e: React.FormEvent) => void;
  onOpenKycModal: () => void;
}

export const AccountSettingsTab: React.FC<AccountSettingsTabProps> = ({
  currentUser,
  profileForm,
  onProfileFormChange,
  onSaveProfile,
  onOpenKycModal,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Account Settings Form */}
      <form
        onSubmit={onSaveProfile}
        className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 text-xs"
      >
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
          Account Settings & Contact Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold mb-1">Full Legal Name</label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => onProfileFormChange({ ...profileForm, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
              required
            />
          </div>

          <div>
            <label className="block font-bold mb-1">Email Address</label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => onProfileFormChange({ ...profileForm, email: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
              required
            />
          </div>

          <div>
            <label className="block font-bold mb-1">Mobile Phone Number (Indian OTP Verified)</label>
            <input
              type="text"
              value={profileForm.phone}
              onChange={(e) => onProfileFormChange({ ...profileForm, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
              required
            />
          </div>

          <div>
            <label className="block font-bold mb-1">Primary City</label>
            <input
              type="text"
              value={profileForm.city}
              onChange={(e) => onProfileFormChange({ ...profileForm, city: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
              required
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <h4 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-500" /> Business Account Details (Optional)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-1">Company / Store Name</label>
              <input
                type="text"
                value={profileForm.companyName}
                onChange={(e) => onProfileFormChange({ ...profileForm, companyName: e.target.value })}
                placeholder="e.g. Sharma Motors Pvt Ltd"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">GSTIN Registration Number</label>
              <input
                type="text"
                value={profileForm.gstNumber}
                onChange={(e) => onProfileFormChange({ ...profileForm, gstNumber: e.target.value })}
                placeholder="e.g. 27AABCU9603R1ZN"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow cursor-pointer transition-colors"
          >
            Save Profile Settings
          </button>
        </div>
      </form>

      {/* Account Security Side Card */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3 text-xs">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>Account Trust & Safety</span>
          </div>

          <div className="space-y-2 text-slate-600 dark:text-slate-400">
            <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
              <span>KYC Verification Status</span>
              <span className="font-extrabold uppercase text-emerald-600">{currentUser.kycStatus}</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
              <span>Mobile Phone OTP</span>
              <span className="font-extrabold text-blue-600">Verified</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
              <span>Account Rating</span>
              <span className="font-extrabold text-amber-500">★ {currentUser.rating} / 5.0</span>
            </div>
          </div>

          <button
            onClick={onOpenKycModal}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Submit / Update KYC Documents
          </button>
        </div>
      </div>
    </div>
  );
};
