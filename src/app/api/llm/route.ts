import { NextResponse } from 'next/server';

interface LLMRequest {
  inputs: string[];
  prompt: string;
}

export async function POST(req: Request) {
  try {
    const { inputs, prompt } = await req.json() as LLMRequest;

    // For demonstration, we'll just echo back a modified version of each input
    // In a real implementation, you would call your LLM service here
    const outputs = inputs.map(input => {
      // Replace any {input} placeholders in the prompt with the actual input
      const processedPrompt = prompt.replace(/{input}/g, input);
      return `Processed: ${processedPrompt}`;
    });

    return NextResponse.json({
      success: true,
      outputs,
      prompt
    });

  } catch (error) {
    console.error('Error in LLM API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        outputs: []
      },
      { status: 500 }
    );
  }
} 