import React, { useState, useRef, useEffect } from 'react';
import { SingleSpreadsheet } from './SingleSpreadsheet';
import ThreeDSpreadsheet from './ThreeDSpreadsheet';
import { LLMPipeSpreadsheet } from './LLMPipeSpreadsheet';

interface WorkflowStep {
  type: 'single' | '3d' | 'aggregation' | 'llm_pipe';
  data: Array<Array<{ value: string; row: number; col: number }>>;
}

export function WorkflowBuilder() {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [showInitialButton, setShowInitialButton] = useState(true);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const stepsRefs = useRef<(React.RefObject<any>)[]>([]);

  // Keep refs array in sync with steps
  useEffect(() => {
    stepsRefs.current = workflowSteps.map((_, i) => 
      stepsRefs.current[i] || React.createRef()
    );
  }, [workflowSteps.length]);

  const runAll = async () => {
    setIsRunningAll(true);
    try {
      for (let i = 0; i < workflowSteps.length; i++) {
        const step = workflowSteps[i];
        const ref = stepsRefs.current[i];
        if (!ref?.current) continue;

        if (step.type === 'single' || step.type === '3d') {
          // For spreadsheet types that have both find and run cells
          if (ref.current.handleRunFind) {
            await ref.current.handleRunFind();
          }
          if (ref.current.handleRunCells) {
            await ref.current.handleRunCells();
          }
        } else if (step.type === 'aggregation' && ref.current.handleRunAggregation) {
          // For aggregation steps
          await ref.current.handleRunAggregation();
        } else if (step.type === 'llm_pipe' && ref.current.handlePipeToLLM) {
          // For LLM pipe steps
          await ref.current.handlePipeToLLM();
        }
      }
    } catch (error) {
      console.error('Error running all steps:', error);
    }
    setIsRunningAll(false);
  };

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

    // If this step has an LLM pipe next, update its data
    if (stepIndex + 1 < newSteps.length && newSteps[stepIndex + 1].type === 'llm_pipe') {
      // Create a key-value listing of all columns for each row
      const llmData = newData.map(row => {
        const rowContent = row.map((cell, colIndex) => {
          const columnName = newSteps[stepIndex].type === 'single' ? `Column ${colIndex + 1}` : cell.col.toString();
          return `${columnName}: ${cell.value}`;
        }).join('\n');

        // Preserve the existing LLM output if it exists
        const existingOutput = newSteps[stepIndex + 1].data.find(r => r[0].row === row[0].row)?.[1]?.value || '';

        return [
          { value: rowContent, row: row[0]?.row || 0, col: 0 },
          { value: existingOutput, row: row[0]?.row || 0, col: 1 }
        ];
      });

      newSteps[stepIndex + 1].data = llmData;
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
              data={step.data}
              onDataChange={(newData) => handleDataChange(index, newData)}
            />
            {renderActionButtons(step, index)}
          </div>
        );
      case 'aggregation':
        return (
          <div key={index} className="mb-8">
            <SingleSpreadsheet
              ref={stepsRefs.current[index]}
              isAggregation={true}
              aggregationCriteria="Category"
              sourceSheets={[{ name: 'Source', data: workflowSteps[index - 1].data, columns: [] }]}
            />
            {renderActionButtons(step, index)}
          </div>
        );
      case 'llm_pipe':
        return (
          <div key={index} className="mb-8">
            <LLMPipeSpreadsheet
              ref={stepsRefs.current[index]}
              sourceData={workflowSteps[index - 1].data}
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
      {workflowSteps.length > 0 && (
        <button
          onClick={runAll}
          disabled={isRunningAll}
          className="mt-2 px-4 py-2 bg-indigo-500 text-white font-medium
            hover:bg-indigo-600 transition-colors duration-150 flex items-center gap-2
            shadow-sm hover:shadow active:translate-y-[1px]"
        >
          {isRunningAll ? 'Running All...' : 'Run All Steps'}
        </button>
      )}
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