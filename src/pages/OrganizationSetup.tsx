import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Building, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { supabase } from '../lib/supabase';

interface OrganizationSetupProps {
  user: any;
}

const OrganizationSetup: React.FC<OrganizationSetupProps> = ({ user }) => {
  const navigate = useNavigate();
  const [organizationName, setOrganizationName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOrganization, setHasOrganization] = useState(false);

  useEffect(() => {
    checkExistingOrganization();
  }, []);

  const checkExistingOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('org_memberships')
        .select('org_id')
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setHasOrganization(true);
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking organization:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!organizationName.trim()) {
      setError('Organization name is required');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .insert({ name: organizationName.trim() })
        .select()
        .single();
      
      if (orgError) throw orgError;
      
      if (orgData) {
        // Create organization membership
        const { error: membershipError } = await supabase
          .from('org_memberships')
          .insert({
            org_id: orgData.id,
            user_id: user.id,
            role: 'owner'
          });
        
        if (membershipError) throw membershipError;
        
        // Create a default project
        const { error: projectError } = await supabase
          .from('projects')
          .insert({
            org_id: orgData.id,
            name: 'My First Project',
            client_name: 'Internal',
            billable: true
          });
        
        if (projectError) throw projectError;
        
        navigate('/');
      }
    } catch (error: any) {
      console.error('Error setting up organization:', error);
      setError(error.message || 'Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center">
          <Clock className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome to Timesheet
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Let's set up your organization to get started
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Input
                label="Organization Name"
                id="organizationName"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Acme Inc."
                required
                helpText="This is the name of your company or team"
                icon={<Building className="h-5 w-5 text-gray-400" />}
                error={error || undefined}
              />
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full"
                icon={<ArrowRight className="h-4 w-4" />}
              >
                Create Organization
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSetup;