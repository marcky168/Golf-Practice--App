import type { CueCard } from "@/lib/programs/types";

interface Props {
  card: CueCard;
  compact?: boolean;
}

export function CueCardDisplay({ card, compact = false }: Props) {
  return (
    <div
      className={`cue-card rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/8 via-primary/5 to-accent/10 ${
        compact ? "px-4 py-3" : "px-5 py-5"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-2">
        Cue card
      </div>
      <div
        className={`font-semibold tracking-tight text-balance ${
          compact ? "text-lg" : "text-2xl leading-snug"
        } text-foreground`}
      >
        {card.cue}
      </div>
      <div
        className={`text-muted-foreground mt-2 ${compact ? "text-xs" : "text-sm"} leading-relaxed`}
      >
        {card.feel}
      </div>
    </div>
  );
}
