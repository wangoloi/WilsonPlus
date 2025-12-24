import React, { useState, useEffect } from "react";
import { Plus, Filter, Eye, X, Printer, Trash2, Search } from "lucide-react";
import SaleModal from "./SaleModal";
import CustomDatePicker from "../shared/CustomDatepicker";
import Modal from "../shared/Modal";
import DataTable from "../shared/DataTable";

const Sales = () => {
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]); // For search results
  const [loading, setLoading] = useState(true);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, transactionId: null });

  useEffect(() => {
    loadTransactions();
  }, [currentPage, itemsPerPage]);

  // Handle pagination for filtered transactions
  useEffect(() => {
    if (filteredTransactions.length > 0 || allTransactions.length > 0) {
      const source = filteredTransactions.length > 0 ? filteredTransactions : allTransactions;
      const offset = (currentPage - 1) * itemsPerPage;
      const paginatedTransactions = source.slice(offset, offset + itemsPerPage);
      setTransactions(paginatedTransactions);
    }
  }, [currentPage, itemsPerPage, filteredTransactions, allTransactions]);

  // Auto-search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      loadTransactions();
      return;
    }

    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.getAllSalesTransactions();
      if (result.success) {
        const all = result.data || [];
        setAllTransactions(all);
        setFilteredTransactions(all);
        
        // Apply search if there's a query
        if (searchQuery.trim()) {
          handleSearch(searchQuery);
        } else {
          setTotalItems(all.length);
          // Apply pagination
          const offset = (currentPage - 1) * itemsPerPage;
          const paginatedTransactions = all.slice(offset, offset + itemsPerPage);
          setTransactions(paginatedTransactions);
        }
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query = searchQuery) => {
    if (!query || !query.trim()) {
      // Reload all transactions
      const offset = (currentPage - 1) * itemsPerPage;
      const paginatedTransactions = allTransactions.slice(offset, offset + itemsPerPage);
      setTransactions(paginatedTransactions);
      setTotalItems(allTransactions.length);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const filtered = allTransactions.filter((transaction) => {
      const transactionNumber = (transaction.transactionNumber || "").toLowerCase();
      const customerName = (transaction.customerName || "").toLowerCase();
      return transactionNumber.includes(searchTerm) || customerName.includes(searchTerm);
    });

    setTotalItems(filtered.length);
    setCurrentPage(1);

    // Apply pagination
    const offset = 0;
    const paginatedTransactions = filtered.slice(offset, offset + itemsPerPage);
    setTransactions(paginatedTransactions);
  };

  const handleFilter = async () => {
    if (!dateFrom || !dateTo) {
      loadTransactions();
      return;
    }

    try {
      // Set time to start of day for from date and end of day for to date
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      const fromISO = fromDate.toISOString();

      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      const toISO = toDate.toISOString();

      const result = await window.electronAPI.getSalesByDateRange(
        fromISO,
        toISO
      );
      if (result.success) {
        const filteredTransactions = result.data || [];
        setAllTransactions(filteredTransactions);
        
        // Apply search if there's a search query
        if (searchQuery.trim()) {
          const searchTerm = searchQuery.toLowerCase().trim();
          const searchFiltered = filteredTransactions.filter((transaction) => {
            const transactionNumber = (transaction.transactionNumber || "").toLowerCase();
            const customerName = (transaction.customerName || "").toLowerCase();
            return transactionNumber.includes(searchTerm) || customerName.includes(searchTerm);
          });
          setFilteredTransactions(searchFiltered);
          setTotalItems(searchFiltered.length);
          setCurrentPage(1);
          const offset = 0;
          const paginatedTransactions = searchFiltered.slice(offset, offset + itemsPerPage);
          setTransactions(paginatedTransactions);
        } else {
          setFilteredTransactions(filteredTransactions);
          setTotalItems(filteredTransactions.length);
          setCurrentPage(1);
          // Apply pagination
          const offset = 0;
          const paginatedTransactions = filteredTransactions.slice(
            offset,
            offset + itemsPerPage
          );
          setTransactions(paginatedTransactions);
        }
      }
    } catch (error) {
      console.error("Error filtering sales:", error);
    }
  };

  const handleViewDetails = async (transactionId) => {
    try {
      setLoadingDetails(true);
      const result = await window.electronAPI.getSalesTransactionDetails(
        transactionId
      );
      if (result.success) {
        setTransactionDetails(result.data);
        setSelectedTransaction(transactionId);
      }
    } catch (error) {
      console.error("Error loading transaction details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDeleteClick = (transactionId) => {
    setConfirmDelete({ isOpen: true, transactionId });
  };

  const handleDeleteConfirm = async () => {
    if (confirmDelete.transactionId) {
      try {
        const result = await window.electronAPI.deleteSalesTransaction(
          confirmDelete.transactionId
        );
        if (result.success) {
          // Reload transactions
          loadTransactions();
          // Close modals
          setConfirmDelete({ isOpen: false, transactionId: null });
          setSelectedTransaction(null);
          setTransactionDetails(null);
        } else {
          alert(result.error || "Failed to delete transaction");
        }
      } catch (error) {
        console.error("Error deleting transaction:", error);
        alert("Error deleting transaction");
      }
    }
  };

  const handlePrintTransactionDetails = async () => {
    if (!transactionDetails) return;

    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = await import("jspdf-autotable");

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(27, 101, 246);
      doc.text("WilsonPlus", pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Sale Transaction Details", pageWidth / 2, 35, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Transaction #: ${transactionDetails.transaction.transactionNumber}`,
        14,
        50
      );
      doc.text(
        `Date: ${transactionDetails.transaction.date ? new Date(transactionDetails.transaction.date).toLocaleDateString() : "-"}`,
        14,
        57
      );
      if (transactionDetails.transaction.customerName) {
        doc.text(
          `Customer: ${transactionDetails.transaction.customerName}`,
          14,
          64
        );
      }

      // Prepare table data
      const tableData = transactionDetails.sales.map((sale) => [
        sale.itemName || "-",
        sale.quantity || 0,
        `UGX ${(sale.unitPrice || 0).toLocaleString()}`,
        `UGX ${(sale.total || 0).toLocaleString()}`,
        `UGX ${(sale.profit || 0).toLocaleString()}`,
      ]);

      // Add table
      autoTable.default(doc, {
        head: [["Item Name", "Quantity", "Unit Price", "Total", "Profit"]],
        body: tableData,
        startY: transactionDetails.transaction.customerName ? 72 : 65,
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

      // Add totals
      const totalAmount = transactionDetails.transaction.totalAmount || 0;
      const totalProfit = transactionDetails.sales.reduce(
        (sum, sale) => sum + (sale.profit || 0),
        0
      );

      const finalY = doc.lastAutoTable.finalY || 65;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Grand Total: UGX ${totalAmount.toLocaleString()}`, 14, finalY + 15);
      doc.setFontSize(12);
      doc.setTextColor(0, 150, 0);
      doc.text(`Total Profit: UGX ${totalProfit.toLocaleString()}`, 14, finalY + 22);

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
            <head><title>Transaction Details</title></head>
            <body style="margin:0;padding:0;">
              <embed src="${pdfDataUri}" type="application/pdf" width="100%" height="100%" />
            </body>
          </html>
        `);
      } else {
        doc.save(`transaction-${transactionDetails.transaction.transactionNumber}-${new Date().toISOString().split("T")[0]}.pdf`);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF");
    }
  };

  const handlePrint = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = await import("jspdf-autotable");

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(27, 101, 246); // Primary color #1b65f6
      doc.text("WilsonPlus", pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Sales Report", pageWidth / 2, 35, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Generated on: ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        45,
        { align: "center" }
      );

      if (dateFrom && dateTo) {
        doc.text(
          `Period: ${dateFrom.toLocaleDateString()} - ${dateTo.toLocaleDateString()}`,
          pageWidth / 2,
          52,
          { align: "center" }
        );
      }

      // Use filtered transactions for PDF (or allTransactions if no filter/search)
      const transactionsForPDF = filteredTransactions.length > 0 ? filteredTransactions : allTransactions;
      
      // Prepare table data
      const tableData = transactionsForPDF.map((transaction) => [
        transaction.transactionNumber || "-",
        transaction.date
          ? new Date(transaction.date).toLocaleDateString()
          : "-",
        transaction.customerName || "-",
        transaction.itemCount || 0,
        `UGX ${(transaction.totalAmount || 0).toLocaleString()}`,
      ]);

      // Add table
      autoTable.default(doc, {
        head: [["Transaction #", "Date", "Customer", "Items", "Total Amount"]],
        body: tableData,
        startY: 60,
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

      // Calculate total profit - need to get all sales with batch info
      let totalProfit = 0;
      try {
        for (const transaction of transactionsForPDF) {
          const detailsResult = await window.electronAPI.getSalesTransactionDetails(transaction.id);
          if (detailsResult.success && detailsResult.data.sales) {
            const transactionProfit = detailsResult.data.sales.reduce(
              (sum, sale) => sum + (sale.profit || 0),
              0
            );
            totalProfit += transactionProfit;
          }
        }
      } catch (error) {
        console.error("Error calculating profit:", error);
      }

      // Add summary
      const totalAmount = transactionsForPDF.reduce(
        (sum, t) => sum + (t.totalAmount || 0),
        0
      );
      const totalItems = transactionsForPDF.reduce(
        (sum, t) => sum + (t.itemCount || 0),
        0
      );

      const finalY = doc.lastAutoTable.finalY || 60;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Total Transactions: ${transactionsForPDF.length}`,
        14,
        finalY + 15
      );
      doc.text(`Total Items Sold: ${totalItems}`, 14, finalY + 22);
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text(
        `Grand Total: UGX ${totalAmount.toLocaleString()}`,
        14,
        finalY + 30
      );
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

      // Generate PDF as data URL and open in new window
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
        // Fallback: download if popup blocked
        doc.save(`sales-report-${new Date().toISOString().split("T")[0]}.pdf`);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF report");
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Sales Management</h2>
        <div className="flex items-center space-x-2">
          {(dateFrom || dateTo || allTransactions.length > 0) && (
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 space-x-2 text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <Printer className="w-5 h-5" />
              <span>Print</span>
            </button>
          )}
          <button
            onClick={() => setShowSaleModal(true)}
            className="bg-[#1b65f6] text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-[#4a8af7] transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>New Sale</span>
          </button>
        </div>
      </div>

      <div className="flex space-x-4">
        <div className="flex items-center flex-1 px-4 py-2 space-x-2 bg-white border border-gray-200 rounded-lg">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by transaction number or customer name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 text-gray-700 duration-500 border-gray-200 rounded-lg outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="block mb-1 text-sm font-medium text-gray-700">
            From Date
          </label>
          <CustomDatePicker
            value={dateFrom}
            onChange={(date) => setDateFrom(date)}
            placeholder="Select start date"
          />
        </div>
        <div className="flex-1">
          <label className="block mb-1 text-sm font-medium text-gray-700">
            To Date
          </label>
          <CustomDatePicker
            value={dateTo}
            onChange={(date) => setDateTo(date)}
            placeholder="Select end date"
            disableBefore={dateFrom}
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleFilter}
            className="flex items-center px-4 py-2 space-x-2 text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Filter className="w-5 h-5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      <DataTable
        loading={loading}
        data={transactions}
        columns={[
          {
            key: "transactionNumber",
            label: "Transaction #",
            render: (row) => (
              <span className="text-sm font-medium text-gray-900">
                {row.transactionNumber}
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
                {row.itemCount} item{row.itemCount !== 1 ? "s" : ""}
              </span>
            ),
          },
          {
            key: "totalAmount",
            label: "Total Amount",
            render: (row) => (
              <span className="text-sm font-semibold text-gray-900">
                UGX {row.totalAmount?.toLocaleString() || "0"}
              </span>
            ),
          },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleViewDetails(row.id)}
                  className="text-[#1b65f6] hover:text-[#4a8af7]"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(row.id)}
                  className="text-red-600 hover:text-red-700"
                  title="Delete Transaction"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={(newSize) => {
          setItemsPerPage(newSize);
          setCurrentPage(1);
        }}
        itemsPerPageOptions={[10, 25, 50, 100]}
        totalResults={totalItems}
        emptyState={
          <div className="text-center py-8">
            <p className="text-gray-500">No sales found</p>
          </div>
        }
      />

      {/* Transaction Details Modal */}
      {selectedTransaction && transactionDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#1b65f6] to-[#4a8af7] text-white p-6 rounded-t-xl flex items-center justify-between">
              <h3 className="text-xl font-bold">Sale Transaction Details</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintTransactionDetails}
                  className="p-2 text-white transition-colors bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30"
                  title="Print Transaction"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setSelectedTransaction(null);
                    setTransactionDetails(null);
                  }}
                  className="text-white hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {loadingDetails ? (
                <div className="py-8 text-center">
                  <div className="inline-block w-8 h-8 border-t-2 border-b-2 border-[#1b65f6] rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">
                        Transaction Number
                      </p>
                      <p className="text-lg font-semibold">
                        {transactionDetails.transaction.transactionNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-semibold">
                        {transactionDetails.transaction.date
                          ? new Date(
                              transactionDetails.transaction.date
                            ).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Customer Name</p>
                      <p className="font-semibold">
                        {transactionDetails.transaction.customerName || "-"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-3 font-semibold text-gray-900">
                      Items Sold
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">
                              Item Name
                            </th>
                            <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">
                              Quantity
                            </th>
                            <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">
                              Unit Price
                            </th>
                            <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">
                              Total
                            </th>
                            <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">
                              Profit
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {transactionDetails.sales.map((sale, index) => (
                            <tr
                              key={sale.id || index}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {sale.itemName}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {sale.quantity}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                UGX {sale.unitPrice?.toLocaleString() || "0"}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                UGX {sale.total?.toLocaleString() || "0"}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-green-600">
                                UGX {(sale.profit || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td
                              colSpan="3"
                              className="px-4 py-3 text-sm font-semibold text-right text-gray-900"
                            >
                              Grand Total:
                            </td>
                            <td className="px-4 py-3 text-lg font-bold text-[#1b65f6]">
                              UGX{" "}
                              {transactionDetails.transaction.totalAmount?.toLocaleString() ||
                                "0"}
                            </td>
                            <td className="px-4 py-3 text-lg font-bold text-green-600">
                              UGX{" "}
                              {transactionDetails.sales.reduce(
                                (sum, sale) => sum + (sale.profit || 0),
                                0
                              ).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showSaleModal && (
        <SaleModal
          onClose={() => {
            setShowSaleModal(false);
            loadTransactions();
          }}
        />
      )}

      <Modal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, transactionId: null })}
        onConfirm={handleDeleteConfirm}
        type="confirm"
        title="Delete Sales Transaction"
        message="Are you sure you want to delete this sales transaction? This will restore inventory stock and cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default Sales;
