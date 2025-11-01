import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import { getUsers, getTasks, createTask, updateTask, deleteTask, authenticateUser, getUserById, addAttachment, deleteAttachment, getTaskById, addComment } from './database.js';
import { addSubscription, removeSubscription, sendNotificationToAll } from './push-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Создаем папку для uploads если её нет
// Если /data существует (Railway Volume) - используем его, иначе локальную папку
const uploadsDir = fs.existsSync('/data')
  ? '/data/uploads'
  : path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log(`✓ Uploads directory: ${uploadsDir}`);

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

app.post('/api/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    const user = await authenticateUser(login, password);

    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await getTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const taskId = await createTask(req.body);
    const tasks = await getTasks();
    const newTask = tasks.find(t => t.id === taskId);
    
    // Отправляем push-уведомление
    try {
      await sendNotificationToAll({
        title: '📋 Новая задача',
        body: `${newTask.title}`,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: `task-${taskId}`,
        data: { taskId, type: 'new_task' }
      });
    } catch (pushError) {
      console.error('Push notification failed:', pushError);
    }
    
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    await updateTask(req.params.id, req.body);
    const tasks = await getTasks();
    const updatedTask = tasks.find(t => t.id === parseInt(req.params.id));
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    // Получаем задачу перед удалением для доступа к файлам
    const task = await getTaskById(req.params.id);

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
    await deleteTask(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Загрузка файла к задаче
app.post('/api/tasks/:id/attachments', upload.single('file'), async (req, res) => {
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

    const result = await addAttachment(req.params.id, attachment);
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
app.delete('/api/tasks/:taskId/attachments/:attachmentId', async (req, res) => {
  try {
    const task = await getTaskById(req.params.taskId);
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

    await deleteAttachment(req.params.taskId, req.params.attachmentId);
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

// Push-уведомления: подписка
app.post('/api/push/subscribe', (req, res) => {
  try {
    const subscription = req.body;
    const added = addSubscription(subscription);
    
    if (added) {
      console.log('✓ New push subscription added');
      res.status(201).json({ success: true, message: 'Подписка добавлена' });
    } else {
      res.status(200).json({ success: true, message: 'Подписка уже существует' });
    }
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Push-уведомления: отписка
app.post('/api/push/unsubscribe', (req, res) => {
  try {
    const subscription = req.body;
    removeSubscription(subscription);
    console.log('✓ Push subscription removed');
    res.json({ success: true, message: 'Подписка удалена' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Push-уведомления: тестовая отправка
app.post('/api/push/test', async (req, res) => {
  try {
    const result = await sendNotificationToAll({
      title: 'Тестовое уведомление',
      body: 'Push-уведомления работают! 🎉',
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png'
    });
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Test push error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Добавление комментария к задаче
app.post('/api/tasks/:id/comments', async (req, res) => {
  try {
    const { text, userId } = req.body;
    if (!text || !userId) {
      return res.status(400).json({ error: 'Отсутствуют обязательные поля' });
    }

    const user = await getUserById(userId);
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

    const result = await addComment(req.params.id, comment);
    if (!result) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    // Отправляем push-уведомление
    try {
      const task = await getTaskById(req.params.id);
      await sendNotificationToAll({
        title: '💬 Новый комментарий',
        body: `${user.name}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: `comment-${req.params.id}`,
        data: { taskId: req.params.id, commentId: comment.id, type: 'new_comment' }
      });
    } catch (pushError) {
      console.error('Push notification failed:', pushError);
    }

    res.status(201).json(result);
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
  console.log(`✓ Push notifications enabled`);
});
