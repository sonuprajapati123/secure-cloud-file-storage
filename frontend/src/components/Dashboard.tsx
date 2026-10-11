import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { logout, getToken } from '../auth';
import { config } from '../config';
import { 
  Cloud, 
  LogOut, 
  UploadCloud, 
  Search, 
  Trash2, 
  Download, 
  File,
  Image as ImageIcon,
  FileText,
  Loader2,
  Moon,
  Sun
} from 'lucide-react';

interface FileData {
  fileId: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  downloadUrl: string;
}

export const Dashboard: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        navigate('/login');
        return;
      }
      
      const response = await axios.get(`${config.apiUrl}/files`, {
        headers: { Authorization: token }
      });
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const validateFile = (file: File) => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      alert(`File ${file.name} is too large. Maximum size is 10MB.`);
      return false;
    }
    return true;
  };

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return;
    
    try {
      setUploading(true);
      setUploadProgress(0);
      const token = await getToken();
      
      // 1. Get presigned URL from backend
      const res = await axios.post(`${config.apiUrl}/files/upload-url`, {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size
      }, {
        headers: { Authorization: token }
      });
      
      const { uploadUrl } = res.data;
      
      // 2. Upload directly to S3
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });
      
      // 3. Refresh file list
      await fetchFiles();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('File upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    
    try {
      const token = await getToken();
      await axios.delete(`${config.apiUrl}/files/${fileId}`, {
        headers: { Authorization: token }
      });
      setFiles(files.filter(f => f.fileId !== fileId));
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file.');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="file-icon" />;
    if (type.includes('pdf') || type.includes('text/')) return <FileText className="file-icon" />;
    return <File className="file-icon" />;
  };

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-brand">
          <Cloud className="icon" /> CloudDrive
        </div>
        <div className="navbar-actions">
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <main className="main-content">
        <div className="dashboard-header">
          <h2>My Files</h2>
          <div className="search-bar">
            <Search className="search-icon" />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search files..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div 
          className={`upload-area ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={onFileSelect} 
          />
          <UploadCloud className="upload-icon" />
          <div className="upload-text">Click to upload or drag and drop</div>
          <div className="upload-subtext">Max file size: 10MB</div>
        </div>

        {uploading && (
          <div className="progress-container mb-6">
            <div className="progress-info">
              <div className="progress-header">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="full-page-loader" style={{ height: '300px' }}>
            <Loader2 className="spinner spinner-primary" size={40} />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="empty-state">
            <File className="empty-state-icon" />
            <h3>No files found</h3>
            <p>Upload some files to get started, or adjust your search filters.</p>
          </div>
        ) : (
          <div className="file-grid">
            {filteredFiles.map((file) => (
              <div key={file.fileId} className="file-card">
                <div className="file-preview">
                  {file.type.startsWith('image/') ? (
                    <img src={file.downloadUrl} alt={file.name} loading="lazy" />
                  ) : (
                    getFileIcon(file.type)
                  )}
                </div>
                <div className="file-info">
                  <div className="file-name" title={file.name}>{file.name}</div>
                  <div className="file-meta">
                    <span>{formatSize(file.size)}</span>
                    <span>{formatDate(file.uploadDate)}</span>
                  </div>
                  <div className="file-actions">
                    <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      <Download size={14} /> Download
                    </a>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteFile(file.fileId)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
