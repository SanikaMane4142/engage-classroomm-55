
import { supabase } from '@/integrations/supabase/client';

/**
 * Get profiles with participants table join
 */
export const getProfilesWithParticipants = async (meetingId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        participants!inner(*)
      `)
      .eq('participants.meeting_id', meetingId as string);
      
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching profiles with participants:", error);
    return [];
  }
};

/**
 * Subscribe to participants changes for a specific meeting
 */
export const subscribeToParticipants = (meetingId: string, callback: (payload: any) => void) => {
  const channel = supabase
    .channel(`participants:${meetingId}`)
    .on(
      'postgres_changes',
      {
        event: '*', 
        schema: 'public',
        table: 'participants',
        filter: `meeting_id=eq.${meetingId as string}`
      },
      callback
    )
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
};
