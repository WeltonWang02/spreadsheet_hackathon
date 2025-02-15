'use client';

import React, { useState, useEffect } from 'react';
import Spreadsheet from './Spreadsheet';

interface ThreeDSpreadsheetProps {
  initialSheets?: number;
  initialRows?: number;
  initialCols?: number;
}

export default function ThreeDSpreadsheet({ 
  initialSheets = 3, 
  initialRows = 10, 
  initialCols = 5 
}: ThreeDSpreadsheetProps) {
  const [activeSheet, setActiveSheet] = useState(0);
  const [sheetData, setSheetData] = useState<Array<Array<Array<{ value: string; row: number; col: number }>>>>([]);
  const [sharedHeaders, setSharedHeaders] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Initialize the sheets and headers
  useEffect(() => {
    // Initialize headers
    const initialHeaders = Array(initialCols).fill(null).map((_, index) => 
      String.fromCharCode(65 + index)
    );
    setSharedHeaders(initialHeaders);

    // Initialize sheet data
    const initialSheetData = Array(initialSheets).fill(null).map(() =>
      Array(initialRows).fill(null).map((_, rowIndex) =>
        Array(initialCols).fill(null).map((_, colIndex) => ({
          value: '',
          row: rowIndex,
          col: colIndex,
        }))
      )
    );
    setSheetData(initialSheetData);

    // Initialize sheet names
    const initialSheetNames = Array(initialSheets).fill(null).map((_, index) => 
      `Sheet ${index + 1}`
    );
    setSheetNames(initialSheetNames);
  }, [initialSheets, initialRows, initialCols]);

  const handleHeaderChange = (colIndex: number, value: string) => {
    const newHeaders = [...sharedHeaders];
    newHeaders[colIndex] = value;
    setSharedHeaders(newHeaders);
  };

  const handleSheetClick = (index: number) => {
    if (!isSidebarOpen && !isTransitioning) {
      setIsTransitioning(true);
      setActiveSheet(index);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handleSidebarSheetClick = (index: number) => {
    setIsTransitioning(true);
    setActiveSheet(index);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Calculate the visual order of sheets when in stack view
  const getStackOrder = (index: number, isActive: boolean) => {
    if (!isSidebarOpen) {
      return isActive ? sheetData.length - 1 : index;
    }
    
    if (index === activeSheet) {
      return 0; // Active sheet goes on top
    }
    
    // Other sheets get pushed down in their original order
    return index < activeSheet ? index + 1 : index;
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Menu Button */}
        <button 
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 rounded hover:bg-gray-100"
        >
          <div className="space-y-1">
            <div className="w-6 h-0.5 bg-gray-600"></div>
            <div className="w-6 h-0.5 bg-gray-600"></div>
            <div className="w-6 h-0.5 bg-gray-600"></div>
          </div>
        </button>

        {/* Spreadsheet Layout */}
        <div className={`relative w-full h-full transition-all duration-300 ${
          isSidebarOpen ? 'pl-64' : ''
        }`}>
          {/* Sidebar */}
          <div className={`absolute left-0 top-0 h-full bg-white transition-transform duration-300 transform 
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64 border-r border-gray-200 z-40`}
          >
            <div className="p-4">
              <h2 className="text-xl font-bold mb-4">Spreadsheets</h2>
              <ul className="space-y-2">
                {sheetNames.map((name, index) => (
                  <li 
                    key={index}
                    className={`p-2 rounded cursor-pointer ${
                      activeSheet === index ? 'bg-blue-100' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleSidebarSheetClick(index)}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Spreadsheets */}
          <div className={`relative w-full h-full ${isSidebarOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
            {sheetData.map((sheet, index) => {
              const isActive = activeSheet === index;
              const stackOrder = getStackOrder(index, isActive);
              
              return (
                <div
                  key={index}
                  onClick={() => handleSheetClick(index)}
                  className={`
                    absolute 
                    transition-all 
                    duration-300 
                    ease-in-out
                    ${!isSidebarOpen ? (
                      isActive ? 'opacity-100' : 'opacity-0'
                    ) : (
                      'opacity-100 cursor-pointer hover:opacity-90'
                    )}
                  `}
                  style={{
                    transform: isSidebarOpen
                      ? `translate(${stackOrder * 32}px, ${-stackOrder * 16}px)`
                      : isActive
                        ? 'none'
                        : `translate(${(index - activeSheet) * 100}%, 0)`,
                    zIndex: isSidebarOpen ? 30 - stackOrder : isActive ? 30 : -1,
                    left: 0,
                    top: 0,
                    pointerEvents: isTransitioning ? 'none' : 'auto'
                  }}
                >
                  <div className={`bg-white shadow-lg ${!isActive && 'hover:shadow-xl'} transition-shadow duration-300`}>
                    <Spreadsheet
                      key={index}
                      initialRows={initialRows}
                      initialCols={initialCols}
                      data={sheet}
                      headers={sharedHeaders}
                      onHeaderChange={handleHeaderChange}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 