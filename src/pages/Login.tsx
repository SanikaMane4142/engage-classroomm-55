
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import OpenAISetup from '../components/OpenAISetup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'standard' | 'ai'>('standard');
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // For demo, use teacher@example.com or student@example.com with any password
      await login(email, password, role);
      toast({
        title: "Login successful",
        description: `Welcome back! You've signed in as a ${role}.`,
      });
    } catch (error) {
      console.error('Login failed:', error);
      // Error is handled by the auth context and displayed below
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = (value: string) => {
    setRole(value as UserRole);
  };

  const handleDemoLogin = async (demoRole: UserRole) => {
    setIsSubmitting(true);
    try {
      const demoEmail = demoRole === 'teacher' ? 'teacher@example.com' : 'student@example.com';
      const demoPassword = 'password';
      await login(demoEmail, demoPassword, demoRole);
      toast({
        title: "Demo login successful",
        description: `You're now signed in as a demo ${demoRole}.`,
      });
    } catch (error) {
      console.error('Demo login failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAILoginComplete = () => {
    toast({
      title: "AI Authentication Complete",
      description: "You can now proceed with login using your credentials",
    });
    setActiveTab('standard');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Welcome to StudMeet</h1>
            <p className="mt-2 text-gray-600">Sign in to your account to continue</p>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'standard' | 'ai')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="standard">Standard Login</TabsTrigger>
              <TabsTrigger value="ai">AI Authentication</TabsTrigger>
            </TabsList>
            
            <TabsContent value="standard">
              <Card>
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>Enter your credentials to access your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Account Type</Label>
                      <RadioGroup value={role} onValueChange={handleRoleChange} className="flex space-x-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="teacher" id="teacher" />
                          <Label htmlFor="teacher" className="cursor-pointer">Teacher</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="student" id="student" />
                          <Label htmlFor="student" className="cursor-pointer">Student</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or try a demo account</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <Button 
                      variant="outline" 
                      onClick={() => handleDemoLogin('teacher')}
                      disabled={isSubmitting}
                    >
                      Demo Teacher
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleDemoLogin('student')}
                      disabled={isSubmitting}
                    >
                      Demo Student
                    </Button>
                  </div>
                  <p className="text-center text-sm text-gray-500">
                    Don't have an account?{' '}
                    <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                      Sign up now
                    </a>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="ai">
              <Card>
                <CardHeader>
                  <CardTitle>AI Authentication</CardTitle>
                  <CardDescription>Use OpenAI to verify your identity</CardDescription>
                </CardHeader>
                <CardContent>
                  <OpenAISetup forAuthentication={true} onSetupComplete={handleAILoginComplete} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Login;
