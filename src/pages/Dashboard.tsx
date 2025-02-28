
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Video, Users, Calendar, Clock, Copy, Clipboard, ArrowRight, Activity, BarChart3, BookOpen } from 'lucide-react';

// Mock recent meetings data
const recentMeetings = [
  { id: '1', name: 'Physics Class', date: '2023-05-15', time: '09:00 AM', participants: 24, duration: '45 mins' },
  { id: '2', name: 'Chemistry Lab', date: '2023-05-14', time: '11:30 AM', participants: 18, duration: '60 mins' },
  { id: '3', name: 'Math Review', date: '2023-05-12', time: '02:00 PM', participants: 22, duration: '50 mins' },
];

// Mock student engagement data
const studentEngagementData = [
  { id: '1', name: 'Alice Johnson', engagement: 'Engaged', lastActive: '2 mins ago', attention: '95%' },
  { id: '2', name: 'Bob Smith', engagement: 'Bored', lastActive: '1 min ago', attention: '65%' },
  { id: '3', name: 'Charlie Brown', engagement: 'Sleepy', lastActive: 'Just now', attention: '45%' },
  { id: '4', name: 'Diana Prince', engagement: 'Engaged', lastActive: '3 mins ago', attention: '90%' },
  { id: '5', name: 'Edward Stark', engagement: 'Bored', lastActive: '2 mins ago', attention: '70%' },
];

