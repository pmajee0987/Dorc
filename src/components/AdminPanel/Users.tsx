import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { Search, Shield, Crown, UserCheck, UserX, Trash2, Edit3, X, Check, Activity, Mail, School, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'premium' | 'suspended'>('all');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editModalUser, setEditModalUser] = useState<any | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (window.confirm(`Change role of user to ${newRole.toUpperCase()}?`)) {
      try {
        await updateDoc(doc(db, 'users', userId), { role: newRole });
      } catch (err) {
        console.error("Failed to update role:", err);
        alert("Failed to update user role.");
      }
    }
  };

  const handleToggleSuspend = async (userId: string, isSuspended: boolean) => {
    const action = isSuspended ? 'unsuspend' : 'suspend';
    if (window.confirm(`Are you sure you want to ${action} this user?`)) {
      try {
        await updateDoc(doc(db, 'users', userId), { 
          suspended: !isSuspended,
          suspendedAt: !isSuspended ? new Date().toISOString() : null
        });
      } catch (err) {
        console.error("Failed to toggle suspension:", err);
        alert("Failed to change user suspension status.");
      }
    }
  };

  const handleTogglePremium = async (userId: string, isPremium: boolean) => {
    const now = new Date();
    const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    
    try {
      if (isPremium) {
        if (window.confirm("Revoke premium membership for this user?")) {
          await updateDoc(doc(db, 'users', userId), {
            isPremium: false,
            premiumExpiresAt: null,
            premiumType: null
          });
        }
      } else {
        if (window.confirm("Grant 1 Year Premium Membership to this user?")) {
          await updateDoc(doc(db, 'users', userId), {
            isPremium: true,
            premiumType: 'Admin Granted',
            premiumGrantedAt: now.toISOString(),
            premiumExpiresAt: oneYearLater
          });
        }
      }
    } catch (err) {
      console.error("Failed to update premium status:", err);
      alert("Failed to update user premium status.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Delete user record permanently from database?")) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (err) {
        console.error("Failed to delete user:", err);
        alert("Failed to delete user record.");
      }
    }
  };

  const handleSaveUserEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalUser) return;
    try {
      await updateDoc(doc(db, 'users', editModalUser.id), {
        fullName: editModalUser.fullName || editModalUser.name || '',
        name: editModalUser.fullName || editModalUser.name || '',
        schoolName: editModalUser.schoolName || '',
        class: editModalUser.class || editModalUser.className || '',
        board: editModalUser.board || '',
        role: editModalUser.role || 'user'
      });
      setEditModalUser(null);
    } catch (err) {
      console.error("Failed to save user updates:", err);
      alert("Failed to update user profile.");
    }
  };

  const filteredUsers = users.filter(u => {
    const name = (u.fullName || u.displayName || u.name || '').toLowerCase();
    const email = (u.email || u.id || '').toLowerCase();
    const school = (u.schoolName || u.school || '').toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchesSearch = name.includes(term) || email.includes(term) || school.includes(term);

    if (!matchesSearch) return false;

    if (roleFilter === 'admin') return u.role === 'admin';
    if (roleFilter === 'premium') return u.isPremium === true;
    if (roleFilter === 'suspended') return u.suspended === true;

    return true;
  });

  if (loading) return (
    <div className="p-12 text-center text-gray-400">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-3"></div>
      <span>Loading User Records...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black">User Management</h2>
          <p className="text-xs text-gray-400 mt-1">View user accounts, adjust roles, grant premium access, and enforce safety policies.</p>
        </div>
        
        <div className="text-xs font-mono font-bold bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
          Total Users: <span className="text-pink-400 font-black">{users.length}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search by name, email, or school..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-pink-500"
          />
        </div>

        <div className="flex bg-slate-900 border border-white/10 p-1 rounded-2xl text-xs font-bold select-none">
          {(['all', 'admin', 'premium', 'suspended'] as const).map(f => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={`px-3 py-1.5 rounded-xl uppercase tracking-wider text-[10px] transition-all cursor-pointer ${
                roleFilter === f ? 'bg-pink-500 text-white font-black shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-white/10 select-none">
              <tr>
                <th className="p-4 font-bold text-gray-400 uppercase tracking-wider">User Profile</th>
                <th className="p-4 font-bold text-gray-400 uppercase tracking-wider">Class / School</th>
                <th className="p-4 font-bold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="p-4 font-bold text-gray-400 uppercase tracking-wider">Membership</th>
                <th className="p-4 font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 italic">No users found matching your search.</td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const isAdmin = u.role === 'admin';
                  const isPremium = u.isPremium === true;
                  const isSuspended = u.suspended === true;

                  return (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{u.fullName || u.displayName || u.name || 'Unknown User'}</span>
                          {isAdmin && (
                            <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                              <Shield size={10} /> Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{u.email || u.id}</div>
                      </td>

                      <td className="p-4 text-gray-300">
                        <div>{u.class || u.className || '-'} {u.board ? `(${u.board})` : ''}</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[150px]">{u.schoolName || u.school || 'No school specified'}</div>
                      </td>

                      <td className="p-4">
                        <button 
                          onClick={() => handleToggleAdmin(u.id, u.role)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase border transition-all cursor-pointer flex items-center gap-1 ${
                            isAdmin 
                              ? 'bg-pink-500/20 text-pink-400 border-pink-500/30 hover:bg-pink-500/30' 
                              : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <Shield size={12} /> {isAdmin ? 'Admin' : 'Make Admin'}
                        </button>
                      </td>

                      <td className="p-4">
                        <button 
                          onClick={() => handleTogglePremium(u.id, isPremium)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase border transition-all cursor-pointer flex items-center gap-1 ${
                            isPremium 
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30' 
                              : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <Crown size={12} /> {isPremium ? 'Premium Active' : 'Grant Premium'}
                        </button>
                      </td>

                      <td className="p-4">
                        {isSuspended ? (
                          <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                            Suspended
                          </span>
                        ) : u.online ? (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px]">Active</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => setEditModalUser(u)}
                            className="p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-lg transition-all"
                            title="Edit User Info"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button 
                            onClick={() => handleToggleSuspend(u.id, isSuspended)}
                            className={`p-2 rounded-lg transition-all ${
                              isSuspended 
                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950' 
                                : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white'
                            }`}
                            title={isSuspended ? "Unsuspend User" : "Suspend User"}
                          >
                            {isSuspended ? <UserCheck size={14} /> : <UserX size={14} />}
                          </button>

                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                            title="Delete User Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editModalUser && (
          <div className="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm select-none">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-white/10 p-6 md:p-8 rounded-[28px] w-full max-w-md shadow-2xl space-y-5 text-white"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h3 className="font-bold text-lg text-white">Edit User Profile</h3>
                <button onClick={() => setEditModalUser(null)} className="p-1 hover:bg-white/10 rounded-full text-gray-400"><X size={18} /></button>
              </div>

              <form onSubmit={handleSaveUserEdits} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text"
                    value={editModalUser.fullName || editModalUser.name || ''}
                    onChange={e => setEditModalUser({...editModalUser, fullName: e.target.value, name: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs mt-1 text-white focus:border-pink-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">School Name</label>
                  <input 
                    type="text"
                    value={editModalUser.schoolName || ''}
                    onChange={e => setEditModalUser({...editModalUser, schoolName: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs mt-1 text-white focus:border-pink-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Class</label>
                    <input 
                      type="text"
                      value={editModalUser.class || editModalUser.className || ''}
                      onChange={e => setEditModalUser({...editModalUser, class: e.target.value, className: e.target.value})}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs mt-1 text-white focus:border-pink-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Board</label>
                    <input 
                      type="text"
                      value={editModalUser.board || ''}
                      onChange={e => setEditModalUser({...editModalUser, board: e.target.value})}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs mt-1 text-white focus:border-pink-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Role</label>
                  <select
                    value={editModalUser.role || 'user'}
                    onChange={e => setEditModalUser({...editModalUser, role: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs mt-1 text-white focus:border-pink-500 outline-none"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setEditModalUser(null)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs transition-all shadow-md"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

