import { useState, useEffect } from 'react';

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

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
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
    fetchTasks();
    fetchUsers();
  }, []);

  const fetchTasks = async () => {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setTasks(data);
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingTask) {
      await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    } else {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    }
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
    fetchTasks();
  };

  const handleDelete = async (id) => {
    if (confirm('Удалить задачу?')) {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      fetchTasks();
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

  const filteredTasks = filterStatus === 'all'
    ? tasks
    : tasks.filter(t => t.status === filterStatus);

  const statusColors = {
    open: 'bg-[#5B7C99] text-white',
    in_progress: 'bg-[#CC8C5C] text-white',
    completed: 'bg-[#6B8E6F] text-white',
    closed: 'bg-[#6B6B6B] text-white'
  };

  const priorityBorderColors = {
    low: '#6B8E6F',
    medium: '#CC8C5C',
    high: '#B86B5C'
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <div className="max-w-5xl mx-auto">
        <div className="bg-[#2d2d2d] text-gray-100 px-3 py-2 flex justify-between items-center sticky top-0 z-10 border-b border-gray-700">
          <h1 className="text-lg font-semibold">HelpDesk</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#CC8C5C] hover:bg-[#D9976A] text-white px-3 py-1 rounded text-sm transition-colors"
          >
            + Задача
          </button>
        </div>

        <div className="flex gap-1 p-2 bg-[#2d2d2d] border-b border-gray-700 overflow-x-auto">
          {['all', 'open', 'in_progress', 'completed', 'closed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                filterStatus === status
                  ? 'bg-[#CC8C5C] text-white'
                  : 'bg-[#3a3a3a] text-gray-300 hover:bg-[#454545]'
              }`}
            >
              {status === 'all' ? 'Все' :
               status === 'open' ? 'Открыто' :
               status === 'in_progress' ? 'В работе' :
               status === 'completed' ? 'Завершено' : 'Закрыто'}
            </button>
          ))}
        </div>

        <div className="divide-y divide-gray-700">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className="bg-[#2d2d2d] p-3 hover:bg-[#343434] border-l-4"
              style={{ borderLeftColor: priorityBorderColors[task.priority] }}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {task.urgent && (
                      <span className="text-red-500 text-xs animate-pulse">⚠</span>
                    )}
                    <span className="text-xs text-gray-500">#{task.id}</span>
                    <h3 className="text-sm font-semibold text-gray-100 truncate">{task.title}</h3>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ml-2 whitespace-nowrap ${statusColors[task.status]}`}>
                  {task.status === 'open' ? 'Открыто' :
                   task.status === 'in_progress' ? 'В работе' :
                   task.status === 'completed' ? 'Завершено' : 'Закрыто'}
                </span>
              </div>

              {task.description && (
                <p className="text-xs text-gray-400 mb-2 line-clamp-2">{task.description}</p>
              )}

              {task.tags && task.tags.length > 0 && (
                <div className="flex gap-1 mb-2 flex-wrap">
                  {task.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-[#3a3a3a] text-gray-300 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-gray-500">
                <div className="flex items-center gap-2 flex-1 truncate">
                  <span className="text-gray-400">{formatDate(task.date)}</span>
                  {task.deadline && (
                    <>
                      <span>→</span>
                      <span className={new Date(task.deadline) < new Date() ? 'text-red-400 font-medium' : 'text-gray-400'}>
                        ⏱ {formatDate(task.deadline)}
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span>{task.created_by_name}</span>
                  {task.assigned_to_name && (
                    <>
                      <span>→</span>
                      <span>{task.assigned_to_name}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {task.comments && task.comments.length > 0 && (
                    <span className="text-gray-400">💬 {task.comments.length}</span>
                  )}
                  {task.attachments && task.attachments.length > 0 && (
                    <span className="text-gray-400">📎 {task.attachments.length}</span>
                  )}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <span className="text-gray-400">
                      ☑ {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
                    </span>
                  )}
                  <button
                    onClick={() => openEditModal(task)}
                    className="px-2 py-1 bg-[#3a3a3a] hover:bg-[#454545] text-gray-300 rounded text-xs transition-colors"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="px-2 py-1 bg-[#8B5A5A] hover:bg-[#9D6767] text-white rounded text-xs transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-2">
          <div className="bg-[#2d2d2d] rounded w-full max-w-md max-h-[95vh] overflow-y-auto border border-gray-700">
            <div className="bg-[#3a3a3a] text-gray-100 px-2 py-1.5 rounded-t flex justify-between items-center sticky top-0 border-b border-gray-700">
              <h2 className="text-sm font-semibold">
                {editingTask ? 'Редактировать' : 'Новая задача'}
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
                className="text-gray-300 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-2">
              <div className="mb-2">
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="Название задачи *"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#CC8C5C]"
                />
              </div>

              <div className="mb-2">
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Описание"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#CC8C5C]"
                  rows="2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 focus:outline-none focus:border-[#CC8C5C]"
                />
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={e => setFormData({...formData, deadline: e.target.value})}
                  placeholder="Дедлайн"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 focus:outline-none focus:border-[#CC8C5C]"
                />
              </div>

              <div className="mb-2">
                <input
                  type="text"
                  value={formData.tags.join(', ')}
                  onChange={e => setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)})}
                  placeholder="Теги через запятую"
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#CC8C5C]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2">
                <select
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 focus:outline-none focus:border-[#CC8C5C]"
                >
                  <option value="open">Открыто</option>
                  <option value="in_progress">В работе</option>
                  <option value="completed">Завершено</option>
                  <option value="closed">Закрыто</option>
                </select>

                <select
                  value={formData.priority}
                  onChange={e => setFormData({...formData, priority: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 focus:outline-none focus:border-[#CC8C5C]"
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>

                <label className="flex items-center justify-center gap-1 bg-[#1a1a1a] border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.urgent}
                    onChange={e => setFormData({...formData, urgent: e.target.checked})}
                    className="w-3 h-3"
                  />
                  <span>⚠</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <select
                  value={formData.created_by}
                  onChange={e => setFormData({...formData, created_by: parseInt(e.target.value)})}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 focus:outline-none focus:border-[#CC8C5C]"
                >
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>

                <select
                  value={formData.assigned_to || ''}
                  onChange={e => setFormData({...formData, assigned_to: e.target.value ? parseInt(e.target.value) : null})}
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 focus:outline-none focus:border-[#CC8C5C]"
                >
                  <option value="">Не назначено</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-1">
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
                  className="flex-1 px-3 py-1 border border-gray-600 rounded text-xs text-gray-300 hover:bg-[#3a3a3a] transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-1 bg-[#CC8C5C] hover:bg-[#D9976A] text-white rounded text-xs font-medium transition-colors"
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
