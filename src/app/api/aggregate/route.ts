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
      
      Here are the columns you should return: ${body.columns.join(', ')}
      You should return ${body.columns.length} values.

      The value to return for the Sheet Name (first column) is: ${prevSheetName}
      Return the other values after that.

      Return the data as a list of strings in the above order.
      You should return a list of length equal to the number of columns. That means you should aggregate the data into one row.
      Make sure all values are strings.

      Return only the JSON list.
    `;

    const llmResponse = await llm(prompt, 'gpt-4o');
    let parsedData = {};
    
    try {
      parsedData = JSON.parse(llmResponse.text);
      // Ensure all values are strings
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      parsedData = {};
    }

    // Return aggregated results
    return NextResponse.json({
      success: true,
      sheetName: prevSheetName,
      count: body.data.cells.length,
      lastUpdated: new Date().toISOString(),
      aggregatedInsights: parsedData
    });

  } catch (error) {
    console.error('Error in aggregate API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        sheetName: '',
        count: 0,
        lastUpdated: '',
        aggregatedInsights: {}
      },
      { status: 500 }
    );
  }
}