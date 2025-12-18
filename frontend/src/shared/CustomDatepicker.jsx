import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  getDaysInMonth,
  isToday,
  isSameDay,
  getYear,
  setYear,
  setMonth,
} from "date-fns";

const CustomDatePicker = ({
  value,
  onChange,
  placeholder = "Select Date",
  disableBefore,
  disableAfter,
}) => {
  const [show, setShow] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);
  const [calendarDate, setCalendarDate] = useState(value || new Date());
  const [view, setView] = useState("day");
  const [position, setPosition] = useState("bottom");
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef(null);
  const menuRef = useRef(null);
  const [isMd, setIsMd] = useState(window.innerWidth >= 768);

  // Position the calendar absolutely using portal
  useEffect(() => {
    if (show && ref.current) {
      const updatePosition = () => {
        const rect = ref.current.getBoundingClientRect();
        const menuWidth = rect.width;
        const menuHeight = menuRef.current?.offsetHeight || 300;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        let top = rect.bottom + window.scrollY;
        let left = rect.left + window.scrollX;
        let pos = "bottom";
        if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
          // open upwards
          top = rect.top + window.scrollY - menuHeight;
          pos = "top";
        }
        setPosition(pos);
        setMenuStyle({
          top,
          left,
          width: menuWidth,
        });
      };
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [show]);

  // Responsive width handler
  useEffect(() => {
    const handleResize = () => setIsMd(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        ref.current &&
        !ref.current.contains(e.target) &&
        (!menuRef.current || !menuRef.current.contains(e.target))
      )
        closeCalendar();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateClick = (day) => {
    const selected = new Date(
      calendarDate.getFullYear(),
      calendarDate.getMonth(),
      day
    );
    // Check if the selected date is disabled
    if (
      (disableBefore && selected < disableBefore) ||
      (disableAfter && selected > disableAfter)
    ) {
      return;
    }
    onChange(selected);
    closeCalendar();
  };

  const changeMonth = (offset) => {
    setCalendarDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1)
    );
  };

  const selectYear = (year) => {
    setCalendarDate(setYear(calendarDate, year));
    setView("month");
  };

  const selectMonth = (monthIndex) => {
    setCalendarDate(setMonth(calendarDate, monthIndex));
    setView("day");
  };

  const closeCalendar = () => {
    setAnimateOut(true);
    setTimeout(() => {
      setShow(false);
      setAnimateOut(false);
    }, 300);
  };

  const toggleCalendar = () => {
    if (show) {
      closeCalendar();
    } else {
      setShow(true);
      setView("day");
      setAnimateOut(false);
    }
  };

  const selectedDate = value;
  const daysInMonth = getDaysInMonth(calendarDate);
  const firstDayOfMonth = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth(),
    1
  ).getDay();
  const yearsRange = Array.from(
    { length: 100 },
    (_, i) => getYear(new Date()) - i
  );

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <div className="relative w-full">
        <button
          type="button"
          onClick={toggleCalendar}
          className="w-full flex justify-between items-center pl-3 pr-4 py-2 border border-gray-200 rounded-lg text-nowrap focus:ring-1 focus:ring-[#1b65f6] focus:border-transparent transition-all duration-300 outline-none text-left"
        >
          <span className={value ? "text-gray-800" : "text-gray-500"}>
            {value ? format(value, "MMMM d, yyyy") : placeholder}
          </span>
          <CalendarIcon className="w-5 h-5 text-[#1b65f6]" strokeWidth={1.5} />
        </button>
      </div>
      {show &&
        createPortal(
          <>
            <style>{`
            .calendar-slide-in-bottom {
              animation: slideInBottom 0.3s forwards;
            }
            .calendar-slide-out-bottom {
              animation: slideOutBottom 0.3s forwards;
            }
            .calendar-slide-in-top {
              animation: slideInTop 0.3s forwards;
            }
            .calendar-slide-out-top {
              animation: slideOutTop 0.3s forwards;
            }
            @keyframes slideInBottom {
              0% { opacity: 0; transform: translateY(-10px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideOutBottom {
              0% { opacity: 1; transform: translateY(0); }
              100% { opacity: 0; transform: translateY(-10px); }
            }
            @keyframes slideInTop {
              0% { opacity: 0; transform: translateY(10px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideOutTop {
              0% { opacity: 1; transform: translateY(0); }
              100% { opacity: 0; transform: translateY(10px); }
            }
          `}</style>
            <div
              ref={menuRef}
              className={`fixed z-50 w-auto md:w-72 bg-white rounded-lg shadow-lg p-4
              ${
                animateOut
                  ? position === "top"
                    ? "calendar-slide-out-top"
                    : "calendar-slide-out-bottom"
                  : position === "top"
                  ? "calendar-slide-in-top"
                  : "calendar-slide-in-bottom"
              }`}
              style={{
                top: menuStyle.top,
                left: menuStyle.left,
                width: isMd ? 288 : menuStyle.width,
                marginTop: position === "bottom" ? "8px" : undefined,
                marginBottom: position === "top" ? "8px" : undefined,
              }}
            >
              <div className="flex justify-between items-center mb-2 text-[#1b65f6] font-semibold">
                {view === "day" && (
                  <>
                    <button
                      type="button"
                      onClick={() => changeMonth(-1)}
                      className="p-2 rounded-full hover:bg-[#1b65f6]/25 transition duration-300"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setView("year")}
                      className="transition duration-300"
                      type="button"
                    >
                      {format(calendarDate, "MMMM yyyy")}
                    </button>
                    <button
                      type="button"
                      onClick={() => changeMonth(1)}
                      className="p-2 rounded-full hover:bg-[#1b65f6]/25 transition duration-300"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
                {view === "month" && (
                  <>
                    <div></div>
                    <button
                      onClick={() => setView("year")}
                      className="transition duration-300"
                      type="button"
                    >
                      {getYear(calendarDate)}
                    </button>
                    <div></div>
                  </>
                )}
                {view === "year" && (
                  <div className="text-center w-full">
                    {getYear(calendarDate)}
                  </div>
                )}
              </div>

              {view === "day" && (
                <>
                  <div className="grid grid-cols-7 gap-1 text-sm text-gray-500 mb-1 font-medium">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (d) => (
                        <div key={d} className="text-center">
                          {d}
                        </div>
                      )
                    )}
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-sm">
                    {Array(firstDayOfMonth)
                      .fill(null)
                      .map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const current = new Date(
                        calendarDate.getFullYear(),
                        calendarDate.getMonth(),
                        day
                      );
                      const isSelected =
                        selectedDate && isSameDay(current, selectedDate);
                      const isNow = isToday(current);
                      const isDisabled =
                        (disableBefore && current < disableBefore) ||
                        (disableAfter && current > disableAfter);

                      return (
                        <button
                          key={day}
                          onClick={() => !isDisabled && handleDateClick(day)}
                          disabled={isDisabled}
                          className={`text-center py-1 rounded-full transition duration-300 ${
                            isDisabled
                              ? "text-gray-300 cursor-not-allowed"
                              : isSelected
                              ? "bg-[#1b65f6] text-white font-semibold"
                              : isNow
                              ? "border border-[#1b65f6] text-[#1b65f6]"
                              : "hover:bg-gray-100"
                          }`}
                          type="button"
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {view === "month" && (
                <div className="grid grid-cols-3 gap-2 text-sm text-center">
                  {[
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ].map((m, i) => (
                    <button
                      key={m}
                      onClick={() => selectMonth(i)}
                      className="py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition duration-300"
                      type="button"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}

              {view === "year" && (
                <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto text-sm text-center">
                  {yearsRange.map((yr) => (
                    <button
                      key={yr}
                      onClick={() => selectYear(yr)}
                      className="py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition duration-300"
                      type="button"
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              )}

              {view === "day" && (
                <div
                  className={`mt-2 flex ${
                    value ? "justify-between" : "justify-end"
                  } items-center`}
                >
                  {value && (
                    <button
                      onClick={() => {
                        onChange(null);
                        closeCalendar();
                      }}
                      className="text-sm text-[#1b65f6] underline
                    hover:bg-[#1b65f6]/10 transition duration-300 bg-white rounded-lg p-2"
                      type="button"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const now = new Date();
                      if (
                        (!disableBefore || now >= disableBefore) &&
                        (!disableAfter || now <= disableAfter)
                      ) {
                        onChange(now);
                        setCalendarDate(now);
                        closeCalendar();
                      }
                    }}
                    className="text-sm text-[#1b65f6] hover:bg-[#1b65f6]/25 transition duration-300 bg-[#1b65f6]/10 rounded-lg p-2"
                    type="button"
                    disabled={
                      (disableBefore && new Date() < disableBefore) ||
                      (disableAfter && new Date() > disableAfter)
                    }
                  >
                    Today
                  </button>
                </div>
              )}
            </div>
          </>,
          document.body
        )}
    </div>
  );
};

export default CustomDatePicker;
