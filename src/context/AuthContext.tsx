
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const formatUser = async (session: Session | null): Promise<User | null> => {
    if (!session?.user) return null;

    // Get user profile from the profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return {
      id: session.user.id,
      name: profile.display_name || session.user.email?.split('@')[0] || 'User',
      email: session.user.email || '',
      role: profile.role as UserRole,
      avatar: profile.avatar_url,
    };
  };

  // Check for existing session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const formattedUser = await formatUser(session);
        setUser(formattedUser);
      }
      
      setIsLoading(false);
      
      // Listen for auth changes
      const { data: { subscription } } = await supabase.auth.onAuthStateChange(
        async (_event, session) => {
          const formattedUser = await formatUser(session);
          setUser(formattedUser);
          setIsLoading(false);
        }
      );
      
      // Cleanup subscription on unmount
      return () => {
        subscription.unsubscribe();
      };
    };
    
    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const formattedUser = await formatUser(data.session);
      setUser(formattedUser);
      navigate('/dashboard');
      toast({
        title: 'Login successful',
        description: `Welcome back, ${formattedUser?.name}!`,
      });
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
        toast({
          title: 'Login failed',
          description: e.message,
          variant: 'destructive',
        });
      } else {
        setError('An unknown error occurred');
        toast({
          title: 'Login failed',
          description: 'An unknown error occurred',
          variant: 'destructive',
        });
      }
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: 'Registration successful',
          description: 'Your account has been created successfully. Please check your email for verification.',
        });

        // Auto-sign in the user in development for ease of testing
        if (import.meta.env.DEV) {
          const formattedUser = await formatUser(data.session);
          setUser(formattedUser);
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
        toast({
          title: 'Signup failed',
          description: e.message,
          variant: 'destructive',
        });
      } else {
        setError('An unknown error occurred');
        toast({
          title: 'Signup failed',
          description: 'An unknown error occurred',
          variant: 'destructive',
        });
      }
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      navigate('/login');
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: 'Logout failed',
        description: 'There was a problem logging you out.',
        variant: 'destructive',
      });
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
