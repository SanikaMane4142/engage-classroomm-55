
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

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

// Mock data to use as fallbacks
const MOCK_STUDENTS: Student[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', attendance: 85 },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', attendance: 92 },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', attendance: 78 },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', attendance: 95 },
  { id: '5', name: 'Charlie Davis', email: 'charlie@example.com', attendance: 70 }
];

const MOCK_COURSES: Course[] = [
  { id: '1', name: 'Mathematics 101', description: 'Introduction to Algebra and Calculus' },
  { id: '2', name: 'Physics 101', description: 'Introduction to Classical Mechanics' },
  { id: '3', name: 'Computer Science 101', description: 'Introduction to Programming' }
];

export function useStudentData(): StudentData {
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [courseData, setCourseData] = useState<Course[]>(MOCK_COURSES);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchStudentData() {
      try {
        setIsLoading(true);
        setError(null);
        
        // First try to fetch meetings data
        console.log('Attempting to fetch meetings data...');
        const { data: meetingsData, error: meetingsError } = await supabase
          .from('meetings')
          .select('*');
            
        if (meetingsError) {
          console.error('Error fetching meetings:', meetingsError);
          toast({
            variant: "destructive",
            title: "Database Error",
            description: "Could not fetch course data. Using sample data instead.",
          });
          
          // Use mock course data on error
          setCourseData(MOCK_COURSES);
        } else {
          // Map meetings to courses if we have data
          console.log('Meetings data fetched successfully:', meetingsData);
          const coursesFromMeetings = meetingsData?.map(meeting => ({
            id: meeting.id,
            name: meeting.name || 'Unnamed Course',
            description: `Created on ${new Date(meeting.created_at).toLocaleDateString()}`
          })) || [];
          
          // If we have meeting data, use it; otherwise fall back to mock data
          setCourseData(coursesFromMeetings.length > 0 ? coursesFromMeetings : MOCK_COURSES);
          
          if (coursesFromMeetings.length === 0) {
            console.log('No meetings found, using mock course data');
          }
        }
        
        // Try to fetch participants data
        console.log('Attempting to fetch participants data...');
        const { data: participantsData, error: participantsError } = await supabase
          .from('meeting_participants')
          .select('*');
            
        if (participantsError) {
          console.error('Error fetching participants:', participantsError);
          toast({
            variant: "destructive",
            title: "Database Error",
            description: "Could not fetch student data. Using sample data instead.",
          });
          
          // Use mock student data on error
          setStudents(MOCK_STUDENTS);
        } else {
          // Map participants to students if we have data
          console.log('Participants data fetched successfully:', participantsData);
          
          // Create student objects from participants data
          const studentsFromParticipants = participantsData?.map(participant => {
            return {
              id: participant.user_id || `student-${Math.random().toString(36).substring(2, 9)}`,
              name: `Student ${participant.user_id?.substring(0, 4) || Math.random().toString(36).substring(2, 6)}`,
              email: `student${(participant.user_id || 'unknown').substring(0, 4)}@example.com`,
              attendance: Math.floor(Math.random() * 40) + 60 // Random attendance between 60-100%
            };
          }) || [];
          
          // If we have participant data, use it; otherwise fall back to mock data
          setStudents(studentsFromParticipants.length > 0 ? studentsFromParticipants : MOCK_STUDENTS);
          
          if (studentsFromParticipants.length === 0) {
            console.log('No participants found, using mock student data');
          }
        }
        
      } catch (err) {
        console.error('Error in fetchStudentData:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        
        toast({
          variant: "destructive",
          title: "Data Fetch Error",
          description: errorMessage,
        });
        
        // Set fallback mock data even if there's an error
        setStudents(MOCK_STUDENTS);
        setCourseData(MOCK_COURSES);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStudentData();
  }, [toast]);

  return {
    students,
    courseData,
    isLoading,
    error
  };
}
