import React, { useState, useEffect } from 'react';
import { Play, Pause, Square } from 'lucide-react';
import Button from './ui/Button';
import { cn, formatDuration } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface TimerProps {
  projectId?: string | null;
  taskId?: string | null;
  description?: string;
  onStart?: () => void;
  onStop?: () => void;
}

const Timer: React.FC<TimerProps> = ({ 
  projectId, 
  taskId, 
  description = '', 
  onStart, 
  onStop 
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [runningTimer, setRunningTimer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkForRunningTimer();
  }, []);

  const checkForRunningTimer = async () => {
    try {
      const { data, error } = await supabase
        .from('running_timers')
        .select('*')
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setRunningTimer(data[0]);
        setIsRunning(true);
        
        // Calculate elapsed time
        const startTime = new Date(data[0].start_time);
        const elapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setSeconds(elapsedSeconds);
        
        // Start the timer from the current elapsed time
        const timerInterval = setInterval(() => {
          setSeconds(prev => prev + 1);
        }, 1000);
        setTimer(timerInterval);
      }
    } catch (error) {
      console.error('Error checking for running timer:', error);
    }
  };

  const handleStart = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.rpc('start_timer', {
        _project: projectId || null,
        _task: taskId || null,
        _desc: description
      });

      if (error) throw error;
      
      setIsRunning(true);
      setSeconds(0);
      
      const timerInterval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
      
      setTimer(timerInterval);
      
      if (onStart) onStart();
      
      // Refresh to get the latest timer data
      checkForRunningTimer();
    } catch (error) {
      console.error('Error starting timer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase.rpc('stop_timer');
      
      if (error) throw error;
      
      if (timer) clearInterval(timer);
      
      setIsRunning(false);
      setSeconds(0);
      setTimer(null);
      setRunningTimer(null);
      
      if (onStop) onStop();
    } catch (error) {
      console.error('Error stopping timer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm transition-all">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-medium text-gray-900">Time Tracker</h3>
        <div className={cn(
          "px-2 py-1 rounded-full text-xs font-medium",
          isRunning ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
        )}>
          {isRunning ? "Running" : "Stopped"}
        </div>
      </div>
      
      <div className="flex w-full items-center justify-center py-4">
        <div className="text-3xl font-semibold tabular-nums">
          {formatDuration(seconds)}
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-center space-x-3">
        {!isRunning ? (
          <Button
            variant="primary"
            icon={<Play className="h-4 w-4" />}
            onClick={handleStart}
            isLoading={isLoading}
            disabled={isLoading}
          >
            Start Timer
          </Button>
        ) : (
          <Button
            variant="danger"
            icon={<Square className="h-4 w-4" />}
            onClick={handleStop}
            isLoading={isLoading}
            disabled={isLoading}
          >
            Stop Timer
          </Button>
        )}
      </div>
      
      {runningTimer && (
        <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
          <p><span className="font-medium">Project:</span> {runningTimer.project_name || 'No project'}</p>
          <p><span className="font-medium">Task:</span> {runningTimer.task_name || 'No task'}</p>
          {runningTimer.description && (
            <p><span className="font-medium">Description:</span> {runningTimer.description}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Timer;