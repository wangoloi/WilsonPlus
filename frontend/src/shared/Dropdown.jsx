import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
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

const Dropdown = ({
  options = [],
  value,
  name,
  onChange,
  placeholder = "Select an option",
  className = "",
  disabled = false,
  icon,
  showCheckmark = true,
  maxHeight = "200px",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  const selectedOption = options.find((option) => option.value === value);

  // Normalize searchTerm for safe filter
  const normalizedSearchTerm = String(searchTerm ?? "").toLowerCase();

  const filteredOptions = options.filter((opt) =>
    String(opt.label ?? "")
      .toLowerCase()
      .includes(normalizedSearchTerm)
  );

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
        if (!selectedOption) setSearchTerm("");
        else setSearchTerm(String(selectedOption.label ?? ""));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOption]);

  useEffect(() => {
    if (!isOpen && selectedOption) {
      setSearchTerm(String(selectedOption.label ?? ""));
    }
  }, [isOpen, selectedOption]);

  const handleSelect = (option) => {
    if (name) {
      onChange({ target: { name, value: option.value } });
    } else {
      onChange(option.value);
    }
    setIsOpen(false);
    setSearchTerm(String(option.label ?? ""));
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      setSearchTerm(""); // clear input for typing when open
    }
  };

  // Dynamic placeholder:
  // If open and selectedOption, show selectedOption label as placeholder
  // Otherwise show normal placeholder string
  const dynamicPlaceholder =
    isOpen && selectedOption ? String(selectedOption.label ?? "") : placeholder;

  return (
    <>
      <div className={`relative ${className}`} ref={dropdownRef}>
        <div className="relative w-full">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            placeholder={dynamicPlaceholder}
            disabled={disabled}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={handleInputFocus}
            className={`
              w-full px-3 py-2 pr-8 rounded-lg bg-white border border-gray-200 text-sm
              focus:ring-[0.5px] focus:border-0 focus:ring-[#1b65f6] focus:outline-none
              placeholder-gray-400
              cursor-default
              ${!isOpen && selectedOption ? "text-[#172b4d]" : "text-gray-900"}
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
          {isOpen && (
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
                maxHeight,
              }}
            >
              <div className="overflow-y-auto" style={{ maxHeight }}>
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => handleSelect(option)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left
                        hover:bg-gray-50 transition-colors duration-300
                        ${
                          value === option.value
                            ? "bg-[#1b65f6]/5 text-[#1b65f6]"
                            : "text-gray-900"
                        }
                        ${index === 0 ? "rounded-t-lg" : ""}
                        ${
                          index === filteredOptions.length - 1
                            ? "rounded-b-lg"
                            : ""
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {option.icon &&
                          React.createElement(option.icon, {
                            className: "h-4 w-4",
                          })}
                        <span className="truncate">{option.label}</span>
                      </div>
                      {showCheckmark && value === option.value && (
                        <Check className="h-4 w-4 text-[#1b65f6] flex-shrink-0" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-gray-500 text-sm text-center">
                    No items found
                  </div>
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

export default Dropdown;
