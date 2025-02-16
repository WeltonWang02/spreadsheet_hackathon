import React, { useState } from 'react';
import Spreadsheet from '@/components/Spreadsheet';

interface SingleSpreadsheetProps {
  onRowsChanged?: (rows: any[]) => void;
}

export function SingleSpreadsheet({
  onRowsChanged,
}: SingleSpreadsheetProps) {
  const [data, setData] = useState<Array<Array<{ value: string; row: number; col: number }>>>([]);
  const [headers, setHeaders] = useState<string[]>(['Name']);
  const [title, setTitle] = useState('Source Spreadsheet');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const handleCellChange = (row: number, col: number, value: string) => {
    const newData = [...data];
    if (!newData[row]) {
      newData[row] = Array(headers.length).fill(null).map((_, colIndex) => ({
        value: '',
        row,
        col: colIndex
      }));
    }
    newData[row][col].value = value;
    setData(newData);
    onRowsChanged?.(newData);
  };

  const handleAddRow = () => {
    const newRow = headers.map((_, colIndex) => ({
      value: '',
      row: data.length,
      col: colIndex
    }));
    setData([...data, newRow]);
  };

  const handleAddColumn = () => {
    const newHeaders = [...headers, `Column ${headers.length + 1}`];
    setHeaders(newHeaders);
    
    // Add empty values for the new column in all existing rows
    const newData = data.map(row => [
      ...row,
      { value: '', row: row[0].row, col: row[0].col + 1 }
    ]);
    setData(newData);
  };

  const handleDeleteColumn = (colIndex: number) => {
    if (headers.length <= 1) return; // Don't delete the last column
    
    const newHeaders = headers.filter((_, i) => i !== colIndex);
    setHeaders(newHeaders);
    
    // Remove the column from all rows
    const newData = data.map(row => 
      row.filter((_, i) => i !== colIndex)
        .map((cell, i) => ({ ...cell, col: i }))
    );
    setData(newData);
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newData = data.filter((_, i) => i !== rowIndex)
      .map((row, newRowIndex) => 
        row.map(cell => ({ ...cell, row: newRowIndex }))
      );
    setData(newData);
  };

  const handleHeaderChange = (colIndex: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[colIndex] = value;
    setHeaders(newHeaders);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200/80 overflow-hidden w-fit min-w-full">
      <div className="px-6 py-4 border-b border-gray-200/80 bg-white flex items-center justify-between">
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
        <button
          onClick={async () => {
            try {
              const response = await fetch('/api/findall', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  query: title,
                  sheet_level: true
                }),
              });

              if (!response.ok) throw new Error('Failed to run search');
              
              const { results } = await response.json();
              
              // Update all rows with the results
              const updates = results.map((result: string, index: number) => {
                const newRow = headers.map((_, colIndex) => ({
                  value: colIndex === 0 ? result : '',
                  row: index,
                  col: colIndex
                }));
                return newRow;
              });

              setData(updates);
              onRowsChanged?.(updates);
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
      </div>
      <div className="overflow-auto">
        <Spreadsheet
          data={data}
          headers={headers}
          onHeaderChange={handleHeaderChange}
          onCellChange={handleCellChange}
          onAddRow={handleAddRow}
          onAddColumn={handleAddColumn}
          onDeleteColumn={handleDeleteColumn}
          onDeleteRow={handleDeleteRow}
        />
      </div>
    </div>
  );
} 