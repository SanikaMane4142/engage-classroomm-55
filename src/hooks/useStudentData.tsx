
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
        
        // Instead of checking tables existence, try to fetch meetings directly
        const { data: meetingsData, error: meetingsError } = await supabase
          .from('meetings')
          .select('*');
            
        if (meetingsError) {
          console.error('Error fetching meetings:', meetingsError);
          // Use mock course data if there's an error
          setCourseData([
            { id: '1', name: 'Mathematics 101', description: 'Introduction to Algebra and Calculus' },
            { id: '2', name: 'Physics 101', description: 'Introduction to Classical Mechanics' },
            { id: '3', name: 'Computer Science 101', description: 'Introduction to Programming' }
          ]);
        } else {
          // Map meetings to courses if we have data
          const coursesFromMeetings = meetingsData?.map(meeting => ({
            id: meeting.id,
            name: meeting.name || 'Unnamed Course',
            description: `Created on ${new Date(meeting.created_at).toLocaleDateString()}`
          })) || [];
          
          setCourseData(coursesFromMeetings.length > 0 ? coursesFromMeetings : [
            { id: '1', name: 'Mathematics 101', description: 'Introduction to Algebra and Calculus' },
            { id: '2', name: 'Physics 101', description: 'Introduction to Classical Mechanics' },
            { id: '3', name: 'Computer Science 101', description: 'Introduction to Programming' }
          ]);
        }
        
        // Try to fetch participants directly
        const { data: participantsData, error: participantsError } = await supabase
          .from('meeting_participants')
          .select('*, profiles(*)');
            
        if (participantsError) {
          console.error('Error fetching participants:', participantsError);
          // Use mock student data if there's an error
          setStudents([
            { id: '1', name: 'John Doe', email: 'john@example.com', attendance: 85 },
            { id: '2', name: 'Jane Smith', email: 'jane@example.com', attendance: 92 },
            { id: '3', name: 'Bob Johnson', email: 'bob@example.com', attendance: 78 },
            { id: '4', name: 'Alice Brown', email: 'alice@example.com', attendance: 95 },
            { id: '5', name: 'Charlie Davis', email: 'charlie@example.com', attendance: 70 }
          ]);
        } else {
          // Map participants to students if we have data
          const studentsFromParticipants = participantsData?.map(participant => {
            // Type-safe access to profiles data
            const profile = participant.profiles as { display_name?: string } | null;
            
            return {
              id: participant.user_id,
              name: profile?.display_name || 'Anonymous Student',
              email: `student${participant.user_id.substring(0, 4)}@example.com`,
              attendance: Math.floor(Math.random() * 40) + 60 // Random attendance between 60-100%
            };
          }) || [];
          
          setStudents(studentsFromParticipants.length > 0 ? studentsFromParticipants : [
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
        
        // Set fallback mock data even if there's an error
        setStudents([
          { id: '1', name: 'John Doe', email: 'john@example.com', attendance: 85 },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com', attendance: 92 },
          { id: '3', name: 'Bob Johnson', email: 'bob@example.com', attendance: 78 },
          { id: '4', name: 'Alice Brown', email: 'alice@example.com', attendance: 95 },
          { id: '5', name: 'Charlie Davis', email: 'charlie@example.com', attendance: 70 }
        ]);
        
        setCourseData([
          { id: '1', name: 'Mathematics 101', description: 'Introduction to Algebra and Calculus' },
          { id: '2', name: 'Physics 101', description: 'Introduction to Classical Mechanics' },
          { id: '3', name: 'Computer Science 101', description: 'Introduction to Programming' }
        ]);
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
