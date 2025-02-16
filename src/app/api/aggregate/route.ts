import { NextResponse } from 'next/server';

interface AggregationRequest {
  sheetName: string;
  columns: string[];
  data: Array<Array<{ value: string; row: number; col: number }>>;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as AggregationRequest;

    // For demonstration, return dummy data that matches the column structure
    // In a real implementation, this would process the sheet data and return actual aggregations
    const dummyResponse: { [key: string]: string } = {
      'First Column': `Aggregated ${body.sheetName}`,
      'Count': Math.floor(Math.random() * 100).toString(),
      'Last Updated': new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      results: dummyResponse
    });

  } catch (error) {
    console.error('Error in aggregate API:', error);
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