import pg from 'pg';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Определяем какую БД использовать
const USE_POSTGRES = !!process.env.DATABASE_URL;
let pool = null;
let sqliteDb = null;
let DB_PATH = null;

if (USE_POSTGRES) {
  console.log('✓ Using PostgreSQL');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  console.log('✓ Using SQLite (fallback)');
  // Определяем путь для SQLite
  if (fs.existsSync('/data')) {
    DB_PATH = '/data/helpdesk.db';
  } else {
    DB_PATH = path.join(__dirname, 'helpdesk.db');
  }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

const initDb = async () => {
  if (USE_POSTGRES) {
    await initPostgres();
  } else {
    await initSqlite();
  }
};

const initPostgres = async () => {
  try {
    // Создаем таблицы
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
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM users');
    
    if (parseInt(rows[0].count) === 0) {
      const users = [
        { name: 'Admin', email: 'admin@helpdesk.com', login: 'Admin', password: '19822503', role: 'admin' },
        { name: 'Николай', email: 'nikolay@example.com', login: 'Николай', password: '123', role: 'user' },
        { name: 'Алексей', email: 'alexey@example.com', login: 'Алексей', password: '123', role: 'user' },
        { name: 'Дмитрий', email: 'dmitry@example.com', login: 'Дмитрий', password: '123', role: 'user' },
        { name: 'Антон', email: 'anton@example.com', login: 'Антон', password: '123', role: 'user' },
        { name: 'Слава', email: 'slava@example.com', login: 'Слава', password: '123', role: 'user' }
      ];
      
      for (const user of users) {
        await pool.query(
          'INSERT INTO users (name, email, login, password, role) VALUES ($1, $2, $3, $4, $5)',
          [user.name, user.email, user.login, user.password, user.role]
        );
      }
      
      console.log('✓ Initial users created');
    }
    
    console.log('✓ PostgreSQL ready');
  } catch (error) {
    console.error('PostgreSQL initialization error:', error);
    throw error;
  }
};

const initSqlite = async () => {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    sqliteDb = new SQL.Database(buffer);
    console.log(`✓ SQLite loaded from ${DB_PATH}`);
  } else {
    sqliteDb = new SQL.Database();
    console.log('✓ Creating new SQLite database');
    
    // Создаем таблицы
    sqliteDb.run(`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT, login TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'user')`);
    sqliteDb.run(`CREATE TABLE tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, status TEXT DEFAULT 'open', priority TEXT DEFAULT 'medium', created_by INTEGER NOT NULL, assigned_to INTEGER, date TEXT, deadline TEXT, urgent INTEGER DEFAULT 0, tags TEXT, attachments TEXT, subtasks TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (created_by) REFERENCES users(id), FOREIGN KEY (assigned_to) REFERENCES users(id))`);
    sqliteDb.run(`CREATE TABLE comments (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL, text TEXT NOT NULL, user_id INTEGER NOT NULL, user_name TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id))`);
    
    // Вставляем пользователей
    const users = [
      { id: 1, name: 'Admin', email: 'admin@helpdesk.com', login: 'Admin', password: '19822503', role: 'admin' },
      { id: 2, name: 'Николай', email: 'nikolay@example.com', login: 'Николай', password: '123', role: 'user' },
      { id: 3, name: 'Алексей', email: 'alexey@example.com', login: 'Алексей', password: '123', role: 'user' },
      { id: 4, name: 'Дмитрий', email: 'dmitry@example.com', login: 'Дмитрий', password: '123', role: 'user' },
      { id: 5, name: 'Антон', email: 'anton@example.com', login: 'Антон', password: '123', role: 'user' },
      { id: 6, name: 'Слава', email: 'slava@example.com', login: 'Слава', password: '123', role: 'user' }
    ];
    
    const stmt = sqliteDb.prepare('INSERT INTO users (id, name, email, login, password, role) VALUES (?, ?, ?, ?, ?, ?)');
    users.forEach(u => stmt.run([u.id, u.name, u.email, u.login, u.password, u.role]));
    stmt.free();
    
    saveSqliteDb();
    console.log('✓ SQLite schema created');
  }
};

const saveSqliteDb = () => {
  if (!sqliteDb) return;
  const data = sqliteDb.export();
  fs.writeFileSync(DB_PATH, data);
};

// ==================== ПОЛЬЗОВАТЕЛИ ====================

