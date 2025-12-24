import React, { useState, useEffect, useCallback } from "react";
import { Search, Plus, ArrowLeft } from "lucide-react";
import Modal from "../shared/Modal";
import CustomDatePicker from "../shared/CustomDatepicker";
import Dropdown from "../shared/Dropdown";
import ItemNameDropdown from "../shared/ItemNameDropdown";
import DataTable from "../shared/DataTable";

const Materials = () => {
  const [items, setItems] = useState([]);
  const [itemNames, setItemNames] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    vehicleNumber: "",
    itemName: "",
    quantity: "",
    rate: "",
    quality: "",
    category: "",
    useSystemDate: true,
    date: new Date(),
  });
  const [formItems, setFormItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);

  const loadInventory = useCallback(async () => {
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
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    loadInventory();
    loadItemNames();
  }, [currentPage, itemsPerPage]);

  // Auto-search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      loadInventory();
      return;
    }

    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const calculateTotal = useCallback(() => {
    const sub = formItems.reduce((sum, item) => sum + (item.total || 0), 0);
    setSubtotal(sub);
  }, [formItems]);

  useEffect(() => {
    calculateTotal();
  }, [calculateTotal]);

  const loadItemNames = async () => {
    try {
      const result = await window.electronAPI.getUniqueItemNames();
      if (result.success) {
        setItemNames(result.data || []);
      }
    } catch (error) {
      console.error("Error loading item names:", error);
    }
  };

  const showAlert = (type, title, message) => {
    setAlertModal({ isOpen: true, type, title, message });
  };

  const handleSearch = async (query = searchQuery) => {
    if (!query || !query.trim()) {
      setCurrentPage(1);
      loadInventory();
      return;
    }

    try {
      setLoading(true);
      const result = await window.electronAPI.searchItems(query);
      if (result.success) {
        const filteredItems = result.data || [];
        setTotalItems(filteredItems.length);
        setCurrentPage(1);

        // Apply pagination
        const offset = 0;
        const paginatedItems = filteredItems.slice(
          offset,
          offset + itemsPerPage
        );
        setItems(paginatedItems);
      }
    } catch (error) {
      console.error("Error searching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (
      !formData.itemName ||
      !formData.quantity ||
      !formData.rate ||
      !formData.category
    ) {
      showAlert(
        "warning",
        "Validation Error",
        "Please fill in all required fields"
      );
      return;
    }

    const itemTotal = parseFloat(formData.quantity) * parseFloat(formData.rate);
    const newItem = {
      name: formData.itemName,
      description: formData.itemName,
      quantity: parseFloat(formData.quantity),
      rate: parseFloat(formData.rate),
      unitPrice: parseFloat(formData.rate),
      total: itemTotal,
      quality: formData.quality,
      category: formData.category,
    };

    setFormItems([...formItems, newItem]);
    setFormData({
      ...formData,
      itemName: "",
      quantity: "",
      rate: "",
    });
  };

  const removeItem = (index) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.invoiceNumber) {
      showAlert("warning", "Validation Error", "Please add invoice number");
      return;
    }

    let itemsToSubmit = [];

    // If there are items in Added Items, use only those
    if (formItems.length > 0) {
      itemsToSubmit = [...formItems];
    } 
    // If no items in Added Items, but form fields are complete, allow direct save
    else if (
      formData.itemName &&
      formData.quantity &&
      formData.rate &&
      formData.category
    ) {
      const itemTotal =
        parseFloat(formData.quantity) * parseFloat(formData.rate);
      const currentItem = {
        name: formData.itemName,
        description: formData.itemName,
        quantity: parseFloat(formData.quantity),
        rate: parseFloat(formData.rate),
        unitPrice: parseFloat(formData.rate),
        total: itemTotal,
        quality: formData.quality,
        category: formData.category,
      };
      itemsToSubmit = [currentItem];
    } 
    // Otherwise, show error
    else {
      showAlert("warning", "Validation Error", "Please add at least one item to the Added Items list or fill in all required fields");
      return;
    }

    if (itemsToSubmit.length === 0) {
      showAlert("warning", "Validation Error", "Please add at least one item");
      return;
    }

    // Calculate total from all items
    const finalSubtotal = itemsToSubmit.reduce(
      (sum, item) => sum + (item.total || 0),
      0
    );

    const invoiceData = {
      invoiceNumber: formData.invoiceNumber,
      date: formData.useSystemDate
        ? new Date().toISOString()
        : formData.date.toISOString(),
      items: itemsToSubmit,
      subtotal: finalSubtotal,
      total: finalSubtotal,
      vehicleNumber: formData.vehicleNumber,
    };

    try {
      const result = await window.electronAPI.addInvoice(invoiceData);
      if (result.success) {
        showAlert("success", "Success", "Inventory added successfully!");
        // Reset form
        setFormData({
          invoiceNumber: "",
          vehicleNumber: "",
          itemName: "",
          quantity: "",
          rate: "",
          quality: "",
          category: "",
          useSystemDate: true,
          date: new Date(),
        });
        setFormItems([]);
        setShowForm(false);
        loadInventory();
        loadItemNames();
        setTimeout(() => {
          setAlertModal({
            isOpen: false,
            type: "info",
            title: "",
            message: "",
          });
        }, 1500);
      } else {
        showAlert("error", "Error", "Error adding inventory: " + result.error);
      }
    } catch (error) {
      console.error("Error adding inventory:", error);
      showAlert("error", "Error", "Error adding inventory");
    }
  };


  const handleItemNameAdd = (newName) => {
    if (newName && !itemNames.includes(newName)) {
      setItemNames([...itemNames, newName].sort());
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Show form as separate page view
  if (showForm) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-white border border-gray-200 shadow-lg rounded-xl">
          <div className="bg-gradient-to-r from-[#1b65f6] to-[#4a8af7] text-white p-6 rounded-t-xl flex items-center space-x-3">
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({
                  invoiceNumber: "",
                  vehicleNumber: "",
                  itemName: "",
                  quantity: "",
                  rate: "",
                  quality: "",
                  category: "",
                  useSystemDate: true,
                  date: new Date(),
                });
                setFormItems([]);
              }}
              className="text-white hover:text-gray-200"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold tracking-wide uppercase">
              ADD INVENTORY
            </h3>
          </div>
          
          {/* Add inventory changed to a div.. */}
          <form onSubmit={handleSubmit}  className="p-6 space-y-6">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useSystemDate"
                checked={formData.useSystemDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    useSystemDate: e.target.checked,
                  })
                }
                className="w-5 h-5"
              />
              <label
                htmlFor="useSystemDate"
                className="font-medium text-gray-700"
              >
                Use system date
              </label>
            </div>

            {!formData.useSystemDate && (
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Date: <span className="text-red-500">*</span>
                </label>
                <CustomDatePicker
                  value={formData.date}
                  onChange={(date) => setFormData({ ...formData, date })}
                  placeholder="Select Date"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Invoice No: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.invoiceNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      invoiceNumber: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b65f6]"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Vehicle No:
                </label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vehicleNumber: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b65f6]"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Item Name: <span className="text-red-500">*</span>
                </label>
                <ItemNameDropdown
                  options={itemNames}
                  value={formData.itemName}
                  onChange={(value) =>
                    setFormData({ ...formData, itemName: value })
                  }
                  onAddNew={handleItemNameAdd}
                  placeholder="Select or type item name"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Quantity: <span className="text-red-500">*</span>
                </label>
                <input
                  // type="number"
                  required
                  // min="0.1"
                  // step="0.1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b65f6]"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Rate: <span className="text-red-500">*</span>
                </label>
                <input
                  // type="number"
                  required
                  // min="0"
                  // step="1"
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData({ ...formData, rate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b65f6]"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Quality:
                </label>
                <input
                  type="text"
                  list="quality-options"
                  value={formData.quality}
                  onChange={(e) =>
                    setFormData({ ...formData, quality: e.target.value })
                  }
                  placeholder="Enter or select quality"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b65f6]"
                />
                <datalist id="quality-options">
                  <option value="Premium" />
                  <option value="Standard" />
                  <option value="Good" />
                  <option value="Fair" />
                </datalist>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Category: <span className="text-red-500">*</span>
                </label>
                <Dropdown
                  options={[
                    { value: "", label: "Select Category" },
                    { value: "Paint", label: "Paint" },
                    { value: "Lumber", label: "Lumber" },
                    { value: "Hardware", label: "Hardware" },
                    { value: "Tools", label: "Tools" },
                    { value: "Electrical", label: "Electrical" },
                    { value: "Plumbing", label: "Plumbing" },
                    { value: "Other", label: "Other" },
                  ]}
                  value={formData.category}
                  onChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                  placeholder="Select Category"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="bg-[#1b65f6] text-white px-4 py-2 rounded-lg hover:bg-[#4a8af7] transition-colors"
            >
              Add Item
            </button>

            {formItems.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="mb-2 font-semibold">
                  Added Items ({formItems.length})
                </h4>
                <div className="space-y-2 overflow-y-auto max-h-48">
                  {formItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity} × {item.rate} = UGX{" "}
                          {item.total.toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-4 mt-4 space-y-2 rounded-lg bg-gray-50">
                  <div className="flex justify-between pt-2 text-lg font-bold border-t">
                    <span>Total:</span>
                    <span>UGX {subtotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={
                  // Always require invoice number
                  !formData.invoiceNumber ||
                  // If no items in Added Items, require all form fields to be filled
                  (formItems.length === 0 &&
                    (!formData.itemName ||
                      !formData.quantity ||
                      !formData.rate ||
                      !formData.category))
                  // If items exist in Added Items, only invoice number is required (no form field check)
                }
                className="flex-1 bg-[#1b65f6] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#4a8af7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Inventory
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    invoiceNumber: "",
                    vehicleNumber: "",
                    itemName: "",
                    quantity: "",
                    rate: "",
                    quality: "",
                    category: "",
                    useSystemDate: true,
                    date: new Date(),
                  });
                  setFormItems([]);
                }}
                className="px-6 py-3 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <Modal
          isOpen={alertModal.isOpen}
          onClose={() =>
            setAlertModal({
              isOpen: false,
              type: "info",
              title: "",
              message: "",
            })
          }
          type={alertModal.type}
          title={alertModal.title}
          message={alertModal.message}
          confirmText="OK"
          showCancel={false}
        />
      </div>
    );
  }

  // Show inventory list view
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Inventory</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#1b65f6] text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-[#4a8af7] transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Inventory</span>
        </button>
      </div>

      <div className="flex space-x-4">
        <div className="flex items-center flex-1 px-4 py-2 space-x-2 bg-white border border-gray-200 rounded-lg">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search inventory items... "
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 text-gray-700 duration-500 border-gray-200 rounded-lg outline-none"
          />
        </div>
      </div>

      <DataTable
        loading={loading}
        data={items}
        columns={[
          {
            key: "name",
            label: "Item Name",
            render: (row) => (
              <span className="text-sm font-medium text-gray-900">
                {row.name}
              </span>
            ),
          },
          {
            key: "category",
            label: "Category",
            render: (row) => (
              <span className="text-sm text-gray-900">
                {row.category || "-"}
              </span>
            ),
          },
          {
            key: "stock",
            label: "Current Stock",
            render: (row) => (
              <span className="text-sm text-gray-900">{row.stock}</span>
            ),
          },
          {
            key: "price",
            label: "Current Price",
            render: (row) => (
              <span className="text-sm text-gray-900">
                UGX {row.price?.toLocaleString() || "0"}
              </span>
            ),
          },
          {
            key: "totalValue",
            label: "Total Value",
            render: (row) => (
              <span className="text-sm font-semibold text-gray-900">
                UGX {((row.stock || 0) * (row.price || 0)).toLocaleString()}
              </span>
            ),
          },
          {
            key: "quality",
            label: "Quality",
            render: (row) => (
              <span className="text-sm text-gray-900">
                {row.quality || "-"}
              </span>
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
            <p className="text-gray-500">No items found</p>
          </div>
        }
      />

      <Modal
        isOpen={alertModal.isOpen}
        onClose={() =>
          setAlertModal({
            isOpen: false,
            type: "info",
            title: "",
            message: "",
          })
        }
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        showCancel={false}
      />
    </div>
  );
};

export default Materials;
