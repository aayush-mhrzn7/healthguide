"use client";

export type QuizProgressProps = {
  current: number;
  total: number;
};

/**
 * Single Responsibility: Displays quiz progress indicator.
 */
export function QuizProgress({ current, total }: QuizProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Progress</span>
        <span>
          {current} / {total} questions
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