export const getUsers = async () => {
  if (USE_POSTGRES) {
    const { rows } = await pool.query('SELECT id, name, email, login, role FROM users ORDER BY id');
    return rows;
  } else {
    const result = sqliteDb.exec('SELECT id, name, email, login, role FROM users');
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const user = {};
      columns.forEach((col, i) => { user[col] = row[i]; });
      return user;
    });
  }
};

export const authenticateUser = async (login, password) => {
  if (USE_POSTGRES) {
    const { rows } = await pool.query(
      'SELECT id, name, email, login, role FROM users WHERE login = $1 AND password = $2',
      [login, password]
    );
    return rows.length > 0 ? rows[0] : null;
  } else {
    const result = sqliteDb.exec('SELECT id, name, email, login, role FROM users WHERE login = ? AND password = ?', [login, password]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    const columns = result[0].columns;
    const row = result[0].values[0];
    const user = {};
    columns.forEach((col, i) => { user[col] = row[i]; });
    return user;
  }
};

export const getUserById = async (id) => {
  if (USE_POSTGRES) {
    const { rows } = await pool.query('SELECT id, name, email, login, role FROM users WHERE id = $1', [parseInt(id)]);
    return rows.length > 0 ? rows[0] : null;
  } else {
    const result = sqliteDb.exec('SELECT id, name, email, login, role FROM users WHERE id = ?', [parseInt(id)]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    const columns = result[0].columns;
    const row = result[0].values[0];
    const user = {};
    columns.forEach((col, i) => { user[col] = row[i]; });
    return user;
  }
};

// ==================== ЗАДАЧИ ====================

export const getTasks = async () => {
  if (USE_POSTGRES) {
    const { rows } = await pool.query(`
      SELECT t.*, u1.name as created_by_name, u2.name as assigned_to_name
      FROM tasks t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      ORDER BY t.created_at DESC
    `);
    
    for (const task of rows) {
      const { rows: comments } = await pool.query(
        'SELECT id, text, user_id as "userId", user_name as "userName", created_at as "createdAt" FROM comments WHERE task_id = $1 ORDER BY created_at ASC',
        [task.id]
      );
      task.comments = comments.map(c => ({ ...c, createdAt: c.createdAt.toISOString() }));
    }
    
    return rows;
  } else {
    const result = sqliteDb.exec(`
      SELECT t.*, u1.name as created_by_name, u2.name as assigned_to_name
      FROM tasks t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      ORDER BY t.created_at DESC
    `);
    
    if (result.length === 0) return [];
    
    const columns = result[0].columns;
    const tasks = result[0].values.map(row => {
      const task = {};
      columns.forEach((col, i) => { task[col] = row[i]; });
      task.tags = task.tags ? JSON.parse(task.tags) : [];
      task.attachments = task.attachments ? JSON.parse(task.attachments) : [];
      task.subtasks = task.subtasks ? JSON.parse(task.subtasks) : [];
      task.urgent = task.urgent === 1;
      return task;
    });
    
    for (const task of tasks) {
      const commentResult = sqliteDb.exec('SELECT id, text, user_id as userId, user_name as userName, created_at as createdAt FROM comments WHERE task_id = ? ORDER BY created_at ASC', [task.id]);
      if (commentResult.length > 0) {
        const cols = commentResult[0].columns;
        task.comments = commentResult[0].values.map(row => {
          const comment = {};
          cols.forEach((col, i) => { comment[col] = row[i]; });
          return comment;
        });
      } else {
        task.comments = [];
      }
    }
    
    return tasks;
  }
};

export const createTask = async (task) => {
  if (USE_POSTGRES) {
    const { rows } = await pool.query(`
      INSERT INTO tasks (title, description, status, priority, created_by, assigned_to, date, deadline, urgent, tags, attachments, subtasks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id
    `, [
      task.title, task.description || '', task.status || 'open', task.priority || 'medium',
      task.created_by, task.assigned_to || null, task.date || new Date().toISOString().split('T')[0],
      task.deadline || null, task.urgent || false, JSON.stringify(task.tags || []),
      JSON.stringify(task.attachments || []), JSON.stringify(task.subtasks || [])
    ]);
    return rows[0].id;
  } else {
    const now = new Date().toISOString();
    const stmt = sqliteDb.prepare('INSERT INTO tasks (title, description, status, priority, created_by, assigned_to, date, deadline, urgent, tags, attachments, subtasks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run([task.title, task.description || '', task.status || 'open', task.priority || 'medium', task.created_by, task.assigned_to || null, task.date || new Date().toISOString().split('T')[0], task.deadline || null, task.urgent ? 1 : 0, JSON.stringify(task.tags || []), JSON.stringify(task.attachments || []), JSON.stringify(task.subtasks || []), now, now]);
    stmt.free();
    const result = sqliteDb.exec('SELECT last_insert_rowid()');
    const taskId = result[0].values[0][0];
    saveSqliteDb();
    return taskId;
  }
};

export const updateTask = async (id, updates) => {
  if (USE_POSTGRES) {
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
      await pool.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = $${paramCount}`, values);
    }
  } else {
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
    
    if (fields.length > 1) {
      sqliteDb.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
      saveSqliteDb();
    }
  }
  
  return true;
};

export const deleteTask = async (id) => {
  if (USE_POSTGRES) {
    await pool.query('DELETE FROM tasks WHERE id = $1', [parseInt(id)]);
  } else {
    sqliteDb.run('DELETE FROM tasks WHERE id = ?', [parseInt(id)]);
    sqliteDb.run('DELETE FROM comments WHERE task_id = ?', [parseInt(id)]);
    saveSqliteDb();
  }
};

export const getTaskById = async (id) => {
  if (USE_POSTGRES) {
    const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [parseInt(id)]);
    return rows.length > 0 ? rows[0] : null;
  } else {
    const result = sqliteDb.exec('SELECT * FROM tasks WHERE id = ?', [parseInt(id)]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    const columns = result[0].columns;
    const row = result[0].values[0];
    const task = {};
    columns.forEach((col, i) => { task[col] = row[i]; });
    task.tags = task.tags ? JSON.parse(task.tags) : [];
    task.attachments = task.attachments ? JSON.parse(task.attachments) : [];
    task.subtasks = task.subtasks ? JSON.parse(task.subtasks) : [];
    task.urgent = task.urgent === 1;
    return task;
  }
};

// ==================== ФАЙЛЫ ====================

export const addAttachment = async (taskId, attachment) => {
  const task = await getTaskById(taskId);
  if (!task) return null;
  
  const attachments = task.attachments || [];
  attachments.push(attachment);
  
  if (USE_POSTGRES) {
    await pool.query('UPDATE tasks SET attachments = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(attachments), parseInt(taskId)]);
  } else {
    sqliteDb.run('UPDATE tasks SET attachments = ?, updated_at = ? WHERE id = ?', [JSON.stringify(attachments), new Date().toISOString(), parseInt(taskId)]);
    saveSqliteDb();
  }
  
  return attachment;
};

export const deleteAttachment = async (taskId, attachmentId) => {
  const task = await getTaskById(taskId);
  if (!task) return null;
  
  const attachments = (task.attachments || []).filter(a => a.id !== attachmentId);
  
  if (USE_POSTGRES) {
    await pool.query('UPDATE tasks SET attachments = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(attachments), parseInt(taskId)]);
  } else {
    sqliteDb.run('UPDATE tasks SET attachments = ?, updated_at = ? WHERE id = ?', [JSON.stringify(attachments), new Date().toISOString(), parseInt(taskId)]);
    saveSqliteDb();
  }
  
  return true;
};

// ==================== КОММЕНТАРИИ ====================

export const addComment = async (taskId, comment) => {
  if (USE_POSTGRES) {
    const { rows } = await pool.query(`
      INSERT INTO comments (task_id, text, user_id, user_name, created_at)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `, [parseInt(taskId), comment.text, comment.userId, comment.userName, comment.createdAt]);
    
    await pool.query('UPDATE tasks SET updated_at = NOW() WHERE id = $1', [parseInt(taskId)]);
    return { ...comment, id: rows[0].id.toString() };
  } else {
    const stmt = sqliteDb.prepare('INSERT INTO comments (task_id, text, user_id, user_name, created_at) VALUES (?, ?, ?, ?, ?)');
    stmt.run([parseInt(taskId), comment.text, comment.userId, comment.userName, comment.createdAt]);
    stmt.free();
    const result = sqliteDb.exec('SELECT last_insert_rowid()');
    const commentId = result[0].values[0][0];
    sqliteDb.run('UPDATE tasks SET updated_at = ? WHERE id = ?', [new Date().toISOString(), parseInt(taskId)]);
    saveSqliteDb();
    return { ...comment, id: commentId.toString() };
  }
};

// Инициализируем БД при загрузке модуля
await initDb();
