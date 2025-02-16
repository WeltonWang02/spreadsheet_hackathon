'use client';

import React from 'react';

interface ThreeDSpreadsheetProps {
  initialRows?: number;
  initialCols?: number;
  sourceData?: Array<{ value: string; row: number; col: number }>[];
}

export default function ThreeDSpreadsheet({ 
  sourceData = []
}: ThreeDSpreadsheetProps) {
  // Filter out empty rows and get unique sheet names from the first column
  const sheetNames = sourceData
    .map(row => row[0]?.value || '')
    .filter(Boolean);

  return (
    <div className="w-full h-full bg-white rounded-xl shadow-lg border border-gray-200/80 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200/80 bg-white">
        <h3 className="font-medium text-gray-700">3D Spreadsheet</h3>
      </div>
      
      <div className="relative h-[calc(100%-4rem)] p-8">
        {/* Stack of sheets */}
        <div className="relative w-full h-full">
          {sheetNames.map((name, index) => {
            const totalSheets = sheetNames.length;
            const offset = (totalSheets - 1 - index) * 4; // 4px offset between sheets
            
            return (
              <div
                key={index}
                className="absolute inset-0 bg-white border border-gray-200 rounded-lg shadow-sm p-4
                  transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                style={{
                  transform: `translate(${offset}px, ${offset}px)`,
                  zIndex: index
                }}
              >
                <h4 className="font-medium text-gray-700">{name}</h4>
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
  );
} 