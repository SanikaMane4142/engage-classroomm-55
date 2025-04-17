
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import MeetingControls from '@/components/MeetingControls';
import EmotionMetrics from '@/components/EmotionMetrics';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, Users as UsersIcon } from 'lucide-react';
import { useMeetingVideo } from '@/hooks/useMeetingVideo';
import ParticipantsList from '@/components/meeting/ParticipantsList';
import ChatPanel from '@/components/meeting/ChatPanel';
import VideoGrid from '@/components/meeting/VideoGrid';
import SpeakerView from '@/components/meeting/SpeakerView';
import ErrorScreen from '@/components/meeting/ErrorScreen';

const Meeting = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // UI state
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeView, setActiveView] = useState<'grid' | 'speaker'>('grid');
  
  // Get all meeting video functionality from custom hook
  const {
    localVideoRef,
    studentStreams,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    errorMessage,
    focusedStudent,
    videoCameraCount,
    isWebRTCConnected,
    emotionData,
    showEmotionMetrics,
    mlModelsInitialized,
    shouldCreateTestStudents,
    setShouldCreateTestStudents,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    focusOnStudent,
    resetError
  } = useMeetingVideo(meetingId || '');
  
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

  // End meeting
  const endMeeting = () => {
    navigate('/dashboard');
  };
  
  // If there's an error, show error screen
  if (errorMessage) {
    return <ErrorScreen errorMessage={errorMessage} resetError={resetError} />;
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
        <VideoGrid 
          localVideoRef={localVideoRef}
          studentStreams={studentStreams}
          focusOnStudent={focusOnStudent}
        />
      ) : (
        <SpeakerView
          localVideoRef={localVideoRef}
          studentStreams={studentStreams}
          focusedStudent={focusedStudent}
          focusOnStudent={focusOnStudent}
        />
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
      <ParticipantsList 
        isOpen={isParticipantsOpen}
        setIsOpen={setIsParticipantsOpen}
        studentStreams={studentStreams}
      />
      
      {/* Chat sidebar */}
      <ChatPanel 
        isOpen={isChatOpen}
        setIsOpen={setIsChatOpen}
      />
      
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
