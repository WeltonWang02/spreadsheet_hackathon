'use client';

import React, { useState, useEffect } from 'react';

interface CellData {
  value: string;
  row: number;
  col: number;
}

interface SpreadsheetProps {
  initialRows?: number;
  initialCols?: number;
  data?: CellData[][];
  headers?: string[];
  onHeaderChange?: (colIndex: number, value: string) => void;
  onCellChange?: (row: number, col: number, value: string) => void;
  sheetName?: string;
  isSidebarOpen?: boolean;
  onBulkUpdate?: (updates: { row: number; col: number; value: string }[]) => void;
  onAddColumn?: () => void;
  onAddRow?: () => void;
  onRunColumnAllSheets?: (colIndex: number, cornerValue: string) => void;
  onDeleteColumn?: (colIndex: number) => void;
  onDeleteRow?: (rowIndex: number) => void;
  renderRowPrefix?: (rowIndex: number) => React.ReactNode;
}

export default function Spreadsheet({ 
  initialRows = 10, 
  initialCols = 5,
  data = [],
  headers = [],
  onHeaderChange,
  onCellChange,
  sheetName,
  isSidebarOpen,
  onBulkUpdate,
  onAddColumn,
  onAddRow,
  onRunColumnAllSheets,
  onDeleteColumn,
  onDeleteRow,
  renderRowPrefix
}: SpreadsheetProps) {
  const [editingHeader, setEditingHeader] = useState<number | null>(null);
  const [cornerValue, setCornerValue] = useState("ID");
  const [isEditingCorner, setIsEditingCorner] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ 
    x: number; 
    y: number; 
    rowIndex?: number;
    colIndex?: number;
    isHeader?: boolean;
  } | null>(null);

  const handleHeaderClick = (colIndex: number) => {
    setEditingHeader(colIndex);
    setIsEditingCorner(false);
  };

  const handleHeaderChange = (colIndex: number, value: string) => {
    onHeaderChange?.(colIndex, value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setEditingHeader(null);
      setIsEditingCorner(false);
    }
  };

  const handleBlur = () => {
    setEditingHeader(null);
    setIsEditingCorner(false);
  };

  const handleCornerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingCorner(true);
    setEditingHeader(null);
  };

  const handleContextMenu = (e: React.MouseEvent, rowIndex?: number, colIndex?: number, isHeader: boolean = false) => {
    e.preventDefault();
    const sidebarWidth = isSidebarOpen ? 320 : 0;
    const topOffset = isSidebarOpen ? 96 : 0;
    setContextMenu({
      x: e.clientX - sidebarWidth,
      y: e.clientY - topOffset,
      rowIndex,
      colIndex,
      isHeader
    });
  };

  const handleRunColumn = async (colIndex: number) => {
    try {
      const response = await fetch('/api/findall', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: colIndex === 0 ? `${cornerValue} ${sheetName}` : `${cornerValue} ${headers[colIndex - 1]}`,
          sheet_level: true
        }),
      });

      if (!response.ok) throw new Error('Failed to run column search');
      
      const { results } = await response.json();
      
      const updates = results.map((result: string, index: number) => ({
        row: index,
        col: colIndex,
        value: result
      }));

      onBulkUpdate?.(updates);
      setContextMenu(null);
    } catch (error) {
      console.error('Error running column search:', error);
    }
  };

  const handleRunColumnAllSheets = (colIndex: number) => {
    onRunColumnAllSheets?.(colIndex, cornerValue);
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu && !(e.target as Element).closest('.context-menu')) {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  return (
    <div className="w-fit">
      <table className="border-collapse w-fit">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th 
                key={index} 
                className="group relative w-48 h-8 bg-gray-50 border border-gray-200 p-0 transition-colors hover:bg-gray-100"
              >
                <div className="flex items-center h-full">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={header}
                      onChange={(e) => onHeaderChange?.(index, e.target.value)}
                      placeholder="Enter column name..."
                      className="w-full h-full px-3 text-center bg-transparent border-none 
                        focus:outline-none focus:ring-2 focus:ring-indigo-400/30
                        text-gray-700 font-medium placeholder-gray-400"
                    />
                  </div>
                  {headers.length > 1 && (
                    <button
                      onClick={() => onDeleteColumn?.(index)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 
                        text-gray-400 hover:text-red-500 rounded transition-all duration-150"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </th>
            ))}
            {/* Add Column Button */}
            <th className="w-12 h-8 bg-gray-50 border border-gray-200 p-0 sticky right-0">
              <button
                onClick={onAddColumn}
                className="w-full h-full flex items-center justify-center text-gray-400 
                  hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="group">
              {headers.map((_, colIndex) => (
                <td
                  key={colIndex}
                  className={`w-48 h-8 border border-gray-200 px-2 ${colIndex === 0 ? 'bg-gray-50' : ''}`}
                >
                  <input
                    type="text"
                    value={row[colIndex]?.value || ''}
                    onChange={(e) => onCellChange?.(rowIndex, colIndex, e.target.value)}
                    className={`w-full h-full focus:outline-none focus:ring-1 focus:ring-indigo-400/30
                      text-gray-700 bg-transparent ${colIndex === 0 ? 'font-medium' : ''}`}
                  />
                </td>
              ))}
              <td className="w-12 h-8 border border-gray-200 p-0 sticky right-0 bg-white">
                <button
                  onClick={() => onDeleteRow?.(rowIndex)}
                  className="opacity-0 group-hover:opacity-100 w-full h-full flex items-center 
                    justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 
                    transition-all duration-150"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
          {/* Add Row Button */}
          <tr>
            <td 
              colSpan={headers.length + 1}
              className="h-8 border border-gray-200 sticky bottom-0 bg-white"
            >
              <button
                onClick={onAddRow}
                className="w-full h-full flex items-center justify-center text-gray-400 
                  hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
} 