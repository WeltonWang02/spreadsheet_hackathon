import { NextResponse } from 'next/server';

interface ToolCall {
  type: 'findall_sheets' | 'update_headers';
  params: {
    query?: string;
    headers?: string[];  // For update_headers
  };
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];
    const toolCalls: ToolCall[] = [];
    
    // Check for header update request
    if (lastMessage.content.toLowerCase().includes('update header') || 
        lastMessage.content.toLowerCase().includes('change header') ||
        lastMessage.content.toLowerCase().includes('update column')) {
      // This is a simple example - in reality, you'd want more sophisticated parsing
      // For demo, we'll just create some sample headers
      toolCalls.push({
        type: 'update_headers',
        params: {
          headers: ['Name', 'Age', 'Email', 'Phone', 'Address']
        }
      });
      
      return NextResponse.json({
        response: "I'll update the column headers for you.",
        toolCalls
      });
    }

    // Existing findall_sheets logic
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