import React, { useState, useEffect } from "react";
import { LayoutDashboard, Package, ShoppingCart, FileText, Bell, Menu, X, User, LogOut, Key, Settings, ChevronDown } from "lucide-react";
import Dashboard from "./Dashboard";
import Materials from "./Materials";
import Sales from "./Sales";
import Invoices from "./Invoices";
import Alerts from "./Alerts";
import Modal from "../shared/Modal";
import logoImage from "../assets/images/wilsonPlus_Logo2.png";

const MainApp = () => {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showChangeUsernameModal, setShowChangeUsernameModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [newUsername, setNewUsername] = useState("");
  const [alertModal, setAlertModal] = useState({ isOpen: false, type: "info", title: "", message: "" });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Auto-collapse sidebar on small screens
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const loadUnreadAlerts = async () => {
      try {
        const result = await window.electronAPI.getUnreadAlerts();
        if (result.success) {
          setUnreadAlertsCount(result.data?.length || 0);
        }
      } catch (error) {
        console.error("Error loading unread alerts:", error);
      }
    };

    loadUnreadAlerts();
    // Poll every 5 seconds for real-time updates
    const interval = setInterval(loadUnreadAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load user profile from localStorage
    const authData = localStorage.getItem("wilsonplus_auth");
    if (authData) {
      const user = JSON.parse(authData);
      setUserProfile(user);
      // Load full user data
      if (user.id) {
        loadUserProfile(user.id);
      }
    }
  }, []);

  const loadUserProfile = async (userId) => {
    try {
      const result = await window.electronAPI.getUser(userId);
      if (result.success) {
        setUserProfile(result.data);
        localStorage.setItem("wilsonplus_auth", JSON.stringify(result.data));
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const getInitials = (username) => {
    if (!username) return "U";
    const parts = username.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    localStorage.removeItem("wilsonplus_auth");
    window.location.reload();
  };

  const handleChangePassword = async () => {
    if (!passwordForm.new || passwordForm.new !== passwordForm.confirm) {
      setAlertModal({ isOpen: true, type: "warning", title: "Validation Error", message: "New passwords do not match" });
      return;
    }

    if (passwordForm.new.length < 6) {
      setAlertModal({ isOpen: true, type: "warning", title: "Validation Error", message: "Password must be at least 6 characters" });
      return;
    }

    try {
      const result = await window.electronAPI.changePassword(
        userProfile.id,
        passwordForm.current,
        passwordForm.new
      );
      if (result.success) {
        setAlertModal({ isOpen: true, type: "success", title: "Success", message: "Password changed successfully" });
        setShowChangePasswordModal(false);
        setPasswordForm({ current: "", new: "", confirm: "" });
      } else {
        setAlertModal({ isOpen: true, type: "error", title: "Error", message: result.error || "Failed to change password" });
      }
    } catch (error) {
      setAlertModal({ isOpen: true, type: "error", title: "Error", message: "Failed to change password" });
    }
  };

  const handleChangeUsername = async () => {
    if (!newUsername || newUsername.length < 3) {
      setAlertModal({ isOpen: true, type: "warning", title: "Validation Error", message: "Username must be at least 3 characters" });
      return;
    }

    try {
      const result = await window.electronAPI.changeUsername(userProfile.id, newUsername);
      if (result.success) {
        setAlertModal({ isOpen: true, type: "success", title: "Success", message: "Username changed successfully" });
        setShowChangeUsernameModal(false);
        setNewUsername("");
        loadUserProfile(userProfile.id);
      } else {
        setAlertModal({ isOpen: true, type: "error", title: "Error", message: result.error || "Failed to change username" });
      }
    } catch (error) {
      setAlertModal({ isOpen: true, type: "error", title: "Error", message: "Failed to change username" });
    }
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "materials", label: "Inventory", icon: Package },
    { id: "sales", label: "Sales", icon: ShoppingCart },
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "alerts", label: "Alerts", icon: Bell },
  ];

  const renderContent = () => {
    switch (currentTab) {
      case "dashboard":
        return <Dashboard />;
      case "materials":
        return <Materials />;
      case "sales":
        return <Sales />;
      case "invoices":
        return <Invoices />;
      case "alerts":
        return <Alerts />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <img
              src={logoImage}
              alt="WilsonPlus Logo"
              className="object-cover w-12 h-12"
            />
            <div>
              <h1 className="text-2xl font-bold text-[#1b65f6]">
                WilsonPlus
              </h1>
              <p className="mt-1 text-xs text-gray-500">Inventory Management</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-500 lg:hidden hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentTab(tab.id);
                  if (isMobile) {
                    setSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  currentTab === tab.id
                    ? "bg-[#1b65f6] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                {tab.id === "alerts" && unreadAlertsCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 ml-auto text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadAlertsCount > 99 ? "99+" : unreadAlertsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center w-full px-3 py-2 space-x-3 transition-colors rounded-lg hover:bg-gray-100"
            >
              <div className="w-10 h-10 bg-[#1b65f6] rounded-full flex items-center justify-center text-white font-semibold">
                {userProfile ? getInitials(userProfile.username) : "U"}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900">
                  {userProfile?.username || "User"}
                </p>
                <p className="text-xs text-gray-500">Profile</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
            </button>

            {showUserMenu && (
              <div className="absolute left-0 right-0 z-50 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg bottom-full">
                <button
                  onClick={() => {
                    setShowChangePasswordModal(true);
                    setShowUserMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-2 space-x-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Key className="w-4 h-4" />
                  <span>Change Password</span>
                </button>
                <button
                  onClick={() => {
                    setNewUsername(userProfile?.username || "");
                    setShowChangeUsernameModal(true);
                    setShowUserMenu(false);
                  }}
                  className="flex items-center w-full px-4 py-2 space-x-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4" />
                  <span>Change Username</span>
                </button>
                <div className="border-t border-gray-200"></div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 space-x-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative flex-1 overflow-y-auto">
        {/* Hamburger Menu Button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed z-30 p-2 text-gray-700 transition-colors bg-white rounded-lg shadow-md top-4 left-4 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}

        {/* Desktop Toggle Button (when sidebar is open) */}
        {sidebarOpen && !isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="fixed z-30 p-2 text-gray-700 transition-colors bg-white rounded-lg shadow-md top-4 left-4 hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <div className="pl-0 lg:pl-0">
          {renderContent()}
        </div>
      </main>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md m-4 bg-white shadow-xl rounded-xl">
            <div className="bg-gradient-to-r from-[#1b65f6] to-[#4a8af7] text-white p-6 rounded-t-xl flex items-center justify-between">
              <h3 className="text-xl font-bold">Change Password</h3>
              <button
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setPasswordForm({ current: "", new: "", confirm: "" });
                }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b65f6]"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">New Password</label>
                <input
                  type="password"
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b65f6]"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b65f6]"
                />
              </div>
              <div className="flex pt-4 space-x-3">
                <button
                  onClick={handleChangePassword}
                  className="flex-1 bg-[#1b65f6] text-white px-4 py-2 rounded-lg hover:bg-[#4a8af7] transition-colors"
                >
                  Change Password
                </button>
                <button
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setPasswordForm({ current: "", new: "", confirm: "" });
                  }}
                  className="px-4 py-2 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Username Modal */}
      {showChangeUsernameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md m-4 bg-white shadow-xl rounded-xl">
            <div className="bg-gradient-to-r from-[#1b65f6] to-[#4a8af7] text-white p-6 rounded-t-xl flex items-center justify-between">
              <h3 className="text-xl font-bold">Change Username</h3>
              <button
                onClick={() => {
                  setShowChangeUsernameModal(false);
                  setNewUsername("");
                }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">New Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b65f6]"
                  placeholder="Enter new username"
                />
              </div>
              <div className="flex pt-4 space-x-3">
                <button
                  onClick={handleChangeUsername}
                  className="flex-1 bg-[#1b65f6] text-white px-4 py-2 rounded-lg hover:bg-[#4a8af7] transition-colors"
                >
                  Change Username
                </button>
                <button
                  onClick={() => {
                    setShowChangeUsernameModal(false);
                    setNewUsername("");
                  }}
                  className="px-4 py-2 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <Modal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, type: "info", title: "", message: "" })}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        showCancel={false}
      />
    </div>
  );
};

export default MainApp;

