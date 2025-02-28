
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShareOff, ScreenShare, Users, Settings, MessageSquare } from 'lucide-react';

interface MeetingControlsProps {
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  endMeeting: () => void;
  toggleParticipants: () => void;
  toggleChat: () => void;
  isParticipantsOpen: boolean;
  isChatOpen: boolean;
}

const MeetingControls: React.FC<MeetingControlsProps> = ({
  isMicOn,
  isCameraOn,
  isScreenSharing,
  toggleMic,
  toggleCamera,
  toggleScreenShare,
  endMeeting,
  toggleParticipants,
  toggleChat,
  isParticipantsOpen,
  isChatOpen,
}) => {
  return (
    <div className="meeting-controls">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              className={`control-button ${isMicOn ? 'control-button-on' : 'control-button-off'}`}
              onClick={toggleMic}
              size="icon"
            >
              {isMicOn ? <Mic /> : <MicOff />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isMicOn ? 'Turn off microphone' : 'Turn on microphone'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              className={`control-button ${isCameraOn ? 'control-button-on' : 'control-button-off'}`}
              onClick={toggleCamera}
              size="icon"
            >
              {isCameraOn ? <Video /> : <VideoOff />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isCameraOn ? 'Turn off camera' : 'Turn on camera'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              className={`control-button ${isScreenSharing ? 'control-button-on' : 'control-button-off'}`}
              onClick={toggleScreenShare}
              size="icon"
            >
              {isScreenSharing ? <ScreenShareOff /> : <ScreenShare />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isScreenSharing ? 'Stop sharing screen' : 'Share screen'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              className={`control-button ${isParticipantsOpen ? 'control-button-on' : 'control-button-off'}`}
              onClick={toggleParticipants}
              size="icon"
            >
              <Users />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Participants</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              className={`control-button ${isChatOpen ? 'control-button-on' : 'control-button-off'}`}
              onClick={toggleChat}
              size="icon"
            >
              <MessageSquare />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Chat</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              className="control-button-danger"
              onClick={endMeeting}
              size="icon"
            >
              <PhoneOff />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>End meeting</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default MeetingControls;
