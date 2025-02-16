import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    // Hardcoded list of random names for demonstration
    const names = [
      "John Smith",
      "Emma Johnson",
      "Michael Brown",
      "Sarah Davis",
      "James Wilson",
      "Lisa Anderson",
      "David Martinez",
      "Jennifer Taylor",
      "Robert Thomas",
      "Maria Garcia"
    ];

    // In a real implementation, you would use the query to filter the results
    // For now, we'll just return all names
    return NextResponse.json({
      success: true,
      results: names,
      query: query, // Echo back the query for debugging
      total: names.length
    });

  } catch (error) {
    console.error('Error in findAll API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        results: []
      },
      { status: 500 }
    );
  }
} 