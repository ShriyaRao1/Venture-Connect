import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../api/api';

export default function Profile() {
  const { user, setUser } = useAuth();

  const [form, setForm] = useState({
    name:     user?.name     || '',
    bio:      user?.bio      || '',
    location: user?.location || '',
    website:  user?.website  || '',
    linkedin: user?.linkedin || '',
    avatar:   user?.avatar   || '',
    investorPreferences: {
      sectors:   user?.investorPreferences?.sectors   || [],
      stages:    user?.investorPreferences?.stages    || [],
      locations: user?.investorPreferences?.locations || [],
    }
  });

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving]   = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const onChange    = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onPwChange  = (e) => setPwForm({ ...pwForm, [e.target.name]: e.target.value });

  const handleTogglePreference = (type, value) => {
    setForm((prev) => {
      const current = prev.investorPreferences[type];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return {
        ...prev,
        investorPreferences: {
          ...prev.investorPreferences,
          [type]: next,
        },
      };
    });
  };

  const handleLocationsChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({
      ...prev,
      investorPreferences: {
        ...prev.investorPreferences,
        locations: val.split(',').map((l) => l.trim()).filter(Boolean),
      },
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await userAPI.updateProfile(form);
      if (setUser) setUser(data.user);
      // Also update localStorage cache
      const stored = localStorage.getItem('vc_user');
      if (stored) localStorage.setItem('vc_user', JSON.stringify({ ...JSON.parse(stored), ...data.user }));
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  const handleSavePw = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      toast.error('Passwords do not match'); return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters'); return;
    }
    setSavingPw(true);
    try {
      await userAPI.updatePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password updated!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally { setSavingPw(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">Edit Profile</h1>
          <p className="text-sm text-[#555]">Update your public profile information</p>
        </div>

        {/* Avatar preview */}
        <div className="flex items-center gap-4 mb-8 p-5 border border-[#2a2a2a] rounded-xl bg-[#161616]">
          <div className="w-16 h-16 rounded-full bg-[#00c853] flex items-center justify-center text-black font-black text-2xl overflow-hidden shrink-0">
            {form.avatar
              ? <img src={form.avatar} alt="" className="w-full h-full object-cover" />
              : (form.name[0] || user?.name[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{form.name || user?.name}</p>
            <p className="text-xs text-[#555] capitalize mt-0.5">{user?.role}</p>
          </div>
        </div>

        {/* ── Profile Form ─────────────────────────── */}
        <form onSubmit={handleSaveProfile} className="space-y-5 mb-10">
          <div className="border border-[#2a2a2a] rounded-xl p-5 space-y-4 bg-[#0c0c0c]">
            <h2 className="text-[11px] font-bold text-[#555] uppercase tracking-widest">Profile Info</h2>

            <div>
              <label className="block text-xs font-semibold text-[#888] mb-1.5">Full name *</label>
              <input name="name" value={form.name} onChange={onChange} required
                className="al-input" placeholder="Your name" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#888] mb-1.5">
                Bio / Description
                {user?.role === 'investor' && <span className="text-[#00c853] ml-1">(shown on Investors page)</span>}
              </label>
              <textarea name="bio" value={form.bio} onChange={onChange} rows={4}
                className="al-input resize-none"
                placeholder={user?.role === 'investor'
                  ? 'Describe your investment focus, portfolio, and what you look for in startups...'
                  : 'Tell investors about yourself and your startup journey...'} />
              <p className="text-[10px] text-[#444] mt-1">{form.bio.length}/500 characters</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1.5">Location</label>
                <input name="location" value={form.location} onChange={onChange}
                  className="al-input" placeholder="Mumbai, India" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1.5">Avatar URL</label>
                <input name="avatar" value={form.avatar} onChange={onChange}
                  className="al-input" placeholder="https://..." />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1.5">Website</label>
                <input name="website" value={form.website} onChange={onChange}
                  className="al-input" placeholder="https://yoursite.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1.5">LinkedIn</label>
                <input name="linkedin" value={form.linkedin} onChange={onChange}
                  className="al-input" placeholder="https://linkedin.com/in/..." />
              </div>
            </div>
          </div>

          {user?.role === 'investor' && (
            <div className="border border-[#2a2a2a] rounded-xl p-5 space-y-4 bg-[#0c0c0c] mt-5">
              <h2 className="text-[11px] font-bold text-[#555] uppercase tracking-widest">Matchmaking Preferences</h2>
              <p className="text-[11px] text-[#555] -mt-2">Tailor your matchmaking score by indicating your focus sectors, stages, and locations.</p>
              
              {/* Preferred Sectors */}
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-2">Focus Sectors</label>
                <div className="flex flex-wrap gap-2">
                  {['FinTech', 'HealthTech', 'EdTech', 'SaaS', 'E-Commerce', 'AI/ML', 'GreenTech', 'Logistics', 'Social', 'Other'].map((sec) => {
                    const active = form.investorPreferences?.sectors?.includes(sec);
                    return (
                      <button key={sec} type="button" onClick={() => handleTogglePreference('sectors', sec)}
                        className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-[#00c853]/10 border-[#00c853]/40 text-[#00c853]'
                            : 'border-[#2a2a2a] text-[#555] hover:text-white hover:border-[#444]'
                        }`}>
                        {sec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preferred Stages */}
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-2">Target Stages</label>
                <div className="flex flex-wrap gap-2">
                  {['Idea', 'MVP', 'Early Traction', 'Growth', 'Scaling'].map((stg) => {
                    const active = form.investorPreferences?.stages?.includes(stg);
                    return (
                      <button key={stg} type="button" onClick={() => handleTogglePreference('stages', stg)}
                        className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-[#00c853]/10 border-[#00c853]/40 text-[#00c853]'
                            : 'border-[#2a2a2a] text-[#555] hover:text-white hover:border-[#444]'
                        }`}>
                        {stg}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Locations */}
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1.5">Target Locations (comma-separated)</label>
                <input
                  value={form.investorPreferences?.locations?.join(', ') || ''}
                  onChange={handleLocationsChange}
                  className="al-input"
                  placeholder="e.g. Mumbai, Bangalore, San Francisco"
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-al w-full py-2.5 mt-5">
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full spin" />
                Saving...
              </span>
            ) : 'Save Profile'}
          </button>
        </form>

        {/* ── Password Form ─────────────────────────── */}
        <form onSubmit={handleSavePw} className="space-y-4">
          <div className="border border-[#2a2a2a] rounded-xl p-5 space-y-4 bg-[#0c0c0c]">
            <h2 className="text-[11px] font-bold text-[#555] uppercase tracking-widest">Change Password</h2>

            <div>
              <label className="block text-xs font-semibold text-[#888] mb-1.5">Current password</label>
              <input name="currentPassword" type="password" value={pwForm.currentPassword} onChange={onPwChange}
                required className="al-input" placeholder="••••••••" autoComplete="current-password" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1.5">New password</label>
                <input name="newPassword" type="password" value={pwForm.newPassword} onChange={onPwChange}
                  required className="al-input" placeholder="Min. 6 chars" autoComplete="new-password" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1.5">Confirm password</label>
                <input name="confirm" type="password" value={pwForm.confirm} onChange={onPwChange}
                  required className="al-input" placeholder="Repeat password" autoComplete="new-password" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={savingPw} className="btn-ghost w-full py-2.5">
            {savingPw ? 'Updating...' : 'Update Password'}
          </button>
        </form>

      </motion.div>
    </div>
  );
}
