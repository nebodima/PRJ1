import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Определяем путь к БД
// Если /data существует (Railway Volume смонтирован) - используем его
// Иначе - локальная папка
let DB_PATH;
if (fs.existsSync('/data')) {
  DB_PATH = '/data/helpdesk.db';
  console.log('✓ Using Railway Volume: /data/helpdesk.db');
} else {
  DB_PATH = path.join(__dirname, 'helpdesk.db');
  console.log('⚠ Volume not found, using local: backend/helpdesk.db');
}

let db = null;

// Инициализация БД
const initDb = async () => {
  const SQL = await initSqlJs();
  
  // Загружаем существующую БД или создаем новую
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('✓ SQLite database loaded from file');
  } else {
    db = new SQL.Database();
    console.log('✓ Creating new SQLite database');
    
    // Создаем таблицы
    db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        login TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user'
      )
    `);
    
    db.run(`
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'open',
        priority TEXT DEFAULT 'medium',
        created_by INTEGER NOT NULL,
        assigned_to INTEGER,
        date TEXT,
        deadline TEXT,
        urgent INTEGER DEFAULT 0,
        tags TEXT,
        attachments TEXT,
        subtasks TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (assigned_to) REFERENCES users(id)
      )
    `);
    
    db.run(`
      CREATE TABLE comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    // Вставляем начальных пользователей
    const users = [
      { id: 1, name: 'Admin', email: 'admin@helpdesk.com', login: 'Admin', password: '19822503', role: 'admin' },
      { id: 2, name: 'Николай', email: 'nikolay@example.com', login: 'Николай', password: '123', role: 'user' },
      { id: 3, name: 'Алексей', email: 'alexey@example.com', login: 'Алексей', password: '123', role: 'user' },
      { id: 4, name: 'Дмитрий', email: 'dmitry@example.com', login: 'Дмитрий', password: '123', role: 'user' },
      { id: 5, name: 'Антон', email: 'anton@example.com', login: 'Антон', password: '123', role: 'user' },
      { id: 6, name: 'Слава', email: 'slava@example.com', login: 'Слава', password: '123', role: 'user' }
    ];
    
    const stmt = db.prepare('INSERT INTO users (id, name, email, login, password, role) VALUES (?, ?, ?, ?, ?, ?)');
    users.forEach(u => stmt.run([u.id, u.name, u.email, u.login, u.password, u.role]));
    stmt.free();
    
    saveDb();
    console.log('✓ Database schema created and users inserted');
  }
};

// Сохранение БД в файл
const saveDb = () => {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, data);
};

// Получить пользователей
export const getUsers = async () => {
  if (!db) await initDb();
  const result = db.exec('SELECT id, name, email, login, role FROM users');
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const user = {};
    columns.forEach((col, i) => { user[col] = row[i]; });
    return user;
  });
};

// Получить задачи с именами пользователей
export const getTasks = async () => {
  if (!db) await initDb();
  
  const result = db.exec(`
    SELECT 
      t.*,
      u1.name as created_by_name,
      u2.name as assigned_to_name
    FROM tasks t
    LEFT JOIN users u1 ON t.created_by = u1.id
    LEFT JOIN users u2 ON t.assigned_to = u2.id
    ORDER BY t.created_at DESC
  `);
  
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  const tasks = result[0].values.map(row => {
    const task = {};
    columns.forEach((col, i) => { 
      task[col] = row[i]; 
    });
    
    // Парсим JSON поля
    task.tags = task.tags ? JSON.parse(task.tags) : [];
    task.attachments = task.attachments ? JSON.parse(task.attachments) : [];
    task.subtasks = task.subtasks ? JSON.parse(task.subtasks) : [];
    task.urgent = task.urgent === 1;
    
    return task;
  });
  
  // Добавляем комментарии к каждой задаче
  for (const task of tasks) {
    const comments = await getCommentsByTaskId(task.id);
    task.comments = comments;
  }
  
  return tasks;
};

// Получить комментарии задачи
const getCommentsByTaskId = async (taskId) => {
  if (!db) await initDb();
  
  const result = db.exec(`
    SELECT id, text, user_id as userId, user_name as userName, created_at as createdAt
    FROM comments
    WHERE task_id = ?
    ORDER BY created_at ASC
  `, [taskId]);
  
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const comment = {};
    columns.forEach((col, i) => { comment[col] = row[i]; });
    return comment;
  });
};

