
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
  createMockRemoteStream 
} from '../utils/videoUtils';
import { startEmotionDetection } from '../utils/emotionDetection';
import { X, User, AlertTriangle } from 'lucide-react';

const Meeting = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // UI state
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Emotion detection
  const [emotionData, setEmotionData] = useState<StudentEmotion[]>([]);
  const [showEmotionMetrics, setShowEmotionMetrics] = useState(false);
  
  // References to video elements
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // Mock participants
  const participants = [
    { id: '1', name: 'Teacher Smith', role: 'teacher', isActive: true },
    { id: '2', name: 'Alice Johnson', role: 'student', isActive: true },
    { id: '3', name: 'Bob Smith', role: 'student', isActive: true },
    { id: '4', name: 'Charlie Brown', role: 'student', isActive: true },
    { id: '5', name: 'Diana Prince', role: 'student', isActive: false },
  ];
  
  // Initialize meeting with media access
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        console.log("Initializing media streams...");
        
        // Get user media stream
        const stream = await getUserMedia(true, true);
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          console.log("Attaching local stream to video element");
          attachMediaStream(localVideoRef.current, stream);
        } else {
          console.error("Local video element reference is null");
        }
        
        // Create mock remote stream for demo
        console.log("Creating mock remote stream...");
        const mock = await createMockRemoteStream();
        setRemoteStream(mock);
        
        if (remoteVideoRef.current) {
          console.log("Attaching remote stream to video element");
          attachMediaStream(remoteVideoRef.current, mock);
        } else {
          console.error("Remote video element reference is null");
        }
        
        // Show success message
        toast({
          title: "Connected to meeting",
          description: `You've joined meeting ID: ${meetingId}`,
        });
        
        // Start emotion detection if user is a teacher
        if (user?.role === 'teacher') {
          const emotionDetection = startEmotionDetection((data) => {
            setEmotionData(data);
            setShowEmotionMetrics(true);
          });
          
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
      stopMediaStream(localStream);
      stopMediaStream(remoteStream);
      stopMediaStream(screenStream);
    };
  }, [meetingId, toast, user?.role]);
  
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
        
        // Set up listener for when user stops sharing via browser UI
        displayStream.getVideoTracks()[0].onended = () => {
          attachMediaStream(localVideoRef.current, localStream);
          setIsScreenSharing(false);
          
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
    // Stop all media streams
    stopMediaStream(localStream);
    stopMediaStream(remoteStream);
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
  
  // If there's an error, show error screen
  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full px-6 py-8 bg-white rounded-lg shadow-md text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Media Access Error</h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative h-screen bg-black overflow-hidden">
      {/* Main video container */}
      <div className="video-container h-full w-full relative">
        {/* Remote video (large) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover absolute inset-0 z-0"
        />
        
        {/* Local video (small overlay) */}
        <div className="absolute bottom-4 right-4 w-40 h-30 md:w-64 md:h-48 z-10 rounded-lg overflow-hidden shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
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
            <SheetTitle>Participants ({participants.length})</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-64px)]">
            <div className="p-4 space-y-4">
              {participants.map((participant) => (
                <div 
                  key={participant.id}
                  className="flex items-center space-x-3"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{participant.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{participant.role}</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${participant.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
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
                    <p className="text-sm">Has everyone completed the homework assignment?</p>
                  </div>
                  <span className="text-xs text-gray-500">Teacher Smith • 10:15 AM</span>
                </div>
                
                <div className="flex flex-col items-end">
                  <div className="bg-blue-100 rounded-lg p-3 mb-1 max-w-[80%]">
                    <p className="text-sm">Yes, I submitted mine yesterday.</p>
                  </div>
                  <span className="text-xs text-gray-500">You • 10:16 AM</span>
                </div>
                
                <div className="flex flex-col items-start">
                  <div className="bg-gray-100 rounded-lg p-3 mb-1 max-w-[80%]">
                    <p className="text-sm">I had a question about problem #3. Can we review it?</p>
                  </div>
                  <span className="text-xs text-gray-500">Alice Johnson • 10:17 AM</span>
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
      
      {/* Emotion metrics for teachers */}
      {user?.role === 'teacher' && (
        <div className="absolute top-4 left-4 z-10 w-80">
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
