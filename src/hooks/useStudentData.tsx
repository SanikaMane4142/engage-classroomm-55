
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
}

export interface ClassData {
  id: string;
  courseName: string;
  date: string;
  startTime: string;
  endTime: string;
  attended: boolean;
}

export interface ActivityData {
  id: string;
  type: 'attendance' | 'quiz' | 'engagement';
  courseName: string;
  description: string;
  timestamp: string;
  score?: number;
  engagementRating?: string;
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

  // Mock course data - in a real app, this would come from a database
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Mock data setup - would be replaced with actual database queries
    const mockCourses: CourseData[] = [
      { 
        id: '1', 
        name: 'Physics 101', 
        completed: false, 
        attendedClasses: 8, 
        totalClasses: 12, 
        engagementScore: 92 
      },
      { 
        id: '2', 
        name: 'Mathematics', 
        completed: false, 
        attendedClasses: 10, 
        totalClasses: 14, 
        engagementScore: 88 
      },
      { 
        id: '3', 
        name: 'Chemistry', 
        completed: false, 
        attendedClasses: 7, 
        totalClasses: 12, 
        engagementScore: 74 
      },
      { 
        id: '4', 
        name: 'Biology', 
        completed: true, 
        attendedClasses: 12, 
        totalClasses: 12, 
        engagementScore: 85 
      },
      { 
        id: '5', 
        name: 'History', 
        completed: false, 
        attendedClasses: 6, 
        totalClasses: 10, 
        engagementScore: 78 
      }
    ];

    // Current date for mock data
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(today.getDate() + 2);

    // Format dates for display
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    const mockUpcomingClasses: ClassData[] = [
      {
        id: '1',
        courseName: 'Physics 101',
        date: formatDate(today),
        startTime: '10:00 AM',
        endTime: '11:30 AM',
        attended: false
      },
      {
        id: '2',
        courseName: 'Mathematics',
        date: formatDate(tomorrow),
        startTime: '09:00 AM',
        endTime: '10:30 AM',
        attended: false
      },
      {
        id: '3',
        courseName: 'Biology Lab',
        date: formatDate(dayAfterTomorrow),
        startTime: '02:00 PM',
        endTime: '04:00 PM',
        attended: false
      }
    ];

    // Generate mock recent activities
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(today.getDate() - 3);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(today.getDate() - 2);
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const mockActivities: ActivityData[] = [
      {
        id: '1',
        type: 'attendance',
        courseName: 'Chemistry',
        description: 'You attended for 45 minutes',
        timestamp: yesterday.toISOString()
      },
      {
        id: '2',
        type: 'quiz',
        courseName: 'Physics Quiz',
        description: 'You completed with 85% score',
        timestamp: twoDaysAgo.toISOString(),
        score: 85
      },
      {
        id: '3',
        type: 'engagement',
        courseName: 'Math Class',
        description: 'Your engagement was rated "Excellent"',
        timestamp: threeDaysAgo.toISOString(),
        engagementRating: 'Excellent'
      }
    ];

    // Calculate totals based on mock data
    const totalAttended = mockCourses.reduce((sum, course) => sum + course.attendedClasses, 0);
    const avgEngagement = mockCourses.reduce((sum, course) => sum + course.engagementScore, 0) / mockCourses.length;
    const completedCoursesCount = mockCourses.filter(course => course.completed).length;

    // Update state with mock data
    setCourses(mockCourses);
    setUpcomingClasses(mockUpcomingClasses);
    setCompletedClasses(completedCoursesCount);
    setAttendedClasses(totalAttended);
    setAverageEngagement(Math.round(avgEngagement));
    setRecentActivities(mockActivities);
    setLoading(false);

    // Setup real-time listener for future integration with backend
    const channel = supabase
      .channel('student-dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          // In a real app, we would refetch data here or update specific pieces of state
          // For now, we'll just show a notification
          toast({
            title: "Dashboard updated",
            description: "New data has been received from the server.",
          });
        }
      )
      .subscribe();

    // Cleanup function to remove channel subscription
    return () => {
      supabase.removeChannel(channel);
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
