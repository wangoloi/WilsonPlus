import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function getScrollableAncestors(node) {
  const scrollables = [];
  let parent = node?.parentElement;
  while (parent && parent !== document.body) {
    const style = getComputedStyle(parent);
    if (
      /(auto|scroll)/.test(style.overflow + style.overflowY + style.overflowX)
    ) {
      scrollables.push(parent);
    }
    parent = parent.parentElement;
  }
  scrollables.push(window);
  return scrollables;
}

const ItemNameDropdown = ({
  options = [],
  value,
  onChange,
  placeholder = "Select or type item name",
  className = "",
  disabled = false,
  onAddNew,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [searchTerm, setSearchTerm] = useState(value || "");
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  const normalizedSearchTerm = String(searchTerm ?? "").toLowerCase();
  const filteredOptions = options.filter((opt) =>
    String(opt).toLowerCase().includes(normalizedSearchTerm)
  );
  // Limit visible options to 100 for performance (with 1000+ items)
  const MAX_VISIBLE_OPTIONS = 100;
  const visibleOptions = filteredOptions.slice(0, MAX_VISIBLE_OPTIONS);
  const hasMoreOptions = filteredOptions.length > MAX_VISIBLE_OPTIONS;
  const hasExactMatch = options.some(
    (opt) => opt.toLowerCase() === normalizedSearchTerm
  );
  const showAddNew = searchTerm && !hasExactMatch && normalizedSearchTerm.length > 0;

  const updateMenuPosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight || 200;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let newTop = rect.bottom + window.scrollY;
      let upwards = false;

      if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
        upwards = true;
        newTop = rect.top + window.scrollY - menuHeight;
      }

      setOpenUpwards(upwards);
      setMenuPosition({
        top: newTop,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    const scrollables = getScrollableAncestors(dropdownRef.current);
    const handleScrollOrResize = () => updateMenuPosition();

    scrollables.forEach((el) =>
      el.addEventListener("scroll", handleScrollOrResize, true)
    );
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      scrollables.forEach((el) =>
        el.removeEventListener("scroll", handleScrollOrResize, true)
      );
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
        if (value) {
          setSearchTerm(value);
        } else {
          setSearchTerm("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  useEffect(() => {
    if (value) {
      setSearchTerm(value);
    }
  }, [value]);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm(option);
  };

  const handleAddNew = () => {
    if (onAddNew && searchTerm) {
      onAddNew(searchTerm);
      onChange(searchTerm);
      setIsOpen(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    if (!isOpen) {
      setIsOpen(true);
    }
    // Update value immediately for typing new items
    onChange(newValue);
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  return (
    <>
      <div className={`relative ${className}`} ref={dropdownRef}>
        <div className="relative w-full">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            placeholder={placeholder}
            disabled={disabled}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            className={`
              w-full px-3 py-2 pr-8 rounded-lg bg-white border border-gray-300 text-sm
              focus:ring-1 focus:border-0 focus:ring-[#1b65f6] focus:outline-none
              placeholder-gray-400
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
          />
          <ChevronDown
            className={`absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {createPortal(
        <AnimatePresence>
          {isOpen && (filteredOptions.length > 0 || showAddNew) && (
            <motion.div
              ref={menuRef}
              key="dropdown-menu"
              initial={{ opacity: 0, y: openUpwards ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: openUpwards ? 10 : -10 }}
              transition={{ type: "spring", stiffness: 180, damping: 20 }}
              className={`absolute z-50 bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 ${
                openUpwards ? "mb-2" : "mt-2"
              }`}
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
                maxHeight: "200px",
              }}
            >
              <div className="overflow-y-auto" style={{ maxHeight: "200px" }}>
                {visibleOptions.length > 0 ? (
                  <>
                    {visibleOptions.map((option, index) => (
                      <button
                        type="button"
                        key={option}
                        onClick={() => handleSelect(option)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left
                          hover:bg-gray-50 transition-colors duration-300
                          ${
                            value === option
                              ? "bg-[#1b65f6]/5 text-[#1b65f6]"
                              : "text-gray-900"
                          }
                          ${index === 0 ? "rounded-t-lg" : ""}
                        `}
                      >
                        <span className="truncate">{option}</span>
                      </button>
                    ))}
                    {hasMoreOptions && (
                      <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
                        Showing {MAX_VISIBLE_OPTIONS} of {filteredOptions.length} results. Type to filter more.
                      </div>
                    )}
                  </>
                ) : null}
                {showAddNew && (
                  <button
                    type="button"
                    onClick={handleAddNew}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left
                      hover:bg-[#1b65f6]/10 transition-colors duration-300
                      text-[#1b65f6] font-medium border-t border-gray-200
                    "
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add "{searchTerm}"</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default ItemNameDropdown;

