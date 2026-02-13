import React, { useState, useRef, useEffect } from "react";
import { FaBell, FaSignOutAlt, FaBars, FaSun, FaMoon, FaUserCircle, FaUser, FaChevronDown, FaPalette } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const Header = ({ onMenuToggle }) => {
  const [isNotificationPopupVisible, setIsNotificationPopupVisible] = useState(false);
  const [isProfileDropdownVisible, setIsProfileDropdownVisible] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationPopupVisible(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileDropdownVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      logout();
      toast.success("Successfully logged out!", {
        position: "top-right",
        autoClose: 3000,
      });
      navigate("/signin");
    } catch (error) {
      toast.error("Logout failed. Please try again.");
    }
  };

  const handleProfileClick = () => {
    navigate("/profile");
    setIsProfileDropdownVisible(false);
  };

  const handleThemeToggle = () => {
    toggleTheme();
    setIsProfileDropdownVisible(false);
  };

  const profileMenuItems = [
    // { 
    //   icon: <FaUser className="text-lg" />, 
    //   text: "Profile", 
    //   onClick: handleProfileClick 
    // },
    { 
      icon: isDark ? <FaSun className="text-lg" /> : <FaMoon className="text-lg" />, 
      text: isDark ? "Light Mode" : "Dark Mode", 
      onClick: handleThemeToggle 
    },
    { 
      icon: <FaSignOutAlt className="text-lg" />, 
      text: "Logout", 
      onClick: handleLogout 
    },
  ];

  return (
    <header className="bg-card text-foreground p-4 shadow-lg border-b border-border">
      <div className="flex items-center justify-between">
        {/* Left Section - Menu Button and Title */}
        <div className="flex items-center space-x-4 cursor-pointer">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors duration-200"
          >
            <FaBars className="text-xl" />
          </button>
          {/* <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Simpler Trading
          </h1> */}
        </div>

        {/* Right Section - Notifications and Profile */}
        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationPopupVisible(!isNotificationPopupVisible)}
              className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group relative cursor-pointer"
            >
              <FaBell className="text-lg group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-card">
                3
              </span>
            </button>

            {isNotificationPopupVisible && (
              <div className="fixed lg:absolute inset-x-4 lg:inset-x-auto lg:right-0 top-20 lg:top-auto lg:mt-3 w-auto lg:w-80 bg-card rounded-2xl shadow-2xl border border-border z-50 animate-in fade-in slide-in-from-top-5 duration-300 mx-auto lg:mx-0 max-w-md">
                <div className="p-3 lg:p-4 border-b border-border bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-t-2xl">
                  <h3 className="font-bold text-foreground flex items-center justify-center lg:justify-start text-sm lg:text-base">
                    <FaBell className="mr-2 text-blue-500" />
                    Notifications
                  </h3>
                </div>
                <div className="max-h-60 overflow-y-auto scrollbar-thin">
                  <div className="p-3 lg:p-4 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors duration-200">
                    <div className="flex items-start space-x-2 lg:space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-1 lg:mt-2 flex-shrink-0"></div>
                      <div className="flex-1 text-center lg:text-left">
                        <p className="text-xs lg:text-sm font-semibold text-foreground">New student registration</p>
                        <p className="text-xs text-muted-foreground mt-1">John Doe enrolled in Physics</p>
                        <p className="text-xs text-muted-foreground mt-1">2 minutes ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 lg:p-4 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors duration-200">
                    <div className="flex items-start space-x-2 lg:space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 lg:mt-2 flex-shrink-0"></div>
                      <div className="flex-1 text-center lg:text-left">
                        <p className="text-xs lg:text-sm font-semibold text-foreground">Course enrollment completed</p>
                        <p className="text-xs text-muted-foreground mt-1">Mathematics 101 course</p>
                        <p className="text-xs text-muted-foreground mt-1">1 hour ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 lg:p-4 hover:bg-muted/50 cursor-pointer transition-colors duration-200">
                    <div className="flex items-start space-x-2 lg:space-x-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-1 lg:mt-2 flex-shrink-0"></div>
                      <div className="flex-1 text-center lg:text-left">
                        <p className="text-xs lg:text-sm font-semibold text-foreground">New message received</p>
                        <p className="text-xs text-muted-foreground mt-1">From student: Mike Johnson</p>
                        <p className="text-xs text-muted-foreground mt-1">3 hours ago</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-border bg-muted/50 rounded-b-2xl">
                  <button className="w-full text-center text-xs lg:text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileDropdownVisible(!isProfileDropdownVisible)}
              className="flex items-center space-x-3 p-2 rounded-xl hover:bg-muted transition-all duration-300 group border border-transparent hover:border-border cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow cursor-pointer">
                  <FaUserCircle className="text-white text-lg" />
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-semibold text-foreground">
                    {user?.name || "Admin User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.role || "Administrator"}
                  </p>
                </div>
              </div>
              <FaChevronDown className={`text-muted-foreground transition-transform duration-300 ${
                isProfileDropdownVisible ? "rotate-180" : ""
              }`} />
            </button>

            {isProfileDropdownVisible && (
              <div className="absolute right-0 mt-3 w-64 max-w-[80vw] bg-card rounded-2xl shadow-2xl border border-border z-50 animate-in fade-in slide-in-from-top-5 duration-300">
                {/* Profile Header */}
                <div className="p-4 border-b border-border bg-gradient-to-r from-indigo-500/10 to-purple-600/10 rounded-t-2xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer">
                      <FaUserCircle className="text-white text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {user?.name || "Admin User"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email || "N/A"}
                      </p>
                      <div className="flex items-center mt-1">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          isDark ? "bg-amber-400" : "bg-indigo-500"
                        }`}></div>
                        <span className="text-xs text-muted-foreground">
                          {isDark ? "Dark Mode" : "Light Mode"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  {profileMenuItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={item.onClick}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-all duration-200 group text-left cursor-pointer"
                    >
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${
                        index === 0 
                          ? "from-blue-500 to-cyan-500" 
                          : index === 1 
                          ? "from-amber-500 to-orange-500" 
                          : "from-red-500 to-pink-600"
                      } text-white shadow-sm group-hover:shadow-md transition-shadow`}>
                        {item.icon}
                      </div>
                      <span className={`font-medium ${
                        index === 2 
                          ? "text-red-600 group-hover:text-red-700" 
                          : "text-foreground"
                      }`}>
                        {item.text}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Footer */}
                {/* <div className="p-3 border-t border-border bg-muted/50 rounded-b-2xl">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Physnxt Admin v1.0</span>
                    <div className="flex items-center space-x-1">
                      <FaPalette className="text-amber-500" />
                      <span>{isDark ? "Dark" : "Light"}</span>
                    </div>
                  </div>
                </div> */}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;