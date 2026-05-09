import React, { useState, useEffect } from 'react';
import { ChevronDown, Calendar, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, X } from 'lucide-react';

const indexTypes = [
  { value: 'NDVI', label: 'NDVI - Normalized Difference Vegetation Index' },
  { value: 'NDRE', label: 'NDRE - Normalized Difference Red Edge' },
  { value: 'MSAVI', label: 'MSAVI - Modified Soil-Adjusted Vegetation Index' },
  { value: 'NDMI', label: 'NDMI - Normalized Difference Moisture Index' },
  { value: 'EVI', label: 'EVI - Enhanced Vegetation Index' },
  { value: 'SAVI', label: 'SAVI - Soil Adjusted Vegetation Index' },
  { value: 'GNDVI', label: 'GNDVI - Green NDVI' },
];

const mockDates = [
  { date: 'Dec 15, 2024', cloudCover: 12.5 },
  { date: 'Dec 10, 2024', cloudCover: 8.3 },
  { date: 'Dec 5, 2024', cloudCover: 15.2 },
  { date: 'Nov 30, 2024', cloudCover: 5.6 },
  { date: 'Nov 25, 2024', cloudCover: 18.9 },
  { date: 'Nov 20, 2024', cloudCover: 3.2 },
  { date: 'Nov 15, 2024', cloudCover: 22.1 },
  { date: 'Nov 10, 2024', cloudCover: 7.8 },
];

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-yellow-600';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div className={`fixed top-20 right-4 z-[9999] ${bgColor} text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] animate-slide-in`}>
      <Icon size={20} />
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button onClick={onClose} className="hover:bg-white/20 rounded p-1">
        <X size={16} />
      </button>
    </div>
  );
};

// Index Type Dropdown
const IndexTypeDropdown = ({ selectedIndex, setSelectedIndex }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-cg-panel/95 backdrop-blur-md text-white rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 min-w-[100px] sm:min-w-[120px] hover:bg-cg-panel transition-all border border-green-500/20 shadow-lg hover:shadow-xl hover:border-green-500/40"
      >
        <span className="text-xs sm:text-sm font-semibold">{selectedIndex}</span>
        <ChevronDown size={14} className={`sm:w-4 sm:h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute bottom-full mb-2 right-0 bg-cg-panel/98 backdrop-blur-md rounded-lg shadow-2xl border border-green-500/30 max-h-[280px] overflow-y-auto z-50 min-w-[280px] sm:min-w-[350px] custom-scrollbar">
            {indexTypes.map((index) => (
              <div
                key={index.value}
                onClick={() => {
                  setSelectedIndex(index.value);
                  setIsOpen(false);
                }}
                className={`px-4 py-3 cursor-pointer text-white transition-all border-b border-green-900/20 last:border-b-0
                  ${selectedIndex === index.value 
                    ? 'bg-green-900/30 border-l-4 border-l-green-500' 
                    : 'hover:bg-green-900/20 border-l-4 border-l-transparent'
                  }`}
              >
                <div className="font-semibold text-sm text-green-400">{index.value}</div>
                <div className="text-xs text-gray-400 mt-1">{index.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Date Selector
const DateSelector = () => {
  const [selectedDate, setSelectedDate] = useState(mockDates[0].date);
  const [visibleDates, setVisibleDates] = useState(mockDates.slice(0, 3));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);

  const datesPerView = window.innerWidth < 640 ? 3 : window.innerWidth < 1024 ? 4 : 6;

  useEffect(() => {
    setVisibleDates(mockDates.slice(currentIndex, currentIndex + datesPerView));
  }, [currentIndex, datesPerView]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      const newIndex = Math.max(0, currentIndex - datesPerView);
      setCurrentIndex(newIndex);
    }
  };

  const handleNext = () => {
    if (currentIndex + datesPerView < mockDates.length) {
      const newIndex = currentIndex + datesPerView;
      setCurrentIndex(newIndex);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-cg-panel/95 backdrop-blur-sm rounded-b-xl sm:rounded-b-2xl z-[1000] border-t border-green-900/20">
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 px-2 sm:px-4 py-2 sm:py-3">
        <div className="relative">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Select custom date"
          >
            <Calendar size={16} className="sm:w-5 sm:h-5 text-cg-accent" />
          </button>

          {showCalendar && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowCalendar(false)}
              />
              <div className="absolute bottom-full mb-2 left-0 bg-cg-panel/98 backdrop-blur-md rounded-lg p-3 shadow-2xl border border-green-500/30 z-50">
                <input
                  type="date"
                  className="bg-cg-panel-2 text-white px-3 py-2 rounded-lg outline-none text-sm border border-green-500/20 focus:border-green-500/50 transition-colors"
                  onChange={() => setShowCalendar(false)}
                />
              </div>
            </>
          )}
        </div>
        
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`p-1.5 sm:p-2 rounded-lg transition-colors
            ${currentIndex === 0 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-white/10'}`}
        >
          <ChevronLeft size={16} className="sm:w-5 sm:h-5 text-white" />
        </button>
        
        <div className="flex gap-1 sm:gap-2 flex-1 overflow-x-auto scrollbar-hide">
          {visibleDates.map((dateItem) => (
            <div
              key={dateItem.date}
              onClick={() => setSelectedDate(dateItem.date)}
              className={`flex flex-col items-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg cursor-pointer transition-all min-w-[80px] sm:min-w-[100px]
                ${selectedDate === dateItem.date 
                  ? 'bg-green-900/40 shadow-sm border-2 border-cg-accent/50' 
                  : 'hover:bg-white/5 border-2 border-transparent'}`}
            >
              <div className="text-[10px] sm:text-xs font-semibold text-white whitespace-nowrap">
                {dateItem.date}
              </div>
              <div className="text-[10px] sm:text-xs text-cg-muted whitespace-nowrap">
                {dateItem.cloudCover}% Cloud
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={handleNext}
          disabled={currentIndex + datesPerView >= mockDates.length}
          className={`p-1.5 sm:p-2 rounded-lg transition-colors
            ${currentIndex + datesPerView >= mockDates.length 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-white/10'}`}
        >
          <ChevronRight size={16} className="sm:w-5 sm:h-5 text-white" />
        </button>
      </div>
    </div>
  );
};

export default function MapOverlays({
  manualArea,
  sampleFieldsCount,
  toast,
  onToastClose,
  selectedIndex,
  setSelectedIndex,
}) {
  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={onToastClose} 
        />
      )}

      {/* Area Display */}
      {manualArea > 0 && (
        <div className="absolute bottom-20 sm:bottom-24 left-1/2 transform -translate-x-1/2 bg-yellow-500/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg text-sm font-semibold text-gray-900 z-[999] border border-yellow-400">
          Area: {manualArea.toFixed(2)} hectares
        </div>
      )}

      {/* Sample Fields Info Display */}
      {sampleFieldsCount > 0 && (
        <div className="absolute top-16 sm:top-20 left-1/2 transform -translate-x-1/2 bg-yellow-500/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg text-sm font-semibold text-gray-900 z-[999] border border-yellow-400">
          {sampleFieldsCount} Sample Fields Loaded
        </div>
      )}

      {/* Bottom Right - Index Type Selector */}
      <div className="absolute bottom-16 sm:bottom-20 right-2 sm:right-4 z-[1001]">
        <IndexTypeDropdown 
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
        />
      </div>
      
      {/* Bottom - Date Selector */}
      <DateSelector />

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}