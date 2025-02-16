import React from 'react';

interface WorkflowMapperProps {
  sourceRows: Array<{ name: string; selected: boolean }>;
  targetSheets: string[];
}

export function WorkflowMapper({ sourceRows, targetSheets }: WorkflowMapperProps) {
  return (
    <div className="flex flex-col gap-4 py-8">
      <div className="flex items-start justify-between px-12">
        {/* Source Side */}
        <div className="w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-700 mb-3">Source Rows</h3>
          <div className="space-y-2">
            {sourceRows.map((row, index) => (
              <div
                key={index}
                className={`p-2 rounded ${
                  row.selected 
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                    : 'bg-gray-50 border border-gray-200 text-gray-600'
                }`}
              >
                {row.name || `Row ${index + 1}`}
              </div>
            ))}
          </div>
        </div>

        {/* Connection Lines */}
        <div className="flex-1 relative">
          <svg
            className="w-full h-full absolute inset-0"
            style={{ minHeight: '200px' }}
          >
            {sourceRows
              .filter(row => row.selected)
              .map((row, index) => {
                const sourceIndex = sourceRows.indexOf(row);
                const sourceY = (sourceIndex * 40) + 52; // Adjust based on your row height
                const targetY = (index * 40) + 52;

                return (
                  <path
                    key={index}
                    d={`M 0,${sourceY} C 100,${sourceY} 100,${targetY} 200,${targetY}`}
                    stroke="#818CF8"
                    strokeWidth="2"
                    fill="none"
                  />
                );
              })}
          </svg>
        </div>

        {/* Target Side */}
        <div className="w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-700 mb-3">3D Spreadsheet</h3>
          <div className="space-y-2">
            {targetSheets.map((sheet, index) => (
              <div
                key={index}
                className="p-2 rounded bg-indigo-50 border border-indigo-200 text-indigo-700"
              >
                {sheet}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 