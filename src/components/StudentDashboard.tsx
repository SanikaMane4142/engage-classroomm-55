
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStudentData } from '@/hooks/useStudentData';
import { Video, Activity, BarChart3, BookOpen, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const StudentDashboard: React.FC = () => {
  const { 
    students,
    courseData,
    isLoading,
    error 
  } = useStudentData();
  
  const [mediaError, setMediaError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check camera and microphone access
  useEffect(() => {
    const checkMediaAccess = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // Successfully got access, stop all tracks
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Media access error:', error);
        setMediaError(
          error instanceof Error 
            ? error.message
            : 'Could not access camera or microphone. Please check your device permissions.'
        );
      }
    };

    checkMediaAccess();
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center py-10">Loading student data...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center py-10 text-red-500">{error}</div>;
  }

  return (
    <div>
      {mediaError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Media Access Error</AlertTitle>
          <AlertDescription>
            {mediaError}
            <div className="mt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  if (navigator.permissions) {
                    navigator.permissions.query({ name: 'camera' as PermissionName })
                      .then(result => {
                        if (result.state === 'prompt' || result.state === 'denied') {
                          setMediaError('Please grant camera access to join meetings.');
                        } else {
                          setMediaError(null);
                        }
                      });
                  }
                }}
              >
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">Active students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(students.reduce((acc, student) => acc + student.attendance, 0) / students.length)}%
            </div>
            <p className="text-xs text-muted-foreground">Across all students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseData.length}</div>
            <p className="text-xs text-muted-foreground">Total courses</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
