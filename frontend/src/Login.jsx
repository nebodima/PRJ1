import { useState } from 'react';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        // Сохраняем пользователя в localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setError(data.message || 'Ошибка авторизации');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
      console.error('Ошибка авторизации:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1F1F1F] flex items-center justify-center p-4">
      <div className="bg-[#2F2F2F] rounded-xl w-full max-w-md p-8 border border-[#404040] shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#E8E8E8] mb-2">HelpDesk</h1>
          <p className="text-[#B8B8B8] text-sm">Система управления задачами</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[#B8B8B8] text-sm font-medium mb-2">
              Логин
            </label>
            <input
              type="text"
              required
              value={formData.login}
              onChange={e => setFormData({...formData, login: e.target.value})}
              className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-4 py-3 text-[#E8E8E8] placeholder-[#888888] focus:outline-none focus:border-[#C48B64] focus:ring-2 focus:ring-[#C48B64] focus:ring-opacity-50 transition-all"
              placeholder="Введите логин"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[#B8B8B8] text-sm font-medium mb-2">
              Пароль
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full bg-[#1F1F1F] border border-[#505050] rounded-lg px-4 py-3 text-[#E8E8E8] placeholder-[#888888] focus:outline-none focus:border-[#C48B64] focus:ring-2 focus:ring-[#C48B64] focus:ring-opacity-50 transition-all"
              placeholder="Введите пароль"
            />
          </div>

          {error && (
            <div className="bg-red-900 bg-opacity-20 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C48B64] hover:bg-[#D49A75] text-white font-semibold py-3 px-4 rounded-lg transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#404040]">
          <p className="text-[#888888] text-xs text-center mb-3">Тестовые аккаунты:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#1F1F1F] rounded-lg p-3 border border-[#404040]">
              <p className="text-[#B8B8B8] font-medium mb-1">Администратор:</p>
              <p className="text-[#888888]">Admin / 19822503</p>
            </div>
            <div className="bg-[#1F1F1F] rounded-lg p-3 border border-[#404040]">
              <p className="text-[#B8B8B8] font-medium mb-1">Пользователи:</p>
              <p className="text-[#888888]">Николай, Алексей,<br/>Дмитрий, Антон, Слава / 123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
