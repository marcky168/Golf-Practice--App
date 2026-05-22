import { getPlannedSessions } from "@/app/actions";
import CalendarClient from "./CalendarClient";

export default async function CalendarPage() {
  const plannedFromDb = await getPlannedSessions();

  // Transform DB rows into the shape our client component expects
  const plannedSessions = plannedFromDb.map((row: any) => ({
    id: row.id,
    title: row.title,
    date: new Date(row.started_at),
    durationMinutes: row.duration_minutes || 45,
    templateId: row.config?.templateId,
  }));

  return <CalendarClient initialPlanned={plannedSessions} />;
}
