'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Play, Trash2 } from 'lucide-react';

export type PartialSession = {
  savedAt: string;
  sessionStartedAt?: number;
  config: any;
  repRecords: any[];
  currentIndex: number;
  fixedIntention: any;
  drillIntentions: any;
};

const KEY = 'golf_os_partial';

export function loadPartialSession(): PartialSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPartialSession() {
  try { localStorage.removeItem(KEY); } catch {}
}

function minutesAgo(isoDate: string): string {
  const mins = Math.round((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 minute ago';
  if (mins < 60) return mins + ' minutes ago';
  const hrs = Math.round(mins / 60);
  return hrs === 1 ? '1 hour ago' : hrs + ' hours ago';
}

interface ResumePromptProps {
  onResume: (saved: PartialSession) => void;
  onDiscard: () => void;
}

export function ResumePrompt({ onResume, onDiscard }: ResumePromptProps) {
  const [saved, setSaved] = useState<PartialSession | null>(null);

  useEffect(() => {
    setSaved(loadPartialSession());
  }, []);

  if (!saved) return null;

  const total = saved.config?.drills?.length ?? '?';
  const done = saved.repRecords?.length ?? 0;

  return (
    <div className='mb-6 rounded-2xl border-2 border-primary/30 bg-primary/5 p-5'>
      <div className='flex items-start gap-3'>
        <div className='w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5'>
          <Clock className='w-4 h-4 text-primary' />
        </div>
        <div className='flex-1 min-w-0'>
          <div className='font-semibold text-sm'>Unsaved session found</div>
          <div className='text-xs text-muted-foreground mt-0.5'>
            {done} of {total} shots completed · saved {minutesAgo(saved.savedAt)}
          </div>
          <div className='flex gap-2 mt-3'>
            <Button size='sm' onClick={() => onResume(saved)} className='flex items-center gap-1.5'>
              <Play className='h-3.5 w-3.5' /> Continue session
            </Button>
            <Button size='sm' variant='outline' onClick={() => { clearPartialSession(); onDiscard(); }} className='flex items-center gap-1.5'>
              <Trash2 className='h-3.5 w-3.5' /> Start fresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
