import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { FiUser, FiMail, FiLock, FiTrash2, FiEdit3, FiCheck, FiX } from 'react-icons/fi';
import { SiLastdotfm } from 'react-icons/si';
import { PasswordInput } from '../components/ui';
import { StorageInfo } from '../components/common';
import { DeleteAllTracksModal } from '../components/tracks';
import { useMusicData, useMusicDeletion } from '../hooks';
import { useLastFmStore } from '../store/lastfmStore';
import { getSession, buildAuthUrl } from '../services/lastfmApi';

const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY ?? '';
const LASTFM_SHARED_SECRET = import.meta.env.VITE_LASTFM_SHARED_SECRET ?? '';

const Profile = () => {
  const { user, changePassword } = useAuth();
  const { tracks } = useMusicData();
  const { handleAllTracksDeleted } = useMusicDeletion();
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const { sessionKey, username: lfmUsername, scrobblingEnabled, nowPlayingEnabled, scrobbleThreshold,
          setSession, clearSession, setScrobblingEnabled, setNowPlayingEnabled, setScrobbleThreshold } = useLastFmStore();
  const [lastfmLoading, setLastfmLoading] = useState(false);
  const [lastfmError, setLastfmError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;
    if (!LASTFM_API_KEY || !LASTFM_SHARED_SECRET) {
      setLastfmError('Last.fm API key not configured.');
      return;
    }
    setLastfmLoading(true);
    setLastfmError(null);
    getSession(token, LASTFM_API_KEY, LASTFM_SHARED_SECRET)
      .then(session => {
        setSession(session.key, session.name);
        setSearchParams(prev => { prev.delete('token'); return prev; }, { replace: true });
      })
      .catch(err => setLastfmError(`Could not connect to Last.fm: ${err.message}`))
      .finally(() => setLastfmLoading(false));
  }, []);

  const handleLastFmConnect = () => {
    const callbackUrl = `${window.location.origin}/profile`;
    window.location.href = buildAuthUrl(LASTFM_API_KEY, callbackUrl);
  };

  if (!user) return null;

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm(p => ({ ...p, [e.target.name]: e.target.value }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const validatePasswordForm = () => {
    if (!passwordForm.currentPassword) return 'Current password is required';
    if (!passwordForm.newPassword) return 'New password is required';
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return 'Passwords do not match';
    if (passwordForm.newPassword.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(passwordForm.newPassword)) return 'Must contain an uppercase letter';
    if (!/[a-z]/.test(passwordForm.newPassword)) return 'Must contain a lowercase letter';
    if (!/[0-9]/.test(passwordForm.newPassword)) return 'Must contain a number';
    return null;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePasswordForm();
    if (err) { setError(err); return; }
    setIsLoading(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setSuccess('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsEditingPassword(false);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllSuccess = (deletedCount: number) => {
    handleAllTracksDeleted();
    setSuccess(`${deletedCount} track${deletedCount !== 1 ? 's' : ''} deleted.`);
    setShowDeleteAllModal(false);
  };

  const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--bg-overlay)', borderRadius: 10, border: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '32px 32px 0', maxWidth: 640 }} className="fade-in">
      <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 32 }}>Profile</h1>

      {success && <div style={{ background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#30d158', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><FiCheck size={14} />{success}</div>}

      {/* Account info */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-dim)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FiUser size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{user.username}</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{tracks.length} tracks in library</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <InfoRow icon={<FiUser size={15} />} label="Username" value={user.username} />
          <InfoRow icon={<FiMail size={15} />} label="Email" value={user.email} />
        </div>
      </div>

      {/* Storage */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Storage</h2>
        <StorageInfo />
      </div>

      {/* Password */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isEditingPassword ? 20 : 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Security</h2>
          {!isEditingPassword && (
            <button className="sz-btn sz-btn-ghost sz-btn-sm" onClick={() => setIsEditingPassword(true)}>
              <FiEdit3 size={13} /> Change password
            </button>
          )}
        </div>

        {!isEditingPassword && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-overlay)', borderRadius: 10, border: '1px solid var(--border)', marginTop: 16 }}>
            <FiLock size={15} style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Password is secure and encrypted</span>
          </div>
        )}

        {isEditingPassword && (
          <form onSubmit={handlePasswordSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Current password</label>
                <PasswordInput name="currentPassword" value={passwordForm.currentPassword} onChange={handlePasswordChange} disabled={isLoading} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>New password</label>
                <PasswordInput name="newPassword" placeholder="Min 8 chars, upper, lower, number" value={passwordForm.newPassword} onChange={handlePasswordChange} disabled={isLoading} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Confirm new password</label>
                <PasswordInput name="confirmPassword" value={passwordForm.confirmPassword} onChange={handlePasswordChange} disabled={isLoading} required />
              </div>
            </div>
            {error && <div style={{ background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff453a', marginTop: 14 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button type="submit" className="sz-btn sz-btn-primary" disabled={isLoading}><FiCheck size={13} />{isLoading ? 'Saving…' : 'Save'}</button>
              <button type="button" className="sz-btn sz-btn-ghost" onClick={() => { setIsEditingPassword(false); setError(null); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}><FiX size={13} /> Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* Last.fm */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <SiLastdotfm size={18} style={{ color: '#d51007' }} />
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Last.fm</h2>
        </div>

        {lastfmError && (
          <div style={{ background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff453a', marginBottom: 16 }}>
            {lastfmError}
          </div>
        )}

        {!sessionKey ? (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>
              Connect your Last.fm account to scrobble tracks and update Now Playing.
            </p>
            <button
              className="sz-btn sz-btn-primary"
              onClick={handleLastFmConnect}
              disabled={lastfmLoading || !LASTFM_API_KEY}
            >
              <SiLastdotfm size={13} />
              {lastfmLoading ? 'Connecting…' : 'Connect Last.fm'}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--bg-overlay)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 16 }}>
              <SiLastdotfm size={15} style={{ color: '#d51007', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Connected as</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{lfmUsername}</div>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 16px', background: 'var(--bg-overlay)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Scrobbling</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Record tracks to your Last.fm history</div>
              </div>
              <input type="checkbox" checked={scrobblingEnabled} onChange={e => setScrobblingEnabled(e.target.checked)} />
            </label>

            {scrobblingEnabled && (
              <div style={{ padding: '12px 16px', background: 'var(--bg-overlay)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Scrobble at</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{Math.round(scrobbleThreshold * 100)}%</div>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={Math.round(scrobbleThreshold * 100)}
                  onChange={e => setScrobbleThreshold(parseInt(e.target.value) / 100)}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  <span>50% (minimum)</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 16px', background: 'var(--bg-overlay)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Now Playing</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Show what you are listening to in real time</div>
              </div>
              <input type="checkbox" checked={nowPlayingEnabled} onChange={e => setNowPlayingEnabled(e.target.checked)} />
            </label>

            <button className="sz-btn sz-btn-ghost sz-btn-sm" onClick={clearSession} style={{ color: 'var(--text-tertiary)' }}>
              <FiX size={13} /> Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Danger zone */}
      {tracks.length > 0 && (
        <div style={{ background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: 16, padding: '24px', marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#ff453a', marginBottom: 6 }}>Danger zone</h2>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>Irreversible actions that permanently affect your data.</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Delete all music</div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>Permanently delete all {tracks.length} tracks from your library</div>
            </div>
            <button className="sz-btn sz-btn-sm" onClick={() => setShowDeleteAllModal(true)} style={{ background: 'rgba(255,69,58,0.15)', color: '#ff453a', border: '1px solid rgba(255,69,58,0.3)', flexShrink: 0, whiteSpace: 'nowrap' }}>
              <FiTrash2 size={13} /> Delete all
            </button>
          </div>
        </div>
      )}

      <DeleteAllTracksModal isOpen={showDeleteAllModal} onClose={() => setShowDeleteAllModal(false)} trackCount={tracks.length} onSuccess={handleDeleteAllSuccess} />
    </div>
  );
};

export default Profile;
