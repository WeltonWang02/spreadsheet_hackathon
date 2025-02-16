'use client';

import React, { useState, useEffect } from 'react';
import Spreadsheet from './Spreadsheet';

interface ThreeDSpreadsheetProps {
  initialRows?: number;
  initialCols?: number;
  sourceData?: Array<{ value: string; row: number; col: number }>[];
}

export default function ThreeDSpreadsheet({ 
  sourceData = []
}: ThreeDSpreadsheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSheet, setActiveSheet] = useState<number | null>(null);
  const [sheetData, setSheetData] = useState<Array<Array<Array<{ value: string; row: number; col: number }>>>>([]);
  const [headers, setHeaders] = useState<string[]>(['Find all items']);
  
  // Initialize sheet data from source data
  useEffect(() => {
    if (sourceData.length === 0) return;

    // Create empty sheet data for each source row
    const newSheetData = sourceData.map(() => {
      // Create 5 empty rows for each sheet
      return Array(1).fill(null).map((_, rowIndex) => 
        headers.map((_, colIndex) => ({
          value: '',
          row: rowIndex,
          col: colIndex
        }))
      );
    });

    setSheetData(newSheetData);
  }, [sourceData, headers]);

  // Get sheet headers from the complete row data of source
  const sheetNames = sourceData.map(row => {
    // Combine all cell values from the row to create the header
    return row
      .sort((a, b) => a.col - b.col) // Sort by column to maintain order
      .map(cell => cell.value)
      .filter(Boolean)
      .join(' - ') || 'Untitled Sheet';
  });

  const handleHeaderChange = (sheetIndex: number, colIndex: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[colIndex] = value;
    setHeaders(newHeaders);
  };

  const handleCellChange = (sheetIndex: number, row: number, col: number, value: string) => {
    const newSheetData = [...sheetData];
    if (!newSheetData[sheetIndex]) {
      newSheetData[sheetIndex] = [];
    }
    if (!newSheetData[sheetIndex][row]) {
      newSheetData[sheetIndex][row] = Array(headers.length).fill(null).map((_, colIndex) => ({
        value: '',
        row,
        col: colIndex
      }));
    }
    newSheetData[sheetIndex][row][col].value = value;
    setSheetData(newSheetData);
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
  };

  const handleDeleteRow = (sheetIndex: number, rowIndex: number) => {
    const newSheetData = [...sheetData];
    newSheetData[sheetIndex] = newSheetData[sheetIndex]
      .filter((_, i) => i !== rowIndex)
      .map((row, newRowIndex) => 
        row.map(cell => ({ ...cell, row: newRowIndex }))
      );
    setSheetData(newSheetData);
  };

  return (
    <div className={`
      ${isExpanded 
        ? 'fixed inset-4 !pointer-events-auto z-50' 
        : 'w-full h-full'}
      bg-white rounded-xl shadow-lg border border-gray-200/80 overflow-hidden
      transition-all duration-200
    `}>
      <div className="px-6 py-4 border-b border-gray-200/80 bg-white flex items-center justify-between">
        <h3 className="font-medium text-gray-700">3D Spreadsheet</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 text-gray-600 rounded-lg font-medium
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
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/findall', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    query: 'Run all sheets',
                    sheet_level: true
                  }),
                });

                if (!response.ok) throw new Error('Failed to run search');
              } catch (error) {
                console.error('Error running search:', error);
              }
            }}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium
              hover:bg-indigo-600 transition-colors duration-150 flex items-center gap-2
              shadow-sm hover:shadow active:translate-y-[1px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Run All
          </button>
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 
                hover:text-gray-900 transition-colors duration-150"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      <div className="relative h-[calc(100%-4rem)] p-8">
        {/* Stack of sheets */}
        <div className="relative w-full h-full">
          {sheetNames.map((name, index) => {
            const totalSheets = sheetNames.length;
            const offset = (totalSheets - 1 - index) * 4;
            
            return (
              <div
                key={index}
                onClick={() => {
                  if (!isExpanded) return;
                  setActiveSheet(activeSheet === index ? null : index);
                }}
                className={`
                  absolute inset-0 bg-white border border-gray-200 rounded-lg shadow-sm p-4
                  transition-all duration-200 hover:-translate-y-1 hover:shadow-md
                  ${isExpanded ? 'cursor-pointer' : ''}
                  ${activeSheet === index ? 'ring-2 ring-indigo-400 shadow-lg !translate-y-0' : ''}
                `}
                style={{
                  transform: `translate(${offset}px, ${offset}px)`,
                  zIndex: activeSheet === index ? 999 : index
                }}
              >
                <h4 className="font-medium text-gray-700 mb-4">{name}</h4>
                
                {/* Show spreadsheet when expanded and active */}
                {/* {activeSheet === index && ( */}
                  <div className="mt-4 h-[calc(100%-4rem)] overflow-auto">
                    <Spreadsheet
                      data={sheetData[index] || []}
                      headers={headers}
                      onHeaderChange={(colIndex, value) => handleHeaderChange(index, colIndex, value)}
                      onCellChange={(row, col, value) => handleCellChange(index, row, col, value)}
                      onAddRow={() => handleAddRow(index)}
                      onAddColumn={() => handleAddColumn(index)}
                      onDeleteColumn={(colIndex) => handleDeleteColumn(index, colIndex)}
                      onDeleteRow={(rowIndex) => handleDeleteRow(index, rowIndex)}
                      firstColumnWidth="min-w-[8rem] max-w-[8rem]"
                    />
                  </div>
                {/* )} */}
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