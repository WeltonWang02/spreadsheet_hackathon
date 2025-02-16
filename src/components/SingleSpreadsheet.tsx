import React, { useState, forwardRef, useImperativeHandle } from 'react';
import Spreadsheet from '@/components/Spreadsheet';

interface SingleSpreadsheetProps {
  onRowsChanged?: (rows: any[]) => void;
  onExpandChange?: (expanded: boolean) => void;
  initialData?: Array<{ value: string; row: number; col: number }>;
  aggregationCriteria?: string;
  isAggregation?: boolean;
  prevTableHeaders?: string[];
  sourceSheets?: Array<{
    name: string;
    data: Array<Array<{ value: string; row: number; col: number }>>;
    columns: string[];
    prevRows: Array<Array<{ value: string; row: number; col: number }>>;
  }>;
}

export const SingleSpreadsheet = forwardRef<
  { 
    handleRunFind: () => Promise<void>; 
    handleRunCells: () => Promise<void>; 
    handleRunAggregation: () => Promise<void>;
    getHeaders: () => string[];
  },
  SingleSpreadsheetProps
>(({
  onRowsChanged,
  onExpandChange,
  initialData,
  aggregationCriteria,
  isAggregation,
  prevTableHeaders,
  sourceSheets
}, ref) => {
  const [data, setData] = useState<Array<Array<{ value: string; row: number; col: number }>>>(() => {
    // Initialize with a single empty row if no initial data
    if (!initialData) {
      return [[{ value: '', row: 0, col: 0 }]];
    }
    return [initialData];
  });
  const [headers, setHeaders] = useState<string[]>(() => {
    if (isAggregation && sourceSheets?.[0]?.columns) {
      // For aggregation view, use the source sheet columns
      return ['Sheet Name', ...sourceSheets[0].columns.slice(1)];
    }
    return ['Input'];
  });
  const [title, setTitle] = useState(
    aggregationCriteria ? `Aggregate sheet ${aggregationCriteria}` : 'Datasheet'
  );
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLLMPipe, setShowLLMPipe] = useState(false);
  const [showRunDropdown, setShowRunDropdown] = useState(false);
  const [isRunningAggregation, setIsRunningAggregation] = useState(false);
  const [isRunningFind, setIsRunningFind] = useState(false);
  const [isRunningCells, setIsRunningCells] = useState(false);
  const [aggregationPrompt, setAggregationPrompt] = useState('');

  useImperativeHandle(ref, () => ({
    handleRunFind,
    handleRunCells,
    handleRunAggregation,
    getHeaders: () => {
      if (isAggregation && sourceSheets?.[0]?.columns) {
        return ['Sheet Name', 'Count', 'Last Updated', ...sourceSheets[0].columns.slice(1)];
      }
      return headers;
    }
  }));

  const handleRunAggregation = async () => {
    if (!sourceSheets || !isAggregation) return;
    setIsRunningAggregation(true);

    try {
      // Get all sheets from the source 3D spreadsheet
      const threeDSheets = sourceSheets[0].data;
      console.log('Processing sheets:', threeDSheets.length);
      
      // Make one API call per sheet in the 3D spreadsheet
      const promises = threeDSheets.map(async (sheet, sheetIndex) => {
        const response = await fetch('/api/aggregate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              cells: sheet,
              prevRow: sourceSheets[0].prevRows[sheetIndex] || []
            },
            columns: sourceSheets[0].columns,
            prevTableHeaders: prevTableHeaders || [],
            aggregationPrompt,
            sheetName: `Sheet ${sheetIndex + 1}`,
            sheetIndex
          }),
        });

        if (!response.ok) throw new Error(`Failed to aggregate sheet ${sheetIndex}`);
        
        const result = await response.json();
        return result;
      });

      const results = await Promise.all(promises);
      
      // Transform the results into rows for the spreadsheet
      const newData = results.map((result, rowIndex) => {
        if (!result.success) return null;

        const row = [
          { value: result.sheetName || `Sheet ${rowIndex + 1}`, row: rowIndex, col: 0 },
        ];

        // Add any additional insights from the aggregation
        if (result.aggregatedInsights) {
          Object.entries(result.aggregatedInsights).forEach(([key, value], colIndex) => {
            if (colIndex > 0) { // Skip the first column since we already have the sheet name
              row.push({
                value: value?.toString() || '',
                row: rowIndex,
                col: colIndex + 2
              });
            }
          });
        }

        return row;
      }).filter(Boolean);

      setData(newData);
      onRowsChanged?.(newData);
    } catch (error) {
      console.error('Error running aggregation:', error);
    } finally {
      setIsRunningAggregation(false);
    }
  };

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

  const handlePipeToLLM = async () => {
    setShowLLMPipe(true);
    setHeaders(['Input', 'Output']);
    // Keep only first column data as input
    const inputData = data.map(row => ({
      value: row[0]?.value || '',
      row: 0,
      col: 0
    }));
    
    try {
      // Call API to process the input through LLM
      const response = await fetch('/api/process-llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: inputData.map(cell => cell.value) }),
      });

      if (!response.ok) throw new Error('Failed to process through LLM');
      
      const { outputs } = await response.json();
      
      // Create two-column data with input and output
      const newData = inputData.map((input, index) => [
        input,
        {
          value: outputs[index] || '',
          row: 0,
          col: 1
        }
      ]);

      setData(newData);
      onRowsChanged?.(newData);
    } catch (error) {
      console.error('Error processing through LLM:', error);
    }
  };

  const handleRunFind = async () => {
    if (isRunningFind) return;
    setIsRunningFind(true);
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
      
      if (!results || !Array.isArray(results) || results.length === 0) {
        console.warn('No results found');
        return;
      }
      
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
    } finally {
      setIsRunningFind(false);
      setShowRunDropdown(false);
    }
  };

  const handleRunCells = async () => {
    if (isRunningCells) return;
    setIsRunningCells(true);
    try {
      // For each row, make a runCells API call
      const promises = data.map(async (row, rowIndex) => {
        const firstColumnCell = row.find(cell => cell.col === 0);
        if (!firstColumnCell?.value) return row; // Return unchanged row if no input

        // Create columns object from headers
        const columns = headers.reduce((acc, header, index) => {
          acc[header] = row[index]?.value || ''; // Use existing value or empty string
          return acc;
        }, {} as { [key: string]: string });

        try {
          const response = await fetch('/api/runCells', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: firstColumnCell.value,
              columns
            }),
          });

          if (!response.ok) throw new Error('Failed to run cells');
          
          const responseData = await response.json();
          
          // Update the row with results
          if (responseData.success && responseData.results) {
            return Object.entries(responseData.results).map(([colName, value], colIndex) => ({
              value: colIndex === 0 ? firstColumnCell.value : value as string,
              row: rowIndex,
              col: colIndex
            }));
          }
        } catch (error) {
          console.error(`Error running cells for row ${rowIndex}:`, error);
        }
        return row; // Return unchanged row if there was an error
      });

      const newData = await Promise.all(promises);
      setData(newData.filter(Boolean) as Array<Array<{ value: string; row: number; col: number }>>);
      onRowsChanged?.(newData);
    } catch (error) {
      console.error('Error running cells:', error);
    } finally {
      setIsRunningCells(false);
      setShowRunDropdown(false);
    }
  };

  return (
    <div className={`
      ${isExpanded 
        ? 'fixed inset-0 !pointer-events-auto z-[99999] bg-gray-50/80' 
        : 'relative w-full h-[300px]'}
      transition-all duration-200
    `}>
      <div className={`
        ${isExpanded ? 'absolute inset-4' : 'relative w-full h-full'}
        bg-white border border-gray-200/80 overflow-hidden
      `}>
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsExpanded(!isExpanded);
                onExpandChange?.(!isExpanded);
              }}
              className="px-4 py-2 text-gray-600 font-medium
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
            {isAggregation && (
              <button
                onClick={handleRunAggregation}
                disabled={isRunningAggregation}
                className="px-4 py-2 bg-indigo-500 text-white font-medium
                  hover:bg-indigo-600 transition-colors duration-150 flex items-center gap-2
                  shadow-sm hover:shadow active:translate-y-[1px] disabled:opacity-50
                  disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isRunningAggregation ? 'Running...' : 'Run Aggregation'}
              </button>
            )}
            {!isAggregation && (
                <div className="relative">
                <button
                    onClick={() => setShowRunDropdown(!showRunDropdown)}
                    className="px-4 py-2 bg-indigo-500 text-white font-medium
                    hover:bg-indigo-600 transition-colors duration-150 flex items-center gap-2
                    shadow-sm hover:shadow active:translate-y-[1px]"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Run
                </button>
                
                {showRunDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg border border-gray-200 py-1 z-[103]">
                    <button
                        onClick={handleRunFind}
                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 
                        transition-colors duration-150 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Run Find
                    </button>
                    <button
                        onClick={handleRunCells}
                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 
                        transition-colors duration-150 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h7" />
                        </svg>
                        Run Cells
                    </button>
                    </div>
                )}
                </div>
            )}
            {isExpanded && (
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-gray-100 text-gray-600 
                  hover:text-gray-900 transition-colors duration-150"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Add aggregation prompt section for aggregation views */}
        {isAggregation && (
          <div className="p-4 border-b border-gray-200/80">
            <textarea
              value={aggregationPrompt}
              onChange={(e) => setAggregationPrompt(e.target.value)}
              placeholder="Describe how you want to aggregate the data from the previous sheets. Each sheet will be maps to a single row."
              className="w-full h-16 px-3 py-2 border border-gray-200 
                focus:outline-none focus:ring-2 focus:ring-indigo-400/30
                text-gray-700 placeholder-gray-400 resize-none"
            />
          </div>
        )}

        <div className={`
          ${isExpanded ? 'h-[calc(100%-8rem)]' : 'h-[calc(100%-4rem)]'} 
          ${isAggregation ? 'h-[calc(100%-12rem)]' : ''} 
          overflow-auto`}
        >
          <Spreadsheet
            data={data}
            headers={headers}
            onHeaderChange={handleHeaderChange}
            onCellChange={handleCellChange}
            onAddRow={handleAddRow}
            onAddColumn={handleAddColumn}
            onDeleteColumn={handleDeleteColumn}
            onDeleteRow={handleDeleteRow}
            firstColumnWidth="min-w-[8rem] max-w-[8rem]"
          />
        </div>
      </div>
    </div>
  );
}); 