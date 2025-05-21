import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Plus, Filter, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import TimeEntryList from '../components/TimeEntryList';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Toast from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';


interface WeeklyEntry {
  project_id: string;
  task_id: string;
  description: string;
  monday_hours: string;
  tuesday_hours: string;
  wednesday_hours: string;
  thursday_hours: string;
  friday_hours: string;
  saturday_hours: string;
  sunday_hours: string;
  monday_start_time: string;
  monday_end_time: string;
  tuesday_start_time: string;
  tuesday_end_time: string;
  wednesday_start_time: string;
  wednesday_end_time: string;
  thursday_start_time: string;
  thursday_end_time: string;
  friday_start_time: string;
  friday_end_time: string;
  saturday_start_time: string;
  saturday_end_time: string;
  sunday_start_time: string;
  sunday_end_time: string;
}

const {
  data: { user }
} = await supabase.auth.getUser();          // runs only once, no loop
const currentUserId = user?.id ?? '';

const Timesheet: React.FC = () => {
  const { id: timesheetId } = useParams();
  const navigate = useNavigate();
  const [showTimesheetForm, setShowTimesheetForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'draft' | 'submitted' | 'approved' | 'rejected'>('all');
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [weeks,        setWeeks]        = useState<any[]>([]);
  const [tasks, setTasks] = useState<Record<string, any[]>>({});
  const [entries, setEntries] = useState<WeeklyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [existingTimesheet, setExistingTimesheet] = useState<any>(null);

 // 1. fetch the timesheet ONCE when the id changes
useEffect(() => {
  if (!timesheetId) return;
  fetchTimesheet(timesheetId);     // <- this may call setCurrentWeek(...)
}, [timesheetId]);                 // <-- **only** timesheetId here


// 2. when the current week changes, rebuild the local weekDays array
useEffect(() => {
  calculateWeekDays(currentWeek);
}, [currentWeek]);                 // <-- **only** currentWeek here


// 3. get the list of projects once at mount
useEffect(() => {
  // 1) projects for the drop-downs
  fetchProjects();
  reloadWeeks();

  // 2) editable Mondays for the picker
  supabase
    .from('v_editable_weeks')
    .select('*')
    .order('week_start')
    .then(({ data, error }) => {
      if (!error) setWeeks(data ?? []);
    });
}, []);                       // <-- still runs once



// ─────────────────────────────────────────────────────────────
//  Always fetch the Mondays that are still editable
const reloadWeeks = async () => {
  const { data, error } = await supabase
    .from('v_editable_weeks')       // ← the VIEW you created
    .select('*')
    .order('week_start');           // Monday → Sunday order
  if (!error) setWeeks(data ?? []);
};
// ─────────────────────────────────────────────────────────────


  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const calculateWeekDays = (date: Date) => {
    const days: Date[] = [];
    const currentDay = date.getDay();
    const firstDayOfWeek = new Date(date);
    const diff = currentDay === 0 ? 6 : currentDay - 1;
    firstDayOfWeek.setDate(date.getDate() - diff);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(firstDayOfWeek);
      day.setDate(firstDayOfWeek.getDate() + i);
      days.push(day);
    }
    
    setWeekDays(days);
  };

 /**
 * Returns:
 *   • { draftId: string }  → navigate to /edit/:id
 *   • { weekStart: Date }  → open blank modal for that week
 */
const checkExistingTimesheet = async (seedWeek: Date): Promise<
| { draftId: string }
| { weekStart: Date }
> => {
let pointer = new Date(seedWeek);              // Monday of current loop
const MAX_STEPS = 52;           

// safety stop (1 year)

for (let i = 0; i < MAX_STEPS; i++) {
  const iso = pointer.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('weekly_timesheets')
    .select('id, status')
    .eq('user_id', currentUserId)
    .eq('week_start_date', iso)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;

  if (!data) {
    // no record at all → first free week
    return { weekStart: new Date(pointer) };
  }

  if (data.status === 'draft') {
    return { draftId: data.id };
  }

  // otherwise submitted / approved / rejected → skip ahead
  pointer.setDate(pointer.getDate() + 7);
}

throw new Error('No open week found in the next 12 months');
};

  const [status,   setStatus]   = useState<'draft' | 'submitted' | 'approved' | 'rejected'>('draft');
  const [isOwner, setIsOwner] = useState(true);
  const readOnly = !isOwner || status !== 'draft';         // single flag you’ll use below


  const fetchTimesheet = async (id: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('weekly_timesheets')
        .select(`
          *,
          timesheet_entries(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        // If timesheet is not draft, prevent editing

        setCurrentWeek(new Date(data.week_start_date));
        setIsOwner(data.user_id === currentUserId);
        setStatus(data.status);          // 'draft' / 'submitted' / …
        setEntries(data.timesheet_entries.map((entry: any) => ({
          project_id: entry.project_id || '',
          task_id: entry.task_id || '',
          description: entry.description || '',
          monday_hours: entry.monday_hours?.toString() || '',
          tuesday_hours: entry.tuesday_hours?.toString() || '',
          wednesday_hours: entry.wednesday_hours?.toString() || '',
          thursday_hours: entry.thursday_hours?.toString() || '',
          friday_hours: entry.friday_hours?.toString() || '',
          saturday_hours: entry.saturday_hours?.toString() || '',
          sunday_hours: entry.sunday_hours?.toString() || '',
          monday_start_time: entry.monday_start_time || '09:00',
          monday_end_time: entry.monday_end_time || '09:00',
          tuesday_start_time: entry.tuesday_start_time || '09:00',
          tuesday_end_time: entry.tuesday_end_time || '09:00',
          wednesday_start_time: entry.wednesday_start_time || '09:00',
          wednesday_end_time: entry.wednesday_end_time || '09:00',
          thursday_start_time: entry.thursday_start_time || '09:00',
          thursday_end_time: entry.thursday_end_time || '09:00',
          friday_start_time: entry.friday_start_time || '09:00',
          friday_end_time: entry.friday_end_time || '09:00',
          saturday_start_time: entry.saturday_start_time || '09:00',
          saturday_end_time: entry.saturday_end_time || '09:00',
          sunday_start_time: entry.sunday_start_time || '09:00',
          sunday_end_time: entry.sunday_end_time || '09:00',
        })));
        setShowTimesheetForm(true);
      }

    } catch (error: any) {
      showToast(error.message || 'Error fetching timesheet', 'error');
      navigate('/timesheet', { state: { refresh: true } });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('archived', false)
        .order('name');
      
      if (error) throw error;
      
      if (data) {
        setProjects(data);
      }
    } catch (error: any) {
      showToast(error.message || 'Error fetching projects', 'error');
    }
  };

  const fetchTasks = async (projectId: string) => {
    if (!tasks[projectId]) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .order('name');
        
        if (error) throw error;
        
        if (data) {
          setTasks(prev => ({
            ...prev,
            [projectId]: data
          }));
        }
      } catch (error: any) {
        showToast(error.message || 'Error fetching tasks', 'error');
      }
    }
  };

  const handleAddEntry = () => {
    setEntries(prev => [
      ...prev,
      {
        project_id: '',
        task_id: '',
        description: '',
        monday_hours: '',
        tuesday_hours: '',
        wednesday_hours: '',
        thursday_hours: '',
        friday_hours: '',
        saturday_hours: '',
        sunday_hours: '',
        monday_start_time: '09:00',
        monday_end_time: '09:00',
        tuesday_start_time: '09:00',
        tuesday_end_time: '09:00',
        wednesday_start_time: '09:00',
        wednesday_end_time: '09:00',
        thursday_start_time: '09:00',
        thursday_end_time: '09:00',
        friday_start_time: '09:00',
        friday_end_time: '09:00',
        saturday_start_time: '09:00',
        saturday_end_time: '09:00',
        sunday_start_time: '09:00',
        sunday_end_time: '09:00',
      }
    ]);
  };

  /**  triggered when user picks a week in the drop-down  */
const handleWeekSelect = async (
  e: React.ChangeEvent<HTMLSelectElement>
) => {
  setPickerOpen(false);
  const sel = weeks.find(w => w.week_start === e.target.value);
  if (!sel) return;

  /* 1) an existing draft → open it */
  if (sel.status === 'draft') {
    navigate(`/timesheet/edit/${sel.timesheet_id}`);
    return;
  }

  if (['submitted', 'approved'].includes(sel.status)) {
    showToast('That week is already closed.', 'info');
    return;                     // stop right here
  }
  

  /* 2) rejected → start a brand-new draft but pre-fill rows */
  setCurrentWeek(new Date(sel.week_start));

  if (sel.status === 'rejected') {
    const { data } = await supabase
      .from('weekly_timesheets')
      .select('timesheet_entries(*)')
      .eq('id', sel.timesheet_id)
      .single();

    setEntries(
      (data?.timesheet_entries ?? []).map((t: any) => {
        const { id, timesheet_id, ...rest } = t;      // strip PK/FK
        return {
          ...rest,
          monday_hours:    t.monday_hours?.toString()    || '',
          tuesday_hours:   t.tuesday_hours?.toString()   || '',
          wednesday_hours: t.wednesday_hours?.toString() || '',
          thursday_hours:  t.thursday_hours?.toString()  || '',
          friday_hours:    t.friday_hours?.toString()    || '',
          saturday_hours:  t.saturday_hours?.toString()  || '',
          sunday_hours:    t.sunday_hours?.toString()    || '',
        };
      })
    )
    setIsOwner(true);
    setStatus('draft');
  } else {
    /* 3) brand-new week with no sheet yet */
    setEntries([]);
    setIsOwner(true);
    setStatus('draft');
  }

  setShowTimesheetForm(true);
};


  const handleRemoveEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleProjectChange = async (projectId: string, index: number) => {
    await fetchTasks(projectId);
    
    setEntries(prev => prev.map((entry, i) => {
      if (i === index) {
        return {
          ...entry,
          project_id: projectId,
          task_id: ''
        };
      }
      return entry;
    }));
  };

  const handleHoursChange = (index: number, day: string, value: string) => {
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    
    if (value && parseFloat(value) > 24) {
      setError('Hours cannot exceed 24 for a single day');
      return;
    }
    
    setEntries(prev => prev.map((entry, i) => {
      if (i === index) {
        const newEntry = { ...entry };
        newEntry[`${day}_hours` as keyof WeeklyEntry] = value;
        
        if (value && parseFloat(value) > 0) {
          const startTime = '09:00';
          const hours = Math.floor(parseFloat(value));
          const minutes = Math.round((parseFloat(value) % 1) * 60);
          const endHour = 9 + hours;
          const endMinute = minutes;
          const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
          
          newEntry[`${day}_start_time` as keyof WeeklyEntry] = startTime;
          newEntry[`${day}_end_time` as keyof WeeklyEntry] = endTime;
        } else {
          newEntry[`${day}_start_time` as keyof WeeklyEntry] = '09:00';
          newEntry[`${day}_end_time` as keyof WeeklyEntry] = '09:00';
        }
        
        return newEntry;
      }
      return entry;
    }));
  };

  const handleTimeChange = (index: number, day: string, field: 'start' | 'end', value: string) => {
    setEntries(prev => prev.map((entry, i) => {
      if (i === index) {
        const newEntry = { ...entry };
        const startTime = field === 'start' ? value : entry[`${day}_start_time` as keyof WeeklyEntry];
        const endTime = field === 'end' ? value : entry[`${day}_end_time` as keyof WeeklyEntry];
        
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        const hourDiff = endHour - startHour + (endMinute - startMinute) / 60;
        
        if (hourDiff > 24) {
          setError('Time difference cannot exceed 24 hours');
          return entry;
        }
        
        newEntry[`${day}_${field}_time` as keyof WeeklyEntry] = value;
        newEntry[`${day}_hours` as keyof WeeklyEntry] = hourDiff > 0 ? hourDiff.toFixed(2) : '0';
        
        return newEntry;
      }
      return entry;
    }));
  };

  const handleCopyFromPreviousWeek = async () => {
    try {
      const prevWeekStart = new Date(weekDays[0]);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      
      const { data, error } = await supabase
        .from('weekly_timesheets')
        .select(`
          *,
          timesheet_entries(*)
        `)
        .eq('week_start_date', prevWeekStart.toISOString().split('T')[0])
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          showToast('No timesheet found for previous week', 'info');
        } else {
          throw error;
        }
        return;
      }
      
      if (data) {
        setEntries(data.timesheet_entries.map((entry: any) => ({
          project_id: entry.project_id || '',
          task_id: entry.task_id || '',
          description: entry.description || '',
          monday_hours: entry.monday_hours?.toString() || '',
          tuesday_hours: entry.tuesday_hours?.toString() || '',
          wednesday_hours: entry.wednesday_hours?.toString() || '',
          thursday_hours: entry.thursday_hours?.toString() || '',
          friday_hours: entry.friday_hours?.toString() || '',
          saturday_hours: entry.saturday_hours?.toString() || '',
          sunday_hours: entry.sunday_hours?.toString() || '',
          monday_start_time: entry.monday_start_time || '09:00',
          monday_end_time: entry.monday_end_time || '09:00',
          tuesday_start_time: entry.tuesday_start_time || '09:00',
          tuesday_end_time: entry.tuesday_end_time || '09:00',
          wednesday_start_time: entry.wednesday_start_time || '09:00',
          wednesday_end_time: entry.wednesday_end_time || '09:00',
          thursday_start_time: entry.thursday_start_time || '09:00',
          thursday_end_time: entry.thursday_end_time || '09:00',
          friday_start_time: entry.friday_start_time || '09:00',
          friday_end_time: entry.friday_end_time || '09:00',
          saturday_start_time: entry.saturday_start_time || '09:00',
          saturday_end_time: entry.saturday_end_time || '09:00',
          sunday_start_time: entry.sunday_start_time || '09:00',
          sunday_end_time: entry.sunday_end_time || '09:00',
        })));
        
        showToast('Entries copied from previous week', 'success');
      }
    } catch (error: any) {
      showToast(error.message || 'Error copying from previous week', 'error');
    }
  };

  const closeModal = () => {
    setShowTimesheetForm(false);
    navigate('/timesheet', { state: { refresh: true } });
  };  

  
/* ------------------------------------------------------------------ */
/*  REPLACE the entire handleSaveTimesheet  function                  */
const handleSaveTimesheet = async (status: 'draft' | 'submitted') => {
  try {
    setIsLoading(true);
    setError(null);

/* --------------------------------------------------------------- *
+   * 1) create / keep the header **as draft** until lines are saved
+   * --------------------------------------------------------------- */
    const headerDraft = {
       user_id: currentUserId,
       week_start_date: weekDays[0].toISOString().split('T')[0],
       status: 'draft'                                         // <- force-draft
     };
 
     let savedTimesheetId = timesheetId;
 
     if (savedTimesheetId) {
       const { error } = await supabase
         .from('weekly_timesheets')
         .update(headerDraft)
         .eq('id', savedTimesheetId);
       if (error) throw error;
     } else {
       const { data, error } = await supabase
         .from('weekly_timesheets')
         .upsert(headerDraft, { onConflict: 'user_id,week_start_date' })
         .select()
         .single();
       if (error) throw error;
       savedTimesheetId = data.id;
     }

    /* 3. replace the detail rows ------------------------------------- */
    //  Always wipe the previous rows that belong to *this* timesheet,
    //  even on the first save (they’ll be zero rows – that’s OK).
    const { error: delErr } = await supabase
      .from('timesheet_entries')
      .delete()
      .eq('timesheet_id', savedTimesheetId);
    if (delErr) throw delErr;

    //  bulk-insert the current in-memory grid
    const payload = entries
      .filter(e => e.project_id)           // ignore completely empty lines
      .map(e => ({
        timesheet_id: savedTimesheetId,
        project_id: e.project_id,
        task_id: e.task_id || null,
        description: e.description,
        monday_hours:        e.monday_hours     ? Number(e.monday_hours)     : null,
        tuesday_hours:       e.tuesday_hours    ? Number(e.tuesday_hours)    : null,
        wednesday_hours:     e.wednesday_hours  ? Number(e.wednesday_hours)  : null,
        thursday_hours:      e.thursday_hours   ? Number(e.thursday_hours)   : null,
        friday_hours:        e.friday_hours     ? Number(e.friday_hours)     : null,
        saturday_hours:      e.saturday_hours   ? Number(e.saturday_hours)   : null,
        sunday_hours:        e.sunday_hours     ? Number(e.sunday_hours)     : null,
        monday_start_time:   e.monday_start_time,
        monday_end_time:     e.monday_end_time,
        tuesday_start_time:  e.tuesday_start_time,
        tuesday_end_time:    e.tuesday_end_time,
        wednesday_start_time:e.wednesday_start_time,
        wednesday_end_time:  e.wednesday_end_time,
        thursday_start_time: e.thursday_start_time,
        thursday_end_time:   e.thursday_end_time,
        friday_start_time:   e.friday_start_time,
        friday_end_time:     e.friday_end_time,
        saturday_start_time: e.saturday_start_time,
        saturday_end_time:   e.saturday_end_time,
        sunday_start_time:   e.sunday_start_time,
        sunday_end_time:     e.sunday_end_time
      }));

    const { error: insErr } = await supabase
      .from('timesheet_entries')
      .insert(payload);
    if (insErr) throw insErr;

        /* 4-b. flip header to “submitted” if requested -------------------- */
        if (status === 'submitted') {
          const { error } = await supabase
            .from('weekly_timesheets')
            .update({ status: 'submitted' })
            .eq('id', savedTimesheetId);
          if (error) throw error;
        }
    

    /* 4. feedback + navigation --------------------------------------- */
    showToast(
      status === 'draft' ? 'Timesheet saved' : 'Timesheet submitted',
      'success'
    );

    await reloadWeeks();      // make the picker up-to-date

    //  ensure we’re now in “edit” mode for further saves:
    if (!timesheetId) {
      navigate(`/timesheet/edit/${savedTimesheetId}`, { replace: true });
    } else {
      // just close the modal
      setShowTimesheetForm(false);
    }
  } catch (err: any) {
    showToast(err.message || 'Error saving timesheet', 'error');
  } finally {
    setIsLoading(false);
  }
};
/* ------------------------------------------------------------------ */


const handleCreateTimesheet = async () => {
  try {
    setIsLoading(true);

    // find Monday of the *current* calendar week
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    const result = await checkExistingTimesheet(monday);

    if ('draftId' in result) {
      navigate(`/timesheet/edit/${result.draftId}`);
      return;
    }

    // blank sheet for an unused week
    setCurrentWeek(result.weekStart);
    setEntries([]);
    setIsOwner(true);
    setStatus('draft');
    setShowTimesheetForm(true);

    if (+result.weekStart !== +monday) {
      showToast(
        `Current week is closed. Jumped to ${formatDate(result.weekStart)} – ` +
        `${formatDate(new Date(result.weekStart.getTime() + 6 * 864e5))}.`,
        'info'
      );
    }
  } catch (err: any) {
    showToast(err.message || 'Error while locating an open week', 'error');
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const prevWeek = new Date(currentWeek);
              prevWeek.setDate(prevWeek.getDate() - 7);
              setCurrentWeek(prevWeek);
            }}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentWeek(new Date())}
          >
            Today
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const nextWeek = new Date(currentWeek);
              nextWeek.setDate(nextWeek.getDate() + 7);
              setCurrentWeek(nextWeek);
            }}
            icon={<ChevronRight className="h-4 w-4" />}
          >
            Next
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Select
            options={[
              { value: 'all', label: 'All Entries' },
              { value: 'draft', label: 'Drafts' },
              { value: 'submitted', label: 'Submitted' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          />
          <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={async () => {
                await reloadWeeks();       // always fetch fresh statuses
                setPickerOpen(true);       // (this is the state you already created)
              }}              
            >
            Add Timesheet
          </Button>

          {/* ⇢ inline week selector */}
              {pickerOpen && (
                <select
                  className="border rounded px-2 py-1 text-sm"
                  onChange={handleWeekSelect}
                  defaultValue=""
                >
                  <option value="" disabled>Select week…</option>
                  {weeks.map(w => {
                    const start = new Date(w.week_start);
                    const end   = new Date(start); end.setDate(end.getDate() + 6);
                  
                    const locked = ['submitted', 'approved'].includes(w.status);
                    return (
                      <option
                        key={w.week_start}
                        value={w.week_start}
                        disabled={locked}
                      >
                        {formatDate(start)} – {formatDate(end)}
                        {w.status ? ` (${w.status})` : ''}
                      </option>
                    );
                  })}
                </select>
              )}

        </div>
      </div>
      
      <TimeEntryList 
        filter={filter}
      />
      
      {(showTimesheetForm || timesheetId) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-7xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Weekly Timesheet
              </h3>
              <div className="flex space-x-2">
              {!readOnly && ( 
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Copy className="h-4 w-4" />}
                  onClick={handleCopyFromPreviousWeek}
                >
                  Copy from Previous Week
                </Button>
              )}
              </div>
            </div>

            {error && (
              <div className="p-4 border-b bg-red-50">
                <div className="text-sm text-red-600">{error}</div>
              </div>
            )}
            
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left w-[200px]">Project</th>
                      <th className="px-4 py-2 text-left w-[200px]">Task</th>
                      <th className="px-4 py-2 text-left">Description</th>
                      {weekDays.map((day, index) => (
                        <th key={index} className="px-4 py-2 text-center w-[100px]">
                          <div className="text-sm text-gray-500">
                            {day.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className="font-medium">
                            {formatDate(day)}
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-2 w-[80px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">
                          <Select
                            options={[
                              { value: '', label: 'Select Project' },
                              ...projects.map(project => ({
                                value: project.id,
                                label: project.name
                              }))
                            ]}
                            value={entry.project_id}
                            onChange={(e) => handleProjectChange(e.target.value, index)}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Select
                            options={[
                              { value: '', label: 'Select Task' },
                              ...(tasks[entry.project_id] || []).map(task => ({
                                value: task.id,
                                label: task.name
                              }))
                            ]}
                            value={entry.task_id}
                            onChange={(e) => setEntries(prev => prev.map((entry, i) => 
                              i === index ? { ...entry, task_id: e.target.value } : entry
                            ))}
                            disabled={!entry.project_id}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            placeholder="Description"
                            value={entry.description}
                            disabled={readOnly}
                            onChange={(e) => setEntries(prev => prev.map((entry, i) => 
                              i === index ? { ...entry, description: e.target.value } : entry
                            ))}
                          />
                        </td>
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                          <td key={day} className="px-4 py-2">
                            <div className="space-y-1">
                              <Input
                                type="text"
                                placeholder="0.00"
                                className="text-center"
                                value={entry[`${day}_hours` as keyof WeeklyEntry]}
                                disabled={readOnly}
                                onChange={(e) => handleHoursChange(index, day, e.target.value)}
                              />
                              <div className="flex justify-center space-x-1 text-xs">
                                <input
                                  type="time"
                                  value={entry[`${day}_start_time` as keyof WeeklyEntry]}
                                  disabled={readOnly}
                                  onChange={(e) => handleTimeChange(index, day, 'start', e.target.value)}
                                  className="w-20 px-1 py-0.5 border rounded"
                                />
                                <input
                                  type="time"
                                  value={entry[`${day}_end_time` as keyof WeeklyEntry]}
                                  disabled={readOnly}
                                  onChange={(e) => handleTimeChange(index, day, 'end', e.target.value)}
                                  className="w-20 px-1 py-0.5 border rounded"
                                />
                              </div>
                            </div>
                          </td>
                        ))}
                        <td className="px-4 py-2">
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEntry(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 flex justify-between">
              {!readOnly && (
                <Button
                  variant="outline"
                  onClick={handleAddEntry}
                  icon={<Plus className="h-4 w-4" />}
                >
                  Add Row
                </Button>
                )}
                <div className="space-x-2">
                {!readOnly && (
                  <Button
                    variant="outline"
                    onClick={() => handleSaveTimesheet('draft')}
                    isLoading={isLoading}
                  >
                    Save as Draft
                  </Button>
                )}
                {!readOnly && (  
                  <Button
                    variant="primary"
                    onClick={() => handleSaveTimesheet('submitted')}
                    isLoading={isLoading}
                  >
                    Submit Timesheet
                  </Button>
                )}
                  
                  <Button variant="outline" onClick={closeModal}>Cancel</Button>

                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={closeModal}
                  >
                    <span className="sr-only">Close</span>
                    <span className="text-xl font-semibold">&times;</span>
                  </button>

                  
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Timesheet;