import { NextResponse } from 'next/server';
import { llm } from '@/lib/llm';
interface LLMRequest {
  inputs: string[];
  prompt: string;
}   

export async function POST(req: Request) {
  try {
    const { inputs, prompt } = await req.json() as LLMRequest;

    // For demonstration, we'll just echo back a modified version of each input
    // In a real implementation, you would call your LLM service here
    const outputs = await Promise.all(inputs.map(async (input) => {
      // Replace any {input} placeholders in the prompt with the actual input
      const processedPrompt = `
        ${prompt}

        Inputs: 
        ${JSON.stringify(input)}

        Follow the instructions in the prompt and return the response using the context as described. You should substitue the variables when you can / with the provided context.
      `
      const llmResponse = await llm(processedPrompt, "gpt-4o");  

      return llmResponse;
    }));

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