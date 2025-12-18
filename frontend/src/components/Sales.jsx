import React, { useState, useEffect } from "react";
import { Plus, Filter, Eye, X, Printer, Trash2 } from "lucide-react";
import SaleModal from "./SaleModal";
import CustomDatePicker from "../shared/CustomDatepicker";
import Modal from "../shared/Modal";
import DataTable from "../shared/DataTable";

const Sales = () => {
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
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

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.getAllSalesTransactions();
      if (result.success) {
        const all = result.data || [];
        setAllTransactions(all);
        setTotalItems(all.length);

        // Apply pagination
        const offset = (currentPage - 1) * itemsPerPage;
        const paginatedTransactions = all.slice(offset, offset + itemsPerPage);
        setTransactions(paginatedTransactions);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
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

      // Prepare table data
      const tableData = allTransactions.map((transaction) => [
        transaction.transactionNumber || "-",
        transaction.date
          ? new Date(transaction.date).toLocaleDateString()
          : "-",
        transaction.itemCount || 0,
        `UGX ${(transaction.totalAmount || 0).toLocaleString()}`,
      ]);

      // Add table
      autoTable.default(doc, {
        head: [["Transaction #", "Date", "Items", "Total Amount"]],
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

      // Add summary
      const totalAmount = allTransactions.reduce(
        (sum, t) => sum + (t.totalAmount || 0),
        0
      );
      const totalItems = allTransactions.reduce(
        (sum, t) => sum + (t.itemCount || 0),
        0
      );

      const finalY = doc.lastAutoTable.finalY || 60;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Total Transactions: ${allTransactions.length}`,
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
