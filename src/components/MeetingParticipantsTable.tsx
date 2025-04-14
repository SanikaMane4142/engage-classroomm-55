
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMeetingParticipants, MeetingParticipant } from '@/hooks/useMeetingParticipants';
import { formatDistanceToNow } from 'date-fns';

interface MeetingParticipantsTableProps {
  meetingId?: string;
}

const MeetingParticipantsTable: React.FC<MeetingParticipantsTableProps> = ({ meetingId }) => {
  const { participants, isLoading, error } = useMeetingParticipants({ meetingId });

  if (isLoading) {
    return <div className="text-center py-4">Loading participants...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">
        Error loading participants: {error}
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No participants found. Students will appear here when they join meetings.
      </div>
    );
  }

  return (
    <Table>
      <TableCaption>
        Real-time list of students who joined meetings
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Meeting ID</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {participants.map((participant) => (
          <TableRow key={participant.id}>
            <TableCell className="font-medium">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{participant.user_name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <span>{participant.user_name}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={participant.status === 'joined' ? 'success' : 'default'}>
                {participant.status}
              </Badge>
            </TableCell>
            <TableCell>
              {formatDistanceToNow(new Date(participant.joined_at), { addSuffix: true })}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {participant.meeting_id}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default MeetingParticipantsTable;
