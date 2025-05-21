// src/pages/TimeTracker.tsx
import React, { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import TimeCard, { Session } from '../components/TimerCard'
import TimeEntryForm from '../components/TimeEntryForm'
import Button from '../components/ui/Button'
import Toast  from '../components/ui/Toast'
import { supabase } from '../lib/supabase'

/* ────────────────────────────────────────────────────────────
   Types that match the SELECT we run further below
   ──────────────────────────────────────────────────────────── */
   interface SheetEntry {
    id: string
    description: string | null
    /* weekday columns */
    [key: string]: any
  
    /* 👇 allow object **or** array */
    projects: { name: string } | { name: string }[]
    tasks:    { name: string } | { name: string }[]
  }
  
interface SheetWithEntries {
  id: string
  week_start_date: string
  timesheet_entries: SheetEntry[]
}

interface TodayRow {
  id: string
  projectName: string
  taskName: string
  description: string | null
  start_time: string
  end_time:   string | null
}

/* little helper – ISO Monday (week start) for any JS date */
const isoMonday = (d: Date) => {
  const m = new Date(d)
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7))
  return m.toISOString().split('T')[0]
}

const TimeTracker: React.FC = () => {
  /* ───────── local state ───────── */
  const [formOpen, setFormOpen] = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [seed,     setSeed]     = useState<Partial<Session>>({})
  const [refreshK, setRefreshK] = useState(0)

  const [todayRows, setTodayRows] = useState<TodayRow[]>([])
  const [toast,     setToast]     = useState<{message:string;type:'success'|'error'|'info'}|null>(null)

  /* ───────── helpers / callbacks ───────── */
  const openForm = (id?: string) => { setEditId(id ?? null); setFormOpen(true) }

  const handleStop = (s: Session) => { setSeed(s); openForm() }

  const handleSuccess = () => {
    setFormOpen(false)
    setSeed({})
    setRefreshK(k => k + 1)
    setToast({ message: 'Time entry added', type: 'success' })
  }

  /* ───────── fetch *today* each time refreshK changes ───────── */
  useEffect(() => {
    (async () => {
      const today     = new Date()
      const weekStart = isoMonday(today)
      const weekday   = today.toLocaleString('en-GB', { weekday:'long' }).toLowerCase() // e.g. "wednesday"

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      /* dynamic column list for the weekday we’re in */
      const cols = `
        id,
        description,
        ${weekday}_start_time,
        ${weekday}_end_time,
        projects:project_id(name),
        tasks:task_id(name)
      `

      const { data: sheet, error } = await supabase
       .from('weekly_timesheets')
       /* ↓————————— no generic here —————————↓ */
       .select(`id, week_start_date, timesheet_entries(${cols})`)
       .eq('user_id', user.id)
       .eq('week_start_date', weekStart)
       /*           row-shape generic belongs here ↓ */
       .single<SheetWithEntries>();


      if (error) {
        console.error('Today-list query failed:', error)
        setTodayRows([])             // show “no entries”
        return
      }

      const rows: TodayRow[] =
      (sheet?.timesheet_entries ?? []).map((e): TodayRow => {
        /* helper to pick the first .name whatever the shape is */
        const getName = (fld?: { name: string } | { name: string }[]) =>
          Array.isArray(fld) ? fld[0]?.name : fld?.name
    
        const project = getName(e.projects) ?? 'No project'
        const task    = getName(e.tasks)    ?? 'No task'
    
        return {
          id:          e.id,
          projectName: project,
          taskName:    task,
          description: e.description,
          start_time:  e[`${weekday}_start_time`] || '',
          end_time:    e[`${weekday}_end_time`]   || null
        }
      })
    

      setTodayRows(rows)
    })()
  }, [refreshK])


/* helper: works for "2025-05-08T10:30:00"  AND  "10:30:00" */
const hhmm = (t?: string | null) =>
  t ? (t.includes('T') ? t.slice(11, 16) : t.slice(0, 5)) : '--:--'


  /* ───────── UI ───────── */
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* left – timer + add button */}
        <div>
          <TimeCard onStopped={handleStop} />

          <Button
            className="mt-6 w-full"
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => openForm()}
          >
            Add time entry
          </Button>
        </div>

        {/* right – today’s entries */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="mb-4 text-lg font-medium">Today’s entries</h3>

              {todayRows.length === 0 ? (
                <p className="text-gray-500">No entries for today</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">
                          Time (start – end)
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">
                          Project
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">
                          Task
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">
                          Description
                        </th>
                      </tr>
                    </thead>
              
                    <tbody className="divide-y divide-gray-100">
                      {todayRows.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-3 py-2 font-mono">
                            {hhmm(r.start_time)} – {hhmm(r.end_time)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">
                            {r.projectName}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                            {r.taskName}
                          </td>
                          <td className="px-3 py-2 text-gray-500">
                            {r.description || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                  </table>
                </div>
              )}
            </div>
          </div>

      </div>

      {/* modal */}
      {formOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-600 bg-opacity-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-medium">{editId ? 'Edit' : 'Add'} time entry</h3>
              <button className="text-xl font-semibold text-gray-400 hover:text-gray-500" onClick={() => setFormOpen(false)}>
                &times;
              </button>
            </div>
            <div className="p-4">
              <TimeEntryForm entryId={editId ?? undefined} seed={seed} onSuccess={handleSuccess}/>
            </div>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default TimeTracker
