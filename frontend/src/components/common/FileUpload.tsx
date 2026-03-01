import { useState, useRef, useEffect } from 'react';
import { FiUploadCloud, FiX, FiMusic, FiAlertCircle, FiFolder, FiFile } from 'react-icons/fi';


interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface FileUploadProps {
  onUploadComplete?: (files: File[]) => void;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  multiple?: boolean;
  allowDirectories?: boolean;
  className?: string;
}

const FileUpload = ({
  onUploadComplete,
  maxFileSize = 100, // 100 MB default
  acceptedTypes = ['.mp3', '.wav', '.flac', '.m4a', '.aac'],
  multiple = true,
  allowDirectories = false,
  className = ''
}: FileUploadProps) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [directoryMode, setDirectoryMode] = useState(allowDirectories);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `Le fichier dépasse la taille maximale de ${maxFileSize} MB`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `Type de fichier non supporté. Types acceptés: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const handleFiles = (files: FileList) => {
    const validFiles: UploadFile[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push({
          id: generateId(),
          file,
          progress: 0,
          status: 'pending'
        });
      }
    });

    if (errors.length > 0) {
      // Show errors to user
      console.error('File validation errors:', errors);
    }

    if (validFiles.length > 0) {
      setUploadFiles(prev => [...prev, ...validFiles]);
    }
  };

  // Auto-upload files when they are added
  useEffect(() => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length > 0 && !isUploading) {
      // Auto-upload with a small delay to allow UI to update
      const timer = setTimeout(() => {
        handleUploadAll();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [uploadFiles, isUploading]);

  const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    const formData = new FormData();
    formData.append('file', uploadFile.file);

    try {
      setUploadFiles(prev => 
        prev.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading' } : f)
      );

      const accessToken = sessionStorage.getItem('access_token');
      
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            setUploadFiles(prev => 
              prev.map(f => f.id === uploadFile.id ? { ...f, progress } : f)
            );
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200 || xhr.status === 201) {
            setUploadFiles(prev => 
              prev.map(f => f.id === uploadFile.id ? { ...f, status: 'success', progress: 100 } : f)
            );
            
            // Call onUploadComplete immediately for this file
            if (onUploadComplete) {
              onUploadComplete([uploadFile.file]);
            }
            
            resolve();
          } else {
            let errorMessage = 'Erreur lors de l\'upload';
            try {
              const response = JSON.parse(xhr.responseText);
              errorMessage = response.detail || response.message || errorMessage;
            } catch (e) {
              // If response is not JSON, use status text
              errorMessage = xhr.statusText || errorMessage;
            }
            setUploadFiles(prev => 
              prev.map(f => f.id === uploadFile.id ? { ...f, status: 'error', error: errorMessage } : f)
            );
            reject(new Error(errorMessage));
          }
        });

        xhr.addEventListener('error', () => {
          const error = 'Erreur réseau lors de l\'upload';
          setUploadFiles(prev => 
            prev.map(f => f.id === uploadFile.id ? { ...f, status: 'error', error } : f)
          );
          reject(new Error(error));
        });

        xhr.open('POST', 'http://localhost:8000/files/upload/audio');
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.send(formData);
      });
    } catch (error: any) {
      setUploadFiles(prev => 
        prev.map(f => f.id === uploadFile.id ? { 
          ...f, 
          status: 'error', 
          error: error.message || 'Erreur lors de l\'upload' 
        } : f)
      );
      throw error;
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of pendingFiles) {
        await uploadFile(file);
      }

      const successfulFiles = uploadFiles
        .filter(f => f.status === 'success')
        .map(f => f.file);

      if (onUploadComplete && successfulFiles.length > 0) {
        onUploadComplete(successfulFiles);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearCompleted = () => {
    setUploadFiles(prev => prev.filter(f => f.status !== 'success'));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#30d158', flexShrink: 0 }} />;
      case 'error':
        return <FiAlertCircle size={14} style={{ color: '#ff453a', flexShrink: 0 }} />;
      case 'uploading':
        return <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />;
      default:
        return <FiMusic size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />;
    }
  };

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Mode Toggle */}
      {allowDirectories && (
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
          <button
            onClick={() => setDirectoryMode(false)}
            className={!directoryMode ? 'sz-btn sz-btn-primary sz-btn-sm' : 'sz-btn sz-btn-ghost sz-btn-sm'}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <FiFile size={13} /> Files
          </button>
          <button
            onClick={() => setDirectoryMode(true)}
            className={directoryMode ? 'sz-btn sz-btn-primary sz-btn-sm' : 'sz-btn sz-btn-ghost sz-btn-sm'}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <FiFolder size={13} /> Folders
          </button>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${isDragOver ? 'var(--accent)' : 'var(--border-light)'}`,
          borderRadius: 16,
          padding: '48px 32px',
          textAlign: 'center',
          background: isDragOver ? 'var(--accent-dim)' : 'var(--bg-elevated)',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <FiUploadCloud size={40} style={{ color: isDragOver ? 'var(--accent)' : 'var(--text-tertiary)', margin: '0 auto 16px', display: 'block', transition: 'color 0.2s' }} />
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          {directoryMode ? 'Drop folders or audio files here' : 'Drop audio files here'}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>
          {directoryMode ? 'or click to select folders or files' : 'or click to select files'}
        </p>
        <button
          onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
          className="sz-btn sz-btn-primary"
          style={{ pointerEvents: 'none' }}
        >
          {directoryMode ? 'Select folders' : 'Select files'}
        </button>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 16 }}>
          {acceptedTypes.join(', ')} · Max {maxFileSize} MB per file
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          {...(directoryMode ? { webkitdirectory: '' } : {})}
        />
      </div>

      {/* File List */}
      {uploadFiles.length > 0 && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={clearCompleted}
                className="sz-btn sz-btn-ghost sz-btn-sm"
                disabled={!uploadFiles.some(f => f.status === 'success')}
              >
                Clear done
              </button>
              <button
                onClick={handleUploadAll}
                className="sz-btn sz-btn-primary sz-btn-sm"
                disabled={isUploading || !uploadFiles.some(f => f.status === 'pending')}
              >
                {isUploading ? 'Uploading…' : 'Upload all'}
              </button>
            </div>
          </div>

          <div>
            {uploadFiles.map((uploadFile, i) => (
              <div
                key={uploadFile.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  borderBottom: i < uploadFiles.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {getStatusIcon(uploadFile.status)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {uploadFile.file.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0, fontFamily: 'Space Grotesk, monospace' }}>
                      {formatFileSize(uploadFile.file.size)}
                    </span>
                  </div>
                  {uploadFile.status === 'uploading' && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ width: '100%', height: 3, background: 'var(--bg-overlay)', borderRadius: 2 }}>
                        <div style={{ width: `${uploadFile.progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3, display: 'block' }}>{Math.round(uploadFile.progress)}%</span>
                    </div>
                  )}
                  {uploadFile.status === 'error' && uploadFile.error && (
                    <span style={{ fontSize: 11, color: '#ff453a', marginTop: 2, display: 'block' }}>{uploadFile.error}</span>
                  )}
                </div>
                <button
                  onClick={() => removeFile(uploadFile.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, flexShrink: 0 }}
                  disabled={uploadFile.status === 'uploading'}
                >
                  <FiX size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
