import React, { useState, useRef } from 'react';
import { Upload, X, File, Image, Video, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { uploadFileToR2, saveFileMetadata, validateFile, getFileCategory, formatFileSize } from '../lib/cloudflare';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onUploadComplete?: (fileData: any) => void;
  onUploadStart?: () => void;
  accept?: string;
  maxFiles?: number;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  url?: string;
  thumbnailUrl?: string;
  id?: string;
  moderationStatus?: 'pending' | 'approved' | 'rejected' | 'not_analyzed';
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onUploadStart,
  accept = "image/*,video/*,.pdf,.txt",
  maxFiles = 10,
  className = ""
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    
    // Validate file count
    if (uploadingFiles.length + fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    for (const file of fileArray) {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        toast.error(`${file.name}: ${validation.error}`);
      }
    }

    if (validFiles.length === 0) {
      return;
    }

    // Add files to uploading state
    const newUploadingFiles: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);
    
    if (onUploadStart) {
      onUploadStart();
    }

    // Start uploading each file
    validFiles.forEach((file, index) => {
      uploadFile(file, uploadingFiles.length + index);
    });
  };

  const uploadFile = async (file: File, fileIndex: number) => {
    try {
      // Upload to storage
      const uploadResult = await uploadFileToR2(
        file,
        'current-user-id',
        (progress) => {
          setUploadingFiles(prev => 
            prev.map((item, idx) => 
              idx === fileIndex 
                ? { ...item, progress }
                : item
            )
          );
        }
      );

      // Save metadata to database
      const fileId = await saveFileMetadata({
        filename: uploadResult.filename,
        originalName: file.name,
        size: uploadResult.size,
        mimeType: file.type,
        cloudflareUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
      });

      // Update file status
      setUploadingFiles(prev => 
        prev.map((item, idx) => 
          idx === fileIndex 
            ? { 
                ...item, 
                status: 'completed' as const,
                progress: 100,
                url: uploadResult.url,
                thumbnailUrl: uploadResult.thumbnailUrl,
                id: fileId,
                moderationStatus: 'pending' // Set initial moderation status to pending
              }
            : item
        )
      );

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete({
          id: fileId,
          filename: file.name,
          url: uploadResult.url,
          thumbnailUrl: uploadResult.thumbnailUrl,
          size: file.size,
          mimeType: file.type,
          category: getFileCategory(file.type),
          moderationStatus: 'pending'
        });
      }

      toast.success(`${file.name} uploaded successfully! Moderation in progress...`);

    } catch (error: any) {
      setUploadingFiles(prev => 
        prev.map((item, idx) => 
          idx === fileIndex 
            ? { 
                ...item, 
                status: 'error' as const,
                error: error.message || 'Upload failed'
              }
            : item
        )
      );

      toast.error(`Failed to upload ${file.name}: ${error.message}`);
    }
  };

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const getFileIcon = (mimeType: string) => {
    const category = getFileCategory(mimeType);
    switch (category) {
      case 'image':
        return <Image className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: UploadingFile['status'], moderationStatus?: UploadingFile['moderationStatus']) => {
    if (status === 'error') {
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
    
    if (status === 'completed') {
      if (moderationStatus === 'approved') {
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      } else if (moderationStatus === 'rejected') {
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      } else if (moderationStatus === 'pending') {
        return <div className="w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />;
      } else {
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      }
    }
    
    return <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
  };

  const getFilePreview = (uploadingFile: UploadingFile) => {
    const category = getFileCategory(uploadingFile.file.type);
    const imageUrl = uploadingFile.thumbnailUrl || (uploadingFile.url && uploadingFile.url.startsWith('data:') ? uploadingFile.url : null);
    
    if (category === 'image' && imageUrl) {
      return (
        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
          <img 
            src={imageUrl} 
            alt={uploadingFile.file.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
          <div className="hidden w-full h-full flex items-center justify-center bg-gray-100">
            <Image className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      );
    } else if (category === 'video' && imageUrl) {
      return (
        <div className="w-16 h-16 bg-gray-900 rounded-lg overflow-hidden relative">
          <img 
            src={imageUrl} 
            alt={uploadingFile.file.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <Video className="w-6 h-6 text-white" />
          </div>
        </div>
      );
    }
    
    return (
      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
        {getFileIcon(uploadingFile.file.type)}
      </div>
    );
  };

  const getModerationStatusText = (file: UploadingFile) => {
    if (file.status !== 'completed') return null;
    
    switch (file.moderationStatus) {
      case 'approved':
        return <span className="text-xs text-green-600">Moderation: Approved</span>;
      case 'rejected':
        return <span className="text-xs text-red-600">Moderation: Rejected</span>;
      case 'pending':
        return <span className="text-xs text-yellow-600">Moderation: In progress...</span>;
      default:
        return <span className="text-xs text-gray-600">Moderation: Waiting...</span>;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-purple-400 bg-purple-50'
            : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
        }`}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors ${
          isDragOver ? 'text-purple-600' : 'text-gray-400'
        }`} />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Drop files here or click to browse
        </h3>
        <p className="text-gray-500 mb-4">
          Upload images, videos, or documents (max 50MB each)
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
          <span>JPG, PNG, GIF</span>
          <span>•</span>
          <span>MP4, MOV, AVI</span>
          <span>•</span>
          <span>PDF, TXT</span>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Uploading Files List */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Upload Progress</h4>
          {uploadingFiles.map((uploadingFile, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {/* File Preview */}
                  {getFilePreview(uploadingFile)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {uploadingFile.file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(uploadingFile.file.size)}
                    </p>
                    {getModerationStatusText(uploadingFile)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(uploadingFile.status, uploadingFile.moderationStatus)}
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {uploadingFile.status === 'uploading' && (
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Uploading...</span>
                    <span className="text-gray-600">{Math.round(uploadingFile.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadingFile.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {uploadingFile.status === 'error' && uploadingFile.error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
                  <strong>Error:</strong> {uploadingFile.error}
                </div>
              )}

              {/* Success Message */}
              {uploadingFile.status === 'completed' && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded border border-green-200">
                  Upload completed successfully! {uploadingFile.moderationStatus === 'pending' ? 'Moderation in progress...' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};