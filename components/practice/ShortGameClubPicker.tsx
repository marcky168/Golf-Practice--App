"use client";

import { Loader2 } from "lucide-react";
import type { ClubEntry } from "@/app/actions";
import { formatGameScore } from "@/lib/practice/game-scores";

type Props = {
  label?: string;
  bagLoading: boolean;
  clubs: ClubEntry[];
  selectedClub: ClubEntry | null;
  customClub: string;
  onSelectClub: (entry: ClubEntry) => void;
  onCustomClub: (value: string) => void;
  customPlaceholder?: string;
  emptyPlaceholder?: string;
  /** Show PB for the currently selected club on setup */
  gameId?: string;
  personalBest?: number;
  personalBestReady?: boolean;
};

export function ShortGameClubPicker({
  label = "Wedge / short club",
  bagLoading,
  clubs,
  selectedClub,
  customClub,
  onSelectClub,
  onCustomClub,
  customPlaceholder = "Or type a club…",
  emptyPlaceholder = "56°, PW, Gap…",
  gameId,
  personalBest,
  personalBestReady = true,
}: Props) {
  const effectiveClub = (selectedClub?.club ?? customClub).trim();

  return (
    <div>
      <div className="text-sm font-semibold mb-2">{label}</div>
      {bagLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading bag…
        </div>
      ) : clubs.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2 mb-2">
            {clubs.map((entry) => (
              <button
                key={entry.club}
                type="button"
                onClick={() => onSelectClub(entry)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition min-h-[44px] ${
                  selectedClub?.club === entry.club
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted"
                }`}
              >
                {entry.club}
              </button>
            ))}
          </div>
          <input
            value={customClub}
            onChange={(e) => onCustomClub(e.target.value)}
            placeholder={customPlaceholder}
            className="w-full rounded-xl border bg-card px-3 py-2 text-sm min-h-[44px]"
          />
        </>
      ) : (
        <input
          value={customClub}
          onChange={(e) => onCustomClub(e.target.value)}
          placeholder={emptyPlaceholder}
          className="w-full rounded-xl border bg-card px-4 py-3 text-lg min-h-[48px]"
        />
      )}
      {gameId && personalBestReady && effectiveClub && personalBest !== undefined && (
        <p className="text-xs text-muted-foreground mt-2">
          Your best with <span className="font-medium text-foreground">{effectiveClub}</span>:{" "}
          {formatGameScore(gameId, personalBest)}
        </p>
      )}
    </div>
  );
}
