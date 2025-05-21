import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Edit, Clock, CheckCircle, XCircle } from 'lucide-react';
import Button from './ui/Button';
import Toast from './ui/Toast';
import { supabase } from '../lib/supabase';
import { formatDate, formatHoursDecimal, statusColors } from '../lib/utils';
import { useLocation } from 'react-router-dom';

interface TimeEntryListProps {
  filter?: 'all' | 'draft' | 'submitted' | 'approved' | 'rejected';
  limit?: number;
  showActions?: boolean;
  fromView?: 'today';
  onEdit?: (entryId: string) => void;
}

const TimeEntryList: React.FC<TimeEntryListProps> = ({ 
  filter = 'all', 
  limit,
  showActions = true,
  fromView,
  onEdit,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isManager, setIsManager] = useState(false);

useEffect(() => {
  supabase.rpc('fn_is_current_user_manager')      // ← a tiny SQL function*
           .then(({ data }) => setIsManager(!!data));
}, []);


  useEffect(() => {
    const shouldRefresh = (location.state as any)?.refresh;
  
    if (shouldRefresh) {
      // strip the flag (prevents an infinite loop) …
      navigate(location.pathname, { replace: true });
    }
  
    // …then always fetch the list
    fetchTimesheets();
  }, [filter, limit, location.state]);
   

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const fetchTimesheets = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('weekly_timesheets')
        .select(`
          *,
          timesheet_entries(
            id,
            project_id,
            task_id,
            description,
            monday_hours,
            tuesday_hours,
            wednesday_hours,
            thursday_hours,
            friday_hours,
            saturday_hours,
            sunday_hours,
            projects:project_id(name),
            tasks:task_id(name)
          )
        `)
        .order('week_start_date', { ascending: false });
      
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

        /* ② today‑only view */
      if (fromView === 'today') {
        const todayIso = new Date().toISOString().split('T')[0];
        query = query.gte('start_time', todayIso);
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data) {
        setTimesheets(data);
      }
    } catch (error: any) {
      showToast(error.message || 'Error fetching timesheets', 'error');
    } finally {
      setIsLoading(false);
    }
  };


  const handleEdit = (timesheet: any) => {
    navigate(`/timesheet/edit/${timesheet.id}`);
  };

  const openSheet = (t: any) => {
    navigate(`/timesheet/view/${t.id}`);
  };
  

  const handleSubmit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('weekly_timesheets')
        .update({ status: 'submitted' })
        .eq('id', id);
      
      if (error) throw error;
      
      showToast('Timesheet submitted successfully', 'success');
      fetchTimesheets();
    } catch (error: any) {
      showToast(error.message || 'Error submitting timesheet', 'error');
    }
  };
  

  const handleApprove = async (id: string) => {
    try {
      const { error, data } = await supabase
         .from('weekly_timesheets')
        .update({ status: 'approved' })
        .eq('id', id)
        .eq('status', 'submitted')      //  <-- extra guard
        .select();                      //  <-- get the updated row back

        if (error || !data?.length) {
        throw error ?? new Error('Timesheet could not be updated');
        }
      
      showToast('Timesheet approved successfully', 'success');
      fetchTimesheets();
    } catch (error: any) {
      showToast(error.message || 'Error approving timesheet', 'error');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('weekly_timesheets')
        .update({ status: 'rejected' })
        .eq('id', id);
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('You do not have permission to reject this timesheet');
        }
        throw error;
      }
      
      showToast('Timesheet rejected', 'info');
      fetchTimesheets();
    } catch (error: any) {
      showToast(error.message || 'Error rejecting timesheet', 'error');
    }
  };

  const calculateTotalHours = (entries: any[]) =>
    entries.reduce((total, entry) => {
      const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      return days.reduce(
        (sum, d) => sum + (Number(entry[`${d}_hours`]) || 0),
        total
      );
    }, 0);
  

  if (isLoading) {
    return <div className="p-4 text-center">Loading timesheets...</div>;
  }

  if (timesheets.length === 0) {
    return (
      <div className="p-6 text-center border rounded-lg bg-gray-50">
        <Clock className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-base font-semibold text-gray-900">No timesheets</h3>
        <p className="mt-1 text-sm text-gray-500">
          {filter === 'all' 
            ? "You haven't created any timesheets yet." 
            : `You don't have any ${filter} timesheets.`}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projects
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Hours
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {showActions &&(
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timesheets.map(timesheet => {
                const weekStart = new Date(timesheet.week_start_date);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                
                const uniqueProjects = new Set(
                  timesheet.timesheet_entries
                    .map((entry: any) => entry.projects?.name)
                    .filter(Boolean)
                );
                
                const totalHours = calculateTotalHours(timesheet.timesheet_entries);
                
                return (
                  <tr key={timesheet.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">
                      <Link to={`/timesheet/view/${timesheet.id}`}>
                        {formatDate(weekStart)} – {formatDate(weekEnd)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {Array.from(uniqueProjects).join(', ') || 'No projects'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {totalHours.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${statusColors[timesheet.status]}`}>
                        {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                      </span>
                    </td>
                    {/* ---------- ACTIONS column ---------- */}
                    {showActions && (
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                    
                          {/* Owner of a DRAFT ------------------------------------------------ */}
                          {timesheet.status === 'draft' && (
                            <>
                              {onEdit && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={e => { e.stopPropagation(); onEdit(timesheet.id); }}
                                  icon={<Edit className="h-4 w-4" />}
                                >
                                  Edit
                                </Button>
                              )}
                    
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSubmit(timesheet.id)}
                                icon={<CheckCircle className="h-4 w-4" />}
                              >
                                Submit
                              </Button>
                            </>
                          )}
                    
                          {/* Manager on a SUBMITTED sheet ----------------------------------- */}
                          {isManager && timesheet.status === 'submitted' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={e => { e.stopPropagation(); handleApprove(timesheet.id); }}
                                icon={<CheckCircle className="h-4 w-4" />}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={e => { e.stopPropagation(); handleReject(timesheet.id); }}
                                icon={<XCircle className="h-4 w-4" />}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    )}

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default TimeEntryList;