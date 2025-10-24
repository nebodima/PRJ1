import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUsers, getTasks, createTask, updateTask, deleteTask, authenticateUser, getUserById } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Раздача статики frontend в production
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

app.post('/api/login', (req, res) => {
  try {
    const { login, password } = req.body;
    const user = authenticateUser(login, password);

    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', (req, res) => {
  try {
    const users = getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks', (req, res) => {
  try {
    const tasks = getTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const taskId = createTask(req.body);
    const tasks = getTasks();
    const newTask = tasks.find(t => t.id === taskId);
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  try {
    updateTask(req.params.id, req.body);
    const tasks = getTasks();
    const updatedTask = tasks.find(t => t.id === parseInt(req.params.id));
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    deleteTask(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Все остальные запросы отправляем на React приложение
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HelpDesk API запущен на http://localhost:${PORT}`);
});
