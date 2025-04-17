
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { startEmotionDetection } from '@/utils/emotionDetection';
import { initializeModels } from '@/utils/mlEmotionDetection';
import { webRTCService } from '@/utils/webRTCService';
import { 
  getUserMedia, 
  stopMediaStream, 
  attachMediaStream, 
  getDisplayMedia,
  getVideoInputDevices, 
  checkCameraAccess,
  createMultipleStudentStreams
} from '@/utils/videoUtils';
import { StudentEmotion } from '@/components/EmotionMetrics';

interface StudentStream {
  id: string;
  name: string;
  stream: MediaStream;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

export const useMeetingVideo = (meetingId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // UI state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [studentStreams, setStudentStreams] = useState<StudentStream[]>([]);
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
  }, [user?.role, toast]);
  
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

  // Focus on a specific student
  const focusOnStudent = (studentId: string | null) => {
    setFocusedStudent(studentId);
  };

  // Reset error
  const resetError = () => {
    setErrorMessage(null);
    setCameraAccessChecked(false);
  };

  return {
    // Refs
    localVideoRef,
    
    // Media state
    localStream,
    studentStreams,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    
    // UI state
    errorMessage,
    focusedStudent,
    videoCameraCount,
    isWebRTCConnected,
    
    // Emotion detection
    emotionData,
    showEmotionMetrics,
    mlModelsInitialized,
    
    // Test students
    shouldCreateTestStudents,
    setShouldCreateTestStudents,
    
    // Methods
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    focusOnStudent,
    resetError
  };
};
