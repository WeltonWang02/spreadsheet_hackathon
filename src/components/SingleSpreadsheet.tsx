import React, { useState } from 'react';
import Spreadsheet from '@/components/Spreadsheet';

interface SingleSpreadsheetProps {
  onRowsChanged?: (rows: any[]) => void;
  onExpandChange?: (expanded: boolean) => void;
  initialData?: Array<{ value: string; row: number; col: number }>;
  aggregationCriteria?: string;
  isAggregation?: boolean;
  sourceSheets?: Array<{
    name: string;
    data: Array<Array<{ value: string; row: number; col: number }>>;
    columns: string[];
  }>;
}

export function SingleSpreadsheet({
  onRowsChanged,
  onExpandChange,
  initialData,
  aggregationCriteria,
  isAggregation,
  sourceSheets
}: SingleSpreadsheetProps) {
  const [data, setData] = useState<Array<Array<{ value: string; row: number; col: number }>>>(
    initialData ? [initialData] : []
  );
  const [headers, setHeaders] = useState<string[]>(
    aggregationCriteria ? [aggregationCriteria, 'Count', 'Last Updated'] : ['Input']
  );
  const [title, setTitle] = useState(
    aggregationCriteria ? `Aggregated by ${aggregationCriteria}` : 'Source Spreadsheet'
  );
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLLMPipe, setShowLLMPipe] = useState(false);
  const [showRunDropdown, setShowRunDropdown] = useState(false);
  const [isRunningAggregation, setIsRunningAggregation] = useState(false);

  const handleRunAggregation = async () => {
    if (!sourceSheets || !isAggregation) return;
    setIsRunningAggregation(true);

    try {
      // Make one API call per sheet
      const promises = sourceSheets.map(async (sheet) => {
        const response = await fetch('/api/aggregate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sheetName: sheet.name,
            columns: sheet.columns,
            data: sheet.data
          }),
        });

        if (!response.ok) throw new Error('Failed to aggregate sheet');
        
        const { results } = await response.json();
        return results;
      });

      const results = await Promise.all(promises);
      
      // Add each result as a new row
      const newData = results.map((result, index) => ([
        { value: result['First Column'], row: data.length + index, col: 0 },
        { value: result['Count'], row: data.length + index, col: 1 },
        { value: result['Last Updated'], row: data.length + index, col: 2 }
      ]));

      const updatedData = [...data, ...newData];
      setData(updatedData);
      onRowsChanged?.(updatedData);
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
    setShowRunDropdown(false);
  };

  const handleRunCells = async () => {
    try {
      // For each row, make a runCells API call
      const promises = data.map(async (row, rowIndex) => {
        const firstColumnCell = row.find(cell => cell.col === 0);
        if (!firstColumnCell) return;

        // Create columns object from headers
        const columns = headers.reduce((acc, header, index) => {
          acc[header] = ''; // Empty string as initial value
          return acc;
        }, {} as { [key: string]: string });

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
          const newData = [...data];
          Object.entries(responseData.results).forEach(([colName, value], colIndex) => {
            if (colIndex > 0) { // Skip first column
              newData[rowIndex][colIndex] = {
                value: value as string,
                row: rowIndex,
                col: colIndex
              };
            }
          });
          setData(newData);
          onRowsChanged?.(newData);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error running cells:', error);
    }
    setShowRunDropdown(false);
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
        <div className="h-[calc(100%-4rem)] overflow-auto pb-1">
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
} 