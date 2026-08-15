import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, X, Save, Trash2, ShieldAlert } from 'lucide-react';
import { AdminUser, AdminRoleType } from '../types';
import { loadAdmins, saveAdmins } from '../utils/storage';

interface AdminManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AdminUser;
}

export const AdminManagerModal: React.FC<AdminManagerModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAdmins(loadAdmins());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveList = (newList: AdminUser[]) => {
    setAdmins(newList);
    saveAdmins(newList);
  };

  const handleCreateNew = () => {
    const newId = `adm-${Date.now()}`;
    const newAdmin: AdminUser = {
      id: newId,
      username: '',
      password: '',
      name: '',
      role: 'attendance_only',
      permissions: {
        canAccessAttendance: true,
        canAccessLD: false,
        canAccessReport: false,
        canManageStaff: false,
        canManageAdmins: false,
      },
      createdAt: new Date().toISOString(),
    };
    setEditingAdmin(newAdmin);
  };

  const handleSaveEdit = () => {
    if (!editingAdmin || !editingAdmin.username || !editingAdmin.password || !editingAdmin.name) {
      alert('Username, password, and name are required.');
      return;
    }
    
    // Clean inputs
    const safeUsername = editingAdmin.username.trim();
    const safeAdmin = { ...editingAdmin, username: safeUsername };
    
    // Check duplicate username
    if (admins.some(a => a.username.toLowerCase() === safeUsername.toLowerCase() && a.id !== editingAdmin.id)) {
      alert('Username already exists.');
      return;
    }

    // Apply role-based presets
    let finalAdmin = { ...safeAdmin };
    if (finalAdmin.role === 'super') {
      finalAdmin.permissions = {
        canAccessAttendance: true,
        canAccessLD: true,
        canAccessReport: true,
        canManageStaff: true,
        canManageAdmins: true,
      };
    } else if (finalAdmin.role === 'attendance_only') {
      finalAdmin.permissions = {
        canAccessAttendance: true,
        canAccessLD: false,
        canAccessReport: false,
        canManageStaff: false,
        canManageAdmins: false,
      };
    } else if (finalAdmin.role === 'ld_only') {
      finalAdmin.permissions = {
        canAccessAttendance: false,
        canAccessLD: true,
        canAccessReport: false,
        canManageStaff: false,
        canManageAdmins: false,
      };
    } else if (finalAdmin.role === 'report_only') {
      finalAdmin.permissions = {
        canAccessAttendance: false,
        canAccessLD: false,
        canAccessReport: true,
        canManageStaff: false,
        canManageAdmins: false,
      };
    }

    const exists = admins.some(a => a.id === finalAdmin.id);
    let newList;
    if (exists) {
      newList = admins.map(a => (a.id === finalAdmin.id ? finalAdmin : a));
    } else {
      newList = [...admins, finalAdmin];
    }
    
    handleSaveList(newList);
    setEditingAdmin(null);
  };

  const handleDelete = (id: string) => {
    if (id === currentUser.id) {
      alert('You cannot delete your own account.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this admin account?')) {
      const newList = admins.filter(a => a.id !== id);
      handleSaveList(newList);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0e17]/80 backdrop-blur-sm">
      <div className="bg-[#161b2b] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0b0e17]/50">
          <div className="flex items-center gap-3 text-slate-100">
            <div className="p-2 bg-indigo-900/30 rounded-xl border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="font-bold text-lg">Administrator Management</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-rose-500/20 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          {/* List View */}
          <div className="w-full md:w-1/2 flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-300">Admin Accounts</h3>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Admin
              </button>
            </div>
            
            <div className="space-y-2">
              {admins.map(admin => (
                <div
                  key={admin.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    editingAdmin?.id === admin.id
                      ? 'border-indigo-500 bg-indigo-900/20'
                      : 'border-slate-800 bg-[#0b0e17]'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-slate-200">{admin.name}</span>
                    <span className="text-xs text-slate-500 font-mono">@{admin.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                      {admin.role.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => setEditingAdmin({ ...admin })}
                      className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(admin.id)}
                      className="px-2 py-1 text-xs bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 rounded-lg transition-colors border border-rose-900/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Form */}
          <div className="w-full md:w-1/2">
            {editingAdmin ? (
              <div className="bg-[#0b0e17] border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-indigo-300 mb-2 border-b border-slate-800 pb-2">
                  {admins.some(a => a.id === editingAdmin.id) ? 'Edit Admin' : 'New Admin Account'}
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={editingAdmin.name}
                      onChange={(e) => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
                      className="w-full bg-[#161b2b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Username</label>
                    <input
                      type="text"
                      value={editingAdmin.username}
                      onChange={(e) => setEditingAdmin({ ...editingAdmin, username: e.target.value })}
                      className="w-full bg-[#161b2b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                      placeholder="e.g. jdoe123"
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                    <input
                      type="text"
                      value={editingAdmin.password}
                      onChange={(e) => setEditingAdmin({ ...editingAdmin, password: e.target.value })}
                      className="w-full bg-[#161b2b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                      placeholder="Enter new password"
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Role Type</label>
                    <select
                      value={editingAdmin.role}
                      onChange={(e) => setEditingAdmin({ ...editingAdmin, role: e.target.value as AdminRoleType })}
                      className="w-full bg-[#161b2b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="super">Super Admin (Full Access)</option>
                      <option value="attendance_only">Attendance Only</option>
                      <option value="ld_only">LD Tracking Only</option>
                      <option value="report_only">Reports Only</option>
                      <option value="custom">Custom Permissions</option>
                    </select>
                  </div>

                  {editingAdmin.role === 'custom' && (
                    <div className="pt-2 pb-2 space-y-2 border-t border-slate-800">
                      <label className="block text-xs font-bold text-slate-500 mb-2">Custom Permissions</label>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={editingAdmin.permissions.canAccessAttendance}
                          onChange={(e) => setEditingAdmin({
                            ...editingAdmin,
                            permissions: { ...editingAdmin.permissions, canAccessAttendance: e.target.checked }
                          })}
                          className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-indigo-500"
                        />
                        Access Attendance
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={editingAdmin.permissions.canAccessLD}
                          onChange={(e) => setEditingAdmin({
                            ...editingAdmin,
                            permissions: { ...editingAdmin.permissions, canAccessLD: e.target.checked }
                          })}
                          className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-indigo-500"
                        />
                        Access LD Tracking
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={editingAdmin.permissions.canAccessReport}
                          onChange={(e) => setEditingAdmin({
                            ...editingAdmin,
                            permissions: { ...editingAdmin.permissions, canAccessReport: e.target.checked }
                          })}
                          className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-indigo-500"
                        />
                        Access Reports
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={editingAdmin.permissions.canManageStaff}
                          onChange={(e) => setEditingAdmin({
                            ...editingAdmin,
                            permissions: { ...editingAdmin.permissions, canManageStaff: e.target.checked }
                          })}
                          className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-indigo-500"
                        />
                        Manage Staff Roster
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={editingAdmin.permissions.canManageAdmins}
                          onChange={(e) => setEditingAdmin({
                            ...editingAdmin,
                            permissions: { ...editingAdmin.permissions, canManageAdmins: e.target.checked }
                          })}
                          className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-indigo-500"
                        />
                        Manage Admins
                      </label>
                    </div>
                  )}

                  <div className="pt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setEditingAdmin(null)}
                      className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-900/30"
                    >
                      <Save className="w-4 h-4" />
                      Save Admin
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 bg-[#0b0e17] rounded-2xl border border-slate-800 p-8 text-center">
                <ShieldAlert className="w-12 h-12 text-slate-700" />
                <p className="text-sm">Select an admin account from the list to edit its credentials and permissions, or add a new one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
