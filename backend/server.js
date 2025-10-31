import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import { getUsers, getTasks, createTask, updateTask, deleteTask, authenticateUser, getUserById, addAttachment, deleteAttachment, getTaskById, addComment } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Создаем папку для uploads если её нет
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Настройка Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

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
    // Получаем задачу перед удалением для доступа к файлам
    const task = getTaskById(req.params.id);

    if (task && task.attachments && task.attachments.length > 0) {
      // Удаляем все физические файлы задачи
      task.attachments.forEach(attachment => {
        const filePath = path.join(uploadsDir, attachment.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`✓ Deleted file: ${attachment.filename}`);
          } catch (err) {
            console.error(`✗ Error deleting file ${attachment.filename}:`, err);
          }
        }
      });
    }

    // Удаляем задачу из базы данных
    deleteTask(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Загрузка файла к задаче
app.post('/api/tasks/:id/attachments', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const attachment = {
      id: Date.now().toString(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadDate: new Date().toISOString()
    };

    const result = addAttachment(req.params.id, attachment);
    if (!result) {
      // Удаляем файл если задача не найдена
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    res.status(201).json(attachment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Удаление файла из задачи
app.delete('/api/tasks/:taskId/attachments/:attachmentId', (req, res) => {
  try {
    const task = getTaskById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    const attachment = task.attachments.find(a => a.id === req.params.attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    // Удаляем физический файл
    const filePath = path.join(uploadsDir, attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    deleteAttachment(req.params.taskId, req.params.attachmentId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Скачивание файла
app.get('/api/uploads/:filename', (req, res) => {
  try {
    const filePath = path.join(uploadsDir, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Добавление комментария к задаче
app.post('/api/tasks/:id/comments', (req, res) => {
  try {
    const { text, userId } = req.body;
    if (!text || !userId) {
      return res.status(400).json({ error: 'Отсутствуют обязательные поля' });
    }

    const user = getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const comment = {
      id: Date.now().toString(),
      text,
      userId,
      userName: user.name,
      createdAt: new Date().toISOString()
    };

    const result = addComment(req.params.id, comment);
    if (!result) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    res.status(201).json(comment);
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
  console.log(`✓ File uploads enabled (max 10MB) at ${uploadsDir}`);
});
