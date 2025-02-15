'use client';

import React, { useState } from 'react';

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
}

export default function Spreadsheet({ 
  initialRows = 10, 
  initialCols = 5,
  data = [],
  headers = [],
  onHeaderChange
}: SpreadsheetProps) {
  const [editingHeader, setEditingHeader] = useState<number | null>(null);
  const [cornerValue, setCornerValue] = useState("ID");
  const [isEditingCorner, setIsEditingCorner] = useState(false);

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
              <td className="w-16 h-8 bg-gray-50 border border-gray-200 text-center text-gray-600">
                {rowIndex + 1}
              </td>
              {row.map((cell, colIndex) => (
                <td
                  key={colIndex}
                  className="w-24 h-8 border border-gray-200 px-2"
                >
                  <div className="w-full h-full overflow-hidden whitespace-nowrap">
                    {cell.value}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 