import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { uploadFile } from '../../lib/storageHelper';
import { 
  Save, Upload, Edit3, Image as ImageIcon, CheckCircle2, AlertCircle, 
  Eye, EyeOff, RefreshCw, Lock, ShieldCheck, Wifi, WifiOff 
} from 'lucide-react';

export function AppControl() {
  const [data, setData] = useState({
    appName: "XPRO AGENT",
    shortName: "XPRO AGENT",
    primaryColor: "#6366f1",
    themeType: "dark",
    welcomeMessage: "Welcome to XPRO AGENT - Your Productivity Co-pilot",
    appLogoUrl: "",
    splashLogoUrl: "",
    splashBackgroundUrl: "",
    appDescription: "Your high-performance AI assistant for productivity, learning, and automation.",
    aiAssistantName: "XPRO AGENT",
    aiAssistantAvatarUrl: "",
    customGeminiApiKey: "",
    membershipBannerUrl: "",
    homeBannerUrl: "",
    aboutPageContent: "",
    contactEmail: "support@neostudy.ai",
    socialLinks: "",
    privacyPolicy: "",
    termsAndConditions: "",
    phone: "",
    devName: "",
    website: "",
    version: "4.0.0",
    copyright: ""
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingObj, setUploadingObj] = useState<Record<string, boolean>>({});
  
  // API key security mask state
  const [showApiKey, setShowApiKey] = useState(false);
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  
  // Network connectivity status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Live Snapshot Listener for Firestore settings/app
    const unsub = onSnapshot(doc(db, 'settings', 'app'), snap => {
      if (snap.exists()) {
        const snapData = snap.data() as any;
        setData(prev => ({ ...prev, ...snapData }));
      }
      setLoading(false);
    }, err => {
      console.warn('Live settings sync warning:', err);
      setLoading(false);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsub();
    };
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', message: string, duration = 4000) => {
    setStatusNotification({ type, message });
    setTimeout(() => {
      setStatusNotification(null);
    }, duration);
  };

  const handleSaveWithRetry = async (retryCount = 0): Promise<boolean> => {
    if (!navigator.onLine) {
      showToast('error', 'No internet connection. Please check your network.');
      return false;
    }

    try {
      // 10-second timeout guarantee to avoid getting stuck on "Saving..."
      const savePromise = Promise.all([
        setDoc(doc(db, 'settings', 'app'), data, { merge: true }),
        setDoc(doc(db, 'settings', 'about'), data, { merge: true })
      ]);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save request timed out. Retrying...')), 10000)
      );

      await Promise.race([savePromise, timeoutPromise]);
      return true;
    } catch (err: any) {
      console.warn(`Save attempt ${retryCount + 1} failed:`, err);
      if (retryCount < 2) {
        showToast('info', `Network delay detected. Retrying save (${retryCount + 1}/3)...`);
        await new Promise(r => setTimeout(r, 1200));
        return handleSaveWithRetry(retryCount + 1);
      }
      throw err;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    showToast('info', 'Saving settings & propagating live sync...');
    try {
      const success = await handleSaveWithRetry();
      if (success) {
        showToast('success', 'Saved successfully! Live sync active across all users.');
      }
    } catch (e: any) {
      console.error('Save error:', e);
      showToast('error', e?.message || 'Failed to save settings. Please check your permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    
    setUploadingObj(prev => ({ ...prev, [fieldName]: true }));
    setUploadProgress(prev => ({ ...prev, [fieldName]: 0 }));

    try {
      const url = await uploadFile(
        file, 
        `admin_content/${fieldName}_${Date.now()}`,
        {
          onProgress: (prog) => {
            setUploadProgress(prev => ({ ...prev, [fieldName]: Math.round(prog) }));
          },
          compressImages: true
        }
      );

      setData(prev => ({ ...prev, [fieldName]: url }));
      
      // Auto save asset URL to Firestore immediately
      await setDoc(doc(db, 'settings', 'app'), { [fieldName]: url }, { merge: true });
      showToast('success', `Uploaded & saved ${fieldName} successfully!`);
    } catch (err: any) {
      console.error(err);
      showToast('error', `Upload failed: ${err?.message || 'Check storage permissions'}`);
    } finally {
      setUploadingObj(prev => ({ ...prev, [fieldName]: false }));
      setUploadProgress(prev => ({ ...prev, [fieldName]: 100 }));
    }
  };

  const maskApiKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••••••';
    return key.substring(0, 4) + '••••••••••••••••' + key.substring(key.length - 4);
  };

  const renderImageUpload = (label: string, fieldName: keyof typeof data) => {
    const isUploading = uploadingObj[fieldName];
    const progress = uploadProgress[fieldName] || 0;
    const imageUrl = data[fieldName] as string;

    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden border border-white/10 shrink-0 relative group">
            {imageUrl ? (
              <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="text-gray-500" size={24} />
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-1">
                <RefreshCw size={16} className="text-pink-400 animate-spin mb-1" />
                <span className="text-[10px] font-bold text-white">{progress}%</span>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <label className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 max-w-max ${
              isUploading ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}>
              <Upload size={14} /> {isUploading ? `Uploading ${progress}%` : 'Upload Image'}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => handleFileUpload(e, fieldName as string)} 
                disabled={isUploading} 
              />
            </label>
            {isUploading && (
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden max-w-xs">
                <div 
                  className="bg-gradient-to-r from-pink-500 to-indigo-500 h-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-white flex flex-col items-center justify-center gap-3">
        <RefreshCw size={28} className="animate-spin text-indigo-400" />
        <span className="text-sm font-medium text-gray-400">Syncing Admin Settings with Firebase...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {statusNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-xl border ${
              statusNotification.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300' 
                : statusNotification.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-300'
                : 'bg-indigo-950/90 border-indigo-500/40 text-indigo-300'
            }`}
          >
            {statusNotification.type === 'success' && <CheckCircle2 size={18} className="shrink-0" />}
            {statusNotification.type === 'error' && <AlertCircle size={18} className="shrink-0" />}
            {statusNotification.type === 'info' && <RefreshCw size={18} className="shrink-0 animate-spin" />}
            <span className="flex-1">{statusNotification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center sticky top-0 bg-slate-900/90 backdrop-blur-md z-10 py-4 px-2 border-b border-white/10 gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            App Customization
            {!isOnline && (
              <span className="text-xs bg-rose-500/20 text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/30 flex items-center gap-1 font-mono">
                <WifiOff size={12} /> Offline Mode
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Changes saved here sync immediately to all connected app users.</p>
        </div>

        <button 
          onClick={handleSave} 
          disabled={saving} 
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg disabled:opacity-50 transition-all cursor-pointer text-sm"
        >
          {saving ? (
            <>
              <RefreshCw size={16} className="animate-spin" /> Saving & Syncing...
            </>
          ) : (
            <>
              <Save size={16} /> Save & Sync Live
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Settings */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-indigo-400 mb-4 border-b border-white/10 pb-2">Core Branding</h3>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">App Name (Full)</label>
            <input 
              value={data.appName || ''} 
              onChange={e => setData({...data, appName: e.target.value})} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 focus:border-indigo-500 outline-none transition-colors text-sm" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">App Name (Short)</label>
            <input 
              value={data.shortName || ''} 
              onChange={e => setData({...data, shortName: e.target.value})} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 focus:border-indigo-500 outline-none transition-colors text-sm" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Theme Mode</label>
              <select 
                value={data.themeType || 'dark'} 
                onChange={e => setData({...data, themeType: e.target.value})}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 appearance-none text-sm outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="dark">Dark Theme (Default)</option>
                <option value="light">Light Theme</option>
                <option value="amoled">AMOLED Black</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Primary Color</label>
              <div className="flex gap-2 mt-2">
                <input 
                  type="color" 
                  value={data.primaryColor || '#ec4899'} 
                  onChange={e => setData({...data, primaryColor: e.target.value})}
                  className="w-11 h-11 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                />
                <input 
                  type="text" 
                  value={data.primaryColor || '#ec4899'} 
                  onChange={e => setData({...data, primaryColor: e.target.value})}
                  className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white text-sm font-mono outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">App Description</label>
            <textarea 
              value={data.appDescription || ''} 
              onChange={e => setData({...data, appDescription: e.target.value})} 
              className="w-full h-24 bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 resize-none text-sm outline-none focus:border-indigo-500" 
            />
          </div>
        </div>

        {/* Assets & Images */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-pink-400 mb-4 border-b border-white/10 pb-2">Logos & Banners</h3>
          {renderImageUpload("App Logo", "appLogoUrl")}
          {renderImageUpload("Splash Screen Logo", "splashLogoUrl")}
          {renderImageUpload("Splash Background", "splashBackgroundUrl")}
          {renderImageUpload("Home Top Banner", "homeBannerUrl")}
          {renderImageUpload("Membership Banner", "membershipBannerUrl")}
        </div>

        {/* AI Assistant Settings & API Key Security */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-purple-400 mb-4 border-b border-white/10 pb-2 flex items-center justify-between">
            <span>AI Assistant Identity</span>
            <ShieldCheck size={18} className="text-emerald-400" />
          </h3>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Assistant Name</label>
            <input 
              value={data.aiAssistantName || ''} 
              onChange={e => setData({...data, aiAssistantName: e.target.value})} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 text-sm outline-none focus:border-indigo-500" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Welcome Text</label>
            <input 
              value={data.welcomeMessage || ''} 
              onChange={e => setData({...data, welcomeMessage: e.target.value})} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 text-sm outline-none focus:border-indigo-500" 
            />
          </div>

          {/* Secure Gemini API Key Field */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={12} /> Custom Gemini API Key (Encrypted Storage)
              </label>
              <button 
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                {showApiKey ? 'Hide' : 'Reveal'}
              </button>
            </div>

            <div className="relative">
              {!isEditingApiKey && !showApiKey && data.customGeminiApiKey ? (
                <div className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-3 text-gray-400 text-sm font-mono flex items-center justify-between">
                  <span>{maskApiKey(data.customGeminiApiKey)}</span>
                  <button 
                    onClick={() => setIsEditingApiKey(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-sans font-bold flex items-center gap-1 bg-indigo-500/10 px-2.5 py-1 rounded-lg"
                  >
                    <Edit3 size={12} /> Change Key
                  </button>
                </div>
              ) : (
                <input 
                  type={showApiKey ? "text" : "password"}
                  value={data.customGeminiApiKey || ''} 
                  onChange={e => setData({...data, customGeminiApiKey: e.target.value})} 
                  placeholder="Enter fallback Gemini API Key (e.g. AIzaSy...)"
                  className="w-full bg-slate-950/80 border border-purple-500/40 rounded-xl p-3 text-white text-sm font-mono outline-none focus:border-purple-400" 
                  onBlur={() => setIsEditingApiKey(false)}
                />
              )}
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              If supplied, this custom Gemini API key will be safely used as a fallback for high-capacity voice & chat responses.
            </p>
          </div>

          {renderImageUpload("AI Assistant Avatar", "aiAssistantAvatarUrl")}
        </div>

        {/* Legal & About Info */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-teal-400 mb-4 border-b border-white/10 pb-2">About Us & Legal</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Email</label>
              <input 
                value={data.contactEmail || ''} 
                onChange={e => setData({...data, contactEmail: e.target.value})} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 text-sm outline-none focus:border-indigo-500" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Phone</label>
              <input 
                value={data.phone || ''} 
                onChange={e => setData({...data, phone: e.target.value})} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 text-sm outline-none focus:border-indigo-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Developer Name</label>
              <input 
                value={data.devName || ''} 
                onChange={e => setData({...data, devName: e.target.value})} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 text-sm outline-none focus:border-indigo-500" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Website URL</label>
              <input 
                value={data.website || ''} 
                onChange={e => setData({...data, website: e.target.value})} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 text-sm outline-none focus:border-indigo-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Version Info</label>
              <input 
                value={data.version || ''} 
                onChange={e => setData({...data, version: e.target.value})} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 text-sm outline-none focus:border-indigo-500" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Copyright Text</label>
              <input 
                value={data.copyright || ''} 
                onChange={e => setData({...data, copyright: e.target.value})} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 text-sm outline-none focus:border-indigo-500" 
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">About Page Content</label>
            <textarea 
              value={data.aboutPageContent || ''} 
              onChange={e => setData({...data, aboutPageContent: e.target.value})} 
              className="w-full h-24 bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 resize-none text-sm outline-none focus:border-indigo-500" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Privacy Policy URL</label>
            <input 
              value={data.privacyPolicy || ''} 
              onChange={e => setData({...data, privacyPolicy: e.target.value})} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 text-sm outline-none focus:border-indigo-500" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Terms & Conditions URL</label>
            <input 
              value={data.termsAndConditions || ''} 
              onChange={e => setData({...data, termsAndConditions: e.target.value})} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white mt-2 text-sm outline-none focus:border-indigo-500" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
