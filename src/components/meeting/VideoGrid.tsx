
import React from 'react';
import { useAuth } from '@/context/AuthContext';

interface StudentStream {
  id: string;
  name: string;
  stream: MediaStream;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

interface VideoGridProps {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  studentStreams: StudentStream[];
  focusOnStudent: (studentId: string) => void;
}

const VideoGrid: React.FC<VideoGridProps> = ({ 
  localVideoRef, 
  studentStreams, 
  focusOnStudent 
}) => {
  const { user } = useAuth();

  return (
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
      
      {/* Student videos */}
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
  );
};

export default VideoGrid;
