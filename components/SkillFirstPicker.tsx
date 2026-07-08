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
  GraduationCap,
} from "lucide-react";

type SkillTheme = {
  icon: string;
  badge: string;
  /** Top accent stripe on hero white cards */
  accent: string;
};

type Choice = {
  id: string;
  label: string;
  hint: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  theme: SkillTheme;
};

const SKILL_CHOICES: Choice[] = [
  {
    id: "driver",
    label: "Driver",
    hint: "Tee shots, full swing",
    href: "/practice/block?skill=driver",
    icon: Flag,
    theme: {
      icon: "text-sky-600 dark:text-sky-400",
      badge: "bg-sky-100 dark:bg-sky-950/50",
      accent: "border-t-sky-500",
    },
  },
  {
    id: "irons",
    label: "Irons",
    hint: "Block or random mix",
    href: "/practice/block?skill=mid-irons",
    icon: Target,
    theme: {
      icon: "text-emerald-600 dark:text-emerald-400",
      badge: "bg-emerald-100 dark:bg-emerald-950/50",
      accent: "border-t-emerald-500",
    },
  },
  {
    id: "wedges",
    label: "Wedges",
    hint: "Block or random mix",
    href: "/practice/block?skill=wedges",
    icon: Crosshair,
    theme: {
      icon: "text-teal-600 dark:text-teal-400",
      badge: "bg-teal-100 dark:bg-teal-950/50",
      accent: "border-t-teal-500",
    },
  },
  {
    id: "chipping",
    label: "Chipping",
    hint: "Scenarios — lie, green, club",
    href: "/practice/builder?focus=chipping",
    icon: Wind,
    theme: {
      icon: "text-cyan-600 dark:text-cyan-400",
      badge: "bg-cyan-100 dark:bg-cyan-950/50",
      accent: "border-t-cyan-500",
    },
  },
  {
    id: "putting",
    label: "Putting",
    hint: "Lag + short putts",
    href: "/practice/block?skill=putting",
    icon: CircleDot,
    theme: {
      icon: "text-violet-600 dark:text-violet-400",
      badge: "bg-violet-100 dark:bg-violet-950/50",
      accent: "border-t-violet-500",
    },
  },
  {
    id: "bunker",
    label: "Bunker",
    hint: "Scenarios — greenside/fairway",
    href: "/practice/builder?focus=bunker",
    icon: Mountain,
    theme: {
      icon: "text-amber-700 dark:text-amber-400",
      badge: "bg-amber-100 dark:bg-amber-950/50",
      accent: "border-t-amber-500",
    },
  },
];

function IconBadge({
  icon: Icon,
  theme,
  size = "md",
}: {
  icon: ComponentType<{ className?: string }>;
  theme: SkillTheme;
  size?: "md" | "lg";
}) {
  const box = size === "lg" ? "h-11 w-11" : "h-10 w-10";
  return (
    <div className={`${box} rounded-xl flex items-center justify-center shrink-0 ${theme.badge}`}>
      <Icon className={`h-5 w-5 ${theme.icon}`} />
    </div>
  );
}

const MIXED_BAG_THEME: SkillTheme = {
  icon: "text-indigo-600 dark:text-indigo-400",
  badge: "bg-indigo-100 dark:bg-indigo-950/50",
  accent: "border-t-indigo-500",
};

const GAMES_THEME: SkillTheme = {
  icon: "text-orange-600 dark:text-orange-400",
  badge: "bg-orange-100 dark:bg-orange-950/50",
  accent: "border-t-orange-500",
};

const PROGRAMS_THEME: SkillTheme = {
  icon: "text-primary",
  badge: "bg-primary/10",
  accent: "border-t-primary",
};

export function SkillFirstPicker({
  variant = "hero",
}: {
  /** "hero" = white cards on gradient dashboard. "page" = standard card-on-bg. */
  variant?: "hero" | "page";
}) {
  const onHero = variant === "hero";

  const skillCardClass = (theme: SkillTheme) =>
    onHero
      ? `hero-skill-card rounded-2xl border-t-[3px] ${theme.accent} p-4 text-left min-h-[96px] flex flex-col gap-3 text-foreground`
      : `rounded-2xl border-2 border-border bg-card hover:border-primary/40 hover:shadow-sm p-4 text-left min-h-[96px] flex flex-col gap-3 transition active:scale-[0.985]`;

  const promoCardClass = (theme: SkillTheme) =>
    onHero
      ? `hero-skill-card block rounded-2xl border-t-[3px] ${theme.accent} p-4 min-h-[88px] text-foreground`
      : `block rounded-2xl border-2 p-4 min-h-[88px] transition active:scale-[0.985]`;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SKILL_CHOICES.map(c => (
          <Link key={c.id} href={c.href} className={skillCardClass(c.theme)}>
            <IconBadge icon={c.icon} theme={c.theme} />
            <div>
              <div className="font-semibold text-base leading-tight">{c.label}</div>
              <div className="text-xs leading-snug mt-0.5 text-muted-foreground">{c.hint}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/programs"
          className={
            promoCardClass(PROGRAMS_THEME) +
            (onHero
              ? " sm:col-span-2"
              : " border-primary/25 bg-primary/5 hover:border-primary/50 sm:col-span-2")
          }
        >
          <div className="flex items-center gap-3">
            <IconBadge icon={GraduationCap} theme={PROGRAMS_THEME} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base">Programs</div>
              <div className="text-xs leading-snug text-muted-foreground">
                Break 90 Scoring Method · Driver Program — phase-by-phase plans
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/practice/random"
          className={
            promoCardClass(MIXED_BAG_THEME) +
            (onHero ? "" : " border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/80 dark:bg-indigo-950/30 hover:border-indigo-400")
          }
        >
          <div className="flex items-center gap-3">
            <IconBadge icon={Shuffle} theme={MIXED_BAG_THEME} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base">Mixed bag</div>
              <div className="text-xs leading-snug text-muted-foreground">
                Random shots across your whole bag — course transfer
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/practice/games"
          className={
            promoCardClass(GAMES_THEME) +
            (onHero ? "" : " border-orange-200 dark:border-orange-800/60 bg-orange-50/80 dark:bg-orange-950/30 hover:border-orange-400")
          }
        >
          <div className="flex items-center gap-3">
            <IconBadge icon={Award} theme={GAMES_THEME} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base">Games &amp; Challenges</div>
              <div className="text-xs leading-snug text-muted-foreground">
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
            (onHero
              ? "text-amber-100/90 hover:text-amber-50"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          <Wrench className="h-3.5 w-3.5" />
          Custom session (advanced)
        </Link>
      </div>
    </div>
  );
}
