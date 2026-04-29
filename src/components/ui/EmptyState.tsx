"use client";

interface EmptyStateProps {
  message: string;
  icon?: string;
}

export function EmptyState({ message, icon = "📭" }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-[16px] p-12 border border-[rgba(212,114,26,0.06)] text-center">
      <span className="text-3xl block mb-3">{icon}</span>
      <p className="text-[0.9rem] text-[var(--text-muted)]">{message}</p>
    </div>
  );
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-5 h-5", md: "w-8 h-8", lg: "w-12 h-12" };

  return (
    <div className="flex items-center justify-center py-12">
      <div
        className={`${sizes[size]} border-[3px] border-[var(--cream-300)] border-t-[var(--orange-500)] rounded-full animate-spin`}
      />
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="bg-white rounded-[16px] h-[200px] border border-[rgba(212,114,26,0.06)] animate-pulse" />
  );
}
