import React, { useState, useEffect } from 'react';
import { ListTodo, Plus, Pencil, Trash2, Briefcase } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Toast from '../components/ui/Toast';
import { supabase } from '../lib/supabase';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkUserRole();
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [selectedProject]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };
  const [userRoleLoading, setUserRoleLoading] = useState(true);

  const checkUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('org_memberships')
        .select('role')
        .limit(1)
        .maybeSingle();
  
      if (error) throw error;
  
      setUserRole(data?.role || null);
    } catch (error: any) {
      showToast(error.message || 'Error checking user role', 'error');
    } finally {
      setUserRoleLoading(false);
    }
  };
  
  
  const canManageTasks = () => {
    return userRole === 'owner' || userRole === 'admin';
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

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('tasks')
        .select('*, projects(name)')
        .order('name');
      
      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data) {
        setTasks(data);
      }
    } catch (error: any) {
      showToast(error.message || 'Error fetching tasks', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = () => {
    if (!canManageTasks()) {
      showToast('You do not have permission to create tasks. Only organization admins and owners can create tasks.', 'error');
      return;
    }
    setEditingTask(null);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: any) => {
    if (!canManageTasks()) {
      showToast('You do not have permission to edit tasks. Only organization admins and owners can edit tasks.', 'error');
      return;
    }
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleDeleteTask = async (task: any) => {
    if (!canManageTasks()) {
      showToast('You do not have permission to delete tasks. Only organization admins and owners can delete tasks.', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete the task "${task.name}"?`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);
        
      if (error) throw error;
      
      showToast('Task deleted successfully', 'success');
      fetchTasks();
    } catch (error: any) {
      showToast(error.message || 'Error deleting task', 'error');
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canManageTasks()) {
      showToast('You do not have permission to manage tasks', 'error');
      return;
    }

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const taskData = {
      name: formData.get('name') as string,
      project_id: formData.get('project_id') as string,
    };
    
    try {
      if (editingTask) {
        const { error, data } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id)
          .select()
          .single();
          
        if (error) throw error;

        if (data) {
          showToast('Task updated successfully', 'success');
        }
      } else {
        const { error, data } = await supabase
          .from('tasks')
          .insert(taskData)
          .select()
          .single();
          
        if (error) throw error;

        if (data) {
          showToast('Task created successfully', 'success');
        }
      }
      
      setShowTaskForm(false);
      fetchTasks();
    } catch (error: any) {
      showToast(error.message || 'Error saving task', 'error');
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div className="font-medium text-gray-500">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Select
            options={[
              { value: 'all', label: 'All Projects' },
              ...projects.map(project => ({
                value: project.id,
                label: project.name
              }))
            ]}
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          />
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={handleCreateTask}
            disabled={userRoleLoading || !canManageTasks()}         
>
            New Task
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map(task => (
          <div 
            key={task.id} 
            className="bg-white rounded-lg border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
          >
            <div className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{task.name}</h3>
                <div className="mt-1 flex items-center text-sm text-gray-500">
                  <Briefcase className="h-4 w-4 mr-1" />
                  {task.projects?.name || 'No Project'}
                </div>
              </div>
              
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditTask(task)}
                  icon={<Pencil className="h-4 w-4" />}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTask(task)}
                  icon={<Trash2 className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {tasks.length === 0 && (
        <div className="text-center py-12">
          <ListTodo className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new task.
          </p>
          <div className="mt-6">
            <Button 
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={handleCreateTask}
            >
              New Task
            </Button>
          </div>
        </div>
      )}
      
      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {editingTask ? 'Edit Task' : 'New Task'}
              </h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setShowTaskForm(false)}
              >
                <span className="sr-only">Close</span>
                <span className="text-xl font-semibold">&times;</span>
              </button>
            </div>
            
            <form onSubmit={handleTaskSubmit} className="p-4">
              <div className="space-y-4">
                <Input
                  label="Task Name"
                  name="name"
                  required
                  defaultValue={editingTask?.name || ''}
                />
                
                <Select
                  label="Project"
                  name="project_id"
                  required
                  options={projects.map(project => ({
                    value: project.id,
                    label: project.name
                  }))}
                  defaultValue={editingTask?.project_id || ''}
                />
              </div>
              
              <div className="pt-4 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowTaskForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </Button>
              </div>
            </form>
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

export default Tasks;