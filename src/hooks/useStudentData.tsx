
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Define types for student data
export interface Student {
  id: string;
  name: string;
  email: string;
  grade: number;
  attendance: number;
  assignments: number;
  avatar?: string;
}

export interface StudentStat {
  id: string;
  name: string;
  value: number;
}

export interface CourseData {
  id: string;
  name: string;
  progress: number;
  totalStudents: number;
}

// Helper to generate mock data
const generateMockData = (): {
  students: Student[];
  attendanceStats: StudentStat[];
  assignmentStats: StudentStat[];
  courseData: CourseData[];
} => {
  // Generate mock students
  const students: Student[] = [
    {
      id: '1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      grade: 92,
      attendance: 95,
      assignments: 88,
      avatar: '/placeholder.svg'
    },
    {
      id: '2',
      name: 'Bob Smith',
      email: 'bob@example.com',
      grade: 85,
      attendance: 78,
      assignments: 92,
      avatar: '/placeholder.svg'
    },
    {
      id: '3',
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      grade: 76,
      attendance: 85,
      assignments: 79,
      avatar: '/placeholder.svg'
    },
    {
      id: '4',
      name: 'Diana Ross',
      email: 'diana@example.com',
      grade: 95,
      attendance: 98,
      assignments: 94,
      avatar: '/placeholder.svg'
    },
    {
      id: '5',
      name: 'Ethan Hunt',
      email: 'ethan@example.com',
      grade: 82,
      attendance: 90,
      assignments: 85,
      avatar: '/placeholder.svg'
    }
  ];
  
  // Generate attendance stats
  const attendanceStats: StudentStat[] = students.map(student => ({
    id: student.id,
    name: student.name,
    value: student.attendance
  }));
  
  // Generate assignment stats
  const assignmentStats: StudentStat[] = students.map(student => ({
    id: student.id,
    name: student.name,
    value: student.assignments
  }));
  
  // Generate course data
  const courseData: CourseData[] = [
    { id: '1', name: 'Mathematics', progress: 85, totalStudents: 28 },
    { id: '2', name: 'Science', progress: 72, totalStudents: 32 },
    { id: '3', name: 'Literature', progress: 90, totalStudents: 25 },
    { id: '4', name: 'History', progress: 68, totalStudents: 30 }
  ];
  
  return { students, attendanceStats, assignmentStats, courseData };
};

// Custom hook for student data
export const useStudentData = (useRealData: boolean = false) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<StudentStat[]>([]);
  const [assignmentStats, setAssignmentStats] = useState<StudentStat[]>([]);
  const [courseData, setCourseData] = useState<CourseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Always set mock data first, then try to fetch real data if requested
        const mockData = generateMockData();
        setStudents(mockData.students);
        setAttendanceStats(mockData.attendanceStats);
        setAssignmentStats(mockData.assignmentStats);
        setCourseData(mockData.courseData);
        
        console.info('Using mock data for student dashboard');
        
        if (useRealData) {
          // Attempt to fetch real data from Supabase
          console.log('Attempting to fetch real data from Supabase');
          
          // This code would work if the tables exist in Supabase
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'student');
            
          if (profilesError) {
            throw new Error(`Error fetching profiles: ${profilesError.message}`);
          }
          
          if (profilesData && profilesData.length > 0) {
            // Map profiles data to students
            const realStudents: Student[] = profilesData.map((profile: any) => ({
              id: profile.id,
              name: profile.display_name || 'Unknown',
              email: profile.email || 'unknown@example.com',
              grade: Math.floor(Math.random() * 30) + 70, // Random grade 70-100
              attendance: Math.floor(Math.random() * 30) + 70, // Random attendance 70-100
              assignments: Math.floor(Math.random() * 30) + 70, // Random assignments 70-100
              avatar: profile.avatar_url || '/placeholder.svg'
            }));
            
            setStudents(realStudents);
            
            // Generate real stats
            const realAttendanceStats: StudentStat[] = realStudents.map(student => ({
              id: student.id,
              name: student.name,
              value: student.attendance
            }));
            
            const realAssignmentStats: StudentStat[] = realStudents.map(student => ({
              id: student.id,
              name: student.name,
              value: student.assignments
            }));
            
            setAttendanceStats(realAttendanceStats);
            setAssignmentStats(realAssignmentStats);
            
            // Fetch course data if we have a courses table
            // This is just a placeholder, would need real table
            try {
              const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select('*');
                
              if (coursesError) {
                console.warn(`Courses table not found, using mock data: ${coursesError.message}`);
              } else if (coursesData && coursesData.length > 0) {
                const realCourses: CourseData[] = coursesData.map((course: any) => ({
                  id: course.id,
                  name: course.name,
                  progress: course.progress || Math.floor(Math.random() * 30) + 70,
                  totalStudents: course.total_students || Math.floor(Math.random() * 20) + 20
                }));
                
                setCourseData(realCourses);
              }
            } catch (courseError) {
              console.warn('Error fetching courses, using mock data');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching student data:', err);
        setError('Failed to load student data. Using mock data instead.');
        
        // Use mock data as fallback
        const mockData = generateMockData();
        setStudents(mockData.students);
        setAttendanceStats(mockData.attendanceStats);
        setAssignmentStats(mockData.assignmentStats);
        setCourseData(mockData.courseData);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [useRealData]);
  
  return { 
    students, 
    attendanceStats, 
    assignmentStats,
    courseData,
    isLoading, 
    error 
  };
};
