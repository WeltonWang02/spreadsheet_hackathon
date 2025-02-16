import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import Spreadsheet from '@/components/Spreadsheet';

interface LLMPipeSpreadsheetProps {
  sourceData: Array<Array<{ value: string; row: number; col: number }>>;
  onDataChange?: (data: Array<Array<{ value: string; row: number; col: number }>>) => void;
  headers: string[];
}

export const LLMPipeSpreadsheet = forwardRef<
  { handlePipeToLLM: () => Promise<void> },
  LLMPipeSpreadsheetProps
>(({ sourceData, onDataChange, headers }, ref) => {
  const [prompt, setPrompt] = useState('');
  const [data, setData] = useState<Array<Array<{ value: string; row: number; col: number }>>>(sourceData);
  const [isRunning, setIsRunning] = useState(false);

  // Update local data when source data changes
  useEffect(() => {
    if (!sourceData || sourceData.length === 0) return;

    // Format each row as key-value pairs using provided headers
    const formattedData = sourceData.map(row => {
      // Create a formatted string with header-value pairs
      const formattedValue = headers.map((header, index) => {
        const cellValue = row[index]?.value || '';
        return `${header}: ${cellValue}`;
      }).join('\n');

      return [
        { value: formattedValue, row: row[0].row, col: 0 },
        { value: '', row: row[0].row, col: 1 } // Empty column for LLM output
      ];
    });

    setData(formattedData);
  }, [sourceData, headers]);

  const handlePipeToLLM = async () => {
    setIsRunning(true);
    try {
      // Call your LLM API here with the prompt and input data
      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: sourceData.map(row => {
            // Create an object with proper column names as keys
            return headers.reduce((acc, header, index) => {
              acc[header] = row[index]?.value || '';
              return acc;
            }, {} as Record<string, string>);
          }),
          prompt
        }),
      });

      if (!response.ok) throw new Error('Failed to process through LLM');
      
      const { outputs } = await response.json();
      
      // Update the output column with LLM responses
      const newData = data.map((row, index) => [
        row[0], // Keep the formatted input
        { 
          value: outputs[index]?.text || '', 
          row: row[0].row, 
          col: 1 
        }
      ]);

      setData(newData);
      onDataChange?.(newData);
    } catch (error) {
      console.error('Error processing through LLM:', error);
    }
    setIsRunning(false);
  };

  useImperativeHandle(ref, () => ({
    handlePipeToLLM
  }));

  return (
    <div className="bg-white border border-gray-200/80 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200/80 bg-white">
        <h3 className="font-medium text-gray-700">LLM Response</h3>
        <p className="text-sm text-gray-500 mt-1">
          Process each row through an LLM and output a structured response.
        </p>
      </div>
      
      <div className="p-4 border-b border-gray-200/80">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Configure how the LLM should process each row. Each input will be formatted as key-value pairs using the column headers from the source sheet."
          className="w-full h-32 px-3 py-2 border border-gray-200 
            focus:outline-none focus:ring-2 focus:ring-indigo-400/30
            text-gray-700 placeholder-gray-400 resize-none"
        />
        <button
          onClick={handlePipeToLLM}
          disabled={isRunning}
          className="mt-2 px-4 py-2 bg-indigo-500 text-white font-medium
            hover:bg-indigo-600 transition-colors duration-150 flex items-center gap-2
            shadow-sm hover:shadow active:translate-y-[1px]
            disabled:bg-indigo-300 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {isRunning ? 'Processing...' : 'Run LLM'}
        </button>
      </div>

      <div className="p-4">
        <Spreadsheet
          data={data}
          headers={['Row Content', 'LLM Output']}
          onCellChange={(row, col, value) => {
            const newData = [...data];
            if (!newData[row]) {
              newData[row] = [
                { value: '', row, col: 0 },
                { value: '', row, col: 1 }
              ];
            }
            newData[row][col].value = value;
            setData(newData);
            onDataChange?.(newData);
          }}
          firstColumnWidth="w-1/2"
          multiline={true}
        />
      </div>
    </div>
  );
}); 