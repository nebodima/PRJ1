# Деплой HelpDesk на Reg.ru VPS с Docker

## Преимущества Docker деплоя:
- ✅ Один файл конфигурации (docker-compose.yml)
- ✅ Автоматическая установка всех зависимостей
- ✅ Простое обновление: `git pull && docker-compose up -d --build`
- ✅ Изоляция приложения
- ✅ Встроенный Nginx для проксирования

---

## Шаг 1: Заказ VPS на Reg.ru

1. Зайдите на [reg.ru](https://www.reg.ru/vps/) → **Облачные серверы**
2. Выберите минимальную конфигурацию (~300₽/мес)
3. **ВАЖНО:** При заказе выберите шаблон **"Docker"** или **"Ubuntu 20.04/22.04"**
4. Дождитесь письма с данными доступа (IP, root пароль)

---

## Шаг 2: Подключение к серверу

```bash
ssh root@ваш-ip-адрес
# Введите пароль из письма
```

---

## Шаг 3: Установка Docker (если не установлен)

```bash
# Обновить систему
apt update && apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установить Docker Compose
apt install docker-compose -y

# Проверить установку
docker --version
docker-compose --version
```

---

## Шаг 4: Установка Git и клонирование проекта

```bash
# Установить Git (если нет)
apt install git -y

# Создать директорию для проектов
mkdir -p /var/www
cd /var/www

# Клонировать проект с GitHub
git clone https://github.com/nebodima/PRJ1.git
cd PRJ1

# Переключиться на рабочую ветку
git checkout claude/add-authentication-011CUSXPXi7Uq6KsxZX5vKBZ
```

---

## Шаг 5: Настройка домена в nginx.conf

```bash
# Отредактировать nginx.conf
nano nginx.conf

# Замените 'ваш-домен.ru' на ваш настоящий домен
# Например: helpdesk.example.ru

# Сохраните: Ctrl+O, Enter, Ctrl+X
```

---

## Шаг 6: Запуск приложения с Docker Compose

```bash
# Собрать и запустить контейнеры
docker-compose up -d --build

# Проверить статус контейнеров
docker-compose ps

# Посмотреть логи
docker-compose logs -f

# Если всё ОК, нажмите Ctrl+C для выхода из логов
```

**Что происходит:**
1. Docker собирает образ приложения (устанавливает Node.js, зависимости, собирает frontend)
2. Запускает контейнер с приложением на порту 3000
3. Запускает Nginx на портах 80/443 и проксирует запросы к приложению

---

## Шаг 7: Настройка DNS на Reg.ru

1. Зайдите в [reg.ru](https://www.reg.ru) → **Домены** → Ваш домен
2. Перейдите в **DNS-серверы и зона**
3. Добавьте/измените **A-записи**:

   | Имя | Тип | Значение |
   |-----|-----|----------|
   | `@` или пусто | A | `IP-вашего-VPS` |
   | `www` | A | `IP-вашего-VPS` |

4. Сохраните изменения
5. Подождите 15-60 минут (распространение DNS)

---

## Шаг 8: Проверка работы

Откройте в браузере: `http://ваш-домен.ru`

Вы должны увидеть страницу логина HelpDesk с темной темой Claude AI!

**Тестовые учетные данные:**
- Администратор: `Admin` / `19822503`
- Пользователи: `Николай`, `Алексей`, `Дмитрий`, `Антон`, `Слава` / `123`

---

## Шаг 9: Настройка SSL (HTTPS) с Let's Encrypt

```bash
# Остановить Nginx для получения сертификата
docker-compose stop nginx

# Установить Certbot
apt install certbot -y

# Получить SSL сертификат
certbot certonly --standalone -d ваш-домен.ru -d www.ваш-домен.ru

# Создать директорию для сертификатов
mkdir -p /var/www/PRJ1/ssl

# Скопировать сертификаты
cp /etc/letsencrypt/live/ваш-домен.ru/fullchain.pem /var/www/PRJ1/ssl/
cp /etc/letsencrypt/live/ваш-домен.ru/privkey.pem /var/www/PRJ1/ssl/

# Дать права на чтение
chmod 644 /var/www/PRJ1/ssl/*.pem

# Раскомментировать HTTPS секцию в nginx.conf
nano nginx.conf
# Раскомментируйте секцию '# HTTPS Server' и '# HTTP Server - redirect to HTTPS'
# Закомментируйте старую HTTP секцию без редиректа

# Перезапустить контейнеры
docker-compose up -d

# Настроить автообновление сертификата
echo "0 0 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/ваш-домен.ru/*.pem /var/www/PRJ1/ssl/ && docker-compose -f /var/www/PRJ1/docker-compose.yml restart nginx" | crontab -
```

Теперь ваш сайт доступен по HTTPS: `https://ваш-домен.ru` 🔒

---

## Управление приложением

### Посмотреть логи
```bash
cd /var/www/PRJ1
docker-compose logs -f
```

### Перезапустить приложение
```bash
docker-compose restart
```

### Остановить приложение
```bash
docker-compose down
```

### Обновить код из GitHub
```bash
cd /var/www/PRJ1
git pull
docker-compose up -d --build
```

### Посмотреть статус контейнеров
```bash
docker-compose ps
```

### Очистить старые образы (освободить место)
```bash
docker system prune -a
```

---

## Решение проблем

### Приложение не запускается
```bash
# Проверить логи
docker-compose logs app

# Пересобрать контейнер
docker-compose up -d --build --force-recreate
```

### Nginx выдает ошибку 502
```bash
# Проверить, что приложение работает
docker-compose ps
docker-compose logs app

# Перезапустить Nginx
docker-compose restart nginx
```

### Не могу подключиться к серверу
```bash
# Проверить firewall
ufw status
ufw allow 80
ufw allow 443
ufw allow 22
```

### Не обновляется код
```bash
# Очистить кеш Docker и пересобрать
docker-compose down
docker system prune -f
git pull
docker-compose up -d --build
```

---

## Сравнение с обычным деплоем

| Аспект | Без Docker | С Docker |
|--------|-----------|----------|
| Установка | Вручную Node.js, PM2, Nginx | `docker-compose up -d` |
| Обновление | git pull + npm install + pm2 restart | `git pull && docker-compose up -d --build` |
| Изоляция | Нет | Да, полная изоляция |
| Портативность | Средняя | Высокая |
| Откат версии | Сложно | Легко через образы |
| Конфигурация | Много файлов | 1 файл docker-compose.yml |

---

## Плюсы Docker деплоя:
- ✅ **Простота:** Одна команда для запуска
- ✅ **Надежность:** Одинаково работает везде
- ✅ **Безопасность:** Изоляция приложения
- ✅ **Удобство:** Легко обновлять и откатывать

## Минусы:
- ❌ Чуть больше потребление RAM (~100-200 МБ)
- ❌ Нужно понимать основы Docker

---

**Готово!** Ваш HelpDesk работает в Docker на Reg.ru VPS! 🚀
