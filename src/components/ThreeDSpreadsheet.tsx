'use client';

import React, { useState, useEffect } from 'react';
import Spreadsheet from './Spreadsheet';
import { SpreadsheetStorage } from '@/lib/storage';

interface ThreeDSpreadsheetProps {
  initialRows?: number;
  initialCols?: number;
  sourceData?: Array<{ value: string; row: number; col: number }>[];
}

export default function ThreeDSpreadsheet({ 
  initialRows = 10, 
  initialCols = 5,
  sourceData = []
}: ThreeDSpreadsheetProps) {
  const [storage] = useState(() => new SpreadsheetStorage());
  const [activeSheet, setActiveSheet] = useState(0);
  const [sheetData, setSheetData] = useState<Array<Array<Array<{ value: string; row: number; col: number }>>>>([]);
  const [sheetIds, setSheetIds] = useState<string[]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Initialize sheets based on source data
  useEffect(() => {
    if (sourceData.length === 0) return;

    // Get the first column values from source data to use as sheet names
    const names = sourceData.map(row => row[0]?.value || '').filter(Boolean);
    
    // Clear existing sheets
    sheetIds.forEach(id => storage.deleteEntity(id));
    
    // Create new sheets based on names from source
    const newSheetIds: string[] = [];
    names.forEach(name => {
      const entity = storage.createEntity(name);
      storage.initializeEntityRows(entity.id, initialRows);
      newSheetIds.push(entity.id);
    });

    // Update state
    setSheetIds(newSheetIds);
    setSheetNames(names);
    setSheetData(newSheetIds.map(id => storage.getEntityData(id)));
  }, [sourceData, initialRows, storage]);

  const handleCellChange = (sheetIndex: number, row: number, col: number, value: string) => {
    // Update storage
    storage.updateSubEntity(
      sheetIds[sheetIndex],
      row.toString(),
      col.toString(), // Using column index as header since we're not managing headers separately
      value
    );

    // Update local state
    const newSheetData = [...sheetData];
    if (!newSheetData[sheetIndex]) {
      newSheetData[sheetIndex] = [];
    }
    if (!newSheetData[sheetIndex][row]) {
      newSheetData[sheetIndex][row] = Array(initialCols).fill(null).map((_, colIndex) => ({
        value: '',
        row,
        col: colIndex
      }));
    }
    newSheetData[sheetIndex][row][col].value = value;
    setSheetData(newSheetData);
  };

  const handleSheetClick = (index: number) => {
    if (!isTransitioning) {
      setIsTransitioning(true);
      setActiveSheet(index);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-50 overflow-hidden">
      <div className="relative w-full h-full">
        {sheetData.map((sheet, index) => {
          const isActive = activeSheet === index;
          const offset = index - activeSheet;
          
          return (
            <div
              key={index}
              onClick={() => handleSheetClick(index)}
              className={`
                absolute inset-0 
                transition-all duration-300 ease-in-out
                ${isActive ? 'opacity-100 cursor-default' : 'opacity-0 cursor-pointer'}
                ${isTransitioning ? 'scale-95' : 'scale-100'}
              `}
              style={{
                transform: isActive 
                  ? 'none'
                  : `translate(${offset * 100}%, 0)`,
                zIndex: isActive ? 30 : -1,
                pointerEvents: isTransitioning ? 'none' : 'auto'
              }}
            >
              <div className={`
                bg-white rounded-xl overflow-hidden h-full
                ${isActive ? 'shadow-lg border border-gray-200/80' : 'shadow-md border border-gray-200/60'}
                transition-all duration-300
              `}>
                {/* Sheet Header */}
                <div className="px-6 py-4 border-b border-gray-200/80 bg-white">
                  <h3 className="font-medium text-gray-700">
                    {sheetNames[index]}
                  </h3>
                </div>

                {/* Spreadsheet */}
                <div className="h-[calc(100%-4rem)] overflow-auto">
                  <Spreadsheet
                    key={index}
                    initialRows={initialRows}
                    initialCols={initialCols}
                    data={sheet}
                    headers={Array(initialCols).fill(null).map((_, i) => String.fromCharCode(65 + i))}
                    onCellChange={(row, col, value) => handleCellChange(index, row, col, value)}
                    sheetName={sheetNames[index]}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Sheet Navigation Indicators */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {sheetData.map((_, index) => (
            <button
              key={index}
              onClick={() => handleSheetClick(index)}
              className={`
                w-2 h-2 rounded-full transition-all duration-150
                ${activeSheet === index 
                  ? 'bg-indigo-500 w-4' 
                  : 'bg-gray-300 hover:bg-gray-400'
                }
              `}
            />
          ))}
        </div>
      </div>
    </div>
  );
} 