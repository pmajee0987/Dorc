import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Newspaper, ThumbsUp, MessageSquare, Share2, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export function NewsFeed({ maxPosts = 10 }: { maxPosts?: number }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'news_feed'), 
      orderBy('createdAt', 'desc'), 
      limit(maxPosts)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("News feed fetch error:", err);
      setLoading(false);
    });
    
    return () => unsub();
  }, [maxPosts]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10 text-gray-400">
        <Newspaper size={32} className="mx-auto mb-3 opacity-20" />
        <p className="text-sm">No recent updates or notices.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post, idx) => (
        <motion.div 
          key={post.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 space-y-4 hover:border-white/20 transition-all shadow-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg">A</div>
            <div>
              <div className="text-sm font-black flex items-center gap-1.5 text-white">System Admin <CheckCircle2 size={12} className="text-blue-400" /></div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <Clock size={10} />
                {post.createdAt ? new Date(post.createdAt?.toDate?.() || post.createdAt).toLocaleDateString() : 'Just now'}
              </div>
            </div>
          </div>
          
          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{post.text}</p>
          
          {post.mediaUrls?.length > 0 && (
            <div className={`grid gap-2 mt-4 ${post.mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {post.mediaUrls.map((url: string, i: number) => {
                const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || url.includes('video');
                if (isVideo) {
                  return (
                    <video key={i} src={url} controls className="w-full h-48 md:h-64 object-cover rounded-2xl bg-black shadow-inner" preload="metadata" />
                  );
                }
                return (
                  <img key={i} src={url} alt="" className="w-full h-48 md:h-64 object-cover rounded-2xl shadow-inner hover:scale-[1.02] transition-transform duration-500 cursor-pointer" onClick={() => window.open(url, '_blank')} />
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-6 pt-4 border-t border-white/5">
             <div className="flex items-center gap-2 text-xs font-bold text-gray-400"><ThumbsUp size={16} className="text-indigo-400" /> {post.likes?.length || 0}</div>
             <div className="flex items-center gap-2 text-xs font-bold text-gray-400"><MessageSquare size={16} className="text-pink-400" /> {post.commentCount || 0}</div>
             <div className="flex items-center gap-2 text-xs font-bold text-gray-400"><Share2 size={16} className="text-emerald-400" /> Share</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
