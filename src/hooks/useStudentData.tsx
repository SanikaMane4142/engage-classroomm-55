
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

// Define types for our student data
export interface CourseData {
  id: string;
  name: string;
  completed: boolean;
  attendedClasses: number;
  totalClasses: number;
  engagementScore: number;
  user_id?: string;
}

export interface ClassData {
  id: string;
  courseName: string;
  date: string;
  startTime: string;
  endTime: string;
  attended: boolean;
  course_id?: string;
  user_id?: string;
}

export interface ActivityData {
  id: string;
  type: 'attendance' | 'quiz' | 'engagement';
  courseName: string;
  description: string;
  timestamp: string;
  score?: number;
  engagementRating?: string;
  user_id?: string;
}

export function useStudentData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<ClassData[]>([]);
  const [completedClasses, setCompletedClasses] = useState<number>(0);
  const [attendedClasses, setAttendedClasses] = useState<number>(0);
  const [averageEngagement, setAverageEngagement] = useState<number>(0);
  const [recentActivities, setRecentActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Function to fetch all student data from Supabase
    const fetchStudentData = async () => {
      try {
        // Fetch courses
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .eq('user_id', user.id);

        if (coursesError) throw coursesError;

        // Fetch upcoming classes
        const today = new Date().toISOString().split('T')[0];
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('*, courses(name)')
          .eq('user_id', user.id)
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(3);

        if (classesError) throw classesError;

        // Fetch recent activities
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('activities')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(3);

        if (activitiesError) throw activitiesError;

        // Process data
        if (coursesData) {
          setCourses(coursesData);
          
          // Calculate metrics
          const totalAttended = coursesData.reduce((sum, course) => sum + course.attendedClasses, 0);
          const avgEngagement = coursesData.reduce((sum, course) => sum + course.engagementScore, 0) / coursesData.length || 0;
          const completedCoursesCount = coursesData.filter(course => course.completed).length;
          
          setCompletedClasses(completedCoursesCount);
          setAttendedClasses(totalAttended);
          setAverageEngagement(Math.round(avgEngagement));
        }

        if (classesData) {
          // Format the class data
          const formattedClasses = classesData.map(cls => ({
            id: cls.id,
            courseName: cls.courses?.name || 'Unknown Course',
            date: cls.date,
            startTime: cls.start_time,
            endTime: cls.end_time,
            attended: cls.attended
          }));
          
          setUpcomingClasses(formattedClasses);
        }

        if (activitiesData) {
          setRecentActivities(activitiesData);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching student data:', error);
        toast({
          variant: "destructive",
          title: "Error fetching data",
          description: "Could not load your student data.",
        });
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStudentData();

    // Set up real-time subscription
    const coursesChannel = supabase
      .channel('student-courses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time update for courses:', payload);
          fetchStudentData(); // Refetch all data
        }
      )
      .subscribe();

    const classesChannel = supabase
      .channel('student-classes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time update for classes:', payload);
          fetchStudentData(); // Refetch all data
        }
      )
      .subscribe();

    const activitiesChannel = supabase
      .channel('student-activities-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time update for activities:', payload);
          fetchStudentData(); // Refetch all data
        }
      )
      .subscribe();

    // Cleanup function to remove channel subscriptions
    return () => {
      supabase.removeChannel(coursesChannel);
      supabase.removeChannel(classesChannel);
      supabase.removeChannel(activitiesChannel);
    };
  }, [user, toast]);

  return {
    courses,
    upcomingClasses,
    completedClasses,
    attendedClasses,
    averageEngagement,
    recentActivities,
    loading
  };
}
