# 🔔 Push-уведомления HelpDesk

## ✅ Реализовано

Push-уведомления автоматически отправляются при:

### 📋 Создании новой задачи
- Все подписчики получают уведомление
- Показывается название задачи
- Клик по уведомлению открывает задачу

### 💬 Добавлении комментария
- Все подписчики получают уведомление
- Показывается автор и текст комментария
- Клик по уведомлению открывает задачу с комментарием

## 🚀 Как использовать

### 1. Включите уведомления в приложении

1. Откройте **http://localhost:5173**
2. Войдите в систему
3. Найдите иконку 🔔 в header (справа вверху)
4. Нажмите на неё
5. Разрешите уведомления в браузере

**Альтернативно:** Через несколько секунд появится промпт с предложением включить уведомления.

### 2. Тестирование

#### Автоматический тест
```bash
# Отправить тестовое уведомление
curl -X POST http://localhost:3000/api/push/test
```

#### Создайте задачу или комментарий
1. Создайте новую задачу → получите уведомление 📋
2. Добавьте комментарий → получите уведомление 💬
3. Кликните по уведомлению → откроется задача

## 📱 Поддержка браузеров

| Браузер | Desktop | Mobile | Примечания |
|---------|---------|--------|------------|
| Chrome | ✅ | ✅ | Полная поддержка |
| Edge | ✅ | ✅ | Полная поддержка |
| Safari | ✅ (16.4+) | ✅ (16.4+) | iOS 16.4+ обязательно |
| Firefox | ⚠️ | ✅ | Desktop limited |
| Samsung Internet | ✅ | ✅ | Полная поддержка |

## 🔧 Технические детали

### Архитектура

```
Frontend (React)
    ↓
[PushNotifications Component]
    ↓
Service Worker (sw.js)
    ↓
Backend API (/api/push/subscribe)
    ↓
Push Service (web-push)
    ↓
Push Server (VAPID)
    ↓
Notification API
```

### Файлы

```
backend/
├── push-service.js          # Логика отправки push
├── subscriptions.json       # Хранилище подписок
└── server.js               # API endpoints

frontend/
├── src/components/
│   └── PushNotifications.jsx  # UI компонент
├── public/
│   └── sw.js                 # Service Worker
└── src/App.jsx              # Интеграция
```

### API Endpoints

**POST /api/push/subscribe**
- Подписка на уведомления
- Сохраняет subscription в базе

**POST /api/push/unsubscribe**
- Отписка от уведомлений
- Удаляет subscription

**POST /api/push/test**
- Тестовая отправка уведомления
- Отправляет всем подписчикам

### VAPID Keys

Текущие ключи (замените для production):
- Public: `BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U`
- Private: хранится в `backend/push-service.js`

Для генерации новых ключей:
```javascript
const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();
console.log(vapidKeys);
```

## 🎯 Особенности реализации

### 1. Smart Prompts
- Автоматический промпт через 5 секунд
- Можно отложить на 7 дней
- Иконка в header для ручного включения

### 2. Automatic Notifications
- Отправка при создании задачи
- Отправка при добавлении комментария
- Graceful fallback если push не работает

### 3. Click Actions
- Клик по уведомлению открывает задачу
- Фокус на существующую вкладку если открыта
- Иначе открытие новой вкладки

### 4. Subscription Management
- Автоматическое удаление невалидных подписок
- Проверка дубликатов
- Хранение в JSON файле

## 🔐 Безопасность

- VAPID аутентификация
- userVisibleOnly: true (обязательно показывать уведомления)
- Проверка на сервере
- Автоматическая очистка невалидных подписок

## 📊 Мониторинг

### Просмотр подписок
```bash
cat backend/subscriptions.json
```

### Логи сервера
```bash
# Backend показывает:
✓ Push notifications enabled
✓ New push subscription added
✓ Push subscription removed
```

### DevTools
```
Application → Service Workers → Push
```

## 🚨 Troubleshooting

### Уведомления не приходят?

1. **Проверьте разрешения браузера**
   ```javascript
   console.log(Notification.permission);
   // Должно быть: "granted"
   ```

2. **Проверьте Service Worker**
   ```javascript
   navigator.serviceWorker.ready.then(reg => {
     reg.pushManager.getSubscription().then(sub => {
       console.log('Subscription:', sub);
     });
   });
   ```

3. **Проверьте backend**
   ```bash
   curl -X POST http://localhost:3000/api/push/test
   ```

4. **Проверьте подписки**
   ```bash
   cat backend/subscriptions.json
   # Должен содержать хотя бы одну подписку
   ```

### Service Worker не регистрируется?

1. Откройте DevTools → Application → Service Workers
2. Проверьте ошибки
3. Попробуйте Unregister → Обновить страницу

### iOS не работает?

- Требуется iOS 16.4 или новее
- Приложение должно быть добавлено на Home Screen
- Работает только в Safari

## 🎨 Кастомизация

### Изменить иконки уведомлений
Отредактируйте в `backend/server.js`:
```javascript
icon: '/icon-192x192.png',
badge: '/icon-72x72.png'
```

### Изменить текст уведомлений
В `backend/server.js` найдите:
```javascript
await sendNotificationToAll({
  title: '📋 Новая задача',  // <-- здесь
  body: `${newTask.title}`    // <-- и здесь
});
```

### Добавить вибрацию
В `frontend/public/sw.js`:
```javascript
vibrate: [200, 100, 200, 100, 200]  // паттерн вибрации
```

### Добавить действия
```javascript
actions: [
  { action: 'view', title: 'Открыть' },
  { action: 'close', title: 'Закрыть' }
]
```

## 📈 Будущие улучшения

- [ ] Персональные подписки (для конкретных пользователей)
- [ ] Настройки фильтров (только мои задачи, только высокий приоритет)
- [ ] Группировка уведомлений
- [ ] Rich notifications (с картинками)
- [ ] Звуковые уведомления
- [ ] Desktop badges (счётчик на иконке)
- [ ] Push-уведомления о дедлайнах

## 📚 Полезные ссылки

- [Push API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [web-push library](https://github.com/web-push-libs/web-push)
- [VAPID spec](https://datatracker.ietf.org/doc/html/rfc8292)

---

**Версия:** 1.0.1  
**Дата:** 2025-10-31  
**Статус:** ✅ Production Ready

