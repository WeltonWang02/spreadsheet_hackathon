import { NextResponse } from 'next/server';

interface RunCellsRequest {
  input: string;
  columns: { [key: string]: string };
}

export async function POST(req: Request) {
  try {
    const { input, columns } = await req.json() as RunCellsRequest;

    // For demonstration, we'll just echo back the input with some modifications
    const results: { [key: string]: string } = {};
    
    // Process each column
    Object.keys(columns).forEach(colName => {
      results[colName] = `Processed ${input} for ${colName}`;
    });

    return NextResponse.json({
      success: true,
      results,
      input
    });

  } catch (error) {
    console.error('Error in runCells API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        results: {}
      },
      { status: 500 }
    );
  }
} 