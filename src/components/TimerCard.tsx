// src/components/TimeCard.tsx
import React, { useEffect, useState } from 'react';
import { Play, Square } from 'lucide-react';
import Button from './ui/Button';
import { formatDuration } from '../lib/utils';
import { supabase } from '../lib/supabase';
import Toast from './ui/Toast';

export interface Session {
  start: Date;
  end:   Date | null;      // null while running
  secs:  number;           // live counter
}

interface TimeCardProps {
  onStopped: (s: Session) => void;   // notify parent
}

const TimeCard: React.FC<TimeCardProps> = ({ onStopped }) => {
  const [running, setRunning] = useState<Session | null>(null);
  const [tick,    setTick]    = useState<NodeJS.Timeout>();

  const [toast, setToast] = useState<
    | null
    | { message: string; type: 'success' | 'error' | 'info' }
  >(null);
  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'error'
  ) => setToast({ message, type });
  

  /* ─────────────────────────── check if a timer is already running */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('running_timers')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(1);

      if (!error && data?.length) {
        const st = new Date(data[0].start_time);
        startLocalTimer(st);
      }
    })();
    return () => tick && clearInterval(tick);
  }, []);

  /* ───────────────────────────── helpers */
  function startLocalTimer(start: Date) {
    const base: Session = { start, end: null, secs: Math.floor((Date.now() - +start) / 1000) };
    setRunning(base);
    const t = setInterval(() =>
      setRunning(prev => prev ? ({ ...prev, secs: prev.secs + 1 }) : prev)
    , 1000);
    setTick(t);
  }

  /* ───────────────────────────── START */
    const handleStart = async () => {
        try {
          const { error } = await supabase.rpc('start_timer', {
            _project: null,
            _task:    null,
            _desc:    '',
          });
    
          if (error) throw error;
    
          startLocalTimer(new Date());
        } catch (err: any) {
          // ➌ Friendly message from RAISE EXCEPTION
          if (err?.code === '45000' || err?.code === 'P0001') {
            showToast(err.message || 'Current week is locked', 'error');
          } else {
            showToast('Unable to start timer', 'error');
            console.error(err);
          }
        }
      };

  /* ───────────────────────────── STOP  */
    const handleStop = async () => {
        try {
          const { data, error } = await supabase.rpc('stop_timer');
          if (error) throw error;

    if (tick) clearInterval(tick);

    const span: Session = {
      start: new Date(data[0].start_time),
      end:   new Date(data[0].end_time),
      secs:  running?.secs ?? 0
    };

    setRunning(null);
     onStopped(span);              // hand over to parent
     } catch (err) {
       showToast('Unable to stop timer', 'error');
       console.error(err);
     }
       };

 /* ───────────────────────────── render */
return (
  <>
    {/* timer panel */}
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-4 text-center text-4xl font-semibold tabular-nums">
        {formatDuration(running?.secs ?? 0)}
      </div>

      {!running ? (
        <Button
          variant="primary"
          className="w-full"
          icon={<Play className="h-4 w-4" />}
          onClick={handleStart}
        >
          Start timer
        </Button>
      ) : (
        <Button
          variant="danger"
          className="w-full"
          icon={<Square className="h-4 w-4" />}
          onClick={handleStop}
        >
          Stop timer
        </Button>
      )}
    </div>

    {/* toast popup */}
    {toast && (
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(null)}
      />
    )}
  </>
);
}
export default TimeCard;
