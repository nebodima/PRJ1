# Миграция на SQLite

## ✅ Выполнено

Проект переведен с JSON на **SQLite** базу данных для надежности и производительности.

## Что изменилось

### Backend
- ✅ Установлен **sql.js** (SQLite на JavaScript)
- ✅ Переписан `backend/database.js` для работы с SQLite
- ✅ Создана схема БД: `users`, `tasks`, `comments`
- ✅ Все данные мигрированы из JSON
- ✅ Обновлен `server.js` - все функции async

### Файлы БД
- `backend/helpdesk.db` - основная база данных SQLite
- `backend/database.json.backup` - резервная копия старых данных
- `backend/migrate-to-sqlite.js` - скрипт миграции

### Преимущества SQLite

✅ **Персистентность** - данные сохраняются при редеплое (с Railway Volume)  
✅ **Конкурентность** - безопасная работа 10 пользователей  
✅ **Транзакции** - целостность данных при сбоях  
✅ **Производительность** - SQL запросы быстрее JSON  
✅ **Масштабируемость** - готов к росту  

## Railway деплой

### ⚠️ ВАЖНО! Настройте Volume ПЕРЕД деплоем:

### 1. В Railway Dashboard:

1. Откройте ваш проект
2. Перейдите в **Settings** → **Volumes**
3. Нажмите **+ New Volume**:
   - **Mount Path**: `/data`
   - **Name**: `helpdesk-data`
4. **Deploy** → редеплойте проект

### 2. Автоматическая настройка через railway.json:

```json
"volumes": [
  {
    "name": "helpdesk-data",
    "mountPath": "/data"
  }
]
```

Railway автоматически создаст Volume при деплое.

### Что хранится в Volume `/data`:

- `/data/helpdesk.db` - SQLite база данных
- `/data/uploads/` - загруженные файлы

**БЕЗ Volume все данные будут стираться при каждом редеплое!**

## Локальная разработка

База создается автоматически при первом запуске. Если нужно мигрировать данные:

```bash
cd backend
node migrate-to-sqlite.js
```

## Структура БД

### Таблица users
- id, name, email, login, password, role

### Таблица tasks
- id, title, description, status, priority
- created_by, assigned_to, date, deadline, urgent
- tags (JSON), attachments (JSON), subtasks (JSON)
- created_at, updated_at

### Таблица comments
- id, task_id, text, user_id, user_name, created_at

## Откат на JSON (если нужно)

```bash
cd backend
mv database.js database-sqlite.js
mv database-json.js.backup database.js
```

## Бэкапы

База автоматически сохраняется в файл после каждого изменения.

Рекомендуется делать бэкапы:
```bash
cp backend/helpdesk.db backend/helpdesk.db.backup
```

