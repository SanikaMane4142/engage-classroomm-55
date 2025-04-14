
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface MeetingParticipant {
  id: string;
  user_id: string;
  meeting_id: string;
  joined_at: string;
  status: string;
  user_name?: string;
}

interface UseMeetingParticipantsProps {
  meetingId?: string; // Optional to filter by specific meeting
}

export function useMeetingParticipants({ meetingId }: UseMeetingParticipantsProps = {}) {
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchParticipants() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Build query to fetch participants
        let query = supabase
          .from('meeting_participants')
          .select('*');
        
        // Filter by meeting ID if provided
        if (meetingId) {
          query = query.eq('meeting_id', meetingId);
        }
        
        const { data: participantsData, error: fetchError } = await query.order('joined_at', { ascending: false });
            
        if (fetchError) {
          console.error('Error fetching participants:', fetchError);
          setError(fetchError.message);
          toast({
            variant: "destructive",
            title: "Database Error",
            description: "Could not fetch participants data.",
          });
          setParticipants([]);
        } else {
          console.log('Participants data fetched successfully:', participantsData);
          
          // For each participant, fetch their profile to get display name
          const participantsWithProfiles = await Promise.all(
            participantsData.map(async (participant) => {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', participant.user_id)
                .single();
              
              return {
                ...participant,
                user_name: profileData?.display_name || `User ${participant.user_id.substring(0, 6)}`
              };
            })
          );
          
          setParticipants(participantsWithProfiles);
        }
      } catch (err) {
        console.error('Error in fetchParticipants:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        
        toast({
          variant: "destructive",
          title: "Data Fetch Error",
          description: errorMessage,
        });
        
        setParticipants([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchParticipants();

    // Set up real-time listener for changes to meeting_participants
    const channel = supabase
      .channel('meeting-participants-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_participants'
        },
        async (payload) => {
          console.log('Real-time update received for meeting_participants:', payload);
          
          // Refetch all participants when there's a change
          fetchParticipants();
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast, meetingId]);

  return {
    participants,
    isLoading,
    error
  };
}
