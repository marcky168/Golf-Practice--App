'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildSessionTiming } from '@/lib/practice/session-duration';

interface PartialSession {
  savedAt: string;
  sessionStartedAt: number;
  config: { title: string; drills: unknown[] };
  repRecords: Array<{
    repNumber: number;
    rating?: number;
    drill?: unknown;
    timestamp: number;
    shape?: string;
    trajectory?: string;
    errorCorrection?: unknown;
  }>;
  currentIndex: number;
}

interface Props {
  children: React.ReactNode;
  onSave?: (result: {
    repRecords: unknown[];
    blockResults: unknown[];
    durationMinutes: number;
    startedAt: string;
    endedAt: string;
    reflection: null;
    notes: string;
  }) => void;
  onExit?: () => void;
}

interface State {
  hasError: boolean;
}

export class SessionRunnerErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[SessionRunner] Uncaught error:', error, info.componentStack);
  }

  private readPartial(): PartialSession | null {
    try {
      const raw = localStorage.getItem('golf_os_partial');
      return raw ? (JSON.parse(raw) as PartialSession) : null;
    } catch {
      return null;
    }
  }

  private handleSave = () => {
    const partial = this.readPartial();
    if (!partial || !this.props.onSave) return;
    const timing = buildSessionTiming(partial.sessionStartedAt);
    this.props.onSave({
      repRecords: partial.repRecords.map(r => ({
        repNumber: r.repNumber,
        rating: r.rating,
        drill: r.drill,
        blockIndex: undefined,
        shape: r.shape,
        trajectory: r.trajectory,
        errorCorrection: r.errorCorrection,
      })),
      blockResults: [],
      ...timing,
      reflection: null,
      notes: '',
    });
    try { localStorage.removeItem('golf_os_partial'); } catch {}
  };

  private handleDiscard = () => {
    try { localStorage.removeItem('golf_os_partial'); } catch {}
    if (this.props.onExit) {
      this.props.onExit();
    } else {
      window.history.back();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const partial = this.readPartial();
    const repCount = partial?.repRecords?.length ?? 0;
    const title = partial?.config?.title;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md w-full">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tighter mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-8">
            {repCount > 0
              ? `${repCount} rep${repCount !== 1 ? 's' : ''} were auto-saved${title ? ` from "${title}"` : ''}. Save them before you go?`
              : 'No reps were logged yet.'}
          </p>
          <div className="flex flex-col gap-3">
            {repCount > 0 && this.props.onSave && (
              <Button size="lg" className="w-full" onClick={this.handleSave}>
                Save {repCount} rep{repCount !== 1 ? 's' : ''} + Exit
              </Button>
            )}
            <Button variant="destructive" size="lg" className="w-full" onClick={this.handleDiscard}>
              Discard + Exit
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
