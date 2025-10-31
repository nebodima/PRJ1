import { useState } from 'react';
import { Upload, X, File, Download } from 'lucide-react';

export default function FileUpload({ taskId, attachments = [], onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        onUpdate();
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка загрузки файла');
      }
    } catch (error) {
      alert('Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId, filename) => {
    if (!confirm('Удалить файл?')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments/${attachmentId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        onUpdate();
      }
    } catch (error) {
      alert('Ошибка удаления файла');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragActive ? 'border-[#C48B64] bg-[#C48B64]/10' : 'border-[#404040] hover:border-[#C48B64]/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id={`file-upload-${taskId}`}
          className="hidden"
          onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
          disabled={uploading}
        />
        <label
          htmlFor={`file-upload-${taskId}`}
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <Upload className={`w-8 h-8 ${uploading ? 'text-[#666]' : 'text-[#C48B64]'}`} />
          <div>
            <p className="text-sm text-[#E8E8E8]">
              {uploading ? 'Загрузка...' : 'Нажмите или перетащите файл'}
            </p>
            <p className="text-xs text-[#999] mt-1">Максимум 10MB</p>
          </div>
        </label>
      </div>

      {/* Attachments List */}
      {attachments && attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-[#2F2F2F] rounded-lg hover:bg-[#353535] transition-colors"
            >
              <File className="w-5 h-5 text-[#C48B64] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#E8E8E8] truncate">{file.originalName}</p>
                <p className="text-xs text-[#999]">{formatFileSize(file.size)}</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/api/uploads/${file.filename}`}
                  download={file.originalName}
                  className="p-1.5 hover:bg-[#404040] rounded transition-colors"
                  title="Скачать"
                >
                  <Download className="w-4 h-4 text-[#C48B64]" />
                </a>
                <button
                  onClick={() => handleDelete(file.id, file.filename)}
                  className="p-1.5 hover:bg-[#404040] rounded transition-colors"
                  title="Удалить"
                >
                  <X className="w-4 h-4 text-[#999] hover:text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
