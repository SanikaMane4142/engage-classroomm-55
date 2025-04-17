
import React, { useEffect } from 'react';
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

  // Debugging info to help diagnose the issue
  useEffect(() => {
    console.log(`VideoGrid rendering with ${studentStreams.length} student streams`);
    studentStreams.forEach(student => {
      console.log(`Student stream: ${student.id} - ${student.name} - Has videoRef: ${!!student.videoRef} - Stream tracks: ${student.stream.getTracks().length}`);
    });
  }, [studentStreams]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-2 h-full w-full">
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
            <span className="ml-1 text-green-400">(Connected)</span>
          </div>
        </div>
      ))}

      {/* Display empty placeholders when no students are present */}
      {studentStreams.length === 0 && user?.role === 'teacher' && (
        <div className="relative rounded-lg overflow-hidden bg-gray-800 aspect-video flex items-center justify-center">
          <div className="text-gray-400 text-center p-4">
            <p>Waiting for students to join...</p>
            <p className="text-xs mt-2">Share the meeting link with your students</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGrid;
