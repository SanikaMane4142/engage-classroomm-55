import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MeetingControls from '../components/MeetingControls';
import EmotionMetrics from '../components/EmotionMetrics';
import { StudentEmotion } from '../components/EmotionMetrics';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  getUserMedia, 
  stopMediaStream, 
  attachMediaStream, 
  getDisplayMedia,
  getVideoInputDevices,
  checkCameraAccess
} from '../utils/videoUtils';
import { webRTCService } from '../utils/webRTCService';
import { startEmotionDetection } from '../utils/emotionDetection';
import { initializeModels } from '../utils/mlEmotionDetection';
import { X, User, AlertTriangle, Users as UsersIcon, Camera, CameraOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Interface for student streams
interface StudentStream {
  id: string;
  name: string;
  stream: MediaStream;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

const Meeting = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // UI state
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [studentStreams, setStudentStreams] = useState<StudentStream[]>([]);
  const [activeView, setActiveView] = useState<'grid' | 'speaker'>('grid');
  const [focusedStudent, setFocusedStudent] = useState<string | null>(null);
  const [videoCameraCount, setVideoCameraCount] = useState(0);
  const [cameraAccessChecked, setCameraAccessChecked] = useState(false);
  const [isWebRTCConnected, setIsWebRTCConnected] = useState(false);
  
  // Emotion detection
  const [emotionData, setEmotionData] = useState<StudentEmotion[]>([]);
  const [showEmotionMetrics, setShowEmotionMetrics] = useState(false);
  
  // References to video elements
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // ML model initialization state
  const [mlModelsInitialized, setMlModelsInitialized] = useState(false);
  
  // Add a new state to track if we should create test students
  const [shouldCreateTestStudents, setShouldCreateTestStudents] = useState(true);
  
  // WebRTC initialization
  useEffect(() => {
    if (!meetingId || !user) return;
    
    const userName = user.email || 'Anonymous User';
    const userId = user.id || 'anonymous-user';
    
    // Initialize WebRTC with callbacks
    const initWebRTC = async () => {
      if (localStream) {
        await webRTCService.initialize(
          localStream, 
          meetingId,
          userId,
          userName, 
          {
            onRemoteStream: handleRemoteStream,
            onPeerDisconnected: handlePeerDisconnected
          }
        );
        setIsWebRTCConnected(true);
        
        toast({
          title: "WebRTC initialized",
          description: "Successfully connected to the meeting room."
        });
      }
    };
    
    if (localStream && !isWebRTCConnected) {
      initWebRTC();
    }
    
    // Clean up WebRTC connections when leaving
    return () => {
      if (isWebRTCConnected) {
        webRTCService.leaveRoom();
        setIsWebRTCConnected(false);
      }
    };
  }, [meetingId, localStream, user, toast, isWebRTCConnected]);
  
  // Handler for new remote streams
  const handleRemoteStream = (stream: MediaStream, peerId: string, peerName: string) => {
    console.log(`Received remote stream from peer ${peerName} (${peerId})`);
    
    const newStudent: StudentStream = {
      id: peerId,
      name: peerName,
      stream: stream,
      videoRef: React.createRef<HTMLVideoElement>()
    };
    
    setStudentStreams(prev => {
      // Check if we already have this student
      const existingIndex = prev.findIndex(s => s.id === peerId);
      if (existingIndex >= 0) {
        // Update existing entry
        const updated = [...prev];
        updated[existingIndex] = newStudent;
        return updated;
      } else {
        // Add new entry
        return [...prev, newStudent];
      }
    });
    
    toast({
      title: "New participant joined",
      description: `${peerName} has joined the meeting.`
    });
  };
  
  // Handler for peer disconnections
  const handlePeerDisconnected = (peerId: string) => {
    console.log(`Peer ${peerId} disconnected`);
    
    const disconnectedName = studentStreams.find(s => s.id === peerId)?.name || 'A participant';
    
    setStudentStreams(prev => prev.filter(s => s.id !== peerId));
    
    toast({
      title: "Participant left",
      description: `${disconnectedName} has left the meeting.`
    });
  };
  
  // Check camera access first
  useEffect(() => {
    const checkCamera = async () => {
      const cameraStatus = await checkCameraAccess();
      console.log("Camera access check:", cameraStatus);
      setCameraAccessChecked(true);
      
      // Initialize ML models after camera check
      if (user?.role === 'teacher') {
        const modelsLoaded = await initializeModels();
        setMlModelsInitialized(modelsLoaded);
        
        if (modelsLoaded) {
          toast({
            title: "ML models loaded",
            description: "AI-based emotion detection is ready.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "ML models failed to load",
            description: "Using simplified emotion detection instead.",
          });
        }
      }
    };
    
    checkCamera();
  }, []);
  
  // Process video elements to get student videos for emotion detection
  const getStudentVideoElements = () => {
    return studentStreams.map(student => ({
      studentId: student.id,
      studentName: student.name,
      videoElement: student.videoRef?.current
    }));
  };
  
  // Initialize meeting with media access
  useEffect(() => {
    if (!cameraAccessChecked) return;
    
    const initializeMedia = async () => {
      try {
        console.log("Initializing media streams...");
        
        // Check how many video cameras are available
        const videoDevices = await getVideoInputDevices();
        setVideoCameraCount(videoDevices.length);
        console.log(`Found ${videoDevices.length} camera devices in total`);
        
        if (videoDevices.length === 0) {
          toast({
            variant: "destructive",
            title: "No cameras detected",
            description: "Please check your camera permissions.",
          });
          setErrorMessage("No cameras detected. Please check your camera permissions.");
          return;
        }
        
        // Get user media stream for the teacher
        const stream = await getUserMedia(true, true);
        console.log("Teacher stream created:", stream.id);
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          console.log("Attaching local stream to teacher's video element");
          attachMediaStream(localVideoRef.current, stream);
        } else {
          console.error("Local video element reference is null");
        }
        
        // Create test student streams for demo purposes
        // This would be replaced with real WebRTC connections in production
        if (shouldCreateTestStudents && user?.role === 'teacher') {
          console.log("Creating test student streams for demo");
          const numberOfTestStudents = 3; // You can adjust this as needed
          const testStudents = await createMultipleStudentStreams(numberOfTestStudents);
          
          setStudentStreams(testStudents);
          console.log(`Created ${testStudents.length} test student streams`);
        }
        
        // Show success message
        toast({
          title: "Connected to meeting",
          description: `You've joined meeting ID: ${meetingId}`,
        });
        
        // Start emotion detection if user is a teacher
        if (user?.role === 'teacher') {
          const emotionDetection = startEmotionDetection(
            (data) => {
              setEmotionData(data);
              setShowEmotionMetrics(true);
            },
            getStudentVideoElements
          );
          
          // Clean up emotion detection on unmount
          return () => {
            emotionDetection.stop();
          };
        }
      } catch (error) {
        console.error('Error initializing media:', error);
        setErrorMessage('Could not access camera or microphone. Please check permissions.');
        
        toast({
          variant: "destructive",
          title: "Media access error",
          description: "Could not access camera or microphone. Please check permissions.",
        });
      }
    };
    
    initializeMedia();
    
    // Clean up on unmount
    return () => {
      console.log("Cleaning up media streams");
      stopMediaStream(localStream);
      
      // Clean up all student streams
      studentStreams.forEach(student => {
        stopMediaStream(student.stream);
      });
      
      stopMediaStream(screenStream);
    };
  }, [meetingId, toast, user?.role, cameraAccessChecked, shouldCreateTestStudents]);
  
  // Attach student streams to video elements when they're updated or added
  useEffect(() => {
    console.log(`Attaching ${studentStreams.length} student streams to video elements`);
    
    // Add a slight delay to ensure React has updated the DOM
    const timer = setTimeout(() => {
      studentStreams.forEach(student => {
        if (student.videoRef?.current && student.stream) {
          console.log(`Attaching stream ${student.stream.id} for student ${student.name}`);
          attachMediaStream(student.videoRef.current, student.stream);
          
          // Log video tracks info
          const videoTracks = student.stream.getVideoTracks();
          console.log(`Student ${student.name} has ${videoTracks.length} video tracks:`, 
            videoTracks.map(t => ({ 
              enabled: t.enabled, 
              muted: t.muted, 
              label: t.label,
              id: t.id
            }))
          );
          
          // Force play if needed
          student.videoRef.current.play().catch(e => 
            console.warn(`Error playing video for ${student.name}:`, e)
          );
        } else {
          console.warn(`Video ref or stream for student ${student.name} is not available`, {
            hasRef: !!student.videoRef?.current,
            hasStream: !!student.stream
          });
        }
      });
    }, 100); // Short delay to allow React to update
    
    return () => clearTimeout(timer);
  }, [studentStreams]);
  
  // Toggle microphone
  const toggleMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicOn(audioTracks[0]?.enabled || false);
    }
  };
  
  // Toggle camera
  const toggleCamera = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOn(videoTracks[0]?.enabled || false);
    }
  };
  
  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      stopMediaStream(screenStream);
      setScreenStream(null);
      
      // Reattach local stream to video element
      attachMediaStream(localVideoRef.current, localStream);
      setIsScreenSharing(false);
      
      // Update WebRTC with camera stream instead of screen
      if (isWebRTCConnected) {
        webRTCService.updateLocalStream(localStream);
      }
      
      toast({
        title: "Screen sharing stopped",
      });
    } else {
      try {
        // Start screen sharing
        const displayStream = await getDisplayMedia();
        setScreenStream(displayStream);
        
        // Replace local video with screen sharing
        attachMediaStream(localVideoRef.current, displayStream);
        setIsScreenSharing(true);
        
        // Update WebRTC with screen stream instead of camera
        if (isWebRTCConnected) {
          webRTCService.updateLocalStream(displayStream);
        }
        
        // Set up listener for when user stops sharing via browser UI
        displayStream.getVideoTracks()[0].onended = () => {
          attachMediaStream(localVideoRef.current, localStream);
          setIsScreenSharing(false);
          
          // Update WebRTC back to camera stream
          if (isWebRTCConnected) {
            webRTCService.updateLocalStream(localStream);
          }
          
          toast({
            title: "Screen sharing stopped",
          });
        };
        
        toast({
          title: "Screen sharing started",
        });
      } catch (error) {
        console.error('Screen sharing error:', error);
        
        toast({
          variant: "destructive",
          title: "Screen sharing error",
          description: "Could not share your screen. Please try again.",
        });
      }
    }
  };
  
  // End meeting
  const endMeeting = () => {
    // Leave WebRTC room
    if (isWebRTCConnected) {
      webRTCService.leaveRoom();
      setIsWebRTCConnected(false);
    }
    
    // Stop all media streams
    stopMediaStream(localStream);
    
    // Stop all student streams
    studentStreams.forEach(student => {
      stopMediaStream(student.stream);
    });
    
    stopMediaStream(screenStream);
    
    // Navigate back to dashboard
    navigate('/dashboard');
    
    toast({
      title: "Meeting ended",
      description: "You have left the meeting.",
    });
  };
  
  // Toggle participants sidebar
  const toggleParticipants = () => {
    setIsParticipantsOpen(!isParticipantsOpen);
    if (isChatOpen && !isParticipantsOpen) {
      setIsChatOpen(false);
    }
  };
  
  // Toggle chat sidebar
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (isParticipantsOpen && !isChatOpen) {
      setIsParticipantsOpen(false);
    }
  };

  // Toggle view mode (grid or speaker)
  const toggleView = () => {
    setActiveView(activeView === 'grid' ? 'speaker' : 'grid');
  };

  // Focus on a specific student
  const focusOnStudent = (studentId: string) => {
    setFocusedStudent(studentId === focusedStudent ? null : studentId);
    if (studentId !== focusedStudent) {
      setActiveView('speaker');
    }
  };
  
  // If there's an error, show error screen
  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full px-6 py-8 bg-white rounded-lg shadow-md text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Media Access Error</h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <div className="space-y-4">
            <Button onClick={() => {
              setErrorMessage(null);
              setCameraAccessChecked(false);
            }} className="w-full">
              Try Again
            </Button>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative h-screen bg-black overflow-hidden">
      {videoCameraCount === 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-600 text-white px-4 py-2 rounded-md flex items-center gap-2">
          <CameraOff size={16} />
          No cameras detected. Please check your camera permissions.
        </div>
      )}
      
      {/* Connection status */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-black/50 text-white px-3 py-1 rounded-md flex items-center gap-2">
          {isWebRTCConnected ? (
            <>
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span>Connected to room: {meetingId}</span>
            </>
          ) : (
            <>
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span>Connecting to WebRTC...</span>
            </>
          )}
        </div>
      </div>
      
      {/* View toggle button */}
      <div className="absolute top-4 right-4 z-20">
        <Button 
          variant="outline" 
          className="bg-black/50 text-white border-gray-600 hover:bg-black/70"
          onClick={toggleView}
        >
          {activeView === 'grid' ? 'Speaker View' : 'Grid View'}
        </Button>
      </div>
      
      {/* Camera count indicator */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-black/50 text-white px-3 py-1 rounded-md flex items-center gap-2">
          <Camera size={16} />
          <span>Cameras: {videoCameraCount}</span>
        </div>
      </div>
      
      {/* ML model status indicator for teachers */}
      {user?.role === 'teacher' && (
        <div className="absolute top-16 left-4 z-20">
          <div className="bg-black/50 text-white px-3 py-1 rounded-md flex items-center gap-2 mt-10">
            <span className={`w-3 h-3 rounded-full ${mlModelsInitialized ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            <span>{mlModelsInitialized ? 'ML Analysis Active' : 'Basic Analysis'}</span>
          </div>
        </div>
      )}
      
      {/* Add a button to simulate students for testing */}
      {user?.role === 'teacher' && studentStreams.length === 0 && (
        <div className="absolute top-24 left-4 z-20">
          <Button 
            onClick={() => setShouldCreateTestStudents(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <UsersIcon className="mr-2 h-4 w-4" />
            Create Test Students
          </Button>
        </div>
      )}
      
      {activeView === 'grid' ? (
        // Grid view layout with support for multiple students
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 h-full w-full">
          {/* Teacher/Local video */}
          <div className="relative rounded-lg overflow-hidden bg-gray-900 aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-0.5 text-sm rounded">
              You {user?.role === 'teacher' ? '(Teacher)' : ''}
            </div>
          </div>
          
          {/* Student videos - now we show all of them without limiting */}
          {studentStreams.map((student) => (
            <div 
              key={student.id} 
              className="relative rounded-lg overflow-hidden bg-gray-900 aspect-video cursor-pointer"
              onClick={() => focusOnStudent(student.id)}
            >
              <video
                ref={student.videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-0.5 text-sm rounded">
                {student.name}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Speaker view layout
        <div className="flex flex-col h-full">
          {/* Main video (focused student or teacher) */}
          <div className="flex-1 p-2">
            <div className="relative rounded-lg overflow-hidden bg-gray-900 h-full">
              {focusedStudent ? (
                // Focused student video
                <>
                  <video
                    ref={studentStreams.find(s => s.id === focusedStudent)?.videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-black/60 text-white px-2 py-1 text-md rounded">
                    {studentStreams.find(s => s.id === focusedStudent)?.name}
                  </div>
                </>
              ) : (
                // Default to teacher if no student is focused
                <>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-black/60 text-white px-2 py-1 text-md rounded">
                    You {user?.role === 'teacher' ? '(Teacher)' : ''}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Thumbnails row - show more thumbnails in a scrollable container */}
          <div className="h-24 p-2">
            <ScrollArea className="h-full">
              <div className="flex space-x-2 h-full">
                {/* Teacher thumbnail */}
                <div 
                  className={`relative rounded-lg overflow-hidden bg-gray-900 h-full aspect-video cursor-pointer ${!focusedStudent ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setFocusedStudent(null)}
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white px-1 py-0.5 text-xs rounded">
                    You
                  </div>
                </div>
                
                {/* Student thumbnails - show all of them */}
                {studentStreams.map((student) => (
                  <div 
                    key={student.id} 
                    className={`relative rounded-lg overflow-hidden bg-gray-900 h-full aspect-video cursor-pointer ${student.id === focusedStudent ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => focusOnStudent(student.id)}
                  >
                    <video
                      ref={student.videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-1 bg-black/60 text-white px-1 py-0.5 text-xs rounded">
                      {student.name.split(' ')[0]}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
      
      {/* Meeting controls */}
      <MeetingControls
        isMicOn={isMicOn}
        isCameraOn={isCameraOn}
        isScreenSharing={isScreenSharing}
        toggleMic={toggleMic}
        toggleCamera={toggleCamera}
        toggleScreenShare={toggleScreenShare}
        endMeeting={endMeeting}
        toggleParticipants={toggleParticipants}
        toggleChat={toggleChat}
        isParticipantsOpen={isParticipantsOpen}
        isChatOpen={isChatOpen}
      />
      
      {/* Participants sidebar */}
      <Sheet open={isParticipantsOpen} onOpenChange={setIsParticipantsOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Participants ({1 + studentStreams.length})</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-64px)]">
            <div className="p-4 space-y-4">
              {/* Current user */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    You {user?.role === 'teacher' ? '(Teacher)' : ''}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{user?.email || 'Anonymous'}</p>
                </div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              
              {/* Remote participants */}
              {studentStreams.map((student) => (
                <div 
                  key={student.id}
                  className="flex items-center space-x-3"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-gray-500 capitalize">Student</p>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      
      {/* Chat sidebar */}
      <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Chat</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-[calc(100vh-64px)]">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div className="flex flex-col items-start">
                  <div className="bg-gray-100 rounded-lg p-3 mb-1 max-w-[80%]">
                    <p className="text-sm">Has everyone connected to the WebRTC server?</p>
                  </div>
                  <span className="text-xs text-gray-500">Teacher • 10:15 AM</span>
                </div>
                
                <div className="flex flex-col items-end">
                  <div className="bg-blue-100 rounded-lg p-3 mb-1 max-w-[80%]">
                    <p className="text-sm">Yes, my video is streaming correctly.</p>
                  </div>
                  <span className="text-xs text-gray-500">You • 10:16 AM</span>
                </div>
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button>Send</Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Emotion metrics for teachers - positioned on the right side */}
      {user?.role === 'teacher' && (
        <div className="absolute top-16 right-4 z-30 w-64">
          <EmotionMetrics 
            emotionData={emotionData} 
            isVisible={showEmotionMetrics}
          />
        </div>
      )}
    </div>
  );
};

export default Meeting;