// Activities to recommend based on engagement levels
const recommendedActivities = {
  Engaged: ['Advanced problem set', 'Group discussion leader', 'Peer tutoring'],
  Bored: ['Interactive quiz', 'Hands-on demonstration', 'Real-world application task'],
  Sleepy: ['Quick energizer activity', 'Stand-up problem solving', 'Multimedia presentation'],
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [meetingLink, setMeetingLink] = useState('');
  const [showNewMeetingDialog, setShowNewMeetingDialog] = useState(false);
  const [showJoinMeetingDialog, setShowJoinMeetingDialog] = useState(false);
  const [newMeetingName, setNewMeetingName] = useState('');
  const [joinMeetingLink, setJoinMeetingLink] = useState('');

  const isTeacher = user?.role === 'teacher';

  const handleStartNewMeeting = () => {
    // Generate a random meeting ID
    const meetingId = Math.random().toString(36).substring(2, 12);
    const link = `${window.location.origin}/meeting/${meetingId}`;
    setMeetingLink(link);
    setShowNewMeetingDialog(true);
  };

  const handleCopyMeetingLink = () => {
    navigator.clipboard.writeText(meetingLink);
    toast({
      title: "Link copied",
      description: "Meeting link has been copied to clipboard.",
    });
  };

  const handleJoinMeeting = () => {
    if (!joinMeetingLink) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a meeting link to join.",
      });
      return;
    }

    // Extract the meeting ID from the link
    try {
      const url = new URL(joinMeetingLink);
      const pathSegments = url.pathname.split('/');
      const meetingId = pathSegments[pathSegments.length - 1];
      
      // Navigate to the meeting
      navigate(`/meeting/${meetingId}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid meeting link",
        description: "Please enter a valid meeting link.",
      });
    }
  };

  const handleJoinCreatedMeeting = () => {
    const pathSegments = new URL(meetingLink).pathname.split('/');
    const meetingId = pathSegments[pathSegments.length - 1];
    navigate(`/meeting/${meetingId}`);
  };

  const getEngagementBadgeClass = (engagement: string) => {
    switch (engagement) {
      case 'Engaged':
        return 'bg-green-100 text-green-800';
      case 'Bored':
        return 'bg-yellow-100 text-yellow-800';
      case 'Sleepy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderTeacherDashboard = () => (
    <>
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+2 from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground">+12 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">+5% from last week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Recent Meetings</CardTitle>
            <CardDescription>Your last few class sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMeetings.map((meeting) => (
                  <TableRow key={meeting.id}>
                    <TableCell className="font-medium">{meeting.name}</TableCell>
                    <TableCell>{meeting.date}</TableCell>
                    <TableCell>{meeting.participants}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full" size="sm">
              View All Meetings
            </Button>
          </CardFooter>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Student Engagement</CardTitle>
            <CardDescription>Current class engagement metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentEngagementData.slice(0, 4).map((student) => (
                <div key={student.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-gray-500">Active {student.lastActive}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs ${getEngagementBadgeClass(student.engagement)}`}>
                    {student.engagement}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full" size="sm">
              View All Students
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Activities</CardTitle>
          <CardDescription>Based on student engagement levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <h4 className="font-medium">For Engaged Students</h4>
              </div>
              <ul className="space-y-1 text-sm">
                {recommendedActivities.Engaged.map((activity, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <ArrowRight className="h-3 w-3 text-green-600" />
                    <span>{activity}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <h4 className="font-medium">For Bored Students</h4>
              </div>
              <ul className="space-y-1 text-sm">
                {recommendedActivities.Bored.map((activity, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <ArrowRight className="h-3 w-3 text-yellow-600" />
                    <span>{activity}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <h4 className="font-medium">For Sleepy Students</h4>
              </div>
              <ul className="space-y-1 text-sm">
                {recommendedActivities.Sleepy.map((activity, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <ArrowRight className="h-3 w-3 text-red-600" />
                    <span>{activity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderStudentDashboard = () => (
    <>
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Courses Enrolled</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Active this semester</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Classes Attended</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">82%</div>
            <p className="text-xs text-muted-foreground">+3% from last week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Upcoming Classes</CardTitle>
            <CardDescription>Your scheduled learning sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 text-blue-800 p-3 rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium">Physics 101</h4>
                  <p className="text-xs text-gray-500">Today, 10:00 AM - 11:30 AM</p>
                </div>
                <Button size="sm" variant="outline">Join</Button>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 text-purple-800 p-3 rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium">Mathematics</h4>
                  <p className="text-xs text-gray-500">Tomorrow, 09:00 AM - 10:30 AM</p>
                </div>
                <Button size="sm" variant="outline" disabled>Join</Button>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-green-100 text-green-800 p-3 rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium">Biology Lab</h4>
                  <p className="text-xs text-gray-500">Wed, 02:00 PM - 04:00 PM</p>
                </div>
                <Button size="sm" variant="outline" disabled>Join</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest classroom interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">
                  <Video className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-medium">Chemistry Class</span>
                    <span className="text-gray-500"> - You attended for 45 minutes</span>
                  </p>
                  <p className="text-xs text-gray-500">Yesterday at 11:30 AM</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">
                  <Activity className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-medium">Physics Quiz</span>
                    <span className="text-gray-500"> - You completed with 85% score</span>
                  </p>
                  <p className="text-xs text-gray-500">2 days ago at 3:15 PM</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-medium">Math Class</span>
                    <span className="text-gray-500"> - Your engagement was rated "Excellent"</span>
                  </p>
                  <p className="text-xs text-gray-500">3 days ago at 9:45 AM</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Engagement Metrics</CardTitle>
          <CardDescription>How focused you've been in recent classes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Physics</div>
                <div className="text-sm font-medium text-green-600">92%</div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Mathematics</div>
                <div className="text-sm font-medium text-green-600">88%</div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '88%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Chemistry</div>
                <div className="text-sm font-medium text-yellow-600">74%</div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 rounded-full" style={{ width: '74%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Biology</div>
                <div className="text-sm font-medium text-green-600">85%</div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-grow pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
            <p className="text-gray-600">
              {isTeacher ? 'Manage your classes and student engagement' : 'Track your classes and learning progress'}
            </p>
          </div>
          <div className="flex space-x-2">
            {isTeacher ? (
              <Button onClick={handleStartNewMeeting} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Video className="mr-2 h-4 w-4" />
                Start New Meeting
              </Button>
            ) : (
              <Button onClick={() => setShowJoinMeetingDialog(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Video className="mr-2 h-4 w-4" />
                Join Meeting
              </Button>
            )}
          </div>
        </div>

        {isTeacher ? renderTeacherDashboard() : renderStudentDashboard()}
      </main>

      {/* New Meeting Dialog */}
      <Dialog open={showNewMeetingDialog} onOpenChange={setShowNewMeetingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Meeting</DialogTitle>
            <DialogDescription>
              Share this link with your students to invite them to the meeting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Meeting Name (optional)"
                value={newMeetingName}
                onChange={(e) => setNewMeetingName(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Input value={meetingLink} readOnly />
              <Button size="icon" variant="outline" onClick={handleCopyMeetingLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setShowNewMeetingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleJoinCreatedMeeting}>
              Join Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Meeting Dialog */}
      <Dialog open={showJoinMeetingDialog} onOpenChange={setShowJoinMeetingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Meeting</DialogTitle>
            <DialogDescription>
              Enter the meeting link provided by your teacher.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Paste meeting link here"
                value={joinMeetingLink}
                onChange={(e) => setJoinMeetingLink(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setShowJoinMeetingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleJoinMeeting}>
              Join Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
