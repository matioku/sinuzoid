import React, { useState } from 'react';
import { FiUpload, FiCheck, FiInfo } from 'react-icons/fi';
import FileUpload from '../components/common/FileUpload';
import StorageInfo from '../components/common/StorageInfo';

const Upload: React.FC = () => {
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [refreshStorage, setRefreshStorage] = useState(0);

  const handleUploadComplete = (files: File[]) => {
    const n = files.length;
    setUploadSuccess(n === 1 ? `"${files[0].name}" uploaded successfully!` : `${n} files uploaded successfully!`);
    setTimeout(() => setRefreshStorage(p => p + 1), 1000);
    setTimeout(() => setUploadSuccess(null), 5000);
  };

  return (
    <div style={{ padding: '32px 32px 0', maxWidth: 800 }} className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
          <FiUpload size={28} style={{ color: 'var(--accent)' }} />
          Upload music
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
          Supported formats: MP3, WAV, FLAC, M4A, AAC · Max 100 MB per file · Folder upload supported
        </p>
      </div>

      {uploadSuccess && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 14, color: '#30d158' }}>
          <FiCheck size={15} /> {uploadSuccess}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <FileUpload
          onUploadComplete={handleUploadComplete}
          maxFileSize={100}
          acceptedTypes={['.mp3', '.wav', '.flac', '.m4a', '.aac']}
          multiple={true}
          allowDirectories={true}
        />
      </div>

      {/* Tip box */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 14 }}>
        <FiInfo size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Tips:</strong> Drag and drop files or entire folders.
          Tags (ID3/Vorbis) are read automatically — title, artist, album, year, and cover art are extracted.
          FLAC files preserve lossless quality throughout.
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Storage</h2>
        <StorageInfo refreshTrigger={refreshStorage} showHeader={false} autoRefresh={false} />
      </div>
    </div>
  );
};

export default Upload;
