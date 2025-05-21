import React, { useEffect, useState, useCallback } from 'react';
import { Briefcase, Plus, Archive, ExternalLink, Clock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { formatHoursDecimal } from '../lib/utils';

/* ───────────────────────── helpers ──────────────────────────── */
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

/** Sum the seven *_hours columns, coercing Supabase’s strings → numbers */
const rowTotal = (e: any) =>
  DAYS.reduce((sum, d) => sum + Number(e[`${d}_hours`] ?? 0), 0);

type ProjectRow = {
  id: string;
  name: string;
  client_name: string | null;
  billable: boolean;
  hourly_rate: number | null;
  archived: boolean;
};

interface StatBag {
  hours:   number;   // summed decimal hours
  members: number;   // unique users on the project
}

/* ══════════════════════════════════════════════════════════════ */

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [stats,    setStats]    = useState<Record<string, StatBag>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  /* ───────── fetch the list itself ───────── */
  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      let q = supabase.from('projects').select('*').order('name');
      if (!showArchived) q = q.eq('archived', false);

      const { data, error } = await q;
      if (error) throw error;

      setProjects(data ?? []);
    } catch (err) {
      console.error('[Projects] list', err);
    } finally {
      setIsLoading(false);
    }
  }, [showArchived]);

  /* ───────── pull hours + member counts ───────── */
  const fetchStats = useCallback(async (projectIds: string[]) => {
    if (!projectIds.length) return;

    try {
      /* 1️⃣  hours  */
      const { data: entries, error: eErr } = await supabase
        .from('timesheet_entries')
        .select(
          'project_id, monday_hours, tuesday_hours, wednesday_hours, thursday_hours, friday_hours, saturday_hours, sunday_hours'
        )
        .in('project_id', projectIds);
      if (eErr) throw eErr;

      /* 2️⃣  team members  */
      const { data: memberships, error: mErr } = await supabase
        .from('project_memberships')
        .select('project_id, user_id')
        .in('project_id', projectIds);
      if (mErr) throw mErr;

      /* 3️⃣  crunch  */
      const bag: Record<string, StatBag> =
        Object.fromEntries(projectIds.map(id => [id, { hours: 0, members: 0 }]));

      entries?.forEach(row => {
        bag[row.project_id].hours += rowTotal(row)*3600;
      });

      const uniq: Record<string, Set<string>> = {};
      memberships?.forEach(r => {
        (uniq[r.project_id] ||= new Set()).add(r.user_id);
      });
      Object.entries(uniq).forEach(([pid, set]) => (bag[pid].members = set.size));

      setStats(bag);
    } catch (err) {
      console.error('[Projects] stats', err);
    }
  }, []);

  /* ───────── effects ───────── */
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    if (projects.length) fetchStats(projects.map(p => p.id));
  }, [projects, fetchStats]);

  /* ───────── render ───────── */
  if (isLoading) return <div className="text-center py-4">Loading projects…</div>;

  return (
    <div className="space-y-6">
      {/* toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div className="font-medium text-gray-500">
          {projects.length} {projects.length === 1 ? 'project' : 'projects'} {showArchived && '(including archived)'}
        </div>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Button
            variant="outline"
            icon={<Archive className="h-4 w-4" />}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
            New Project
          </Button>
        </div>
      </div>

      {/* cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map(p => {
          const s = stats[p.id] ?? { hours: 0, members: 0 };

          return (
            <div
              key={p.id}
              className={`bg-white rounded-lg border shadow-sm transition hover:shadow-md ${p.archived ? 'opacity-60' : ''}`}
            >
              <div className="p-4 border-b">
                <Link to={`/projects/${p.id}`} className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{p.name}</h3>
                    {p.client_name && <p className="text-sm text-gray-500">Client: {p.client_name}</p>}
                  </div>
                  <ExternalLink className="h-5 w-5 text-gray-400" />
                </Link>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm text-gray-500">Hours</div>
                      <div className="font-medium">{formatHoursDecimal(s.hours)}</div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm text-gray-500">Team</div>
                      <div className="font-medium">{s.members} members</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center mt-4 text-sm">
                  {p.billable ? (
                    <>
                      <span className="mr-2">Billable</span>
                      {p.hourly_rate && (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          ${p.hourly_rate}/hr
                        </span>
                      )}
                    </>
                  ) : (
                    <span>Non‑billable</span>
                  )}
                  {p.archived && (
                    <span className="ml-auto bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                      Archived
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* empty‑state */}
      {projects.length === 0 && (
        <div className="text-center py-12">
          <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
          <div className="mt-6">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              New Project
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
