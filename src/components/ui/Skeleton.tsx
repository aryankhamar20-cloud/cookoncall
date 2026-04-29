import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/** Shimmer skeleton placeholder — use while async data loads. */
export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-[12px] bg-gradient-to-r from-[var(--cream-200)] via-[var(--cream-100)] to-[var(--cream-200)] bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]",
        className
      )}
    />
  );
}

/** Chef card skeleton — matches BookChefPanel card layout. */
export function ChefCardSkeleton() {
  return (
    <div className="bg-white rounded-[16px] overflow-hidden border border-[rgba(212,114,26,0.06)]">
      <Skeleton className="h-[100px] rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Order row skeleton — matches OrdersPanel row layout. */
export function OrderRowSkeleton() {
  return (
    <div className="bg-white rounded-[16px] p-5 border border-[rgba(212,114,26,0.06)] flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-7 w-20 rounded-full" />
    </div>
  );
}

/** Profile card skeleton — matches ProfilePanel layout. */
export function ProfileCardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Profile card placeholder */}
      <div className="bg-white rounded-[16px] overflow-hidden border border-[rgba(212,114,26,0.06)]">
        <Skeleton className="h-[80px] rounded-none" />
        <div className="pt-12 pb-6 px-6 flex flex-col items-center space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      {/* Settings placeholder */}
      <div className="bg-white rounded-[16px] border border-[rgba(212,114,26,0.06)] p-6 space-y-5">
        <Skeleton className="h-5 w-20" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
    </div>
  );
}

/** Menu card skeleton — matches OrderFoodPanel card layout. */
export function MenuCardSkeleton() {
  return (
    <div className="bg-white rounded-[16px] border border-[rgba(212,114,26,0.06)] overflow-hidden">
      <div className="p-5 border-b border-[rgba(212,114,26,0.06)] space-y-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="p-5 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
