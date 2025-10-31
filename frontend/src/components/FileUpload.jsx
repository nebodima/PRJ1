import { useState } from 'react';
import { Upload, X, File, Download } from 'lucide-react';

export default function FileUpload({ taskId, attachments = [], onUpdate, localFiles = [], onLocalFilesChange }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Загрузка файлов (множественная)
  const handleFilesUpload = async (files) => {
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);

    // Если задача еще не создана - сохраняем локально
    if (!taskId) {
      const newLocalFiles = filesArray.map(file => ({
        id: Date.now() + '-' + Math.random(),
        file: file,
        originalName: file.name,
        size: file.size,
        isLocal: true
      }));
      onLocalFilesChange([...localFiles, ...newLocalFiles]);
      return;
    }

    // Если задача создана - загружаем на сервер
    setUploading(true);

    for (const file of filesArray) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          const error = await res.json();
          alert(`Ошибка загрузки ${file.name}: ${error.error || 'Неизвестная ошибка'}`);
        }
      } catch (error) {
        alert(`Ошибка загрузки ${file.name}`);
      }
    }

    setUploading(false);
    onUpdate();
  };

  const handleDelete = async (attachmentId, isLocal = false) => {
    if (!confirm('Удалить файл?')) return;

    // Удаление локального файла
    if (isLocal) {
      const updated = localFiles.filter(f => f.id !== attachmentId);
      onLocalFilesChange(updated);
      return;
    }

    // Удаление файла с сервера
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments/${attachmentId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        onUpdate();
      } else {
        alert('Ошибка удаления файла');
      }
    } catch (error) {
      alert('Ошибка удаления файла');
      console.error('Delete error:', error);
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isImage = (filename) => {
    const ext = filename.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  };

  const handleFileClick = (file) => {
    if (!file.isLocal && isImage(file.originalName)) {
      setPreviewImage({
        url: `/api/uploads/${file.filename}`,
        name: file.originalName
      });
    }
  };

  const allFiles = [...localFiles, ...attachments];
  const uploadId = taskId || 'new';

  return (
    <div className="space-y-2">
      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
          dragActive ? 'border-[#C48B64] bg-[#C48B64]/10' : 'border-[#404040] hover:border-[#C48B64]/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id={`file-upload-${uploadId}`}
          className="hidden"
          multiple
          onChange={(e) => e.target.files.length > 0 && handleFilesUpload(e.target.files)}
          disabled={uploading}
        />
        <label
          htmlFor={`file-upload-${uploadId}`}
          className="cursor-pointer flex flex-col items-center gap-1.5"
        >
          <Upload className={`w-6 h-6 ${uploading ? 'text-[#666]' : 'text-[#C48B64]'}`} />
          <div>
            <p className="text-xs text-[#E8E8E8]">
              {uploading ? 'Загрузка...' : 'Нажмите или перетащите файлы'}
            </p>
            <p className="text-[10px] text-[#999] mt-0.5">Максимум 10MB на файл</p>
          </div>
        </label>
      </div>

      {/* Attachments List */}
      {allFiles.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {allFiles.map((file) => {
            const isImg = isImage(file.originalName);
            const imageUrl = file.isLocal 
              ? URL.createObjectURL(file.file)
              : `/api/uploads/${file.filename}`;
            
            return (
              <div
                key={file.id}
                className="flex items-center gap-2 p-2 bg-[#2F2F2F] rounded-lg hover:bg-[#353535] transition-colors"
              >
                {/* Превью или иконка */}
                {isImg && !file.isLocal ? (
                  <div 
                    className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-[#1F1F1F] cursor-pointer"
                    onClick={() => handleFileClick(file)}
                  >
                    <img 
                      src={imageUrl} 
                      alt={file.originalName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : isImg && file.isLocal ? (
                  <div 
                    className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-[#1F1F1F] relative"
                  >
                    <img 
                      src={imageUrl} 
                      alt={file.originalName}
                      className="w-full h-full object-cover opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Upload className="w-4 h-4 text-[#C48B64]" />
                    </div>
                  </div>
                ) : (
                  <File className="w-4 h-4 text-[#C48B64] flex-shrink-0" />
                )}
                
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleFileClick(file)}
                >
                  <p className={`text-xs text-[#E8E8E8] truncate ${!file.isLocal && isImg ? 'hover:underline' : ''}`}>
                    {file.originalName}
                  </p>
                  <p className="text-[10px] text-[#999]">
                    {formatFileSize(file.size)}
                    {file.isLocal && <span className="ml-1 text-[#C48B64]">• Будет загружен</span>}
                  </p>
                </div>
              <div className="flex gap-1">
                {!file.isLocal && (
                  <a
                    href={`/api/uploads/${file.filename}`}
                    download={file.originalName}
                    className="p-1 hover:bg-[#404040] rounded transition-colors"
                    title="Скачать"
                  >
                    <Download className="w-3.5 h-3.5 text-[#C48B64]" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(file.id, file.isLocal);
                  }}
                  className="p-1 hover:bg-[#404040] rounded transition-colors"
                  title="Удалить"
                >
                  <X className="w-3.5 h-3.5 text-[#999] hover:text-red-400" />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white text-sm font-medium truncate">{previewImage.name}</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-white hover:text-[#C48B64] transition-colors flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
