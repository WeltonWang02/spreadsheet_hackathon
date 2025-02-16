'use client';

import React, { useState, useEffect } from 'react';
import Spreadsheet from './Spreadsheet';
import { SpreadsheetStorage } from '@/lib/storage';
import Chat from './Chat';

interface ThreeDSpreadsheetProps {
  initialSheets?: number;
  initialRows?: number;
  initialCols?: number;
  maxVisibleSheets?: number;
}

export default function ThreeDSpreadsheet({ 
  initialSheets = 3, 
  initialRows = 10, 
  initialCols = 5,
  maxVisibleSheets = 3
}: ThreeDSpreadsheetProps) {
  const [storage] = useState(() => new SpreadsheetStorage());
  const [activeSheet, setActiveSheet] = useState(0);
  const [sheetData, setSheetData] = useState<Array<Array<Array<{ value: string; row: number; col: number }>>>>([]);
  const [sharedHeaders, setSharedHeaders] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sheetIds, setSheetIds] = useState<string[]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [editingName, setEditingName] = useState<number | null>(null);
  const [deleteModalSheet, setDeleteModalSheet] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [rowHeaders, setRowHeaders] = useState<string[]>([]);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  // Initialize from storage or create new sheets
  useEffect(() => {
    const state = storage.getState();
    
    // Initialize headers if none exist
    if (state.headers.length === 0) {
      const initialHeaders = Array(initialCols).fill(null).map((_, index) => 
        String.fromCharCode(65 + index)
      );
      storage.updateHeaders(initialHeaders);
    }

    // Create initial sheets if none exist
    if (state.entities.length === 0) {
      for (let i = 0; i < initialSheets; i++) {
        const entity = storage.createEntity(`Sheet ${i + 1}`);
        storage.initializeEntityRows(entity.id, initialRows);
      }
    }

    // Load state
    const updatedState = storage.getState();
    setSharedHeaders(updatedState.headers);
    setSheetIds(updatedState.entities.map(e => e.id));
    setSheetNames(updatedState.entities.map(e => e.name));
    setSheetData(updatedState.entities.map(e => storage.getEntityData(e.id)));
    setRowHeaders(updatedState.headers);
  }, [initialSheets, initialRows, initialCols]);

  const handleHeaderChange = (colIndex: number, value: string) => {
    const newHeaders = [...sharedHeaders];
    const oldHeader = newHeaders[colIndex];
    newHeaders[colIndex] = value;
    setSharedHeaders(newHeaders);

    // Update storage with new headers
    storage.updateHeaders(newHeaders);

    // Refresh sheet data to reflect header changes
    setSheetData(sheetIds.map(id => storage.getEntityData(id)));
  };

  const handleSheetNameChange = (index: number, value: string) => {
    const newNames = [...sheetNames];
    newNames[index] = value;
    setSheetNames(newNames);

    // Update storage
    storage.updateEntity(sheetIds[index], { name: value });
  };

  const handleAddSheet = () => {
    // Create new entity in storage
    const entity = storage.createEntity(`Sheet ${sheetData.length + 1}`);
    storage.initializeEntityRows(entity.id, initialRows);

    // Update local state
    const updatedState = storage.getState();
    setSheetIds([...sheetIds, entity.id]);
    setSheetNames(updatedState.entities.map(e => e.name));
    setSheetData([...sheetData, storage.getEntityData(entity.id)]);
  };

  const handleDeleteSheet = (index: number) => {
    // Delete from storage
    storage.deleteEntity(sheetIds[index]);

    // Update local state
    const newSheetIds = [...sheetIds];
    newSheetIds.splice(index, 1);
    setSheetIds(newSheetIds);

    const newSheetData = [...sheetData];
    newSheetData.splice(index, 1);
    setSheetData(newSheetData);

    const newSheetNames = [...sheetNames];
    newSheetNames.splice(index, 1);
    setSheetNames(newSheetNames);

    // Adjust active sheet if needed
    if (activeSheet >= newSheetData.length) {
      setActiveSheet(Math.max(0, newSheetData.length - 1));
    } else if (activeSheet === index) {
      setActiveSheet(Math.max(0, index - 1));
    }

    setDeleteModalSheet(null);
  };

  const handleCellChange = (sheetIndex: number, row: number, col: number, value: string) => {
    // Update storage
    storage.updateSubEntity(
      sheetIds[sheetIndex],
      row.toString(),
      sharedHeaders[col],
      value
    );

    // Update local state
    const newSheetData = [...sheetData];
    newSheetData[sheetIndex][row][col].value = value;
    setSheetData(newSheetData);
  };

  const handleBulkUpdate = (sheetIndex: number, updates: { row: number; col: number; value: string }[]) => {
    // Create a copy of the sheet data
    const newSheetData = [...sheetData];
    const newSheet = [...newSheetData[sheetIndex]];

    // Apply all updates
    updates.forEach(({ row, col, value }) => {
      // Ensure we have enough rows
      while (newSheet.length <= row) {
        const newRow = Array(initialCols).fill(null).map((_, colIndex) => ({
          value: '',
          row: newSheet.length,
          col: colIndex
        }));
        newSheet.push(newRow);
      }

      // Update the cell value
      newSheet[row][col].value = value;

      // Update storage
      storage.updateSubEntity(
        sheetIds[sheetIndex],
        row.toString(),
        sharedHeaders[col],
        value
      );
    });

    // Update the sheet in the overall data
    newSheetData[sheetIndex] = newSheet;
    setSheetData(newSheetData);
  };

  const handleSheetNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setEditingName(null);
    }
  };

  const handleSheetClick = (index: number) => {
    if (!isSidebarOpen && !isTransitioning) {
      setIsTransitioning(true);
      setActiveSheet(index);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handleSidebarSheetClick = (index: number) => {
    setIsTransitioning(true);
    setActiveSheet(index);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const getStackOrder = (index: number, isActive: boolean) => {
    if (!isSidebarOpen) {
      return isActive ? sheetData.length - 1 : index;
    }
    
    if (index === activeSheet) {
      return 0;
    }

    // Calculate relative position from active sheet
    const relativePosition = index - activeSheet;
    
    // If sheet is before active sheet or too far after, don't show in stack
    if (relativePosition < 0 || relativePosition >= maxVisibleSheets) {
      return -1;
    }
    
    return relativePosition;
  };

  const isSheetVisible = (index: number, isActive: boolean, stackOrder: number) => {
    if (!isSidebarOpen) {
      return isActive;
    }

    // Show if it's the active sheet or within the visible stack range
    return stackOrder >= 0 && stackOrder < maxVisibleSheets;
  };

  const handleClearAllSheets = () => {
    // Delete all entities from storage
    sheetIds.forEach(id => storage.deleteEntity(id));

    // Reset local state
    setSheetIds([]);
    setSheetNames([]);
    setSheetData([]);
    setActiveSheet(0);
    setShowClearAllModal(false);

    // Create initial sheet
    const entity = storage.createEntity('Sheet 1');
    storage.initializeEntityRows(entity.id, initialRows);
    
    // Update state with new sheet
    const updatedState = storage.getState();
    setSheetIds([entity.id]);
    setSheetNames(['Sheet 1']);
    setSheetData([storage.getEntityData(entity.id)]);
  };

  const handleAddColumn = () => {
    // Generate a new header name
    const newHeader = String.fromCharCode(65 + sharedHeaders.length);
    const newHeaders = [...sharedHeaders, newHeader];
    
    // Update storage with new headers
    storage.updateHeaders(newHeaders);
    
    // Update local state
    setSharedHeaders(newHeaders);
    setSheetData(sheetIds.map(id => storage.getEntityData(id)));
  };

  const handleAddRow = () => {
    // Create a new row for each sheet
    sheetIds.forEach((id, sheetIndex) => {
      const rowKey = sheetData[sheetIndex].length.toString();
      
      // Initialize the new row in storage
      sharedHeaders.forEach(header => {
        storage.updateSubEntity(id, rowKey, header, '');
      });
    });

    // Update local state
    setSheetData(sheetIds.map(id => storage.getEntityData(id)));
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Menu Button */}
        <button 
          onClick={toggleSidebar}
          className={`
            fixed top-8 transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'left-8' : 'left-8'}
            z-50 p-3 rounded-xl hover:bg-gray-100 bg-white shadow-sm
            hover:shadow-md active:shadow-sm active:translate-y-[1px]
            border border-gray-200/60
          `}
        >
          <div className="space-y-1.5">
            <div className="w-5 h-0.5 bg-gray-500"></div>
            <div className="w-5 h-0.5 bg-gray-500"></div>
            <div className="w-5 h-0.5 bg-gray-500"></div>
          </div>
        </button>

        {/* Spreadsheet Layout */}
        <div className={`
          relative w-full h-full transition-all duration-300
          ${isSidebarOpen ? 'pl-80' : ''}
          ${isChatOpen ? 'pr-96' : 'pr-0'}
          pt-24 px-8
        `}>
          {/* Sidebar */}
          <div className={`
            fixed left-0 top-0 h-full bg-white shadow-xl transition-all duration-300 transform
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            w-72 border-r border-gray-200/80 z-40
          `}>
            <div className="p-8 pt-28 flex flex-col h-full">
              <h2 className="text-xl font-semibold mb-6 text-gray-800">Spreadsheets</h2>
              <ul className="space-y-2.5 flex-1 overflow-y-auto">
                {sheetNames.map((name, index) => (
                  <li 
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSidebarSheetClick(index);
                    }}
                    className={`
                      p-3.5 rounded-lg cursor-pointer transition-all duration-150
                      ${activeSheet === index 
                        ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm border border-indigo-100' 
                        : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                      }
                      group flex items-center justify-between
                    `}
                  >
                    <span>
                      {name}
                    </span>
                    {sheetData.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModalSheet(index);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150
                          p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              
              {/* Action Buttons */}
              <div className="space-y-3 mt-4">
                <button
                  onClick={handleAddSheet}
                  className="w-full p-3.5 rounded-lg bg-indigo-50 text-indigo-600 
                    hover:bg-indigo-100 transition-colors duration-150 font-medium
                    border border-indigo-100 flex items-center justify-center gap-2
                    hover:shadow-sm active:translate-y-[1px]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Sheet
                </button>

                <button
                  onClick={() => setShowClearAllModal(true)}
                  className="w-full p-3.5 rounded-lg bg-red-50 text-red-600 
                    hover:bg-red-100 transition-colors duration-150 font-medium
                    border border-red-100 flex items-center justify-center gap-2
                    hover:shadow-sm active:translate-y-[1px]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear All Sheets
                </button>
              </div>
            </div>
          </div>

          {/* Spreadsheets */}
          <div className={`
            relative w-full h-full 
            ${isSidebarOpen ? 'overflow-visible' : 'overflow-hidden'}
          `}>
            {sheetData.map((sheet, index) => {
              const isActive = activeSheet === index;
              const stackOrder = getStackOrder(index, isActive);
              const visible = isSheetVisible(index, isActive, stackOrder);
              
              return (
                <div
                  key={index}
                  onClick={() => handleSheetClick(index)}
                  className={`
                    absolute 
                    transition-all 
                    duration-300 
                    ease-in-out
                    ${!isSidebarOpen ? (
                      isActive ? 'opacity-100' : 'opacity-0'
                    ) : (
                      visible ? 'opacity-100 cursor-pointer hover:opacity-95' : 'opacity-0 pointer-events-none'
                    )}
                    ${isTransitioning ? 'scale-95' : 'scale-100'}
                  `}
                  style={{
                    transform: isSidebarOpen
                      ? stackOrder >= 0
                        ? `translate(${stackOrder * 40}px, ${-stackOrder * 20}px) ${isTransitioning ? 'scale(0.95)' : ''}`
                        : 'translate(-100%, 0)'
                      : isActive
                        ? 'none'
                        : `translate(${(index - activeSheet) * 100}%, 0)`,
                    zIndex: isSidebarOpen 
                      ? stackOrder >= 0 ? 30 - stackOrder : -1 
                      : isActive ? 30 : -1,
                    left: 0,
                    top: 0,
                    pointerEvents: isTransitioning || !visible ? 'none' : 'auto',
                    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <div className={`
                    bg-white rounded-xl overflow-hidden
                    ${!isActive 
                      ? 'shadow-md hover:shadow-lg border border-gray-200/60' 
                      : 'shadow-lg border border-gray-200/80'
                    } 
                    transition-all duration-300
                  `}>
                    {/* Sheet Name Header */}
                    <div 
                      className={`
                        px-6 py-4 border-b border-gray-200/80 
                        ${isActive ? 'bg-white' : 'bg-gray-50/50'}
                        transition-colors duration-300
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingName(index);
                      }}
                    >
                      {editingName === index ? (
                        <input
                          type="text"
                          value={sheetNames[index]}
                          onChange={(e) => handleSheetNameChange(index, e.target.value)}
                          onKeyDown={handleSheetNameKeyDown}
                          onBlur={() => setEditingName(null)}
                          className="w-full px-3 py-1.5 rounded-lg border border-indigo-300 
                            focus:outline-none focus:ring-2 focus:ring-indigo-400/30
                            text-gray-700 font-medium bg-white"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <h3 className="font-medium text-gray-700 cursor-text px-1">
                          {sheetNames[index]}
                        </h3>
                      )}
                    </div>
                    <Spreadsheet
                      key={index}
                      initialRows={initialRows}
                      initialCols={initialCols}
                      data={sheet}
                      headers={sharedHeaders}
                      onHeaderChange={handleHeaderChange}
                      onCellChange={(row, col, value) => handleCellChange(index, row, col, value)}
                      sheetName={sheetNames[index]}
                      isSidebarOpen={isSidebarOpen}
                      onBulkUpdate={(updates) => handleBulkUpdate(index, updates)}
                      onAddColumn={handleAddColumn}
                      onAddRow={handleAddRow}
                    />
                  </div>
                </div>
              );
            })}

            {/* Stack Count Indicator */}
            {isSidebarOpen && sheetData.length > maxVisibleSheets && (
              <div 
                className="absolute right-4 top-4 px-3 py-1.5 bg-gray-800/80 text-white 
                  rounded-full text-sm font-medium backdrop-blur-sm"
              >
                {sheetData.length - maxVisibleSheets} more
              </div>
            )}
          </div>

          {/* Clear All Confirmation Modal */}
          {showClearAllModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Clear All Sheets</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete all sheets? This action cannot be undone and will leave you with a single empty sheet.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowClearAllModal(false)}
                    className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 
                      font-medium transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearAllSheets}
                    className="px-4 py-2 rounded-lg bg-red-500 text-white 
                      hover:bg-red-600 font-medium transition-colors duration-150
                      shadow-sm hover:shadow active:translate-y-[1px]"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteModalSheet !== null && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Sheet</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete "{sheetNames[deleteModalSheet]}"? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeleteModalSheet(null)}
                    className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 
                      font-medium transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteSheet(deleteModalSheet)}
                    className="px-4 py-2 rounded-lg bg-red-500 text-white 
                      hover:bg-red-600 font-medium transition-colors duration-150
                      shadow-sm hover:shadow active:translate-y-[1px]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Toggle Button (Visible when chat is collapsed) */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
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

      {/* Chat Panel */}
      <div className={`
        fixed right-0 top-0 w-96 h-screen bg-white shadow-xl transition-all duration-300 transform
        ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}
        border-l border-gray-200/80 z-[55]
      `}>
        <Chat 
          onClose={() => setIsChatOpen(false)} 
          onCreateSheet={(name) => {
            // First, ensure sidebar is open
            setIsSidebarOpen(true);

            // Create new entity in storage
            const entity = storage.createEntity(name);
            storage.initializeEntityRows(entity.id, initialRows);
            
            // Initialize empty data structure for the new sheet
            const emptySheetData = Array(initialRows).fill(null).map((_, rowIndex) =>
              Array(initialCols).fill(null).map((_, colIndex) => ({
                value: '',
                row: rowIndex,
                col: colIndex
              }))
            );

            // Set transitioning state to trigger animation
            setIsTransitioning(true);

            // Delay the state updates to allow the sidebar to open first
            setTimeout(() => {
              // Update local state
              setSheetIds(prev => [...prev, entity.id]);
              setSheetNames(prev => [...prev, name]);
              setSheetData(prev => [...prev, emptySheetData]);

              // Set the new sheet as active
              setActiveSheet(sheetData.length);

              // Reset transitioning state after animation
              setTimeout(() => {
                setIsTransitioning(false);
              }, 300);
            }, 150); // Wait for sidebar to start opening
          }}
          onUpdateHeaders={(headers) => {
            // Update headers in storage
            storage.updateHeaders(headers);
            
            // Update local state
            setSharedHeaders(headers);
            
            // Refresh sheet data to reflect header changes
            setSheetData(sheetIds.map(id => storage.getEntityData(id)));
          }}
        />
      </div>
    </div>
  );
} 