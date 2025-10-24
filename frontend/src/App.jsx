import { useState, useEffect } from 'react';
import Login from './Login';

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
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    }
  }, [currentUser]);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Ошибка при загрузке задач');
      const data = await res.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err.message);
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

      setShowModal(false);
      setEditingTask(null);
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

  const openEditModal = (task) => {
    setEditingTask(task);
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
    setShowModal(true);
  };

  const openCreateModal = () => {
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

  const filteredTasks = filterStatus === 'all'
    ? tasks
    : tasks.filter(t => t.status === filterStatus);

  const statusColors = {
    open: 'bg-[#5B7C99] text-white',
    in_progress: 'bg-[#C48B64] text-white',
    completed: 'bg-[#6B8E6F] text-white',
    closed: 'bg-[#606060] text-white'
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
      <div className="min-h-screen bg-[#1F1F1F] flex items-center justify-center">
        <div className="text-[#B8B8B8] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C48B64] mx-auto mb-4"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F1F1F]">
      <div className="max-w-5xl mx-auto">
        <div className="bg-[#2F2F2F] text-[#E8E8E8] px-4 py-3 flex justify-between items-center sticky top-0 z-10 border-b border-[#404040] shadow-lg">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold tracking-tight">HelpDesk</h1>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#888888]">•</span>
              <span className="text-[#B8B8B8]">{currentUser.name}</span>
              {currentUser.role === 'admin' && (
                <span className="bg-[#C48B64] text-white px-2 py-0.5 rounded text-xs font-medium">Admin</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openCreateModal}
              className="bg-[#C48B64] hover:bg-[#D49A75] text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:shadow-md"
            >
              + Задача
            </button>
            <button
              onClick={handleLogout}
              className="text-[#B8B8B8] hover:text-[#E8E8E8] px-3 py-1.5 rounded-lg text-sm transition-all hover:bg-[#3A3A3A]"
            >
              Выход
            </button>
          </div>
        </div>

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

        <div className="flex gap-2 p-3 bg-[#2F2F2F] border-b border-[#404040] overflow-x-auto">
          {['all', 'open', 'in_progress', 'completed', 'closed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition-all ${
                filterStatus === status
                  ? 'bg-[#C48B64] text-white shadow-md'
                  : 'bg-[#3A3A3A] text-[#B8B8B8] hover:bg-[#454545] hover:text-[#E8E8E8]'
              }`}
            >
              {status === 'all' ? 'Все' :
               status === 'open' ? 'Открыто' :
               status === 'in_progress' ? 'В работе' :
               status === 'completed' ? 'Завершено' : 'Закрыто'}
            </button>
          ))}
        </div>

        <div className="divide-y divide-[#404040]">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className="bg-[#2F2F2F] p-4 hover:bg-[#353535] border-l-4 transition-colors"
              style={{ borderLeftColor: priorityBorderColors[task.priority] }}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {task.urgent && (
                      <span className="text-red-400 text-xs animate-pulse font-semibold">⚠</span>
                    )}
                    <span className="text-xs text-[#888888]">#{task.id}</span>
                    <h3 className="text-sm font-semibold text-[#E8E8E8] truncate">{task.title}</h3>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ml-2 whitespace-nowrap shadow-sm ${statusColors[task.status]}`}>
                  {task.status === 'open' ? 'Открыто' :
                   task.status === 'in_progress' ? 'В работе' :
                   task.status === 'completed' ? 'Завершено' : 'Закрыто'}
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
                <div className="flex items-center gap-2 flex-1 truncate">
                  <span className="text-[#B8B8B8]">{formatDate(task.date)}</span>
                  {task.deadline && (
                    <>
                      <span className="text-[#666666]">→</span>
                      <span className={new Date(task.deadline) < new Date() ? 'text-red-400 font-semibold' : 'text-[#B8B8B8]'}>
                        ⏱ {formatDate(task.deadline)}
                      </span>
                    </>
                  )}
                  <span className="text-[#666666]">•</span>
                  <span className="text-[#B8B8B8]">{task.created_by_name}</span>
                  {task.assigned_to_name && (
                    <>
                      <span className="text-[#666666]">→</span>
                      <span className="text-[#B8B8B8]">{task.assigned_to_name}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {task.comments && task.comments.length > 0 && (
                    <span className="text-[#B8B8B8]">💬 {task.comments.length}</span>
                  )}
                  {task.attachments && task.attachments.length > 0 && (
                    <span className="text-[#B8B8B8]">📎 {task.attachments.length}</span>
                  )}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <span className="text-[#B8B8B8]">
                      ☑ {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
                    </span>
                  )}
                  <button
                    onClick={() => openEditModal(task)}
                    className="px-2.5 py-1 bg-[#3A3A3A] hover:bg-[#454545] text-[#E8E8E8] rounded-md text-xs transition-all hover:shadow-md"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="px-2.5 py-1 bg-[#8B5A5A] hover:bg-[#9D6767] text-white rounded-md text-xs transition-all hover:shadow-md"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#2F2F2F] rounded-xl w-full max-w-md max-h-[95vh] overflow-y-auto border border-[#404040] shadow-2xl">
            <div className="bg-[#3A3A3A] text-[#E8E8E8] px-4 py-3 rounded-t-xl flex justify-between items-center sticky top-0 border-b border-[#404040]">
              <h2 className="text-sm font-semibold">
                {editingTask ? 'Редактировать задачу' : 'Новая задача'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTask(null);
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
                }}
                className="text-[#B8B8B8] hover:text-white text-xl leading-none transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              <div className="mb-3">
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="Название задачи *"
                  className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#888888] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all"
                />
              </div>

              <div className="mb-3">
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Описание"
                  className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#888888] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all resize-none"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-3 py-2 text-xs text-[#E8E8E8] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all"
                />
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={e => setFormData({...formData, deadline: e.target.value})}
                  placeholder="Дедлайн"
                  className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-3 py-2 text-xs text-[#E8E8E8] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all"
                />
              </div>

              <div className="mb-3">
                <input
                  type="text"
                  value={formData.tags.join(', ')}
                  onChange={e => setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)})}
                  placeholder="Теги через запятую"
                  className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-3 py-2 text-sm text-[#E8E8E8] placeholder-[#888888] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <select
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-2 py-2 text-xs text-[#E8E8E8] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all"
                >
                  <option value="open">Открыто</option>
                  <option value="in_progress">В работе</option>
                  <option value="completed">Завершено</option>
                  <option value="closed">Закрыто</option>
                </select>

                <select
                  value={formData.priority}
                  onChange={e => setFormData({...formData, priority: e.target.value})}
                  className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-2 py-2 text-xs text-[#E8E8E8] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all"
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>

                <label className="flex items-center justify-center gap-1 bg-[#1F1F1F] border border-[#505050] rounded-lg px-2 py-2 text-xs text-[#B8B8B8] cursor-pointer hover:border-[#606060] transition-all">
                  <input
                    type="checkbox"
                    checked={formData.urgent}
                    onChange={e => setFormData({...formData, urgent: e.target.checked})}
                    className="w-3.5 h-3.5"
                  />
                  <span>⚠</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <select
                  value={formData.created_by}
                  onChange={e => setFormData({...formData, created_by: parseInt(e.target.value)})}
                  className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-3 py-2 text-xs text-[#E8E8E8] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all"
                >
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>

                <select
                  value={formData.assigned_to || ''}
                  onChange={e => setFormData({...formData, assigned_to: e.target.value ? parseInt(e.target.value) : null})}
                  className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-3 py-2 text-xs text-[#E8E8E8] focus:outline-none focus:border-[#C48B64] focus:ring-1 focus:ring-[#C48B64] transition-all"
                >
                  <option value="">Не назначено</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTask(null);
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
                  }}
                  className="flex-1 px-4 py-2 border border-[#505050] rounded-lg text-sm text-[#B8B8B8] hover:bg-[#3A3A3A] hover:text-[#E8E8E8] transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#C48B64] hover:bg-[#D49A75] text-white rounded-lg text-sm font-medium transition-all hover:shadow-lg"
                >
                  {editingTask ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
