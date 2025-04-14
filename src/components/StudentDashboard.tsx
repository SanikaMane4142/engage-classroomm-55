
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStudentData } from '@/hooks/useStudentData';
import { Video, Activity, BarChart3, BookOpen, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import MeetingParticipantsTable from './MeetingParticipantsTable';

const StudentDashboard: React.FC = () => {
  const { 
    students,
    courseData,
    isLoading,
    error 
  } = useStudentData();
  
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isCameraChecking, setIsCameraChecking] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check camera and microphone access with improved error handling
  useEffect(() => {
    const checkMediaAccess = async () => {
      try {
        setIsCameraChecking(true);
        console.log("Attempting to access camera and microphone...");
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        // Log available devices to help with debugging
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log(`Found ${videoDevices.length} video input devices:`, 
          videoDevices.map(d => ({ label: d.label, id: d.deviceId })));
        
        // Successfully got access, stop all tracks
        stream.getTracks().forEach(track => {
          console.log(`Stopping ${track.kind} track: ${track.label}`);
          track.stop();
        });
        
        setMediaError(null);
        toast({
          title: "Media access granted",
          description: "Camera and microphone are ready for meetings."
        });
      } catch (error) {
        console.error('Media access error:', error);
        const errorMsg = error instanceof Error 
          ? error.message
          : 'Could not access camera or microphone. Please check your device permissions.';
        
        setMediaError(errorMsg);
        
        toast({
          variant: "destructive",
          title: "Media access error",
          description: errorMsg
        });
      } finally {
        setIsCameraChecking(false);
      }
    };

    checkMediaAccess();
  }, [toast]);

  const handleTryAgain = () => {
    // Reset error state first
    setMediaError(null);
    
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'camera' as PermissionName })
        .then(result => {
          console.log(`Camera permission status: ${result.state}`);
          
          if (result.state === 'prompt' || result.state === 'denied') {
            // Try again to request camera access
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
              .then(stream => {
                // Successfully got access, stop all tracks
                stream.getTracks().forEach(track => track.stop());
                setMediaError(null);
                toast({
                  title: "Media access granted",
                  description: "Camera and microphone access has been enabled."
                });
              })
              .catch(err => {
                console.error('Error accessing media on retry:', err);
                setMediaError('Please grant camera access to join meetings.');
                toast({
                  variant: "destructive",
                  title: "Media access error",
                  description: "Could not access camera or microphone. Please check browser settings and try again."
                });
              });
          } else if (result.state === 'granted') {
            // Permission already granted, but we still had an error before
            // This could be a hardware issue
            toast({
              variant: "destructive", 
              title: "Hardware issue detected",
              description: "Permission is granted but camera might be in use by another application or not properly connected."
            });
          }
        })
        .catch(error => {
          console.error('Error checking permissions:', error);
          toast({
            variant: "destructive",
            title: "Permission check error",
            description: "Could not verify camera permissions. Please check browser settings manually."
          });
        });
    } else {
      // Browser doesn't support permissions API, try direct access
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
          setMediaError(null);
          toast({
            title: "Media access granted",
            description: "Camera and microphone access has been enabled."
          });
        })
        .catch(err => {
          console.error('Error accessing media on fallback:', err);
          setMediaError('Could not access camera. Please check your browser settings.');
          toast({
            variant: "destructive",
            title: "Media access error",
            description: "Could not access camera or microphone. Please check your device permissions."
          });
        });
    }
  };

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
          <AlertDescription className="space-y-2">
            <p>{mediaError}</p>
            <p className="text-sm">
              For meetings to work properly, you need to grant camera and microphone permissions.
              Please check your browser settings and ensure no other applications are using your camera.
            </p>
            <div className="mt-2">
              <Button 
                variant="outline" 
                onClick={handleTryAgain}
                disabled={isCameraChecking}
              >
                {isCameraChecking ? 'Checking...' : 'Try Again'}
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

      {/* New section for meeting participants */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Real-Time Meeting Participants</CardTitle>
          <CardDescription>
            Students who have joined meetings from the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MeetingParticipantsTable />
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;
