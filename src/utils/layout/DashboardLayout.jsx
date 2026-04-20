import React, { useState } from 'react';
import Sidebar from '../../Components/Sidebar';
import Header from '../../Components/Header';

const DashboardLayout = ({ children, activePage }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Mobile Sidebar Overlay - MORE TRANSPARENT */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        transform transition-transform duration-300 ease-in-out
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}>
        <Sidebar 
          activePage={activePage} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileClose={() => setMobileSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 lg:p-6 w-full scrollbar-thin bg-background">
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;


// import React, { useState } from 'react';
// import Sidebar from '../../Components/Sidebar';
// import Header from '../../Components/Header';

// const DashboardLayout = ({ children, activePage }) => {
//   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
//   const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

//   return (
//     <div className="flex h-screen bg-background text-foreground">
//       {/* Mobile Sidebar Overlay - FIXED BACKGROUND */}
//       {mobileSidebarOpen && (
//         <div 
//           className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-40 lg:hidden"
//           onClick={() => setMobileSidebarOpen(false)}
//         />
//       )}
      
//       {/* Sidebar */}
//       <div className={`
//         fixed lg:static inset-y-0 left-0 z-50
//         transform transition-transform duration-300 ease-in-out
//         ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
//         lg:translate-x-0
//         ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
//       `}>
//         <Sidebar 
//           activePage={activePage} 
//           onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
//           onMobileClose={() => setMobileSidebarOpen(false)}
//           isCollapsed={sidebarCollapsed}
//         />
//       </div>
      
//       {/* Main Content */}
//       <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
//         <Header onMenuToggle={() => setMobileSidebarOpen(true)} />
//         <main className="flex-1 overflow-auto p-4 lg:p-6 w-full scrollbar-thin bg-background">
//           <div className="w-full h-full">
//             {children}
//           </div>
//         </main>
//       </div>
//     </div>
//   );
// };

// export default DashboardLayout;



// import React, { useState } from 'react';
// import Sidebar from '../../Components/Sidebar';
// import Header from '../../Components/Header';

// const DashboardLayout = ({ children, activePage }) => {
//   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
//   const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

//   return (
//     <div className="flex h-screen bg-background text-foreground transition-colors duration-300">
//       {/* Mobile Sidebar Overlay */}
//       {mobileSidebarOpen && (
//         <div 
//           className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
//           onClick={() => setMobileSidebarOpen(false)}
//         />
//       )}
      
//       {/* Sidebar */}
//       <div className={`
//         fixed lg:static inset-y-0 left-0 z-50
//         transform transition-transform duration-300 ease-in-out
//         ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
//         lg:translate-x-0
//         ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
//       `}>
//         <Sidebar 
//           activePage={activePage} 
//           onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
//           onMobileClose={() => setMobileSidebarOpen(false)}
//           isCollapsed={sidebarCollapsed}
//         />
//       </div>
      
//       {/* Main Content */}
//       <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
//         <Header onMenuToggle={() => setMobileSidebarOpen(true)} />
//         <main className="flex-1 overflow-auto p-4 lg:p-6 w-full scrollbar-thin bg-background">
//           <div className="w-full h-full">
//             {children}
//           </div>
//         </main>
//       </div>
//     </div>
//   );
// };

// export default DashboardLayout;