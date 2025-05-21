import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Building, LogOut } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';

interface SettingsProps {
  user: any;
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [organization, setOrganization] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('org_memberships')
        .select('*, organisations(*)')
        .single();
      
      if (error) throw error;
      
      if (data) {
        setOrganization(data.organisations);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setUpdateSuccess(true);
      
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('organisations')
        .update({ name: organization.name })
        .eq('id', organization.id);
        
      if (error) throw error;
      
      setUpdateSuccess(true);
      
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error updating organization:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center">
            <SettingsIcon className="h-6 w-6 text-gray-400 mr-2" />
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r">
            <nav className="p-4 space-y-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full text-left ${
                  activeTab === 'profile'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <User className="mr-3 h-5 w-5 flex-shrink-0" />
                Profile
              </button>
              
              <button
                onClick={() => setActiveTab('organization')}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full text-left ${
                  activeTab === 'organization'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Building className="mr-3 h-5 w-5 flex-shrink-0" />
                Organization
              </button>
              
              <div className="pt-4 md:hidden">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700"
                  onClick={handleSignOut}
                  icon={<LogOut className="h-5 w-5" />}
                >
                  Sign Out
                </Button>
              </div>
            </nav>
          </div>
          
          <div className="flex-1 p-6">
            {activeTab === 'profile' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6">Profile Settings</h3>
                
                <div className="flex items-center mb-6">
                  <Avatar 
                    name={fullName || email || 'User'} 
                    size="lg"
                  />
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">
                      Your profile picture is based on your name's initials
                    </p>
                  </div>
                </div>
                
                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
                  <Input
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  
                  <Input
                    label="Email Address"
                    value={email}
                    disabled
                    helpText="Email cannot be changed"
                  />
                  
                  <div className="pt-4 flex items-center justify-between">
                    <div>
                      {updateSuccess && (
                        <span className="text-green-600">Profile updated successfully!</span>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={isUpdating}
                    >
                      Update Profile
                    </Button>
                  </div>
                </form>
              </div>
            )}
            
            {activeTab === 'organization' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6">Organization Settings</h3>
                
                {organization ? (
                  <form onSubmit={handleUpdateOrganization} className="space-y-4 max-w-lg">
                    <Input
                      label="Organization Name"
                      value={organization.name}
                      onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                    />
                    
                    <div className="pt-4 flex items-center justify-between">
                      <div>
                        {updateSuccess && (
                          <span className="text-green-600">Organization updated successfully!</span>
                        )}
                      </div>
                      <Button
                        variant="primary"
                        type="submit"
                        isLoading={isUpdating}
                      >
                        Update Organization
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-gray-500">
                    No organization found. Please contact your administrator.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="hidden md:block p-4 border-t">
          <Button
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            onClick={handleSignOut}
            icon={<LogOut className="h-5 w-5" />}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;