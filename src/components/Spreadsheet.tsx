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

  const handleHeaderClick = (colIndex: number) => {
    setEditingHeader(colIndex);
  };

  const handleHeaderChange = (colIndex: number, value: string) => {
    onHeaderChange?.(colIndex, value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setEditingHeader(null);
    }
  };

  const handleBlur = () => {
    setEditingHeader(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="w-10 h-8 bg-gray-100 border border-gray-300"></th>
            {headers.map((header, index) => (
              <th 
                key={index} 
                className="w-24 h-8 bg-gray-100 border border-gray-300 p-0"
                onClick={() => handleHeaderClick(index)}
              >
                {editingHeader === index ? (
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => handleHeaderChange(index, e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    className="w-full h-full px-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    autoFocus
                  />
                ) : (
                  <div className="w-full h-full px-2 cursor-pointer text-center">
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
              <td className="w-10 h-8 bg-gray-100 border border-gray-300 text-center">
                {rowIndex + 1}
              </td>
              {row.map((cell, colIndex) => (
                <td
                  key={colIndex}
                  className="w-24 h-8 border border-gray-300 px-2"
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