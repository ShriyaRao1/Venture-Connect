export function StartupCardSkeleton() {
  return (
    <div className="al-card p-5 flex flex-col gap-3.5">
      <div className="flex gap-3">
        <div className="skeleton w-11 h-11 rounded-lg shrink-0" />
        <div className="flex-1 pt-1">
          <div className="skeleton w-28 h-3 mb-2 rounded" />
          <div className="skeleton w-16 h-2.5 rounded" />
        </div>
      </div>
      <div className="skeleton w-full h-2.5 rounded" />
      <div className="skeleton w-4/5 h-2.5 rounded" />
      <div>
        <div className="flex justify-between mb-1.5">
          <div className="skeleton w-20 h-2 rounded" />
          <div className="skeleton w-8 h-2 rounded" />
        </div>
        <div className="skeleton w-full h-1 rounded-full" />
      </div>
      <div className="flex justify-between border-t border-[#2a2a2a] pt-2">
        <div className="skeleton w-16 h-2 rounded" />
        <div className="skeleton w-10 h-2 rounded" />
      </div>
    </div>
  );
}

export function InvestorCardSkeleton() {
  return (
    <div className="al-card p-5 flex flex-col items-center gap-3">
      <div className="skeleton w-14 h-14 rounded-full" />
      <div className="skeleton w-24 h-3 rounded" />
      <div className="skeleton w-16 h-2 rounded" />
      <div className="skeleton w-full h-2 rounded" />
      <div className="skeleton w-3/4 h-2 rounded" />
    </div>
  );
}
