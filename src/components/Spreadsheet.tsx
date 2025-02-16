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
}

export default function Spreadsheet({ 
  initialRows = 10, 
  initialCols = 5,
  data = [],
  headers = [],
  onHeaderChange,
  onCellChange,
  sheetName
}: SpreadsheetProps) {
  const [editingHeader, setEditingHeader] = useState<number | null>(null);
  const [cornerValue, setCornerValue] = useState("ID");
  const [isEditingCorner, setIsEditingCorner] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowIndex: number } | null>(null);

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

  const handleContextMenu = (e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      rowIndex
    });
  };

  const handleRunColumn = async (rowIndex: number) => {
    try {
      const response = await fetch('/api/findall', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `${cornerValue} ${sheetName}`,
        }),
      });

      if (!response.ok) throw new Error('Failed to run column search');

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
              className="w-16 h-8 bg-gray-50 border border-gray-200 p-0 transition-colors hover:bg-gray-100"
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
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <td 
                className="w-16 h-8 bg-gray-50 border border-gray-200 text-center text-gray-600 cursor-context-menu"
                onContextMenu={(e) => handleContextMenu(e, rowIndex)}
              >
                {rowIndex + 1}
              </td>
              {row.map((cell, colIndex) => (
                <td
                  key={colIndex}
                  className="w-24 h-8 border border-gray-200 px-2"
                >
                  <input
                    type="text"
                    value={cell.value}
                    onChange={(e) => onCellChange?.(rowIndex, colIndex, e.target.value)}
                    className="w-full h-full focus:outline-none focus:ring-1 focus:ring-indigo-400/30
                      text-gray-700 bg-transparent"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="context-menu fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          style={{ 
            left: `${contextMenu.x}px`, 
            top: `${contextMenu.y}px`,
            minWidth: '160px',
            transform: 'translate(8px, -50%)',
            position: 'fixed'
          }}
        >
          <button
            onClick={() => handleRunColumn(contextMenu.rowIndex)}
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
      )}
    </div>
  );
} 