import { NextResponse } from 'next/server';
import { createAndExecuteTask } from '@/lib/agent';

export async function POST(req: Request) {
  try {
    const { query, sheet_level } = await req.json();

    const findAllTask = {
      name: "find_all",
      description: "Find certain entities as requested",
      model: "rhodium",
      prompt: `Find a list of entities that match the query: ${query}`,
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query"
          }
        },
        required: ["query"],
        additionalProperties: false
      },
      output_schema: {
        type: "object",
        properties: {
          results: {
            type: "array",
            description: "Array of matching entities",
            items: {
              type: "string"
            }
          }
        },
        required: ["results"],
        additionalProperties: false
      }
    };

    const response = await createAndExecuteTask(findAllTask, { query });
    console.log(response);
    if (!response.output?.results) {
      throw new Error('No results returned from task');
    }

    return NextResponse.json({
      success: true,
      results: response.output.results,
      query: query,
      total: response.output.results.length
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