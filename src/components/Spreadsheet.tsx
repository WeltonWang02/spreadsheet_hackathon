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
  onAddRow
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
          query: `${cornerValue} ${headers[colIndex] || sheetName}`,
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

  const handleRunAllColumns = async () => {
    try {
      const promises = headers.map(header => 
        fetch('/api/findall', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `${cornerValue} ${header}`,
          }),
        })
      );

      await Promise.all(promises);
      setContextMenu(null);
    } catch (error) {
      console.error('Error running all columns:', error);
    }
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
    <div className="overflow-x-auto">
      <table className="border-collapse">
        <thead>
          <tr>
            {/* Editable Corner */}
            <th 
              className="min-w-[8rem] h-8 bg-gray-50 border border-gray-200 p-0 transition-colors hover:bg-gray-100"
              onClick={handleCornerClick}
            >
              {isEditingCorner ? (
                <input
                  type="text"
                  value={cornerValue}
                  onChange={(e) => setCornerValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  className="w-full h-full px-3 text-center bg-white border-none 
                    focus:outline-none focus:ring-2 focus:ring-indigo-400/30
                    text-gray-700 font-medium"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="w-full h-full px-2 cursor-text text-center text-gray-600 font-medium">
                  {cornerValue}
                </div>
              )}
            </th>
            {headers.map((header, index) => (
              <th 
                key={index} 
                className="w-24 h-8 bg-gray-50 border border-gray-200 p-0 transition-colors hover:bg-gray-100"
                onClick={() => handleHeaderClick(index)}
                onContextMenu={(e) => handleContextMenu(e, undefined, index, true)}
              >
                {editingHeader === index ? (
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => handleHeaderChange(index, e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    className="w-full h-full px-3 text-center bg-white border-none 
                      focus:outline-none focus:ring-2 focus:ring-indigo-400/30
                      text-gray-700 font-medium"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="w-full h-full px-2 cursor-text text-center text-gray-600 font-medium">
                    {header}
                  </div>
                )}
              </th>
            ))}
            {/* Add Column Button */}
            <th className="w-12 h-8 bg-gray-50 border border-gray-200 p-0">
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
            <tr key={rowIndex}>
              <td 
                className="min-w-[8rem] h-8 bg-gray-50 border border-gray-200 text-gray-600 cursor-context-menu"
                onContextMenu={(e) => handleContextMenu(e, rowIndex, 0)}
              >
                <input
                  type="text"
                  value={row[0]?.value || ''}
                  onChange={(e) => onCellChange?.(rowIndex, 0, e.target.value)}
                  className="w-full h-full focus:outline-none focus:ring-1 focus:ring-indigo-400/30
                    text-gray-700 bg-transparent px-2"
                />
              </td>
              {headers.map((_, colIndex) => (
                <td
                  key={colIndex}
                  className="w-24 h-8 border border-gray-200 px-2"
                  onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex + 1)}
                >
                  <input
                    type="text"
                    value={row[colIndex + 1]?.value || ''}
                    onChange={(e) => onCellChange?.(rowIndex, colIndex + 1, e.target.value)}
                    className="w-full h-full focus:outline-none focus:ring-1 focus:ring-indigo-400/30
                      text-gray-700 bg-transparent"
                  />
                </td>
              ))}
            </tr>
          ))}
          {/* Add Row Button */}
          <tr>
            <td 
              colSpan={headers.length + 2}
              className="h-8 border border-gray-200"
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

      {/* Enhanced Context Menu */}
      {contextMenu && (
        <div 
          className="context-menu fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          style={{ 
            left: `${contextMenu.x}px`, 
            top: `${contextMenu.y}px`,
            minWidth: '200px',
            transform: 'translate(8px, -50%)',
            position: 'fixed'
          }}
        >
          {contextMenu.colIndex === 0 ? (
            // First column context menu
            <>
              <div className="px-4 py-2 text-sm font-medium text-gray-500 bg-gray-50">
                {cornerValue}
              </div>
              <div className="py-1 border-b border-gray-200">
                <div className="px-4 py-1 text-xs font-medium text-gray-500">This Sheet</div>
                <button
                  onClick={() => handleRunColumn(0)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 
                    transition-colors duration-150 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Run Column
                </button>
              </div>
              <div className="py-1">
                <div className="px-4 py-1 text-xs font-medium text-gray-500">All Sheets</div>
                <button
                  onClick={() => handleRunColumn(0)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 
                    transition-colors duration-150 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Run Column
                </button>
              </div>
            </>
          ) : (
            // Other columns context menu
            <>
              <div className="px-4 py-2 text-sm font-medium text-gray-500 bg-gray-50">
                {headers[contextMenu.colIndex ? contextMenu.colIndex - 1 : 0]}
              </div>
              <div className="py-1 border-b border-gray-200">
                <div className="px-4 py-1 text-xs font-medium text-gray-500">This Sheet</div>
                <button
                  onClick={() => contextMenu.colIndex !== undefined && handleRunColumn(contextMenu.colIndex)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 
                    transition-colors duration-150 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Run Column
                </button>
                <button
                  onClick={handleRunAllColumns}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 
                    transition-colors duration-150 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run All Columns
                </button>
              </div>
              <div className="py-1">
                <div className="px-4 py-1 text-xs font-medium text-gray-500">All Sheets</div>
                <button
                  onClick={() => contextMenu.colIndex !== undefined && handleRunColumn(contextMenu.colIndex)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 
                    transition-colors duration-150 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Run Column
                </button>
                <button
                  onClick={handleRunAllColumns}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 
                    transition-colors duration-150 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run All Columns
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
} 