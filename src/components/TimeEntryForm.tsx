import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Clock, Save } from 'lucide-react';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import { supabase } from '../lib/supabase';
import type {Session } from './TimerCard';


const isoLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
  
  /** Monday of that week – also local-zone */
  const mondayIso = (d: Date) => {
    const m = new Date(d);
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
    return isoLocal(m);
  };



interface TimeEntryFormProps {
  entryId?: string;
  seed?: Partial<Session>;     // <‑‑ NEW
  onSuccess: () => void;
}



interface FormValues {
  projectId: string;
  taskId: string;
  description: string;
  startTime: string;
  endTime: string;
  date: string;
}

const TimeEntryForm: React.FC<TimeEntryFormProps> = ({ onSuccess, entryId, seed }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>();
  
  const selectedProjectId = watch('projectId');

  useEffect(() => {
    fetchProjects();
    
    // replace the current   if (entryId) { ... } else { ... }   section
if (entryId) {
  setIsEditing(true);
  fetchTimeEntry(entryId);
} else {
  /* ---------- NEW ---------- */
  const now = new Date();
  const todayIso = isoLocal(now);

  setValue('date', seed?.start ? seed.start.toISOString().split('T')[0] : todayIso);

  if (seed?.start && seed.end) {
      setValue('startTime', seed.start.toTimeString().substring(0, 5));
      setValue('endTime',   seed.end  .toTimeString().substring(0, 5));
  } else {
    const hhmm = now.toTimeString().substring(0, 5);
    setValue('startTime', hhmm);
    setValue('endTime',   hhmm);
  }
}

  }, [entryId]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasks(selectedProjectId);
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      if (data) {
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchTasks = async (projectId: string) => {
    if (!projectId) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('name');
      
      if (error) throw error;
      
      if (data) {
        setTasks(data);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchTimeEntry = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        const startDate = new Date(data.start_time);
        const endDate = data.end_time ? new Date(data.end_time) : new Date();
        
        setValue('projectId', data.project_id || '');
        setValue('taskId', data.task_id || '');
        setValue('description', data.description || '');
        setValue('date', startDate.toISOString().split('T')[0]);
        setValue('startTime', startDate.toTimeString().split(' ')[0].substring(0, 5));
        setValue('endTime', endDate.toTimeString().split(' ')[0].substring(0, 5));
      }
    } catch (error) {
      console.error('Error fetching time entry:', error);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
  
      /* ---------------------------------------------------- */
      /* 1. Prepare timestamps & duration                     */
      /* ---------------------------------------------------- */
      const start = new Date(`${values.date}T${values.startTime}`);
      const end   = new Date(`${values.date}T${values.endTime}`);
  
      if (end <= start) {
        alert('End time must be after start time');
        return;
      }
  
      const diffHrs = +( (end.getTime() - start.getTime()) / 36e5 ).toFixed(2); // 2‑dp
  
      /* ---------------------------------------------------- */
      /* 2. Ensure we have a DRAFT header (create if missing) */
      /* ---------------------------------------------------- */
      const weekIso = mondayIso(start);                 // Monday of that entry
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;
      
      const { data: headerId, error: headerErr } = await supabase.rpc(
        'ensure_draft_timesheet',
        { _uid: userId, _week: weekIso }               // <- arguments of the SQL fn
      );
      
      if (headerErr || !headerId) {
        alert(headerErr?.message || 'Could not create/open timesheet for that week');
        return;
      }
      
      /* ---------------------------------------------------- */
      /* 3. Build one row – populate ONLY the correct weekday */
      /* ---------------------------------------------------- */
      const weekday = start.toLocaleString('en-GB', { weekday: 'long' }).toLowerCase(); // e.g. 'monday'
  
      const entryRow: any = {
        timesheet_id: headerId,             // 👈  was  sheet.id
        project_id:   values.projectId || null,
        task_id:      values.taskId    || null,
        description:  values.description,
        [`${weekday}_hours`]:       diffHrs,
        [`${weekday}_start_time`]:  values.startTime,
        [`${weekday}_end_time`]:    values.endTime
      };      
  
      /* ---------------------------------------------------- */
      /* 4a. Update when editing –––––––––––––––––––––––––––– */
      /* ---------------------------------------------------- */
      if (isEditing && entryId) {
        const { error } = await supabase
          .from('timesheet_entries')
          .update(entryRow)
          .eq('id', entryId);
        if (error) throw error;
      }
      /* ---------------------------------------------------- */
      /* 4b. Insert when new –––––––––––––––––––––––––––––––– */
      /* ---------------------------------------------------- */
      else {
        const { error } = await supabase
          .from('timesheet_entries')
          .insert(entryRow);
        if (error) throw error;
      }
  
      /* ---------------------------------------------------- */
      /* 5. Done – callback to parent                         */
      /* ---------------------------------------------------- */
      onSuccess?.();
  
    } catch (err: any) {
      console.error('Error saving entry', err);
      alert(err.message || 'Could not save entry');
    } finally {
      setIsLoading(false);
    }
  };  

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-4 rounded-lg border shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {isEditing ? 'Edit Time Entry' : 'Add Time Entry'}
      </h3>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Select
          label="Project"
          options={[
            { value: '', label: 'Select Project' },
            ...projects.map(project => ({ 
              value: project.id, 
              label: project.name 
            }))
          ]}
          {...register('projectId', { required: 'Project is required' })}
          error={errors.projectId?.message}
        />
        
        <Select
          label="Task"
          options={[
            { value: '', label: 'Select Task' },
            ...tasks.map(task => ({ 
              value: task.id, 
              label: task.name 
            }))
          ]}
          disabled={!selectedProjectId}
          {...register('taskId')}
        />
      </div>
      
      <Input
        label="Description"
        placeholder="What did you work on?"
        {...register('description')}
      />
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Input
          label="Date"
          type="date"
          {...register('date', { required: 'Date is required' })}
          error={errors.date?.message}
        />
        
        <Input
          label="Start Time"
          type="time"
          {...register('startTime', { required: 'Start time is required' })}
          error={errors.startTime?.message}
        />
        
        <Input
          label="End Time"
          type="time"
          {...register('endTime', { required: 'End time is required' })}
          error={errors.endTime?.message}
        />
      </div>
      
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          icon={<Save className="h-4 w-4" />}
          isLoading={isLoading}
        >
          {isEditing ? 'Update Entry' : 'Save Entry'}
        </Button>
      </div>
    </form>
  );
};

export default TimeEntryForm;