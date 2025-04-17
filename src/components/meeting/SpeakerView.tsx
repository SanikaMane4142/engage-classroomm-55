
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';

interface StudentStream {
  id: string;
  name: string;
  stream: MediaStream;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

interface SpeakerViewProps {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  studentStreams: StudentStream[];
  focusedStudent: string | null;
  focusOnStudent: (studentId: string) => void;
}

const SpeakerView: React.FC<SpeakerViewProps> = ({
  localVideoRef,
  studentStreams,
  focusedStudent,
  focusOnStudent
}) => {
  const { user } = useAuth();
  const focusedStudentData = studentStreams.find(s => s.id === focusedStudent);

  return (
    <div className="flex flex-col h-full">
      {/* Main video (focused student or teacher) */}
      <div className="flex-1 p-2">
        <div className="relative rounded-lg overflow-hidden bg-gray-900 h-full">
          {focusedStudent ? (
            // Focused student video
            <>
              <video
                ref={focusedStudentData?.videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-black/60 text-white px-2 py-1 text-md rounded">
                {focusedStudentData?.name}
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
      
      {/* Thumbnails row */}
      <div className="h-24 p-2">
        <ScrollArea className="h-full">
          <div className="flex space-x-2 h-full">
            {/* Teacher thumbnail */}
            <div 
              className={`relative rounded-lg overflow-hidden bg-gray-900 h-full aspect-video cursor-pointer ${!focusedStudent ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => focusOnStudent(null)}
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
            
            {/* Student thumbnails */}
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
  );
};

export default SpeakerView;
