// import React, { useState, useEffect } from "react";
// import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// import MainApp from "./components/MainApp";
// import Login from "./components/Login";
// import "./styles/globals.css";

// function App() {
//   const [isLoading, setIsLoading] = useState(true);
//   const [isAuthenticated, setIsAuthenticated] = useState(false);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setIsLoading(false);
//     }, 1000);

//     return () => clearTimeout(timer);
//   }, []);

//   const handleLogin = (userData) => {
//     setIsAuthenticated(true);
//     // Store authentication state in localStorage
//     localStorage.setItem("wilsonplus_auth", JSON.stringify(userData));
//   };

//   useEffect(() => {
//     // Check if user is already authenticated
//     const authData = localStorage.getItem("wilsonplus_auth");
//     if (authData) {
//       setIsAuthenticated(true);
//     }
//   }, []);

//   // Loading screen
//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-[#1b65f6] to-[#4a8af7] flex items-center justify-center">
//         <div className="text-center">
//           <div className="inline-block w-16 h-16 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
//           <h2 className="mt-4 text-xl font-semibold text-white">
//             Loading WilsonPlus...
//           </h2>
//           <p className="mt-2 text-white/80">
//             Building Materials & Paints Inventory Management
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // Show login if not authenticated
//   if (!isAuthenticated) {
//     return <Login onLogin={handleLogin} />;
//   }

//   return (
//     <div className="text-sm App">
//       <MainApp />

//       {/* Toast notifications */}
//       <ToastContainer
//         position="top-center"
//         autoClose={5000}
//         closeButton={false}
//         hideProgressBar={true}
//         newestOnTop={false}
//         toastStyle={{
//           backgroundColor: "#FFFFFF",
//           color: "#111827",
//           borderRadius: "12px",
//           boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
//         }}
//       />
//     </div>
//   );
// }

// export default App;
