import React, { useState, useEffect } from "react";
import { X, Plus, Edit2, Trash2 } from "lucide-react";
import Dropdown from "../shared/Dropdown";
import Modal from "../shared/Modal";
import CustomDatePicker from "../shared/CustomDatepicker";
import CustomerDropdown from "../shared/CustomerDropdown";

const SaleModal = ({ onClose }) => {
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [availableBatches, setAvailableBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [quantity, setQuantity] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [saleItems, setSaleItems] = useState([]); // Cart of items to sell
  const [editingIndex, setEditingIndex] = useState(null);
  const [transactionNumber, setTransactionNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerNames, setCustomerNames] = useState([]);
  const [saleDate, setSaleDate] = useState(new Date());
  const [useSystemDate, setUseSystemDate] = useState(true);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });
  const [priceWarningModal, setPriceWarningModal] = useState({
    isOpen: false,
    buyingPrice: 0,
    sellingPrice: 0,
    itemName: "",
    onConfirm: null,
  });

  useEffect(() => {
    loadItems();
    loadCustomerNames();
  }, []);

  const loadCustomerNames = async () => {
    try {
      const result = await window.electronAPI.getAllCustomers();
      if (result.success) {
        setCustomerNames(result.data || []);
      }
    } catch (error) {
      console.error("Error loading customer names:", error);
    }
  };

  const handleCustomerAdd = async (newCustomer) => {
    if (newCustomer && !customerNames.includes(newCustomer)) {
      try {
        const result = await window.electronAPI.addCustomer(newCustomer);
        if (result.success) {
          setCustomerNames([...customerNames, newCustomer].sort());
        }
      } catch (error) {
        console.error("Error adding customer:", error);
      }
    }
  };

  useEffect(() => {
    if (selectedItemId) {
      loadBatches();
    } else {
      setAvailableBatches([]);
      setSelectedBatch("");
    }
  }, [selectedItemId]);

  useEffect(() => {
    if (selectedBatch && quantity && sellingPrice) {
      // Auto-update selling price if batch is selected and price is empty
      const batch = availableBatches.find(
        (b) => b.id === parseInt(selectedBatch)
      );
      if (batch && !sellingPrice) {
        setSellingPrice(batch.rate.toString());
      }
    }
  }, [selectedBatch, availableBatches]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.getAllItems();
      if (result.success) {
        setItems(result.data.filter((item) => item.stock > 0));
      }
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    if (!selectedItemId) return;
    try {
      setLoadingBatches(true);
      const result = await window.electronAPI.getAvailableBatches(
        parseInt(selectedItemId)
      );
      if (result.success) {
        setAvailableBatches(result.data || []);
      }
    } catch (error) {
      console.error("Error loading batches:", error);
    } finally {
      setLoadingBatches(false);
    }
  };

  // Calculate how much quantity is already in cart for each batch
  const getQuantityInCartForBatch = (batchId) => {
    return saleItems
      .filter((item) => item.batchId === batchId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // Calculate adjusted available quantity (original - quantity in cart)
  const getAdjustedAvailableQuantity = (batch) => {
    const quantityInCart = getQuantityInCartForBatch(batch.id);
    // If editing, exclude the current item being edited
    if (
      editingIndex !== null &&
      saleItems[editingIndex]?.batchId === batch.id
    ) {
      const currentItemQuantity = saleItems[editingIndex].quantity;
      return batch.availableQuantity - quantityInCart + currentItemQuantity;
    }
    return batch.availableQuantity - quantityInCart;
  };

  const selectedItemData = items.find(
    (item) => item.id === parseInt(selectedItemId)
  );
  const selectedBatchData = availableBatches.find(
    (batch) => batch.id === parseInt(selectedBatch)
  );

  // Get adjusted available quantity for selected batch
  const selectedBatchAdjustedAvailable = selectedBatchData
    ? getAdjustedAvailableQuantity(selectedBatchData)
    : 0;

  const showAlert = (type, title, message) => {
    setAlertModal({ isOpen: true, type, title, message });
  };

  const addItemToCart = () => {
    if (!selectedItemId || !selectedBatch || !quantity || !sellingPrice) {
      showAlert(
        "warning",
        "Validation Error",
        "Please fill in all required fields"
      );
      return;
    }

    if (!selectedBatchData) {
      showAlert("error", "Error", "Selected batch not found");
      return;
    }

    // Calculate adjusted available quantity (accounting for items already in cart)
    const quantityInCart = getQuantityInCartForBatch(selectedBatchData.id);
    let adjustedAvailable =
      selectedBatchData.availableQuantity - quantityInCart;

    // If editing, exclude the current item being edited from the calculation
    if (
      editingIndex !== null &&
      saleItems[editingIndex]?.batchId === selectedBatchData.id
    ) {
      adjustedAvailable += saleItems[editingIndex].quantity;
    }

    if (parseFloat(quantity) > adjustedAvailable) {
      showAlert(
        "error",
        "Insufficient Stock",
        `The requested quantity exceeds available stock in this batch. Available: ${adjustedAvailable}`
      );
      return;
    }

    if (!selectedItemData) {
      showAlert("error", "Error", "Selected item not found");
      return;
    }

    const buyingPrice = selectedBatchData.rate || 0;
    const sellingPriceValue = parseFloat(sellingPrice);

    // Check if selling price is less than or equal to buying price
    if (sellingPriceValue <= buyingPrice) {
      setPriceWarningModal({
        isOpen: true,
        buyingPrice: buyingPrice,
        sellingPrice: sellingPriceValue,
        itemName: selectedItemData.name,
        onConfirm: () => {
          // Proceed with adding item after confirmation
          const itemTotal = parseFloat(quantity) * parseFloat(sellingPrice);

          const saleItem = {
            itemId: selectedItemData.id,
            batchId: selectedBatchData.id,
            itemName: selectedItemData.name,
            batchInfo: {
              purchaseDate: selectedBatchData.purchaseDate,
              availableQuantity: selectedBatchData.availableQuantity,
              purchaseRate: selectedBatchData.rate,
              invoiceNumber: selectedBatchData.invoiceNumber,
            },
            quantity: parseFloat(quantity),
            unitPrice: parseFloat(sellingPrice),
            total: itemTotal,
          };

          if (editingIndex !== null) {
            // Update existing item
            const updated = [...saleItems];
            updated[editingIndex] = saleItem;
            setSaleItems(updated);
            setEditingIndex(null);
          } else {
            // Add new item
            setSaleItems([...saleItems, saleItem]);
          }

          // Reset form
          setSelectedItemId("");
          setSelectedBatch("");
          setQuantity("");
          setSellingPrice("");
        },
      });
      return;
    }

    // If price is fine, proceed directly
    const itemTotal = parseFloat(quantity) * parseFloat(sellingPrice);

    const saleItem = {
      itemId: selectedItemData.id,
      batchId: selectedBatchData.id,
      itemName: selectedItemData.name,
      batchInfo: {
        purchaseDate: selectedBatchData.purchaseDate,
        availableQuantity: selectedBatchData.availableQuantity,
        purchaseRate: selectedBatchData.rate,
        invoiceNumber: selectedBatchData.invoiceNumber,
      },
      quantity: parseFloat(quantity),
      unitPrice: parseFloat(sellingPrice),
      total: itemTotal,
    };

    if (editingIndex !== null) {
      // Update existing item
      const updated = [...saleItems];
      updated[editingIndex] = saleItem;
      setSaleItems(updated);
      setEditingIndex(null);
    } else {
      // Add new item
      setSaleItems([...saleItems, saleItem]);
    }

    // Reset form
    setSelectedItemId("");
    setSelectedBatch("");
    setQuantity("");
    setSellingPrice("");
  };

  const removeItem = (index) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const editItem = (index) => {
    const item = saleItems[index];
    setSelectedItemId(item.itemId.toString());
    setSelectedBatch(item.batchId.toString());
    setQuantity(item.quantity.toString());
    setSellingPrice(item.unitPrice.toString());
    setEditingIndex(index);
    // Remove from cart temporarily
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return saleItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const generateDefaultTransactionNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `SALE-${year}${month}${day}-${random}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saleItems.length === 0) {
      showAlert(
        "warning",
        "Validation Error",
        "Please add at least one item to sell"
      );
      return;
    }

    try {
      // Prepare all sales data with the selected date
      const transactionDate = useSystemDate
        ? new Date().toISOString()
        : saleDate.toISOString();
      const salesDataArray = saleItems.map((item) => ({
        itemId: item.itemId,
        batchId: item.batchId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        date: transactionDate,
      }));

      // Create transaction with all sales and custom transaction number (or auto-generate if empty)
      const finalTransactionNumber =
        transactionNumber.trim() || generateDefaultTransactionNumber();
      const result = await window.electronAPI.addSalesTransaction(
        salesDataArray,
        finalTransactionNumber,
        customerName.trim() || null
      );

      if (result.success) {
        showAlert(
          "success",
          "Success",
          `Successfully recorded transaction ${result.data.transactionNumber} with ${saleItems.length} item(s)!`
        );
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        showAlert("error", "Error", `Error recording sales: ${result.error}`);
      }
    } catch (error) {
      console.error("Error recording sales:", error);
      showAlert("error", "Error", "Error recording sales");
    }
  };

  const itemDropdownOptions = [
    { value: "", label: "Select an item" },
    ...items.map((item) => ({
      value: item.id.toString(),
      label: `${item.name} (Total Stock: ${item.stock})`,
    })),
  ];

  const batchDropdownOptions = [
    { value: "", label: "Select a batch" },
    ...availableBatches.map((batch) => {
      const adjustedAvailable = getAdjustedAvailableQuantity(batch);
      return {
        value: batch.id.toString(),
        label: `${new Date(
          batch.purchaseDate
        ).toLocaleDateString()} - Available: ${adjustedAvailable} - Rate: UGX ${batch.rate?.toLocaleString()}`,
      };
    }),
  ];

  const total = calculateTotal();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-[#1b65f6] to-[#4a8af7] text-white p-6 rounded-t-xl flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-wide uppercase">
            Record New Sale
          </h2>
          <button
            onClick={onClose}
            className="text-white transition-colors hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {loading ? (
            <div className="py-8 text-center">
              <div className="inline-block w-8 h-8 border-t-2 border-b-2 border-[#1b65f6] rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <div className="flex justify-between w-full space-x-2">
                {/* Transaction Number */}
                <div className="w-full">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Transaction Number:
                  </label>
                  <input
                    type="text"
                    value={transactionNumber}
                    onChange={(e) => setTransactionNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b65f6]"
                    placeholder="Enter transaction number (optional)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Default value is auto-generated, but you can change it
                  </p>
                </div>

                {/* Customer Name */}
                <div className="w-full">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Customer Name:
                  </label>
                  <CustomerDropdown
                    options={customerNames}
                    value={customerName}
                    onChange={(value) => setCustomerName(value)}
                    onAddNew={handleCustomerAdd}
                    placeholder="Select or type customer name (optional)"
                  />
                </div>
              </div>

              {/* Sale Date */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Sale Date:
                </label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="useSystemDate"
                      checked={useSystemDate}
                      onChange={(e) => setUseSystemDate(e.target.checked)}
                      className="w-4 h-4 text-[#1b65f6] border-gray-300 rounded focus:ring-[#1b65f6]"
                    />
                    <label
                      htmlFor="useSystemDate"
                      className="text-sm text-gray-700"
                    >
                      Use today's date
                    </label>
                  </div>
                  {!useSystemDate && (
                    <CustomDatePicker
                      value={saleDate}
                      onChange={(date) => setSaleDate(date)}
                      placeholder="Select sale date"
                    />
                  )}
                </div>
              </div>

              {/* Add Item Form */}
              <div className="p-4 space-y-4 rounded-lg bg-gray-50">
                <h3 className="font-semibold text-gray-900">
                  Add Item to Sale
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Select Item: <span className="text-red-500">*</span>
                    </label>
                    <Dropdown
                      options={itemDropdownOptions}
                      value={selectedItemId}
                      onChange={(value) => {
                        setSelectedItemId(value);
                        setSelectedBatch("");
                        setQuantity("");
                        setSellingPrice("");
                      }}
                      placeholder="Select an item"
                    />
                  </div>

                  {selectedItemId && (
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Select Batch: <span className="text-red-500">*</span>
                      </label>
                      {loadingBatches ? (
                        <div className="py-4 text-center">
                          <div className="inline-block w-6 h-6 border-t-2 border-b-2 border-[#1b65f6] rounded-full animate-spin"></div>
                        </div>
                      ) : availableBatches.length === 0 ? (
                        <p className="text-sm text-red-600">
                          No available batches for this item
                        </p>
                      ) : (
                        <Dropdown
                          options={batchDropdownOptions}
                          value={selectedBatch}
                          onChange={(value) => {
                            setSelectedBatch(value);
                            const batch = availableBatches.find(
                              (b) => b.id === parseInt(value)
                            );
                            if (batch) {
                              setSellingPrice(batch.rate.toString());
                            }
                          }}
                          placeholder="Select a batch"
                        />
                      )}
                    </div>
                  )}

                  {selectedBatchData && (
                    <>
                      <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">
                          Quantity: <span className="text-red-500">*</span>
                        </label>
                        <input
                          // type="number"
                          required
                          // min="0.1"
                          // step="0.1"
                          max={selectedBatchAdjustedAvailable}
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b65f6]"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Available: {selectedBatchAdjustedAvailable}
                        </p>
                      </div>

                      <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">
                          Selling Price (per unit):{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          // type="number"
                          required
                          // min="0"
                          // step="1"
                          value={sellingPrice}
                          onChange={(e) => setSellingPrice(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1b65f6]"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Purchase Rate: UGX{" "}
                          {selectedBatchData.rate?.toLocaleString()}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {selectedBatchData &&
                  quantity &&
                  sellingPrice &&
                  parseFloat(quantity) > 0 && (
                    <div className="p-3 rounded-lg bg-blue-50">
                      <p className="text-sm text-gray-600">
                        Item Total:{" "}
                        <span className="font-bold text-lg text-[#1b65f6]">
                          UGX{" "}
                          {(
                            parseFloat(quantity) * parseFloat(sellingPrice)
                          ).toLocaleString()}
                        </span>
                      </p>
                    </div>
                  )}

                <button
                  type="button"
                  onClick={addItemToCart}
                  disabled={
                    !selectedItemId ||
                    !selectedBatch ||
                    !quantity ||
                    !sellingPrice
                  }
                  className="w-full bg-[#1b65f6] text-white px-4 py-2 rounded-lg hover:bg-[#4a8af7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>
                    {editingIndex !== null ? "Update Item" : "Add Item"}
                  </span>
                </button>
              </div>

              {/* Sale Items List */}
              {saleItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">
                    Items to Sell ({saleItems.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">
                            Item
                          </th>
                          <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">
                            Batch Date
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
                          <th className="px-4 py-2 text-xs font-medium text-center text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {saleItems.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {item.itemName}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {new Date(
                                item.batchInfo.purchaseDate
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              UGX {item.unitPrice.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                              UGX {item.total.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => editItem(index)}
                                  className="text-[#1b65f6] hover:text-[#4a8af7] transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="text-red-600 transition-colors hover:text-red-700"
                                  title="Remove"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td
                            colSpan="4"
                            className="px-4 py-3 text-sm font-semibold text-right text-gray-900"
                          >
                            Grand Total:
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-lg text-[#1b65f6]">
                            UGX {total.toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={saleItems.length === 0}
                  className="flex-1 bg-[#1b65f6] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#4a8af7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Complete Sale ({saleItems.length} item
                  {saleItems.length !== 1 ? "s" : ""})
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
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

      {/* Price Warning Modal */}
      <Modal
        isOpen={priceWarningModal.isOpen}
        onClose={() =>
          setPriceWarningModal({
            isOpen: false,
            buyingPrice: 0,
            sellingPrice: 0,
            itemName: "",
            onConfirm: null,
          })
        }
        onConfirm={() => {
          if (priceWarningModal.onConfirm) {
            priceWarningModal.onConfirm();
          }
          setPriceWarningModal({
            isOpen: false,
            buyingPrice: 0,
            sellingPrice: 0,
            itemName: "",
            onConfirm: null,
          });
        }}
        type="warning"
        title="Price Warning"
        message={`You are selling "${
          priceWarningModal.itemName
        }" at UGX ${priceWarningModal.sellingPrice?.toLocaleString()} which is ${
          priceWarningModal.sellingPrice < priceWarningModal.buyingPrice
            ? "less than"
            : "equal to"
        } the buying price of UGX ${priceWarningModal.buyingPrice?.toLocaleString()}. This will result in ${
          priceWarningModal.sellingPrice < priceWarningModal.buyingPrice
            ? "a loss"
            : "no profit"
        }. Do you want to continue?`}
        confirmText="Continue"
        cancelText="Cancel"
      />
    </div>
  );
};

export default SaleModal;
