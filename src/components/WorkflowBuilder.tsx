import React, { useState } from 'react';
import { SingleSpreadsheet } from './SingleSpreadsheet';
import ThreeDSpreadsheet from './ThreeDSpreadsheet';

interface WorkflowStep {
  type: 'single' | '3d' | 'aggregation';
  data: Array<Array<{ value: string; row: number; col: number }>>;
}

export function WorkflowBuilder() {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [showInitialButton, setShowInitialButton] = useState(true);

  const handleCreateInitialSheet = () => {
    setWorkflowSteps([{ type: 'single', data: [] }]);
    setShowInitialButton(false);
  };

  const handleCreateThreeDSheet = (stepIndex: number) => {
    const sourceStep = workflowSteps[stepIndex];
    const newSteps = [...workflowSteps];
    
    // Each row from the source becomes a sheet in the 3D view
    // Include all rows, including the first row
    const threeDData = sourceStep.data.map(row => {
      // Sort cells by column to ensure consistent order
      const sortedRow = [...row].sort((a, b) => a.col - b.col);
      return sortedRow;
    });

    newSteps.push({ 
      type: '3d', 
      data: threeDData
    });
    setWorkflowSteps(newSteps);
  };

  const handleDataChange = (stepIndex: number, newData: Array<Array<{ value: string; row: number; col: number }>>) => {
    const newSteps = [...workflowSteps];
    newSteps[stepIndex].data = newData;

    // If this is a single spreadsheet and there's a 3D spreadsheet next
    if (newSteps[stepIndex].type === 'single' && 
        stepIndex + 1 < newSteps.length && 
        newSteps[stepIndex + 1].type === '3d') {
      // Update the 3D spreadsheet data with all rows
      const threeDData = newData.map(row => {
        const sortedRow = [...row].sort((a, b) => a.col - b.col);
        return sortedRow;
      });
      newSteps[stepIndex + 1].data = threeDData;
    }

    setWorkflowSteps(newSteps);
  };

  const handleAggregate = (stepIndex: number) => {
    const sourceData = workflowSteps[stepIndex].data;
    
    // Aggregate the data from the 3D spreadsheet
    const aggregated = sourceData.reduce((acc, sheet) => {
      if (!sheet.length) return acc;

      const firstCell = sheet[0];
      if (firstCell) {
        const existingEntry = acc.find(entry => entry[0].value === firstCell.value);
        if (existingEntry) {
          existingEntry[1].value = (parseInt(existingEntry[1].value || '0') + 1).toString();
          existingEntry[2].value = new Date().toISOString();
        } else {
          acc.push([
            { value: firstCell.value, row: acc.length, col: 0 },
            { value: '1', row: acc.length, col: 1 },
            { value: new Date().toISOString(), row: acc.length, col: 2 }
          ]);
        }
      }
      return acc;
    }, [] as Array<Array<{ value: string; row: number; col: number }>>);

    const newSteps = [...workflowSteps];
    newSteps.push({ 
      type: 'aggregation', 
      data: aggregated
    });
    setWorkflowSteps(newSteps);
  };

  const renderActionButtons = (step: WorkflowStep, index: number) => {
    // Only render action buttons if this is the last step
    if (index !== workflowSteps.length - 1) return null;

    return (
      <div className="flex justify-center gap-4 mt-4">
        {step.type === '3d' && (
          <button
            onClick={() => handleAggregate(index)}
            className="px-4 py-2 rounded-lg bg-white shadow-sm hover:shadow-md
              border border-gray-200 text-gray-700 font-medium
              transition-all duration-150 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 7h16M4 12h16M4 17h7" />
            </svg>
            Aggregate Data
          </button>
        )}
        {(step.type === 'single' || step.type === 'aggregation') && (
          <button
            onClick={() => handleCreateThreeDSheet(index)}
            className="px-4 py-2 rounded-lg bg-white shadow-sm hover:shadow-md
              border border-gray-200 text-gray-700 font-medium
              transition-all duration-150 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z M7 4v16" />
            </svg>
            Create 3D Sheet
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center gap-8">
      {/* Initial Add Button */}
      {showInitialButton && (
        <button
          onClick={handleCreateInitialSheet}
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

      {/* Workflow Steps */}
      <div className="w-full max-w-[800px] flex flex-col gap-8">
        {workflowSteps.map((step, index) => (
          <div key={index} className="w-full">
            {step.type === 'single' && (
              <>
                <SingleSpreadsheet
                  onRowsChanged={(rows) => handleDataChange(index, rows)}
                />
                {renderActionButtons(step, index)}
              </>
            )}
            {step.type === '3d' && (
              <>
                <div className="w-full h-[400px]">
                  <ThreeDSpreadsheet
                    sourceData={step.data}
                    isSidebarOpen={true}
                  />
                </div>
                {renderActionButtons(step, index)}
              </>
            )}
            {step.type === 'aggregation' && (
              <>
                <SingleSpreadsheet
                  onRowsChanged={(rows) => handleDataChange(index, rows)}
                  initialData={step.data[0]}
                  aggregationCriteria="First Column"
                />
                {renderActionButtons(step, index)}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 