import React, { useState, useRef, useEffect } from 'react';
import { SingleSpreadsheet } from './SingleSpreadsheet';
import ThreeDSpreadsheet from './ThreeDSpreadsheet';
import { LLMPipeSpreadsheet } from './LLMPipeSpreadsheet';

interface WorkflowStep {
  type: 'single' | '3d' | 'aggregation' | 'llm_pipe';
  data: Array<Array<{ value: string; row: number; col: number }>> | Array<{ prevRow: Array<{ value: string; row: number; col: number }>; data: Array<{ value: string; row: number; col: number }[]> }>;
  executed?: boolean;
}

export function WorkflowBuilder() {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [showInitialButton, setShowInitialButton] = useState(true);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const stepsRefs = useRef<(React.RefObject<any>)[]>([]);

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
    setWorkflowSteps([{ 
      type: 'single', 
      data: [[{ value: '', row: 0, col: 0 }]],
      executed: false 
    }]);
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

    // Remove .slice(1) to include all rows
    const threeDData = sourceData.map(row => ({
      prevRow: row,
      data: [
        [{ col: 0, row: 0, value: '' }]
      ]
    }));

    newSteps.push({ 
      type: '3d', 
      data: threeDData,
      executed: false
    });
    setWorkflowSteps(newSteps);
  };

  const handleDataChange = (stepIndex: number, newData: Array<Array<{ value: string; row: number; col: number }>> | Array<{ prevRow: Array<{ value: string; row: number; col: number }>; data: Array<{ value: string; row: number; col: number }[]> }>) => {
    const newSteps = [...workflowSteps];
    newSteps[stepIndex].data = newData;
    newSteps[stepIndex].executed = false;

    // Only update downstream steps if they exist and are directly dependent
    if (stepIndex + 1 < newSteps.length) {
      const nextStep = newSteps[stepIndex + 1];
      
      // Update 3D sheet if it follows a single sheet
      if (newSteps[stepIndex].type === 'single' && nextStep.type === '3d') {
        const singleSheetData = newData as Array<Array<{ value: string; row: number; col: number }>>;
        const threeDData = singleSheetData.map(row => ({
          prevRow: row,
          data: nextStep.type === '3d' 
            ? (nextStep.data as any)[0]?.data || [[{ col: 0, row: 0, value: '' }]]
            : [[{ col: 0, row: 0, value: '' }]]
        }));
        newSteps[stepIndex + 1].data = threeDData;
        newSteps[stepIndex + 1].executed = false;
      }

      // Update LLM pipe if it follows
      if (nextStep.type === 'llm_pipe') {
        let llmSourceData: Array<Array<{ value: string; row: number; col: number }>> = [];

        if (Array.isArray(newData[0])) {
          llmSourceData = newData as Array<Array<{ value: string; row: number; col: number }>>;
        } else {
          const threeDData = newData as Array<{ 
            prevRow: Array<{ value: string; row: number; col: number }>;
            data: Array<{ value: string; row: number; col: number }[]>;
          }>;
          llmSourceData = threeDData.map(sheet => sheet.prevRow);
        }

        // Preserve existing LLM responses while updating inputs
        const existingLLMData = nextStep.data as Array<Array<{ value: string; row: number; col: number }>>;
        const updatedLLMData = llmSourceData.map((row, index) => {
          const existingResponse = existingLLMData[index]?.[1]?.value || '';
          return [
            { value: row.map((cell, colIndex) => {
              const columnName = `Column ${colIndex + 1}`;
              return `${columnName}: ${cell.value}`;
            }).join('\n'), row: row[0]?.row || 0, col: 0 },
            { value: existingResponse, row: row[0]?.row || 0, col: 1 }
          ];
        });

        newSteps[stepIndex + 1].data = updatedLLMData;
        newSteps[stepIndex + 1].executed = false;
      }
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
        //   { value: nonEmptyCells.toString(), row: sheetIndex, col: 1 },
        //   { value: lastUpdated, row: sheetIndex, col: 2 }
        ];
      });
    }

    newSteps.push({ 
      type: 'aggregation', 
      data: sourceData,
      executed: false
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
      data: llmData,
      executed: false
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

        if (sourceStep?.type === '3d') {
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
            return sheet.data.flat();
          });
        }

        return (
          <div key={index} className="mb-8">
            <SingleSpreadsheet
              ref={stepsRefs.current[index]}
              isAggregation={true}
              sourceSheets={[{ 
                name: 'Source', 
                prevRows: sourceStep?.data.map((sheet: any) => sheet.prevRow) || [],
                data: sourceSheetData,
                columns: prevTableHeaders
              }]}
              prevTableHeaders={prevTableHeaders}
              onRowsChanged={(newData) => handleDataChange(index, newData)}
            />
            {renderActionButtons(step, index)}
          </div>
        );
      case 'llm_pipe':
        const prevStep = workflowSteps[index - 1];
        const prevRef = stepsRefs.current[index - 1];
        const headers = prevRef?.current?.getHeaders?.() || ['Input'];
        let sourceDataForLLM: Array<Array<{ value: string; row: number; col: number }>> = [];

        if (prevStep) {
          if (Array.isArray(prevStep.data[0])) {
            sourceDataForLLM = prevStep.data as Array<Array<{ value: string; row: number; col: number }>>;
          } else {
            const threeDData = prevStep.data as Array<{ 
              prevRow: Array<{ value: string; row: number; col: number }>;
              data: Array<{ value: string; row: number; col: number }[]>;
            }>;
            sourceDataForLLM = threeDData.map(sheet => sheet.prevRow);
          }
        }
        
        return (
          <div key={index} className="mb-8">
            <LLMPipeSpreadsheet
              ref={stepsRefs.current[index]}
              sourceData={sourceDataForLLM}
              headers={headers}
              onDataChange={(newData) => handleDataChange(index, newData)}
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
        <svg width="162" height="44" viewBox="0 0 162 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.896 0.631996V38.456H24.264V43H0.84V0.631996H5.896ZM28.7 20.6C28.7 19.064 29.0413 17.6773 29.724 16.44C30.4493 15.2027 31.3667 14.1573 32.476 13.304C33.628 12.408 34.8867 11.7467 36.252 11.32C37.66 10.8507 39.068 10.616 40.476 10.616C41.9693 10.616 43.42 10.8293 44.828 11.256C46.2787 11.6827 47.5587 12.3227 48.668 13.176C49.7773 14.0293 50.6733 15.0747 51.356 16.312C52.0387 17.5493 52.38 18.9787 52.38 20.6V36.984C52.38 37.496 52.572 38.008 52.956 38.52C53.34 38.9893 53.788 39.224 54.3 39.224C54.5987 39.224 54.876 39.16 55.132 39.032C55.388 38.904 55.6867 38.7547 56.028 38.584V42.936C55.4733 43.1067 54.94 43.256 54.428 43.384C53.916 43.512 53.2333 43.576 52.38 43.576C49.6493 43.576 48.284 41.848 48.284 38.392C46.8333 40.184 45.0627 41.5067 42.972 42.36C40.924 43.1707 38.876 43.576 36.828 43.576C35.5907 43.576 34.4173 43.3627 33.308 42.936C32.1987 42.4667 31.196 41.8267 30.3 41.016C29.4467 40.2053 28.764 39.288 28.252 38.264C27.74 37.1973 27.484 36.0453 27.484 34.808C27.484 32.8453 27.9747 31.2453 28.956 30.008C29.98 28.728 31.2387 27.6827 32.732 26.872C34.268 26.0187 35.9107 25.3573 37.66 24.888C39.4093 24.376 41.0307 23.928 42.524 23.544C44.06 23.1173 45.3187 22.6907 46.3 22.264C47.324 21.8373 47.836 21.2827 47.836 20.6C47.836 19.7893 47.6867 19 47.388 18.232C47.0893 17.464 46.6413 16.8027 46.044 16.248C45.4467 15.6507 44.6787 15.1813 43.74 14.84C42.844 14.4987 41.756 14.328 40.476 14.328C39.5373 14.328 38.62 14.4987 37.724 14.84C36.8707 15.1387 36.1027 15.5653 35.42 16.12C34.78 16.6747 34.2467 17.336 33.82 18.104C33.436 18.872 33.244 19.704 33.244 20.6H28.7ZM47.836 25.656C46.684 26.168 45.212 26.6587 43.42 27.128C41.6707 27.5547 39.964 28.088 38.3 28.728C36.636 29.3253 35.2067 30.0933 34.012 31.032C32.8173 31.9707 32.22 33.1867 32.22 34.68C32.22 36.3013 32.8173 37.56 34.012 38.456C35.2067 39.352 36.6147 39.8 38.236 39.8C39.0893 39.8 40.0067 39.672 40.988 39.416C41.9693 39.16 42.908 38.776 43.804 38.264C44.7 37.752 45.4893 37.112 46.172 36.344C46.8973 35.576 47.452 34.68 47.836 33.656V25.656ZM66.984 2.424V11.192H72.04V15.096H66.984V36.152C66.984 37.4747 67.3893 38.4133 68.2 38.968C69.0107 39.48 69.9707 39.736 71.08 39.736C71.2933 39.736 71.528 39.736 71.784 39.736C72.04 39.6933 72.36 39.5653 72.744 39.352V43.064C72.1893 43.192 71.5707 43.2987 70.888 43.384C70.2053 43.512 69.48 43.576 68.712 43.576C67.8587 43.576 67.048 43.4693 66.28 43.256C65.5547 43.0427 64.8933 42.7013 64.296 42.232C63.7413 41.7627 63.2933 41.144 62.952 40.376C62.6107 39.608 62.44 38.6693 62.44 37.56V15.096H57.832V11.192H62.44V2.424H66.984ZM83.359 2.424V11.192H88.415V15.096H83.359V36.152C83.359 37.4747 83.7643 38.4133 84.575 38.968C85.3857 39.48 86.3457 39.736 87.455 39.736C87.6683 39.736 87.903 39.736 88.159 39.736C88.415 39.6933 88.735 39.5653 89.119 39.352V43.064C88.5643 43.192 87.9457 43.2987 87.263 43.384C86.5803 43.512 85.855 43.576 85.087 43.576C84.2337 43.576 83.423 43.4693 82.655 43.256C81.9297 43.0427 81.2683 42.7013 80.671 42.232C80.1163 41.7627 79.6683 41.144 79.327 40.376C78.9857 39.608 78.815 38.6693 78.815 37.56V15.096H74.207V11.192H78.815V2.424H83.359ZM98.006 0.631996V5.88H93.462V0.631996H98.006ZM98.006 11.192V43H93.462V11.192H98.006ZM129.468 31.992C129.127 33.6133 128.615 35.128 127.932 36.536C127.249 37.944 126.375 39.1813 125.308 40.248C124.284 41.272 123.068 42.0827 121.66 42.68C120.252 43.2773 118.652 43.576 116.86 43.576C114.641 43.576 112.721 43.128 111.1 42.232C109.479 41.2933 108.113 40.0773 107.004 38.584C105.937 37.048 105.127 35.2987 104.572 33.336C104.06 31.3733 103.804 29.3253 103.804 27.192C103.804 25.0587 104.06 22.9893 104.572 20.984C105.127 18.9787 105.937 17.208 107.004 15.672C108.113 14.136 109.479 12.8987 111.1 11.96C112.721 11.0213 114.641 10.552 116.86 10.552C118.567 10.552 120.103 10.8507 121.468 11.448C122.876 12.0453 124.092 12.856 125.116 13.88C126.183 14.904 127.057 16.0987 127.74 17.464C128.423 18.7867 128.935 20.216 129.276 21.752H124.668C124.071 19.6187 123.111 17.8693 121.788 16.504C120.465 15.096 118.823 14.392 116.86 14.392C115.495 14.392 114.279 14.7547 113.212 15.48C112.188 16.1627 111.313 17.1013 110.588 18.296C109.863 19.448 109.308 20.792 108.924 22.328C108.54 23.864 108.348 25.4853 108.348 27.192C108.348 28.8987 108.54 30.52 108.924 32.056C109.308 33.5493 109.863 34.872 110.588 36.024C111.313 37.176 112.188 38.0933 113.212 38.776C114.279 39.416 115.495 39.736 116.86 39.736C118.908 39.736 120.593 39.0107 121.916 37.56C123.281 36.1093 124.241 34.2533 124.796 31.992H129.468ZM160.616 33.08C160.189 34.5733 159.592 35.96 158.824 37.24C158.056 38.52 157.117 39.6293 156.008 40.568C154.941 41.5067 153.704 42.2533 152.296 42.808C150.888 43.32 149.352 43.576 147.688 43.576C145.469 43.576 143.506 43.128 141.8 42.232C140.093 41.2933 138.664 40.0773 137.512 38.584C136.36 37.048 135.485 35.2987 134.888 33.336C134.29 31.3733 133.992 29.3253 133.992 27.192C133.992 25.0587 134.29 22.9893 134.888 20.984C135.485 18.9787 136.36 17.208 137.512 15.672C138.664 14.136 140.093 12.8987 141.8 11.96C143.506 11.0213 145.469 10.552 147.688 10.552C149.906 10.552 151.869 11.0213 153.576 11.96C155.282 12.8987 156.712 14.136 157.864 15.672C159.016 17.208 159.89 18.9787 160.488 20.984C161.085 22.9893 161.384 25.0587 161.384 27.192V28.024H138.536C138.621 29.6453 138.898 31.1813 139.368 32.632C139.837 34.04 140.456 35.2773 141.224 36.344C142.034 37.368 142.973 38.2 144.04 38.84C145.149 39.4373 146.365 39.736 147.688 39.736C149.608 39.736 151.293 39.1387 152.744 37.944C154.194 36.7067 155.282 35.0853 156.008 33.08H160.616ZM156.52 24.184C156.264 22.8187 155.88 21.5387 155.368 20.344C154.856 19.1493 154.216 18.1253 153.448 17.272C152.722 16.376 151.869 15.672 150.888 15.16C149.906 14.648 148.84 14.392 147.688 14.392C146.536 14.392 145.469 14.648 144.488 15.16C143.506 15.672 142.632 16.376 141.864 17.272C141.096 18.1253 140.434 19.1493 139.88 20.344C139.368 21.5387 139.005 22.8187 138.792 24.184H156.52Z" fill="#0019FB" fillOpacity="0.57"/>
        </svg>
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