import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { uploadFile, deleteFile } from '../../lib/storageHelper';
import { Upload, X, File, Image as ImageIcon, FileText, Video, Headphones, CheckCircle, Trash2, Edit, AlertCircle, XCircle } from 'lucide-react';
import type { UploadTask } from 'firebase/storage';

export function ContentManager() {
  const [activeTab, setActiveTab] = useState('notes');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState('');
  const [uploadError, setUploadError] = useState('');
  
  const currentUploadTask = useRef<UploadTask | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class: '',
    board: '',
    stream: '',
    subject: '',
    chapter: '',
    topic: '',
    fileUrl: '',
    fileName: '',
  });
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const tabs = [
    { id: 'classes', label: 'Classes', collection: 'admin_classes', icon: FileText, accept: '' },
    { id: 'subjects', label: 'Subjects', collection: 'admin_subjects', icon: FileText, accept: '' },
    { id: 'chapters', label: 'Chapters', collection: 'admin_chapters', icon: FileText, accept: '' },
    { id: 'notes', label: 'Notes', collection: 'admin_notes', icon: FileText, accept: '.pdf,.doc,.docx,.txt' },
    { id: 'pdfs', label: 'PDFs', collection: 'admin_pdfs', icon: File, accept: '.pdf' },
    { id: 'images', label: 'Images', collection: 'admin_images', icon: ImageIcon, accept: 'image/*' },
    { id: 'videos', label: 'Videos', collection: 'admin_videos', icon: Video, accept: 'video/*' },
    { id: 'audio', label: 'Audio', collection: 'admin_audio', icon: Headphones, accept: 'audio/*' },
    { id: 'mock_tests', label: 'Mock Tests', collection: 'admin_mock_tests', icon: FileText, accept: '.pdf,.zip' },
    { id: 'pyq', label: 'Previous Year Questions', collection: 'admin_pyq', icon: FileText, accept: '.pdf' },
    { id: 'assignments', label: 'Assignments', collection: 'admin_assignments', icon: FileText, accept: '.pdf,.doc,.docx' },
    { id: 'quizzes', label: 'Quizzes', collection: 'admin_quizzes', icon: CheckCircle, accept: '.pdf,.json' },
  ];

  const currentTab = tabs.find(t => t.id === activeTab)!;

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, currentTab.collection), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.warn("Error fetching data", err);
      setData([]);
      setLoading(false);
    });
    return () => unsub();
  }, [activeTab]);

  const handleCancelUpload = () => {
    if (currentUploadTask.current) {
      currentUploadTask.current.cancel();
      setUploading(false);
      setUploadError('Upload canceled by user');
      setUploadProgress(0);
      setUploadState('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setUploadError('');
    setUploadProgress(0);
    setUploadState('Starting...');
    
    try {
      let finalFileUrl = formData.fileUrl;
      let finalFileName = formData.fileName;
      let finalMediaType = 'unknown';

      if (fileToUpload) {
        if (fileToUpload.size > 500 * 1024 * 1024) {
          throw new Error('File too large (max 500MB)');
        }

        const ext = fileToUpload.name.split('.').pop();
        const path = `admin_content/${activeTab}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        
        finalMediaType = fileToUpload.type || 'unknown';
        
        finalFileUrl = await uploadFile(fileToUpload, path, {
          onProgress: (p) => setUploadProgress(p),
          onStateChange: (s) => setUploadState(s),
          onTaskReady: (task) => { currentUploadTask.current = task; },
          compressImages: true
        });
        
        finalFileName = fileToUpload.name;
      }

      await addDoc(collection(db, currentTab.collection), {
        title: formData.title,
        description: formData.description || '',
        mediaType: finalMediaType,
        downloadUrl: finalFileUrl,
        fileUrl: finalFileUrl, // keeping for backwards compatibility
        fileName: finalFileName,
        uploader: auth.currentUser?.uid || 'admin',
        class: formData.class,
        board: formData.board,
        stream: formData.stream,
        subject: formData.subject,
        chapter: formData.chapter,
        topic: formData.topic,
        createdAt: serverTimestamp(),
      });

      setIsFormOpen(false);
      setFormData({ title: '', description: '', class: '', board: '', stream: '', subject: '', chapter: '', topic: '', fileUrl: '', fileName: '' });
      setFileToUpload(null);
      setUploadProgress(0);
      setUploadState('');
      currentUploadTask.current = null;
      alert("Successfully uploaded!");
    } catch (err: any) {
      console.error(err);
      if (err.message !== 'Upload was canceled.') {
        setUploadError(err.message || 'Failed to upload content');
      }
    } finally {
      if (currentUploadTask.current) {
        setUploading(false);
      }
    }
  };

  const handleDelete = async (item: any) => {
    if (!window.confirm("Are you sure? This will delete the file permanently.")) return;
    try {
      await deleteDoc(doc(db, currentTab.collection, item.id));
      if (item.fileUrl) {
        await deleteFile(item.fileUrl);
      }
      if (item.downloadUrl && item.downloadUrl !== item.fileUrl) {
        await deleteFile(item.downloadUrl);
      }
    } catch (e) {
      console.error('Delete error', e);
      alert('Failed to delete completely');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Content Manager</h2>
        <button onClick={() => setIsFormOpen(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm">
          <Upload size={18} /> Upload {currentTab.label}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {isFormOpen && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Upload to {currentTab.label}</h3>
            <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Title</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Class</label>
                <input value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Board</label>
                <input value={formData.board} onChange={e => setFormData({...formData, board: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Stream</label>
                <input value={formData.stream} onChange={e => setFormData({...formData, stream: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Subject</label>
                <input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Chapter</label>
                <input value={formData.chapter} onChange={e => setFormData({...formData, chapter: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Description / Details</label>
                <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Topic</label>
                <input value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Select File</label>
                <input type="file" accept={currentTab.accept} onChange={e => setFileToUpload(e.target.files?.[0] || null)} disabled={uploading} className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm mt-1 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30" />
                <p className="text-[10px] text-gray-500 mt-1">Max size: 500MB. Uses direct ArrayBuffer conversion for stability.</p>
              </div>
            </div>
            
            {uploadError && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                <AlertCircle size={16} />
                <span>{uploadError}</span>
              </div>
            )}
            
            {uploading && (
              <div className="space-y-2 mt-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between text-xs font-bold text-gray-400">
                  <span>{uploadState || 'Uploading...'}</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="button" onClick={handleCancelUpload} className="text-xs flex items-center gap-1 text-rose-400 hover:text-rose-300 font-bold px-3 py-1 bg-rose-500/10 rounded-lg">
                    <XCircle size={14} /> Cancel Upload
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button type="submit" disabled={uploading || (!fileToUpload && !formData.fileUrl)} className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg">
                {uploading ? 'Processing...' : `Upload to ${currentTab.label}`}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {loading ? (
        <div className="text-center p-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div></div>
      ) : data.length === 0 ? (
        <div className="text-center p-12 bg-white/5 border border-white/10 rounded-3xl text-gray-400">
          No {currentTab.label.toLowerCase()} found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(item => (
            <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 relative group flex flex-col justify-between overflow-hidden">
              <div>
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={() => handleDelete(item)} className="p-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-md backdrop-blur-md"><Trash2 size={16} /></button>
                </div>
                <h3 className="font-bold text-lg text-white mb-2 pr-16 truncate">{item.title}</h3>
                <div className="space-y-1 text-xs text-gray-400 mb-4">
                  {item.class && <div><span className="font-semibold text-gray-300">Class:</span> {item.class}</div>}
                  {item.subject && <div><span className="font-semibold text-gray-300">Subject:</span> {item.subject}</div>}
                  {item.chapter && <div><span className="font-semibold text-gray-300">Chapter:</span> {item.chapter}</div>}
                  {item.description && <div className="mt-2 line-clamp-2 italic">{item.description}</div>}
                </div>
                
                {/* Media Preview inside Admin */}
                {(item.downloadUrl || item.fileUrl) && (
                  <div className="mb-4 rounded-xl overflow-hidden bg-black/40 border border-white/5">
                     {(item.mediaType?.startsWith('image/') || currentTab.id === 'images') ? (
                        <img src={item.downloadUrl || item.fileUrl} alt={item.title} className="w-full h-32 object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(item.downloadUrl || item.fileUrl, '_blank')} referrerPolicy="no-referrer" />
                     ) : (item.mediaType?.startsWith('video/') || currentTab.id === 'videos') ? (
                        <video src={item.downloadUrl || item.fileUrl} controls className="w-full max-h-32 outline-none" preload="metadata" />
                     ) : (item.mediaType?.startsWith('audio/') || currentTab.id === 'audio') ? (
                        <audio src={item.downloadUrl || item.fileUrl} controls className="w-full mt-2" preload="metadata" />
                     ) : null}
                  </div>
                )}
              </div>

              {(item.downloadUrl || item.fileUrl) && (
                <a href={item.downloadUrl || item.fileUrl} target="_blank" rel="noreferrer" download={item.fileName || true} className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-bold bg-indigo-500/10 px-3 py-2 rounded-lg self-start">
                  View / Download <Upload size={14} className="rotate-45" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
