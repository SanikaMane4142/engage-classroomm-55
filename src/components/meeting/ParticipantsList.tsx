
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface StudentStream {
  id: string;
  name: string;
  stream: MediaStream;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

interface ParticipantsListProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  studentStreams: StudentStream[];
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({ 
  isOpen, 
  setIsOpen, 
  studentStreams 
}) => {
  const { user } = useAuth();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
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
  );
};

export default ParticipantsList;
