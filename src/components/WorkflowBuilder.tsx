import React, { useState } from 'react';
import { SingleSpreadsheet } from './SingleSpreadsheet';
import ThreeDSpreadsheet from './ThreeDSpreadsheet';

export function WorkflowBuilder() {
  const [sourceData, setSourceData] = useState<Array<{ value: string; row: number; col: number }>[]>([]);
  const [showSpreadsheet, setShowSpreadsheet] = useState(false);
  const [show3DSpreadsheet, setShow3DSpreadsheet] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center gap-8">
      {/* Initial Add Button */}
      {!showSpreadsheet && (
        <button
          onClick={() => setShowSpreadsheet(true)}
          className="w-48 p-3 rounded-lg bg-white shadow-sm hover:shadow-md
            border border-gray-200 text-gray-700 font-medium
            transition-all duration-150 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Add Single Sheet
        </button>
      )}

      {/* Toolbar - appears after creating first spreadsheet */}
      {showSpreadsheet && !show3DSpreadsheet && (
        <div className="fixed top-8 right-8 flex gap-2">
          <button
            onClick={() => setShow3DSpreadsheet(true)}
            className="px-4 py-2 rounded-lg bg-white shadow-sm hover:shadow-md
              border border-gray-200 text-gray-700 font-medium
              transition-all duration-150 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z M7 4v16" />
            </svg>
            Add 3D Sheet
          </button>
        </div>
      )}

      {/* Spreadsheets Container */}
      {showSpreadsheet && (
        <div className="w-full max-w-[800px] flex flex-col gap-8">
          {/* Source Spreadsheet */}
          <div className="w-full">
            <SingleSpreadsheet 
              onStartConnection={() => {
                setShow3DSpreadsheet(true);
              }}
              onRowsChanged={(rows) => {
                setSourceData(rows);
              }}
            />
          </div>

          {/* Target 3D Spreadsheet */}
          {show3DSpreadsheet && (
            <div className="w-full h-[400px]">
              <ThreeDSpreadsheet
                initialRows={10}
                initialCols={5}
                sourceData={sourceData}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
} 