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
  const [editingName, setEditingName] = useState<number | null>(null);

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

  const handleSheetNameChange = (index: number, value: string) => {
    const newNames = [...sheetNames];
    newNames[index] = value;
    setSheetNames(newNames);
  };

  const handleSheetNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setEditingName(null);
    }
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

  const getStackOrder = (index: number, isActive: boolean) => {
    if (!isSidebarOpen) {
      return isActive ? sheetData.length - 1 : index;
    }
    
    if (index === activeSheet) {
      return 0;
    }
    
    return index < activeSheet ? index + 1 : index;
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Menu Button */}
        <button 
          onClick={toggleSidebar}
          className={`
            fixed top-8 transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'left-8' : 'left-8'}
            z-50 p-3 rounded-xl hover:bg-gray-100 bg-white shadow-sm
            hover:shadow-md active:shadow-sm active:translate-y-[1px]
            border border-gray-200/60
          `}
        >
          <div className="space-y-1.5">
            <div className="w-5 h-0.5 bg-gray-500"></div>
            <div className="w-5 h-0.5 bg-gray-500"></div>
            <div className="w-5 h-0.5 bg-gray-500"></div>
          </div>
        </button>

        {/* Spreadsheet Layout */}
        <div className={`
          relative w-full h-full transition-all duration-300
          ${isSidebarOpen ? 'pl-80' : ''}
          pt-24 px-8
        `}>
          {/* Sidebar */}
          <div className={`
            fixed left-0 top-0 h-full bg-white shadow-xl transition-all duration-300 transform
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            w-72 border-r border-gray-200/80 z-40
          `}>
            <div className="p-8 pt-28">
              <h2 className="text-xl font-semibold mb-6 text-gray-800">Spreadsheets</h2>
              <ul className="space-y-2.5">
                {sheetNames.map((name, index) => (
                  <li 
                    key={index}
                    className={`
                      p-3.5 rounded-lg cursor-pointer transition-all duration-150
                      ${activeSheet === index 
                        ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm border border-indigo-100' 
                        : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                      }
                    `}
                    onClick={() => handleSidebarSheetClick(index)}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Spreadsheets */}
          <div className={`
            relative w-full h-full 
            ${isSidebarOpen ? 'overflow-visible' : 'overflow-hidden'}
          `}>
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
                      'opacity-100 cursor-pointer hover:opacity-95'
                    )}
                  `}
                  style={{
                    transform: isSidebarOpen
                      ? `translate(${stackOrder * 40}px, ${-stackOrder * 20}px)`
                      : isActive
                        ? 'none'
                        : `translate(${(index - activeSheet) * 100}%, 0)`,
                    zIndex: isSidebarOpen ? 30 - stackOrder : isActive ? 30 : -1,
                    left: 0,
                    top: 0,
                    pointerEvents: isTransitioning ? 'none' : 'auto'
                  }}
                >
                  <div className={`
                    bg-white rounded-xl overflow-hidden
                    ${!isActive 
                      ? 'shadow-md hover:shadow-lg border border-gray-200/60' 
                      : 'shadow-lg border border-gray-200/80'
                    } 
                    transition-all duration-300
                  `}>
                    {/* Sheet Name Header */}
                    <div 
                      className={`
                        px-6 py-4 border-b border-gray-200/80 
                        ${isActive ? 'bg-white' : 'bg-gray-50/50'}
                        transition-colors duration-300
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingName(index);
                      }}
                    >
                      {editingName === index ? (
                        <input
                          type="text"
                          value={sheetNames[index]}
                          onChange={(e) => handleSheetNameChange(index, e.target.value)}
                          onKeyDown={handleSheetNameKeyDown}
                          onBlur={() => setEditingName(null)}
                          className="w-full px-3 py-1.5 rounded-lg border border-indigo-300 
                            focus:outline-none focus:ring-2 focus:ring-indigo-400/30
                            text-gray-700 font-medium bg-white"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <h3 className="font-medium text-gray-700 cursor-text px-1">
                          {sheetNames[index]}
                        </h3>
                      )}
                    </div>
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