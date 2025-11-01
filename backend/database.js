import pg from 'pg';
const { Pool } = pg;

// Подключение к PostgreSQL
// Локально можно указать DATABASE_URL в .env, на Railway переменная создастся автоматически
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/helpdesk',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Инициализация БД
const initDb = async () => {
  try {
    // Создаем таблицы если их нет
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        login TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user'
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'open',
        priority TEXT DEFAULT 'medium',
        created_by INTEGER NOT NULL REFERENCES users(id),
        assigned_to INTEGER REFERENCES users(id),
        date TEXT,
        deadline TEXT,
        urgent BOOLEAN DEFAULT false,
        tags JSONB DEFAULT '[]',
        attachments JSONB DEFAULT '[]',
        subtasks JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        user_name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    
    // Проверяем есть ли пользователи
    const { rows: users } = await pool.query('SELECT COUNT(*) as count FROM users');
    
    if (parseInt(users[0].count) === 0) {
      // Вставляем начальных пользователей
      const initialUsers = [
        { id: 1, name: 'Admin', email: 'admin@helpdesk.com', login: 'Admin', password: '19822503', role: 'admin' },
        { id: 2, name: 'Николай', email: 'nikolay@example.com', login: 'Николай', password: '123', role: 'user' },
        { id: 3, name: 'Алексей', email: 'alexey@example.com', login: 'Алексей', password: '123', role: 'user' },
        { id: 4, name: 'Дмитрий', email: 'dmitry@example.com', login: 'Дмитрий', password: '123', role: 'user' },
        { id: 5, name: 'Антон', email: 'anton@example.com', login: 'Антон', password: '123', role: 'user' },
        { id: 6, name: 'Слава', email: 'slava@example.com', login: 'Слава', password: '123', role: 'user' }
      ];
      
      for (const user of initialUsers) {
        await pool.query(
          'INSERT INTO users (id, name, email, login, password, role) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
          [user.id, user.name, user.email, user.login, user.password, user.role]
        );
      }
      
      // Сбрасываем sequence для корректной работы SERIAL
      await pool.query('SELECT setval(\'users_id_seq\', (SELECT MAX(id) FROM users))');
      
      console.log('✓ Initial users created');
    }
    
    console.log('✓ PostgreSQL database ready');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Получить пользователей
export const getUsers = async () => {
  const { rows } = await pool.query('SELECT id, name, email, login, role FROM users ORDER BY id');
  return rows;
};

// Получить задачи с именами пользователей
export const getTasks = async () => {
  const { rows } = await pool.query(`
    SELECT 
      t.*,
      u1.name as created_by_name,
      u2.name as assigned_to_name
    FROM tasks t
    LEFT JOIN users u1 ON t.created_by = u1.id
    LEFT JOIN users u2 ON t.assigned_to = u2.id
    ORDER BY t.created_at DESC
  `);
  
  // Добавляем комментарии к каждой задаче
  for (const task of rows) {
    const { rows: comments } = await pool.query(
      'SELECT id, text, user_id as "userId", user_name as "userName", created_at as "createdAt" FROM comments WHERE task_id = $1 ORDER BY created_at ASC',
      [task.id]
    );
    task.comments = comments.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString()
    }));
  }
  
  return rows;
};

// Создать задачу
export const createTask = async (task) => {
  const { rows } = await pool.query(`
    INSERT INTO tasks (
      title, description, status, priority, created_by, assigned_to,
      date, deadline, urgent, tags, attachments, subtasks
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id
  `, [
    task.title,
    task.description || '',
    task.status || 'open',
    task.priority || 'medium',
    task.created_by,
    task.assigned_to || null,
    task.date || new Date().toISOString().split('T')[0],
    task.deadline || null,
    task.urgent || false,
    JSON.stringify(task.tags || []),
    JSON.stringify(task.attachments || []),
    JSON.stringify(task.subtasks || [])
  ]);
  
  return rows[0].id;
};

