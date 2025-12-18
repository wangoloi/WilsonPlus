import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SearchX,
} from "lucide-react";
import Dropdown from "./Dropdown";

const DataTable = ({
  loading = false,
  data = [],
  selectedRows = [],
  onSelectAll = () => {},
  onSelectRow = () => {},
  onRowClick = () => {},
  onRowDoubleClick = () => {},
  columns = [], // [{ key, label, render?: (row) => ReactNode, width?: string }]
  visibleColumns = [], // Default to empty array, will be handled below
  sortConfig = {},
  onSort = () => {},
  getSortIcon = () => null,
  currentPage = 1,
  totalPages = 1,
  onPageChange = () => {},
  itemsPerPage = 10,
  onItemsPerPageChange = () => {},
  itemsPerPageOptions = [10, 20, 50],
  totalResults = 0,
  emptyState = null,
}) => {
  // If visibleColumns is empty, show all columns by default
  const effectiveVisibleColumns =
    visibleColumns.length > 0 ? visibleColumns : columns.map((col) => col.key);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Horizontal scrolling container */}
      <div className="w-full overflow-x-auto">
        {/* Table with fixed layout and minimum width */}
        <table className="w-full min-w-max">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {/* Regular columns */}
              {columns
                .filter((col) => effectiveVisibleColumns.includes(col.key))
                .map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap ${
                      col.width || "min-w-[100px]"
                    }`}
                    onClick={() => onSort(col.key)}
                    style={{ width: col.width || "auto" }}
                  >
                    <div className="flex items-center">
                      {col.label}
                      {getSortIcon(col.key)}
                    </div>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td
                  colSpan={effectiveVisibleColumns.length}
                  className="px-4 py-8 text-center"
                >
                  <div className="flex items-center justify-center h-32">
                    <div className="flex flex-col items-center gap-2 bg-white bg-opacity-75 p-4 rounded-lg">
                      <div className="w-12 h-12 border-[1.5px] border-[#1b65f6] border-y-0 rounded-full animate-spin"></div>
                    </div>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={effectiveVisibleColumns.length}
                  className="px-4 py-8 text-center"
                >
                  {emptyState || (
                    <div className="text-center py-8">
                      <div className="flex w-full justify-center text-4xl mb-3 text-[#1b65f6]">
                        <div
                          className="
                            flex items-center justify-center h-14 w-14 rounded-full
                            bg-gradient-to-br from-blue-100 to-blue-200
                          "
                        >
                          <span role="img" aria-label="No data">
                            <SearchX />
                          </span>
                        </div>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        No data found
                      </h3>
                      <p className="text-xs text-gray-500">
                        Try adjusting your search or filter criteria
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                // Generate a unique key for each row
                let rowKey;

                // Try to use the most unique identifier first
                if (row.payment_id) {
                  // This is a payment row - use payment_id as it's unique
                  rowKey = `payment_${row.payment_id}`;
                } else if (row.assignment_id) {
                  // This is an assignment row - use assignment_id as it's unique
                  rowKey = `assignment_${row.assignment_id}`;
                } else if (row.id) {
                  // Generic id field
                  rowKey = `id_${row.id}`;
                } else if (row.tenant_id) {
                  // Tenant id
                  rowKey = `tenant_${row.tenant_id}`;
                } else if (row.room_id) {
                  // Room id
                  rowKey = `room_${row.room_id}`;
                } else {
                  // Last resort: use index with a more descriptive prefix
                  rowKey = `row_${index}`;
                }

                // Add index to ensure uniqueness even if IDs are duplicated
                rowKey = `${rowKey}_${index}`;

                return (
                  <tr
                    key={rowKey}
                    className={`transition-colors duration-300 ${
                      onRowClick ? "cursor-pointer" : ""
                    } ${
                      selectedRows.includes(row.id)
                        ? "bg-[#1b65f60d] hover:bg-[#1b65f625]"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={onRowClick ? () => onRowClick(row.id) : undefined}
                    onDoubleClick={
                      onRowDoubleClick
                        ? () => onRowDoubleClick(row.id)
                        : undefined
                    }
                  >
                    {/* Regular columns */}
                    {columns
                      .filter((col) =>
                        effectiveVisibleColumns.includes(col.key)
                      )
                      .map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 whitespace-nowrap ${
                            col.width || "min-w-[100px]"
                          }`}
                          style={{ width: col.width || "auto" }}
                        >
                          {col.render
                            ? col.render(row) // Pass entire row object, not just value
                            : row[col.key]}
                        </td>
                      ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="grid grid-cols-2 sm:grid-cols-3 justify-between items-center mt-4 gap-2 md:gap-0 px-4 pb-4">
        <div className="flex items-center gap-2 mb-2 md:mb-0">
          <span className="text-xs text-gray-700">Rows per page:</span>
          <Dropdown
            options={itemsPerPageOptions.map((v) => ({ label: v, value: v }))}
            value={itemsPerPage}
            onChange={onItemsPerPageChange}
            width="80px"
            className="w-[80px]"
          />
        </div>
        <div className="text-xs text-gray-700 mb-2 md:mb-0 flex justify-center">
          {totalResults === 0 ? (
            "Showing 0 of 0 results"
          ) : (
            <>
              Showing{" "}
              {data.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalResults)} of&nbsp;
              <span className="font-bold"> {totalResults}</span>&nbsp; results
            </>
          )}
        </div>
        <div className="flex justify-center md:justify-end items-center gap-2 col-span-2 sm:col-span-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1 border border-[#1b65f6] rounded-lg bg-white 
            disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 
            text-[#1b65f6]"
          >
            <ChevronsLeft size={16} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1 border border-[#1b65f6] rounded-lg bg-white 
            disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 
            text-[#1b65f6]"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          {[...Array(Math.min(totalPages, 5))].map((_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5 && currentPage > 3) {
              if (currentPage + 2 > totalPages) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
            }
            if (pageNum < 1 || pageNum > totalPages) return null;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-[26px] h-[26px] rounded-lg text-sm border transition-all duration-300 ${
                  currentPage === pageNum
                    ? "bg-[#1b65f6] text-white border-[#1b65f6]"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          {totalPages > 5 && currentPage + 2 < totalPages && (
            <span className="px-3 py-1 text-gray-500">...</span>
          )}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1 border border-[#1b65f6] rounded-lg bg-white 
            disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 
            text-[#1b65f6]"
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1 border border-[#1b65f6] rounded-lg bg-white 
            disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 
            text-[#1b65f6]"
          >
            <ChevronsRight size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
