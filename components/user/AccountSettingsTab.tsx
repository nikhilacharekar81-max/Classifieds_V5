'use client';
import React, { useState } from 'react';
import { Building, ShieldCheck, Lock, Mail, LogOut, Loader2, CheckCircle2, AlertCircle, SlidersHorizontal, ShieldAlert } from 'lucide-react';
import { UserAccount } from '@/lib/types';
import { dispatchPublicToast } from '@/components/common/ChunkErrorRecovery';
import { useAppOptional } from '@/context/AppContextInstance';

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
  const app = useAppOptional();

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Email Verification state
  const [isSendingVerifyEmail, setIsSendingVerifyEmail] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [isConfirmingToken, setIsConfirmingToken] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Session Logout state
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  const notify = (payload: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
  }) => {
    if (app?.addToast) {
      app.addToast(payload);
    } else {
      dispatchPublicToast(payload);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword) {
      setPasswordError('Both current password and new password are required.');
      return;
    }

    if (newPassword.length < 4 || newPassword.length > 20) {
      setPasswordError('New password must be between 4 and 20 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      setIsChangingPassword(false);

      if (!res.ok) {
        setPasswordError(data.error || 'Failed to change password.');
        return;
      }

      setPasswordSuccess('Password changed successfully. Other active sessions have been invalidated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify({
        type: 'success',
        title: 'Password Changed',
        message: 'Your password was updated successfully.',
      });
    } catch (err: any) {
      setPasswordError(err?.message || 'Unable to change password. Please try again.');
      setIsChangingPassword(false);
    }
  };

  const handleRequestVerificationEmail = async () => {
    setVerifyError(null);
    setVerifyMsg(null);
    setIsSendingVerifyEmail(true);

    try {
      const res = await fetch('/api/auth/verify-email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email }),
      });
      const data = await res.json().catch(() => ({}));
      setIsSendingVerifyEmail(false);

      if (!res.ok) {
        setVerifyError(data.error || 'Failed to request verification email.');
        return;
      }

      setVerifyMsg(data.message || 'Verification email sent if account exists.');
      notify({
        type: 'success',
        title: 'Verification Request Sent',
        message: 'Please check your email inbox for verification instructions.',
      });
    } catch (err: any) {
      setVerifyError(err?.message || 'Unable to send verification email.');
      setIsSendingVerifyEmail(false);
    }
  };

  const handleConfirmVerificationToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    setVerifyMsg(null);

    if (!verifyToken.trim()) {
      setVerifyError('Please enter a verification token.');
      return;
    }

    setIsConfirmingToken(true);
    try {
      const res = await fetch('/api/auth/verify-email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyToken.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      setIsConfirmingToken(false);

      if (!res.ok) {
        setVerifyError(data.error || 'Invalid or expired verification token.');
        return;
      }

      setVerifyMsg(data.message || 'Email verified successfully!');
      setVerifyToken('');
      notify({
        type: 'success',
        title: 'Email Verified',
        message: 'Your email address has been verified successfully.',
      });
    } catch (err: any) {
      setVerifyError(err?.message || 'Unable to confirm verification token.');
      setIsConfirmingToken(false);
    }
  };

  const handleLogoutAllSessions = async () => {
    if (!window.confirm('Are you sure you want to log out of all active sessions across all devices?')) {
      return;
    }

    setIsLoggingOutAll(true);
    try {
      const res = await fetch('/api/auth/logout-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      setIsLoggingOutAll(false);

      if (!res.ok) {
        notify({
          type: 'error',
          title: 'Logout Failed',
          message: 'Unable to log out all sessions right now.',
        });
        return;
      }

      notify({
        type: 'info',
        title: 'Logged Out',
        message: 'All active sessions have been invalidated.',
      });

      // Redirect or refresh
      window.location.href = '/';
    } catch {
      setIsLoggingOutAll(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Main Settings Form Column */}
      <div className="md:col-span-2 space-y-6">
        {/* Profile Settings */}
        <form
          onSubmit={onSaveProfile}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 text-xs"
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
              <label className="block font-bold mb-1">Mobile Phone Number</label>
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

        {/* Change Password Card */}
        <form
          onSubmit={handleChangePassword}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 text-xs"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Change Account Password
            </h3>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
            New passwords must be between 4 and 20 characters long.
          </p>

          {passwordError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">New Password (4–20 chars)</label>
              <input
                type="password"
                required
                minLength={4}
                maxLength={20}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={4}
                maxLength={20}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="px-5 py-2.5 bg-[#1dbf73] hover:bg-[#19a463] disabled:opacity-60 text-white font-extrabold rounded-xl shadow cursor-pointer transition-colors flex items-center gap-2"
          >
            {isChangingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Update Password</span>
          </button>
        </form>
      </div>

      {/* Account Security Side Cards */}
      <div className="space-y-6">
        {/* Email Verification Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
            <Mail className="w-5 h-5 text-blue-500" />
            <span>Email Verification</span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
            <span>Status</span>
            {currentUser.emailVerified ? (
              <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            ) : (
              <span className="font-extrabold text-amber-600 uppercase">Unverified</span>
            )}
          </div>

          {verifyError && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs">
              {verifyError}
            </div>
          )}

          {verifyMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 text-xs">
              {verifyMsg}
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleRequestVerificationEmail}
              disabled={isSendingVerifyEmail}
              className="w-full py-2 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSendingVerifyEmail ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              <span>Request Verification Email</span>
            </button>

            <form onSubmit={handleConfirmVerificationToken} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                Have a verification token?
              </label>
              <input
                type="text"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                placeholder="Paste token here"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-medium"
              />
              <button
                type="submit"
                disabled={isConfirmingToken || !verifyToken.trim()}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isConfirmingToken && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Email Token</span>
              </button>
            </form>
          </div>
        </div>

        {/* Account Trust & Safety Card */}
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
              {(currentUser.reviewCount || 0) > 0 ? (
                <span className="font-extrabold text-amber-500">
                  ★ {Number(currentUser.rating).toFixed(1)} / 5.0 ({currentUser.reviewCount} {currentUser.reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              ) : (
                <span className="font-semibold text-slate-500 dark:text-slate-400">No reviews yet</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenKycModal}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Submit / Update KYC Documents
          </button>
        </div>

        {/* Privacy & Data Choices Card */}
        {app?.settings?.enablePrivacyChoices && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
              <Lock className="w-5 h-5 text-purple-500" />
              <span>Privacy &amp; Data Choices</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Manage your tracking preferences, cookie consent, and exercise your data rights.
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => app.openCmpModal()}
                className="w-full py-2 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Manage Cookie Preferences</span>
              </button>

              <button
                type="button"
                onClick={() => app.openUsPrivacyModal()}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Do Not Sell or Share My Info</span>
              </button>
            </div>
          </div>
        )}

        {/* Global Session Logout Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3 text-xs">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
            <LogOut className="w-5 h-5 text-rose-500" />
            <span>Active Sessions</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
            Log out of all active sessions across all mobile and web devices.
          </p>

          <button
            type="button"
            onClick={handleLogoutAllSessions}
            disabled={isLoggingOutAll}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            {isLoggingOutAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            <span>Log Out All Sessions</span>
          </button>
        </div>

        {/* Delete Account Card */}
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950 rounded-2xl p-6 shadow-sm space-y-3 text-xs">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-extrabold text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>Delete Account</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
            Permanently close your account, invalidate all active listings, and revoke access. Financial records are retained safely.
          </p>

          <button
            type="button"
            onClick={async () => {
              if (
                window.confirm(
                  'Are you sure you want to delete your account? All active listings will be closed and you will be logged out immediately.'
                )
              ) {
                try {
                  const res = await fetch('/api/user/account', { method: 'DELETE' });
                  if (res.ok) {
                    notify({
                      type: 'info',
                      title: 'Account Deleted',
                      message: 'Your account has been deleted successfully.',
                    });
                    window.location.href = '/';
                  } else {
                    notify({
                      type: 'error',
                      title: 'Error',
                      message: 'Failed to delete account. Please try again.',
                    });
                  }
                } catch {
                  notify({
                    type: 'error',
                    title: 'Error',
                    message: 'Network error while attempting account deletion.',
                  });
                }
              }
            }}
            className="w-full py-2.5 bg-slate-100 hover:bg-rose-50 text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Delete My Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
