import React, { useState, useEffect, useCallback } from "react";
import { Eye, Trash2, X, Filter, Printer, Search } from "lucide-react";
import Modal from "../shared/Modal";
import DataTable from "../shared/DataTable";
import CustomDatePicker from "../shared/CustomDatepicker";

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    invoiceId: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [originalInvoices, setOriginalInvoices] = useState([]);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.getAllInvoices();
      if (result.success) {
        const all = result.data || [];
        setOriginalInvoices(all);
        setAllInvoices(all);
        setTotalItems(all.length);

        // Apply pagination
        const offset = (currentPage - 1) * itemsPerPage;
        const paginatedInvoices = all.slice(offset, offset + itemsPerPage);
        setInvoices(paginatedInvoices);
      }
    } catch (error) {
      console.error("Error loading invoices:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const applyFilters = useCallback(() => {
    let filtered = [...originalInvoices];

    // Apply date filter
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter((invoice) => {
        const invoiceDate = new Date(invoice.date);
        return invoiceDate >= fromDate && invoiceDate <= toDate;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((invoice) => {
        const invoiceNumber = (invoice.invoiceNumber || "").toLowerCase();
        return invoiceNumber.includes(query);
      });
    }

    setAllInvoices(filtered);
    setTotalItems(filtered.length);
    setCurrentPage(1);

    // Apply pagination
    const offset = 0;
    const paginatedInvoices = filtered.slice(offset, offset + itemsPerPage);
    setInvoices(paginatedInvoices);
  }, [originalInvoices, dateFrom, dateTo, searchQuery, itemsPerPage]);

  const handleFilter = () => {
    applyFilters();
  };

  // Auto-search when search query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      applyFilters();
    }, 300); // Debounce for 300ms

    return () => clearTimeout(timeoutId);
  }, [searchQuery, applyFilters]);

  const handleDeleteClick = (id) => {
    setConfirmModal({ isOpen: true, invoiceId: id });
  };

  const handleDeleteConfirm = async () => {
    if (confirmModal.invoiceId) {
      try {
        const result = await window.electronAPI.deleteInvoice(
          confirmModal.invoiceId
        );
        if (result.success) {
          loadInvoices();
        }
      } catch (error) {
        console.error("Error deleting invoice:", error);
      }
    }
    setConfirmModal({ isOpen: false, invoiceId: null });
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
      doc.text("Purchase Invoices Report", pageWidth / 2, 35, {
        align: "center",
      });

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
      const tableData = allInvoices.map((invoice) => [
        invoice.invoiceNumber || "-",
        invoice.date ? new Date(invoice.date).toLocaleDateString() : "-",
        invoice.items?.length || 0,
        `UGX ${(invoice.total || 0).toLocaleString()}`,
      ]);

      // Add table
      autoTable.default(doc, {
        head: [["Invoice #", "Date", "Items", "Total Amount"]],
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
      const totalAmount = allInvoices.reduce(
        (sum, inv) => sum + (inv.total || 0),
        0
      );
      const totalItems = allInvoices.reduce(
        (sum, inv) => sum + (inv.items?.length || 0),
        0
      );

      const finalY = doc.lastAutoTable.finalY || 60;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Invoices: ${allInvoices.length}`, 14, finalY + 15);
      doc.text(`Total Items: ${totalItems}`, 14, finalY + 22);
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
            <head><title>Purchase Invoices Report</title></head>
            <body style="margin:0;padding:0;">
              <embed src="${pdfDataUri}" type="application/pdf" width="100%" height="100%" />
            </body>
          </html>
        `);
      } else {
        // Fallback: download if popup blocked
        doc.save(
          `invoices-report-${new Date().toISOString().split("T")[0]}.pdf`
        );
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF report");
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Purchase Invoices</h2>
        <p className="mt-1 text-sm text-gray-600">
          Invoices from suppliers for inventory purchases
        </p>
      </div>

      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
          <input
            type="text"
            placeholder="Search by invoice number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b65f6] focus:border-[#1b65f6] outline-none"
          />
        </div>

        {/* Date Filters */}
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
          <div className="flex items-end space-x-2">
            <button
              onClick={handleFilter}
              className="flex items-center px-4 py-2 space-x-2 text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <Filter className="w-5 h-5" />
              <span>Filter</span>
            </button>
            {(dateFrom || dateTo || allInvoices.length > 0) && (
              <button
                onClick={handlePrint}
                className="flex items-center px-4 py-2 space-x-2 text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Printer className="w-5 h-5" />
                <span>Print</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <DataTable
        loading={loading}
        data={invoices}
        columns={[
          {
            key: "invoiceNumber",
            label: "Invoice No",
            render: (row) => (
              <span className="text-sm text-gray-900">{row.invoiceNumber}</span>
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
            key: "items",
            label: "Items",
            render: (row) => (
              <span className="text-sm text-gray-900">
                {row.items?.length || 0} items
              </span>
            ),
          },
          {
            key: "total",
            label: "Total",
            render: (row) => (
              <span className="text-sm font-semibold text-gray-900">
                UGX {row.total?.toLocaleString() || "0"}
              </span>
            ),
          },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    const result = await window.electronAPI.getInvoice(row.id);
                    if (result.success) {
                      setSelectedInvoice(result.data);
                    } else {
                      setSelectedInvoice(row);
                    }
                  }}
                  className="text-[#1b65f6] hover:text-[#4a8af7]"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {/* <button
                  onClick={() => handleDeleteClick(row.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button> */}
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
          <div className="py-8 text-center">
            <p className="text-gray-500">No invoices found</p>
          </div>
        }
      />

      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#1b65f6] to-[#4a8af7] text-white p-6 rounded-t-xl flex items-center justify-between">
              <h3 className="text-xl font-bold">Invoice Details</h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-semibold">
                    {selectedInvoice.invoiceNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-semibold">
                    {selectedInvoice.date
                      ? new Date(selectedInvoice.date).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
              </div>
              {selectedInvoice.batches &&
                selectedInvoice.batches.length > 0 &&
                selectedInvoice.batches[0]?.vehicleNumber && (
                  <div>
                    <p className="mb-1 text-sm text-gray-600">Vehicle Number</p>
                    <p className="text-lg font-semibold">
                      {selectedInvoice.batches[0].vehicleNumber}
                    </p>
                  </div>
                )}
              <div>
                <p className="mb-2 text-sm text-gray-600">Items</p>
                <div className="space-y-2">
                  {selectedInvoice.items?.map((item, index) => (
                    <div key={index} className="p-3 rounded-lg bg-gray-50">
                      <p className="font-medium">
                        {item.name || item.description}
                      </p>
                      <p className="text-sm text-gray-600">
                        Qty: {item.quantity} × {item.rate || item.unitPrice} =
                        UGX {item.total?.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 space-y-2 border-t">
                <div className="flex justify-between pt-2 text-lg font-bold">
                  <span>Total:</span>
                  <span>UGX {selectedInvoice.total?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, invoiceId: null })}
        onConfirm={handleDeleteConfirm}
        type="confirm"
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default Invoices;
