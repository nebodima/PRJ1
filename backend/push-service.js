import webpush from 'web-push';
import { getPushSubscriptions, addPushSubscription, removePushSubscription } from './database.js';

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

// Добавить подписку
export const addSubscription = async (subscription) => {
  return await addPushSubscription(subscription);
};

// Удалить подписку
export const removeSubscription = async (subscription) => {
  return await removePushSubscription(subscription.endpoint);
};

// Отправить уведомление всем подписчикам
export const sendNotificationToAll = async (notification) => {
  const subscriptions = await getPushSubscriptions();
  const payload = JSON.stringify(notification);
  
  console.log(`📤 Отправка уведомления ${subscriptions.length} подписчикам`);
  
  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload);
        return { success: true, endpoint: subscription.endpoint };
      } catch (error) {
        console.error('Push failed:', error);
        
        // Если подписка невалидна (410 Gone), удаляем её
        if (error.statusCode === 410) {
          await removeSubscription(subscription);
        }
        
        return { success: false, endpoint: subscription.endpoint, error: error.message };
      }
    })
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;
  
  console.log(`✓ Отправлено: ${successful}, ошибок: ${failed}`);
  
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

