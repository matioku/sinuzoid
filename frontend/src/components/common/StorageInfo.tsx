import { useState, useEffect } from 'react';
import { FiHardDrive, FiRefreshCw } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface StorageData {
  quota: number;
  used: number;
  available: number;
  usage_percentage: number;
  quota_formatted: string;
  used_formatted: string;
  available_formatted: string;
}

interface StorageInfoProps {
  className?: string;
  showHeader?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  refreshTrigger?: number;
}

const StorageInfo = ({ 
  className = '', 
  showHeader = true,
  autoRefresh = false,
  refreshInterval = 30000,
  refreshTrigger
}: StorageInfoProps) => {
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStorageInfo = async () => {
    try {
      setError(null);
      const accessToken = sessionStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/files/storage/info`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Failed to load storage info');
      setStorageData(await response.json());
    } catch (err: any) {
      setError(err.message || 'Failed to load storage info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => { setIsLoading(true); fetchStorageInfo(); };

  useEffect(() => { fetchStorageInfo(); }, []);

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      setIsLoading(true);
      const timer = setTimeout(fetchStorageInfo, 500);
      return () => clearTimeout(timer);
    }
  }, [refreshTrigger]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchStorageInfo, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getBarColor = (pct: number) =>
    pct >= 90 ? '#ff453a' : pct >= 75 ? '#ff9f0a' : pct >= 50 ? '#ffd60a' : 'var(--accent)';

  if (isLoading) {
    return (
      <div className={className} style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading storage info…</span>
      </div>
    );
  }

  if (error || !storageData) {
    return (
      <div className={className} style={{ padding: 16, background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ color: '#ff453a', fontSize: 13 }}>{error || 'No storage data available'}</span>
        <button onClick={handleRefresh} className="sz-btn sz-btn-ghost sz-btn-sm">
          <FiRefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  const pct = storageData.usage_percentage;

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {showHeader && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15 }}>
            <FiHardDrive size={16} style={{ color: 'var(--accent)' }} />
            Storage
          </span>
          <button onClick={handleRefresh} className="sz-btn sz-btn-ghost sz-btn-sm" style={{ padding: '4px 8px' }}>
            <FiRefreshCw size={12} />
          </button>
        </div>
      )}

      {/* Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>Usage</span>
          <span style={{ color: getBarColor(pct), fontWeight: 600, fontFamily: 'Space Grotesk, monospace' }}>{pct.toFixed(1)}%</span>
        </div>
        <div style={{ width: '100%', height: 6, background: 'var(--bg-overlay)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: getBarColor(pct), borderRadius: 3, transition: 'width 0.6s ease' }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Used', value: storageData.used_formatted },
          { label: 'Available', value: storageData.available_formatted },
          { label: 'Quota', value: storageData.quota_formatted },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Space Grotesk, monospace' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {pct >= 90 && (
        <div style={{ background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ff453a' }}>
          ⚠️ Storage almost full — delete files to free space.
        </div>
      )}
      {pct >= 75 && pct < 90 && (
        <div style={{ background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ff9f0a' }}>
          Storage is above 75% capacity.
        </div>
      )}
    </div>
  );
};

export default StorageInfo;
