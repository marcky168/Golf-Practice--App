'use client';

import { computeFocusTrends, computeWeeklyRatingTrend } from '@/lib/practice/trends';
import type { SessionConfig } from '@/lib/practice/types';

type SessionRow = {
  started_at: string;
  type: string;
  config: SessionConfig | null;
};

function BarChart({
  items,
  max = 5,
  colorClass = 'bg-primary',
}: {
  items: Array<{ label: string; value: number; sub?: string }>;
  max?: number;
  colorClass?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">{item.label}</span>
            <span className="text-muted-foreground tabular-nums">
              {item.value}{item.sub ? ` · ${item.sub}` : ''}
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${colorClass}`}
              style={{ width: `${Math.min(100, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PracticeTrends({ sessions }: { sessions: SessionRow[] }) {
  const focusTrends = computeFocusTrends(sessions);
  const weekly = computeWeeklyRatingTrend(sessions);

  const hasFocus = focusTrends.some(t => t.avgRating != null || t.avgConsistency != null);
  const hasWeekly = weekly.length > 0;

  if (!hasFocus && !hasWeekly) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Complete a Practice Builder or block session with ratings to see trends here.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {hasWeekly && (
        <div>
          <h3 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mb-4">
            Shot quality (weekly avg)
          </h3>
          <BarChart
            items={weekly.map(w => ({
              label: new Date(w.week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
              value: w.avg,
              sub: `${w.count} rated`,
            }))}
            max={5}
            colorClass="bg-accent"
          />
        </div>
      )}

      {hasFocus && (
        <div>
          <h3 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mb-4">
            By skill focus
          </h3>
          <div className="grid gap-6 sm:grid-cols-2">
            {focusTrends.map(t => (
              <div key={t.label} className="bg-card border rounded-2xl p-4">
                <div className="font-semibold text-lg mb-1">{t.label}</div>
                <div className="text-xs text-muted-foreground mb-3">{t.sessionCount} sessions</div>
                {t.avgRating != null && (
                  <div className="text-sm mb-2">
                    Avg shot rating: <span className="font-semibold tabular-nums">{t.avgRating}/5</span>
                  </div>
                )}
                {t.avgConsistency != null && (
                  <div className="text-sm">
                    Avg block consistency: <span className="font-semibold tabular-nums">{t.avgConsistency}/5</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
