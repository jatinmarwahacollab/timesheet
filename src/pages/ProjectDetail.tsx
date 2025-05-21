import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Plus, Clock, ChevronRight, Pencil,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Avatar from '../components/Avatar';
import TimeEntryList from '../components/TimeEntryList';
import { supabase } from '../lib/supabase';
import { formatHoursDecimal } from '../lib/utils';

/* ───────────────────────── helpers ─────────────────────────── */
const DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday',
];
const rowTotal = (e: any) =>
  DAYS.reduce((s, d) => s + Number(e[`${d}_hours`] ?? 0), 0);

/* ═════════════════════════════════════════════════════════════ */

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [tasks,   setTasks]   = useState<any[]>([]);
  const [team,    setTeam]    = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* totals by status */
  const [stats, setStats] = useState({
    totalHours:     0,
    draftHours:     0,
    submittedHours: 0,
    approvedHours:  0,
  });

  /* dialogs (unchanged behaviour) */
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTask,  setEditingTask]  = useState<any>(null);
  const [allUsers,     setAllUsers]     = useState<any[]>([]);

  /* ───────── fetch everything ───────── */
  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        /* project */
        const { data: prj } = await supabase.from('projects')
          .select('*').eq('id', id).single();
        setProject(prj);

        /* tasks */
        const { data: t } = await supabase.from('tasks')
          .select('*').eq('project_id', id).order('name');
        setTasks(t ?? []);

        /* team */
        const { data: tm } = await supabase.from('project_memberships')
          .select('*, users(*)').eq('project_id', id);
        setTeam(tm ?? []);

        /* hours – join parent weekly sheet to get status */
        const { data: rows } = await supabase.from('timesheet_entries')
          .select(`
            monday_hours,tuesday_hours,wednesday_hours,thursday_hours,
            friday_hours,saturday_hours,sunday_hours,
            weekly_timesheets(status)
          `)
          .eq('project_id', id);

        const bag = { totalHours: 0, draftHours: 0, submittedHours: 0, approvedHours: 0 };

        rows?.forEach((r: any) => {
          const h   = rowTotal(r);
          const st  = r.weekly_timesheets?.status;   // <- joined column
          bag.totalHours += h*3600;

          switch (st) {
            case 'draft':     bag.draftHours     += h*3600; break;
            case 'submitted': bag.submittedHours += h*3600; break;
            case 'approved':  bag.approvedHours  += h*3600; break;
          }
        });

        setStats(bag);
      } catch (err) {
        console.error('[ProjectDetail]', err);
        navigate('/projects');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, navigate]);

  /* (task / team modal helpers are identical to your previous version) */
  const fetchAllUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('full_name');
    setAllUsers(data ?? []);
  };

  /* ───────── render ───────── */
  if (isLoading) return <div className="text-center py-4">Loading project…</div>;
  if (!project)   return <div className="text-center py-4">Project not found</div>;

  return (
    <div className="space-y-6">
      {/* back */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Projects
        </button>
      </div>

      {/* header & stats */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{project.name}</h2>
              <p className="text-gray-500">
                {project.client_name ? `Client: ${project.client_name}` : 'No client'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`/projects?edit=${project.id}`)}
            >
              Edit Project
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Hours',     val: stats.totalHours },
              { label: 'Approved Hours',  val: stats.approvedHours },
              { label: 'Submitted Hours', val: stats.submittedHours },
              { label: 'Draft Hours',     val: stats.draftHours },
            ].map(card => (
              <div key={card.label} className="rounded-lg bg-gray-50 p-4">
                <div className="font-medium text-gray-500">{card.label}</div>
                <div className="mt-1 text-2xl font-semibold">
                  {formatHoursDecimal(card.val)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent entries (unchanged) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">Recent Time Entries</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/timesheet')}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="p-4">
              <TimeEntryList filter="all" limit={5} />
            </div>
          </div>
        </div>

        {/* tasks + team panes – identical markup as before,
            removed here for brevity but they still reference
            showTaskForm / showTeamForm variables */}
      </div>

      {/* your existing Task / Team modals go right here – unchanged */}
    </div>
  );
};

export default ProjectDetail;
