import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle, RefreshCw, KeyRound, ShieldAlert } from 'lucide-react';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

interface PasswordResetModalProps {
  initialEmail?: string;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  initialEmail = '',
  onClose,
  onSuccess
}) => {
  const [resetEmail, setResetEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successSent, setSuccessSent] = useState(false);
  const [sentToEmail, setSentToEmail] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Timer countdown for Resend button
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendResetEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg("Please enter your registered email address.");
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Configure ActionCodeSettings to ensure proper redirect URL
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
      };

      try {
        // Direct call to sendPasswordResetEmail without restrictive action code settings
        await sendPasswordResetEmail(auth, cleanEmail);
      } catch (directErr: any) {
        console.warn("Direct sendPasswordResetEmail error:", directErr);
        throw directErr;
      }

      setSentToEmail(cleanEmail);
      setSuccessSent(true);
      setResendTimer(30);
      if (onSuccess) {
        onSuccess(`Password reset email sent to ${cleanEmail}`);
      }
    } catch (err: any) {
      console.error("Firebase Password Reset Error:", err);
      let friendlyError = "Failed to send password reset email. Please try again.";

      if (err.code === 'auth/user-not-found') {
        friendlyError = "No account found with this email address. Please check for typos or create a new account.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = "The email address format is invalid.";
      } else if (err.code === 'auth/too-many-requests') {
        friendlyError = "Too many reset attempts. Please check your inbox/spam folder or try again in a few minutes.";
      } else if (err.message) {
        friendlyError = err.message.replace('Firebase: ', '');
      }

      setErrorMsg(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 bg-slate-900/95 border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-md w-full text-white font-sans overflow-hidden"
      >
        {/* Background Glows */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Reset Password</h3>
              <p className="text-xs text-slate-400">Firebase Account Recovery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors text-xs flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>

        {/* Success View */}
        {successSent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5 text-center"
          >
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-xl font-bold text-white mb-2">Reset Link Dispatched!</h4>
              <p className="text-slate-300 text-sm leading-relaxed">
                We sent a password reset email link to:
              </p>
              <div className="mt-2 inline-block bg-slate-800/80 border border-indigo-500/30 px-3 py-1.5 rounded-xl font-semibold text-indigo-300 text-sm">
                {sentToEmail}
              </div>
            </div>

            {/* Spam Folder Alert Box */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left text-xs text-amber-200/90 leading-relaxed flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300 block mb-1">Check Spam / Junk Folder!</span>
                If you don't see the email in your main Inbox within 1–2 minutes, please check your <strong className="text-white">Spam</strong> or <strong className="text-white">Junk Mail</strong> folder.
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <button
                onClick={() => handleSendResetEmail()}
                disabled={loading || resendTimer > 0}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-sm font-semibold rounded-2xl border border-white/10 transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{resendTimer > 0 ? `Resend link in ${resendTimer}s` : 'Resend Reset Email'}</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold rounded-2xl shadow-lg transition-all"
              >
                Return to Sign In
              </button>
            </div>
          </motion.div>
        ) : (
          /* Form View */
          <form onSubmit={handleSendResetEmail} className="space-y-5">
            <p className="text-slate-300 text-sm leading-relaxed">
              Enter your registered account email below. We'll send an official Firebase password reset link to your inbox.
            </p>

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start space-x-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Account Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => {
                    setResetEmail(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="yourname@domain.com"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500/80 rounded-2xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-sm font-semibold rounded-2xl shadow-xl shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Reset Email</span>
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
