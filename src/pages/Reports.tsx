import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  Calendar,
  Download,
  Users,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';

/**
 * Helper – sum the seven day‑columns of one entry
 */
const entryTotalHours = (e: any) =>
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].reduce(
    (sum, d) => sum + (e[`${d}_hours`] || 0),
    0,
  );

// pretty print hours (always 2 decimals)
const fmtHours = (h: number) => h.toFixed(2);

interface ProjectRow {
  id: string;
  name: string;
}
interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

type ReportType = 'time' | 'project' | 'team';
type Range = 'week' | 'month' | 'year';

const Reports: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('time');
  const [timeRange, setTimeRange] = useState<Range>('week');
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  /* ───────────────────────────────────────── fetch look‑ups */
  useEffect(() => {
    (async () => {
      const [{ data: pj }, { data: us }] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name')
          .eq('archived', false)
          .order('name'),
        supabase
          .from('users')
          .select('id, full_name, email')
          .order('full_name'),
      ]);
      setProjects(pj ?? []);
      setUsers(us ?? []);
    })();
  }, []);

  /* ───────────────────────────────────────── core query */
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('timesheet_entries')
        .select(`*, weekly_timesheets!inner ( week_start_date, status, user_id )`);

      // date filter (compare Monday)
      const now = new Date();
      const startDate = new Date(now);
      if (timeRange === 'week') startDate.setDate(now.getDate() - 7);
      else if (timeRange === 'month') startDate.setMonth(now.getMonth() - 1);
      else startDate.setFullYear(now.getFullYear() - 1);

      query = query.gte(
        'weekly_timesheets.week_start_date',
        startDate.toISOString().split('T')[0],
      );

      if (selectedProject !== 'all') query = query.eq('project_id', selectedProject);
      if (selectedUser !== 'all') query = query.eq('weekly_timesheets.user_id', selectedUser);

      const { data, error } = await query;
      if (error) throw error;
      if (!data) {
        setReportData([]);
        return;
      }

      let fmt: any[] = [];
      if (reportType === 'time') {
        const byDate: Record<string, number> = {};
        data.forEach((e) => {
          const date = e.weekly_timesheets.week_start_date;
          byDate[date] = (byDate[date] || 0) + entryTotalHours(e);
        });
        fmt = Object.entries(byDate).map(([date, hours]) => ({ date, hours }));
        fmt.sort((a, b) => a.date.localeCompare(b.date));
      } else if (reportType === 'project') {
        const byProj: Record<string, number> = {};
        const names = Object.fromEntries(projects.map((p) => [p.id, p.name]));
        data.forEach((e) => {
          if (!e.project_id) return;
          byProj[e.project_id] = (byProj[e.project_id] || 0) + entryTotalHours(e);
        });
        fmt = Object.entries(byProj)
          .filter(([, h]) => h > 0)
          .map(([id, hours]) => ({ name: names[id] || 'Project', hours }))
          .sort((a, b) => b.hours - a.hours);
      } else {
        // team
        const byUser: Record<string, number> = {};
        const names = Object.fromEntries(users.map((u) => [u.id, u.full_name || u.email || 'User']));
        data.forEach((e) => {
          const uid = e.weekly_timesheets.user_id;
          byUser[uid] = (byUser[uid] || 0) + entryTotalHours(e);
        });
        fmt = Object.entries(byUser)
          .filter(([, h]) => h > 0)
          .map(([id, hours]) => ({ name: names[id] || 'User', hours }))
          .sort((a, b) => b.hours - a.hours);
      }
      setReportData(fmt);
    } catch (err) {
      console.error('Report fetch error', err);
    } finally {
      setIsLoading(false);
    }
  }, [reportType, timeRange, selectedProject, selectedUser, projects, users]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  /* ───────────────────────────────────────── helpers */
  const reportIcon = () =>
    reportType === 'time' ? (
      <Calendar className="h-5 w-5 text-blue-500" />
    ) : reportType === 'project' ? (
      <BarChart2 className="h-5 w-5 text-blue-500" />
    ) : (
      <Users className="h-5 w-5 text-blue-500" />
    );

  const timeLabel = timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : 'Yearly';
  const title =
    reportType === 'time'
      ? `${timeLabel} Time Report`
      : reportType === 'project'
      ? `Project Distribution – ${timeLabel}`
      : `Team Member Hours – ${timeLabel}`;

  /* ───────────────────────────────────────── chart */
  const chart = () => {
    if (isLoading)
      return <div className="h-64 flex items-center justify-center text-gray-500">Loading…</div>;
    if (!reportData.length)
      return <div className="h-64 flex items-center justify-center text-gray-500">No data for chosen filters</div>;

    return (
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={reportData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={reportType === 'time' ? 'date' : 'name'}
              tick={{ fontSize: 12 }}
              interval={0}
              angle={reportType === 'time' ? 0 : -45}
              textAnchor={reportType === 'time' ? 'middle' : 'end'}
              height={reportType === 'time' ? 30 : 80}
            />
            <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v: number) => [`${fmtHours(v)} h`, 'Hours']}
              labelFormatter={(l) => (reportType === 'time' ? `Week of ${l}` : l)}
            />
            <Legend />
            <Bar dataKey="hours" name="Hours" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  /* ───────────────────────────────────────── JSX */
  const total = reportData.reduce((s, i) => s + i.hours, 0);
  const avg = reportData.length ? total / reportData.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-2">
          {reportIcon()}
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <Button variant="outline" icon={<Download className="h-4 w-4" />}>Export</Button>
      </div>

      {/* filters */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-4 border-b grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* type */}
          <div>
            <label className="block text-sm font-medium mb-1">Report Type</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)} className="w-full border rounded px-2 py-1">
              <option value="time">Time (weekly)</option>
              <option value="project">By Project</option>
              <option value="team">By Team Member</option>
            </select>
          </div>
          {/* range */}
          <div>
            <label className="block text-sm font-medium mb-1">Time Range</label>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as Range)} className="w-full border rounded px-2 py-1">
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="year">Last 12 months</option>
            </select>
          </div>
          {/* project */}
          <div>
            <label className="block text-sm font-medium mb-1">Project</label>
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full border rounded px-2 py-1">
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {/* user */}
          <div>
            <label className="block text-sm font-medium mb-1">Team Member</label>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full border rounded px-2 py-1">
              <option value="all">All Members</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || u.email || 'User'}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-4">{chart()}</div>

        {/* summary */}
        <div className="p-4 border-t bg-gray-50 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-500">Total Hours</div>
            <div className="text-lg font-semibold">{fmtHours(total)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">{reportType === 'project' ? 'Projects' : reportType === 'team' ? 'Members' : 'Weeks'} Tracked</div>
            <div className="text-lg font-semibold">{reportData.length}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Average Hours</div>
            <div className="text-lg font-semibold">{fmtHours(avg)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