// Обновить задачу
export const updateTask = async (id, updates) => {
  const fields = [];
  const values = [];
  let paramCount = 1;
  
  if (updates.title !== undefined) { fields.push(`title = $${paramCount++}`); values.push(updates.title); }
  if (updates.description !== undefined) { fields.push(`description = $${paramCount++}`); values.push(updates.description); }
  if (updates.status !== undefined) { fields.push(`status = $${paramCount++}`); values.push(updates.status); }
  if (updates.priority !== undefined) { fields.push(`priority = $${paramCount++}`); values.push(updates.priority); }
  if (updates.created_by !== undefined) { fields.push(`created_by = $${paramCount++}`); values.push(updates.created_by); }
  if (updates.assigned_to !== undefined) { fields.push(`assigned_to = $${paramCount++}`); values.push(updates.assigned_to); }
  if (updates.date !== undefined) { fields.push(`date = $${paramCount++}`); values.push(updates.date); }
  if (updates.deadline !== undefined) { fields.push(`deadline = $${paramCount++}`); values.push(updates.deadline); }
  if (updates.urgent !== undefined) { fields.push(`urgent = $${paramCount++}`); values.push(updates.urgent); }
  if (updates.tags !== undefined) { fields.push(`tags = $${paramCount++}`); values.push(JSON.stringify(updates.tags)); }
  if (updates.attachments !== undefined) { fields.push(`attachments = $${paramCount++}`); values.push(JSON.stringify(updates.attachments)); }
  if (updates.subtasks !== undefined) { fields.push(`subtasks = $${paramCount++}`); values.push(JSON.stringify(updates.subtasks)); }
  
  fields.push(`updated_at = NOW()`);
  values.push(parseInt(id));
  
  if (fields.length > 1) {
    await pool.query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${paramCount}`,
      values
    );
  }
  
  return true;
};

// Удалить задачу
export const deleteTask = async (id) => {
  await pool.query('DELETE FROM tasks WHERE id = $1', [parseInt(id)]);
};

// Аутентификация
export const authenticateUser = async (login, password) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, login, role FROM users WHERE login = $1 AND password = $2',
    [login, password]
  );
  
  return rows.length > 0 ? rows[0] : null;
};

// Получить пользователя по ID
export const getUserById = async (id) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, login, role FROM users WHERE id = $1',
    [parseInt(id)]
  );
  
  return rows.length > 0 ? rows[0] : null;
};

// Получить задачу по ID
export const getTaskById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [parseInt(id)]);
  return rows.length > 0 ? rows[0] : null;
};

// Добавить файл к задаче
export const addAttachment = async (taskId, attachment) => {
  const task = await getTaskById(taskId);
  if (!task) return null;
  
  const attachments = task.attachments || [];
  attachments.push(attachment);
  
  await pool.query(
    'UPDATE tasks SET attachments = $1, updated_at = NOW() WHERE id = $2',
    [JSON.stringify(attachments), parseInt(taskId)]
  );
  
  return attachment;
};

// Удалить файл из задачи
export const deleteAttachment = async (taskId, attachmentId) => {
  const task = await getTaskById(taskId);
  if (!task) return null;
  
  const attachments = (task.attachments || []).filter(a => a.id !== attachmentId);
  
  await pool.query(
    'UPDATE tasks SET attachments = $1, updated_at = NOW() WHERE id = $2',
    [JSON.stringify(attachments), parseInt(taskId)]
  );
  
  return true;
};

// Добавить комментарий
export const addComment = async (taskId, comment) => {
  const { rows } = await pool.query(`
    INSERT INTO comments (task_id, text, user_id, user_name, created_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [
    parseInt(taskId),
    comment.text,
    comment.userId,
    comment.userName,
    comment.createdAt
  ]);
  
  await pool.query('UPDATE tasks SET updated_at = NOW() WHERE id = $1', [parseInt(taskId)]);
  
  return { ...comment, id: rows[0].id.toString() };
};

// Инициализируем БД при загрузке модуля
await initDb();
