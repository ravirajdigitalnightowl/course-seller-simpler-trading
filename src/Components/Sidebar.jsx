import React from "react";
import {
  FaHome,
  FaUserFriends,
  FaSignOutAlt,
  FaUser,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { SiSpeakerdeck } from "react-icons/si";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";

const Sidebar = ({ activePage, onMobileClose, isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleSignOut = () => {
    logout();
    toast.success("Logged out successfully!", {
      position: "top-right",
      autoClose: 2000,
    });
    setTimeout(() => {
      navigate("/signin");
    }, 1000);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (window.innerWidth < 1024) {
      onMobileClose();
    }
  };

  const menuItems = [
    { icon: <FaHome />, text: "Dashboard", path: "/dashboard" },
    {
      icon: <SiSpeakerdeck />,
      text: "Courses",
      path: "/courses",
    },
    {
      icon: <FaUserFriends />,
      text: "My Students",
      path: "/enrolled",
    },
    // {
    //   icon: <FaUser />,
    //   text: "Profile",
    //   path: "/profile",
    // },
  ];

  return (
    <aside
      className={`
        bg-sidebar text-sidebar-foreground shadow-lg h-full flex flex-col relative
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-2 rounded-xl shadow-lg">
                <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                  <span className="text-xs font-bold text-orange-500">
                    ST
                  </span>
                </div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                S.Trading
              </span>
            </div>
          )}
          
          {/* Toggle Button for Desktop */}
          <button
            onClick={onToggle}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 cursor-pointer"
          >
            {isCollapsed ? 
              <FaChevronRight className="text-amber-300" /> : 
              <FaChevronLeft className="text-amber-300" />
            }
          </button>

          {/* Close button for mobile */}
          <button
            onClick={onMobileClose}
            className="lg:hidden text-sidebar-foreground text-xl hover:bg-sidebar-accent p-1 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item, index) => {
          const isActive = activePage === item.path;

          return (
            <button
              key={index}
              onClick={() => handleNavigation(item.path)}
              className={`
                w-full flex items-center p-3 rounded-xl group relative cursor-pointer
                ${isActive
                  ? "bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 text-white"
                  : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground border border-transparent hover:border-sidebar-border"
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <span className={`text-xl group-hover:scale-110 ${
                isActive ? "text-white" : "text-amber-300"
              }`}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="ml-3 text-left whitespace-nowrap font-medium">
                  {item.text}
                </span>
              )}
              
              {/* Active indicator for collapsed sidebar */}
              {isCollapsed && isActive && (
                <div className="absolute right-2 w-2 h-2 bg-white rounded-full"></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleSignOut}
          className={`w-full flex items-center p-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 cursor-pointer 
            hover:from-red-600 hover:to-pink-700 text-white 
            shadow-lg hover:shadow-xl hover:shadow-red-500/25 group border border-red-400/20
            ${isCollapsed ? 'justify-center' : ''}
          `}
        >
          <span className="text-xl group-hover:scale-110 cursor-pointer">
            <FaSignOutAlt />
          </span>
          {!isCollapsed && (
            <span className="ml-3 font-medium">Logout</span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;