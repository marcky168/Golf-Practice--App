'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Clock, X } from 'lucide-react';
import { loadPartialSession, clearPartialSession } from '@/components/practice/ResumePrompt';

const PAGE_MAP: Record<string, string> = {
  block: '/practice/block',
  random: '/practice/random',
  mixed: '/practice/mixed',
};

function minutesAgo(isoDate: string): string {
  const mins = Math.round((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return mins + ' min ago';
  const hrs = Math.round(mins / 60);
  return hrs === 1 ? '1 hr ago' : hrs + ' hrs ago';
}

export function PartialSessionBanner() {
  const [data, setData] = useState<ReturnType<typeof loadPartialSession>>(null);

  useEffect(() => {
    setData(loadPartialSession());
  }, []);

  if (!data) return null;

  const type = data.config?.type as string;
  const href = PAGE_MAP[type] ?? '/practice';
  const done = data.repRecords?.length ?? 0;
  const total = data.config?.drills?.length ?? '?';
  const title = data.config?.title ?? 'Practice session';

  return (
    <div className='flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-4 mb-6'>
      <div className='flex items-center gap-3 min-w-0'>
        <div className='w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0'>
          <Clock className='w-4 h-4 text-amber-600 dark:text-amber-400' />
        </div>
        <div className='min-w-0'>
          <div className='font-semibold text-sm text-amber-900 dark:text-amber-100 truncate'>{title}</div>
          <div className='text-xs text-amber-700 dark:text-amber-300'>
            {done} of {total} shots · {minutesAgo(data.savedAt)}
          </div>
        </div>
      </div>
      <div className='flex items-center gap-2 shrink-0'>
        <Link href={href}>
          <Button size='sm' className='bg-amber-600 hover:bg-amber-700 text-white'>
            Continue
          </Button>
        </Link>
        <button
          onClick={() => { clearPartialSession(); setData(null); }}
          className='text-amber-500 hover:text-amber-700 transition p-1'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    </div>
  );
}
