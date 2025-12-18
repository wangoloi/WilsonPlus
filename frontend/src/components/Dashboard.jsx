import React, { useState, useEffect } from "react";
import { BarChart3, Package, AlertTriangle, DollarSign, TrendingUp, X, Calendar } from "lucide-react";
import CustomDatePicker from "../shared/CustomDatepicker";
import DataTable from "../shared/DataTable";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    totalValue: 0,
    todaySales: 0,
  });
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [salesDateFrom, setSalesDateFrom] = useState(null);
  const [salesDateTo, setSalesDateTo] = useState(null);
  const [filteredSales, setFilteredSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesCurrentPage, setSalesCurrentPage] = useState(1);
  const [salesItemsPerPage, setSalesItemsPerPage] = useState(25);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      // Load dashboard stats
      const statsResult = await window.electronAPI.getDashboardStats();
      if (statsResult.success) {
        setStats(statsResult.data);
      }

      // Load today's sales transactions
      const salesResult = await window.electronAPI.getTodaySales();
      if (salesResult.success) {
        // getTodaySales now returns transactions, not individual sales
        setRecentSales(salesResult.data.slice(0, 5));
      }

      // Load unread alerts
      const alertsResult = await window.electronAPI.getUnreadAlerts();
      if (alertsResult.success) {
        setLowStockAlerts(alertsResult.data.slice(0, 5));
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const handleTodaySalesClick = () => {
    // Set default dates to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setSalesDateFrom(today);
    setSalesDateTo(tomorrow);
    setShowSalesModal(true);
    loadSalesByDateRange(today, tomorrow);
  };

  const loadSalesByDateRange = async (fromDate, toDate) => {
    try {
      setSalesLoading(true);
      const from = fromDate.toISOString();
      const to = toDate.toISOString();
      
      const result = await window.electronAPI.getSalesByDateRange(from, to);
      if (result.success) {
        setFilteredSales(result.data || []);
      }
    } catch (error) {
      console.error("Error loading sales:", error);
    } finally {
      setSalesLoading(false);
    }
  };

  const handleSalesDateFilter = () => {
    if (salesDateFrom && salesDateTo) {
      const from = new Date(salesDateFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(salesDateTo);
      to.setHours(23, 59, 59, 999);
      loadSalesByDateRange(from, to);
      setSalesCurrentPage(1);
    }
  };

  const calculateTotalSales = () => {
    return filteredSales.reduce((sum, transaction) => sum + (transaction.totalAmount || 0), 0);
  };

  const salesTotalPages = Math.ceil(filteredSales.length / salesItemsPerPage);
  const paginatedSales = filteredSales.slice(
    (salesCurrentPage - 1) * salesItemsPerPage,
    salesCurrentPage * salesItemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-t-2 border-b-2 border-[#1b65f6] rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Items</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalItems}</h3>
            </div>
            <div className="bg-[#1b65f6]/10 p-3 rounded-lg">
              <Package className="w-6 h-6 text-[#1b65f6]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Low Stock</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</h3>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Value</p>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
          onClick={handleTodaySalesClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Today's Sales</p>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.todaySales)}</h3>
              <p className="text-xs text-gray-500 mt-1">Click to view details</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Sales</h2>
          <div className="space-y-3">
            {recentSales.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No sales today</p>
            ) : (
              recentSales.map((transaction, index) => (
                <div key={transaction.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{transaction.transactionNumber}</p>
                    <p className="text-sm text-gray-600">{transaction.itemCount} item{transaction.itemCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(transaction.totalAmount)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Low Stock Alerts</h2>
          <div className="space-y-3">
            {lowStockAlerts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No low stock alerts</p>
            ) : (
              lowStockAlerts.map((alert, index) => (
                <div key={index} className="flex items-start p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{alert.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sales Modal */}
      {showSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-[#1b65f6] to-[#4a8af7] text-white p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Sales Report</h3>
                <p className="text-sm text-blue-100 mt-1">
                  View sales transactions by date range
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSalesModal(false);
                  // Reset to today's date when closing
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setSalesDateFrom(today);
                  setSalesDateTo(tomorrow);
                }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Date Range Filters */}
              <div className="mb-6 space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Date
                    </label>
                    <CustomDatePicker
                      value={salesDateFrom}
                      onChange={(date) => setSalesDateFrom(date)}
                      placeholder="Select start date"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Date
                    </label>
                    <CustomDatePicker
                      value={salesDateTo}
                      onChange={(date) => setSalesDateTo(date)}
                      placeholder="Select end date"
                      disableBefore={salesDateFrom}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleSalesDateFilter}
                      className="bg-[#1b65f6] text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-[#4a8af7] transition-colors"
                    >
                      <Calendar className="w-5 h-5" />
                      <span>Filter</span>
                    </button>
                  </div>
                </div>

                {/* Total Sales Summary */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Sales (Selected Period)</p>
                      <h3 className="text-2xl font-bold text-gray-900 mt-1">
                        {formatCurrency(calculateTotalSales())}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Transactions</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {filteredSales.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Table */}
              <DataTable
                loading={salesLoading}
                data={paginatedSales}
                columns={[
                  {
                    key: "transactionNumber",
                    label: "Transaction #",
                    render: (row) => (
                      <span className="text-sm text-gray-900 font-medium">
                        {row.transactionNumber || "-"}
                      </span>
                    ),
                  },
                  {
                    key: "date",
                    label: "Date",
                    render: (row) => (
                      <span className="text-sm text-gray-900">
                        {row.date ? new Date(row.date).toLocaleDateString() : "-"}
                      </span>
                    ),
                  },
                  {
                    key: "itemCount",
                    label: "Items",
                    render: (row) => (
                      <span className="text-sm text-gray-900">
                        {row.itemCount || 0} items
                      </span>
                    ),
                  },
                  {
                    key: "totalAmount",
                    label: "Total Amount",
                    render: (row) => (
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(row.totalAmount || 0)}
                      </span>
                    ),
                  },
                ]}
                currentPage={salesCurrentPage}
                totalPages={salesTotalPages}
                onPageChange={setSalesCurrentPage}
                itemsPerPage={salesItemsPerPage}
                onItemsPerPageChange={(newSize) => {
                  setSalesItemsPerPage(newSize);
                  setSalesCurrentPage(1);
                }}
                itemsPerPageOptions={[10, 25, 50, 100]}
                totalResults={filteredSales.length}
                emptyState={
                  <div className="text-center py-8">
                    <p className="text-gray-500">No sales found for the selected period</p>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

