import { ClipboardList } from 'lucide-react';

function EmptyState({ onCreateTask }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="bg-[#2F2F2F] rounded-full p-6 mb-6">
        <ClipboardList className="w-16 h-16 text-[#C48B64]" />
      </div>

      <h3 className="text-xl font-semibold text-[#E8E8E8] mb-2">
        Пока нет задач
      </h3>

      <p className="text-[#888888] text-center mb-6 max-w-md">
        Создайте первую задачу для вашей команды и начните организовывать работу эффективнее
      </p>

      <button
        onClick={onCreateTask}
        className="bg-[#C48B64] hover:bg-[#D49A75] text-white px-6 py-3 rounded-lg font-medium transition-all hover:shadow-lg flex items-center gap-2"
      >
        <ClipboardList className="w-5 h-5" />
        Создать первую задачу
      </button>
    </div>
  );
}

export default EmptyState;
