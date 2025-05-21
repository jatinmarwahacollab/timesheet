import React, { useState } from 'react';
import { Clock, Mail, ArrowRight, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);
    
    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (error) throw error;
        setMessage('Password reset instructions have been sent to your email.');
        setIsForgotPassword(false);
      } else if (isSignUp) {
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();

        if (existingUser) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) throw error;
        setMessage('Registration successful! Please contact your administrator for access to the application.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const renderForm = () => {
    if (isForgotPassword) {
      return (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon={<Mail className="h-5 w-5 text-gray-400" />}
            />
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Send Reset Instructions
            </Button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Back to Sign In
            </button>
          </div>
        </form>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={<Mail className="h-5 w-5 text-gray-400" />}
          />
        </div>

        <div>
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={<KeyRound className="h-5 w-5 text-gray-400" />}
          />
          
          {!isSignUp && (
            <div className="mt-1 text-right">
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>

        <div>
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
            icon={<ArrowRight className="h-4 w-4" />}
          >
            {isSignUp ? 'Sign up' : 'Sign in'}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <div className="flex items-center space-x-2">
              <Clock className="h-10 w-10 text-blue-600" />
              <h2 className="text-3xl font-bold text-gray-900">Timesheet</h2>
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">
              {isForgotPassword 
                ? 'Reset your password'
                : isSignUp 
                  ? 'Create an account' 
                  : 'Sign in to your account'}
            </h2>
          </div>

          <div className="mt-8">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}
            
            {message && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                {message}
              </div>
            )}

            {renderForm()}
            
            {!isForgotPassword && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setMessage(null);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Sign up"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="hidden lg:block relative w-0 flex-1">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.pexels.com/photos/3243/pen-calendar-to-do-checklist.jpg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="Time tracking"
        />
      </div>
    </div>
  );
};

export default Login;