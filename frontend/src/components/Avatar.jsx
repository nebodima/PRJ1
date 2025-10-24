// Компонент аватара с инициалами и цветным фоном
function Avatar({ name, size = 'md' }) {
  // Функция для генерации цвета на основе имени
  const stringToColor = (str) => {
    const colors = [
      '#C48B64', // Основной акцент
      '#5B7C99', // Синий
      '#6B8E6F', // Зеленый
      '#B86B5C', // Красный
      '#8B7C99', // Фиолетовый
      '#7C8B99', // Голубой
      '#998B7C', // Коричневый
    ];

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  // Получаем инициалы (первая и последняя буквы)
  const getInitials = (name) => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(name);
  const bgColor = stringToColor(name || 'default');

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-12 h-12 text-lg'
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-white transition-transform hover:scale-110`}
      style={{ backgroundColor: bgColor }}
      title={name}
    >
      {initials}
    </div>
  );
}

export default Avatar;
