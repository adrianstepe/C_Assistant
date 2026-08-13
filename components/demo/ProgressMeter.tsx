import type { CollectionProgress } from "@/lib/ai/types";

export function ProgressMeter({
  progress,
  complete,
}: {
  progress: CollectionProgress;
  complete: boolean;
}) {
  const percent = Math.round(progress.ratio * 100);
  const label = complete
    ? "All details collected"
    : `${progress.collected} of ${progress.total} details collected`;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.12em] text-ink uppercase">
          {complete ? "Enquiry qualified" : "Qualifying enquiry"}
        </p>
        <p className="text-slate-body text-xs tabular-nums">{label}</p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.collected}
        aria-valuetext={label}
        className="bg-hairline h-1.5 w-full overflow-hidden rounded-full"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${
            complete ? "bg-brand" : "bg-ink"
          }`}
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
    </div>
  );
}
