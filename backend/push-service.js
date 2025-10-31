import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUBSCRIPTIONS_FILE = path.join(__dirname, 'subscriptions.json');

// VAPID ключи для production
const vapidKeys = {
  publicKey: 'BOHId4t-m4dpLCHFCEii0YwTGEAbrx2Yef7Gtu3bdq9KcAA5xnv_azpK3ysfmiIR89n9pltCQbmP7NpLWSa1I-k',
  privateKey: 'Vcxr0X9iazEY4klNnqPgsPEcCg8nVOigeZYLlXc9lOE'
};

// Настройка web-push
webpush.setVapidDetails(
  'mailto:admin@helpdesk.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Инициализация файла подписок
const initSubscriptions = () => {
  if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify({ subscriptions: [] }, null, 2));
  }
};

// Чтение подписок
const getSubscriptions = () => {
  initSubscriptions();
  const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
  return JSON.parse(data).subscriptions;
};

// Сохранение подписок
const saveSubscriptions = (subscriptions) => {
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify({ subscriptions }, null, 2));
};

// Добавить подписку
export const addSubscription = (subscription) => {
  const subscriptions = getSubscriptions();
  
  // Проверяем, нет ли уже такой подписки
  const exists = subscriptions.find(s => s.endpoint === subscription.endpoint);
  if (exists) {
    return false;
  }
  
  subscriptions.push({
    ...subscription,
    addedAt: new Date().toISOString()
  });
  
  saveSubscriptions(subscriptions);
  return true;
};

// Удалить подписку
export const removeSubscription = (subscription) => {
  let subscriptions = getSubscriptions();
  subscriptions = subscriptions.filter(s => s.endpoint !== subscription.endpoint);
  saveSubscriptions(subscriptions);
  return true;
};

// Отправить уведомление всем подписчикам
export const sendNotificationToAll = async (notification) => {
  const subscriptions = getSubscriptions();
  const payload = JSON.stringify(notification);
  
  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload);
        return { success: true, endpoint: subscription.endpoint };
      } catch (error) {
        console.error('Push failed:', error);
        
        // Если подписка невалидна (410 Gone), удаляем её
        if (error.statusCode === 410) {
          removeSubscription(subscription);
        }
        
        return { success: false, endpoint: subscription.endpoint, error: error.message };
      }
    })
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;
  
  return { total: results.length, successful, failed };
};

// Отправить уведомление конкретному пользователю (если в будущем привяжем подписки к пользователям)
export const sendNotificationToUser = async (userId, notification) => {
  // Пока отправляем всем, в будущем можно привязать подписки к userId
  return sendNotificationToAll(notification);
};

export default {
  addSubscription,
  removeSubscription,
  sendNotificationToAll,
  sendNotificationToUser
};