// Создать задачу
export const createTask = async (task) => {
  if (!db) await initDb();
  
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO tasks (
      title, description, status, priority, created_by, assigned_to,
      date, deadline, urgent, tags, attachments, subtasks,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run([
    task.title,
    task.description || '',
    task.status || 'open',
    task.priority || 'medium',
    task.created_by,
    task.assigned_to || null,
    task.date || new Date().toISOString().split('T')[0],
    task.deadline || null,
    task.urgent ? 1 : 0,
    JSON.stringify(task.tags || []),
    JSON.stringify(task.attachments || []),
    JSON.stringify(task.subtasks || []),
    now,
    now
  ]);
  stmt.free();
  
  const result = db.exec('SELECT last_insert_rowid()');
  const taskId = result[0].values[0][0];
  
  saveDb();
  return taskId;
};

// Обновить задачу
export const updateTask = async (id, updates) => {
  if (!db) await initDb();
  
  const fields = [];
  const values = [];
  
  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.priority !== undefined) { fields.push('priority = ?'); values.push(updates.priority); }
  if (updates.created_by !== undefined) { fields.push('created_by = ?'); values.push(updates.created_by); }
  if (updates.assigned_to !== undefined) { fields.push('assigned_to = ?'); values.push(updates.assigned_to); }
  if (updates.date !== undefined) { fields.push('date = ?'); values.push(updates.date); }
  if (updates.deadline !== undefined) { fields.push('deadline = ?'); values.push(updates.deadline); }
  if (updates.urgent !== undefined) { fields.push('urgent = ?'); values.push(updates.urgent ? 1 : 0); }
  if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
  if (updates.attachments !== undefined) { fields.push('attachments = ?'); values.push(JSON.stringify(updates.attachments)); }
  if (updates.subtasks !== undefined) { fields.push('subtasks = ?'); values.push(JSON.stringify(updates.subtasks)); }
  
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(parseInt(id));
  
  if (fields.length > 1) { // > 1 потому что updated_at всегда есть
    db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDb();
  }
  
  return true;
};

// Удалить задачу
export const deleteTask = async (id) => {
  if (!db) await initDb();
  db.run('DELETE FROM tasks WHERE id = ?', [parseInt(id)]);
  db.run('DELETE FROM comments WHERE task_id = ?', [parseInt(id)]);
  saveDb();
};

// Аутентификация
export const authenticateUser = async (login, password) => {
  if (!db) await initDb();
  
  const result = db.exec('SELECT id, name, email, login, role FROM users WHERE login = ? AND password = ?', [login, password]);
  
  if (result.length === 0 || result[0].values.length === 0) return null;
  
  const columns = result[0].columns;
  const row = result[0].values[0];
  const user = {};
  columns.forEach((col, i) => { user[col] = row[i]; });
  
  return user;
};

// Получить пользователя по ID
export const getUserById = async (id) => {
  if (!db) await initDb();
  
  const result = db.exec('SELECT id, name, email, login, role FROM users WHERE id = ?', [parseInt(id)]);
  
  if (result.length === 0 || result[0].values.length === 0) return null;
  
  const columns = result[0].columns;
  const row = result[0].values[0];
  const user = {};
  columns.forEach((col, i) => { user[col] = row[i]; });
  
  return user;
};

// Получить задачу по ID
export const getTaskById = async (id) => {
  if (!db) await initDb();
  
  const result = db.exec('SELECT * FROM tasks WHERE id = ?', [parseInt(id)]);
  
  if (result.length === 0 || result[0].values.length === 0) return null;
  
  const columns = result[0].columns;
  const row = result[0].values[0];
  const task = {};
  columns.forEach((col, i) => { task[col] = row[i]; });
  
  // Парсим JSON поля
  task.tags = task.tags ? JSON.parse(task.tags) : [];
  task.attachments = task.attachments ? JSON.parse(task.attachments) : [];
  task.subtasks = task.subtasks ? JSON.parse(task.subtasks) : [];
  task.urgent = task.urgent === 1;
  
  return task;
};

// Добавить файл к задаче
export const addAttachment = async (taskId, attachment) => {
  if (!db) await initDb();
  
  const task = await getTaskById(taskId);
  if (!task) return null;
  
  const attachments = task.attachments || [];
  attachments.push(attachment);
  
  db.run(
    'UPDATE tasks SET attachments = ?, updated_at = ? WHERE id = ?',
    [JSON.stringify(attachments), new Date().toISOString(), parseInt(taskId)]
  );
  
  saveDb();
  return attachment;
};

// Удалить файл из задачи
export const deleteAttachment = async (taskId, attachmentId) => {
  if (!db) await initDb();
  
  const task = await getTaskById(taskId);
  if (!task) return null;
  
  const attachments = (task.attachments || []).filter(a => a.id !== attachmentId);
  
  db.run(
    'UPDATE tasks SET attachments = ?, updated_at = ? WHERE id = ?',
    [JSON.stringify(attachments), new Date().toISOString(), parseInt(taskId)]
  );
  
  saveDb();
  return true;
};

// Добавить комментарий
export const addComment = async (taskId, comment) => {
  if (!db) await initDb();
  
  const stmt = db.prepare(`
    INSERT INTO comments (task_id, text, user_id, user_name, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run([
    parseInt(taskId),
    comment.text,
    comment.userId,
    comment.userName,
    comment.createdAt
  ]);
  stmt.free();
  
  const result = db.exec('SELECT last_insert_rowid()');
  const commentId = result[0].values[0][0];
  
  db.run('UPDATE tasks SET updated_at = ? WHERE id = ?', [new Date().toISOString(), parseInt(taskId)]);
  
  saveDb();
  return { ...comment, id: commentId.toString() };
};

// Инициализируем БД при загрузке модуля
await initDb();

console.log('✓ SQLite database ready');

