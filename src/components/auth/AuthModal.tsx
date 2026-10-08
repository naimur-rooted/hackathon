import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, Hash, AlertCircle, CheckCircle2, ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type ModalMode = 'LOGIN' | 'LOGIN_OTP' | 'REGISTER' | 'REGISTER_OTP' | 'FORGOT_EMAIL' | 'FORGOT_OTP';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    login,
    sendLoginOtp,
    verifyLoginOtp,
    sendRegisterOtp,
    verifyRegisterOtp,
    sendForgotOtp,
    resetPassword,
  } = useAuth();

  const [mode, setMode] = useState<ModalMode>('LOGIN');

  // Form Fields - clean default values
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [studentId, setStudentId] = useState('');
  const [batch, setBatch] = useState('65');
  const [section, setSection] = useState('B');
  const [otp, setOtp] = useState('');

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const resetAllStates = () => {
    setError(null);
    setSuccessMsg(null);
    setOtp('');
  };

  // Direct Password Login (Instant access without waiting for OTP)
  const handleDirectLogin = async () => {
    if (!email || !password) {
      setError('Please enter your email and password first.');
      return;
    }
    resetAllStates();
    setLoading(true);
    try {
      await login(email.trim(), password);
      closeAuthModal();
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: SINGLE UNIFIED LOGIN (Email + Password -> sends real OTP to Gmail)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAllStates();
    setLoading(true);

    try {
      const res = await sendLoginOtp(email.trim(), password);
      if (res.success) {
        const hint = res.demoOtp ? ` (Code: ${res.demoOtp} or 123456)` : ' (Default code: 123456)';
        setSuccessMsg(`Verification code sent to ${email.trim()}.${hint}`);
        setMode('LOGIN_OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: VERIFY LOGIN OTP (Enters real code from Gmail)
  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAllStates();
    setLoading(true);

    try {
      await verifyLoginOtp(email.trim(), otp.trim());
      closeAuthModal();
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: REGISTER
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAllStates();
    setLoading(true);

    try {
      const res = await sendRegisterOtp({
        name: name.trim(),
        email: email.trim(),
        password,
        department,
        batch: batch.trim(),
        section: section.trim(),
      });
      if (res.success) {
        const hint = res.demoOtp ? ` (Code: ${res.demoOtp} or 123456)` : ' (Default code: 123456)';
        setSuccessMsg(`Verification code sent to ${email.trim()}.${hint}`);
        setMode('REGISTER_OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: VERIFY REGISTER OTP
  const handleVerifyRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAllStates();
    setLoading(true);

    try {
      await verifyRegisterOtp({
        name: name.trim(),
        email: email.trim(),
        password,
        department,
        studentId: studentId.trim(),
        batch: batch.trim(),
        section: section.trim(),
        otp: otp.trim(),
      });
      closeAuthModal();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  // FORGOT PASSWORD STEP 1: Send Reset OTP
  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAllStates();
    setLoading(true);

    try {
      const res = await sendForgotOtp(email.trim());
      if (res.success) {
        setSuccessMsg(`Password reset verification code sent to ${email.trim()}.`);
        setMode('FORGOT_OTP');
      }
    } catch (err: any) {
      setError(err.message || 'No account registered with this email address.');
    } finally {
      setLoading(false);
    }
  };

  // FORGOT PASSWORD STEP 2: Verify OTP + New Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAllStates();
    setLoading(true);

    try {
      await resetPassword(email.trim(), otp.trim(), newPassword);
      setSuccessMsg('Password reset successful! Please log in with your new password.');
      setMode('LOGIN');
      setPassword(newPassword);
      setNewPassword('');
      setOtp('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please verify the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div className="relative w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-4 sm:p-7 flex flex-col text-slate-100 scrollbar-thin my-auto">
        {/* Fixed Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-4 pr-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider text-sky-400 font-semibold">City University</span>
            <span className="text-slate-600">·</span>
            <span className="text-[11px] text-slate-400">CampusOS Portal</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {mode === 'LOGIN' && 'Sign In to CampusOS'}
            {mode === 'LOGIN_OTP' && 'Verify Email Code'}
            {mode === 'REGISTER' && 'Create Account'}
            {mode === 'REGISTER_OTP' && 'Verify Email Address'}
            {mode === 'FORGOT_EMAIL' && 'Reset Password'}
            {mode === 'FORGOT_OTP' && 'Set New Password'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {mode.includes('OTP')
              ? 'Enter the 6-digit code received in your email inbox.'
              : 'Sign in to access your courses, routine, notices, and university services.'}
          </p>
        </div>

        {/* Alerts & Feedback */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: UNIFIED SINGLE LOGIN FORM */}
        {/* ========================================================================= */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    resetAllStates();
                    setMode('FORGOT_EMAIL');
                  }}
                  className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  'Sign In with Email OTP →'
                )}
              </button>

              <button
                type="button"
                onClick={handleDirectLogin}
                disabled={loading}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Instant Sign In (Password Only)</span>
              </button>
            </div>

            <div className="pt-3 text-center border-t border-slate-800 text-xs text-slate-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  resetAllStates();
                  setMode('REGISTER');
                }}
                className="text-sky-400 hover:underline font-semibold"
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: LOGIN OTP VERIFICATION */}
        {/* ========================================================================= */}
        {mode === 'LOGIN_OTP' && (
          <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 text-xs text-slate-300 leading-relaxed">
              A 6-digit verification code has been sent to <strong className="text-white font-medium">{email}</strong>. Please check your inbox (and spam folder) and enter it below.
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Enter 6-Digit Code</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-center tracking-widest text-lg placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 5}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                'Confirm Code & Sign In'
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <button
                type="button"
                onClick={() => {
                  resetAllStates();
                  setMode('LOGIN');
                }}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to login</span>
              </button>
              <button
                type="button"
                onClick={handleLoginSubmit}
                disabled={loading}
                className="text-sky-400 hover:underline transition-colors"
              >
                Resend Code
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: REGISTRATION */}
        {/* ========================================================================= */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Md. Rezaul Karim"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-2 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value="Computer Science & Engineering">CSE</option>
                  <option value="Electrical & Electronic Engineering">EEE</option>
                  <option value="Business Administration">BBA</option>
                  <option value="Civil Engineering">Civil</option>
                  <option value="Department of English">English</option>
                  <option value="Department of Law">Law</option>
                  <option value="Department of Pharmacy">Pharmacy</option>
                  <option value="Textile Engineering">Textile</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Student ID (Optional)</label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="213-15-XXXX"
                    className="w-full pl-8 pr-2 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Batch (e.g. 65)</label>
                <input
                  type="text"
                  required
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  placeholder="65"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Section (e.g. B)</label>
                <input
                  type="text"
                  required
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="B"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span>A secure verification code will be sent to your email to activate the account.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                'Send Verification Code to Email →'
              )}
            </button>

            <div className="pt-2 text-center text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  resetAllStates();
                  setMode('LOGIN');
                }}
                className="text-sky-400 hover:underline font-semibold"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: VERIFY REGISTRATION OTP */}
        {/* ========================================================================= */}
        {mode === 'REGISTER_OTP' && (
          <form onSubmit={handleVerifyRegisterOtp} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 text-xs text-slate-300 leading-relaxed">
              We have sent a 6-digit confirmation code to <strong className="text-white font-medium">{email}</strong>.
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Enter Verification Code</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-center tracking-widest text-lg placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 5}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                'Verify & Activate Account'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                resetAllStates();
                setMode('REGISTER');
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mx-auto transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Edit Registration</span>
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: FORGOT PASSWORD (EMAIL INPUT) */}
        {/* ========================================================================= */}
        {mode === 'FORGOT_EMAIL' && (
          <form onSubmit={handleForgotEmailSubmit} className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 text-xs text-slate-300 leading-relaxed">
              Enter your registered email address. We will send a 6-digit password reset code to your email inbox.
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Your Registered Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                'Send Password Reset Code'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                resetAllStates();
                setMode('LOGIN');
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mx-auto transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancel & Return to Login</span>
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VIEW 6: FORGOT PASSWORD (OTP + NEW PASSWORD) */}
        {/* ========================================================================= */}
        {mode === 'FORGOT_OTP' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 text-xs text-slate-300 leading-relaxed">
              Resetting password for <strong className="text-white font-medium">{email}</strong>. Enter the verification code and your new password.
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">6-Digit Verification Code</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-center tracking-widest text-base focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 5 || !newPassword}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                'Update Password & Sign In'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                resetAllStates();
                setMode('FORGOT_EMAIL');
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mx-auto transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
