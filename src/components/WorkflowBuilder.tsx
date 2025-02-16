import React, { useState, useRef, useEffect } from 'react';
import { SingleSpreadsheet } from './SingleSpreadsheet';
import ThreeDSpreadsheet from './ThreeDSpreadsheet';
import { LLMPipeSpreadsheet } from './LLMPipeSpreadsheet';

interface WorkflowStep {
  type: 'single' | '3d' | 'aggregation' | 'llm_pipe';
  data: Array<Array<{ value: string; row: number; col: number }>> | Array<{ prevRow: Array<{ value: string; row: number; col: number }>; data: Array<{ value: string; row: number; col: number }[]> }>;
}

export function WorkflowBuilder() {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [showInitialButton, setShowInitialButton] = useState(true);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const stepsRefs = useRef<(React.RefObject<any>)[]>([]);

  // Keep refs array in sync with steps
  useEffect(() => {
    // Initialize refs for all steps
    stepsRefs.current = workflowSteps.map((_, i) => {
      if (!stepsRefs.current[i]) {
        return React.createRef();
      }
      return stepsRefs.current[i];
    });
  }, [workflowSteps]);

  const handleCreateInitialSheet = () => {
    setWorkflowSteps([{ type: 'single', data: [[{ value: '', row: 0, col: 0 }]] }]);
    setShowInitialButton(false);
  };

  const runAll = async () => {
    setIsRunningAll(true);
    try {
      for (let i = 0; i < workflowSteps.length; i++) {
        const step = workflowSteps[i];
        const ref = stepsRefs.current[i];
        
        console.log(`Running step ${i}:`, {
          type: step.type,
          hasRef: !!ref,
          hasRefCurrent: !!ref?.current,
          hasData: !!step?.data,
          dataLength: step?.data?.length
        });

        // Skip if ref or step is invalid
        if (!ref?.current || !step?.data) {
          console.warn(`Skipping step ${i} due to invalid ref or data:`, {
            hasRef: !!ref,
            hasRefCurrent: !!ref?.current,
            hasData: !!step?.data
          });
          continue;
        }

        // Add a small delay between steps to ensure UI updates and prevent race conditions
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        try {
          if (step.type === 'single' || step.type === '3d') {
            // For spreadsheet types that have both find and run cells
            if (typeof ref.current.handleRunFind === 'function') {
              console.log(`Running find for step ${i}`);
              await ref.current.handleRunFind();
              // Wait a bit between find and run cells
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              console.warn(`Step ${i} missing handleRunFind method`);
            }
            if (typeof ref.current.handleRunCells === 'function') {
              console.log(`Running cells for step ${i}`);
              await ref.current.handleRunCells();
            } else {
              console.warn(`Step ${i} missing handleRunCells method`);
            }
          } else if (step.type === 'aggregation' && typeof ref.current.handleRunAggregation === 'function') {
            // For aggregation steps
            console.log(`Running aggregation for step ${i}`);
            await ref.current.handleRunAggregation();
          } else if (step.type === 'llm_pipe' && typeof ref.current.handlePipeToLLM === 'function') {
            // For LLM pipe steps
            console.log(`Running LLM pipe for step ${i}`);
            await ref.current.handlePipeToLLM();
          }
        } catch (stepError) {
          console.error(`Error running step ${i}:`, stepError);
          // Continue with next step even if current one fails
        }
      }
    } catch (error) {
      console.error('Error running all steps:', error);
    } finally {
      setIsRunningAll(false);
    }
  };

  const handleCreateThreeDSheet = (stepIndex: number) => {
    const sourceStep = workflowSteps[stepIndex];
    const newSteps = [...workflowSteps];

    // Create a sheet for each data row, named by first column value
    const sourceData = Array.isArray(sourceStep.data[0]) 
      ? sourceStep.data as Array<Array<{ value: string; row: number; col: number }>>
      : [];

    const threeDData = sourceData.slice(1).map(row => ({
      prevRow: row,
      data: [
        // []
        [{ col: 0, row: 0, value: '' }]
      ]
    }));

    newSteps.push({ 
      type: '3d', 
      data: threeDData
    });
    setWorkflowSteps(newSteps);
  };

  const handleDataChange = (stepIndex: number, newData: Array<Array<{ value: string; row: number; col: number }>> | Array<{ prevRow: Array<{ value: string; row: number; col: number }>; data: Array<{ value: string; row: number; col: number }[]> }>) => {
    const newSteps = [...workflowSteps];
    newSteps[stepIndex].data = newData;

    // If this is a single spreadsheet and there's a 3D spreadsheet next
    if (newSteps[stepIndex].type === 'single' && 
        stepIndex + 1 < newSteps.length && 
        newSteps[stepIndex + 1].type === '3d') {
      // Update the 3D spreadsheet data with all rows
      const singleSheetData = newData as Array<Array<{ value: string; row: number; col: number }>>;
      const threeDData = singleSheetData.slice(1).map(row => ({
        prevRow: row,
        data: [
            // []
          [{ col: 0, row: 0, value: '' }]
        ]
      }));
      newSteps[stepIndex + 1].data = threeDData;
    }

    // If this step has an LLM pipe next, update its data
    if (stepIndex + 1 < newSteps.length && newSteps[stepIndex + 1].type === 'llm_pipe') {
      const currentData = Array.isArray(newData[0]) 
        ? newData as Array<Array<{ value: string; row: number; col: number }>>
        : (newData as Array<{ prevRow: Array<{ value: string; row: number; col: number }>; data: Array<{ value: string; row: number; col: number }[]> }>)
          .map(item => item.prevRow);

      // Create a key-value listing of all columns for each row
      const llmData = currentData.map(row => {
        const rowContent = row.map((cell, colIndex) => {
          const columnName = newSteps[stepIndex].type === 'single' ? `Column ${colIndex + 1}` : cell.col.toString();
          return `${columnName}: ${cell.value}`;
        }).join('\n');

        // Preserve the existing LLM output if it exists
        const existingOutput = Array.isArray(newSteps[stepIndex + 1].data[0]) 
          ? (newSteps[stepIndex + 1].data as Array<Array<{ value: string; row: number; col: number }>>)
            .find(r => r[0].row === row[0].row)?.[1]?.value || ''
          : '';

        return [
          { value: rowContent, row: row[0]?.row || 0, col: 0 },
          { value: existingOutput, row: row[0]?.row || 0, col: 1 }
        ];
      });

      newSteps[stepIndex + 1].data = llmData;
    }

    setWorkflowSteps(newSteps);
  };

  const handleAggregate = async (stepIndex: number) => {
    const sourceStep = workflowSteps[stepIndex];
    const newSteps = [...workflowSteps];
    
    // Transform the source data based on its type
    let sourceData: Array<Array<{ value: string; row: number; col: number }>> = [];
    let prevTableHeaders: string[] = [];
    
    if (sourceStep.type === '3d') {
      // For 3D sheets, we need to transform the data structure
      const threeDData = sourceStep.data as Array<{ 
        prevRow: Array<{ value: string; row: number; col: number }>;
        data: Array<{ value: string; row: number; col: number }[]>;
      }>;

      // Get headers from the ref
      const sourceRef = stepsRefs.current[stepIndex];
      prevTableHeaders = sourceRef?.current?.getHeaders?.() || [];

      // Create a row for each sheet in the 3D view
      sourceData = threeDData.map((sheet, sheetIndex) => {
        // Get the sheet name from prevRow's first column
        const sheetName = sheet.prevRow.find(cell => cell.col === 0)?.value || `Sheet ${sheetIndex + 1}`;
        
        // Count non-empty cells in the sheet's data
        const nonEmptyCells = sheet.data.flat().filter(cell => cell.value.trim() !== '').length;
        
        // Get the last updated time (current time for now)
        const lastUpdated = new Date().toISOString();
        
        // Return a row with [Category, Count, Last Updated]
        return [
          { value: sheetName, row: sheetIndex, col: 0 },
          { value: nonEmptyCells.toString(), row: sheetIndex, col: 1 },
          { value: lastUpdated, row: sheetIndex, col: 2 }
        ];
      });
    }

    newSteps.push({ 
      type: 'aggregation', 
      data: sourceData
    });
    setWorkflowSteps(newSteps);
  };

  const handleCreateLLMPipe = (stepIndex: number) => {
    const sourceStep = workflowSteps[stepIndex];
    const newSteps = [...workflowSteps];
    
    // Combine all columns from each row into a single input string
    const llmData = sourceStep.data.map(row => {
      // Create a key-value listing of all columns
      const rowContent = row.map((cell, colIndex) => {
        const columnName = sourceStep.type === 'single' ? `Column ${colIndex + 1}` : cell.col.toString();
        return `${columnName}: ${cell.value}`;
      }).join('\n');

      return [
        { value: rowContent, row: row[0]?.row || 0, col: 0 },
        { value: '', row: row[0]?.row || 0, col: 1 }
      ];
    });

    newSteps.push({ 
      type: 'llm_pipe', 
      data: llmData
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
            className="px-4 py-2 bg-white shadow-sm hover:shadow-md
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
          <>
            <button
              onClick={() => handleCreateThreeDSheet(index)}
              className="px-4 py-2 bg-white shadow-sm hover:shadow-md
                border border-gray-200 text-gray-700 font-medium
                transition-all duration-150 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z M7 4v16" />
              </svg>
              Create 3D Sheet
            </button>
            <button
              onClick={() => handleCreateLLMPipe(index)}
              className="px-4 py-2 bg-white shadow-sm hover:shadow-md
                border border-gray-200 text-gray-700 font-medium
                transition-all duration-150 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Pipe to LLM
            </button>
          </>
        )}
      </div>
    );
  };

  const renderStep = (step: WorkflowStep, index: number) => {
    switch (step.type) {
      case 'single':
        return (
          <div key={index} className="mb-8">
            <SingleSpreadsheet
              ref={stepsRefs.current[index]}
              onRowsChanged={(newData) => handleDataChange(index, newData)}
            />
            {renderActionButtons(step, index)}
          </div>
        );
      case '3d':
        return (
          <div key={index} className="mb-8">
            <ThreeDSpreadsheet
              ref={stepsRefs.current[index]}
              data={step.data as Array<{ 
                prevRow: Array<{ value: string; row: number; col: number }>;
                data: Array<{ value: string; row: number; col: number }[]>;
              }>}
              onDataChange={(newData) => handleDataChange(index, newData)}
            />
            {renderActionButtons(step, index)}
          </div>
        );
      case 'aggregation':
        // Get the source data and transform it for the aggregation view
        const sourceStep = workflowSteps[index - 1];
        let sourceSheetData: Array<Array<{ value: string; row: number; col: number }>> = [];
        let prevTableHeaders: string[] = [];

        if (sourceStep.type === '3d') {
          const threeDData = sourceStep.data as Array<{ 
            prevRow: Array<{ value: string; row: number; col: number }>;
            data: Array<{ value: string; row: number; col: number }[]>;
          }>;

          // Get headers from the previous step's ref
          const sourceRef = stepsRefs.current[index - 1];
          prevTableHeaders = sourceRef?.current?.getHeaders?.() || [];

          // Transform 3D data into a flat structure
          sourceSheetData = threeDData.map((sheet, sheetIndex) => {
            const sheetName = sheet.prevRow.find(cell => cell.col === 0)?.value || `Sheet ${sheetIndex + 1}`;
            return [
              { value: sheetName, row: sheetIndex, col: 0 },
              ...sheet.data.flat().map((cell, cellIndex) => ({
                value: cell.value,
                row: sheetIndex,
                col: cellIndex + 1
              }))
            ];
          });
        }

        return (
          <div key={index} className="mb-8">
            <SingleSpreadsheet
              ref={stepsRefs.current[index]}
              isAggregation={true}
              aggregationCriteria="Category"
              sourceSheets={[{ 
                name: 'Source', 
                data: sourceSheetData,
                columns: ['Category', 'Count', 'Last Updated']
              }]}
              prevTableHeaders={prevTableHeaders}
              initialData={step.data as Array<Array<{ value: string; row: number; col: number }>>}
            />
            {renderActionButtons(step, index)}
          </div>
        );
      case 'llm_pipe':
        const prevStep = workflowSteps[index - 1];
        let headers: string[];
        if (prevStep.type === 'single' || prevStep.type === '3d') {
          // For single and 3D sheets, get headers from the ref
          const prevRef = stepsRefs.current[index - 1];
          headers = prevRef?.current?.getHeaders?.() || ['Input'];
        } else {
          // For aggregation, use fixed headers
          headers = ['Category', 'Count', 'Last Updated'];
        }
        return (
          <div key={index} className="mb-8">
            <LLMPipeSpreadsheet
              ref={stepsRefs.current[index]}
              sourceData={Array.isArray(workflowSteps[index - 1].data[0]) 
                ? workflowSteps[index - 1].data as Array<Array<{ value: string; row: number; col: number }>>
                : []}
              headers={headers}
            />
            {renderActionButtons(step, index)}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center gap-8">
      <div className="w-full max-w-[800px] flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Spreadsheet Workflow Builder</h1>
        {workflowSteps.length > 0 && (
          <button
            onClick={runAll}
            disabled={isRunningAll}
            className="px-4 py-2 bg-indigo-500 text-white font-medium
              hover:bg-indigo-600 transition-colors duration-150 flex items-center gap-2
              shadow-sm hover:shadow active:translate-y-[1px]"
          >
            {isRunningAll ? 'Running All...' : 'Run All Steps'}
          </button>
        )}
      </div>
      {showInitialButton && (
        <button
          onClick={handleCreateInitialSheet}
          className="w-48 p-3 bg-white shadow-sm hover:shadow-md
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
          renderStep(step, index))
        )}
      </div>
    </div>
  );
} 