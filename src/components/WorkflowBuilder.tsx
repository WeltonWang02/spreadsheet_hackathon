import React, { useState, useRef } from 'react';
import { SingleSpreadsheet } from './SingleSpreadsheet';
import ThreeDSpreadsheet from './ThreeDSpreadsheet';
import { WorkflowAssistant } from '@/components/WorkflowAssistant';

interface SpreadsheetNode {
  id: string;
  type: 'single' | '3d';
  position: { x: number; y: number };
  name: string;
}

interface Connection {
  sourceId: string;
  targetId: string;
}

interface DragState {
  nodeId: string | 'canvas';
  startX: number;
  startY: number;
  originalX: number;
  originalY: number;
}

export function WorkflowBuilder() {
  const [nodes, setNodes] = useState<SpreadsheetNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingSource, setConnectingSource] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  const handleAddSpreadsheet = (type: 'single' | '3d') => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const centerX = (canvasRect?.width || 1000) / 2 - (type === 'single' ? 200 : 300);
    const centerY = (canvasRect?.height || 800) / 2;
    
    const newNode: SpreadsheetNode = {
      id: crypto.randomUUID(),
      type,
      position: { 
        x: centerX + nodes.length * 30 - canvasOffset.x, 
        y: centerY + nodes.length * 30 - canvasOffset.y
      },
      name: `${type === 'single' ? 'Single' : '3D'} Spreadsheet ${nodes.length + 1}`
    };
    setNodes([...nodes, newNode]);
  };

  const handleStartConnection = (nodeId: string) => {
    setIsConnecting(true);
    setConnectingSource(nodeId);
  };

  const handleCompleteConnection = (targetId: string) => {
    if (connectingSource && connectingSource !== targetId) {
      const sourceNode = nodes.find(n => n.id === connectingSource);
      const targetNode = nodes.find(n => n.id === targetId);
      
      if (sourceNode?.type === 'single' && targetNode?.type === '3d') {
        // Check if connection already exists
        const connectionExists = connections.some(
          c => c.sourceId === connectingSource && c.targetId === targetId
        );
        
        if (!connectionExists) {
          setConnections([...connections, {
            sourceId: connectingSource,
            targetId
          }]);
        }
      }
    }
    setIsConnecting(false);
    setConnectingSource(null);
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setConnections(connections.filter(c => c.sourceId !== nodeId && c.targetId !== nodeId));
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDragState({
        nodeId,
        startX: e.clientX,
        startY: e.clientY,
        originalX: node.position.x,
        originalY: node.position.y
      });
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || e.target === canvasRef.current?.firstChild) {
      setDragState({
        nodeId: 'canvas',
        startX: e.clientX,
        startY: e.clientY,
        originalX: canvasOffset.x,
        originalY: canvasOffset.y
      });
    }
  };

  const throttleMouseMove = (callback: (e: React.MouseEvent) => void) => {
    return (e: React.MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdateTimeRef.current >= 16) { // ~60fps
        callback(e);
        lastUpdateTimeRef.current = now;
      }
    };
  };

  const handleMouseMove = throttleMouseMove((e: React.MouseEvent) => {
    if (!dragState) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    if (dragState.nodeId === 'canvas') {
      setCanvasOffset({
        x: dragState.originalX - deltaX,
        y: dragState.originalY - deltaY
      });
    } else {
      setNodes(nodes.map(node => {
        if (node.id === dragState.nodeId) {
          return {
            ...node,
            position: {
              x: dragState.originalX + deltaX,
              y: dragState.originalY + deltaY
            }
          };
        }
        return node;
      }));
    }
  });

  const handleMouseUp = () => {
    setDragState(null);
  };

  const getConnectionPath = (source: SpreadsheetNode, target: SpreadsheetNode) => {
    const sourceX = source.position.x + (source.type === 'single' ? 400 : 600);
    const sourceY = source.position.y + 100;
    const targetX = target.position.x;
    const targetY = target.position.y + 100;
    
    const controlPoint1X = sourceX + 50;
    const controlPoint2X = targetX - 50;
    
    return `M ${sourceX},${sourceY} 
            C ${controlPoint1X},${sourceY} 
              ${controlPoint2X},${targetY} 
              ${targetX},${targetY}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex">
      {/* Toolbar */}
      <div className="fixed top-8 left-8 space-y-4 z-50">
        <button
          onClick={() => handleAddSpreadsheet('single')}
          className="w-48 p-3 rounded-lg bg-white shadow-sm hover:shadow-md
            border border-gray-200 text-gray-700 font-medium
            transition-all duration-150 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Add Single Sheet
        </button>
        <button
          onClick={() => handleAddSpreadsheet('3d')}
          className="w-48 p-3 rounded-lg bg-white shadow-sm hover:shadow-md
            border border-gray-200 text-gray-700 font-medium
            transition-all duration-150 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z M7 4v16" />
          </svg>
          Add 3D Sheet
        </button>
      </div>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="relative flex-1 h-full min-h-[800px] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid Background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />

        {/* Content Container */}
        <div 
          className="absolute inset-0 transition-transform duration-75"
          style={{ 
            transform: `translate(${-canvasOffset.x}px, ${-canvasOffset.y}px)` 
          }}
        >
          {/* Connection Lines */}
          <svg className="absolute inset-0 pointer-events-none">
            {/* Connection being drawn */}
            {isConnecting && connectingSource && (
              <path
                className="connection-preview"
                stroke="#818CF8"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
                d={`M ${nodes.find(n => n.id === connectingSource)?.position.x + 400 || 0},
                     ${nodes.find(n => n.id === connectingSource)?.position.y + 100 || 0}`}
              />
            )}
            
            {/* Existing connections */}
            {connections.map((connection, index) => {
              const sourceNode = nodes.find(n => n.id === connection.sourceId);
              const targetNode = nodes.find(n => n.id === connection.targetId);
              
              if (sourceNode && targetNode) {
                return (
                  <g key={index}>
                    <path
                      d={getConnectionPath(sourceNode, targetNode)}
                      stroke="#818CF8"
                      strokeWidth="2"
                      fill="none"
                    />
                    <circle
                      cx={sourceNode.position.x + (sourceNode.type === 'single' ? 400 : 600)}
                      cy={sourceNode.position.y + 100}
                      r="4"
                      fill="#818CF8"
                    />
                    <circle
                      cx={targetNode.position.x}
                      cy={targetNode.position.y + 100}
                      r="4"
                      fill="#818CF8"
                    />
                  </g>
                );
              }
              return null;
            })}
          </svg>

          {/* Nodes */}
          {nodes.map(node => (
            <div
              key={node.id}
              className={`absolute p-0 rounded-xl transition-transform duration-75
                ${selectedNode === node.id ? 'ring-2 ring-indigo-400' : ''}
                ${isConnecting ? 'cursor-pointer' : 'cursor-move'}
                ${dragState?.nodeId === node.id ? 'z-50' : 'z-40'}
              `}
              style={{
                transform: `translate3d(${node.position.x}px, ${node.position.y}px, 0) ${dragState?.nodeId === node.id ? 'scale(1.02)' : 'scale(1)'}`,
                width: node.type === 'single' ? '600px' : '600px',
                willChange: 'transform'
              }}
              onClick={() => {
                if (isConnecting) {
                  handleCompleteConnection(node.id);
                } else {
                  setSelectedNode(node.id);
                }
              }}
              onMouseDown={(e) => {
                if (!isConnecting) {
                  e.stopPropagation();
                  handleMouseDown(e, node.id);
                }
              }}
            >
              {node.type === 'single' ? (
                <SingleSpreadsheet />
              ) : (
                <div className="h-[400px]">
                  <ThreeDSpreadsheet
                    initialSheets={0}
                    initialRows={10}
                    initialCols={5}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Assistant Toggle Button */}
      {!isAssistantOpen && (
        <button
          onClick={() => setIsAssistantOpen(true)}
          className="fixed right-8 top-8 z-[60] p-3 rounded-xl bg-white shadow-sm
            hover:shadow-md active:shadow-sm active:translate-y-[1px]
            border border-gray-200/60 hover:bg-gray-50 transition-all duration-150"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
          </svg>
        </button>
      )}

      {/* Assistant Panel */}
      <WorkflowAssistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
    </div>
  );
} 