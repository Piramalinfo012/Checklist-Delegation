import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Rocket, 
  Zap, 
  CheckCircle2, 
  Camera, 
  ExternalLink, 
  Copy, 
  Check, 
  AlertTriangle, 
  LogOut, 
  Sparkles,
  ShieldCheck,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import sbhLogo from "../assets/logo.png";

const NEW_PORTAL_URL = "https://checklist-and-delegation-database.vercel.app/login";

export default function MigrationNoticePage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const username = sessionStorage.getItem("username") || "User";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(NEW_PORTAL_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem("masterDataCache");
    navigate("/login");
  };

  const handleOpenNewPortal = () => {
    window.location.href = NEW_PORTAL_URL;
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-x-hidden select-none">
      {/* Background Animated Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse delay-1000" />
      <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-4xl bg-slate-900/70 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(147,51,234,0.15)] p-6 sm:p-10 z-10 my-auto"
      >
        {/* Top Header Bar with Logo and User Info */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img 
              src={sbhLogo} 
              alt="Logo" 
              className="h-10 sm:h-12 w-auto object-contain bg-white/10 p-1.5 rounded-xl backdrop-blur-md border border-white/10" 
            />
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-purple-400" />
                New Version Live
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">Checklist & Delegation</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs text-slate-400">Logged in as</span>
              <span className="text-sm font-semibold text-purple-200 capitalize">{username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-200"
              title="Logout from this version"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Hero Announcement Badge & Heading */}
        <div className="text-center mt-8 mb-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 text-xs sm:text-sm font-medium mb-4 shadow-inner"
          >
            <Rocket className="w-4 h-4 text-purple-400 animate-bounce" />
            <span>🎉 Major System Upgrade | नया और तेज़ सिस्टम अपडेट</span>
          </motion.div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-purple-300 mb-3">
            Checklist Has Been Updated!
          </h1>
          <p className="text-lg sm:text-xl font-medium text-purple-200/90 mb-1">
            चेकलिस्ट अपडेट हो गया है, कृपया नए लिंक से लॉगिन करें
          </p>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            The checklist system has moved to an ultra-fast, feature-packed portal. Please access and bookmark the new link below.
          </p>
        </div>

        {/* Main CTA Link Box */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="relative bg-gradient-to-r from-purple-950/80 via-slate-900/90 to-indigo-950/80 border-2 border-purple-500/40 rounded-2xl p-5 sm:p-6 mb-8 shadow-[0_0_30px_rgba(168,85,247,0.2)]"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto text-left overflow-hidden">
              <span className="text-xs uppercase font-bold tracking-wider text-purple-400 block mb-1">
                🔗 Official Portal URL / नया लिंक
              </span>
              <div className="font-mono text-sm sm:text-base text-slate-200 bg-black/40 px-3.5 py-2 rounded-xl border border-white/5 truncate max-w-full">
                {NEW_PORTAL_URL}
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold transition-all duration-200 shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-300" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                onClick={handleOpenNewPortal}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm sm:text-base font-bold shadow-[0_0_20px_rgba(219,39,119,0.5)] hover:shadow-[0_0_30px_rgba(219,39,119,0.7)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
              >
                <span>Login New Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Feature Highlights Grid */}
        <div className="mb-8">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 text-center mb-4">
            🚀 New Upgraded Features / नए फीचर्स
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Feature 1: Super Fast */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-slate-800/40 hover:bg-slate-800/60 border border-purple-500/20 rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Zap className="w-5 h-5 fill-amber-400/20" />
              </div>
              <h4 className="font-bold text-slate-100 text-base flex items-center justify-between">
                <span>Super Fast</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">बहुत फास्ट</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-300">
                अब सिस्टम बिना किसी रुकावट के बिजली की गति से बहुत तेज़ चलेगा। Instant page loading & smooth interaction.
              </p>
            </motion.div>

            {/* Feature 2: Loading Issue Removed */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-slate-800/40 hover:bg-slate-800/60 border border-purple-500/20 rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-100 text-base flex items-center justify-between">
                <span>Zero Loading Lag</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">लोडिंग इश्यू खत्म</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-300">
                लोडिंग की सारी समस्या को पूरी तरह हटा दिया गया है। High speed server response & no stuck screens.
              </p>
            </motion.div>

            {/* Feature 3: DP Upload */}
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-slate-800/40 hover:bg-slate-800/60 border border-purple-500/20 rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Camera className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-100 text-base flex items-center justify-between">
                <span>Profile DP Upload</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">DP अपलोड</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-300">
                अब आप सीधे अपनी मनपसंद प्रोफाइल फोटो (DP) अपलोड और चेंज कर सकते हैं।
              </p>
            </motion.div>
          </div>
        </div>

        {/* Highlighted Note Banner */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-amber-200 shadow-md"
        >
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm sm:text-base text-amber-100 mb-1 flex items-center gap-2">
              <span>महत्वपूर्ण सूचना (Important Note)</span>
            </div>
            <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed font-medium">
              👉 <strong>सभी यूजर्स ध्यान दें:</strong> अभी नए लिंक <span className="underline decoration-amber-400 font-bold">({NEW_PORTAL_URL})</span> पर लॉगिन करें और तुरंत अपनी <strong>DP (Profile Picture) अपलोड कर लीजिए</strong>।
            </p>
          </div>
        </motion.div>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-white/5 text-center flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span>Checklist & Delegation Management System</span>
          <span className="text-slate-400">This older version is archived. Please use the new link above.</span>
        </div>
      </motion.div>
    </div>
  );
}
