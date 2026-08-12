import React, { useState } from 'react';
import { Staff } from '../types';
import { UserPlus, UserCheck, UserX, Trash2, Edit3, Save, X, ShieldCheck } from 'lucide-react';
import { SCHEDULE_OPTIONS } from '../utils/initialData';

interface StaffManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  onSaveStaffList: (list: Staff[]) => void;
}

export const StaffManagerModal: React.FC<StaffManagerModalProps> = ({
  isOpen,
  onClose,
  staffList,
  onSaveStaffList,
}) => {
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Server');
  const [newSchedule, setNewSchedule] = useState(SCHEDULE_OPTIONS[0] || '');
  const [newPhone, setNewPhone] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Staff>>({});

  if (!isOpen) return null;

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const generatedId = newId.trim() || `STF-${String(staffList.length + 1).padStart(2, '0')}`;
    const newStaff: Staff = {
      id: generatedId,
      name: newName.trim(),
      role: newRole.trim() || 'Server',
      defaultSchedule: newSchedule.trim() || SCHEDULE_OPTIONS[0] || '',
      phone: newPhone.trim(),
      active: true,
    };

    onSaveStaffList([...staffList, newStaff]);

    // Reset inputs
    setNewId('');
    setNewName('');
    setNewPhone('');
  };

  const handleToggleActive = (staffId: string) => {
    const updated = staffList.map((s) => (s.id === staffId ? { ...s, active: !s.active } : s));
    onSaveStaffList(updated);
  };

  const handleDeleteStaff = (staffId: string) => {
    if (window.confirm('Are you sure you want to remove this staff member?')) {
      const updated = staffList.filter((s) => s.id !== staffId);
      onSaveStaffList(updated);
    }
  };

  const handleStartEdit = (staff: Staff) => {
    setEditingId(staff.id);
    setEditForm({ ...staff });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const updated = staffList.map((s) => (s.id === editingId ? ({ ...s, ...editForm } as Staff) : s));
    onSaveStaffList(updated);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="lounge-card w-full max-w-2xl rounded-2xl p-6 border border-purple-500/40 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-slate-100">Staff Roster Management</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add New Staff Form */}
        <form onSubmit={handleAddStaff} className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register New Staff</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Staff ID (Auto)</label>
              <input
                type="text"
                placeholder="e.g. STF-07"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Yeji"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Role / Position</label>
              <input
                type="text"
                placeholder="e.g. Server, Manager"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Default Schedule</label>
              <select
                value={newSchedule}
                onChange={(e) => setNewSchedule(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500 appearance-none"
              >
                {SCHEDULE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-lg shadow-md shadow-purple-950 transition-colors"
            >
              + Register Staff
            </button>
          </div>
        </form>

        {/* Staff List Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-300">Registered Staff ({staffList.length})</h3>
          <div className="border border-slate-800 rounded-xl bg-slate-950/60 max-h-60 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
              <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Schedule</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {staffList.map((staff) => {
                  const isEditing = editingId === staff.id;

                  if (isEditing) {
                    return (
                      <tr key={staff.id} className="bg-purple-950/30">
                        <td className="px-3 py-2 font-mono">{staff.id}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editForm.role || ''}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={editForm.defaultSchedule || ''}
                            onChange={(e) => setEditForm({ ...editForm, defaultSchedule: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white appearance-none"
                          >
                            {SCHEDULE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => setEditForm({ ...editForm, active: !editForm.active })}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300"
                          >
                            {editForm.active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 text-emerald-400 hover:bg-emerald-950/50 rounded mr-1"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-800 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={staff.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="px-3 py-2 font-mono text-slate-400 text-[11px]">{staff.id}</td>
                      <td className="px-3 py-2 font-semibold text-slate-100">{staff.name}</td>
                      <td className="px-3 py-2 text-slate-300">{staff.role}</td>
                      <td className="px-3 py-2 font-mono text-slate-400">{staff.defaultSchedule}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleToggleActive(staff.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                            staff.active
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {staff.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right space-x-1">
                        <button
                          onClick={() => handleStartEdit(staff)}
                          className="p-1 text-slate-400 hover:text-purple-300 hover:bg-slate-800 rounded transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end border-t border-slate-800 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
