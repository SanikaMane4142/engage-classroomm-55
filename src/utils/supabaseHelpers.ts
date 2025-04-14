
import { supabase } from '@/integrations/supabase/client';

/**
 * Enables realtime functionality for a table in Supabase
 * @param tableName The name of the table to enable realtime for
 */
export async function enableRealtimeForTable(tableName: string): Promise<boolean> {
  try {
    // First, set the table's replica identity to FULL to ensure we get complete row data
    const { error: replicaError } = await supabase.rpc('set_table_replica_identity', { 
      table_name: tableName 
    }) as { error: Error | null };
    
    if (replicaError) {
      console.error(`Error setting replica identity for ${tableName}:`, replicaError);
      return false;
    }
    
    // Then, add the table to the supabase_realtime publication
    const { error: publicationError } = await supabase.rpc('add_table_to_publication', { 
      table_name: tableName 
    }) as { error: Error | null };
    
    if (publicationError) {
      console.error(`Error adding ${tableName} to realtime publication:`, publicationError);
      return false;
    }
    
    console.log(`Successfully enabled realtime for ${tableName}`);
    return true;
  } catch (err) {
    console.error('Error enabling realtime:', err);
    return false;
  }
}
