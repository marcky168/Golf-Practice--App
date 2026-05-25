import Link from "next/link";
import type { ComponentType } from "react";
import {
  Flag,
  Target,
  Crosshair,
  CircleDot,
  Wind,
  Mountain,
  Shuffle,
  Wrench,
  Award,
} from "lucide-react";

type Choice = {
  id: string;
  label: string;
  hint: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

/**
 * Skill-first practice entry. Asks "what are you practicing?" with one tap per skill.
 * Block/Random/Builder is hidden under "More options" — players pick a skill, not a mode.
 */
const SKILL_CHOICES: Choice[] = [
  { id: "driver",    label: "Driver",   hint: "Tee shots, full swing",        href: "/practice/block?skill=driver",         icon: Flag },
  { id: "irons",     label: "Irons",    hint: "Block or random mix",          href: "/practice/block?skill=mid-irons",      icon: Target },
  { id: "wedges",    label: "Wedges",   hint: "Block or random mix",          href: "/practice/block?skill=wedges",         icon: Crosshair },
  // Chipping + Bunker use Builder for scenario-based practice (lie / green / type).
  { id: "chipping",  label: "Chipping", hint: "Scenarios — lie, green, club", href: "/practice/builder?focus=chipping",     icon: Wind },
  { id: "putting",   label: "Putting",  hint: "Lag + short putts",            href: "/practice/block?skill=putting",        icon: CircleDot },
  { id: "bunker",    label: "Bunker",   hint: "Scenarios — greenside/fairway", href: "/practice/builder?focus=bunker",      icon: Mountain },
];

export function SkillFirstPicker({
  variant = "hero",
}: {
  /** "hero" = white-on-green inside the dashboard banner. "page" = standard card-on-bg. */
  variant?: "hero" | "page";
}) {
  const onHero = variant === "hero";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SKILL_CHOICES.map(c => {
          const Icon = c.icon;
          return (
            <Link
              key={c.id}
              href={c.href}
              className={
                "rounded-2xl border-2 p-4 text-left transition active:scale-[0.985] min-h-[88px] flex flex-col justify-between " +
                (onHero
                  ? "border-primary-foreground/25 bg-primary-foreground/10 hover:bg-primary-foreground/15 text-primary-foreground"
                  : "border-border bg-card hover:border-primary/50")
              }
            >
              <Icon className={"h-6 w-6 " + (onHero ? "text-primary-foreground" : "text-primary")} />
              <div>
                <div className="font-semibold text-base leading-tight">{c.label}</div>
                <div className={"text-xs leading-snug mt-0.5 " + (onHero ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {c.hint}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Mixed bag + Games — promoted as primary alternates to skill-specific practice */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/practice/random"
          className={
            "block rounded-2xl border-2 p-4 transition active:scale-[0.985] min-h-[88px] " +
            (onHero
              ? "border-accent/60 bg-accent/20 hover:bg-accent/25 text-primary-foreground"
              : "border-accent/40 bg-accent/5 hover:border-accent")
          }
        >
          <div className="flex items-center gap-3">
            <Shuffle className={"h-7 w-7 shrink-0 " + (onHero ? "text-primary-foreground" : "text-accent")} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base">Mixed bag</div>
              <div className={"text-xs leading-snug " + (onHero ? "text-primary-foreground/75" : "text-muted-foreground")}>
                Random shots across your whole bag — course transfer
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/practice/games"
          className={
            "block rounded-2xl border-2 p-4 transition active:scale-[0.985] min-h-[88px] " +
            (onHero
              ? "border-amber-300/70 bg-amber-300/15 hover:bg-amber-300/20 text-primary-foreground"
              : "border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/20 hover:border-amber-500")
          }
        >
          <div className="flex items-center gap-3">
            <Award className={"h-7 w-7 shrink-0 " + (onHero ? "text-amber-200" : "text-amber-600 dark:text-amber-400")} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base">Games &amp; Challenges</div>
              <div className={"text-xs leading-snug " + (onHero ? "text-primary-foreground/75" : "text-muted-foreground")}>
                Scored pressure — ladders, matrices, up-and-downs
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs pt-1">
        <Link
          href="/practice/builder"
          className={
            "underline-offset-2 hover:underline inline-flex items-center gap-1.5 " +
            (onHero ? "text-primary-foreground/80 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground")
          }
        >
          <Wrench className="h-3.5 w-3.5" />
          Custom session (advanced)
        </Link>
      </div>
    </div>
  );
}
