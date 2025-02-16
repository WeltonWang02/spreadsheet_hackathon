import { NextResponse } from 'next/server';

interface ToolCall {
  type: 'findall_sheets';
  params: {
    query: string;
  };
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // This is a mock response - in reality, this would be determined by your AI logic
    // For demonstration, if the message contains "find sheets" or "search sheets",
    // we'll include a findall_sheets tool call
    const lastMessage = messages[messages.length - 1];
    const toolCalls: ToolCall[] = [];
    
    if (lastMessage.content.toLowerCase().includes('find sheets') || 
        lastMessage.content.toLowerCase().includes('search sheets')) {
      toolCalls.push({
        type: 'findall_sheets',
        params: {
          query: lastMessage.content
        }
      });
      
      return NextResponse.json({
        response: "I'll help you find those sheets. Let me search for them...",
        toolCalls
      });
    }

    // Default response without tool calls
    return NextResponse.json({
      response: "This is a placeholder response. Implement your orchestration logic here.",
      toolCalls: []
    });

  } catch (error) {
    console.error('Error in orchestrate API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 