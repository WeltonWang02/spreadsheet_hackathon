import { NextResponse } from 'next/server';
import { llm } from '@/lib/llm';

interface AggregationRequest {
  data: {
    cells: Array<{ value: string; row: number; col: number }>;
    prevRow: Array<{ value: string; row: number; col: number }>;
  };
  columns: string[];
  prevTableHeaders: string[];
  aggregationPrompt: string;
  sheetName: string;
  sheetIndex: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as AggregationRequest;
    
    // Get the previous sheet name from the first cell of prevRow
    const prevSheetName = body.data.prevRow[0]?.value || body.sheetName;
    
    // Construct prompt for LLM
    const prompt = `
      Analyze this data follow the provided instructions to aggregate the data:
      User Prompt: ${body.aggregationPrompt}
      
      The below table's headers are: ${body.prevTableHeaders.join(', ')}

      Data:
      ${JSON.stringify(body.data.cells, null, 2)}
      
      Here are the columns you should return values for: ${body.columns.join(', ')}
      You should return ${body.columns.length} values, one for each column.

      For the first column (${body.columns[0]}), use this exact value: ${prevSheetName}

      For each other column, analyze the data and return an appropriate aggregated value.
      Return the values in a JSON object where each key is the exact column name and the value is the aggregated value.
      Make sure to include all columns from the input list.

      Example format:
      {
        "${body.columns[0]}": "${prevSheetName}",
        "Column2": "aggregated value",
        ...
      }

      Return only the JSON object.
    `;

    const llmResponse = await llm(prompt);
    let parsedData = {};
    
    try {
      parsedData = JSON.parse(llmResponse.text);
      // Ensure all values are strings and all columns are present
      parsedData = body.columns.reduce((acc, column) => {
        acc[column] = (parsedData[column] || '').toString();
        return acc;
      }, {} as Record<string, string>);
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      // If parsing fails, create an object with empty values for all columns
      parsedData = body.columns.reduce((acc, column) => {
        acc[column] = column === body.columns[0] ? prevSheetName : '';
        return acc;
      }, {} as Record<string, string>);
    }

    // Return aggregated results
    return NextResponse.json({
      success: true,
      sheetName: prevSheetName,
      aggregatedInsights: parsedData
    });

  } catch (error) {
    console.error('Error in aggregate API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        sheetName: '',
        aggregatedInsights: {}
      },
      { status: 500 }
    );
  }
}