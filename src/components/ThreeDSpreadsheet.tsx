'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Spreadsheet from './Spreadsheet';

interface ThreeDSpreadsheetProps {
  initialRows?: number;
  initialCols?: number;
  sourceData?: Array<Array<{ value: string; row: number; col: number }>>;
  isSidebarOpen?: boolean;
  data: Array<{ prevRow: Array<{ value: string; row: number; col: number }>; data: Array<{ value: string; row: number; col: number }[]> }>;
  onDataChange?: (data: Array<{ prevRow: Array<{ value: string; row: number; col: number }>; data: Array<{ value: string; row: number; col: number }[]> }>) => void;
}

const ThreeDSpreadsheet = forwardRef<
  { 
    handleRunFind: () => Promise<void>; 
    handleRunCells: () => Promise<void>;
    getHeaders: () => string[];
  },
  ThreeDSpreadsheetProps
>(({ data, onDataChange }, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSheet, setActiveSheet] = useState<number | null>(null);
  const [sheetData, setSheetData] = useState<Array<Array<Array<{ value: string; row: number; col: number }>>>>([]);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 2 }); // Track visible sheets
  const [headers, setHeaders] = useState<string[]>(['Find all items']);
  const [showRunDropdown, setShowRunDropdown] = useState(false);
  const [title, setTitle] = useState('3D Spreadsheet');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isRunningFind, setIsRunningFind] = useState(false);
  const [isRunningCells, setIsRunningCells] = useState(false);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sidebarItems, setSidebarItems] = useState<string[]>([]);
  const [loadingSheets, setLoadingSheets] = useState<{ [key: number]: boolean }>({});
  
  // Initialize sheet data and names from source data
  useEffect(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return;

    // Create sheet data from each data item
    const newSheetData = data.map(item => item.data); // Use the data array directly
    setSheetData(newSheetData);

    // Calculate sheet names from the data
    const newSheetNames = data.map(item => {
      const firstRow = item.prevRow;
      const firstColumnCell = firstRow.find(cell => cell.col === 0);
      return firstColumnCell?.value || 'Untitled Sheet';
    });
    setSheetNames(newSheetNames);

    // Calculate sidebar items from the data
    const newSidebarItems = data.map(item => {
      const firstRow = item.prevRow;
      const firstColumnCell = firstRow.find(cell => cell.col === 0);
      return firstColumnCell?.value || 'Untitled';
    });
    setSidebarItems(newSidebarItems);
  }, [data]);

  // Update visible range when active sheet changes
  useEffect(() => {
    if (isExpanded && activeSheet !== null) {
      setVisibleRange({
        start: Math.max(0, activeSheet - 2),
        end: Math.min(sheetNames.length - 1, activeSheet)
      });
    }
  }, [activeSheet, isExpanded, sheetNames.length]);

  const handleHeaderChange = (sheetIndex: number, colIndex: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[colIndex] = value;
    setHeaders(newHeaders);
  };

  const handleCellChange = (sheetIndex: number, row: number, col: number, value: string) => {
    const newSheetData = [...sheetData];
    
    // Initialize sheet if it doesn't exist
    if (!newSheetData[sheetIndex]) {
      newSheetData[sheetIndex] = [];
    }
    
    // Initialize row if it doesn't exist
    if (!newSheetData[sheetIndex][row]) {
      newSheetData[sheetIndex][row] = [];
    }
    
    // Initialize cell if it doesn't exist
    if (!newSheetData[sheetIndex][row][col]) {
      newSheetData[sheetIndex][row][col] = {
        value: '',
        row,
        col
      };
    }
    
    newSheetData[sheetIndex][row][col].value = value;
    setSheetData(newSheetData);
    
    // Call onDataChange with updated data
    if (onDataChange) {
      const newData = data.map((item, idx) => {
        if (idx === sheetIndex) {
          return {
            prevRow: item.prevRow,
            data: newSheetData[idx]
          };
        }
        return item;
      });
      onDataChange(newData);
    }
  };

  const handleAddRow = (sheetIndex: number) => {
    const newSheetData = [...sheetData];
    const currentSheet = newSheetData[sheetIndex];
    const newRow = headers.map((_, colIndex) => ({
      value: '',
      row: currentSheet.length,
      col: colIndex
    }));
    currentSheet.push(newRow);
    setSheetData(newSheetData);

    // Call onDataChange with updated data
    if (onDataChange) {
      const newData = data.map((item, idx) => ({
        prevRow: item.prevRow,
        data: idx === sheetIndex ? newSheetData[idx] : item.data
      }));
      onDataChange(newData);
    }
  };

  const handleAddColumn = (sheetIndex: number) => {
    // Add new header
    const newHeaders = [...headers, `Column ${headers.length + 1}`];
    setHeaders(newHeaders);
    
    // Add new column to each row in the sheet
    const newSheetData = [...sheetData];
    newSheetData[sheetIndex] = newSheetData[sheetIndex].map((row, rowIndex) => [
      ...row,
      { value: '', row: rowIndex, col: row.length }
    ]);
    setSheetData(newSheetData);

    // Call onDataChange with updated data
    if (onDataChange) {
      const newData = data.map((item, idx) => ({
        prevRow: item.prevRow,
        data: idx === sheetIndex ? newSheetData[idx] : item.data
      }));
      onDataChange(newData);
    }
  };

  const handleDeleteColumn = (sheetIndex: number, colIndex: number) => {
    if (headers.length <= 1) return; // Don't delete the last column
    
    // Remove header
    const newHeaders = headers.filter((_, i) => i !== colIndex);
    setHeaders(newHeaders);
    
    // Remove column from each row
    const newSheetData = [...sheetData];
    newSheetData[sheetIndex] = newSheetData[sheetIndex].map(row => 
      row.filter((_, i) => i !== colIndex)
        .map((cell, i) => ({ ...cell, col: i }))
    );
    setSheetData(newSheetData);

    // Call onDataChange with updated data
    if (onDataChange) {
      const newData = data.map((item, idx) => ({
        prevRow: item.prevRow,
        data: idx === sheetIndex ? newSheetData[idx] : item.data
      }));
      onDataChange(newData);
    }
  };

  const handleDeleteRow = (sheetIndex: number, rowIndex: number) => {
    const newSheetData = [...sheetData];
    newSheetData[sheetIndex] = newSheetData[sheetIndex]
      .filter((_, i) => i !== rowIndex)
      .map((row, newRowIndex) => 
        row.map(cell => ({ ...cell, row: newRowIndex }))
      );
    setSheetData(newSheetData);

    // Call onDataChange with updated data
    if (onDataChange) {
      const newData = data.map((item, idx) => ({
        prevRow: item.prevRow,
        data: idx === sheetIndex ? newSheetData[idx] : item.data
      }));
      onDataChange(newData);
    }
  };

  const handleRunFind = async () => {
    setIsRunningFind(true);
    setLoadingSheets(sheetData.reduce((acc, _, idx) => ({ ...acc, [idx]: true }), {}));
    try {
      // For each sheet, make a findall API call
      const promises = data.map(async (sheet, sheetIndex) => {
        // Get the first column value as the query
        const firstColumnCell = sheet.prevRow.find(cell => cell.col === 0);
        if (!firstColumnCell) return null;

        const response = await fetch('/api/findall', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `${headers[0]} for: ${firstColumnCell.value}`,
            sheet_level: true
          }),
        });

        if (!response.ok) throw new Error('Failed to run search');
        
        const { results } = await response.json();
        
        // Create rows from the results
        const newRows = results.map((result: string, rowIndex: number) => 
          headers.map((_, colIndex) => ({
            value: colIndex === 0 ? result : '',
            row: rowIndex,
            col: colIndex
          }))
        );

        return {
          prevRow: sheet.prevRow,
          data: newRows
        };
      });

      const updates = (await Promise.all(promises)).filter(Boolean);
      
      // Update the sheet data
      const newSheetData = updates.map(update => update?.data || []);
      setSheetData(newSheetData);

      // Call onDataChange with the complete data structure
      if (onDataChange) {
        const newData = updates.map(update => ({
          prevRow: update?.prevRow || [],
          data: update?.data || []
        }));
        onDataChange(newData);
      }
    } catch (error) {
      console.error('Error running search:', error);
    } finally {
      setIsRunningFind(false);
      setShowRunDropdown(false);
      setLoadingSheets({});
    }
  };

  const handleRunCells = async () => {
    setIsRunningCells(true);
    setLoadingSheets(sheetData.reduce((acc, _, idx) => ({ ...acc, [idx]: true }), {}));
    try {
      // For each sheet, make a runCells API call
      const promises = data.map(async (sheet, sheetIndex) => {
        // Get the first column value as input from sourceData
        const firstColumnCell = sheet.prevRow.find(cell => cell.col === 0);
        if (!firstColumnCell) return null;

        // Create columns object from headers
        const columns = headers.reduce((acc, header, index) => {
          acc[header] = ''; // Empty string as initial value
          return acc;
        }, {} as { [key: string]: string });

        // For each row in the sheet, make a runCells API call
        const rowPromises = sheetData[sheetIndex].map(async (row, rowIndex) => {
          const response = await fetch('/api/runCells', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: row[0]?.value || firstColumnCell.value, // Use row's first column value if exists, otherwise use sheet's first column
              columns
            }),
          });

          if (!response.ok) throw new Error('Failed to run cells');
          
          const responseData = await response.json();
          
          if (responseData.success && responseData.results) {
            return Object.entries(responseData.results).map(([colName, value], colIndex) => ({
              value: colIndex === 0 ? row[0]?.value || firstColumnCell.value : value as string,
              row: rowIndex,
              col: colIndex
            }));
          }
          return row;
        });

        const newRows = await Promise.all(rowPromises);
        return {
          prevRow: sheet.prevRow,
          data: newRows
        };
      });

      const updates = (await Promise.all(promises)).filter(Boolean);
      
      // Update the sheet data
      const newSheetData = updates.map(update => update?.data || []);
      setSheetData(newSheetData);

      // Call onDataChange with the complete data structure
      if (onDataChange) {
        const newData = updates.map(update => ({
          prevRow: update?.prevRow || [],
          data: update?.data || []
        }));
        onDataChange(newData);
      }
    } catch (error) {
      console.error('Error running cells:', error);
    } finally {
      setIsRunningCells(false);
      setShowRunDropdown(false);
      setLoadingSheets({});
    }
  };

  useImperativeHandle(ref, () => ({
    handleRunFind,
    handleRunCells,
    getHeaders: () => headers
  }));

  return (
    <div className={`
      ${isExpanded 
        ? 'fixed inset-0 !pointer-events-auto z-[99999] bg-gray-50/80' 
        : 'w-full h-full overflow-hidden'}
      transition-all duration-200
    `}>
      <div className={`
        ${isExpanded ? 'absolute inset-4' : 'relative w-full h-full'}
        bg-white border border-gray-200/80 overflow-hidden
      `}>
        <div className="px-6 py-4 border-b border-gray-200/80 bg-white flex items-center justify-between sticky top-0 z-[102]">
          <div className="flex-1">
            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTitle(false);
                  }
                }}
                placeholder="Enter spreadsheet name..."
                className="w-full px-0 font-medium text-gray-700 bg-transparent border-none 
                  focus:outline-none focus:ring-0 placeholder-gray-400"
                autoFocus
              />
            ) : (
              <h3 
                className="font-medium text-gray-700 cursor-text hover:text-gray-900"
                onClick={() => setIsEditingTitle(true)}
              >
                {title}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-4 py-2 text-gray-600 font-medium
                hover:bg-gray-50 transition-colors duration-150 flex items-center gap-2"
            >
              {isExpanded ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 14h6m-6-4h6m6 0h4m-4 4h4m-10 4l-6-6 6-6" />
                  </svg>
                  Collapse
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Expand
                </>
              )}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowRunDropdown(!showRunDropdown)}
                className="px-4 py-2 bg-indigo-500 text-white font-medium
                  hover:bg-indigo-600 transition-colors duration-150 flex items-center gap-2
                  shadow-sm hover:shadow active:translate-y-[1px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run
              </button>
              
              {showRunDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg border border-gray-200 py-1 z-[103]">
                  <button
                    onClick={handleRunFind}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 
                      transition-colors duration-150 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Run Find
                  </button>
                  <button
                    onClick={handleRunCells}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 
                      transition-colors duration-150 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h7" />
                    </svg>
                    Run Cells
                  </button>
                </div>
              )}
            </div>
            {isExpanded && (
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-gray-100 text-gray-600 
                  hover:text-gray-900 transition-colors duration-150"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        <div className={`
          relative 
          ${isExpanded 
            ? 'h-[calc(100%-4rem)] p-8 pl-5 pb-12' 
            : 'h-[calc(100%-4rem)] pr-8 pb-10 pl-6 pt-4 overflow-hidden'}
        `}>
          {/* Sidebar */}
          {isExpanded && (
            <div className="fixed left-4 top-[4.5rem] bottom-4 w-64 bg-white border-r border-gray-200/80 p-4 overflow-y-auto z-[101] rounded-l-xl">
              <h4 className="font-medium text-gray-700 mb-4"></h4>
              <div className="space-y-2">
                {sidebarItems.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => setActiveSheet(index)}
                    className={`
                      p-2 cursor-pointer transition-colors duration-150
                      ${activeSheet === index 
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                        : 'hover:bg-gray-50 text-gray-600 border border-transparent'}
                    `}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Stack of sheets */}
          <div className={`
            relative h-full
            ${isExpanded 
              ? 'ml-64 w-[calc(100%-16rem)]' 
              : 'w-full'}
          `}>
            <div className="relative w-full h-full min-h-[300px]">
              {sheetNames.length > 0 && sheetNames
                .slice(isExpanded ? visibleRange.start : visibleRange.start, isExpanded ? visibleRange.end + 1 : visibleRange.end + 1)
                .map((name, index) => {
                const totalSheets = Math.min(3, isExpanded ? visibleRange.end - visibleRange.start + 1 : sheetNames.length);
                const actualIndex = isExpanded ? index + visibleRange.start : index + visibleRange.start;
                
                // Determine stacking position based on active state
                let stackPosition = index;
                if (activeSheet === actualIndex) {
                  stackPosition = 0;
                } else if (index <= (activeSheet !== null ? totalSheets - 1 : totalSheets - 1)) {
                  stackPosition = index + (activeSheet !== null && index >= 0 ? 1 : 0);
                }
                
                const offset = isExpanded ? stackPosition * 24 : stackPosition * 8; // Even smaller offset when not expanded
                
                return (
                  <div
                    key={actualIndex}
                    className={`
                      absolute inset-0 bg-white border border-gray-200 shadow-sm p-4
                      transition-all duration-300 
                      ${!isExpanded ? 'overflow-hidden' : ''} 
                      hover:shadow-md
                      ${activeSheet === actualIndex ? 'ring-2 ring-indigo-400 shadow-lg !translate-y-0 z-[60]' : 'pointer-events-none'}
                    `}
                    style={{
                      transform: `translate(${offset}px, ${offset}px)`,
                      zIndex: totalSheets - stackPosition,
                      opacity: stackPosition < 3 ? 1 - (stackPosition * 0.1) : 0,
                    }}
                  >
                    <h4 className="font-medium text-gray-700 mb-4">{name}</h4>
                    
                    <div className={`
                      mt-4 
                      ${isExpanded 
                        ? 'h-[calc(100%-4rem)]' 
                        : 'h-[calc(100%-4rem)] overflow-auto'}
                    `}>
                      <Spreadsheet
                        data={sheetData[actualIndex] || []}
                        headers={headers}
                        onHeaderChange={(colIndex, value) => handleHeaderChange(actualIndex, colIndex, value)}
                        onCellChange={(row, col, value) => handleCellChange(actualIndex, row, col, value)}
                        onAddRow={() => handleAddRow(actualIndex)}
                        onAddColumn={() => handleAddColumn(actualIndex)}
                        onDeleteColumn={(colIndex) => handleDeleteColumn(actualIndex, colIndex)}
                        onDeleteRow={(rowIndex) => handleDeleteRow(actualIndex, rowIndex)}
                        firstColumnWidth="min-w-[8rem] max-w-[8rem]"
                        isLoading={loadingSheets[actualIndex]}
                      />
                    </div>
                  </div>
                );
              })}
              
              {sheetNames.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-500">No sheets available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ThreeDSpreadsheet;