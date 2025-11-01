import { useState, useEffect, useRef } from 'react';
import { AlertCircle, MessageCircle, Paperclip, CheckSquare, Edit2, X, Search, LogOut, Download, Send } from 'lucide-react';
import Login from './Login';
import Avatar from './components/Avatar';
import EmptyState from './components/EmptyState';
import SkeletonLoader from './components/SkeletonLoader';
import FileUpload from './components/FileUpload';
import InstallPWA from './components/InstallPWA';
import InstallPWAiOS from './components/InstallPWAiOS';
import OnlineStatus from './components/OnlineStatus';
import PushNotifications from './components/PushNotifications';

console.log('✓ HelpDesk v1.0.1 - PWA with push notifications enabled');

function App() {
  const formatDate = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) return 'Сегодня';
    if (date.getTime() === yesterday.getTime()) return 'Вчера';

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
  };

  const [currentUser, setCurrentUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localFiles, setLocalFiles] = useState([]);
  const [isFormModified, setIsFormModified] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' или 'kanban'
  const [draggedTask, setDraggedTask] = useState(null);
  const [filesPopover, setFilesPopover] = useState(null); // taskId для показа popover файлов
  const [commentsPopover, setCommentsPopover] = useState(null); // taskId для показа popover комментариев
  const [commentText, setCommentText] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const commentsEndRef = useRef(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [serverOffline, setServerOffline] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    created_by: 1,
    assigned_to: null,
    date: new Date().toISOString().split('T')[0],
    deadline: '',
    urgent: false,
    tags: [],
    comments: [],
    attachments: [],
    subtasks: []
  });

  useEffect(() => {
    // Проверяем сохраненную сессию
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      } catch (err) {
        console.error('Ошибка загрузки сессии:', err);
        localStorage.removeItem('user');
      }
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchTasks();
      fetchUsers();
      
      // Автообновление каждые 10 секунд для синхронизации между устройствами
      const interval = setInterval(() => {
        fetchTasks();
      }, 10000);
      
      // Обновление при возврате на страницу (для мобильных)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchTasks();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [currentUser, showModal, editingTaskId]);

  // Обработка сообщений от Service Worker (клик по уведомлению)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event) => {
        if (event.data.type === 'NOTIFICATION_CLICK') {
          const data = event.data.data;
          if (data.taskId && tasks.length > 0) {
            const task = tasks.find(t => t.id === parseInt(data.taskId));
            if (task) {
              openEditModal(task);
            }
          }
        }
      };
      
      navigator.serviceWorker.addEventListener('message', handleMessage);
      
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [tasks]);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Ошибка при загрузке задач');
      const data = await res.json();
      setTasks(data);
      
      // Если модалка открыта - ВСЕГДА обновляем комментарии и файлы
      if (editingTaskId && showModal) {
        const freshTask = data.find(t => t.id === editingTaskId);
        if (freshTask) {
          setFormData(prev => ({
            ...prev,
            comments: freshTask.comments || [],
            attachments: freshTask.attachments || []
          }));
        }
      }
      
      // Сервер доступен
      if (serverOffline) {
        setServerOffline(false);
        setError(null);
      }
    } catch (err) {
      // Проверяем тип ошибки - сетевая или серверная
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setServerOffline(true);
      } else {
        setError(err.message);
      }
      console.error('Ошибка загрузки задач:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Ошибка при загрузке пользователей');
      const data = await res.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Ошибка загрузки пользователей:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsFormModified(true);
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    setFormData(prev => ({
      ...prev,
      created_by: user.id
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
    setTasks([]);
    setUsers([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
      const method = editingTask ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Ошибка при сохранении задачи');

      const savedTask = await res.json();

      // Если создали новую задачу и есть локальные файлы - загружаем их
      if (method === 'POST' && localFiles.length > 0) {
        for (const localFile of localFiles) {
          const fileFormData = new FormData();
          fileFormData.append('file', localFile.file);

          try {
            await fetch(`/api/tasks/${savedTask.id}/attachments`, {
              method: 'POST',
              body: fileFormData
            });
          } catch (error) {
            console.error('Ошибка загрузки файла:', error);
          }
        }
      }

      // Если редактировали - переключаем в режим просмотра
      if (method === 'PUT') {
        setIsEditMode(false);
        setIsFormModified(false);
        await fetchTasks();
      } else {
        // Если создали - закрываем модалку
        setShowModal(false);
        setEditingTask(null);
        setEditingTaskId(null);
        setLocalFiles([]);
        setIsFormModified(false);
        setIsEditMode(false);
        setFormData({
          title: '',
          description: '',
          status: 'open',
          priority: 'medium',
          created_by: 1,
          assigned_to: null,
          date: new Date().toISOString().split('T')[0],
          deadline: '',
          urgent: false,
          tags: [],
          comments: [],
          attachments: [],
          subtasks: []
        });
        await fetchTasks();
      }
    } catch (err) {
      setError(err.message);
      console.error('Ошибка сохранения:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить задачу?')) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка при удалении задачи');
      await fetchTasks();
    } catch (err) {
      setError(err.message);
      console.error('Ошибка удаления:', err);
    }
  };

  const openEditModal = async (task) => {
    setEditingTask(task);
    setEditingTaskId(task.id);
    setLocalFiles([]);
    setIsFormModified(false);
    setCommentText('');
    setIsEditMode(false);
    setShowFiles(false);
    setShowComments(true);
    setShowModal(true);
    
    // Перечитываем задачу с сервера для получения актуальных данных
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const tasks = await res.json();
        const freshTask = tasks.find(t => t.id === task.id);
        if (freshTask) {
          setFormData({
            title: freshTask.title,
            description: freshTask.description || '',
            status: freshTask.status,
            priority: freshTask.priority,
            created_by: freshTask.created_by,
            assigned_to: freshTask.assigned_to,
            date: freshTask.date || new Date().toISOString().split('T')[0],
            deadline: freshTask.deadline || '',
            urgent: freshTask.urgent || false,
            tags: freshTask.tags || [],
            comments: freshTask.comments || [],
            attachments: freshTask.attachments || [],
            subtasks: freshTask.subtasks || []
          });
          return;
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки актуальной задачи:', err);
    }
    
    // Fallback на локальные данные если запрос не удался
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      created_by: task.created_by,
      assigned_to: task.assigned_to,
      date: task.date || new Date().toISOString().split('T')[0],
      deadline: task.deadline || '',
      urgent: task.urgent || false,
      tags: task.tags || [],
      comments: task.comments || [],
      attachments: task.attachments || [],
      subtasks: task.subtasks || []
    });
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setEditingTaskId(null);
    setLocalFiles([]);
    setIsFormModified(false);
    setCommentText('');
    setIsEditMode(true);
    setShowFiles(true);
    setShowComments(false);
    setFormData({
      title: '',
      description: '',
      status: 'open',
      priority: 'medium',
      created_by: currentUser.id,
      assigned_to: null,
      date: new Date().toISOString().split('T')[0],
      deadline: '',
      urgent: false,
      tags: [],
      comments: [],
      attachments: [],
      subtasks: []
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (isFormModified || localFiles.length > 0) {
      if (!confirm('Вы уверены что хотите закрыть форму? Все несохраненные изменения будут потеряны.')) {
        return;
      }
    }
    setShowModal(false);
    setEditingTask(null);
    setEditingTaskId(null);
    setLocalFiles([]);
    setIsFormModified(false);
    setIsEditMode(false);
    setCommentText('');
    setFormData({
      title: '',
      description: '',
      status: 'open',
      priority: 'medium',
      created_by: currentUser.id,
      assigned_to: null,
      date: new Date().toISOString().split('T')[0],
      deadline: '',
      urgent: false,
      tags: [],
      comments: [],
      attachments: [],
      subtasks: []
    });
  };

  // Обработка ESC для закрытия модалки
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showModal) {
        closeModal();
      }
    };

    if (showModal) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showModal, isFormModified, localFiles]);

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    try {
      await fetch(`/api/tasks/${draggedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draggedTask, status: newStatus })
      });
      await fetchTasks();
    } catch (err) {
      setError('Ошибка при изменении статуса задачи');
      console.error('Drag error:', err);
    } finally {
      setDraggedTask(null);
    }
  };

  const isImage = (filename) => {
    const ext = filename.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    if (days < 7) return `${days} дн. назад`;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return `${day}.${month} в ${time}`;
  };

  const handleAddComment = async (taskId) => {
    if (!commentText.trim()) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: commentText.trim(),
          userId: currentUser.id
        })
      });

      if (!res.ok) throw new Error('Ошибка при добавлении комментария');

      const newComment = await res.json();
      
      // Обновляем formData если модалка открыта
      if (editingTaskId === taskId) {
        setFormData(prev => ({
          ...prev,
          comments: [...(prev.comments || []), newComment]
        }));
        
        // Скроллим вниз к новому комментарию
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }

      setCommentText('');
      await fetchTasks();
    } catch (err) {
      setError(err.message);
      console.error('Comment error:', err);
    }
  };

  // Автоскролл при изменении комментариев
  useEffect(() => {
    if (formData.comments && formData.comments.length > 0) {
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [formData.comments]);

  // Фильтрация по статусу и поиску
  const filteredTasks = tasks
    .filter(t => viewMode === 'kanban' || filterStatus === 'all' || t.status === filterStatus)
    .filter(t => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    });

  const statusColors = {
    open: 'bg-[#5B7C99] text-white',
    in_progress: 'bg-[#C48B64] text-white',
    completed: 'bg-[#6B8E6F] text-white'
  };

  const priorityBorderColors = {
    low: '#6B8E6F',
    medium: '#C48B64',
    high: '#B86B5C'
  };

  // Показываем Login если не авторизован
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F1F1F]">
        <div className="max-w-5xl mx-auto">
          <div className="bg-[#2F2F2F] text-[#E8E8E8] px-4 py-3 border-b border-[#404040]">
            <div className="h-6 w-32 bg-[#3A3A3A] rounded animate-pulse"></div>
          </div>
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F1F1F]">
      <OnlineStatus />
      <InstallPWA />
      <InstallPWAiOS />
      <div className="max-w-5xl mx-auto">
        <div className="bg-[#2F2F2F] text-[#E8E8E8] px-3 sm:px-4 py-3 flex justify-between items-center sticky top-0 z-10 border-b border-[#404040] shadow-lg">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight">HelpDesk</h1>
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-[#888888]">•</span>
              <span className="text-[#B8B8B8] truncate">{currentUser.name}</span>
              {currentUser.role === 'admin' && (
                <span className="bg-[#C48B64] text-white px-2 py-0.5 rounded text-xs font-medium">Admin</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <PushNotifications />
            <div className="flex bg-[#3A3A3A] rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-[#C48B64] text-white'
                    : 'text-[#B8B8B8] hover:text-[#E8E8E8]'
                }`}
              >
                Список
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-[#C48B64] text-white'
                    : 'text-[#B8B8B8] hover:text-[#E8E8E8]'
                }`}
              >
                Канбан
              </button>
            </div>
            <button
              onClick={openCreateModal}
              className="bg-[#C48B64] hover:bg-[#D49A75] text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all hover:shadow-md whitespace-nowrap"
            >
              <span className="hidden sm:inline">+ Задача</span>
              <span className="sm:hidden">+</span>
            </button>
            <button
              onClick={handleLogout}
              className="text-[#B8B8B8] hover:text-[#E8E8E8] px-3 py-1.5 rounded-lg text-sm transition-all hover:bg-[#3A3A3A] flex items-center gap-2"
              title="Выход"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {serverOffline && (
          <div className="bg-orange-900 bg-opacity-20 border border-orange-500 text-orange-400 px-4 py-3 m-3 rounded-lg flex items-center gap-3 animate-pulse">
            <div className="w-3 h-3 bg-orange-400 rounded-full animate-ping"></div>
            <div className="flex-1">
              <div className="font-semibold">Сервер недоступен</div>
              <div className="text-xs text-orange-300">Идет обновление или редеплой. Переподключение...</div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900 bg-opacity-20 border border-red-500 text-red-400 px-4 py-3 m-3 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 font-bold ml-4"
            >
              ×
            </button>
          </div>
        )}

        <div className="bg-[#2F2F2F] border-b border-[#404040] p-2 sm:p-3 space-y-2 sm:space-y-3">
          {viewMode === 'list' && (
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {['all', 'open', 'in_progress', 'completed'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition-all ${
                  filterStatus === status
                    ? 'bg-[#C48B64] text-white shadow-md'
                    : 'bg-[#3A3A3A] text-[#B8B8B8] hover:bg-[#454545] hover:text-[#E8E8E8]'
                }`}
              >
                {status === 'all' ? 'Все' :
                 status === 'open' ? 'Открыто' :
                   status === 'in_progress' ? 'В работе' : 'Завершено'}
              </button>
            ))}
          </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#888888]" />
            <input
              type="text"
              placeholder="Поиск по задачам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg pl-10 pr-4 py-2 text-sm text-[#E8E8E8] placeholder-[#888888] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#888888] hover:text-[#E8E8E8]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <EmptyState onCreateTask={openCreateModal} />
        ) : viewMode === 'kanban' ? (
          // Канбан-доска
          <div className="p-4 overflow-x-auto">
            <div className="flex gap-4 min-w-max">
              {['open', 'in_progress', 'completed'].map(status => {
                const statusTasks = filteredTasks.filter(t => t.status === status);
                const statusTitle = status === 'open' ? 'Открыто' :
                                   status === 'in_progress' ? 'В работе' : 'Завершено';
                const statusColor = statusColors[status];
                
                return (
                  <div key={status} className="flex-shrink-0 w-80">
                    <div className="bg-[#2F2F2F] rounded-lg border border-[#404040]">
                      <div className={`px-3 py-2 ${statusColor} rounded-t-lg flex justify-between items-center`}>
                        <h3 className="font-semibold text-sm">{statusTitle}</h3>
                        <span className="bg-black bg-opacity-20 px-2 py-0.5 rounded text-xs">{statusTasks.length}</span>
                      </div>
                      <div 
                        className="p-2 space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto min-h-[200px]"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, status)}
                      >
                        {statusTasks.map(task => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                            className={`bg-[#1F1F1F] p-3 rounded-lg border-l-4 hover:bg-[#252525] transition-colors cursor-move ${
                              draggedTask?.id === task.id ? 'opacity-50' : ''
                            }`}
                            style={{ borderLeftColor: priorityBorderColors[task.priority] }}
                            onDoubleClick={() => openEditModal(task)}
                          >
                            {/* Заголовок с приоритетом и срочностью */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-[#666666]">#{task.id}</span>
                                  {task.urgent && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-900 bg-opacity-30 rounded">
                                      <AlertCircle className="w-3 h-3 text-red-400 animate-pulse" />
                                      <span className="text-[10px] text-red-400 font-medium">Срочно</span>
                                    </div>
                                  )}
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    task.priority === 'high' ? 'bg-[#B86B5C] bg-opacity-30 text-[#B86B5C]' :
                                    task.priority === 'low' ? 'bg-[#6B8E6F] bg-opacity-30 text-[#6B8E6F]' :
                                    'bg-[#C48B64] bg-opacity-30 text-[#C48B64]'
                                  }`}>
                                    {task.priority === 'high' ? 'Высокий' : task.priority === 'low' ? 'Низкий' : 'Средний'}
                                  </span>
                                </div>
                                <h4 className="text-sm font-semibold text-[#E8E8E8] leading-tight">{task.title}</h4>
                              </div>
                            </div>
                            
                            {/* Описание */}
                            {task.description && (
                              <p className="text-xs text-[#B8B8B8] line-clamp-2 mb-2 leading-relaxed">{task.description}</p>
                            )}
                            
                            {/* Теги */}
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex gap-1 mb-2 flex-wrap">
                                {task.tags.map((tag, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-[#3A3A3A] text-[#B8B8B8] rounded text-[10px]">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            
                            {/* Футер с инфо */}
                            <div className="space-y-2 pt-2 border-t border-[#404040]">
                              {/* Даты */}
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-[#B8B8B8]">{formatDate(task.date)}</span>
                                {task.deadline && (
                                  <>
                                    <span className="text-[#666]">→</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[#666]">⏰</span>
                                      <span className={new Date(task.deadline) < new Date() ? 'text-red-400 font-semibold' : 'text-[#B8B8B8]'}>
                                        {formatDate(task.deadline)}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              {/* Участники */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs overflow-hidden">
                                  <div className="flex items-center gap-1" title={`Создал: ${task.created_by_name}`}>
                                    <Avatar name={task.created_by_name} size="sm" />
                                  </div>
                                  {task.assigned_to_name && (
                                    <>
                                      <span className="text-[#666]">→</span>
                                      <div className="flex items-center gap-1" title={`Исполнитель: ${task.assigned_to_name}`}>
                                        <Avatar name={task.assigned_to_name} size="sm" />
                                      </div>
                                    </>
                                  )}
                                </div>
                                
                                {/* Счетчики */}
                                <div className="flex items-center gap-2 text-xs text-[#888] flex-shrink-0">
                                  {task.subtasks && task.subtasks.length > 0 && (
                                    <div className="flex items-center gap-0.5" title="Подзадачи">
                                      <CheckSquare className="w-3 h-3" />
                                      <span>{task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}</span>
                                    </div>
                                  )}
                                  <div 
                                    className={`flex items-center gap-0.5 cursor-pointer hover:text-[#C48B64] transition-colors ${task.comments && task.comments.length > 0 ? '' : 'opacity-50'}`}
                                    title="Комментарии"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCommentsPopover(commentsPopover === task.id ? null : task.id);
                                    }}
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>{task.comments ? task.comments.length : 0}</span>
                                  </div>
                                  {task.attachments && task.attachments.length > 0 && (
                                    <div 
                                      className="flex items-center gap-0.5 cursor-pointer hover:text-[#C48B64] transition-colors relative" 
                                      title="Файлы"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFilesPopover(filesPopover === task.id ? null : task.id);
                                      }}
                                    >
                                      <Paperclip className="w-3 h-3" />
                                      <span>{task.attachments.length}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Список задач
          <div className="divide-y divide-[#404040]">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                className="bg-[#2F2F2F] p-4 hover:bg-[#353535] border-l-4 transition-colors cursor-pointer"
                style={{ borderLeftColor: priorityBorderColors[task.priority] }}
                onDoubleClick={() => openEditModal(task)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {task.urgent && (
                        <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" />
                      )}
                      <span className="text-xs text-[#888888]">#{task.id}</span>
                      <h3 className="text-sm font-semibold text-[#E8E8E8] truncate">{task.title}</h3>
                    </div>
                  </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ml-2 whitespace-nowrap shadow-sm ${statusColors[task.status]}`}>
                  {task.status === 'open' ? 'Открыто' :
                   task.status === 'in_progress' ? 'В работе' : 'Завершено'}
                </span>
              </div>

              {task.description && (
                <p className="text-xs text-[#B8B8B8] mb-2 line-clamp-2 leading-relaxed">{task.description}</p>
              )}

              {task.tags && task.tags.length > 0 && (
                <div className="flex gap-1.5 mb-3 flex-wrap">
                  {task.tags.map((tag, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-[#3A3A3A] text-[#B8B8B8] rounded-md text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-[#888888]">
                <div className="flex items-center gap-3 flex-1 truncate">
                  <span className="text-[#B8B8B8]">{formatDate(task.date)}</span>
                  {task.deadline && (
                    <>
                      <span className="text-[#666666]">→</span>
                      <span className={new Date(task.deadline) < new Date() ? 'text-red-400 font-semibold' : 'text-[#B8B8B8]'}>
                        {formatDate(task.deadline)}
                      </span>
                    </>
                  )}
                  <span className="text-[#666666]">•</span>
                  <div className="flex items-center gap-1.5">
                    <Avatar name={task.created_by_name} size="sm" />
                    <span className="text-[#B8B8B8]">{task.created_by_name}</span>
                  </div>
                  {task.assigned_to_name && (
                    <>
                      <span className="text-[#666666]">→</span>
                      <div className="flex items-center gap-1.5">
                        <Avatar name={task.assigned_to_name} size="sm" />
                        <span className="text-[#B8B8B8]">{task.assigned_to_name}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <div 
                    className={`flex items-center gap-1 text-[#B8B8B8] cursor-pointer hover:text-[#C48B64] transition-colors ${task.comments && task.comments.length > 0 ? '' : 'opacity-50'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCommentsPopover(commentsPopover === task.id ? null : task.id);
                    }}
                  >
                      <MessageCircle className="w-3.5 h-3.5" />
                    <span>{task.comments ? task.comments.length : 0}</span>
                    </div>
                  {task.attachments && task.attachments.length > 0 && (
                    <div 
                      className="flex items-center gap-1 text-[#B8B8B8] cursor-pointer hover:text-[#C48B64] transition-colors relative"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilesPopover(filesPopover === task.id ? null : task.id);
                      }}
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{task.attachments.length}</span>
                    </div>
                  )}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="flex items-center gap-1 text-[#B8B8B8]">
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>{task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(task);
                    }}
                    className="p-1.5 bg-[#3A3A3A] hover:bg-[#454545] text-[#E8E8E8] rounded-md transition-all hover:shadow-md"
                    title="Редактировать"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(task.id);
                    }}
                    className="p-1.5 bg-[#8B5A5A] hover:bg-[#9D6767] text-white rounded-md transition-all hover:shadow-md"
                    title="Удалить"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Files Popover */}
      {filesPopover && (() => {
        const task = tasks.find(t => t.id === filesPopover);
        if (!task || !task.attachments || task.attachments.length === 0) return null;
        
        return (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setFilesPopover(null)}
            />
            <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
              <div 
                className="bg-[#2F2F2F] rounded-lg border border-[#404040] shadow-2xl w-full max-w-md pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-[#3A3A3A] px-4 py-2 rounded-t-lg border-b border-[#404040] flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-[#E8E8E8]">Файлы задачи #{task.id}</h3>
                  <button
                    onClick={() => setFilesPopover(null)}
                    className="text-[#B8B8B8] hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 max-h-96 overflow-y-auto space-y-2">
                  {task.attachments.map((file) => {
                    const isImg = isImage(file.originalName);
                    return (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-2 bg-[#1F1F1F] rounded-lg hover:bg-[#252525] transition-colors"
                      >
                        {isImg ? (
                          <div 
                            className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-[#2F2F2F] cursor-pointer"
                            onClick={() => {
                              setPreviewImage({
                                url: `/api/uploads/${file.filename}`,
                                name: file.originalName
                              });
                            }}
                          >
                            <img 
                              src={`/api/uploads/${file.filename}`}
                              alt={file.originalName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 flex-shrink-0 rounded bg-[#3A3A3A] flex items-center justify-center">
                            <Paperclip className="w-5 h-5 text-[#C48B64]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p 
                            className={`text-sm text-[#E8E8E8] truncate ${isImg ? 'hover:underline cursor-pointer' : ''}`}
                            onClick={() => {
                              if (isImg) {
                                setPreviewImage({
                                  url: `/api/uploads/${file.filename}`,
                                  name: file.originalName
                                });
                              }
                            }}
                          >
                            {file.originalName}
                          </p>
                          <p className="text-xs text-[#888]">{formatFileSize(file.size)}</p>
                        </div>
                        <a
                          href={`/api/uploads/${file.filename}`}
                          download={file.originalName}
                          className="p-2 hover:bg-[#404040] rounded transition-colors"
                          title="Скачать"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="w-4 h-4 text-[#C48B64]" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Comments Popover */}
      {commentsPopover && (() => {
        const task = tasks.find(t => t.id === commentsPopover);
        if (!task) return null;
        
        return (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => {
                setCommentsPopover(null);
                setCommentText('');
              }}
            />
            <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
              <div 
                className="bg-[#2F2F2F] rounded-lg border border-[#404040] shadow-2xl w-full max-w-md pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-[#3A3A3A] px-4 py-2 rounded-t-lg border-b border-[#404040] flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-[#E8E8E8]">Комментарии к задаче #{task.id}</h3>
                  <button
                    onClick={() => {
                      setCommentsPopover(null);
                      setCommentText('');
                    }}
                    className="text-[#B8B8B8] hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Список комментариев */}
                <div className="p-3 max-h-80 overflow-y-auto space-y-3">
                  {task.comments && task.comments.length > 0 ? (
                    task.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-[#1F1F1F] p-3 rounded-lg"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <Avatar name={comment.userName} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-[#E8E8E8]">{comment.userName}</span>
                              <span className="text-xs text-[#666]">{formatDateTime(comment.createdAt)}</span>
                            </div>
                            <p className="text-sm text-[#B8B8B8] whitespace-pre-wrap break-words">{comment.text}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-[#888]">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Комментариев пока нет</p>
                    </div>
                  )}
                </div>

                {/* Форма добавления комментария */}
                <div className="p-3 border-t border-[#404040]">
                  <div className="flex gap-2">
                    <Avatar name={currentUser.name} size="sm" />
                    <div className="flex-1">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Написать комментарий..."
                        className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#888888] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all resize-none"
                        rows="2"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            handleAddComment(task.id);
                          }
                        }}
                      />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-[#666]">Ctrl+Enter для отправки</span>
                        <button
                          onClick={() => handleAddComment(task.id)}
                          disabled={!commentText.trim()}
                          className="px-3 py-1.5 bg-[#C48B64] hover:bg-[#D49A75] text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Отправить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

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

      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center sm:p-4 backdrop-blur-sm z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="bg-[#2F2F2F] sm:rounded-xl w-full sm:max-w-xl h-full sm:h-[95vh] flex flex-col border border-[#404040] shadow-2xl">
            <div className="bg-[#3A3A3A] text-[#E8E8E8] px-4 py-3 sm:rounded-t-xl flex justify-between items-center sticky top-0 border-b border-[#404040] z-10">
              <h2 className="text-sm font-semibold">
                {editingTask ? `Задача #${editingTask.id}` : 'Новая задача'}
              </h2>
              <div className="flex items-center gap-2">
                {editingTask && !isEditMode && (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    className="p-1.5 hover:bg-[#454545] rounded transition-colors"
                    title="Редактировать"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="text-[#B8B8B8] hover:text-white text-xl leading-none transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-4 flex-shrink-0">
                {/* Основные данные */}
                <div className="space-y-3">
                  {!editingTask || isEditMode ? (
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={e => updateFormData({ title: e.target.value })}
                      placeholder="Название задачи *"
                      className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-2.5 py-1.5 text-sm text-[#E8E8E8] placeholder-[#888888] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all"
                    />
                  ) : (
                    <h3 className="text-lg font-semibold text-[#E8E8E8]">{formData.title}</h3>
                  )}

                  {!editingTask || isEditMode ? (
                    <textarea
                      value={formData.description}
                      onChange={e => updateFormData({ description: e.target.value })}
                      placeholder="Описание"
                      className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-2.5 py-1.5 text-sm text-[#E8E8E8] placeholder-[#888888] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all resize-none"
                      rows="2"
                    />
                  ) : formData.description ? (
                    <p className="text-sm text-[#B8B8B8]">{formData.description}</p>
                  ) : null}

                {isEditMode ? (
                  <>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={formData.date}
                      onChange={e => updateFormData({ date: e.target.value })}
                      className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-2.5 py-1.5 text-xs text-[#E8E8E8] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all cursor-pointer"
                    />
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={e => updateFormData({ deadline: e.target.value })}
                      placeholder="Дедлайн"
                      className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-2.5 py-1.5 text-xs text-[#E8E8E8] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all cursor-pointer"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={formData.tags.join(', ')}
                      onChange={e => updateFormData({ tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                      placeholder="Теги через запятую"
                      className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-2.5 py-1.5 text-sm text-[#E8E8E8] placeholder-[#888888] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={formData.status}
                      onChange={e => updateFormData({ status: e.target.value })}
                      className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-2 py-2 text-xs text-[#E8E8E8] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all"
                    >
                      <option value="open">Открыто</option>
                      <option value="in_progress">В работе</option>
                      <option value="completed">Завершено</option>
                    </select>

                    <select
                      value={formData.priority}
                      onChange={e => updateFormData({ priority: e.target.value })}
                      className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-2 py-2 text-xs text-[#E8E8E8] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all"
                    >
                      <option value="low">Низкий</option>
                      <option value="medium">Средний</option>
                      <option value="high">Высокий</option>
                    </select>

                    <label className="flex items-center justify-center gap-1.5 text-xs text-[#B8B8B8] cursor-pointer hover:text-[#E8E8E8] transition-all">
                      <input
                        type="checkbox"
                        checked={formData.urgent}
                        onChange={e => updateFormData({ urgent: e.target.checked })}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="text-base">⚠️</span>
                      <span>Срочно</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formData.created_by}
                      onChange={e => updateFormData({ created_by: parseInt(e.target.value) })}
                      className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-2.5 py-1.5 text-xs text-[#E8E8E8] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all"
                    >
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>

                    <select
                      value={formData.assigned_to || ''}
                      onChange={e => updateFormData({ assigned_to: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-2.5 py-1.5 text-xs text-[#E8E8E8] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all"
                    >
                      <option value="">Не назначено</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </div>
                  </>
                ) : (
                <div className="space-y-3">
                  {/* Статусы и мета-данные компактно */}
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      formData.status === 'open' ? 'bg-[#5B7C99] text-white' :
                      formData.status === 'in_progress' ? 'bg-[#C48B64] text-white' : 'bg-[#6B8E6F] text-white'
                    }`}>
                      {formData.status === 'open' ? 'Открыто' : formData.status === 'in_progress' ? 'В работе' : 'Завершено'}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      formData.priority === 'high' ? 'bg-[#B86B5C] text-white' :
                      formData.priority === 'low' ? 'bg-[#6B8E6F] text-white' : 'bg-[#C48B64] text-white'
                    }`}>
                      {formData.priority === 'high' ? 'Высокий' : formData.priority === 'low' ? 'Низкий' : 'Средний'}
                    </span>
                    {formData.urgent && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-900 bg-opacity-30 text-red-400">
                        ⚠️ Срочно
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-[#B8B8B8]">
                      <span className="text-[#666]">Создана:</span>
                      <span>{formatDate(formData.date)}</span>
                    </div>
                    {formData.deadline && (
                      <div className="flex items-center gap-2 text-[#B8B8B8]">
                        <span className="text-[#666]">Дедлайн:</span>
                        <span className={new Date(formData.deadline) < new Date() ? 'text-red-400 font-semibold' : ''}>
                          {formatDate(formData.deadline)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[#666] text-sm">Автор:</span>
                      <div className="flex items-center gap-1.5">
                        <Avatar name={editingTask?.created_by_name} size="sm" />
                        <span className="text-[#B8B8B8] text-sm">{editingTask?.created_by_name}</span>
                      </div>
                    </div>
                    {editingTask?.assigned_to_name && (
                      <div className="flex items-center gap-2">
                        <span className="text-[#666] text-sm">Исполнитель:</span>
                        <div className="flex items-center gap-1.5">
                          <Avatar name={editingTask.assigned_to_name} size="sm" />
                          <span className="text-[#B8B8B8] text-sm">{editingTask.assigned_to_name}</span>
                        </div>
                      </div>
                    )}
                    {formData.tags && formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {formData.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-[#3A3A3A] text-[#B8B8B8] rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>

              {/* Файлы */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowFiles(!showFiles)}
                  className="w-full flex items-center justify-between text-[10px] font-medium text-[#B8B8B8] mb-1 hover:text-[#E8E8E8] transition-colors"
                >
                  <span>Файлы ({formData.attachments?.length || 0})</span>
                  <X className={`w-3 h-3 transition-transform ${showFiles ? 'rotate-0' : 'rotate-45'}`} />
                </button>
                {showFiles && (
                  <FileUpload
                    taskId={editingTaskId}
                    attachments={formData.attachments}
                    onUpdate={async () => {
                      await fetchTasks();
                      // Обновляем formData с актуальными файлами после удаления
                      if (editingTaskId) {
                        const updatedTasks = await fetch('/api/tasks').then(r => r.json());
                        const updatedTask = updatedTasks.find(t => t.id === editingTaskId);
                        if (updatedTask) {
                          setFormData(prev => ({
                            ...prev,
                            attachments: updatedTask.attachments || []
                          }));
                        }
                      }
                    }}
                    localFiles={localFiles}
                    onLocalFilesChange={setLocalFiles}
                  />
                )}
              </div>

                {/* Кнопки действий */}
                {isEditMode && (
                  <div className="flex gap-3 p-4 border-t border-[#404040] bg-[#2F2F2F]">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 px-3 py-1.5 border border-[#505050] rounded-lg text-sm text-[#B8B8B8] hover:bg-[#3A3A3A] hover:text-[#E8E8E8] transition-all"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-3 py-1.5 bg-[#C48B64] hover:bg-[#D49A75] text-white rounded-lg text-sm font-medium transition-all hover:shadow-lg"
                    >
                      {editingTask ? 'Сохранить' : 'Создать'}
                    </button>
                  </div>
                )}
              </form>

              {/* Комментарии - автоматически растягиваются на оставшуюся высоту */}
              {editingTask && (
                <div className="flex-1 flex flex-col min-h-0 border-t border-[#404040] bg-[#2F2F2F]">
                  <button
                    type="button"
                    onClick={() => setShowComments(!showComments)}
                    className="w-full flex items-center justify-between text-[10px] font-medium text-[#B8B8B8] px-4 py-2 hover:text-[#E8E8E8] transition-colors flex-shrink-0"
                  >
                    <span>Комментарии ({formData.comments ? formData.comments.length : 0})</span>
                    <X className={`w-3 h-3 transition-transform ${showComments ? 'rotate-0' : 'rotate-45'}`} />
                  </button>

                  {showComments && (
                    <>
                      {/* Список комментариев - растягивается на всю доступную высоту */}
                      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-0">
                        {formData.comments && formData.comments.length > 0 ? (
                          formData.comments.map((comment) => (
                            <div key={comment.id} className="bg-[#1F1F1F] p-2 rounded">
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar name={comment.userName} size="sm" />
                                <span className="text-xs font-medium text-[#E8E8E8]">{comment.userName}</span>
                                <span className="text-[10px] text-[#666]">{formatDateTime(comment.createdAt)}</span>
                              </div>
                              <p className="text-xs text-[#B8B8B8] whitespace-pre-wrap break-words ml-6">{comment.text}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-[#666] text-xs">
                            Комментариев пока нет
                          </div>
                        )}
                        <div ref={commentsEndRef} />
                      </div>

                      {/* Форма добавления комментария - всегда внизу */}
                      <div className="flex gap-2 items-end p-4 border-t border-[#404040] flex-shrink-0">
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Написать комментарий..."
                          className="flex-1 bg-[#1F1F1F] border border-[#505050] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#888888] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all resize-none"
                          rows="2"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(editingTaskId);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(editingTaskId)}
                          disabled={!commentText.trim()}
                          className="p-2.5 bg-[#C48B64] hover:bg-[#D49A75] text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Отправить (Enter)"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
