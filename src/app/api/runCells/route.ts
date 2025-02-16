import { NextResponse } from 'next/server';
import { createAndExecuteTask } from '@/lib/agent';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = body.input;
    const columns = body.columns;

    // Execute the task
    const colString = Object.keys(columns).join(', ');
    const taskResponse = await createAndExecuteTask({
      name: "Process Row Data", 
      description: "Process data",
      model: "neon",
      prompt: "For the entity {input}, find the " + colString,
      input_schema: {
        type: "object",
        properties: {
          input: {
            type: "string",
            description: "The input entity"
          }
        },
        required: ["input"],
        additionalProperties: false
      },
      output_schema: {
        type: "object",
        properties: Object.keys(columns).reduce((acc, colName) => {
          acc[colName] = {
            type: "string", 
            description: `${colName}`
          };
          return acc;
        }, {} as Record<string, { type: string; description: string }>),
        required: Object.keys(columns),
        additionalProperties: false
      }
    }, { input });

    if (!taskResponse.output) {
      throw new Error('No output returned from task');
    }
    
    return NextResponse.json({
      success: true,
      results: taskResponse.output,
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