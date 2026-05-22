/**
 * Google Calendar "Add" URL builder
 * Zero-auth, zero-friction, works for every user instantly.
 * 
 * Later we can add real two-way sync via Google OAuth + Supabase if desired.
 */
export function buildGoogleCalendarURL(params: {
  title: string;
  date: Date;                    // start time of the planned session
  durationMinutes: number;
  details?: string;
  location?: string;
}) {
  const start = params.date;
  const end = new Date(start.getTime() + params.durationMinutes * 60_000);

  const fmt = (d: Date) =>
    d.toISOString().replace(/-|:|\.\d{3}/g, "").slice(0, 15) + "Z";

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", params.title);
  url.searchParams.set("dates", `${fmt(start)}/${fmt(end)}`);
  if (params.details) url.searchParams.set("details", params.details);
  if (params.location) url.searchParams.set("location", params.location);

  return url.toString();
}

/**
 * Very simple .ics file generator (for Apple Calendar / Outlook)
 */
export function generateICS(params: {
  title: string;
  start: Date;
  durationMinutes: number;
  description?: string;
}) {
  const end = new Date(params.start.getTime() + params.durationMinutes * 60_000);
  const dt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Golf Practice OS//EN
BEGIN:VEVENT
UID:${Date.now()}@golfpracticeos
DTSTART:${dt(params.start)}
DTEND:${dt(end)}
SUMMARY:${params.title}
DESCRIPTION:${params.description || "Deliberate golf practice session via Golf Practice OS"}
END:VEVENT
END:VCALENDAR`;
}
