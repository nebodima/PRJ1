// Skeleton loader для списка задач
function SkeletonLoader() {
  return (
    <div className="divide-y divide-[#404040]">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-[#2F2F2F] p-4 animate-pulse">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="h-3 w-8 bg-[#3A3A3A] rounded"></div>
                <div className="h-4 w-48 bg-[#3A3A3A] rounded"></div>
              </div>
            </div>
            <div className="h-6 w-20 bg-[#3A3A3A] rounded-lg"></div>
          </div>

          <div className="h-3 w-3/4 bg-[#3A3A3A] rounded mb-3"></div>

          <div className="flex gap-2 mb-3">
            <div className="h-6 w-16 bg-[#3A3A3A] rounded-md"></div>
            <div className="h-6 w-20 bg-[#3A3A3A] rounded-md"></div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="h-3 w-16 bg-[#3A3A3A] rounded"></div>
              <div className="h-3 w-24 bg-[#3A3A3A] rounded"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-[#3A3A3A] rounded-md"></div>
              <div className="h-8 w-8 bg-[#3A3A3A] rounded-md"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SkeletonLoader;
