import type { CueCard } from "@/lib/programs/types";

interface Props {
  card: CueCard;
  compact?: boolean;
}

export function CueCardDisplay({ card, compact = false }: Props) {
  return (
    <div className={`rounded-2xl border-2 border-primary bg-primary/5 ${compact ? "px-4 py-3" : "px-5 py-4"}`}>
      <div className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-1.5">
        Cue card
      </div>
      <div className={`font-semibold tracking-tight ${compact ? "text-lg" : "text-xl"} text-foreground`}>
        {card.cue}
      </div>
      <div className={`text-muted-foreground mt-1 ${compact ? "text-xs" : "text-sm"} italic leading-snug`}>
        {card.feel}
      </div>
    </div>
  );
}
