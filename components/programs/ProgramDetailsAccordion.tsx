"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  title: string;
  icon?: ReactNode;
  meta?: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

/** Collapsible reference block for program overview (warm-up, schedule, etc.). */
export function ProgramDetailsAccordion({
  title,
  icon,
  meta,
  children,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-5 py-4 text-left min-h-[52px] active:bg-muted/40 transition"
        aria-expanded={open}
      >
        {icon}
        <h3 className="font-semibold text-sm tracking-tight flex-1">{title}</h3>
        {meta && <span className="text-xs text-muted-foreground mr-1">{meta}</span>}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && <div className="px-5 pb-5 pt-0 border-t border-border/50">{children}</div>}
    </div>
  );
}
