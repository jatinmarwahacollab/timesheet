import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import TimeTracker from './pages/TimeTracker';
import Timesheet from './pages/Timesheet';
import Projects from './pages/Projects';
import Reports from './pages/Reports';
import Team from './pages/Team';
import Tasks from './pages/Tasks';
import Settings from './pages/Settings';
import ProjectDetail from './pages/ProjectDetail';
import OrganizationSetup from './pages/OrganizationSetup';

function App() {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setUser(data);
      } else {
        // First login - create user profile
        await createUserProfile(userId);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Handle authentication error by signing out
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (userId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        throw new Error('No user data available');
      }
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: userData.user.email,
          full_name: userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0],
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        setUser(data);
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
      // Handle profile creation error by signing out
      await supabase.auth.signOut();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            !session ? (
              <Login />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        
        <Route 
          path="/reset-password" 
          element={
            <ResetPassword />
          }
        />
        
        <Route 
          path="/setup" 
          element={
            session ? (
              <OrganizationSetup user={user} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        
        {/* Protected routes */}
        <Route 
          path="/" 
          element={
            session ? (
              <Layout user={user} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<TimeTracker />} />
          <Route path="timesheet" element={<Timesheet />} />
          <Route path="timesheet/edit/:id" element={<Timesheet mode="edit" />} />
          <Route path="timesheet/view/:id" element={<Timesheet mode="view" />} />
          <Route path="timesheet/new" element={<Timesheet />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="team" element={<Team />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="settings" element={<Settings user={user} />} />
        </Route>
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;