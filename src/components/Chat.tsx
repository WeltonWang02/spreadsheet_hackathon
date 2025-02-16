import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'system';
  timestamp: number;
}

interface ToolCall {
  type: 'findall_sheets' | 'update_headers';
  params: {
    query?: string;
    headers?: string[];
  };
}

interface ChatProps {
  onClose: () => void;
  onCreateSheet?: (name: string) => void;
  onUpdateHeaders?: (headers: string[]) => void;
}

export default function Chat({ onClose, onCreateSheet, onUpdateHeaders }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleToolCalls = async (toolCalls: ToolCall[]) => {
    for (const toolCall of toolCalls) {
      if (toolCall.type === 'findall_sheets') {
        try {
          // Call the findall API
          const response = await fetch('/api/findall', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: toolCall.params.query }),
          });

          if (!response.ok) throw new Error('Failed to get search results');

          const data = await response.json();
          
          if (data.success && data.results.length > 0) {
            // Create sheets for each result
            for (const name of data.results) {
              onCreateSheet?.(name);
            }

            // Add a message about the created sheets
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              content: `I've created ${data.results.length} new sheets based on the search results.`,
              role: 'system',
              timestamp: Date.now(),
            }]);
          } else {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              content: 'I couldn\'t find any matching results to create sheets from.',
              role: 'system',
              timestamp: Date.now(),
            }]);
          }
        } catch (error) {
          console.error('Error executing findall_sheets:', error);
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            content: 'Sorry, there was an error while trying to create sheets from the search results.',
            role: 'system',
            timestamp: Date.now(),
          }]);
        }
      } else if (toolCall.type === 'update_headers') {
        try {
          if (toolCall.params.headers) {
            onUpdateHeaders?.(toolCall.params.headers);
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              content: 'I\'ve updated the column headers for you.',
              role: 'system',
              timestamp: Date.now(),
            }]);
          }
        } catch (error) {
          console.error('Error updating column headers:', error);
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            content: 'Sorry, there was an error while trying to update the column headers.',
            role: 'system',
            timestamp: Date.now(),
          }]);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const newMessage: Message = {
      id: crypto.randomUUID(),
      content: inputValue.trim(),
      role: 'user',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: [...messages, newMessage] }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        content: data.response,
        role: 'system',
        timestamp: Date.now(),
      }]);

      // Handle any tool calls in the response
      if (data.toolCalls && data.toolCalls.length > 0) {
        await handleToolCalls(data.toolCalls);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        content: 'Sorry, there was an error processing your request.',
        role: 'system',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Assistant</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 
            hover:text-gray-900 transition-colors duration-150"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] rounded-lg px-4 py-2
                ${message.role === 'user'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 text-gray-800'
                }
              `}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2 text-gray-500">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 resize-none rounded-lg border border-gray-200 p-3 focus:outline-none 
              focus:ring-2 focus:ring-indigo-400/30 min-h-[2.5rem] max-h-32"
            rows={1}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium
              hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
} 