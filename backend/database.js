import fs from 'fs';
import path from 'path';

const DB_FILE = 'database.json';

const initDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [
        { id: 1, name: 'Программист 1', email: 'dev1@example.com' },
        { id: 2, name: 'Программист 2', email: 'dev2@example.com' },
        { id: 3, name: 'Программист 3', email: 'dev3@example.com' },
        { id: 4, name: 'Программист 4', email: 'dev4@example.com' },
        { id: 5, name: 'Программист 5', email: 'dev5@example.com' }
      ],
      tasks: [],
      nextTaskId: 1
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  }
};

const readDb = () => {
  initDb();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
};

const writeDb = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

export const getUsers = () => {
  const db = readDb();
  return db.users;
};

export const getTasks = () => {
  const db = readDb();
  return db.tasks.map(task => {
    const createdBy = db.users.find(u => u.id === task.created_by);
    const assignedTo = db.users.find(u => u.id === task.assigned_to);
    return {
      ...task,
      created_by_name: createdBy ? createdBy.name : null,
      assigned_to_name: assignedTo ? assignedTo.name : null
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const createTask = (task) => {
  const db = readDb();
  const newTask = {
    id: db.nextTaskId++,
    title: task.title,
    description: task.description || '',
    status: task.status || 'open',
    priority: task.priority || 'medium',
    created_by: task.created_by,
    assigned_to: task.assigned_to || null,
    date: task.date || new Date().toISOString().split('T')[0],
    deadline: task.deadline || null,
    urgent: task.urgent || false,
    tags: task.tags || [],
    comments: task.comments || [],
    attachments: task.attachments || [],
    subtasks: task.subtasks || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.tasks.push(newTask);
  writeDb(db);
  return newTask.id;
};

export const updateTask = (id, updates) => {
  const db = readDb();
  const taskIndex = db.tasks.findIndex(t => t.id === parseInt(id));
  if (taskIndex === -1) return null;

  db.tasks[taskIndex] = {
    ...db.tasks[taskIndex],
    ...updates,
    id: db.tasks[taskIndex].id,
    created_at: db.tasks[taskIndex].created_at,
    updated_at: new Date().toISOString()
  };
  writeDb(db);
  return db.tasks[taskIndex];
};

export const deleteTask = (id) => {
  const db = readDb();
  db.tasks = db.tasks.filter(t => t.id !== parseInt(id));
  writeDb(db);
};
