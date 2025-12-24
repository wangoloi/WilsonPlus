import React, { useState, useEffect } from "react";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  X,
  Calendar,
  Coins,
  Printer,
} from "lucide-react";
import CustomDatePicker from "../shared/CustomDatepicker";
import DataTable from "../shared/DataTable";
import logoImage from "../assets/images/wilsonPlus_Logo2.png";

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
  const [salesWithProfit, setSalesWithProfit] = useState([]);
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
      // Ensure proper date range: start of day for from, end of day for to
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const fromISO = from.toISOString();

      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      const toISO = to.toISOString();

      const result = await window.electronAPI.getSalesByDateRange(
        fromISO,
        toISO
      );
      if (result.success) {
        const transactions = result.data || [];
        setFilteredSales(transactions);

        // Load profit for each transaction
        const transactionsWithProfit = await Promise.all(
          transactions.map(async (transaction) => {
            try {
              const detailsResult =
                await window.electronAPI.getSalesTransactionDetails(
                  transaction.id
                );
              if (detailsResult.success && detailsResult.data.sales) {
                const profit = detailsResult.data.sales.reduce(
                  (sum, sale) => sum + (sale.profit || 0),
                  0
                );
                return { ...transaction, profit };
              }
              return { ...transaction, profit: 0 };
            } catch (error) {
              console.error(
                `Error loading profit for transaction ${transaction.id}:`,
                error
              );
              return { ...transaction, profit: 0 };
            }
          })
        );
        setSalesWithProfit(transactionsWithProfit);
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
    return filteredSales.reduce(
      (sum, transaction) => sum + (transaction.totalAmount || 0),
      0
    );
  };

  const calculateTotalProfit = () => {
    return salesWithProfit.reduce(
      (sum, transaction) => sum + (transaction.profit || 0),
      0
    );
  };

  const handlePrintSalesReport = async () => {
    if (filteredSales.length === 0) {
      alert("No sales data to print");
      return;
    }

    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = await import("jspdf-autotable");

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Load and add logo on the left
      try {
        const img = new Image();
        img.src = logoImage;
        await new Promise((resolve) => {
          img.onload = () => {
            const logoWidth = 30;
            const logoHeight = (img.height / img.width) * logoWidth;
            doc.addImage(img, "PNG", 14, 10, logoWidth, logoHeight);
            resolve();
          };
          img.onerror = resolve;
        });
      } catch (error) {
        console.error("Error loading logo:", error);
      }

      // Header text (on the right of logo)
      doc.setFontSize(20);
      doc.setTextColor(27, 101, 246);
      doc.text("WilsonPlus", 50, 25, { align: "left" });

      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Sales Report", 50, 40, { align: "left" });

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 55, {
        align: "left",
      });

      if (salesDateFrom && salesDateTo) {
        doc.text(
          `Period: ${salesDateFrom.toLocaleDateString()} - ${salesDateTo.toLocaleDateString()}`,
          14,
          62,
          { align: "left" }
        );
      }

      // Prepare table data with profit
      const tableData = salesWithProfit.map((transaction) => [
        transaction.transactionNumber || "-",
        transaction.date
          ? new Date(transaction.date).toLocaleDateString()
          : "-",
        transaction.customerName || "-",
        transaction.itemCount || 0,
        `UGX ${(transaction.totalAmount || 0).toLocaleString()}`,
        `UGX ${(transaction.profit || 0).toLocaleString()}`,
      ]);

      // Add table
      autoTable.default(doc, {
        head: [
          [
            "Transaction #",
            "Date",
            "Customer",
            "Items",
            "Total Amount",
            "Profit",
          ],
        ],
        body: tableData,
        startY: salesDateFrom && salesDateTo ? 70 : 63,
        styles: {
          headStyles: { fillColor: [27, 101, 246] },
          fontSize: 9,
        },
        headStyles: {
          fillColor: [27, 101, 246],
          textColor: 255,
          fontStyle: "bold",
        },
      });

      // Add summary
      const totalAmount = calculateTotalSales();
      const totalProfit = calculateTotalProfit();
      const totalItems = filteredSales.reduce(
        (sum, t) => sum + (t.itemCount || 0),
        0
      );

      const finalY = doc.lastAutoTable.finalY || 63;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Transactions: ${filteredSales.length}`, 14, finalY + 15);
      doc.text(`Total Items Sold: ${totalItems}`, 14, finalY + 22);
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text(
        `Total Sales: UGX ${totalAmount.toLocaleString()}`,
        14,
        finalY + 30
      );
      doc.setFontSize(14);
      doc.setTextColor(0, 150, 0);
      doc.text(
        `Total Profit: UGX ${totalProfit.toLocaleString()}`,
        14,
        finalY + 38
      );

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        "WilsonPlus - Inventory Management System",
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );

      // Generate PDF
      const pdfDataUri = doc.output("datauristring");
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Sales Report</title></head>
            <body style="margin:0;padding:0;">
              <embed src="${pdfDataUri}" type="application/pdf" width="100%" height="100%" />
            </body>
          </html>
        `);
      } else {
        doc.save(`sales-report-${new Date().toISOString().split("T")[0]}.pdf`);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF report");
    }
  };

  const salesTotalPages = Math.ceil(filteredSales.length / salesItemsPerPage);
  const paginatedSales = salesWithProfit.slice(
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 transition-shadow bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-600">Total Items</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {stats.totalItems}
              </h3>
            </div>
            <div className="bg-[#1b65f6]/10 p-3 rounded-lg">
              <Package className="w-6 h-6 text-[#1b65f6]" />
            </div>
          </div>
        </div>

        <div className="p-6 transition-shadow bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-600">Low Stock</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {stats.lowStockItems}
              </h3>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="p-6 transition-shadow bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-600">Total Value</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalValue)}
              </h3>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Coins className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div
          className="p-6 transition-shadow bg-white border border-gray-100 shadow-sm cursor-pointer rounded-xl hover:shadow-md"
          onClick={handleTodaySalesClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-600">Today's Sales</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.todaySales)}
              </h3>
              <p className="mt-1 text-xs text-blue-500">View more details</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales and Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Recent Sales
          </h2>
          <div className="space-y-3">
            {recentSales.length === 0 ? (
              <p className="py-4 text-center text-gray-500">No sales today</p>
            ) : (
              recentSales.map((transaction, index) => (
                <div
                  key={transaction.id || index}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {transaction.transactionNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      {transaction.itemCount} item
                      {transaction.itemCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(transaction.totalAmount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Low Stock Alerts
          </h2>
          <div className="space-y-3">
            {lowStockAlerts.length === 0 ? (
              <p className="py-4 text-center text-gray-500">
                No low stock alerts
              </p>
            ) : (
              lowStockAlerts.map((alert, index) => (
                <div
                  key={index}
                  className="flex items-start p-3 border-l-4 border-yellow-400 rounded-lg bg-yellow-50"
                >
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
                <p className="mt-1 text-sm text-blue-100">
                  View sales transactions by date range
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintSalesReport}
                  className="p-2 text-white transition-colors bg-white rounded-lg bg-opacity-20 hover:bg-opacity-30"
                  title="Print Sales Report"
                >
                  <Printer className="w-5 h-5" />
                </button>
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
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {/* Date Range Filters */}
              <div className="mb-6 space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      From Date
                    </label>
                    <CustomDatePicker
                      value={salesDateFrom}
                      onChange={(date) => setSalesDateFrom(date)}
                      placeholder="Select start date"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="p-4 border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-blue-50">
                    <p className="text-sm text-gray-600">
                      Total Sales (Selected Period)
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-gray-900">
                      {formatCurrency(calculateTotalSales())}
                    </h3>
                  </div>
                  <div className="p-4 border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-blue-50">
                    <p className="text-sm text-gray-600">
                      Total Profit (Selected Period)
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-green-600">
                      {formatCurrency(calculateTotalProfit())}
                    </h3>
                  </div>
                  <div className="p-4 border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-blue-50">
                    <p className="text-sm text-gray-600">Transactions</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {filteredSales.length}
                    </p>
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
                      <span className="text-sm font-medium text-gray-900">
                        {row.transactionNumber || "-"}
                      </span>
                    ),
                  },
                  {
                    key: "date",
                    label: "Date",
                    render: (row) => (
                      <span className="text-sm text-gray-900">
                        {row.date
                          ? new Date(row.date).toLocaleDateString()
                          : "-"}
                      </span>
                    ),
                  },
                  {
                    key: "customerName",
                    label: "Customer",
                    render: (row) => (
                      <span className="text-sm text-gray-900">
                        {row.customerName || "-"}
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
                  {
                    key: "profit",
                    label: "Profit",
                    render: (row) => (
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(row.profit || 0)}
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
                  <div className="py-8 text-center">
                    <p className="text-gray-500">
                      No sales found for the selected period
                    </p>
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
