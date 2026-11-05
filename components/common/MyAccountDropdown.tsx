'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  ChevronDown,
  LogIn,
  UserPlus,
  LogOut,
  LayoutDashboard,
  X,
  Mail,
  Lock,
  Phone,
  MapPin,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { useAppOptional } from '@/context/AppContextInstance';
import { UserAccount } from '@/lib/types';
import { NavLink } from '@/components/common/NavLink';
import { useNavigationFeedback } from '@/lib/router/useRouter';
import { dispatchPublicToast } from '@/components/common/ChunkErrorRecovery';

export const MyAccountDropdown: React.FC = () => {
  const app = useAppOptional();
  const { isUrlPending } = useNavigationFeedback();

  const [isOpen, setIsOpen] = useState(false);
  const [localAuthUser, setLocalAuthUser] = useState<UserAccount | null>(null);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'forgot' | 'reset' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sign In form state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up form state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpCity, setSignUpCity] = useState('Mumbai');
  const [signUpState, setSignUpState] = useState('Maharashtra');

  // Forgot Password / Reset form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    const handleOpenAuthModal = (event: Event) => {
      const customEv = event as CustomEvent<{ mode?: 'signin' | 'signup' | 'forgot' | 'reset' }>;
      const mode = customEv.detail?.mode || 'signin';
      setIsOpen(false);
      setErrorMsg(null);
      setSuccessMsg(null);
      setAuthModalMode(mode);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open_auth_modal', handleOpenAuthModal);

    // Auto-detect reset link or email verification URL parameters
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlToken = searchParams.get('token');
      const urlTab = searchParams.get('tab');

      if (urlToken && (!urlTab || urlTab === 'verify-email')) {
        // Handle email verification token confirmation directly
        fetch('/api/auth/verify-email/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: urlToken }),
        })
          .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
          .then(({ ok, data }) => {
            if (ok) {
              notify({
                type: 'success',
                title: 'Email Verified',
                message: data.message || 'Your email address has been successfully verified.',
              });
            } else {
              notify({
                type: 'error',
                title: 'Verification Failed',
                message: data.error || 'Invalid or expired email verification link.',
              });
            }
          })
          .catch((err) => {
            notify({
              type: 'error',
              title: 'Verification Error',
              message: err?.message || 'Failed to verify email address.',
            });
          });

        // Strip token and tab parameters from visible browser URL
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('token');
        cleanUrl.searchParams.delete('tab');
        window.history.replaceState(
          {},
          document.title,
          cleanUrl.pathname + (cleanUrl.searchParams.toString() ? '?' + cleanUrl.searchParams.toString() : '')
        );
      } else if (urlToken || urlTab === 'reset-password') {
        if (urlToken) {
          setResetToken(urlToken);
        }
        setIsOpen(false);
        setErrorMsg(null);
        setSuccessMsg(null);
        setAuthModalMode('reset');

        // Strip sensitive token from visible browser URL
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('token');
        cleanUrl.searchParams.delete('tab');
        window.history.replaceState(
          {},
          document.title,
          cleanUrl.pathname + (cleanUrl.searchParams.toString() ? '?' + cleanUrl.searchParams.toString() : '')
        );
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open_auth_modal', handleOpenAuthModal);
    };
  }, []);

  const handleToggleMenu = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && !app && !hasCheckedSession) {
      setHasCheckedSession(true);
      fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.authenticated && data?.user) {
            setLocalAuthUser(data.user);
          }
        })
        .catch(() => {});
    }
  };

  const openModal = (mode: 'signin' | 'signup' | 'forgot' | 'reset') => {
    setIsOpen(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setAuthModalMode(mode);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setAuthModalMode(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!signInEmail.trim() || !signInPassword) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signInEmail.trim(),
          password: signInPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401 && data.error?.includes('verification')) {
          setErrorMsg('Email verification is required. Please check your email.');
          setShowResendButton(true);
        } else {
          setErrorMsg(data.error || 'Invalid email or password.');
          setShowResendButton(false);
        }
        setIsSubmitting(false);
        return;
      }
      setShowResendButton(false);

      if (data.user) {
        setLocalAuthUser(data.user);
        setHasCheckedSession(true);
        app?.updateAuth(data.user, null, data.user.id);
        window.dispatchEvent(new CustomEvent('auth_state_changed', { detail: { user: data.user } }));
      }
      notify({
        type: 'success',
        title: 'Signed In Successfully',
        message: `Welcome back, ${data.user?.name || signInEmail.trim()}!`,
      });
      setSignInEmail('');
      setSignInPassword('');
      setIsSubmitting(false);
      setAuthModalMode(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to sign in right now. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPassword) {
      setErrorMsg('Name, email, and password are required.');
      return;
    }
    if (!signUpPhone.trim()) {
      setErrorMsg('Phone number is required.');
      return;
    }
    const cleanDigits = signUpPhone.trim().replace(/\D/g, '');
    if (!/^\+?[0-9\s-]{10,15}$/.test(signUpPhone.trim()) || cleanDigits.length < 10 || cleanDigits.length > 15) {
      setErrorMsg('Please enter a valid phone number (10 to 15 digits).');
      return;
    }
    if (signUpPassword.length < 4 || signUpPassword.length > 20) {
      setErrorMsg('Password must be between 4 and 20 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signUpName.trim(),
          email: signUpEmail.trim(),
          password: signUpPassword,
          phone: signUpPhone.trim(),
          city: signUpCity.trim(),
          state: signUpState.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to create account.');
        setIsSubmitting(false);
        return;
      }

      const activeUser = data.user || (app?.registerUser ? app.registerUser({
        name: signUpName.trim(),
        email: signUpEmail.trim(),
        phone: signUpPhone.trim(),
        location: {
          city: signUpCity.trim(),
          state: signUpState.trim(),
        },
      }) : null);

      // Do not authenticate the unverified user!
      setSuccessMsg(data.message || 'Account created. Please check your email for verification.');
      setSignUpName('');
      setSignUpEmail('');
      setSignUpPassword('');
      setSignUpPhone('');
      setIsSubmitting(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to complete registration. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!forgotEmail.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      setIsSubmitting(false);
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to request password reset.');
        return;
      }
      setSuccessMsg(data.message || 'If an account exists with that email, password reset instructions have been sent.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to request password reset. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!resetToken.trim() || !resetNewPassword) {
      setErrorMsg('Reset token and new password are required.');
      return;
    }
    if (resetNewPassword.length < 4 || resetNewPassword.length > 20) {
      setErrorMsg('New password must be between 4 and 20 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken.trim(),
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setIsSubmitting(false);
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to reset password.');
        return;
      }
      notify({
        type: 'success',
        title: 'Password Reset Successful',
        message: 'Your password has been reset. Please sign in with your new password.',
      });
      setResetToken('');
      setResetNewPassword('');
      setAuthModalMode('signin');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to reset password. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSignOutClick = async () => {
    setIsOpen(false);
    setLocalAuthUser(null);
    if (app?.signOut) {
      await app.signOut();
      return;
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore error
    }
    notify({
      type: 'info',
      title: 'Signed Out',
      message: 'You have been signed out of your account.',
    });
  };

  const effectiveAuthUser = app?.authUser || localAuthUser;
  const effectiveCurrentUser = app?.currentUser || localAuthUser;
  const isAccountUrlPending = isUrlPending('/my-account');

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={handleToggleMenu}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className="px-3 py-2 text-[#3c4043] hover:text-[#202124] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer rounded-md hover:bg-[#f1f3f4] border border-transparent hover:border-[#dadce0]"
          title="My Account Menu"
        >
          {isAccountUrlPending ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#1dbf73]" />
          ) : (
            <User className="w-4 h-4 text-[#5f6368]" />
          )}
          <span className="hidden sm:inline">My Account</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#5f6368] transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-[#202124]' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl border border-[#dadce0] shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Active User Info Header */}
            <div className="px-3.5 py-2.5 border-b border-[#f1f3f4]">
              <p className="text-xs font-bold text-[#202124] truncate">
                {effectiveAuthUser ? effectiveAuthUser.name : effectiveCurrentUser?.name || 'Guest User'}
              </p>
              <p className="text-[11px] text-[#5f6368] truncate">
                {effectiveAuthUser ? effectiveAuthUser.email : effectiveCurrentUser?.email || 'Manage your classifieds'}
              </p>
            </div>

            {/* Dashboard Link */}
            <div className="py-1">
              <NavLink
                href="/my-account"
                onClick={() => setIsOpen(false)}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#3c4043] hover:text-[#202124] hover:bg-[#f8f9fa] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-[#1dbf73] shrink-0" />
                <span>My Account Dashboard</span>
              </NavLink>

              <button
                type="button"
                role="menuitem"
                onClick={() => openModal('signin')}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#3c4043] hover:text-[#202124] hover:bg-[#f8f9fa] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#1a73e8] shrink-0" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => openModal('signup')}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#3c4043] hover:text-[#202124] hover:bg-[#f8f9fa] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#1dbf73] shrink-0" />
                <span>Sign Up</span>
              </button>
            </div>

            <div className="border-t border-[#f1f3f4] pt-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  void handleSignOutClick();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#d93025] hover:bg-[#fce8e6]/50 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-[#d93025] shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sign In / Sign Up / Forgot Password Modal */}
      {authModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#dadce0] shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header & Mode Tabs */}
            <div className="px-6 pt-5 pb-4 border-b border-[#f1f3f4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setAuthModalMode('signin');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    authModalMode === 'signin'
                      ? 'bg-[#e6f4ea] text-[#137333]'
                      : 'text-[#5f6368] hover:text-[#202124]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setAuthModalMode('signup');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    authModalMode === 'signup'
                      ? 'bg-[#e6f4ea] text-[#137333]'
                      : 'text-[#5f6368] hover:text-[#202124]'
                  }`}
                >
                  Sign Up
                </button>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {authModalMode === 'signin' ? (
              <form onSubmit={handleSignInSubmit} className="p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-[#202124]">Sign in to Chillyads</h3>
                  <p className="text-xs text-[#5f6368] mt-0.5">
                    Access your active ads, messages, and saved listings.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 space-y-2">
                    <p>{errorMsg}</p>
                    {showResendButton && (
                      <button
                        type="button"
                        onClick={async () => {
                          setIsResending(true);
                          try {
                            const res = await fetch('/api/auth/verify-email/request', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: signInEmail.trim() }),
                            });
                            if (res.ok) {
                              notify({ type: 'success', title: 'Email Sent', message: 'Verification email resent.' });
                              setShowResendButton(false);
                            } else {
                              notify({ type: 'error', title: 'Error', message: 'Failed to resend.' });
                            }
                          } catch {
                            notify({ type: 'error', title: 'Error', message: 'Failed to resend.' });
                          } finally {
                            setIsResending(false);
                          }
                        }}
                        disabled={isResending}
                        className="text-xs font-bold text-rose-800 hover:underline cursor-pointer block"
                      >
                        {isResending ? 'Sending...' : 'Resend Verification Email'}
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#3c4043] mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#5f6368] absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#dadce0] focus:outline-none focus:border-[#1dbf73] text-[#202124]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[#3c4043]">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setSuccessMsg(null);
                          setAuthModalMode('forgot');
                        }}
                        className="text-xs text-[#1a73e8] hover:underline font-medium cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#5f6368] absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#dadce0] focus:outline-none focus:border-[#1dbf73] text-[#202124]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#1dbf73] hover:bg-[#19a463] disabled:opacity-60 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Sign In</span>
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setAuthModalMode('signup');
                    }}
                    className="text-xs text-[#1a73e8] hover:underline font-medium cursor-pointer"
                  >
                    Don&apos;t have an account? Sign Up
                  </button>
                </div>
              </form>
            ) : authModalMode === 'signup' ? (
              <form onSubmit={handleSignUpSubmit} className="p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-[#202124]">Create your Chillyads Account</h3>
                  <p className="text-xs text-[#5f6368] mt-0.5">
                    Post free classified ads and connect with verified local buyers.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                    {errorMsg}
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
                    {successMsg}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#3c4043] mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#5f6368] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#dadce0] focus:outline-none focus:border-[#1dbf73] text-[#202124]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#3c4043] mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#5f6368] absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#dadce0] focus:outline-none focus:border-[#1dbf73] text-[#202124]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#3c4043] mb-1">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-[#5f6368] absolute left-3 top-2.5" />
                        <input
                          type="tel"
                          required
                          value={signUpPhone}
                          onChange={(e) => setSignUpPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-[#dadce0] focus:outline-none focus:border-[#1dbf73] text-[#202124]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#3c4043] mb-1">
                        City
                      </label>
                      <div className="relative">
                        <MapPin className="w-3.5 h-3.5 text-[#5f6368] absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={signUpCity}
                          onChange={(e) => setSignUpCity(e.target.value)}
                          placeholder="e.g. Pune, Delhi"
                          className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-[#dadce0] focus:outline-none focus:border-[#1dbf73] text-[#202124]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#3c4043] mb-1">
                      Password (4 to 20 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#5f6368] absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        minLength={4}
                        maxLength={20}
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="Create a password (4-20 chars)"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#dadce0] focus:outline-none focus:border-[#1dbf73] text-[#202124]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#1dbf73] hover:bg-[#19a463] disabled:opacity-60 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Create Account</span>
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setAuthModalMode('signin');
                    }}
                    className="text-xs text-[#1a73e8] hover:underline font-medium cursor-pointer"
                  >
                    Already have an account? Sign In
                  </button>
                </div>
              </form>
            ) : authModalMode === 'forgot' ? (
              <form onSubmit={handleForgotPasswordSubmit} className="p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-[#202124]">Forgot Password</h3>
                  <p className="text-xs text-[#5f6368] mt-0.5">
                    Enter your registered email address to receive password reset instructions.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                    {errorMsg}
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 space-y-2">
                    <p>{successMsg}</p>
                    <button
                      type="button"
                      onClick={() => setAuthModalMode('reset')}
                      className="text-xs font-bold text-[#137333] hover:underline cursor-pointer block"
                    >
                      Have a reset token? Click here to set new password
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#3c4043] mb-1">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#5f6368] absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#dadce0] focus:outline-none focus:border-[#1dbf73] text-[#202124]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#1dbf73] hover:bg-[#19a463] disabled:opacity-60 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Send Reset Instructions</span>
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setAuthModalMode('signin');
                    }}
                    className="text-[#1a73e8] hover:underline font-medium cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setAuthModalMode('reset');
                    }}
                    className="text-[#5f6368] hover:underline font-medium cursor-pointer"
                  >
                    Enter Reset Token
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-[#202124]">Reset Your Password</h3>
                  <p className="text-xs text-[#5f6368] mt-0.5">
                    Enter the reset token sent to your email and your new password (4–20 chars).
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#3c4043] mb-1">
                      Reset Token
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[#5f6368] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="Paste reset token here"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#dadce0] focus:outline-none focus:border-[#1dbf73] text-[#202124]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#3c4043] mb-1">
                      New Password (4 to 20 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#5f6368] absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        minLength={4}
                        maxLength={20}
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Enter new password (4-20 chars)"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#dadce0] focus:outline-none focus:border-[#1dbf73] text-[#202124]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#1dbf73] hover:bg-[#19a463] disabled:opacity-60 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Confirm Reset Password</span>
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setAuthModalMode('signin');
                    }}
                    className="text-xs text-[#1a73e8] hover:underline font-medium cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
