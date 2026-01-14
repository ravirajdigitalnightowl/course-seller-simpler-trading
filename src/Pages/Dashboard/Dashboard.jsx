import React from 'react';
import DashboardLayout from '../../utils/layout/DashboardLayout';
import ResponsiveTable from '../../Components/ResponsiveTable';
import { FaUsers, FaBook, FaChartLine, FaMoneyBillWave, FaArrowUp, FaArrowDown } from 'react-icons/fa';

const Dashboard = () => {
  const stats = [
    {
      title: "Total Students",
      value: "1,234",
      change: "+12%",
      trend: "up",
      icon: <FaUsers className="text-2xl lg:text-3xl" />,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-stat-card",
      borderColor: "border-stat-border"
    },
    {
      title: "Total Courses",
      value: "45",
      change: "+5%",
      trend: "up",
      icon: <FaBook className="text-2xl lg:text-3xl" />,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-stat-card",
      borderColor: "border-stat-border"
    },
    {
      title: "Active Sessions",
      value: "89",
      change: "-3%",
      trend: "down",
      icon: <FaChartLine className="text-2xl lg:text-3xl" />,
      color: "from-purple-500 to-violet-500",
      bgColor: "bg-stat-card",
      borderColor: "border-stat-border"
    },
    {
      title: "Revenue",
      value: "$12,456",
      change: "+23%",
      trend: "up",
      icon: <FaMoneyBillWave className="text-2xl lg:text-3xl" />,
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-stat-card",
      borderColor: "border-stat-border"
    }
  ];

  // Sample table data
  const recentStudents = [
    { id: 1, name: "John Doe", email: "john@example.com", course: "Physics", join_date: "2024-01-15" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", course: "Mathematics", join_date: "2024-01-14" },
    { id: 3, name: "Mike Johnson", email: "mike@example.com", course: "Chemistry", join_date: "2024-01-13" },
  ];

  const recentCourses = [
    { id: 1, course_name: "Advanced Physics", instructor: "Dr. Smith", students: 45, status: "Active" },
    { id: 2, course_name: "Mathematics 101", instructor: "Prof. Johnson", students: 67, status: "Active" },
    { id: 3, course_name: "Organic Chemistry", instructor: "Dr. Brown", students: 32, status: "Active" },
  ];

  return (
    <DashboardLayout activePage="/dashboard">
      <div className="space-y-6 w-full h-full">
        {/* Page Header */}
        <div className="w-full">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1 lg:mt-2 text-sm lg:text-base">
            Welcome to your admin dashboard. Here's what's happening today.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 w-full">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`${stat.bgColor} ${stat.borderColor} border rounded-xl p-4 lg:p-6 shadow-sm hover:shadow-md transition-all duration-300 w-full group hover:scale-105`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex-1 min-w-0">
                  <p className="text-xs lg:text-sm font-medium text-muted-foreground truncate">
                    {stat.title}
                  </p>
                  <p className="text-lg lg:text-2xl font-bold text-foreground mt-1 lg:mt-2 truncate">
                    {stat.value}
                  </p>
                  <div className={`flex items-center mt-2 text-xs font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.trend === 'up' ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
                    {stat.change}
                  </div>
                </div>
                <div className={`flex-shrink-0 ml-3 p-3 rounded-xl bg-gradient-to-r ${stat.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
          {/* Recent Students Table */}
          <div className="bg-card rounded-xl shadow-sm border border-border w-full overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="p-4 lg:p-6 border-b border-border w-full">
              <h2 className="text-lg lg:text-xl font-bold text-foreground">Recent Students</h2>
              <p className="text-sm text-muted-foreground mt-1">Latest student registrations</p>
            </div>
            <div className="w-full">
              <ResponsiveTable
                headers={['Name', 'Email', 'Course', 'Join Date']}
                data={recentStudents}
                keyExtractor={(item) => item.id}
                onEdit={(item) => console.log('Edit:', item)}
                onDelete={(item) => console.log('Delete:', item)}
              />
            </div>
          </div>

          {/* Recent Courses Table */}
          <div className="bg-card rounded-xl shadow-sm border border-border w-full overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="p-4 lg:p-6 border-b border-border w-full">
              <h2 className="text-lg lg:text-xl font-bold text-foreground">Recent Courses</h2>
              <p className="text-sm text-muted-foreground mt-1">Recently added courses</p>
            </div>
            <div className="w-full">
              <ResponsiveTable
                headers={['Course Name', 'Instructor', 'Students', 'Status']}
                data={recentCourses}
                keyExtractor={(item) => item.id}
                onEdit={(item) => console.log('Edit:', item)}
                onDelete={(item) => console.log('Delete:', item)}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;