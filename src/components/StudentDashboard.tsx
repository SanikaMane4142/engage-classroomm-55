
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStudentData } from '@/hooks/useStudentData';
import { Video, Activity, BarChart3, BookOpen } from 'lucide-react';

const StudentDashboard: React.FC = () => {
  const { 
    students,
    courseData,
    isLoading,
    error 
  } = useStudentData();

  if (isLoading) {
    return <div className="flex justify-center items-center py-10">Loading student data...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center py-10 text-red-500">{error}</div>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-3 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{students.length}</div>
          <p className="text-xs text-muted-foreground">Active students</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
          <Video className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.round(students.reduce((acc, student) => acc + student.attendance, 0) / students.length)}%
          </div>
          <p className="text-xs text-muted-foreground">Across all students</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{courseData.length}</div>
          <p className="text-xs text-muted-foreground">Total courses</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;
