import React, { useState, useEffect } from 'react';
import Spreadsheet from '@/components/Spreadsheet';

interface LLMPipeSpreadsheetProps {
  sourceData?: Array<Array<{ value: string; row: number; col: number }>>;
  onDataChange?: (data: Array<Array<{ value: string; row: number; col: number }>>) => void;
}

export function LLMPipeSpreadsheet({
  sourceData = [],
  onDataChange
}: LLMPipeSpreadsheetProps) {
  const [prompt, setPrompt] = useState('');
  const [data, setData] = useState<Array<Array<{ value: string; row: number; col: number }>>>(sourceData);

  // Update local data when source data changes
  useEffect(() => {
    setData(sourceData);
  }, [sourceData]);

  const handleRunLLM = async () => {
    try {
      // Call your LLM API here with the prompt and input data
      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: data.map(row => row[0]?.value || ''),
          prompt
        }),
      });

      if (!response.ok) throw new Error('Failed to process through LLM');
      
      const { outputs } = await response.json();
      
      // Update the output column with LLM responses
      const newData = data.map((row, index) => [
        row[0],
        { value: outputs[index] || '', row: row[0].row, col: 1 }
      ]);

      setData(newData);
      onDataChange?.(newData);
    } catch (error) {
      console.error('Error processing through LLM:', error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200/80 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200/80 bg-white">
        <h3 className="font-medium text-gray-700">LLM Pipe</h3>
        <p className="text-sm text-gray-500 mt-1">
          Process each row through an LLM. The input column shows all fields from the source row.
        </p>
      </div>
      
      <div className="p-4 border-b border-gray-200/80">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          LLM Prompt Configuration
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Configure how the LLM should process each row. Use {input} to reference the row content. The input will contain all fields from the source row in a key-value format."
          className="w-full h-32 px-3 py-2 border border-gray-200 rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-indigo-400/30
            text-gray-700 placeholder-gray-400 resize-none"
        />
        <button
          onClick={handleRunLLM}
          className="mt-2 px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium
            hover:bg-indigo-600 transition-colors duration-150 flex items-center gap-2
            shadow-sm hover:shadow active:translate-y-[1px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Run LLM
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
        />
      </div>
    </div>
  );
} 