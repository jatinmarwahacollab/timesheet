import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Check, X, Clock } from 'lucide-react';
import Button from '../components/ui/Button';
import Avatar from '../components/Avatar';
import { supabase } from '../lib/supabase';
import { formatHoursDecimal } from '../lib/utils';

const Team: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [isLoading, setIsLoading] = useState(true);
  const [memberStats, setMemberStats] = useState<Record<string, { hours: number, projects: number }>>({});
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    if (teamMembers.length > 0) {
      fetchMemberStats();
    }
  }, [teamMembers]);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      
      // Get organization ID
      const { data: orgData, error: orgError } = await supabase
        .from('org_memberships')
        .select('org_id, role')
        .limit(1);
        
      if (orgError) throw orgError;
      
      if (orgData && orgData.length > 0) {
        setCurrentUserRole(orgData[0].role);
        
        // Get all members of the organization
        const { data, error } = await supabase
          .from('org_memberships')
          .select('*, users(*)')
          .eq('org_id', orgData[0].org_id)
          .order('role', { ascending: false });
          
        if (error) throw error;
        
        if (data) {
          setTeamMembers(data);
        }
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMemberStats = async () => {
    try {
      // Get time entries per user
      const { data: timeData, error: timeError } = await supabase
        .from('time_entries')
        .select('user_id, duration_sec');
        
      if (timeError) throw timeError;
      
      // Get project memberships per user
      const { data: projectData, error: projectError } = await supabase
        .from('project_memberships')
        .select('user_id, project_id');
        
      if (projectError) throw projectError;
      
      // Compile stats
      const stats: Record<string, { hours: number, projects: number }> = {};
      
      // Initialize for all members
      teamMembers.forEach(member => {
        stats[member.user_id] = { hours: 0, projects: 0 };
      });
      
      // Add time data
      if (timeData) {
        timeData.forEach((entry: any) => {
          if (stats[entry.user_id]) {
            stats[entry.user_id].hours += (entry.duration_sec || 0) / 3600;
          }
        });
      }
      
      // Add project data
      if (projectData) {
        const projectCounts: Record<string, Set<string>> = {};
        
        projectData.forEach((membership: any) => {
          if (!projectCounts[membership.user_id]) {
            projectCounts[membership.user_id] = new Set();
          }
          projectCounts[membership.user_id].add(membership.project_id);
        });
        
        Object.keys(projectCounts).forEach(userId => {
          if (stats[userId]) {
            stats[userId].projects = projectCounts[userId].size;
          }
        });
      }
      
      setMemberStats(stats);
    } catch (error) {
      console.error('Error fetching member stats:', error);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // In a real app, you would send an invitation here
      // This is just a mockup for the UI
      alert(`Invitation would be sent to ${inviteEmail} with role ${memberRole}`);
      setShowInviteForm(false);
    } catch (error) {
      console.error('Error inviting user:', error);
    }
  };

  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('org_memberships')
        .update({ role: memberRole })
        .eq('user_id', selectedMember.user_id)
        .eq('org_id', selectedMember.org_id);
        
      if (error) throw error;
      
      setShowRoleForm(false);
      fetchTeamMembers();
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

  const handleRemoveMember = async (member: any) => {
    if (!confirm(`Are you sure you want to remove ${member.users?.full_name || member.users?.email || 'this user'} from the organization?`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('org_memberships')
        .delete()
        .eq('user_id', member.user_id)
        .eq('org_id', member.org_id);
        
      if (error) throw error;
      
      fetchTeamMembers();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const openRoleForm = (member: any) => {
    setSelectedMember(member);
    setMemberRole(member.role);
    setShowRoleForm(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading team members...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div className="font-medium text-gray-500">
          {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
        </div>
        
        {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
          <Button
            variant="primary"
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => setShowInviteForm(true)}
          >
            Invite User
          </Button>
        )}
      </div>
      
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hours Tracked
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Projects
              </th>
              {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teamMembers.map(member => (
              <tr key={member.user_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Avatar 
                      name={member.users?.full_name || member.users?.email || 'User'}
                      size="md"
                    />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {member.users?.full_name || 'Unnamed User'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.users?.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${getRoleBadgeColor(member.role)}`}>
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-400 mr-1" />
                    {formatHoursDecimal(memberStats[member.user_id]?.hours || 0)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {memberStats[member.user_id]?.projects || 0}
                </td>
                {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {/* Cannot modify owner unless you are owner */}
                    {(member.role !== 'owner' || currentUserRole === 'owner') && (
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openRoleForm(member)}
                        >
                          Change Role
                        </Button>
                        
                        {/* Cannot remove owner */}
                        {member.role !== 'owner' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Invite Team Member
              </h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setShowInviteForm(false)}
              >
                <span className="sr-only">Close</span>
                <span className="text-xl font-semibold">&times;</span>
              </button>
            </div>
            
            <form onSubmit={handleInvite} className="p-4">
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="user@example.com"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as any)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {currentUserRole === 'owner' && <option value="owner">Owner</option>}
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
                
                <div className="mt-2 text-sm text-gray-500">
                  {memberRole === 'owner' && 'Owner has full control of the organization and can manage all settings.'}
                  {memberRole === 'admin' && 'Admin can manage projects, users, and most settings.'}
                  {memberRole === 'member' && 'Member can track time and access assigned projects.'}
                </div>
              </div>
              
              <div className="pt-4 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  icon={<Mail className="h-4 w-4" />}
                >
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Change Role Form Modal */}
      {showRoleForm && selectedMember && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Change Role
              </h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setShowRoleForm(false)}
              >
                <span className="sr-only">Close</span>
                <span className="text-xl font-semibold">&times;</span>
              </button>
            </div>
            
            <form onSubmit={handleChangeRole} className="p-4">
              <div className="mb-4">
                <div className="flex items-center">
                  <Avatar 
                    name={selectedMember.users?.full_name || selectedMember.users?.email || 'User'}
                    size="md"
                  />
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {selectedMember.users?.full_name || 'Unnamed User'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {selectedMember.users?.email}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as any)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {currentUserRole === 'owner' && <option value="owner">Owner</option>}
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
                
                <div className="mt-2 text-sm text-gray-500">
                  {memberRole === 'owner' && 'Owner has full control of the organization and can manage all settings.'}
                  {memberRole === 'admin' && 'Admin can manage projects, users, and most settings.'}
                  {memberRole === 'member' && 'Member can track time and access assigned projects.'}
                </div>
              </div>
              
              <div className="pt-4 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowRoleForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                >
                  Update Role
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;