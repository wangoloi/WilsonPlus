import React, { useState, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import Pagination from "../shared/Pagination";

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    loadInventory();
  }, [currentPage, itemsPerPage]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.getAllItems();
      if (result.success) {
        const allItems = result.data || [];
        setTotalItems(allItems.length);
        
        // Apply pagination
        const offset = (currentPage - 1) * itemsPerPage;
        const paginatedItems = allItems.slice(offset, offset + itemsPerPage);
        setItems(paginatedItems);
      }
    } catch (error) {
      console.error("Error loading inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadInventory();
      return;
    }

    try {
      setLoading(true);
      const result = await window.electronAPI.searchItems(searchQuery);
      if (result.success) {
        const filteredItems = result.data || [];
        setTotalItems(filteredItems.length);
        
        // Apply pagination
        const offset = (currentPage - 1) * itemsPerPage;
        const paginatedItems = filteredItems.slice(offset, offset + itemsPerPage);
        setItems(paginatedItems);
      }
    } catch (error) {
      console.error("Error searching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Inventory</h2>
      </div>

      <div className="flex space-x-4">
        <div className="flex items-center flex-1 px-4 py-2 space-x-2 bg-white border border-gray-200 rounded-lg">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search inventory items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 text-gray-700 border-gray-200 rounded-lg outline-none border-1"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block w-8 h-8 border-t-2 border-b-2 border-[#1b65f6] rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Current Price
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Total Value
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Quality
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No items found
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {item.category || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {item.stock}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        UGX {item.price?.toLocaleString() || "0"}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                        UGX {((item.stock || 0) * (item.price || 0)).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {item.quality || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
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
    </div>
  );
};

export default Inventory;

