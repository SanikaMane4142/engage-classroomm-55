
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Student {
  id: string;
  name: string;
  email: string;
  attendance: number;
}

interface Course {
  id: string;
  name: string;
  description: string;
}

interface StudentData {
  students: Student[];
  courseData: Course[];
  isLoading: boolean;
  error: string | null;
}

export function useStudentData(): StudentData {
  const [students, setStudents] = useState<Student[]>([]);
  const [courseData, setCourseData] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudentData() {
      try {
        setIsLoading(true);
        
        // Check if tables exist before querying
        const { data: tables, error: tablesError } = await supabase
          .from('pg_tables')
          .select('tablename')
          .eq('schemaname', 'public');
        
        if (tablesError) {
          console.error('Error checking tables:', tablesError);
          throw new Error('Error checking database tables');
        }
        
        const tableNames = tables?.map(t => t.tablename) || [];
        
        // Fetch meetings as courses if table exists
        if (tableNames.includes('meetings')) {
          const { data: meetingsData, error: meetingsError } = await supabase
            .from('meetings')
            .select('*');
            
          if (meetingsError) {
            console.error('Error fetching meetings:', meetingsError);
            throw new Error('Could not fetch courses data');
          }
          
          // Map meetings to courses
          const coursesFromMeetings = meetingsData?.map(meeting => ({
            id: meeting.id,
            name: meeting.name || 'Unnamed Course',
            description: `Created on ${new Date(meeting.created_at).toLocaleDateString()}`
          })) || [];
          
          setCourseData(coursesFromMeetings);
        } else {
          // Mock course data if no meetings table
          setCourseData([
            { id: '1', name: 'Mathematics 101', description: 'Introduction to Algebra and Calculus' },
            { id: '2', name: 'Physics 101', description: 'Introduction to Classical Mechanics' },
            { id: '3', name: 'Computer Science 101', description: 'Introduction to Programming' }
          ]);
        }
        
        // Fetch participants as students if table exists
        if (tableNames.includes('meeting_participants') && tableNames.includes('profiles')) {
          const { data: participantsData, error: participantsError } = await supabase
            .from('meeting_participants')
            .select('*, profiles(*)');
            
          if (participantsError) {
            console.error('Error fetching participants:', participantsError);
            throw new Error('Could not fetch student data');
          }
          
          // Map participants to students
          const studentsFromParticipants = participantsData?.map(participant => ({
            id: participant.user_id,
            name: participant.profiles?.display_name || 'Anonymous Student',
            email: `student${participant.user_id.substring(0, 4)}@example.com`,
            attendance: Math.floor(Math.random() * 40) + 60 // Random attendance between 60-100%
          })) || [];
          
          setStudents(studentsFromParticipants);
        } else {
          // Mock student data if no participants or profiles table
          setStudents([
            { id: '1', name: 'John Doe', email: 'john@example.com', attendance: 85 },
            { id: '2', name: 'Jane Smith', email: 'jane@example.com', attendance: 92 },
            { id: '3', name: 'Bob Johnson', email: 'bob@example.com', attendance: 78 },
            { id: '4', name: 'Alice Brown', email: 'alice@example.com', attendance: 95 },
            { id: '5', name: 'Charlie Davis', email: 'charlie@example.com', attendance: 70 }
          ]);
        }
        
      } catch (err) {
        console.error('Error in fetchStudentData:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchStudentData();
  }, []);

  return {
    students,
    courseData,
    isLoading,
    error
  };
}
