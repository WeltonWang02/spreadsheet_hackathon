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

    // Construct prompt for LLM
    const prompt = `
      Analyze this data follow the provided instructions to aggregate the data:
      User Prompt: ${body.aggregationPrompt}
      
      The below table's headers are: ${body.prevTableHeaders.join(', ')}
    
      Data:
      ${JSON.stringify(body.data.cells, null, 2)}
      
      Previous Row Context:
      ${JSON.stringify(body.data.prevRow, null, 2)}

      Here are the columns you should return: ${body.columns.join(', ')}
    `;

    const llmResponse = await llm(prompt);

    // Return aggregated results
    return NextResponse.json({
      success: true,
      sheetName: body.sheetName,
      count: body.data.cells.length,
      lastUpdated: new Date().toISOString(),
      aggregatedInsights: llmResponse.text
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
        aggregatedInsights: ''
      },
      { status: 500 }
    );
  }
}