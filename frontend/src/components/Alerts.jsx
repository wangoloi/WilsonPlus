import React, { useState, useEffect } from "react";
import { Bell, Check, AlertTriangle, Trash2 } from "lucide-react";
import Pagination from "../shared/Pagination";
import Modal from "../shared/Modal";

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, alertId: null, deleteAll: false });

  useEffect(() => {
    loadAlerts();
    // Real-time updates: poll every 5 seconds
    const interval = setInterval(() => {
      loadAlerts();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentPage, itemsPerPage]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.getAllAlerts();
      if (result.success) {
        const allAlerts = result.data || [];
        setTotalItems(allAlerts.length);
        
        // Apply pagination
        const offset = (currentPage - 1) * itemsPerPage;
        const paginatedAlerts = allAlerts.slice(offset, offset + itemsPerPage);
        setAlerts(paginatedAlerts);
      }
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (alertId) => {
    try {
      const result = await window.electronAPI.markAlertAsRead(alertId);
      if (result.success) {
        loadAlerts();
      }
    } catch (error) {
      console.error("Error marking alert as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const result = await window.electronAPI.markAllAlertsAsRead();
      if (result.success) {
        loadAlerts();
      }
    } catch (error) {
      console.error("Error marking all alerts as read:", error);
    }
  };

  const handleDeleteClick = (alertId) => {
    setDeleteModal({ isOpen: true, alertId, deleteAll: false });
  };

  const handleDeleteAllClick = () => {
    setDeleteModal({ isOpen: true, alertId: null, deleteAll: true });
  };

  const handleDeleteConfirm = async () => {
    try {
      if (deleteModal.deleteAll) {
        const result = await window.electronAPI.deleteAllAlerts();
        if (result.success) {
          loadAlerts();
          setAllAlerts([]);
        }
      } else if (deleteModal.alertId) {
        const result = await window.electronAPI.deleteAlert(deleteModal.alertId);
        if (result.success) {
          loadAlerts();
        }
      }
      setDeleteModal({ isOpen: false, alertId: null, deleteAll: false });
    } catch (error) {
      console.error("Error deleting alert:", error);
    }
  };

  // Calculate unread count from all alerts, not just current page
  const [allAlerts, setAllAlerts] = useState([]);
  useEffect(() => {
    const loadAllAlerts = async () => {
      try {
        const result = await window.electronAPI.getAllAlerts();
        if (result.success) {
          setAllAlerts(result.data || []);
        }
      } catch (error) {
        console.error("Error loading all alerts:", error);
      }
    };
    loadAllAlerts();
    const interval = setInterval(loadAllAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = allAlerts.filter((alert) => !alert.isRead).length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Stock Alerts</h2>
        <div className="flex items-center space-x-2">
          {alerts.length > 0 && (
            <button
              onClick={handleDeleteAllClick}
              className="bg-red-100 text-red-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-200 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              <span>Delete All</span>
            </button>
          )}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors"
            >
              <Check className="w-5 h-5" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-t-2 border-b-2 border-[#1b65f6] rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No alerts found</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-white rounded-xl shadow-sm border-l-4 p-4 ${
                    alert.isRead
                      ? "border-gray-300 bg-gray-50"
                      : "border-yellow-400 bg-yellow-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <AlertTriangle
                        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          alert.isRead ? "text-gray-400" : "text-yellow-600"
                        }`}
                      />
                      <div className="flex-1">
                        <p className={`text-sm ${alert.isRead ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {!alert.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(alert.id)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Mark as read"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteClick(alert.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete alert"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={totalItems}
              onItemsPerPageChange={(newSize) => {
                setItemsPerPage(newSize);
                setCurrentPage(1);
              }}
            />
          )}
        </>
      )}

      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, alertId: null, deleteAll: false })}
        type="warning"
        title={deleteModal.deleteAll ? "Delete All Alerts" : "Delete Alert"}
        message={deleteModal.deleteAll ? "Are you sure you want to delete all alerts? This action cannot be undone." : "Are you sure you want to delete this alert? This action cannot be undone."}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default Alerts;
