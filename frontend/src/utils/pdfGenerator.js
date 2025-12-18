import { createTextLogo } from "./logoBase64";

export const generatePDFReport = async (
  reportType,
  reportData,
  dateRange,
  reportTypes
) => {
  if (!reportData) {
    throw new Error("No data available to export");
  }

  try {
    // Dynamically import jspdf and autotable like in ActiveTenants.jsx
    const { default: jsPDF } = await import("jspdf");
    const autoTable = await import("jspdf-autotable");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Add text-based logo to the left side
    createTextLogo(doc, 20, 20);

    // Header
    doc.setFontSize(20);
    doc.setTextColor(27, 101, 246); // Primary color #1b65f6
    doc.text("WilsonPlus", pageWidth / 2, 25, {
      align: "center",
    });

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    const reportTitle =
      reportTypes.find((r) => r.value === reportType)?.label || "Report";
    doc.text(reportTitle, pageWidth / 2, 40, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Generated on: ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      50,
      { align: "center" }
    );
    doc.text(
      `Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
      pageWidth / 2,
      57,
      { align: "center" }
    );

    let yPosition = 70;

    // Summary Section
    if (reportData.summary) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Summary", 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      Object.entries(reportData.summary).forEach(([key, value]) => {
        const label = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase());
        doc.text(`${label}: ${value}`, 25, yPosition);
        yPosition += 6;
      });
      yPosition += 10;
    }

    // Data Table
    const tableData = getTableData(reportType, reportData);
    if (tableData.headers.length > 0) {
      // Use autoTable.default like in ActiveTenants.jsx
      autoTable.default(doc, {
        head: [tableData.headers],
        body: tableData.rows,
        startY: yPosition,
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [27, 101, 246],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { left: 20, right: 20 },
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 30,
        doc.internal.pageSize.height - 10,
        { align: "right" }
      );
      doc.text(
        "WilsonPlus - Manage Inventory Now!",
        20,
        doc.internal.pageSize.height - 10
      );
    }

    return doc;
  } catch (error) {
    console.error("Error in PDF generation:", error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
};

const getTableData = (reportType, reportData) => {
  if (!reportData) return { headers: [], rows: [] };

  switch (reportType) {
    case "occupancy":
      return {
        headers: [
          "Room Number",
          "Type",
          "Capacity",
          "Status",
          "Tenant",
          "Monthly Rate",
          "Date Assigned",
          "Payment Status",
        ],
        rows: (reportData.rooms || []).map((room) => [
          room.roomNumber || "N/A",
          room.roomType || "N/A",
          room.capacity || 0,
          room.status || "N/A",
          room.tenant !== "Vacant" ? room.tenant : "Vacant",
          `UGX ${(room.monthlyRate || 0).toLocaleString()}`,
          room.dateAssigned !== "Not Assigned" &&
          room.dateAssigned !== "Unknown Date"
            ? new Date(room.dateAssigned).toLocaleDateString()
            : "Not Assigned",
          room.paymentStatus !== "N/A" ? room.paymentStatus : "N/A",
        ]),
      };

    case "revenue":
      return {
        headers: [
          "Tenant",
          "Room",
          "Total Due",
          "Status",
          "Date Assigned",
          "Monthly Rate",
        ],
        rows: (reportData.assignments || []).map((assignment) => [
          assignment.tenant || "N/A",
          assignment.room || "N/A",
          `UGX ${(assignment.totalDue || 0).toLocaleString()}`,
          assignment.status || "N/A",
          assignment.dateAssigned
            ? new Date(assignment.dateAssigned).toLocaleDateString()
            : "N/A",
          `UGX ${(assignment.monthlyRate || 0).toLocaleString()}`,
        ]),
      };

    case "tenants":
      return {
        headers: [
          "Name",
          "Phone",
          "Gender",
          "Email",
          "Emergency Contact",
          "Status",
          "National ID",
          "Created At",
        ],
        rows: (reportData.tenants || []).map((tenant) => [
          tenant.name || "N/A",
          tenant.phone || "N/A",
          tenant.gender || "N/A",
          tenant.email !== "-" ? tenant.email : "Not Provided",
          tenant.emergencyContact !== "-"
            ? tenant.emergencyContact
            : "Not Provided",
          tenant.status || "N/A",
          tenant.nationalId !== "-" ? tenant.nationalId : "Not Provided",
          tenant.createdAt
            ? new Date(tenant.createdAt).toLocaleDateString()
            : "N/A",
        ]),
      };

    case "payments":
      return {
        headers: ["Tenant", "Room", "Amount", "Method", "Date", "Notes"],
        rows: (reportData.payments || []).map((payment) => [
          payment.tenant || "N/A",
          payment.tenant_name || "N/A", // Fallback to tenant_name if tenant is not available
          `UGX ${(payment.amount || 0).toLocaleString()}`,
          payment.method || "N/A",
          payment.date ? new Date(payment.date).toLocaleDateString() : "N/A",
          payment.notes !== "-" ? payment.notes : "No Notes",
        ]),
      };

    case "rooms":
      return {
        headers: [
          "Room Number",
          "Type",
          "Capacity",
          "Monthly Rate",
          "Status",
          "Room Status",
          "Created At",
        ],
        rows: (reportData.rooms || []).map((room) => [
          room.roomNumber || "N/A",
          room.roomType || "N/A",
          room.capacity || 0,
          `UGX ${(room.monthlyRate || 0).toLocaleString()}`,
          room.status || "N/A",
          room.roomStatus || "N/A",
          room.createdAt
            ? new Date(room.createdAt).toLocaleDateString()
            : "N/A",
        ]),
      };

    default:
      return { headers: [], rows: [] };
  }
};
