import React from "react";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

const Modal = ({
  isOpen,
  onClose,
  title,
  message,
  type = "info", // info, success, warning, error, confirm
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  showCancel = true,
}) => {
  if (!isOpen) return null;

  const iconMap = {
    info: <Info className="w-6 h-6 text-[#1b65f6]" />,
    success: <CheckCircle className="w-6 h-6 text-green-600" />,
    warning: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
    error: <AlertCircle className="w-6 h-6 text-red-600" />,
    confirm: <AlertCircle className="w-6 h-6 text-[#1b65f6]" />,
  };

  const bgColorMap = {
    info: "bg-blue-50",
    success: "bg-green-50",
    warning: "bg-yellow-50",
    error: "bg-red-50",
    confirm: "bg-blue-50",
  };

  const buttonColorMap = {
    info: "bg-[#1b65f6] hover:bg-[#4a8af7]",
    success: "bg-green-600 hover:bg-green-700",
    warning: "bg-yellow-600 hover:bg-yellow-700",
    error: "bg-red-600 hover:bg-red-700",
    confirm: "bg-[#1b65f6] hover:bg-[#4a8af7]",
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full transform transition-all">
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className={`flex-shrink-0 p-2 rounded-full ${bgColorMap[type]}`}>
              {iconMap[type]}
            </div>
            <div className="flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {title}
                </h3>
              )}
              <p className="text-sm text-gray-600">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            {showCancel && (
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 rounded-lg text-white transition-colors ${buttonColorMap[type]}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;

