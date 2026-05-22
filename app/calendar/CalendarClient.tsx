"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar as CalendarIcon, Plus, ExternalLink } from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { toast } from "sonner";

import { PREBUILT_TEMPLATES } from "@/lib/practice/templates";
import { buildGoogleCalendarURL } from "@/lib/practice/calendar";
import { savePracticeSession } from "@/app/actions";

interface PlannedSession {
  id: string;
  title: string;
  date: Date;
  durationMinutes: number;
  templateId?: string;
}

interface CalendarClientProps {
  initialPlanned: PlannedSession[];
}

export default function CalendarClient({ initialPlanned }: CalendarClientProps) {
  const [plannedSessions, setPlannedSessions] = useState<PlannedSession[]>(initialPlanned);
  const [showPlanForm, setShowPlanForm] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState(PREBUILT_TEMPLATES[0].id);
  const [planDate, setPlanDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [planTime, setPlanTime] = useState("09:00");
  const [planDuration, setPlanDuration] = useState(45);

  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const plannedDates = plannedSessions.map(p => p.date);

  async function handlePlanSession() {
    const template = PREBUILT_TEMPLATES.find(t => t.id === selectedTemplate)!;
    const startDate = new Date(`${planDate}T${planTime}`);

    const res = await savePracticeSession({
      type: "planned",
      title: template.label,
      durationMinutes: planDuration,
      config: {
        templateId: selectedTemplate,
        scheduledFor: startDate.toISOString(),
      },
    });

    if (res.success) {
      const newPlanned: PlannedSession = {
        id: "planned-" + Date.now(),
        title: template.label,
        date: startDate,
        durationMinutes: planDuration,
        templateId: selectedTemplate,
      };

      setPlannedSessions(prev =>
        [...prev, newPlanned].sort((a, b) => a.date.getTime() - b.date.getTime())
      );
      setShowPlanForm(false);
      toast.success("Session planned!");

      addToGoogleCalendar(newPlanned);
    } else {
      toast.error("Could not save planned session.");
    }
  }

  function addToGoogleCalendar(planned: PlannedSession) {
    const url = buildGoogleCalendarURL({
      title: `Golf Practice: ${planned.title}`,
      date: planned.date,
      durationMinutes: planned.durationMinutes,
      details: `Planned via Golf Practice OS\n\nLink: ${window.location.origin}/calendar`,
    });

    window.open(url, "_blank");
    toast.success("Opening Google Calendar...");
  }

  return (
    <div className="min-h-screen bg-background pb-20 max-w-4xl mx-auto px-4 pt-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tighter">Calendar &amp; Planning</h1>
        </div>
        <Button onClick={() => setShowPlanForm(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" /> Plan Future Session
        </Button>
      </div>

      {/* Plan Form */}
      {showPlanForm && (
        <Card className="mb-8 border-primary/30">
          <CardHeader>
            <CardTitle>Plan a Deliberate Practice Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Choose a Template</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PREBUILT_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`p-4 rounded-xl border text-left transition ${selectedTemplate === t.id ? "border-primary bg-primary/5" : "bg-card"}`}
                  >
                    <div className="font-medium">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                    <div className="text-xs mt-1 text-muted-foreground">{t.duration} min</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} className="w-full rounded-xl border bg-card px-4 py-2.5" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Time</label>
                <input type="time" value={planTime} onChange={(e) => setPlanTime(e.target.value)} className="w-full rounded-xl border bg-card px-4 py-2.5" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Duration (min)</label>
                <input type="number" value={planDuration} onChange={(e) => setPlanDuration(parseInt(e.target.value))} className="w-full rounded-xl border bg-card px-4 py-2.5" />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handlePlanSession} size="lg" className="flex-1">Save as Planned Session</Button>
              <Button variant="outline" onClick={() => setShowPlanForm(false)} size="lg">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month Grid */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">{format(currentMonth, "MMMM yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((day, index) => {
              const hasPlan = plannedDates.some(d => isSameDay(d, day));
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={index}
                  className={`aspect-square flex items-center justify-center rounded-lg text-sm border transition relative
                    ${hasPlan ? "bg-accent/10 border-accent font-medium" : "bg-card"}
                    ${isToday ? "ring-2 ring-primary" : ""}`}
                >
                  {format(day, "d")}
                  {hasPlan && <div className="absolute bottom-1 w-1.5 h-1.5 bg-accent rounded-full" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Planned */}
      <div>
        <h2 className="font-semibold tracking-tight text-xl mb-4">Upcoming Planned Sessions</h2>

        {plannedSessions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No upcoming planned sessions.</p>
              <p className="text-sm mt-2 text-muted-foreground max-w-xs mx-auto">
                Planning sessions in advance is one of the highest-leverage habits for consistent improvement.
              </p>
              <Button onClick={() => setShowPlanForm(true)} className="mt-6">
                Plan your first session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {plannedSessions
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map((p) => (
                <Card key={p.id} className="golf-card">
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-lg">{p.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(p.date, "EEEE, MMM d")} at {format(p.date, "h:mm a")} • {p.durationMinutes} min
                      </div>
                    </div>
                    <Button onClick={() => addToGoogleCalendar(p)}>
                      <ExternalLink className="mr-2 h-4 w-4" /> Add to Google Calendar
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      <div className="mt-10 text-xs text-center text-muted-foreground">
        One-click Google Calendar integration works with zero setup.
      </div>
    </div>
  );
}
