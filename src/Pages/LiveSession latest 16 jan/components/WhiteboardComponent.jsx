// import React, { useRef, useEffect, useState, useCallback } from 'react';
// import * as fabric from 'fabric';
// import * as Y from 'yjs';
// import { WebsocketProvider } from 'y-websocket';
// import { useAuth } from '../../../contexts/AuthContext';
// import { 
//   FiSquare, FiCircle, FiType, FiPenTool, FiEdit3, FiMousePointer, FiTrash2, 
//   FiDownload, FiUpload, FiSave, FiZoomIn, FiZoomOut, FiMaximize2,
//   FiMinimize2, FiImage, FiStar, FiHexagon, FiTriangle, FiMinus, FiArrowRight,
//   FiX, FiPlay, FiPause, FiRefreshCw, FiAlertCircle
// } from 'react-icons/fi';
// import { FaRedo, FaUndo } from "react-icons/fa";
// import { BsBrush, BsEraser } from 'react-icons/bs';
// import { LuStickyNote } from 'react-icons/lu';

// // ✅ DEBUG LOG
// console.log('⚡⚡⚡ WHITEBOARD COMPONENT LOADED ⚡⚡⚡');

// const WhiteboardComponent = ({ sessionId, roomCode, socket, isActive, onClose }) => {
//   console.log('🎨 WhiteboardComponent RENDERING:', { 
//     isActive, 
//     sessionId, 
//     roomCode,
//     socketAvailable: !!socket
//   });

//   const { user } = useAuth();
//   const canvasRef = useRef(null);
//   const fabricCanvasRef = useRef(null);
//   const containerRef = useRef(null);
//   const ydocRef = useRef(null);
//   const providerRef = useRef(null);
  
//   const [tool, setTool] = useState('select');
//   const [brushWidth, setBrushWidth] = useState(5);
//   const [brushColor, setBrushColor] = useState('#000000');
//   const [fillColor, setFillColor] = useState('#ffffff');
//   const [opacity, setOpacity] = useState(1);
//   const [fontSize, setFontSize] = useState(20);
//   const [fontFamily, setFontFamily] = useState('Arial');
//   const [zoom, setZoom] = useState(1);
//   const [history, setHistory] = useState([]);
//   const [historyIndex, setHistoryIndex] = useState(-1);
//   const [showGrid, setShowGrid] = useState(false);
//   const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
//   const [connectionStatus, setConnectionStatus] = useState('disconnected');
//   const [stickyNoteColor, setStickyNoteColor] = useState('#ffff88');
//   const [showDebug, setShowDebug] = useState(true);
//   const [connectionAttempt, setConnectionAttempt] = useState(0);
//   const [connectionLogs, setConnectionLogs] = useState([]);
  
//   const tools = [
//     { id: 'select', name: 'Select', icon: <FiMousePointer /> },
//     { id: 'draw', name: 'Draw', icon: <FiPenTool /> },
//     { id: 'line', name: 'Line', icon: <FiMinus /> },
//     { id: 'arrow', name: 'Arrow', icon: <FiArrowRight /> },
//     { id: 'rectangle', name: 'Rectangle', icon: <FiSquare /> },
//     { id: 'circle', name: 'Circle', icon: <FiCircle /> },
//     { id: 'triangle', name: 'Triangle', icon: <FiTriangle /> },
//     { id: 'star', name: 'Star', icon: <FiStar /> },
//     { id: 'hexagon', name: 'Hexagon', icon: <FiHexagon /> },
//     { id: 'text', name: 'Text', icon: <FiType /> },
//     { id: 'sticky', name: 'Sticky Note', icon: <LuStickyNote /> },
//     { id: 'image', name: 'Image', icon: <FiImage /> },
//     { id: 'eraser', name: 'Eraser', icon: <BsEraser /> },
//   ];

//   const colors = [
//     '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
//     '#FFA500', '#800080', '#008000', '#800000', '#008080', '#000080', '#808080'
//   ];

//   const brushSizes = [1, 2, 3, 5, 8, 10, 15, 20, 30];

//   // ✅ Add connection log
//   const addConnectionLog = (message) => {
//     console.log('📝 Connection Log:', message);
//     setConnectionLogs(prev => [...prev.slice(-20), {
//       timestamp: new Date().toLocaleTimeString(),
//       message
//     }]);
//   };

//   // ✅ Direct WebSocket Test
//   const testWebSocketConnection = () => {
//     console.log('🧪 Testing WebSocket connection...');
//     addConnectionLog('Testing WebSocket connection...');
    
//     const testUrls = [
//       'ws://localhost:9090/yjs',
//       'ws://127.0.0.1:9090/yjs',
//       `ws://${window.location.hostname}:9090/yjs`,
//       'ws://localhost:9090/yjs?room=test',
//       'ws://localhost:9090'
//     ];
    
//     testUrls.forEach((url, index) => {
//       console.log(`Test ${index + 1}: ${url}`);
//       addConnectionLog(`Testing: ${url}`);
      
//       const testWs = new WebSocket(url);
      
//       testWs.onopen = () => {
//         console.log(`✅ CONNECTED to: ${url}`);
//         addConnectionLog(`✅ Connected to: ${url}`);
        
//         testWs.send(JSON.stringify({ 
//           type: 'test', 
//           message: 'Whiteboard connection test',
//           timestamp: new Date().toISOString()
//         }));
        
//         setTimeout(() => testWs.close(), 1000);
//       };
      
//       testWs.onerror = (error) => {
//         console.log(`❌ FAILED: ${url}`);
//         addConnectionLog(`❌ Failed: ${url}`);
//       };
      
//       testWs.onmessage = (event) => {
//         console.log(`📨 Response from ${url}:`, event.data);
//         addConnectionLog(`Response from ${url}: ${event.data}`);
//       };
      
//       testWs.onclose = () => {
//         console.log(`🔌 Closed: ${url}`);
//       };
//     });
//   };

//   // ✅ Initialize Collaboration - SIMPLIFIED
//   // const initCollaboration = useCallback(() => {
//   //   console.log('🔗 initCollaboration called! Attempt:', connectionAttempt + 1);
//   //   addConnectionLog(`Initializing collaboration (Attempt ${connectionAttempt + 1})`);
    
//   //   setConnectionAttempt(prev => prev + 1);
    
//   //   try {
//   //     // Create Yjs document
//   //     const ydoc = new Y.Doc();
//   //     ydocRef.current = ydoc;
//   //     console.log('✅ Yjs document created');
//   //     addConnectionLog('Yjs document created');
      
//   //     // WebSocket URL
//   //     const wsUrl = 'ws://localhost:9090/yjs';
//   //     console.log('🔌 Connecting to:', wsUrl);
//   //     addConnectionLog(`Connecting to: ${wsUrl}`);
      
//   //     // Room name
//   //     const roomName = `whiteboard-${sessionId || roomCode || 'default'}`;
//   //     console.log('📝 Room:', roomName);
//   //     addConnectionLog(`Room: ${roomName}`);
      
//   //     // Create WebSocket Provider
//   //     const provider = new WebsocketProvider(
//   //       wsUrl,
//   //       roomName,
//   //       ydoc,
//   //       {
//   //         connect: true,
//   //         WebSocketPolyfill: WebSocket,
//   //         disableBc: true,
//   //         awareness: true
//   //       }
//   //     );
      
//   //     providerRef.current = provider;
      
//   //     // Connection Status
//   //     provider.on('status', (event) => {
//   //       console.log('📡 Yjs Status:', event.status);
//   //       addConnectionLog(`Yjs Status: ${event.status}`);
//   //       setConnectionStatus(event.status);
        
//   //       if (event.status === 'connected') {
//   //         console.log('🎉🎉🎉 YJS CONNECTED SUCCESSFULLY! 🎉🎉🎉');
//   //         addConnectionLog('✅ Yjs Connected Successfully!');
          
//   //         // Setup Yjs array
//   //         const yCanvasArray = ydoc.getArray('canvas');
          
//   //         // Load initial canvas state if exists
//   //         if (yCanvasArray.length > 0 && fabricCanvasRef.current) {
//   //           try {
//   //             const canvasState = yCanvasArray.toJSON();
//   //             console.log('📥 Loading initial canvas from Yjs');
//   //             addConnectionLog('Loading initial canvas from Yjs');
              
//   //             fabricCanvasRef.current.loadFromJSON(canvasState, () => {
//   //               fabricCanvasRef.current.renderAll();
//   //               console.log('✅ Canvas loaded from Yjs');
//   //               addConnectionLog('Canvas loaded from Yjs');
//   //             });
//   //           } catch (error) {
//   //             console.error('Error loading canvas from Yjs:', error);
//   //             addConnectionLog(`Error loading canvas: ${error.message}`);
//   //           }
//   //         }
          
//   //         // Listen for remote changes
//   //         yCanvasArray.observe(event => {
//   //           if (!fabricCanvasRef.current) return;
            
//   //           // Skip local changes
//   //           if (event.transaction.origin === ydoc.clientID) {
//   //             console.log('📤 Local change, skipping');
//   //             return;
//   //           }
            
//   //           console.log('🔄 Remote change received');
//   //           addConnectionLog('Remote change received');
            
//   //           try {
//   //             const canvasState = yCanvasArray.toJSON();
//   //             fabricCanvasRef.current.loadFromJSON(canvasState, () => {
//   //               fabricCanvasRef.current.renderAll();
//   //               console.log('✅ Canvas updated from remote');
//   //             });
//   //           } catch (error) {
//   //             console.error('Error updating canvas:', error);
//   //             addConnectionLog(`Error updating canvas: ${error.message}`);
//   //           }
//   //         });
//   //       }
//   //     });
      
//   //     // Handle connection errors
//   //     provider.on('connection-error', (error) => {
//   //       console.error('❌ Yjs Connection Error:', error);
//   //       addConnectionLog(`Connection Error: ${error.message || error}`);
//   //       setConnectionStatus('error');
        
//   //       // Retry after 3 seconds
//   //       setTimeout(() => {
//   //         console.log('🔄 Retrying connection...');
//   //         addConnectionLog('Retrying connection...');
//   //         initCollaboration();
//   //       }, 3000);
//   //     });
      
//   //     // Handle synced event
//   //     provider.on('synced', (isSynced) => {
//   //       console.log('🔄 Yjs Synced:', isSynced);
//   //       addConnectionLog(`Yjs Synced: ${isSynced}`);
//   //     });
      
//   //     console.log('✅ Yjs provider created');
//   //     addConnectionLog('Yjs provider created');
      
//   //   } catch (error) {
//   //     console.error('❌ Error in collaboration setup:', error);
//   //     addConnectionLog(`Setup Error: ${error.message}`);
//   //   }
//   // }, [sessionId, roomCode, connectionAttempt]);


// // WhiteboardComponent.js में initCollaboration function update करें
// // const initCollaboration = useCallback(() => {
// //   console.log('🔗 initCollaboration called! Attempt:', connectionAttempt + 1);
// //   addConnectionLog(`Initializing collaboration (Attempt ${connectionAttempt + 1})`);
  
// //   setConnectionAttempt(prev => prev + 1);
  
// //   try {
// //     // Create Yjs document
// //     const ydoc = new Y.Doc();
// //     ydocRef.current = ydoc;
// //     console.log('✅ Yjs document created');
// //     addConnectionLog('Yjs document created');
    
// //     // WebSocket URL
// //     const wsUrl = 'ws://localhost:9090/yjs';
// //     console.log('🔌 Connecting to:', wsUrl);
// //     addConnectionLog(`Connecting to: ${wsUrl}`);
    
// //     // Room name
// //     const roomName = `whiteboard-${sessionId || roomCode || 'default'}`;
// //     console.log('📝 Room:', roomName);
// //     addConnectionLog(`Room: ${roomName}`);
    
// //     // ✅ FIX: Simple WebSocketProvider without extra options
// //     const provider = new WebsocketProvider(
// //       wsUrl,
// //       roomName,
// //       ydoc
// //       // ❌ NO extra options - यही error दे रहा था
// //     );
    
// //     providerRef.current = provider;
    
// //     // ✅ CORRECT way to listen to status
// //     provider.on('status', (event) => {
// //       console.log('📡 Yjs Status:', event);
// //       addConnectionLog(`Yjs Status: ${event.status}`);
// //       setConnectionStatus(event.status);
      
// //       if (event.status === 'connected') {
// //         console.log('🎉🎉🎉 YJS CONNECTED SUCCESSFULLY! 🎉🎉🎉');
// //         addConnectionLog('✅ Yjs Connected Successfully!');
        
// //         // Setup Yjs array
// //         const yCanvasArray = ydoc.getArray('canvas');
        
// //         // Load initial canvas state if exists
// //         if (yCanvasArray.length > 0 && fabricCanvasRef.current) {
// //           try {
// //             const canvasState = yCanvasArray.toJSON();
// //             console.log('📥 Loading initial canvas from Yjs');
// //             addConnectionLog('Loading initial canvas from Yjs');
            
// //             fabricCanvasRef.current.loadFromJSON(canvasState, () => {
// //               fabricCanvasRef.current.renderAll();
// //               console.log('✅ Canvas loaded from Yjs');
// //               addConnectionLog('Canvas loaded from Yjs');
// //             });
// //           } catch (error) {
// //             console.error('Error loading canvas from Yjs:', error);
// //             addConnectionLog(`Error loading canvas: ${error.message}`);
// //           }
// //         }
        
// //         // Listen for remote changes
// //         yCanvasArray.observe(event => {
// //           if (!fabricCanvasRef.current) return;
          
// //           // Skip local changes
// //           if (event.transaction.origin === ydoc.clientID) {
// //             console.log('📤 Local change, skipping');
// //             return;
// //           }
          
// //           console.log('🔄 Remote change received');
// //           addConnectionLog('Remote change received');
          
// //           try {
// //             const canvasState = yCanvasArray.toJSON();
// //             fabricCanvasRef.current.loadFromJSON(canvasState, () => {
// //               fabricCanvasRef.current.renderAll();
// //               console.log('✅ Canvas updated from remote');
// //             });
// //           } catch (error) {
// //             console.error('Error updating canvas:', error);
// //             addConnectionLog(`Error updating canvas: ${error.message}`);
// //           }
// //         });
// //       }
// //     });
    
// //     // Handle synced event
// //     provider.on('synced', (isSynced) => {
// //       console.log('🔄 Yjs Synced:', isSynced);
// //       addConnectionLog(`Yjs Synced: ${isSynced}`);
// //     });
    
// //     // ✅ Handle connection errors differently
// //     provider.ws.addEventListener('error', (error) => {
// //       console.error('❌ WebSocket Error:', error);
// //       addConnectionLog(`WebSocket Error: ${error.message}`);
// //       setConnectionStatus('error');
// //     });
    
// //     provider.ws.addEventListener('close', () => {
// //       console.log('🔌 WebSocket closed');
// //       addConnectionLog('WebSocket closed');
// //       setConnectionStatus('disconnected');
// //     });
    
// //     console.log('✅ Yjs provider created');
// //     addConnectionLog('Yjs provider created');
    
// //   } catch (error) {
// //     console.error('❌ Error in collaboration setup:', error);
// //     addConnectionLog(`Setup Error: ${error.message}`);
// //   }
// // }, [sessionId, roomCode, connectionAttempt]);


// // WhiteboardComponent.js में initCollaboration function
// const initCollaboration = useCallback(() => {
//   console.log('🔗 Starting Yjs collaboration...');
//   addConnectionLog('Starting Yjs collaboration');
  
//   try {
//     // Create Yjs document
//     const ydoc = new Y.Doc();
//     ydocRef.current = ydoc;
    
//     // ✅ FIXED URL - NO ROOM PARAMETER NEEDED
//     const wsUrl = 'ws://localhost:9090/yjs';
//     console.log('🔌 Connecting to:', wsUrl);
//     addConnectionLog(`Connecting to: ${wsUrl}`);
    
//     // ✅ FIXED ROOM NAME
//     const roomName = 'collaborative-whiteboard';
//     console.log('🎯 Room:', roomName);
//     addConnectionLog(`Room: ${roomName}`);
    
//     // Create WebSocket Provider with fixed room
//     const provider = new WebsocketProvider(
//       wsUrl,
//       roomName, // Fixed room name
//       ydoc
//     );
    
//     providerRef.current = provider;
    
//     // Connection status
//     provider.on('status', (event) => {
//       console.log('📡 Yjs Status:', event.status);
//       addConnectionLog(`Status: ${event.status}`);
//       setConnectionStatus(event.status);
      
//       if (event.status === 'connected') {
//         console.log('✅✅✅ YJS CONNECTED!');
//         addConnectionLog('✅ Connected successfully');
        
//         // Setup Yjs array for canvas
//         const yCanvasArray = ydoc.getArray('canvas');
        
//         // Load existing canvas data if any
//         if (yCanvasArray.length > 0 && fabricCanvasRef.current) {
//           try {
//             const canvasState = yCanvasArray.toJSON();
//             console.log('📥 Loading existing canvas data');
//             addConnectionLog('Loading existing canvas');
            
//             fabricCanvasRef.current.loadFromJSON(canvasState, () => {
//               fabricCanvasRef.current.renderAll();
//               console.log('✅ Canvas loaded from Yjs');
//               addConnectionLog('Canvas loaded');
//             });
//           } catch (error) {
//             console.error('Error loading canvas:', error);
//             addConnectionLog(`Load error: ${error.message}`);
//           }
//         }
        
//         // Listen for remote changes
//         yCanvasArray.observe(event => {
//           if (!fabricCanvasRef.current) return;
          
//           // Skip local changes
//           if (event.transaction.origin === ydoc.clientID) {
//             console.log('📤 Local change (skipping sync)');
//             return;
//           }
          
//           console.log('🔄 Remote change detected');
//           addConnectionLog('Remote change received');
          
//           try {
//             const canvasState = yCanvasArray.toJSON();
//             fabricCanvasRef.current.loadFromJSON(canvasState, () => {
//               fabricCanvasRef.current.renderAll();
//               console.log('✅ Canvas updated from remote');
//             });
//           } catch (error) {
//             console.error('Error updating canvas:', error);
//             addConnectionLog(`Update error: ${error.message}`);
//           }
//         });
//       }
//     });
    
//     // Handle sync events
//     provider.on('sync', (isSynced) => {
//       console.log('🔄 Yjs Sync:', isSynced);
//       addConnectionLog(`Sync: ${isSynced}`);
//     });
    
//     console.log('🎯 Yjs provider created');
//     addConnectionLog('Provider created');
    
//   } catch (error) {
//     console.error('❌ Collaboration error:', error);
//     addConnectionLog(`Error: ${error.message}`);
//   }
// }, []); // ✅ No dependencies needed for fixed room

// // Frontend WhiteboardComponent.js में
// const syncCanvasToYjs = useCallback(() => {
//   if (!fabricCanvasRef.current || !providerRef.current) {
//     console.log('❌ Cannot sync: Canvas or provider not ready');
//     return;
//   }
  
//   try {
//     console.log('📤 Syncing canvas to WebSocket...');
    
//     const canvas = fabricCanvasRef.current;
//     const canvasState = canvas.toJSON();
    
//     // ✅ FIX: Send as JSON instead of Yjs binary
//     const message = {
//       type: 'canvas-update',
//       data: canvasState,
//       timestamp: Date.now(),
//       userId: user?.id || 'anonymous'
//     };
    
//     // Send via WebSocket directly
//     if (providerRef.current.ws && providerRef.current.ws.readyState === 1) {
//       providerRef.current.ws.send(JSON.stringify(message));
//       console.log('✅ Canvas sent via WebSocket');
//     } else {
//       console.log('❌ WebSocket not ready');
//     }
    
//   } catch (error) {
//     console.error('❌ Error syncing:', error);
//   }
// }, [user]);

//   // ✅ Initialize Canvas
//   const initCanvas = useCallback(() => {
//     console.log('🎨 initCanvas called!');
//     addConnectionLog('Initializing canvas...');
    
//     if (!containerRef.current) {
//       console.log('❌ Container not ready, retrying...');
//       addConnectionLog('Container not ready, retrying...');
//       setTimeout(() => initCanvas(), 500);
//       return;
//     }
    
//     console.log('✅ Container ready');
//     addConnectionLog('Container ready');
    
//     // Clean up existing canvas
//     if (fabricCanvasRef.current) {
//       console.log('🧹 Cleaning up existing canvas');
//       fabricCanvasRef.current.dispose();
//       fabricCanvasRef.current = null;
//     }
    
//     // Create new canvas
//     const canvas = new fabric.Canvas(canvasRef.current, {
//       width: containerRef.current.clientWidth,
//       height: containerRef.current.clientHeight,
//       backgroundColor: '#ffffff',
//       selection: true,
//       preserveObjectStacking: true,
//     });
    
//     fabricCanvasRef.current = canvas;
//     console.log('✅ Fabric canvas created');
//     addConnectionLog('Fabric canvas created');
    
//     // Setup drawing
//     canvas.isDrawingMode = false;
//     canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
//     canvas.freeDrawingBrush.width = brushWidth;
//     canvas.freeDrawingBrush.color = brushColor;
    
//     // Event Listeners
//     canvas.on('mouse:move', (e) => {
//       if (!e.absolutePointer) return;
      
//       setCursorPosition({
//         x: Math.round(e.absolutePointer.x),
//         y: Math.round(e.absolutePointer.y)
//       });
//     });
    
//     canvas.on('object:added', (e) => {
//       if (e.target) {
//         console.log('➕ Object added:', e.target.type);
        
//         // Generate ID if not exists
//         if (!e.target.id) {
//           e.target.id = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//         }
        
//         // Save state
//         saveState();
        
//         // Sync to Yjs
//         setTimeout(() => {
//           syncCanvasToYjs();
//         }, 100);
//       }
//     });
    
//     canvas.on('object:modified', (e) => {
//       if (e.target) {
//         console.log('✏️ Object modified');
        
//         setTimeout(() => {
//           saveState();
//           syncCanvasToYjs();
//         }, 100);
//       }
//     });
    
//     canvas.on('object:removed', (e) => {
//       if (e.target) {
//         console.log('➖ Object removed');
        
//         setTimeout(() => {
//           saveState();
//           syncCanvasToYjs();
//         }, 100);
//       }
//     });
    
//     // Window resize handler
//     const handleResize = () => {
//       if (containerRef.current && canvas) {
//         canvas.setDimensions({
//           width: containerRef.current.clientWidth,
//           height: containerRef.current.clientHeight
//         });
//         canvas.renderAll();
//       }
//     };
    
//     window.addEventListener('resize', handleResize);
    
//     // Initial save
//     saveState();
    
//     console.log('✅ Canvas initialization complete');
//     addConnectionLog('Canvas initialization complete');
    
//     // Start collaboration after canvas is ready
//     setTimeout(() => {
//       console.log('🚀 Starting collaboration...');
//       addConnectionLog('Starting collaboration...');
//       initCollaboration();
//     }, 1000);
    
//     return () => {
//       window.removeEventListener('resize', handleResize);
//       if (canvas) {
//         canvas.dispose();
//       }
//     };
//   }, [initCollaboration, brushWidth, brushColor, syncCanvasToYjs]);

//   // ✅ Save State for Undo/Redo
//   const saveState = () => {
//     if (!fabricCanvasRef.current) return;
    
//     const state = fabricCanvasRef.current.toJSON();
//     const newHistory = [...history.slice(0, historyIndex + 1), state];
    
//     setHistory(newHistory);
//     setHistoryIndex(newHistory.length - 1);
//   };

//   // ✅ Undo
//   const handleUndo = () => {
//     if (historyIndex > 0) {
//       const newIndex = historyIndex - 1;
//       setHistoryIndex(newIndex);
      
//       fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
//         fabricCanvasRef.current.renderAll();
//         syncCanvasToYjs();
//       });
//     }
//   };

//   // ✅ Redo
//   const handleRedo = () => {
//     if (historyIndex < history.length - 1) {
//       const newIndex = historyIndex + 1;
//       setHistoryIndex(newIndex);
      
//       fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
//         fabricCanvasRef.current.renderAll();
//         syncCanvasToYjs();
//       });
//     }
//   };

//   // ✅ Tool Handlers
//   const handleToolSelect = (selectedTool) => {
//     console.log(`🛠️ Tool selected: ${selectedTool}`);
//     setTool(selectedTool);
//     const canvas = fabricCanvasRef.current;
    
//     if (!canvas) return;
    
//     switch (selectedTool) {
//       case 'select':
//         canvas.isDrawingMode = false;
//         canvas.selection = true;
//         break;
//       case 'draw':
//         canvas.isDrawingMode = true;
//         canvas.freeDrawingBrush.width = brushWidth;
//         canvas.freeDrawingBrush.color = brushColor;
//         break;
//       case 'rectangle':
//         addRectangle();
//         break;
//       case 'circle':
//         addCircle();
//         break;
//       case 'triangle':
//         addTriangle();
//         break;
//       case 'text':
//         addText();
//         break;
//       case 'sticky':
//         addStickyNote();
//         break;
//       case 'image':
//         uploadImage();
//         break;
//       case 'eraser':
//         activateEraser();
//         break;
//       case 'line':
//         startDrawingLine();
//         break;
//       case 'arrow':
//         startDrawingArrow();
//         break;
//       case 'star':
//         addStar();
//         break;
//       case 'hexagon':
//         addHexagon();
//         break;
//     }
//   };

//   // Drawing Functions
//   const addRectangle = () => {
//     const rect = new fabric.Rect({
//       left: 100,
//       top: 100,
//       width: 100,
//       height: 100,
//       fill: fillColor,
//       stroke: brushColor,
//       strokeWidth: brushWidth,
//       opacity: opacity,
//       selectable: true
//     });
    
//     fabricCanvasRef.current.add(rect);
//     fabricCanvasRef.current.setActiveObject(rect);
//     setTool('select');
//   };

//   const addCircle = () => {
//     const circle = new fabric.Circle({
//       left: 100,
//       top: 100,
//       radius: 50,
//       fill: fillColor,
//       stroke: brushColor,
//       strokeWidth: brushWidth,
//       opacity: opacity,
//       selectable: true
//     });
    
//     fabricCanvasRef.current.add(circle);
//     fabricCanvasRef.current.setActiveObject(circle);
//     setTool('select');
//   };

//   const addTriangle = () => {
//     const triangle = new fabric.Triangle({
//       left: 100,
//       top: 100,
//       width: 100,
//       height: 100,
//       fill: fillColor,
//       stroke: brushColor,
//       strokeWidth: brushWidth,
//       opacity: opacity,
//       selectable: true
//     });
    
//     fabricCanvasRef.current.add(triangle);
//     fabricCanvasRef.current.setActiveObject(triangle);
//     setTool('select');
//   };

//   const addStar = () => {
//     const star = new fabric.Path('M 100 10 L 123 80 L 200 80 L 138 120 L 160 190 L 100 145 L 40 190 L 62 120 L 0 80 L 77 80 Z', {
//       left: 100,
//       top: 100,
//       fill: fillColor,
//       stroke: brushColor,
//       strokeWidth: brushWidth,
//       opacity: opacity,
//       selectable: true
//     });
    
//     fabricCanvasRef.current.add(star);
//     fabricCanvasRef.current.setActiveObject(star);
//     setTool('select');
//   };

//   const addHexagon = () => {
//     const hexagon = new fabric.Polygon([
//       { x: 50, y: 0 },
//       { x: 100, y: 25 },
//       { x: 100, y: 75 },
//       { x: 50, y: 100 },
//       { x: 0, y: 75 },
//       { x: 0, y: 25 }
//     ], {
//       left: 100,
//       top: 100,
//       fill: fillColor,
//       stroke: brushColor,
//       strokeWidth: brushWidth,
//       opacity: opacity,
//       selectable: true
//     });
    
//     fabricCanvasRef.current.add(hexagon);
//     fabricCanvasRef.current.setActiveObject(hexagon);
//     setTool('select');
//   };

//   const addText = () => {
//     const text = new fabric.IText('Double click to edit', {
//       left: 100,
//       top: 100,
//       fontSize: fontSize,
//       fontFamily: fontFamily,
//       fill: brushColor,
//       selectable: true
//     });
    
//     fabricCanvasRef.current.add(text);
//     fabricCanvasRef.current.setActiveObject(text);
//     setTool('select');
//   };

//   const addStickyNote = () => {
//     const stickyNote = new fabric.Rect({
//       left: 100,
//       top: 100,
//       width: 200,
//       height: 150,
//       fill: stickyNoteColor,
//       stroke: '#d4d4d4',
//       strokeWidth: 1,
//       opacity: 0.9,
//       shadow: 'rgba(0,0,0,0.2) 2px 2px 5px',
//       selectable: true
//     });
    
//     const text = new fabric.IText('Double click to edit note', {
//       left: 110,
//       top: 110,
//       fontSize: 16,
//       fontFamily: 'Arial',
//       fill: '#000000',
//       selectable: true
//     });
    
//     const group = new fabric.Group([stickyNote, text], {
//       selectable: true
//     });
    
//     fabricCanvasRef.current.add(group);
//     fabricCanvasRef.current.setActiveObject(group);
//     setTool('select');
//   };

//   const startDrawingLine = () => {
//     const canvas = fabricCanvasRef.current;
//     let isDrawing = false;
//     let line = null;
    
//     const mouseDown = (options) => {
//       isDrawing = true;
//       const pointer = canvas.getPointer(options.e);
      
//       line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
//         stroke: brushColor,
//         strokeWidth: brushWidth,
//         selectable: true
//       });
      
//       canvas.add(line);
//     };
    
//     const mouseMove = (options) => {
//       if (!isDrawing || !line) return;
      
//       const pointer = canvas.getPointer(options.e);
//       line.set({ x2: pointer.x, y2: pointer.y });
//       canvas.renderAll();
//     };
    
//     const mouseUp = () => {
//       isDrawing = false;
//       canvas.off('mouse:down', mouseDown);
//       canvas.off('mouse:move', mouseMove);
//       canvas.off('mouse:up', mouseUp);
//       setTool('select');
//     };
    
//     canvas.on('mouse:down', mouseDown);
//     canvas.on('mouse:move', mouseMove);
//     canvas.on('mouse:up', mouseUp);
//   };

//   const startDrawingArrow = () => {
//     const canvas = fabricCanvasRef.current;
//     let isDrawing = false;
//     let line = null;
//     let arrowHead = null;
    
//     const mouseDown = (options) => {
//       isDrawing = true;
//       const pointer = canvas.getPointer(options.e);
      
//       line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
//         stroke: brushColor,
//         strokeWidth: brushWidth,
//         selectable: true
//       });
      
//       arrowHead = new fabric.Triangle({
//         width: 15,
//         height: 15,
//         fill: brushColor,
//         left: pointer.x,
//         top: pointer.y,
//         angle: 0,
//         selectable: false
//       });
      
//       canvas.add(line);
//       canvas.add(arrowHead);
//     };
    
//     const mouseMove = (options) => {
//       if (!isDrawing || !line || !arrowHead) return;
      
//       const pointer = canvas.getPointer(options.e);
//       line.set({ x2: pointer.x, y2: pointer.y });
      
//       const dx = pointer.x - line.x1;
//       const dy = pointer.y - line.y1;
//       const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      
//       arrowHead.set({
//         left: pointer.x,
//         top: pointer.y,
//         angle: angle
//       });
      
//       canvas.renderAll();
//     };
    
//     const mouseUp = () => {
//       isDrawing = false;
      
//       if (line && arrowHead) {
//         const group = new fabric.Group([line, arrowHead], {
//           selectable: true
//         });
        
//         canvas.remove(line);
//         canvas.remove(arrowHead);
//         canvas.add(group);
//       }
      
//       canvas.off('mouse:down', mouseDown);
//       canvas.off('mouse:move', mouseMove);
//       canvas.off('mouse:up', mouseUp);
//       setTool('select');
//     };
    
//     canvas.on('mouse:down', mouseDown);
//     canvas.on('mouse:move', mouseMove);
//     canvas.on('mouse:up', mouseUp);
//   };

//   const uploadImage = () => {
//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = 'image/*';
    
//     input.onchange = (e) => {
//       const file = e.target.files[0];
//       if (!file) return;
      
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         fabric.Image.fromURL(event.target.result, (img) => {
//           img.set({
//             left: 100,
//             top: 100,
//             scaleX: 0.5,
//             scaleY: 0.5,
//             selectable: true
//           });
          
//           fabricCanvasRef.current.add(img);
//           fabricCanvasRef.current.setActiveObject(img);
//           setTool('select');
//         });
//       };
//       reader.readAsDataURL(file);
//     };
    
//     input.click();
//   };

//   const activateEraser = () => {
//     const canvas = fabricCanvasRef.current;
//     canvas.isDrawingMode = false;
//     canvas.selection = false;
    
//     const mouseDown = (options) => {
//       const pointer = canvas.getPointer(options.e);
//       const objects = canvas.getObjects();
      
//       objects.forEach(obj => {
//         if (obj.containsPoint(pointer)) {
//           canvas.remove(obj);
//         }
//       });
      
//       canvas.renderAll();
//     };
    
//     canvas.on('mouse:down', mouseDown);
    
//     setTimeout(() => {
//       canvas.off('mouse:down', mouseDown);
//       setTool('select');
//     }, 5000);
//   };

//   // Export Functions
//   const exportAsImage = () => {
//     if (!fabricCanvasRef.current) return;
    
//     const dataURL = fabricCanvasRef.current.toDataURL({
//       format: 'png',
//       quality: 1,
//       multiplier: 2
//     });
    
//     const link = document.createElement('a');
//     link.href = dataURL;
//     link.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
//     link.click();
//   };

//   const exportAsJSON = () => {
//     if (!fabricCanvasRef.current) return;
    
//     const json = fabricCanvasRef.current.toJSON();
//     const dataStr = JSON.stringify(json);
//     const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
//     const link = document.createElement('a');
//     link.href = dataUri;
//     link.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.json`;
//     link.click();
//   };

//   const importFromJSON = () => {
//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = '.json';
    
//     input.onchange = (e) => {
//       const file = e.target.files[0];
//       if (!file) return;
      
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         try {
//           const json = JSON.parse(event.target.result);
//           fabricCanvasRef.current.loadFromJSON(json, () => {
//             fabricCanvasRef.current.renderAll();
//             saveState();
//             syncCanvasToYjs();
//           });
//         } catch (error) {
//           console.error('Error loading JSON:', error);
//         }
//       };
//       reader.readAsText(file);
//     };
    
//     input.click();
//   };

//   // Zoom Functions
//   const handleZoomIn = () => {
//     const newZoom = Math.min(zoom * 1.2, 5);
//     setZoom(newZoom);
    
//     if (fabricCanvasRef.current) {
//       fabricCanvasRef.current.setZoom(newZoom);
//       fabricCanvasRef.current.renderAll();
//     }
//   };

//   const handleZoomOut = () => {
//     const newZoom = Math.max(zoom / 1.2, 0.2);
//     setZoom(newZoom);
    
//     if (fabricCanvasRef.current) {
//       fabricCanvasRef.current.setZoom(newZoom);
//       fabricCanvasRef.current.renderAll();
//     }
//   };

//   const handleZoomReset = () => {
//     setZoom(1);
    
//     if (fabricCanvasRef.current) {
//       fabricCanvasRef.current.setZoom(1);
//       fabricCanvasRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
//       fabricCanvasRef.current.renderAll();
//     }
//   };

//   // Clear Canvas
//   const handleClear = () => {
//     if (window.confirm('Are you sure you want to clear the whiteboard?')) {
//       fabricCanvasRef.current.clear();
//       fabricCanvasRef.current.backgroundColor = '#ffffff';
//       saveState();
//       syncCanvasToYjs();
//     }
//   };

//   // Force Reconnect
//   const forceReconnect = () => {
//     console.log('🔁 Forcing reconnection...');
//     addConnectionLog('Force reconnection initiated');
    
//     if (providerRef.current) {
//       providerRef.current.disconnect();
//       providerRef.current = null;
//     }
    
//     if (ydocRef.current) {
//       ydocRef.current.destroy();
//       ydocRef.current = null;
//     }
    
//     setTimeout(() => {
//       initCollaboration();
//     }, 500);
//   };

//   // ✅ Main Effect - Component Mount/Unmount
//   useEffect(() => {
//     console.log('🎯 WhiteboardComponent useEffect - isActive:', isActive);
    
//     if (isActive) {
//       console.log('🚀 Whiteboard ACTIVE - Starting initialization...');
//       addConnectionLog('Whiteboard activated');
      
//       // Small delay to ensure DOM is ready
//       const timeoutId = setTimeout(() => {
//         console.log('🎨 Calling initCanvas...');
//         initCanvas();
//       }, 300);
      
//       return () => {
//         console.log('🧹 Cleaning up whiteboard timeout');
//         clearTimeout(timeoutId);
//       };
//     } else {
//       console.log('⏸️ Whiteboard INACTIVE');
//       addConnectionLog('Whiteboard deactivated');
//     }
//   }, [isActive]);

//   // ✅ Cleanup Effect
//   useEffect(() => {
//     return () => {
//       console.log('🧹 WhiteboardComponent UNMOUNTING - Cleanup');
//       addConnectionLog('Component unmounting');
      
//       // Clean up Yjs
//       if (providerRef.current) {
//         console.log('Disconnecting Yjs provider...');
//         providerRef.current.disconnect();
//         providerRef.current = null;
//       }
      
//       if (ydocRef.current) {
//         console.log('Destroying Yjs document...');
//         ydocRef.current.destroy();
//         ydocRef.current = null;
//       }
      
//       // Clean up fabric canvas
//       if (fabricCanvasRef.current) {
//         console.log('Disposing fabric canvas...');
//         fabricCanvasRef.current.dispose();
//         fabricCanvasRef.current = null;
//       }
//     };
//   }, []);

//   if (!isActive) {
//     console.log('⏸️ Whiteboard not active, returning null');
//     return null;
//   }

//   console.log('🎨 Whiteboard RENDERING UI');
  
//   return (
//     <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
//       {/* Header */}
//       <div className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
//         <div className="flex items-center space-x-4">
//           <h2 className="text-xl font-bold text-white flex items-center">
//             <FiEdit3 className="mr-2" />
//             Collaborative Whiteboard
//           </h2>
          
//           <div className="flex items-center space-x-2">
//             <div className={`w-3 h-3 rounded-full ${
//               connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
//               connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
//             }`} />
//             <span className="text-sm text-gray-300">
//               {connectionStatus === 'connected' ? 'Connected' : 
//                connectionStatus === 'connecting' ? 'Connecting...' : 
//                connectionStatus === 'disconnected' ? 'Disconnected' : connectionStatus}
//             </span>
            
//             <span className="text-xs text-gray-400">
//               Attempt: {connectionAttempt}
//             </span>
//           </div>
//         </div>
        
//         <div className="flex items-center space-x-2">
//           {/* Debug Buttons */}
//           <button
//             onClick={testWebSocketConnection}
//             className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white text-sm"
//           >
//             🧪 Test WS
//           </button>
          
//           <button
//             onClick={forceReconnect}
//             className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm"
//           >
//             🔁 Reconnect
//           </button>
          
//           <button
//             onClick={() => setShowDebug(!showDebug)}
//             className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm"
//           >
//             {showDebug ? 'Hide Debug' : 'Show Debug'}
//           </button>
          
//           <button
//             onClick={handleZoomReset}
//             className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
//           >
//             <FiMaximize2 />
//           </button>
          
//           <button
//             onClick={onClose}
//             className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
//           >
//             <FiX />
//           </button>
//         </div>
//       </div>

//       {/* Main Area */}
//       <div className="flex-1 flex overflow-hidden">
//         {/* Tools Sidebar */}
//         <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 space-y-4">
//           {tools.map((toolItem) => (
//             <button
//               key={toolItem.id}
//               onClick={() => handleToolSelect(toolItem.id)}
//               className={`p-3 rounded-xl transition-all duration-200 ${
//                 tool === toolItem.id 
//                   ? 'bg-blue-600 text-white shadow-lg' 
//                   : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
//               }`}
//               title={toolItem.name}
//             >
//               {toolItem.icon}
//             </button>
//           ))}
//         </div>

//         {/* Properties Sidebar */}
//         <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
//           <div className="space-y-6">
//             <div>
//               <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
//                 <BsBrush className="mr-2" />
//                 Brush Properties
//               </h3>
              
//               <div className="space-y-3">
//                 <div>
//                   <label className="text-xs text-gray-400">Width</label>
//                   <div className="flex flex-wrap gap-1 mt-1">
//                     {brushSizes.map((size) => (
//                       <button
//                         key={size}
//                         onClick={() => setBrushWidth(size)}
//                         className={`w-8 h-8 rounded-full flex items-center justify-center ${
//                           brushWidth === size 
//                             ? 'bg-blue-600 text-white' 
//                             : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
//                         }`}
//                       >
//                         {size}
//                       </button>
//                     ))}
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-xs text-gray-400">Stroke Color</label>
//                   <div className="grid grid-cols-7 gap-1 mt-1">
//                     {colors.map((color) => (
//                       <button
//                         key={color}
//                         onClick={() => setBrushColor(color)}
//                         className={`w-6 h-6 rounded-full border-2 ${
//                           brushColor === color ? 'border-white' : 'border-gray-700'
//                         }`}
//                         style={{ backgroundColor: color }}
//                       />
//                     ))}
//                   </div>
//                   <input
//                     type="color"
//                     value={brushColor}
//                     onChange={(e) => setBrushColor(e.target.value)}
//                     className="w-full mt-2 bg-gray-700 border border-gray-600 rounded"
//                   />
//                 </div>

//                 <div>
//                   <label className="text-xs text-gray-400">Fill Color</label>
//                   <div className="grid grid-cols-7 gap-1 mt-1">
//                     {colors.map((color) => (
//                       <button
//                         key={color}
//                         onClick={() => setFillColor(color)}
//                         className={`w-6 h-6 rounded-full border-2 ${
//                           fillColor === color ? 'border-white' : 'border-gray-700'
//                         }`}
//                         style={{ backgroundColor: color }}
//                       />
//                     ))}
//                   </div>
//                   <input
//                     type="color"
//                     value={fillColor}
//                     onChange={(e) => setFillColor(e.target.value)}
//                     className="w-full mt-2 bg-gray-700 border border-gray-600 rounded"
//                   />
//                 </div>

//                 <div>
//                   <label className="text-xs text-gray-400">
//                     Opacity: {Math.round(opacity * 100)}%
//                   </label>
//                   <input
//                     type="range"
//                     min="0.1"
//                     max="1"
//                     step="0.1"
//                     value={opacity}
//                     onChange={(e) => setOpacity(parseFloat(e.target.value))}
//                     className="w-full mt-1"
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* View Options */}
//             <div>
//               <h3 className="text-sm font-semibold text-gray-300 mb-2">View Options</h3>
//               <div className="space-y-2">
//                 <label className="flex items-center space-x-2 cursor-pointer">
//                   <input
//                     type="checkbox"
//                     checked={showGrid}
//                     onChange={(e) => setShowGrid(e.target.checked)}
//                     className="rounded bg-gray-700"
//                   />
//                   <span className="text-sm text-gray-300">Show Grid</span>
//                 </label>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Canvas Area */}
//         <div className="flex-1 relative overflow-hidden" ref={containerRef}>
//           <canvas ref={canvasRef} className="absolute inset-0" />
          
//           {/* Status Bar */}
//           <div className="absolute bottom-4 left-4 bg-black/70 text-white text-sm px-3 py-2 rounded-lg">
//             X: {cursorPosition.x}, Y: {cursorPosition.y} | Zoom: {Math.round(zoom * 100)}% | Tool: {tool}
//           </div>

//           {/* Zoom Controls */}
//           <div className="absolute bottom-4 right-4 flex space-x-2">
//             <button
//               onClick={handleZoomOut}
//               className="bg-black/70 text-white p-2 rounded-lg hover:bg-black/80"
//             >
//               <FiZoomOut />
//             </button>
//             <button
//               onClick={handleZoomIn}
//               className="bg-black/70 text-white p-2 rounded-lg hover:bg-black/80"
//             >
//               <FiZoomIn />
//             </button>
//           </div>

//           {/* Debug Info Panel */}
//           {showDebug && (
//             <div className="absolute top-4 left-4 bg-black/80 text-white text-xs p-3 rounded-lg max-w-md max-h-64 overflow-y-auto">
//               <div className="font-bold mb-2">Debug Info:</div>
//               <div className="space-y-1">
//                 <div>Status: <span className={connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>{connectionStatus}</span></div>
//                 <div>Connection Attempts: {connectionAttempt}</div>
//                 <div>Room: whiteboard-{sessionId || roomCode || 'default'}</div>
//                 <div>Canvas: {fabricCanvasRef.current ? 'Loaded' : 'Not loaded'}</div>
//                 <div>Yjs: {ydocRef.current ? 'Active' : 'Inactive'}</div>
//                 <div>Provider: {providerRef.current ? 'Connected' : 'Disconnected'}</div>
                
//                 <div className="mt-2 font-bold">Connection Logs:</div>
//                 <div className="text-xs max-h-32 overflow-y-auto">
//                   {connectionLogs.slice().reverse().map((log, index) => (
//                     <div key={index} className="border-b border-gray-700 py-1">
//                       <span className="text-gray-400">[{log.timestamp}]</span> {log.message}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Actions Sidebar */}
//         <div className="w-64 bg-gray-800 border-l border-gray-700 p-4">
//           <div className="space-y-4">
//             <div>
//               <h3 className="text-sm font-semibold text-gray-300 mb-2">History</h3>
//               <div className="flex space-x-2">
//                 <button
//                   onClick={handleUndo}
//                   disabled={historyIndex <= 0}
//                   className={`flex-1 p-2 rounded-lg flex items-center justify-center space-x-1 ${
//                     historyIndex <= 0
//                       ? 'bg-gray-700 text-gray-500'
//                       : 'bg-gray-700 hover:bg-gray-600 text-white'
//                   }`}
//                 >
//                   <FaUndo />
//                   <span>Undo</span>
//                 </button>
//                 <button
//                   onClick={handleRedo}
//                   disabled={historyIndex >= history.length - 1}
//                   className={`flex-1 p-2 rounded-lg flex items-center justify-center space-x-1 ${
//                     historyIndex >= history.length - 1
//                       ? 'bg-gray-700 text-gray-500'
//                       : 'bg-gray-700 hover:bg-gray-600 text-white'
//                   }`}
//                 >
//                   <FaRedo />
//                   <span>Redo</span>
//                 </button>
//               </div>
//             </div>

//             <div>
//               <h3 className="text-sm font-semibold text-gray-300 mb-2">Actions</h3>
//               <div className="space-y-2">
//                 <button
//                   onClick={handleClear}
//                   className="w-full p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white flex items-center justify-center space-x-2"
//                 >
//                   <FiTrash2 />
//                   <span>Clear Canvas</span>
//                 </button>
//                 <button
//                   onClick={exportAsImage}
//                   className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white flex items-center justify-center space-x-2"
//                 >
//                   <FiDownload />
//                   <span>Export as PNG</span>
//                 </button>
//                 <button
//                   onClick={exportAsJSON}
//                   className="w-full p-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white flex items-center justify-center space-x-2"
//                 >
//                   <FiSave />
//                   <span>Export as JSON</span>
//                 </button>
//                 <button
//                   onClick={importFromJSON}
//                   className="w-full p-2 bg-green-600 hover:bg-green-700 rounded-lg text-white flex items-center justify-center space-x-2"
//                 >
//                   <FiUpload />
//                   <span>Import JSON</span>
//                 </button>
//               </div>
//             </div>

//             <div>
//               <h3 className="text-sm font-semibold text-gray-300 mb-2">Connection</h3>
//               <div className="space-y-2">
//                 <button
//                   onClick={() => {
//                     console.log('=== WHITEBOARD STATUS ===');
//                     console.log('1. Yjs doc:', ydocRef.current);
//                     console.log('2. Provider:', providerRef.current);
//                     console.log('3. Fabric canvas:', fabricCanvasRef.current);
//                     console.log('4. Container:', containerRef.current);
//                     console.log('5. Canvas element:', canvasRef.current);
                    
//                     if (providerRef.current && providerRef.current.ws) {
//                       console.log('WebSocket readyState:', providerRef.current.ws.readyState);
//                       console.log('WebSocket URL:', providerRef.current.url);
//                     }
//                   }}
//                   className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
//                 >
//                   Check Status
//                 </button>
                
//                 <button
//                   onClick={() => {
//                     if (providerRef.current) {
//                       console.log('Disconnecting provider...');
//                       providerRef.current.disconnect();
//                       setTimeout(() => {
//                         console.log('Reconnecting...');
//                         providerRef.current.connect();
//                       }, 1000);
//                     }
//                   }}
//                   className="w-full p-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white"
//                 >
//                   Reconnect Yjs
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default WhiteboardComponent; 






















// import React, { useRef, useEffect, useState, useCallback } from 'react';
// import * as fabric from 'fabric';
// import * as Y from 'yjs';
// import { WebsocketProvider } from 'y-websocket';
// import { useAuth } from '../../../contexts/AuthContext';
// import { API_BASE_URL } from '../../../config/api';
// import { 
//   FiSquare, FiCircle, FiType, FiPenTool, FiEdit3, FiMousePointer, FiTrash2, 
//   FiDownload, FiUpload, FiSave, FiZoomIn, FiZoomOut, FiMaximize2,
//   FiMinimize2, FiImage, FiStar, FiHexagon, FiTriangle, FiMinus, FiArrowRight,
//   FiX, FiUsers, FiMessageSquare, FiRefreshCw, FiLock, FiUnlock
// } from 'react-icons/fi';
// import { FaRedo, FaUndo } from "react-icons/fa";
// import { BsBrush, BsEraser } from 'react-icons/bs';
// import { LuStickyNote } from 'react-icons/lu';

// // ✅ DEBUG LOG
// console.log('⚡⚡⚡ WHITEBOARD COMPONENT LOADED ⚡⚡⚡');

// const WhiteboardComponent = ({ 
//   sessionId, 
//   roomCode, 
//   isActive, 
//   onClose, 
//   isStreamer = false 
// }) => {
//   console.log('🎨 WhiteboardComponent RENDERING:', { 
//     isActive, 
//     sessionId, 
//     roomCode,
//     isStreamer
//   });

//   const { user, token } = useAuth();
//   const canvasRef = useRef(null);
//   const fabricCanvasRef = useRef(null);
//   const containerRef = useRef(null);
//   const ydocRef = useRef(null);
//   const providerRef = useRef(null);
  
//   const [tool, setTool] = useState('select');
//   const [brushWidth, setBrushWidth] = useState(5);
//   const [brushColor, setBrushColor] = useState('#000000');
//   const [fillColor, setFillColor] = useState('#ffffff');
//   const [opacity, setOpacity] = useState(1);
//   const [fontSize, setFontSize] = useState(20);
//   const [fontFamily, setFontFamily] = useState('Arial');
//   const [zoom, setZoom] = useState(1);
//   const [history, setHistory] = useState([]);
//   const [historyIndex, setHistoryIndex] = useState(-1);
//   const [showGrid, setShowGrid] = useState(false);
//   const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
//   const [connectionStatus, setConnectionStatus] = useState('disconnected');
//   const [stickyNoteColor, setStickyNoteColor] = useState('#ffff88');
//   const [showDebug, setShowDebug] = useState(false);
//   const [connectionAttempt, setConnectionAttempt] = useState(0);
//   const [connectionLogs, setConnectionLogs] = useState([]);
//   const [activeUsers, setActiveUsers] = useState([]);
//   const [sessionInfo, setSessionInfo] = useState(null);
//   const [permissions, setPermissions] = useState({
//     canDraw: false,
//     canEdit: false,
//     canDelete: false,
//     canChat: true,
//     canClear: false
//   });
//   const [isLoading, setIsLoading] = useState(true);
  
//   const tools = [
//     { id: 'select', name: 'Select', icon: <FiMousePointer /> },
//     { id: 'draw', name: 'Draw', icon: <FiPenTool /> },
//     { id: 'line', name: 'Line', icon: <FiMinus /> },
//     { id: 'arrow', name: 'Arrow', icon: <FiArrowRight /> },
//     { id: 'rectangle', name: 'Rectangle', icon: <FiSquare /> },
//     { id: 'circle', name: 'Circle', icon: <FiCircle /> },
//     { id: 'triangle', name: 'Triangle', icon: <FiTriangle /> },
//     { id: 'star', name: 'Star', icon: <FiStar /> },
//     { id: 'hexagon', name: 'Hexagon', icon: <FiHexagon /> },
//     { id: 'text', name: 'Text', icon: <FiType /> },
//     { id: 'sticky', name: 'Sticky Note', icon: <LuStickyNote /> },
//     { id: 'image', name: 'Image', icon: <FiImage /> },
//     { id: 'eraser', name: 'Eraser', icon: <BsEraser /> },
//   ];

//   const colors = [
//     '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
//     '#FFA500', '#800080', '#008000', '#800000', '#008080', '#000080', '#808080'
//   ];

//   const brushSizes = [1, 2, 3, 5, 8, 10, 15, 20, 30];

//   // ✅ Add connection log
//   const addConnectionLog = (message) => {
//     console.log('📝 Connection Log:', message);
//     setConnectionLogs(prev => [...prev.slice(-10), {
//       timestamp: new Date().toLocaleTimeString(),
//       message
//     }]);
//   };

//   // ✅ Get Session Info from API
//   const fetchSessionInfo = async () => {
//     try {
//       const endpoint = isStreamer 
//         ? `${API_BASE_URL}/api/live-sessions/streamer/${sessionId}`
//         : `${API_BASE_URL}/api/live-sessions/join/${roomCode}`;
      
//       const response = await fetch(endpoint, {
//         headers: {
//           'Authorization': `Bearer ${token}`
//         }
//       });
      
//       if (!response.ok) {
//         throw new Error(`Failed to fetch session: ${response.status}`);
//       }
      
//       const data = await response.json();
//       setSessionInfo(data);
//       setPermissions(data.permissions || {});
      
//       console.log('✅ Session Info:', data);
//       addConnectionLog(`Session: ${data.title}`);
      
//       return data;
//     } catch (error) {
//       console.error('❌ Error fetching session:', error);
//       addConnectionLog(`Error: ${error.message}`);
//       return null;
//     }
//   };

//   // ✅ Get WebSocket URL with Authentication
//   const getWebSocketUrl = (wsToken) => {
//     const baseUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:9090';
//     const currentToken = wsToken || token;
    
//     if (!currentToken) {
//       console.error('❌ No authentication token found');
//       return null;
//     }
    
//     const url = `${baseUrl}/yjs?token=${encodeURIComponent(currentToken)}&sessionId=${encodeURIComponent(sessionId)}&roomCode=${encodeURIComponent(roomCode)}`;
//     console.log('🔌 WebSocket URL:', url);
//     return url;
//   };

//   // ✅ Initialize Collaboration with Authentication
//   const initCollaboration = useCallback(async () => {
//     console.log('🔗 Starting authenticated collaboration...');
//     addConnectionLog('Starting collaboration...');
    
//     setConnectionAttempt(prev => prev + 1);
    
//     if (!user || !token) {
//       console.error('❌ User not authenticated');
//       addConnectionLog('Error: User not authenticated');
//       return;
//     }
    
//     // First get session info with WebSocket token
//     const sessionData = await fetchSessionInfo();
//     if (!sessionData || !sessionData.wsToken) {
//       console.error('❌ Failed to get session data');
//       addConnectionLog('Error: Failed to get session data');
//       return;
//     }
    
//     const wsToken = sessionData.wsToken;
//     const wsUrl = getWebSocketUrl(wsToken);
//     if (!wsUrl) return;
    
//     try {
//       // Create Yjs document
//       const ydoc = new Y.Doc();
//       ydocRef.current = ydoc;
//       console.log('✅ Yjs document created');
//       addConnectionLog('Yjs document created');
      
//       // Create WebSocket Provider
//       const provider = new WebsocketProvider(
//         wsUrl,
//         sessionId, // Room name = sessionId
//         ydoc,
//         {
//           connect: true,
//           WebSocketPolyfill: WebSocket,
//           maxBackoffTime: 3000,
//           resyncInterval: 1000
//         }
//       );
      
//       providerRef.current = provider;
      
//       // Get Yjs array for whiteboard
//       const yCanvasArray = ydoc.getArray('whiteboard');
      
//       // ✅ Listen for connection status
//       provider.on('status', (event) => {
//         console.log('📡 Yjs Status:', event.status);
//         addConnectionLog(`Status: ${event.status}`);
//         setConnectionStatus(event.status);
        
//         if (event.status === 'connected') {
//           console.log('🎉 YJS CONNECTED SUCCESSFULLY!');
//           addConnectionLog('✅ Connected to LiveSession');
//           setIsLoading(false);
//         }
        
//         if (event.status === 'disconnected') {
//           // Auto-reconnect after 3 seconds
//           setTimeout(() => {
//             console.log('🔄 Attempting to reconnect...');
//             addConnectionLog('Attempting reconnect');
//             if (providerRef.current) {
//               providerRef.current.connect();
//             }
//           }, 3000);
//         }
//       });
      
//       // ✅ Listen for sync events
//       provider.on('sync', (isSynced) => {
//         console.log('🔄 Yjs Sync:', isSynced);
//         addConnectionLog(`Sync: ${isSynced}`);
        
//         if (isSynced && fabricCanvasRef.current) {
//           // Load canvas data from Yjs
//           if (yCanvasArray.length > 0) {
//             try {
//               const canvasData = yCanvasArray.toJSON()[0];
//               if (canvasData && canvasData.objects) {
//                 console.log('📥 Loading canvas from Yjs');
//                 addConnectionLog('Loading canvas from Yjs');
                
//                 fabricCanvasRef.current.loadFromJSON(canvasData, () => {
//                   fabricCanvasRef.current.renderAll();
//                   console.log('✅ Canvas loaded from Yjs');
//                   addConnectionLog('Canvas loaded');
//                 });
//               }
//             } catch (error) {
//               console.error('Error loading canvas:', error);
//               addConnectionLog(`Load error: ${error.message}`);
//             }
//           }
//         }
//       });
      
//       // ✅ Listen for Yjs updates (remote changes)
//       yCanvasArray.observe(event => {
//         if (!fabricCanvasRef.current) return;
        
//         // Skip if this is our own change
//         if (event.transaction.origin === ydoc.clientID) {
//           console.log('📤 Local change, skipping sync back');
//           return;
//         }
        
//         console.log('🔄 Remote change detected');
//         addConnectionLog('Remote change received');
        
//         try {
//           const canvasData = yCanvasArray.toJSON()[0];
//           if (canvasData) {
//             fabricCanvasRef.current.loadFromJSON(canvasData, () => {
//               fabricCanvasRef.current.renderAll();
//               console.log('✅ Canvas updated from remote');
//             });
//           }
//         } catch (error) {
//           console.error('Error updating canvas:', error);
//           addConnectionLog(`Update error: ${error.message}`);
//         }
//       });
      
//       // ✅ Listen for custom messages
//       provider.ws.addEventListener('message', (event) => {
//         try {
//           if (typeof event.data === 'string') {
//             const message = JSON.parse(event.data);
            
//             switch (message.type) {
//               case 'welcome':
//                 console.log('👋 Welcome:', message);
//                 addConnectionLog(`Welcome to: ${message.sessionTitle}`);
//                 setPermissions(message.permissions || {});
//                 break;
                
//               case 'user-joined':
//                 console.log(`👤 ${message.userName} joined`);
//                 addConnectionLog(`${message.userName} joined`);
//                 updateActiveUsers('add', message);
//                 break;
                
//               case 'user-left':
//                 console.log(`👤 ${message.userName} left`);
//                 addConnectionLog(`${message.userName} left`);
//                 updateActiveUsers('remove', message);
//                 break;
                
//               case 'active-users':
//                 setActiveUsers(message.users || []);
//                 break;
                
//               case 'error':
//                 console.error('❌ Server error:', message);
//                 addConnectionLog(`Error: ${message.message}`);
//                 break;
                
//               case 'chat-message':
//                 console.log(`💬 ${message.userName}: ${message.text}`);
//                 // Handle chat messages if needed
//                 break;
//             }
//           }
//         } catch (e) {
//           // Not JSON, ignore
//         }
//       });
      
//       // ✅ Handle WebSocket errors
//       provider.ws.addEventListener('error', (error) => {
//         console.error('❌ WebSocket Error:', error);
//         addConnectionLog(`WebSocket Error: ${error.message}`);
//         setConnectionStatus('error');
//       });
      
//       provider.ws.addEventListener('close', () => {
//         console.log('🔌 WebSocket closed');
//         addConnectionLog('WebSocket closed');
//         setConnectionStatus('disconnected');
//       });
      
//       console.log('✅ Yjs provider created');
//       addConnectionLog('Yjs provider created');
      
//     } catch (error) {
//       console.error('❌ Collaboration setup error:', error);
//       addConnectionLog(`Setup error: ${error.message}`);
//     }
//   }, [sessionId, roomCode, user, token, isStreamer]);

//   // ✅ Update active users list
//   const updateActiveUsers = (action, userData) => {
//     setActiveUsers(prev => {
//       if (action === 'add') {
//         return [...prev.filter(u => u.userId !== userData.userId), {
//           userId: userData.userId,
//           userName: userData.userName,
//           userRole: userData.userRole,
//           isStreamer: userData.isStreamer
//         }];
//       } else {
//         return prev.filter(u => u.userId !== userData.userId);
//       }
//     });
//   };

//   // ✅ Sync Canvas to Yjs
//   const syncCanvasToYjs = useCallback(() => {
//     if (!fabricCanvasRef.current || !permissions.canDraw || !providerRef.current) {
//       console.log('❌ Cannot sync: No permission or not ready');
//       return;
//     }
    
//     try {
//       console.log('📤 Syncing canvas to Yjs...');
      
//       const canvas = fabricCanvasRef.current;
//       const canvasState = canvas.toJSON();
      
//       // Update Yjs document
//       if (ydocRef.current) {
//         const ydoc = ydocRef.current;
//         const yCanvasArray = ydoc.getArray('whiteboard');
        
//         yCanvasArray.delete(0, yCanvasArray.length);
//         yCanvasArray.insert(0, [canvasState]);
        
//         console.log('✅ Canvas synced to Yjs');
//         addConnectionLog('Canvas synced');
//       }
      
//     } catch (error) {
//       console.error('❌ Error syncing canvas:', error);
//       addConnectionLog(`Sync error: ${error.message}`);
//     }
//   }, [permissions]);

//   // ✅ Initialize Canvas
//   const initCanvas = useCallback(() => {
//     console.log('🎨 initCanvas called!');
//     addConnectionLog('Initializing canvas...');
    
//     if (!containerRef.current) {
//       console.log('❌ Container not ready, retrying...');
//       addConnectionLog('Container not ready, retrying...');
//       setTimeout(() => initCanvas(), 500);
//       return;
//     }
    
//     console.log('✅ Container ready');
//     addConnectionLog('Container ready');
    
//     // Clean up existing canvas
//     if (fabricCanvasRef.current) {
//       console.log('🧹 Cleaning up existing canvas');
//       fabricCanvasRef.current.dispose();
//       fabricCanvasRef.current = null;
//     }
    
//     // Create new canvas
//     const canvas = new fabric.Canvas(canvasRef.current, {
//       width: containerRef.current.clientWidth,
//       height: containerRef.current.clientHeight,
//       backgroundColor: '#ffffff',
//       selection: true,
//       preserveObjectStacking: true,
//     });
    
//     fabricCanvasRef.current = canvas;
//     console.log('✅ Fabric canvas created');
//     addConnectionLog('Fabric canvas created');
    
//     // Setup drawing based on permissions
//     canvas.isDrawingMode = false;
//     if (permissions.canDraw) {
//       canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
//       canvas.freeDrawingBrush.width = brushWidth;
//       canvas.freeDrawingBrush.color = brushColor;
//     }
    
//     // Event Listeners
//     canvas.on('mouse:move', (e) => {
//       if (!e.absolutePointer) return;
      
//       setCursorPosition({
//         x: Math.round(e.absolutePointer.x),
//         y: Math.round(e.absolutePointer.y)
//       });
//     });
    
//     canvas.on('object:added', (e) => {
//       if (e.target) {
//         console.log('➕ Object added:', e.target.type);
        
//         // Generate ID if not exists
//         if (!e.target.id) {
//           e.target.id = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//         }
        
//         // Save state
//         saveState();
        
//         // Sync to Yjs if we have permission
//         if (permissions.canDraw) {
//           setTimeout(() => {
//             syncCanvasToYjs();
//           }, 100);
//         }
//       }
//     });
    
//     canvas.on('object:modified', (e) => {
//       if (e.target) {
//         console.log('✏️ Object modified');
        
//         setTimeout(() => {
//           saveState();
//           if (permissions.canEdit) {
//             syncCanvasToYjs();
//           }
//         }, 100);
//       }
//     });
    
//     canvas.on('object:removed', (e) => {
//       if (e.target) {
//         console.log('➖ Object removed');
        
//         setTimeout(() => {
//           saveState();
//           if (permissions.canDelete) {
//             syncCanvasToYjs();
//           }
//         }, 100);
//       }
//     });
    
//     // Window resize handler
//     const handleResize = () => {
//       if (containerRef.current && canvas) {
//         canvas.setDimensions({
//           width: containerRef.current.clientWidth,
//           height: containerRef.current.clientHeight
//         });
//         canvas.renderAll();
//       }
//     };
    
//     window.addEventListener('resize', handleResize);
    
//     // Initial save
//     saveState();
    
//     console.log('✅ Canvas initialization complete');
//     addConnectionLog('Canvas initialization complete');
    
//     // Start collaboration after canvas is ready
//     setTimeout(() => {
//       console.log('🚀 Starting collaboration...');
//       addConnectionLog('Starting collaboration...');
//       initCollaboration();
//     }, 1000);
    
//     return () => {
//       window.removeEventListener('resize', handleResize);
//     };
//   }, [initCollaboration, brushWidth, brushColor, permissions, syncCanvasToYjs]);

//   // ✅ Save State for Undo/Redo
//   const saveState = () => {
//     if (!fabricCanvasRef.current) return;
    
//     const state = fabricCanvasRef.current.toJSON();
//     const newHistory = [...history.slice(0, historyIndex + 1), state];
    
//     setHistory(newHistory);
//     setHistoryIndex(newHistory.length - 1);
//   };

//   // ✅ Undo
//   const handleUndo = () => {
//     if (historyIndex > 0) {
//       const newIndex = historyIndex - 1;
//       setHistoryIndex(newIndex);
      
//       fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
//         fabricCanvasRef.current.renderAll();
//         if (permissions.canEdit) {
//           syncCanvasToYjs();
//         }
//       });
//     }
//   };

//   // ✅ Redo
//   const handleRedo = () => {
//     if (historyIndex < history.length - 1) {
//       const newIndex = historyIndex + 1;
//       setHistoryIndex(newIndex);
      
//       fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
//         fabricCanvasRef.current.renderAll();
//         if (permissions.canEdit) {
//           syncCanvasToYjs();
//         }
//       });
//     }
//   };

//   // ✅ Tool Handlers with Permission Check
//   const handleToolSelect = (selectedTool) => {
//     console.log(`🛠️ Tool selected: ${selectedTool}`);
    
//     // Check permissions
//     if ((selectedTool === 'draw' || selectedTool === 'eraser') && !permissions.canDraw) {
//       console.log('🚫 No permission to draw');
//       addConnectionLog('No permission to draw');
//       return;
//     }
    
//     setTool(selectedTool);
//     const canvas = fabricCanvasRef.current;
    
//     if (!canvas) return;
    
//     switch (selectedTool) {
//       case 'select':
//         canvas.isDrawingMode = false;
//         canvas.selection = true;
//         break;
//       case 'draw':
//         if (permissions.canDraw) {
//           canvas.isDrawingMode = true;
//           canvas.freeDrawingBrush.width = brushWidth;
//           canvas.freeDrawingBrush.color = brushColor;
//         }
//         break;
//       case 'rectangle':
//         if (permissions.canDraw) addRectangle();
//         break;
//       case 'circle':
//         if (permissions.canDraw) addCircle();
//         break;
//       case 'triangle':
//         if (permissions.canDraw) addTriangle();
//         break;
//       case 'text':
//         if (permissions.canDraw) addText();
//         break;
//       case 'sticky':
//         if (permissions.canDraw) addStickyNote();
//         break;
//       case 'image':
//         if (permissions.canDraw) uploadImage();
//         break;
//       case 'eraser':
//         if (permissions.canDelete) activateEraser();
//         break;
//       case 'line':
//         if (permissions.canDraw) startDrawingLine();
//         break;
//       case 'arrow':
//         if (permissions.canDraw) startDrawingArrow();
//         break;
//       case 'star':
//         if (permissions.canDraw) addStar();
//         break;
//       case 'hexagon':
//         if (permissions.canDraw) addHexagon();
//         break;
//     }
//   };

//   // Drawing Functions
//   const addRectangle = () => {
//     const rect = new fabric.Rect({
//       left: 100,
//       top: 100,
//       width: 100,
//       height: 100,
//       fill: fillColor,
//       stroke: brushColor,
//       strokeWidth: brushWidth,
//       opacity: opacity,
//       selectable: true
//     });
    
//     fabricCanvasRef.current.add(rect);
//     fabricCanvasRef.current.setActiveObject(rect);
//     setTool('select');
//   };

//   const addCircle = () => {
//     const circle = new fabric.Circle({
//       left: 100,
//       top: 100,
//       radius: 50,
//       fill: fillColor,
//       stroke: brushColor,
//       strokeWidth: brushWidth,
//       opacity: opacity,
//       selectable: true
//     });
    
//     fabricCanvasRef.current.add(circle);
//     fabricCanvasRef.current.setActiveObject(circle);
//     setTool('select');
//   };

//   const addTriangle = () => {
//     const triangle = new fabric.Triangle({
//       left: 100,
//       top: 100,
//       width: 100,
//       height: 100,
//       fill: fillColor,
//       stroke: brushColor,
//       strokeWidth: brushWidth,
//       opacity: opacity,
//       selectable: true
//     });
    
//     fabricCanvasRef.current.add(triangle);
//     fabricCanvasRef.current.setActiveObject(triangle);
//     setTool('select');
//   };

//   const addStar = () => {
//     const star = new fabric.Path('M 100 10 L 123 80 L 200 80 L 138 120 L 160 190 L 100 145 L 40 190 L 62 120 L 0 80 L 77 80 Z', {
//       left: 100,
//       top: 100,
//       fill: fillColor,
//       stroke: brushColor,
//       strokeWidth: brushWidth,
//       opacity: opacity,
//       selectable: true
//     });
    
//     fabricCanvasRef.current.add(star);
//     fabricCanvasRef.current.setActiveObject(star);
//     setTool('select');
//   };

//   const addHexagon = () => {
//     const hexagon = new fabric.Polygon([
//       { x: 50, y: 0 },
//       { x: 100, y: 25 },
//       { x: 100, y: 75 },
//       { x: 50, y: 100 },
//       { x: 0, y: 75 },
//       { x: 0, y: 25 }
//     ], {
//       left: 100,
//       top: 100,
//       fill: fillColor,
//       stroke: brushColor,
//       strokeWidth: brushWidth,
//       opacity: opacity,
//       selectable: true
//     });
    
//     fabricCanvasRef.current.add(hexagon);
//     fabricCanvasRef.current.setActiveObject(hexagon);
//     setTool('select');
//   };

//   const addText = () => {
//     const text = new fabric.IText('Double click to edit', {
//       left: 100,
//       top: 100,
//       fontSize: fontSize,
//       fontFamily: fontFamily,
//       fill: brushColor,
//       selectable: true
//     });
    
//     fabricCanvasRef.current.add(text);
//     fabricCanvasRef.current.setActiveObject(text);
//     setTool('select');
//   };

//   const addStickyNote = () => {
//     const stickyNote = new fabric.Rect({
//       left: 100,
//       top: 100,
//       width: 200,
//       height: 150,
//       fill: stickyNoteColor,
//       stroke: '#d4d4d4',
//       strokeWidth: 1,
//       opacity: 0.9,
//       shadow: 'rgba(0,0,0,0.2) 2px 2px 5px',
//       selectable: true
//     });
    
//     const text = new fabric.IText('Double click to edit note', {
//       left: 110,
//       top: 110,
//       fontSize: 16,
//       fontFamily: 'Arial',
//       fill: '#000000',
//       selectable: true
//     });
    
//     const group = new fabric.Group([stickyNote, text], {
//       selectable: true
//     });
    
//     fabricCanvasRef.current.add(group);
//     fabricCanvasRef.current.setActiveObject(group);
//     setTool('select');
//   };

//   const startDrawingLine = () => {
//     const canvas = fabricCanvasRef.current;
//     let isDrawing = false;
//     let line = null;
    
//     const mouseDown = (options) => {
//       isDrawing = true;
//       const pointer = canvas.getPointer(options.e);
      
//       line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
//         stroke: brushColor,
//         strokeWidth: brushWidth,
//         selectable: true
//       });
      
//       canvas.add(line);
//     };
    
//     const mouseMove = (options) => {
//       if (!isDrawing || !line) return;
      
//       const pointer = canvas.getPointer(options.e);
//       line.set({ x2: pointer.x, y2: pointer.y });
//       canvas.renderAll();
//     };
    
//     const mouseUp = () => {
//       isDrawing = false;
//       canvas.off('mouse:down', mouseDown);
//       canvas.off('mouse:move', mouseMove);
//       canvas.off('mouse:up', mouseUp);
//       setTool('select');
//     };
    
//     canvas.on('mouse:down', mouseDown);
//     canvas.on('mouse:move', mouseMove);
//     canvas.on('mouse:up', mouseUp);
//   };

//   const startDrawingArrow = () => {
//     const canvas = fabricCanvasRef.current;
//     let isDrawing = false;
//     let line = null;
//     let arrowHead = null;
    
//     const mouseDown = (options) => {
//       isDrawing = true;
//       const pointer = canvas.getPointer(options.e);
      
//       line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
//         stroke: brushColor,
//         strokeWidth: brushWidth,
//         selectable: true
//       });
      
//       arrowHead = new fabric.Triangle({
//         width: 15,
//         height: 15,
//         fill: brushColor,
//         left: pointer.x,
//         top: pointer.y,
//         angle: 0,
//         selectable: false
//       });
      
//       canvas.add(line);
//       canvas.add(arrowHead);
//     };
    
//     const mouseMove = (options) => {
//       if (!isDrawing || !line || !arrowHead) return;
      
//       const pointer = canvas.getPointer(options.e);
//       line.set({ x2: pointer.x, y2: pointer.y });
      
//       const dx = pointer.x - line.x1;
//       const dy = pointer.y - line.y1;
//       const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      
//       arrowHead.set({
//         left: pointer.x,
//         top: pointer.y,
//         angle: angle
//       });
      
//       canvas.renderAll();
//     };
    
//     const mouseUp = () => {
//       isDrawing = false;
      
//       if (line && arrowHead) {
//         const group = new fabric.Group([line, arrowHead], {
//           selectable: true
//         });
        
//         canvas.remove(line);
//         canvas.remove(arrowHead);
//         canvas.add(group);
//       }
      
//       canvas.off('mouse:down', mouseDown);
//       canvas.off('mouse:move', mouseMove);
//       canvas.off('mouse:up', mouseUp);
//       setTool('select');
//     };
    
//     canvas.on('mouse:down', mouseDown);
//     canvas.on('mouse:move', mouseMove);
//     canvas.on('mouse:up', mouseUp);
//   };

//   const uploadImage = () => {
//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = 'image/*';
    
//     input.onchange = (e) => {
//       const file = e.target.files[0];
//       if (!file) return;
      
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         fabric.Image.fromURL(event.target.result, (img) => {
//           img.set({
//             left: 100,
//             top: 100,
//             scaleX: 0.5,
//             scaleY: 0.5,
//             selectable: true
//           });
          
//           fabricCanvasRef.current.add(img);
//           fabricCanvasRef.current.setActiveObject(img);
//           setTool('select');
//         });
//       };
//       reader.readAsDataURL(file);
//     };
    
//     input.click();
//   };

//   const activateEraser = () => {
//     const canvas = fabricCanvasRef.current;
//     canvas.isDrawingMode = false;
//     canvas.selection = false;
    
//     const mouseDown = (options) => {
//       const pointer = canvas.getPointer(options.e);
//       const objects = canvas.getObjects();
      
//       objects.forEach(obj => {
//         if (obj.containsPoint(pointer)) {
//           canvas.remove(obj);
//         }
//       });
      
//       canvas.renderAll();
//     };
    
//     canvas.on('mouse:down', mouseDown);
    
//     setTimeout(() => {
//       canvas.off('mouse:down', mouseDown);
//       setTool('select');
//     }, 5000);
//   };

//   // Export Functions
//   const exportAsImage = () => {
//     if (!fabricCanvasRef.current) return;
    
//     const dataURL = fabricCanvasRef.current.toDataURL({
//       format: 'png',
//       quality: 1,
//       multiplier: 2
//     });
    
//     const link = document.createElement('a');
//     link.href = dataURL;
//     link.download = `whiteboard-${sessionInfo?.title || 'session'}-${new Date().toISOString().slice(0, 10)}.png`;
//     link.click();
//   };

//   const exportAsJSON = () => {
//     if (!fabricCanvasRef.current) return;
    
//     const json = fabricCanvasRef.current.toJSON();
//     const dataStr = JSON.stringify(json);
//     const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
//     const link = document.createElement('a');
//     link.href = dataUri;
//     link.download = `whiteboard-${sessionInfo?.title || 'session'}-${new Date().toISOString().slice(0, 10)}.json`;
//     link.click();
//   };

//   const importFromJSON = () => {
//     if (!permissions.canEdit) {
//       console.log('🚫 No permission to import');
//       return;
//     }
    
//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = '.json';
    
//     input.onchange = (e) => {
//       const file = e.target.files[0];
//       if (!file) return;
      
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         try {
//           const json = JSON.parse(event.target.result);
//           fabricCanvasRef.current.loadFromJSON(json, () => {
//             fabricCanvasRef.current.renderAll();
//             saveState();
//             if (permissions.canEdit) {
//               syncCanvasToYjs();
//             }
//           });
//         } catch (error) {
//           console.error('Error loading JSON:', error);
//         }
//       };
//       reader.readAsText(file);
//     };
    
//     input.click();
//   };

//   // Zoom Functions
//   const handleZoomIn = () => {
//     const newZoom = Math.min(zoom * 1.2, 5);
//     setZoom(newZoom);
    
//     if (fabricCanvasRef.current) {
//       fabricCanvasRef.current.setZoom(newZoom);
//       fabricCanvasRef.current.renderAll();
//     }
//   };

//   const handleZoomOut = () => {
//     const newZoom = Math.max(zoom / 1.2, 0.2);
//     setZoom(newZoom);
    
//     if (fabricCanvasRef.current) {
//       fabricCanvasRef.current.setZoom(newZoom);
//       fabricCanvasRef.current.renderAll();
//     }
//   };

//   const handleZoomReset = () => {
//     setZoom(1);
    
//     if (fabricCanvasRef.current) {
//       fabricCanvasRef.current.setZoom(1);
//       fabricCanvasRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
//       fabricCanvasRef.current.renderAll();
//     }
//   };

//   // Clear Canvas with Permission Check
//   const handleClear = () => {
//     if (!permissions.canClear) {
//       console.log('🚫 No permission to clear canvas');
//       return;
//     }
    
//     if (window.confirm('Are you sure you want to clear the whiteboard?')) {
//       fabricCanvasRef.current.clear();
//       fabricCanvasRef.current.backgroundColor = '#ffffff';
//       saveState();
//       syncCanvasToYjs();
//     }
//   };

//   // Force Reconnect
//   const forceReconnect = () => {
//     console.log('🔁 Forcing reconnection...');
//     addConnectionLog('Force reconnection initiated');
    
//     if (providerRef.current) {
//       providerRef.current.disconnect();
//       providerRef.current = null;
//     }
    
//     if (ydocRef.current) {
//       ydocRef.current.destroy();
//       ydocRef.current = null;
//     }
    
//     setTimeout(() => {
//       initCollaboration();
//     }, 500);
//   };

//   // ✅ Test WebSocket Connection
//   const testWebSocketConnection = () => {
//     console.log('🧪 Testing WebSocket connection...');
//     addConnectionLog('Testing WebSocket connection...');
    
//     const wsUrl = getWebSocketUrl();
//     if (!wsUrl) return;
    
//     console.log(`Test URL: ${wsUrl}`);
//     addConnectionLog(`Testing: ${wsUrl}`);
    
//     const testWs = new WebSocket(wsUrl);
    
//     testWs.onopen = () => {
//       console.log(`✅ CONNECTED to: ${wsUrl}`);
//       addConnectionLog(`✅ Connected to WebSocket`);
//       testWs.send(JSON.stringify({ 
//         type: 'test', 
//         message: 'Whiteboard connection test',
//         timestamp: new Date().toISOString()
//       }));
//       setTimeout(() => testWs.close(), 1000);
//     };
    
//     testWs.onerror = (error) => {
//       console.log(`❌ FAILED: ${wsUrl}`);
//       addConnectionLog(`❌ Failed to connect: ${error}`);
//     };
    
//     testWs.onmessage = (event) => {
//       console.log(`📨 Response:`, event.data);
//       addConnectionLog(`Response: ${typeof event.data === 'string' ? event.data : 'Binary data'}`);
//     };
//   };

//   // ✅ Main Effect - Component Mount/Unmount
//   useEffect(() => {
//     console.log('🎯 WhiteboardComponent useEffect - isActive:', isActive);
    
//     if (isActive) {
//       console.log('🚀 Whiteboard ACTIVE - Starting initialization...');
//       addConnectionLog('Whiteboard activated');
      
//       // Small delay to ensure DOM is ready
//       const timeoutId = setTimeout(() => {
//         console.log('🎨 Calling initCanvas...');
//         initCanvas();
//       }, 300);
      
//       return () => {
//         console.log('🧹 Cleaning up whiteboard timeout');
//         clearTimeout(timeoutId);
//       };
//     } else {
//       console.log('⏸️ Whiteboard INACTIVE');
//       addConnectionLog('Whiteboard deactivated');
//     }
//   }, [isActive, initCanvas]);

//   // ✅ Cleanup Effect
//   useEffect(() => {
//     return () => {
//       console.log('🧹 WhiteboardComponent UNMOUNTING - Cleanup');
//       addConnectionLog('Component unmounting');
      
//       // Clean up Yjs
//       if (providerRef.current) {
//         console.log('Disconnecting Yjs provider...');
//         providerRef.current.disconnect();
//         providerRef.current = null;
//       }
      
//       if (ydocRef.current) {
//         console.log('Destroying Yjs document...');
//         ydocRef.current.destroy();
//         ydocRef.current = null;
//       }
      
//       // Clean up fabric canvas
//       if (fabricCanvasRef.current) {
//         console.log('Disposing fabric canvas...');
//         fabricCanvasRef.current.dispose();
//         fabricCanvasRef.current = null;
//       }
//     };
//   }, []);

//   if (!isActive) {
//     console.log('⏸️ Whiteboard not active, returning null');
//     return null;
//   }

//   if (isLoading) {
//     return (
//       <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
//         <div className="text-white text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
//           <div>Connecting to whiteboard...</div>
//           <div className="text-sm text-gray-400 mt-2">
//             Session: {sessionId} | Room: {roomCode}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   console.log('🎨 Whiteboard RENDERING UI');
  
//   return (
//     <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
//       {/* Header */}
//       <div className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
//         <div className="flex items-center space-x-4">
//           <h2 className="text-xl font-bold text-white flex items-center">
//             <FiEdit3 className="mr-2" />
//             {sessionInfo?.title || 'Collaborative Whiteboard'}
//           </h2>
          
//           <div className="flex items-center space-x-2">
//             <div className={`w-3 h-3 rounded-full ${
//               connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
//               connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
//             }`} />
//             <span className="text-sm text-gray-300">
//               {connectionStatus === 'connected' ? 'Connected' : 
//                connectionStatus === 'connecting' ? 'Connecting...' : 
//                'Disconnected'}
//             </span>
            
//             <span className="text-xs bg-gray-700 px-2 py-1 rounded">
//               {isStreamer ? '🎤 Streamer' : '👀 Viewer'}
//             </span>
            
//             {!permissions.canDraw && (
//               <span className="text-xs bg-yellow-800 px-2 py-1 rounded flex items-center">
//                 <FiLock className="mr-1" size={10} /> View Only
//               </span>
//             )}
//           </div>
//         </div>
        
//         <div className="flex items-center space-x-2">
//           {/* Active Users */}
//           <div className="flex items-center space-x-1 text-sm text-gray-300">
//             <FiUsers />
//             <span>{activeUsers.length + 1} online</span>
//           </div>
          
//           {/* Debug Buttons */}
//           {showDebug && (
//             <button
//               onClick={testWebSocketConnection}
//               className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white text-sm"
//             >
//               🧪 Test WS
//             </button>
//           )}
          
//           <button
//             onClick={forceReconnect}
//             className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm"
//           >
//             <FiRefreshCw />
//           </button>
          
//           <button
//             onClick={() => setShowDebug(!showDebug)}
//             className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm"
//           >
//             {showDebug ? 'Hide Debug' : 'Debug'}
//           </button>
          
//           <button
//             onClick={handleZoomReset}
//             className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
//             title="Reset Zoom"
//           >
//             <FiMaximize2 />
//           </button>
          
//           <button
//             onClick={onClose}
//             className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
//             title="Close Whiteboard"
//           >
//             <FiX />
//           </button>
//         </div>
//       </div>

//       {/* Main Area */}
//       <div className="flex-1 flex overflow-hidden">
//         {/* Tools Sidebar */}
//         <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 space-y-4">
//           {tools.map((toolItem) => (
//             <button
//               key={toolItem.id}
//               onClick={() => handleToolSelect(toolItem.id)}
//               className={`p-3 rounded-xl transition-all duration-200 ${
//                 tool === toolItem.id 
//                   ? 'bg-blue-600 text-white shadow-lg' 
//                   : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
//               } ${
//                 ((toolItem.id === 'draw' || toolItem.id === 'eraser') && !permissions.canDraw) ||
//                 (toolItem.id === 'eraser' && !permissions.canDelete) ||
//                 (['rectangle', 'circle', 'triangle', 'text', 'sticky', 'image', 'line', 'arrow', 'star', 'hexagon'].includes(toolItem.id) && !permissions.canDraw)
//                   ? 'opacity-50 cursor-not-allowed'
//                   : ''
//               }`}
//               title={toolItem.name}
//               disabled={
//                 ((toolItem.id === 'draw' || toolItem.id === 'eraser') && !permissions.canDraw) ||
//                 (toolItem.id === 'eraser' && !permissions.canDelete) ||
//                 (['rectangle', 'circle', 'triangle', 'text', 'sticky', 'image', 'line', 'arrow', 'star', 'hexagon'].includes(toolItem.id) && !permissions.canDraw)
//               }
//             >
//               {toolItem.icon}
//             </button>
//           ))}
//         </div>

//         {/* Properties Sidebar */}
//         <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
//           <div className="space-y-6">
//             <div>
//               <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
//                 <BsBrush className="mr-2" />
//                 Brush Properties
//                 {!permissions.canDraw && (
//                   <FiLock className="ml-auto" size={12} />
//                 )}
//               </h3>
              
//               <div className="space-y-3">
//                 <div>
//                   <label className="text-xs text-gray-400">Width</label>
//                   <div className="flex flex-wrap gap-1 mt-1">
//                     {brushSizes.map((size) => (
//                       <button
//                         key={size}
//                         onClick={() => setBrushWidth(size)}
//                         className={`w-8 h-8 rounded-full flex items-center justify-center ${
//                           brushWidth === size 
//                             ? 'bg-blue-600 text-white' 
//                             : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
//                         } ${!permissions.canDraw ? 'opacity-50 cursor-not-allowed' : ''}`}
//                         disabled={!permissions.canDraw}
//                       >
//                         {size}
//                       </button>
//                     ))}
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-xs text-gray-400">Stroke Color</label>
//                   <div className="grid grid-cols-7 gap-1 mt-1">
//                     {colors.map((color) => (
//                       <button
//                         key={color}
//                         onClick={() => setBrushColor(color)}
//                         className={`w-6 h-6 rounded-full border-2 ${
//                           brushColor === color ? 'border-white' : 'border-gray-700'
//                         } ${!permissions.canDraw ? 'opacity-50' : ''}`}
//                         style={{ backgroundColor: color }}
//                         disabled={!permissions.canDraw}
//                       />
//                     ))}
//                   </div>
//                   <input
//                     type="color"
//                     value={brushColor}
//                     onChange={(e) => setBrushColor(e.target.value)}
//                     className={`w-full mt-2 bg-gray-700 border border-gray-600 rounded ${!permissions.canDraw ? 'opacity-50 cursor-not-allowed' : ''}`}
//                     disabled={!permissions.canDraw}
//                   />
//                 </div>

//                 <div>
//                   <label className="text-xs text-gray-400">Fill Color</label>
//                   <div className="grid grid-cols-7 gap-1 mt-1">
//                     {colors.map((color) => (
//                       <button
//                         key={color}
//                         onClick={() => setFillColor(color)}
//                         className={`w-6 h-6 rounded-full border-2 ${
//                           fillColor === color ? 'border-white' : 'border-gray-700'
//                         } ${!permissions.canDraw ? 'opacity-50' : ''}`}
//                         style={{ backgroundColor: color }}
//                         disabled={!permissions.canDraw}
//                       />
//                     ))}
//                   </div>
//                   <input
//                     type="color"
//                     value={fillColor}
//                     onChange={(e) => setFillColor(e.target.value)}
//                     className={`w-full mt-2 bg-gray-700 border border-gray-600 rounded ${!permissions.canDraw ? 'opacity-50 cursor-not-allowed' : ''}`}
//                     disabled={!permissions.canDraw}
//                   />
//                 </div>

//                 <div>
//                   <label className="text-xs text-gray-400">
//                     Opacity: {Math.round(opacity * 100)}%
//                   </label>
//                   <input
//                     type="range"
//                     min="0.1"
//                     max="1"
//                     step="0.1"
//                     value={opacity}
//                     onChange={(e) => setOpacity(parseFloat(e.target.value))}
//                     className={`w-full mt-1 ${!permissions.canDraw ? 'opacity-50 cursor-not-allowed' : ''}`}
//                     disabled={!permissions.canDraw}
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* Session Info */}
//             {sessionInfo && (
//               <div className="pt-4 border-t border-gray-700">
//                 <h3 className="text-sm font-semibold text-gray-300 mb-2">Session Info</h3>
//                 <div className="text-xs text-gray-400 space-y-1">
//                   <div>Title: {sessionInfo.title}</div>
//                   <div>Room: {sessionInfo.roomCode}</div>
//                   {sessionInfo.streamerName && (
//                     <div>Host: {sessionInfo.streamerName}</div>
//                   )}
//                   <div>Participants: {activeUsers.length + 1}</div>
//                   <div className="pt-2">
//                     <div className="text-gray-300">Permissions:</div>
//                     <div className="flex flex-wrap gap-1 mt-1">
//                       {permissions.canDraw && (
//                         <span className="bg-green-900 px-2 py-1 rounded text-xs">Draw</span>
//                       )}
//                       {permissions.canEdit && (
//                         <span className="bg-blue-900 px-2 py-1 rounded text-xs">Edit</span>
//                       )}
//                       {permissions.canDelete && (
//                         <span className="bg-red-900 px-2 py-1 rounded text-xs">Delete</span>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Canvas Area */}
//         <div className="flex-1 relative overflow-hidden" ref={containerRef}>
//           <canvas ref={canvasRef} className="absolute inset-0" />
          
//           {/* Loading Overlay */}
//           {connectionStatus !== 'connected' && (
//             <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
//               <div className="text-white text-center">
//                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
//                 <div>Connecting to whiteboard...</div>
//                 <div className="text-sm text-gray-400 mt-2">
//                   Status: {connectionStatus}
//                 </div>
//               </div>
//             </div>
//           )}
          
//           {/* View Only Overlay */}
//           {!permissions.canDraw && connectionStatus === 'connected' && (
//             <div className="absolute top-4 right-4 bg-yellow-800/80 text-white text-xs px-3 py-2 rounded-lg">
//               👀 View Only Mode
//             </div>
//           )}
          
//           {/* Status Bar */}
//           <div className="absolute bottom-4 left-4 bg-black/70 text-white text-sm px-3 py-2 rounded-lg">
//             X: {cursorPosition.x}, Y: {cursorPosition.y} | Zoom: {Math.round(zoom * 100)}% | Tool: {tool}
//           </div>

//           {/* Zoom Controls */}
//           <div className="absolute bottom-4 right-4 flex space-x-2">
//             <button
//               onClick={handleZoomOut}
//               className="bg-black/70 text-white p-2 rounded-lg hover:bg-black/80"
//               title="Zoom Out"
//             >
//               <FiZoomOut />
//             </button>
//             <button
//               onClick={handleZoomIn}
//               className="bg-black/70 text-white p-2 rounded-lg hover:bg-black/80"
//               title="Zoom In"
//             >
//               <FiZoomIn />
//             </button>
//           </div>

//           {/* Debug Info Panel */}
//           {showDebug && (
//             <div className="absolute top-4 left-4 bg-black/80 text-white text-xs p-3 rounded-lg max-w-md max-h-64 overflow-y-auto">
//               <div className="font-bold mb-2">Debug Info:</div>
//               <div className="space-y-1">
//                 <div>Status: <span className={connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>{connectionStatus}</span></div>
//                 <div>Connection Attempts: {connectionAttempt}</div>
//                 <div>Session ID: {sessionId}</div>
//                 <div>Room Code: {roomCode}</div>
//                 <div>User: {user?.name || 'Anonymous'}</div>
//                 <div>Role: {isStreamer ? 'Streamer' : 'Viewer'}</div>
//                 <div>Canvas: {fabricCanvasRef.current ? 'Loaded' : 'Not loaded'}</div>
//                 <div>Yjs: {ydocRef.current ? 'Active' : 'Inactive'}</div>
//                 <div>Provider: {providerRef.current ? 'Connected' : 'Disconnected'}</div>
                
//                 <div className="mt-2 font-bold">Permissions:</div>
//                 <div className="grid grid-cols-2 gap-1">
//                   <div>Draw: {permissions.canDraw ? '✅' : '❌'}</div>
//                   <div>Edit: {permissions.canEdit ? '✅' : '❌'}</div>
//                   <div>Delete: {permissions.canDelete ? '✅' : '❌'}</div>
//                   <div>Clear: {permissions.canClear ? '✅' : '❌'}</div>
//                 </div>
                
//                 <div className="mt-2 font-bold">Connection Logs:</div>
//                 <div className="text-xs max-h-32 overflow-y-auto">
//                   {connectionLogs.slice().reverse().map((log, index) => (
//                     <div key={index} className="border-b border-gray-700 py-1">
//                       <span className="text-gray-400">[{log.timestamp}]</span> {log.message}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Actions Sidebar */}
//         <div className="w-64 bg-gray-800 border-l border-gray-700 p-4">
//           <div className="space-y-4">
//             <div>
//               <h3 className="text-sm font-semibold text-gray-300 mb-2">History</h3>
//               <div className="flex space-x-2">
//                 <button
//                   onClick={handleUndo}
//                   disabled={historyIndex <= 0 || !permissions.canEdit}
//                   className={`flex-1 p-2 rounded-lg flex items-center justify-center space-x-1 ${
//                     historyIndex <= 0 || !permissions.canEdit
//                       ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
//                       : 'bg-gray-700 hover:bg-gray-600 text-white'
//                   }`}
//                 >
//                   <FaUndo />
//                   <span>Undo</span>
//                 </button>
//                 <button
//                   onClick={handleRedo}
//                   disabled={historyIndex >= history.length - 1 || !permissions.canEdit}
//                   className={`flex-1 p-2 rounded-lg flex items-center justify-center space-x-1 ${
//                     historyIndex >= history.length - 1 || !permissions.canEdit
//                       ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
//                       : 'bg-gray-700 hover:bg-gray-600 text-white'
//                   }`}
//                 >
//                   <FaRedo />
//                   <span>Redo</span>
//                 </button>
//               </div>
//             </div>

//             <div>
//               <h3 className="text-sm font-semibold text-gray-300 mb-2">Actions</h3>
//               <div className="space-y-2">
//                 <button
//                   onClick={handleClear}
//                   disabled={!permissions.canClear}
//                   className={`w-full p-2 rounded-lg flex items-center justify-center space-x-2 ${
//                     permissions.canClear
//                       ? 'bg-red-600 hover:bg-red-700 text-white'
//                       : 'bg-gray-700 text-gray-500 cursor-not-allowed'
//                   }`}
//                 >
//                   <FiTrash2 />
//                   <span>Clear Canvas</span>
//                 </button>
//                 <button
//                   onClick={exportAsImage}
//                   className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white flex items-center justify-center space-x-2"
//                 >
//                   <FiDownload />
//                   <span>Export as PNG</span>
//                 </button>
//                 <button
//                   onClick={exportAsJSON}
//                   className="w-full p-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white flex items-center justify-center space-x-2"
//                 >
//                   <FiSave />
//                   <span>Export as JSON</span>
//                 </button>
//                 <button
//                   onClick={importFromJSON}
//                   disabled={!permissions.canEdit}
//                   className={`w-full p-2 rounded-lg flex items-center justify-center space-x-2 ${
//                     permissions.canEdit
//                       ? 'bg-green-600 hover:bg-green-700 text-white'
//                       : 'bg-gray-700 text-gray-500 cursor-not-allowed'
//                   }`}
//                 >
//                   <FiUpload />
//                   <span>Import JSON</span>
//                 </button>
//               </div>
//             </div>

//             <div>
//               <h3 className="text-sm font-semibold text-gray-300 mb-2">Active Users</h3>
//               <div className="space-y-2 max-h-40 overflow-y-auto">
//                 <div className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
//                   <div className="w-2 h-2 bg-green-500 rounded-full"></div>
//                   <span className="text-sm text-white">You ({user?.name || 'Anonymous'})</span>
//                   <span className="text-xs bg-blue-900 px-2 py-1 rounded ml-auto">
//                     {isStreamer ? 'Streamer' : 'Viewer'}
//                   </span>
//                 </div>
//                 {activeUsers.map((activeUser, index) => (
//                   <div key={index} className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
//                     <div className="w-2 h-2 bg-green-500 rounded-full"></div>
//                     <span className="text-sm text-gray-300">{activeUser.userName}</span>
//                     <span className="text-xs bg-gray-800 px-2 py-1 rounded ml-auto">
//                       {activeUser.isStreamer ? 'Streamer' : activeUser.userRole}
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             <div>
//               <h3 className="text-sm font-semibold text-gray-300 mb-2">Connection</h3>
//               <div className="space-y-2">
//                 <button
//                   onClick={() => {
//                     console.log('=== WHITEBOARD STATUS ===');
//                     console.log('1. Session ID:', sessionId);
//                     console.log('2. Room Code:', roomCode);
//                     console.log('3. User:', user);
//                     console.log('4. Permissions:', permissions);
//                     console.log('5. Yjs doc:', ydocRef.current);
//                     console.log('6. Provider:', providerRef.current);
//                     console.log('7. Canvas:', fabricCanvasRef.current);
                    
//                     if (providerRef.current && providerRef.current.ws) {
//                       console.log('8. WebSocket readyState:', providerRef.current.ws.readyState);
//                     }
//                   }}
//                   className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm"
//                 >
//                   Check Status
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default WhiteboardComponent;













// import React, { useRef, useEffect, useState, useCallback } from 'react';
// import * as fabric from 'fabric';
// import * as Y from 'yjs';
// import { useAuth } from '../../../contexts/AuthContext';
// import { 
//   FiSquare, FiCircle, FiType, FiPenTool, FiEdit3, FiMousePointer, FiTrash2, 
//   FiDownload, FiUpload, FiSave, FiZoomIn, FiZoomOut, FiMaximize2,
//   FiMinimize2, FiImage, FiStar, FiHexagon, FiTriangle, FiMinus, FiArrowRight,
//   FiX, FiUsers, FiMessageSquare, FiRefreshCw, FiLock, FiUnlock
// } from 'react-icons/fi';
// import { FaRedo, FaUndo } from "react-icons/fa";
// import { BsBrush, BsEraser } from 'react-icons/bs';
// import { LuStickyNote } from 'react-icons/lu';

// const WhiteboardComponent = ({ 
//   sessionId, 
//   roomCode, 
//   wsToken, 
//   sessionInfo,
//   isActive, 
//   onClose, 
//   isStreamer = false,
//   allowViewersToDraw = true
// }) => {
//   console.log('🎨 WhiteboardComponent RENDERING:', { 
//     isActive, 
//     sessionId, 
//     roomCode,
//     isStreamer,
//     wsToken: !!wsToken,
//     sessionInfo,
//     allowViewersToDraw
//   });

//   const { user } = useAuth();
//   const canvasRef = useRef(null);
//   const fabricCanvasRef = useRef(null);
//   const containerRef = useRef(null);
  
//   const [tool, setTool] = useState('select');
//   const [brushWidth, setBrushWidth] = useState(5);
//   const [brushColor, setBrushColor] = useState('#000000');
//   const [fillColor, setFillColor] = useState('#ffffff');
//   const [opacity, setOpacity] = useState(1);
//   const [fontSize, setFontSize] = useState(20);
//   const [fontFamily, setFontFamily] = useState('Arial');
//   const [zoom, setZoom] = useState(1);
//   const [history, setHistory] = useState([]);
//   const [historyIndex, setHistoryIndex] = useState(-1);
//   const [showGrid, setShowGrid] = useState(false);
//   const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
//   const [connectionStatus, setConnectionStatus] = useState('disconnected');
//   const [stickyNoteColor, setStickyNoteColor] = useState('#ffff88');
//   const [showDebug, setShowDebug] = useState(false);
//   const [connectionAttempt, setConnectionAttempt] = useState(0);
//   const [connectionLogs, setConnectionLogs] = useState([]);
//   const [activeUsers, setActiveUsers] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [permissions, setPermissions] = useState({
//     canDraw: isStreamer,
//     canEdit: isStreamer,
//     canDelete: isStreamer,
//     canClear: isStreamer,
//     canChat: true,
//     canExport: true,
//     canImport: isStreamer
//   });
  
//   const [ws, setWs] = useState(null);
//   const [cursorPositions, setCursorPositions] = useState({});
//   const [userTools, setUserTools] = useState({});
  
//   const tools = [
//     { id: 'select', name: 'Select', icon: <FiMousePointer /> },
//     { id: 'draw', name: 'Draw', icon: <FiPenTool /> },
//     { id: 'line', name: 'Line', icon: <FiMinus /> },
//     { id: 'arrow', name: 'Arrow', icon: <FiArrowRight /> },
//     { id: 'rectangle', name: 'Rectangle', icon: <FiSquare /> },
//     { id: 'circle', name: 'Circle', icon: <FiCircle /> },
//     { id: 'triangle', name: 'Triangle', icon: <FiTriangle /> },
//     { id: 'star', name: 'Star', icon: <FiStar /> },
//     { id: 'hexagon', name: 'Hexagon', icon: <FiHexagon /> },
//     { id: 'text', name: 'Text', icon: <FiType /> },
//     { id: 'sticky', name: 'Sticky Note', icon: <LuStickyNote /> },
//     { id: 'image', name: 'Image', icon: <FiImage /> },
//     { id: 'eraser', name: 'Eraser', icon: <BsEraser /> },
//   ];

//   const colors = [
//     '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
//     '#FFA500', '#800080', '#008000', '#800000', '#008080', '#000080', '#808080'
//   ];

//   const brushSizes = [1, 2, 3, 5, 8, 10, 15, 20, 30];

//   // ✅ Add connection log
//   const addConnectionLog = (message) => {
//     console.log('📝 Connection Log:', message);
//     setConnectionLogs(prev => [...prev.slice(-10), {
//       timestamp: new Date().toLocaleTimeString(),
//       message
//     }]);
//   };

//   // ✅ Get WebSocket URL
//   const getWebSocketUrl = () => {
//     const baseUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:9090';
//     console.log('🔌 WebSocket Configuration:');
//     console.log('  - REACT_APP_WS_URL:', process.env.REACT_APP_WS_URL);
//     console.log('  - Using Base URL:', baseUrl);
//     console.log('  - wsToken:', wsToken ? `✅ Present` : '❌ MISSING');
//     console.log('  - sessionId:', sessionId);
//     console.log('  - roomCode:', roomCode);
//     console.log('  - isStreamer:', isStreamer);
//     console.log('  - allowViewersToDraw:', allowViewersToDraw);
    
  
    
//     const url = `${baseUrl}/yjs?token=${encodeURIComponent(wsToken)}&sessionId=${encodeURIComponent(sessionId)}&roomCode=${encodeURIComponent(roomCode)}&isStreamer=${isStreamer}&allowViewersToDraw=${allowViewersToDraw}`;
//     console.log('🔌 WebSocket URL:', url);
//     return url;
//   };

//   // ✅ Initialize Yjs
//   const initYjs = useCallback(() => {
//     if (!wsToken || !sessionId || !roomCode) {
//       console.error('❌ Missing required data for Yjs');
//       return;
//     }

//     const ydoc = new Y.Doc();
//     const yCanvasArray = ydoc.getArray('whiteboard');

//     // Initialize with empty canvas if not exists
//     if (yCanvasArray.length === 0) {
//       yCanvasArray.insert(0, [{
//         version: '5.3.0',
//         objects: [],
//         background: '#ffffff',
//         sessionId: sessionId,
//         allowViewersToDraw: allowViewersToDraw,
//         createdAt: new Date().toISOString()
//       }]);
//     }

//     return { ydoc, yCanvasArray };
//   }, [wsToken, sessionId, roomCode, allowViewersToDraw]);

//   // ✅ Connect to WebSocket
//   const connectWebSocket = useCallback(() => {
//     console.log('🔗 Connecting to WebSocket...');
//     addConnectionLog('Connecting to WebSocket...');
    
//     setConnectionAttempt(prev => prev + 1);
//     setConnectionStatus('connecting');
    
//     const wsUrl = getWebSocketUrl();
//     if (!wsUrl) return null;
    
//     const websocket = new WebSocket(wsUrl);
    
//     websocket.onopen = () => {
//       console.log('✅ WebSocket connected');
//       addConnectionLog('WebSocket connected');
//       setConnectionStatus('connected');
      
//       // Initialize Yjs after connection
//       const yjs = initYjs();
//       if (yjs) {
//         // Send welcome message to get permissions
//         websocket.send(JSON.stringify({
//           type: 'check-permissions'
//         }));
//       }
//     };
    
//     websocket.onmessage = (event) => {
//       handleWebSocketMessage(event);
//     };
    
//     websocket.onerror = (error) => {
//       console.error('❌ WebSocket error:', error);
//       addConnectionLog(`WebSocket error: ${error.message}`);
//       setConnectionStatus('error');
//     };
    
//     websocket.onclose = () => {
//       console.log('🔌 WebSocket closed');
//       addConnectionLog('WebSocket closed');
//       setConnectionStatus('disconnected');
      
//       // Auto-reconnect after 3 seconds
//       setTimeout(() => {
//         console.log('🔄 Attempting to reconnect...');
//         addConnectionLog('Attempting reconnect');
//         connectWebSocket();
//       }, 3000);
//     };
    
//     return websocket;
//   }, [sessionId, roomCode, wsToken, isStreamer, allowViewersToDraw, initYjs]);

//   // ✅ Handle WebSocket Messages
//   const handleWebSocketMessage = useCallback((event) => {
//     try {
//       // Handle binary data (Yjs updates)
//       if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
//         const reader = new FileReader();
//         reader.onload = () => {
//           const buffer = new Uint8Array(reader.result);
//           applyYjsUpdate(buffer);
//         };
//         reader.readAsArrayBuffer(event.data);
//         return;
//       }
      
//       // Handle JSON messages
//       const message = JSON.parse(event.data);
      
//       switch (message.type) {
//         case 'welcome':
//           console.log('👋 Welcome:', message);
//           addConnectionLog(`Welcome to: ${message.sessionTitle}`);
//           setIsLoading(false);
          
//           // Update permissions from server
//           if (message.permissions) {
//             setPermissions(message.permissions);
//             console.log('🔐 Updated permissions:', message.permissions);
//           }
//           break;
          
//         case 'permissions-info':
//           console.log('🔐 Permissions info:', message);
//           setPermissions(message.permissions);
//           break;
          
//         case 'user-joined':
//           console.log(`👤 ${message.userName} joined`);
//           addConnectionLog(`${message.userName} joined`);
//           updateActiveUsers('add', message);
//           break;
          
//         case 'user-left':
//           console.log(`👤 ${message.userName} left`);
//           addConnectionLog(`${message.userName} left`);
//           updateActiveUsers('remove', message);
//           break;
          
//         case 'active-users':
//           console.log('👥 Active users:', message.users);
//           setActiveUsers(message.users || []);
//           break;
          
//         case 'error':
//           console.error('❌ Server error:', message);
//           addConnectionLog(`Error: ${message.message}`);
//           break;
          
//         case 'canvas-cleared':
//           console.log(`🧹 Canvas cleared by ${message.clearedBy}`);
//           addConnectionLog(`Canvas cleared by ${message.clearedBy}`);
//           break;
          
//         case 'user-tool-change':
//           console.log(`🛠️ ${message.userName} selected tool: ${message.tool}`);
//           setUserTools(prev => ({
//             ...prev,
//             [message.userId]: message.tool
//           }));
//           break;
          
//         case 'cursor-move':
//           // Store cursor position for other users
//           setCursorPositions(prev => ({
//             ...prev,
//             [message.userId]: {
//               ...message.position,
//               userName: message.userName
//             }
//           }));
//           break;
          
//         default:
//           console.log('📨 Unknown message type:', message.type);
//       }
//     } catch (error) {
//       console.error('❌ Error parsing message:', error);
//     }
//   }, []);

//   // ✅ Apply Yjs update to canvas
//   const applyYjsUpdate = useCallback((update) => {
//     if (!fabricCanvasRef.current) return;
    
//     try {
//       // This would normally use Y.applyUpdate, but for simplicity
//       // we'll handle it through our WebSocket messages
//       console.log('🔄 Received Yjs update:', update.length, 'bytes');
      
//       // In a real implementation, you would:
//       // 1. Apply the Yjs update to the shared document
//       // 2. Get the updated canvas state
//       // 3. Load it into fabric
      
//     } catch (error) {
//       console.error('❌ Error applying Yjs update:', error);
//     }
//   }, []);

//   // ✅ Update active users list
//   const updateActiveUsers = useCallback((action, userData) => {
//     setActiveUsers(prev => {
//       if (action === 'add') {
//         return [...prev.filter(u => u.userId !== userData.userId), {
//           userId: userData.userId,
//           userName: userData.userName,
//           userRole: userData.userRole,
//           isStreamer: userData.isStreamer,
//           permissions: userData.permissions || {}
//         }];
//       } else {
//         return prev.filter(u => u.userId !== userData.userId);
//       }
//     });
//   }, []);

//   // ✅ Sync Canvas to Server
//   const syncCanvasToServer = useCallback(() => {
//     if (!fabricCanvasRef.current || !ws || ws.readyState !== WebSocket.OPEN) {
//       console.log('❌ Cannot sync: No connection');
//       return;
//     }
    
//     try {
//       console.log('📤 Syncing canvas to server...');
      
//       const canvas = fabricCanvasRef.current;
//       const canvasState = canvas.toJSON();
      
//       // Add metadata
//       canvasState.sessionId = sessionId;
//       canvasState.allowViewersToDraw = allowViewersToDraw;
//       canvasState.lastUpdated = new Date().toISOString();
//       canvasState.updatedBy = user?.id || 'anonymous';
      
//       // Send canvas update
//       ws.send(JSON.stringify({
//         type: 'canvas-update',
//         data: canvasState
//       }));
      
//       console.log('✅ Canvas synced to server');
//       addConnectionLog('Canvas synced');
      
//     } catch (error) {
//       console.error('❌ Error syncing canvas:', error);
//       addConnectionLog(`Sync error: ${error.message}`);
//     }
//   }, [ws, sessionId, allowViewersToDraw, user]);

//   // ✅ Send cursor position
//   const sendCursorPosition = useCallback((position) => {
//     if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
//     ws.send(JSON.stringify({
//       type: 'cursor-move',
//       position: position
//     }));
//   }, [ws]);

//   // ✅ Send tool change
//   const sendToolChange = useCallback((toolName) => {
//     if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
//     ws.send(JSON.stringify({
//       type: 'tool-change',
//       tool: toolName
//     }));
//   }, [ws]);

//   // ✅ Initialize Canvas
//   const initCanvas = useCallback(() => {
//     console.log('🎨 initCanvas called!');
//     addConnectionLog('Initializing canvas...');
    
//     if (!containerRef.current) {
//       console.log('❌ Container not ready, retrying...');
//       addConnectionLog('Container not ready, retrying...');
//       setTimeout(() => initCanvas(), 500);
//       return;
//     }
    
//     console.log('✅ Container ready');
//     addConnectionLog('Container ready');
    
//     // Clean up existing canvas
//     if (fabricCanvasRef.current) {
//       console.log('🧹 Cleaning up existing canvas');
//       fabricCanvasRef.current.dispose();
//       fabricCanvasRef.current = null;
//     }
    
//     // Create new canvas
//     const canvas = new fabric.Canvas(canvasRef.current, {
//       width: containerRef.current.clientWidth,
//       height: containerRef.current.clientHeight,
//       backgroundColor: '#ffffff',
//       selection: true,
//       preserveObjectStacking: true,
//     });
    
//     fabricCanvasRef.current = canvas;
//     console.log('✅ Fabric canvas created');
//     addConnectionLog('Fabric canvas created');
    
//     // Setup drawing based on permissions
//     canvas.isDrawingMode = false;
//     if (permissions.canDraw) {
//       canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
//       canvas.freeDrawingBrush.width = brushWidth;
//       canvas.freeDrawingBrush.color = brushColor;
//     }
    
//     // Event Listeners
//     canvas.on('mouse:move', (e) => {
//       if (!e.absolutePointer) return;
      
//       const pos = {
//         x: Math.round(e.absolutePointer.x),
//         y: Math.round(e.absolutePointer.y)
//       };
      
//       setCursorPosition(pos);
//       sendCursorPosition(pos);
//     });
    
//     canvas.on('object:added', (e) => {
//       if (e.target) {
//         console.log('➕ Object added:', e.target.type);
        
//         // Generate ID if not exists
//         if (!e.target.id) {
//           e.target.id = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//         }
        
//         // Save state
//         saveState();
        
//         // Sync to server if we have permission
//         if (permissions.canDraw) {
//           setTimeout(() => {
//             syncCanvasToServer();
//           }, 100);
//         }
//       }
//     });
    
//     canvas.on('object:modified', (e) => {
//       if (e.target) {
//         console.log('✏️ Object modified');
        
//         setTimeout(() => {
//           saveState();
//           if (permissions.canEdit) {
//             syncCanvasToServer();
//           }
//         }, 100);
//       }
//     });
    
//     canvas.on('object:removed', (e) => {
//       if (e.target) {
//         console.log('➖ Object removed');
        
//         setTimeout(() => {
//           saveState();
//           if (permissions.canDelete) {
//             syncCanvasToServer();
//           }
//         }, 100);
//       }
//     });
    
//     // Handle drawing events
//     canvas.on('path:created', (e) => {
//       console.log('🖊️ Path created');
//       setTimeout(() => {
//         saveState();
//         if (permissions.canDraw) {
//           syncCanvasToServer();
//         }
//       }, 100);
//     });
    
//     // Window resize handler
//     const handleResize = () => {
//       if (containerRef.current && canvas) {
//         canvas.setDimensions({
//           width: containerRef.current.clientWidth,
//           height: containerRef.current.clientHeight
//         });
//         canvas.renderAll();
//       }
//     };
    
//     window.addEventListener('resize', handleResize);
    
//     // Initial save
//     saveState();
    
//     console.log('✅ Canvas initialization complete');
//     addConnectionLog('Canvas initialization complete');
    
//     return () => {
//       window.removeEventListener('resize', handleResize);
//     };
//   }, [permissions, brushWidth, brushColor, syncCanvasToServer, sendCursorPosition]);

//   // ✅ Save State for Undo/Redo
//   const saveState = () => {
//     if (!fabricCanvasRef.current) return;
    
//     const state = fabricCanvasRef.current.toJSON();
//     const newHistory = [...history.slice(0, historyIndex + 1), state];
    
//     setHistory(newHistory);
//     setHistoryIndex(newHistory.length - 1);
//   };

//   // ✅ Undo
//   const handleUndo = () => {
//     if (historyIndex > 0 && permissions.canEdit) {
//       const newIndex = historyIndex - 1;
//       setHistoryIndex(newIndex);
      
//       fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
//         fabricCanvasRef.current.renderAll();
//         syncCanvasToServer();
//       });
//     }
//   };

//   // ✅ Redo
//   const handleRedo = () => {
//     if (historyIndex < history.length - 1 && permissions.canEdit) {
//       const newIndex = historyIndex + 1;
//       setHistoryIndex(newIndex);
      
//       fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
//         fabricCanvasRef.current.renderAll();
//         syncCanvasToServer();
//       });
//     }
//   };

//   // ✅ Tool Handlers with Permission Check
//   const handleToolSelect = (selectedTool) => {
//     console.log(`🛠️ Tool selected: ${selectedTool}`);
    
//     // Check permissions
//     if ((selectedTool === 'draw' || selectedTool === 'eraser') && !permissions.canDraw) {
//       console.log('🚫 No permission to draw');
//       addConnectionLog('No permission to draw');
//       return;
//     }
    
//     setTool(selectedTool);
//     sendToolChange(selectedTool);
    
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;
    
//     switch (selectedTool) {
//       case 'select':
//         canvas.isDrawingMode = false;
//         canvas.selection = true;
//         break;
//       case 'draw':
//         if (permissions.canDraw) {
//           canvas.isDrawingMode = true;
//           canvas.freeDrawingBrush.width = brushWidth;
//           canvas.freeDrawingBrush.color = brushColor;
//         }
//         break;
//       case 'rectangle':
//         if (permissions.canDraw) addRectangle();
//         break;
//       case 'circle':
//         if (permissions.canDraw) addCircle();
//         break;
//       case 'triangle':
//         if (permissions.canDraw) addTriangle();
//         break;
//       case 'text':
//         if (permissions.canDraw) addText();
//         break;
//       case 'sticky':
//         if (permissions.canDraw) addStickyNote();
//         break;
//       case 'image':
//         if (permissions.canDraw) uploadImage();
//         break;
//       case 'eraser':
//         if (permissions.canDelete) activateEraser();
//         break;
//       case 'line':
//         if (permissions.canDraw) startDrawingLine();
//         break;
//       case 'arrow':
//         if (permissions.canDraw) startDrawingArrow();
//         break;
//       case 'star':
//         if (permissions.canDraw) addStar();
//         break;
//       case 'hexagon':
//         if (permissions.canDraw) addHexagon();
//         break;
//     }
//   };

//   // Drawing Functions
//   const addRectangle = () => {
//     const rect = new fabric.Rect({
//       left: 100, top: 100, width: 100, height: 100,
//       fill: fillColor, stroke: brushColor, strokeWidth: brushWidth,
//       opacity: opacity, selectable: true
//     });
//     fabricCanvasRef.current.add(rect);
//     fabricCanvasRef.current.setActiveObject(rect);
//     setTool('select');
//   };

//   const addCircle = () => {
//     const circle = new fabric.Circle({
//       left: 100, top: 100, radius: 50,
//       fill: fillColor, stroke: brushColor, strokeWidth: brushWidth,
//       opacity: opacity, selectable: true
//     });
//     fabricCanvasRef.current.add(circle);
//     fabricCanvasRef.current.setActiveObject(circle);
//     setTool('select');
//   };

//   const addTriangle = () => {
//     const triangle = new fabric.Triangle({
//       left: 100, top: 100, width: 100, height: 100,
//       fill: fillColor, stroke: brushColor, strokeWidth: brushWidth,
//       opacity: opacity, selectable: true
//     });
//     fabricCanvasRef.current.add(triangle);
//     fabricCanvasRef.current.setActiveObject(triangle);
//     setTool('select');
//   };

//   const addStar = () => {
//     const star = new fabric.Path('M 100 10 L 123 80 L 200 80 L 138 120 L 160 190 L 100 145 L 40 190 L 62 120 L 0 80 L 77 80 Z', {
//       left: 100, top: 100,
//       fill: fillColor, stroke: brushColor, strokeWidth: brushWidth,
//       opacity: opacity, selectable: true
//     });
//     fabricCanvasRef.current.add(star);
//     fabricCanvasRef.current.setActiveObject(star);
//     setTool('select');
//   };

//   const addHexagon = () => {
//     const hexagon = new fabric.Polygon([
//       { x: 50, y: 0 }, { x: 100, y: 25 }, { x: 100, y: 75 },
//       { x: 50, y: 100 }, { x: 0, y: 75 }, { x: 0, y: 25 }
//     ], {
//       left: 100, top: 100,
//       fill: fillColor, stroke: brushColor, strokeWidth: brushWidth,
//       opacity: opacity, selectable: true
//     });
//     fabricCanvasRef.current.add(hexagon);
//     fabricCanvasRef.current.setActiveObject(hexagon);
//     setTool('select');
//   };

//   const addText = () => {
//     const text = new fabric.IText('Double click to edit', {
//       left: 100, top: 100,
//       fontSize: fontSize, fontFamily: fontFamily,
//       fill: brushColor, selectable: true
//     });
//     fabricCanvasRef.current.add(text);
//     fabricCanvasRef.current.setActiveObject(text);
//     setTool('select');
//   };

//   const addStickyNote = () => {
//     const stickyNote = new fabric.Rect({
//       left: 100, top: 100, width: 200, height: 150,
//       fill: stickyNoteColor, stroke: '#d4d4d4', strokeWidth: 1,
//       opacity: 0.9, shadow: 'rgba(0,0,0,0.2) 2px 2px 5px',
//       selectable: true
//     });
    
//     const text = new fabric.IText('Double click to edit note', {
//       left: 110, top: 110,
//       fontSize: 16, fontFamily: 'Arial',
//       fill: '#000000', selectable: true
//     });
    
//     const group = new fabric.Group([stickyNote, text], {
//       selectable: true
//     });
    
//     fabricCanvasRef.current.add(group);
//     fabricCanvasRef.current.setActiveObject(group);
//     setTool('select');
//   };

//   const startDrawingLine = () => {
//     const canvas = fabricCanvasRef.current;
//     let isDrawing = false;
//     let line = null;
    
//     const mouseDown = (options) => {
//       isDrawing = true;
//       const pointer = canvas.getPointer(options.e);
//       line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
//         stroke: brushColor, strokeWidth: brushWidth, selectable: true
//       });
//       canvas.add(line);
//     };
    
//     const mouseMove = (options) => {
//       if (!isDrawing || !line) return;
//       const pointer = canvas.getPointer(options.e);
//       line.set({ x2: pointer.x, y2: pointer.y });
//       canvas.renderAll();
//     };
    
//     const mouseUp = () => {
//       isDrawing = false;
//       canvas.off('mouse:down', mouseDown);
//       canvas.off('mouse:move', mouseMove);
//       canvas.off('mouse:up', mouseUp);
//       setTool('select');
//     };
    
//     canvas.on('mouse:down', mouseDown);
//     canvas.on('mouse:move', mouseMove);
//     canvas.on('mouse:up', mouseUp);
//   };

//   const startDrawingArrow = () => {
//     const canvas = fabricCanvasRef.current;
//     let isDrawing = false;
//     let line = null;
//     let arrowHead = null;
    
//     const mouseDown = (options) => {
//       isDrawing = true;
//       const pointer = canvas.getPointer(options.e);
//       line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
//         stroke: brushColor, strokeWidth: brushWidth, selectable: true
//       });
//       arrowHead = new fabric.Triangle({
//         width: 15, height: 15, fill: brushColor,
//         left: pointer.x, top: pointer.y, angle: 0,
//         selectable: false
//       });
//       canvas.add(line);
//       canvas.add(arrowHead);
//     };
    
//     const mouseMove = (options) => {
//       if (!isDrawing || !line || !arrowHead) return;
//       const pointer = canvas.getPointer(options.e);
//       line.set({ x2: pointer.x, y2: pointer.y });
      
//       const dx = pointer.x - line.x1;
//       const dy = pointer.y - line.y1;
//       const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      
//       arrowHead.set({
//         left: pointer.x, top: pointer.y, angle: angle
//       });
      
//       canvas.renderAll();
//     };
    
//     const mouseUp = () => {
//       isDrawing = false;
//       if (line && arrowHead) {
//         const group = new fabric.Group([line, arrowHead], {
//           selectable: true
//         });
//         canvas.remove(line);
//         canvas.remove(arrowHead);
//         canvas.add(group);
//       }
//       canvas.off('mouse:down', mouseDown);
//       canvas.off('mouse:move', mouseMove);
//       canvas.off('mouse:up', mouseUp);
//       setTool('select');
//     };
    
//     canvas.on('mouse:down', mouseDown);
//     canvas.on('mouse:move', mouseMove);
//     canvas.on('mouse:up', mouseUp);
//   };

//   const uploadImage = () => {
//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = 'image/*';
    
//     input.onchange = (e) => {
//       const file = e.target.files[0];
//       if (!file) return;
      
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         fabric.Image.fromURL(event.target.result, (img) => {
//           img.set({
//             left: 100, top: 100,
//             scaleX: 0.5, scaleY: 0.5,
//             selectable: true
//           });
//           fabricCanvasRef.current.add(img);
//           fabricCanvasRef.current.setActiveObject(img);
//           setTool('select');
//         });
//       };
//       reader.readAsDataURL(file);
//     };
    
//     input.click();
//   };

//   const activateEraser = () => {
//     const canvas = fabricCanvasRef.current;
//     canvas.isDrawingMode = false;
//     canvas.selection = false;
    
//     const mouseDown = (options) => {
//       const pointer = canvas.getPointer(options.e);
//       const objects = canvas.getObjects();
      
//       objects.forEach(obj => {
//         if (obj.containsPoint(pointer)) {
//           canvas.remove(obj);
//         }
//       });
      
//       canvas.renderAll();
//     };
    
//     canvas.on('mouse:down', mouseDown);
    
//     setTimeout(() => {
//       canvas.off('mouse:down', mouseDown);
//       setTool('select');
//     }, 5000);
//   };

//   // Export Functions
//   const exportAsImage = () => {
//     if (!fabricCanvasRef.current) return;
    
//     const dataURL = fabricCanvasRef.current.toDataURL({
//       format: 'png', quality: 1, multiplier: 2
//     });
    
//     const link = document.createElement('a');
//     link.href = dataURL;
//     link.download = `whiteboard-${sessionInfo?.title || 'session'}-${new Date().toISOString().slice(0, 10)}.png`;
//     link.click();
//   };

//   const exportAsJSON = () => {
//     if (!fabricCanvasRef.current) return;
    
//     const json = fabricCanvasRef.current.toJSON();
//     const dataStr = JSON.stringify(json);
//     const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
//     const link = document.createElement('a');
//     link.href = dataUri;
//     link.download = `whiteboard-${sessionInfo?.title || 'session'}-${new Date().toISOString().slice(0, 10)}.json`;
//     link.click();
//   };

//   const importFromJSON = () => {
//     if (!permissions.canEdit) {
//       console.log('🚫 No permission to import');
//       return;
//     }
    
//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = '.json';
    
//     input.onchange = (e) => {
//       const file = e.target.files[0];
//       if (!file) return;
      
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         try {
//           const json = JSON.parse(event.target.result);
//           fabricCanvasRef.current.loadFromJSON(json, () => {
//             fabricCanvasRef.current.renderAll();
//             saveState();
//             syncCanvasToServer();
//           });
//         } catch (error) {
//           console.error('Error loading JSON:', error);
//         }
//       };
//       reader.readAsText(file);
//     };
    
//     input.click();
//   };

//   // Clear Canvas with Permission Check
//   const handleClear = () => {
//     if (!permissions.canClear) {
//       console.log('🚫 No permission to clear canvas');
//       return;
//     }
    
//     if (window.confirm('Are you sure you want to clear the whiteboard? Other users will also see this change.')) {
//       if (ws && ws.readyState === WebSocket.OPEN) {
//         ws.send(JSON.stringify({
//           type: 'clear-canvas'
//         }));
//       }
      
//       fabricCanvasRef.current.clear();
//       fabricCanvasRef.current.backgroundColor = '#ffffff';
//       saveState();
//     }
//   };

//   // Zoom Functions
//   const handleZoomIn = () => {
//     const newZoom = Math.min(zoom * 1.2, 5);
//     setZoom(newZoom);
    
//     if (fabricCanvasRef.current) {
//       fabricCanvasRef.current.setZoom(newZoom);
//       fabricCanvasRef.current.renderAll();
//     }
//   };

//   const handleZoomOut = () => {
//     const newZoom = Math.max(zoom / 1.2, 0.2);
//     setZoom(newZoom);
    
//     if (fabricCanvasRef.current) {
//       fabricCanvasRef.current.setZoom(newZoom);
//       fabricCanvasRef.current.renderAll();
//     }
//   };

//   const handleZoomReset = () => {
//     setZoom(1);
    
//     if (fabricCanvasRef.current) {
//       fabricCanvasRef.current.setZoom(1);
//       fabricCanvasRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
//       fabricCanvasRef.current.renderAll();
//     }
//   };

//   // Force Reconnect
//   const forceReconnect = () => {
//     console.log('🔁 Forcing reconnection...');
//     addConnectionLog('Force reconnection initiated');
    
//     if (ws) {
//       ws.close();
//     }
    
//     const newWs = connectWebSocket();
//     setWs(newWs);
//   };

//   // Check Permissions
//   const checkPermissions = () => {
//     if (ws && ws.readyState === WebSocket.OPEN) {
//       ws.send(JSON.stringify({
//         type: 'check-permissions'
//       }));
//     }
//   };

//   // ✅ Main Effect - Component Mount/Unmount
//   useEffect(() => {
//     console.log('🎯 WhiteboardComponent useEffect - isActive:', isActive);
    
//     if (isActive) {
//       console.log('🚀 Whiteboard ACTIVE - Starting initialization...');
//       addConnectionLog('Whiteboard activated');
      
//       // Initialize WebSocket connection
//       const websocket = connectWebSocket();
//       setWs(websocket);
      
//       // Small delay to ensure DOM is ready
//       const timeoutId = setTimeout(() => {
//         console.log('🎨 Calling initCanvas...');
//         initCanvas();
//       }, 500);
      
//       return () => {
//         console.log('🧹 Cleaning up whiteboard timeout');
//         clearTimeout(timeoutId);
//       };
//     } else {
//       console.log('⏸️ Whiteboard INACTIVE');
//       addConnectionLog('Whiteboard deactivated');
//     }
//   }, [isActive, initCanvas, connectWebSocket]);

//   // ✅ Cleanup Effect
//   useEffect(() => {
//     return () => {
//       console.log('🧹 WhiteboardComponent UNMOUNTING - Cleanup');
//       addConnectionLog('Component unmounting');
      
//       // Clean up WebSocket
//       if (ws) {
//         console.log('Closing WebSocket...');
//         ws.close();
//       }
      
//       // Clean up fabric canvas
//       if (fabricCanvasRef.current) {
//         console.log('Disposing fabric canvas...');
//         fabricCanvasRef.current.dispose();
//         fabricCanvasRef.current = null;
//       }
//     };
//   }, [ws]);

//   // Render remote cursors
//   useEffect(() => {
//     if (!fabricCanvasRef.current || Object.keys(cursorPositions).length === 0) return;
    
//     const canvas = fabricCanvasRef.current;
//     const ctx = canvas.getContext();
    
//     // Clear previous cursor drawings
//     canvas.renderAll();
    
//     // Draw remote cursors
//     Object.entries(cursorPositions).forEach(([userId, data]) => {
//       const { x, y, userName } = data;
      
//       // Draw cursor
//       ctx.save();
//       ctx.strokeStyle = '#FF0000';
//       ctx.lineWidth = 2;
//       ctx.beginPath();
//       ctx.moveTo(x - 10, y);
//       ctx.lineTo(x + 10, y);
//       ctx.moveTo(x, y - 10);
//       ctx.lineTo(x, y + 10);
//       ctx.stroke();
      
//       // Draw username
//       ctx.fillStyle = '#FF0000';
//       ctx.font = '12px Arial';
//       ctx.fillText(userName, x + 15, y + 5);
//       ctx.restore();
//     });
//   }, [cursorPositions]);

//   if (!isActive) {
//     console.log('⏸️ Whiteboard not active, returning null');
//     return null;
//   }

//   if (isLoading) {
//     return (
//       <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
//         <div className="text-white text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
//           <div>Connecting to whiteboard...</div>
//           <div className="text-sm text-gray-400 mt-2">
//             Session: {sessionId} | Room: {roomCode}
//           </div>
//           <div className="text-xs text-gray-500 mt-1">
//             {connectionStatus === 'connecting' ? 'Establishing connection...' : 
//              connectionStatus === 'connected' ? 'Loading canvas...' : 
//              'Waiting for connection...'}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   console.log('🎨 Whiteboard RENDERING UI');
  
//   return (
//     <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
//       {/* Header */}
//       <div className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
//         <div className="flex items-center space-x-4">
//           <h2 className="text-xl font-bold text-white flex items-center">
//             <FiEdit3 className="mr-2" />
//             {sessionInfo?.title || 'Collaborative Whiteboard'}
//           </h2>
          
//           <div className="flex items-center space-x-2">
//             <div className={`w-3 h-3 rounded-full ${
//               connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
//               connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
//             }`} />
//             <span className="text-sm text-gray-300">
//               {connectionStatus === 'connected' ? 'Connected' : 
//                connectionStatus === 'connecting' ? 'Connecting...' : 
//                'Disconnected'}
//             </span>
            
//             <span className="text-xs bg-gray-700 px-2 py-1 rounded">
//               {isStreamer ? '🎤 Streamer' : '👀 Viewer'}
//             </span>
            
//             {!permissions.canDraw && (
//               <span className="text-xs bg-yellow-800 px-2 py-1 rounded flex items-center">
//                 <FiLock className="mr-1" size={10} /> View Only
//               </span>
//             )}
//           </div>
//         </div>
        
//         <div className="flex items-center space-x-2">
//           {/* Active Users */}
//           <div className="flex items-center space-x-1 text-sm text-gray-300">
//             <FiUsers />
//             <span>{activeUsers.length + 1} online</span>
//           </div>
          
//           {/* Debug Buttons */}
//           {showDebug && (
//             <button
//               onClick={forceReconnect}
//               className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white text-sm"
//             >
//               🔁 Reconnect
//             </button>
//           )}
          
//           <button
//             onClick={() => setShowDebug(!showDebug)}
//             className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm"
//           >
//             {showDebug ? 'Hide Debug' : 'Debug'}
//           </button>
          
//           <button
//             onClick={checkPermissions}
//             className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm"
//             title="Check Permissions"
//           >
//             <FiRefreshCw />
//           </button>
          
//           <button
//             onClick={handleZoomReset}
//             className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
//             title="Reset Zoom"
//           >
//             <FiMaximize2 />
//           </button>
          
//           <button
//             onClick={onClose}
//             className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
//             title="Close Whiteboard"
//           >
//             <FiX />
//           </button>
//         </div>
//       </div>

//       {/* Main Area */}
//       <div className="flex-1 flex overflow-hidden">
//         {/* Tools Sidebar */}
//         <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 space-y-4">
//           {tools.map((toolItem) => (
//             <button
//               key={toolItem.id}
//               onClick={() => handleToolSelect(toolItem.id)}
//               className={`p-3 rounded-xl transition-all duration-200 ${
//                 tool === toolItem.id 
//                   ? 'bg-blue-600 text-white shadow-lg' 
//                   : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
//               } ${
//                 ((toolItem.id === 'draw' || toolItem.id === 'eraser') && !permissions.canDraw) ||
//                 (toolItem.id === 'eraser' && !permissions.canDelete) ||
//                 (['rectangle', 'circle', 'triangle', 'text', 'sticky', 'image', 'line', 'arrow', 'star', 'hexagon'].includes(toolItem.id) && !permissions.canDraw)
//                   ? 'opacity-50 cursor-not-allowed'
//                   : ''
//               }`}
//               title={toolItem.name}
//               disabled={
//                 ((toolItem.id === 'draw' || toolItem.id === 'eraser') && !permissions.canDraw) ||
//                 (toolItem.id === 'eraser' && !permissions.canDelete) ||
//                 (['rectangle', 'circle', 'triangle', 'text', 'sticky', 'image', 'line', 'arrow', 'star', 'hexagon'].includes(toolItem.id) && !permissions.canDraw)
//               }
//             >
//               {toolItem.icon}
//             </button>
//           ))}
//         </div>

//         {/* Properties Sidebar */}
//         <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
//           <div className="space-y-6">
//             <div>
//               <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
//                 <BsBrush className="mr-2" />
//                 Brush Properties
//                 {!permissions.canDraw && (
//                   <FiLock className="ml-auto" size={12} />
//                 )}
//               </h3>
              
//               <div className="space-y-3">
//                 <div>
//                   <label className="text-xs text-gray-400">Width</label>
//                   <div className="flex flex-wrap gap-1 mt-1">
//                     {brushSizes.map((size) => (
//                       <button
//                         key={size}
//                         onClick={() => setBrushWidth(size)}
//                         className={`w-8 h-8 rounded-full flex items-center justify-center ${
//                           brushWidth === size 
//                             ? 'bg-blue-600 text-white' 
//                             : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
//                         } ${!permissions.canDraw ? 'opacity-50 cursor-not-allowed' : ''}`}
//                         disabled={!permissions.canDraw}
//                       >
//                         {size}
//                       </button>
//                     ))}
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-xs text-gray-400">Stroke Color</label>
//                   <div className="grid grid-cols-7 gap-1 mt-1">
//                     {colors.map((color) => (
//                       <button
//                         key={color}
//                         onClick={() => setBrushColor(color)}
//                         className={`w-6 h-6 rounded-full border-2 ${
//                           brushColor === color ? 'border-white' : 'border-gray-700'
//                         } ${!permissions.canDraw ? 'opacity-50' : ''}`}
//                         style={{ backgroundColor: color }}
//                         disabled={!permissions.canDraw}
//                       />
//                     ))}
//                   </div>
//                   <input
//                     type="color"
//                     value={brushColor}
//                     onChange={(e) => setBrushColor(e.target.value)}
//                     className={`w-full mt-2 bg-gray-700 border border-gray-600 rounded ${!permissions.canDraw ? 'opacity-50 cursor-not-allowed' : ''}`}
//                     disabled={!permissions.canDraw}
//                   />
//                 </div>

//                 <div>
//                   <label className="text-xs text-gray-400">Fill Color</label>
//                   <div className="grid grid-cols-7 gap-1 mt-1">
//                     {colors.map((color) => (
//                       <button
//                         key={color}
//                         onClick={() => setFillColor(color)}
//                         className={`w-6 h-6 rounded-full border-2 ${
//                           fillColor === color ? 'border-white' : 'border-gray-700'
//                         } ${!permissions.canDraw ? 'opacity-50' : ''}`}
//                         style={{ backgroundColor: color }}
//                         disabled={!permissions.canDraw}
//                       />
//                     ))}
//                   </div>
//                   <input
//                     type="color"
//                     value={fillColor}
//                     onChange={(e) => setFillColor(e.target.value)}
//                     className={`w-full mt-2 bg-gray-700 border border-gray-600 rounded ${!permissions.canDraw ? 'opacity-50 cursor-not-allowed' : ''}`}
//                     disabled={!permissions.canDraw}
//                   />
//                 </div>

//                 <div>
//                   <label className="text-xs text-gray-400">
//                     Opacity: {Math.round(opacity * 100)}%
//                   </label>
//                   <input
//                     type="range"
//                     min="0.1"
//                     max="1"
//                     step="0.1"
//                     value={opacity}
//                     onChange={(e) => setOpacity(parseFloat(e.target.value))}
//                     className={`w-full mt-1 ${!permissions.canDraw ? 'opacity-50 cursor-not-allowed' : ''}`}
//                     disabled={!permissions.canDraw}
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* Session Info */}
//             {sessionInfo && (
//               <div className="pt-4 border-t border-gray-700">
//                 <h3 className="text-sm font-semibold text-gray-300 mb-2">Session Info</h3>
//                 <div className="text-xs text-gray-400 space-y-1">
//                   <div>Title: {sessionInfo.title}</div>
//                   <div>Room: {sessionInfo.roomCode}</div>
//                   {sessionInfo.streamerName && (
//                     <div>Host: {sessionInfo.streamerName}</div>
//                   )}
//                   <div>Participants: {activeUsers.length + 1}</div>
//                   <div>Allow Viewers to Draw: {allowViewersToDraw ? 'Yes' : 'No'}</div>
//                   <div className="pt-2">
//                     <div className="text-gray-300">Your Permissions:</div>
//                     <div className="flex flex-wrap gap-1 mt-1">
//                       {permissions.canDraw && (
//                         <span className="bg-green-900 px-2 py-1 rounded text-xs">Draw</span>
//                       )}
//                       {permissions.canEdit && (
//                         <span className="bg-blue-900 px-2 py-1 rounded text-xs">Edit</span>
//                       )}
//                       {permissions.canDelete && (
//                         <span className="bg-red-900 px-2 py-1 rounded text-xs">Delete</span>
//                       )}
//                       {permissions.canClear && (
//                         <span className="bg-purple-900 px-2 py-1 rounded text-xs">Clear</span>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Canvas Area */}
//         <div className="flex-1 relative overflow-hidden" ref={containerRef}>
//           <canvas ref={canvasRef} className="absolute inset-0" />
          
//           {/* View Only Overlay */}
//           {!permissions.canDraw && connectionStatus === 'connected' && (
//             <div className="absolute top-4 right-4 bg-yellow-800/80 text-white text-xs px-3 py-2 rounded-lg">
//               👀 View Only Mode
//             </div>
//           )}
          
//           {/* Status Bar */}
//           <div className="absolute bottom-4 left-4 bg-black/70 text-white text-sm px-3 py-2 rounded-lg">
//             X: {cursorPosition.x}, Y: {cursorPosition.y} | Zoom: {Math.round(zoom * 100)}% | Tool: {tool}
//           </div>

//           {/* Zoom Controls */}
//           <div className="absolute bottom-4 right-4 flex space-x-2">
//             <button
//               onClick={handleZoomOut}
//               className="bg-black/70 text-white p-2 rounded-lg hover:bg-black/80"
//               title="Zoom Out"
//             >
//               <FiZoomOut />
//             </button>
//             <button
//               onClick={handleZoomIn}
//               className="bg-black/70 text-white p-2 rounded-lg hover:bg-black/80"
//               title="Zoom In"
//             >
//               <FiZoomIn />
//             </button>
//           </div>

//           {/* Debug Info Panel */}
//           {showDebug && (
//             <div className="absolute top-4 left-4 bg-black/80 text-white text-xs p-3 rounded-lg max-w-md max-h-64 overflow-y-auto">
//               <div className="font-bold mb-2">Debug Info:</div>
//               <div className="space-y-1">
//                 <div>Status: <span className={connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>{connectionStatus}</span></div>
//                 <div>Connection Attempts: {connectionAttempt}</div>
//                 <div>Session ID: {sessionId}</div>
//                 <div>Room Code: {roomCode}</div>
//                 <div>User: {user?.name || 'Anonymous'}</div>
//                 <div>Role: {isStreamer ? 'Streamer' : 'Viewer'}</div>
//                 <div>Canvas: {fabricCanvasRef.current ? 'Loaded' : 'Not loaded'}</div>
//                 <div>WS: {ws && ws.readyState === WebSocket.OPEN ? 'Connected' : 'Disconnected'}</div>
                
//                 <div className="mt-2 font-bold">Permissions:</div>
//                 <div className="grid grid-cols-2 gap-1">
//                   <div>Draw: {permissions.canDraw ? '✅' : '❌'}</div>
//                   <div>Edit: {permissions.canEdit ? '✅' : '❌'}</div>
//                   <div>Delete: {permissions.canDelete ? '✅' : '❌'}</div>
//                   <div>Clear: {permissions.canClear ? '✅' : '❌'}</div>
//                 </div>
                
//                 <div className="mt-2 font-bold">Active Users ({activeUsers.length}):</div>
//                 <div className="text-xs max-h-20 overflow-y-auto">
//                   {activeUsers.map((user, index) => (
//                     <div key={index} className="py-1 border-b border-gray-700">
//                       {user.userName} ({user.userRole}) {user.isStreamer && '🎤'}
//                     </div>
//                   ))}
//                 </div>
                
//                 <div className="mt-2 font-bold">Connection Logs:</div>
//                 <div className="text-xs max-h-32 overflow-y-auto">
//                   {connectionLogs.slice().reverse().map((log, index) => (
//                     <div key={index} className="border-b border-gray-700 py-1">
//                       <span className="text-gray-400">[{log.timestamp}]</span> {log.message}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Actions Sidebar */}
//         <div className="w-64 bg-gray-800 border-l border-gray-700 p-4">
//           <div className="space-y-4">
//             <div>
//               <h3 className="text-sm font-semibold text-gray-300 mb-2">History</h3>
//               <div className="flex space-x-2">
//                 <button
//                   onClick={handleUndo}
//                   disabled={historyIndex <= 0 || !permissions.canEdit}
//                   className={`flex-1 p-2 rounded-lg flex items-center justify-center space-x-1 ${
//                     historyIndex <= 0 || !permissions.canEdit
//                       ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
//                       : 'bg-gray-700 hover:bg-gray-600 text-white'
//                   }`}
//                 >
//                   <FaUndo />
//                   <span>Undo</span>
//                 </button>
//                 <button
//                   onClick={handleRedo}
//                   disabled={historyIndex >= history.length - 1 || !permissions.canEdit}
//                   className={`flex-1 p-2 rounded-lg flex items-center justify-center space-x-1 ${
//                     historyIndex >= history.length - 1 || !permissions.canEdit
//                       ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
//                       : 'bg-gray-700 hover:bg-gray-600 text-white'
//                   }`}
//                 >
//                   <FaRedo />
//                   <span>Redo</span>
//                 </button>
//               </div>
//             </div>

//             <div>
//               <h3 className="text-sm font-semibold text-gray-300 mb-2">Actions</h3>
//               <div className="space-y-2">
//                 <button
//                   onClick={handleClear}
//                   disabled={!permissions.canClear}
//                   className={`w-full p-2 rounded-lg flex items-center justify-center space-x-2 ${
//                     permissions.canClear
//                       ? 'bg-red-600 hover:bg-red-700 text-white'
//                       : 'bg-gray-700 text-gray-500 cursor-not-allowed'
//                   }`}
//                 >
//                   <FiTrash2 />
//                   <span>Clear Canvas</span>
//                 </button>
//                 <button
//                   onClick={exportAsImage}
//                   className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white flex items-center justify-center space-x-2"
//                 >
//                   <FiDownload />
//                   <span>Export as PNG</span>
//                 </button>
//                 <button
//                   onClick={exportAsJSON}
//                   className="w-full p-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white flex items-center justify-center space-x-2"
//                 >
//                   <FiSave />
//                   <span>Export as JSON</span>
//                 </button>
//                 <button
//                   onClick={importFromJSON}
//                   disabled={!permissions.canEdit}
//                   className={`w-full p-2 rounded-lg flex items-center justify-center space-x-2 ${
//                     permissions.canEdit
//                       ? 'bg-green-600 hover:bg-green-700 text-white'
//                       : 'bg-gray-700 text-gray-500 cursor-not-allowed'
//                   }`}
//                 >
//                   <FiUpload />
//                   <span>Import JSON</span>
//                 </button>
//               </div>
//             </div>

//             <div>
//               <h3 className="text-sm font-semibold text-gray-300 mb-2">Active Users</h3>
//               <div className="space-y-2 max-h-40 overflow-y-auto">
//                 <div className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
//                   <div className="w-2 h-2 bg-green-500 rounded-full"></div>
//                   <span className="text-sm text-white">You ({user?.name || 'Anonymous'})</span>
//                   <span className="text-xs bg-blue-900 px-2 py-1 rounded ml-auto">
//                     {isStreamer ? 'Streamer' : 'Viewer'}
//                   </span>
//                 </div>
//                 {activeUsers.map((activeUser, index) => (
//                   <div key={index} className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
//                     <div className="w-2 h-2 bg-green-500 rounded-full"></div>
//                     <span className="text-sm text-gray-300">{activeUser.userName}</span>
//                     <span className="text-xs bg-gray-800 px-2 py-1 rounded ml-auto">
//                       {activeUser.isStreamer ? 'Streamer' : activeUser.userRole}
//                     </span>
//                     {userTools[activeUser.userId] && (
//                       <span className="text-xs bg-purple-900 px-2 py-1 rounded">
//                         {userTools[activeUser.userId]}
//                       </span>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default WhiteboardComponent;












import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import * as Y from 'yjs';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  FiSquare, FiCircle, FiType, FiPenTool, FiEdit3, FiMousePointer, FiTrash2, 
  FiDownload, FiUpload, FiSave, FiZoomIn, FiZoomOut, FiMaximize2,
  FiMinimize2, FiImage, FiStar, FiHexagon, FiTriangle, FiMinus, FiArrowRight,
  FiX, FiUsers, FiMessageSquare, FiRefreshCw, FiLock, FiUnlock
} from 'react-icons/fi';
import { FaRedo, FaUndo } from "react-icons/fa";
import { BsBrush, BsEraser } from 'react-icons/bs';
import { LuStickyNote } from 'react-icons/lu';

console.log('===================================================');
console.log('🎨 WHITEBOARD COMPONENT STARTING');
console.log('===================================================');

const WhiteboardComponent = ({ 
  sessionId, 
  roomCode, 
  wsToken, 
  sessionInfo,
  isActive, 
  onClose, 
  isStreamer = false,
  allowViewersToDraw = true
}) => {
  console.log('🚀 WhiteboardComponent FUNCTION CALLED');
  console.log('📋 PROPS RECEIVED:');
  console.log('  1. sessionId:', sessionId);
  console.log('  2. roomCode:', roomCode);
  console.log('  3. wsToken:', wsToken);
  console.log('  4. sessionInfo:', sessionInfo);
  console.log('  5. isActive:', isActive);
  console.log('  6. isStreamer:', isStreamer);
  console.log('  7. allowViewersToDraw:', allowViewersToDraw);
  console.log('===================================================');

  const { user } = useAuth();
  console.log('🔐 Auth Context - User:', user);
  
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const containerRef = useRef(null);
  
  console.log('🔄 State declarations starting...');
  
  const [tool, setTool] = useState('select');
  console.log('🔧 State: tool =', tool);
  
  const [brushWidth, setBrushWidth] = useState(5);
  console.log('🎨 State: brushWidth =', brushWidth);
  
  const [brushColor, setBrushColor] = useState('#000000');
  console.log('🎨 State: brushColor =', brushColor);
  
  const [fillColor, setFillColor] = useState('#ffffff');
  console.log('🎨 State: fillColor =', fillColor);
  
  const [opacity, setOpacity] = useState(1);
  console.log('🎨 State: opacity =', opacity);
  
  const [fontSize, setFontSize] = useState(20);
  console.log('🔤 State: fontSize =', fontSize);
  
  const [fontFamily, setFontFamily] = useState('Arial');
  console.log('🔤 State: fontFamily =', fontFamily);
  
  const [zoom, setZoom] = useState(1);
  console.log('🔍 State: zoom =', zoom);
  
  const [history, setHistory] = useState([]);
  console.log('📜 State: history length =', history.length);
  
  const [historyIndex, setHistoryIndex] = useState(-1);
  console.log('📜 State: historyIndex =', historyIndex);
  
  const [showGrid, setShowGrid] = useState(false);
  console.log('🔲 State: showGrid =', showGrid);
  
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  console.log('🖱️ State: cursorPosition =', cursorPosition);
  
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  console.log('📡 State: connectionStatus =', connectionStatus);
  
  const [stickyNoteColor, setStickyNoteColor] = useState('#ffff88');
  console.log('📝 State: stickyNoteColor =', stickyNoteColor);
  
  const [showDebug, setShowDebug] = useState(false);
  console.log('🐛 State: showDebug =', showDebug);
  
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  console.log('🔁 State: connectionAttempt =', connectionAttempt);
  
  const [connectionLogs, setConnectionLogs] = useState([]);
  console.log('📝 State: connectionLogs length =', connectionLogs.length);
  
  const [activeUsers, setActiveUsers] = useState([]);
  console.log('👥 State: activeUsers length =', activeUsers.length);
  
  const [isLoading, setIsLoading] = useState(true);
  console.log('⏳ State: isLoading =', isLoading);
  
  const [permissions, setPermissions] = useState({
    canDraw: isStreamer,
    canEdit: isStreamer,
    canDelete: isStreamer,
    canClear: isStreamer,
    canChat: true,
    canExport: true,
    canImport: isStreamer
  });
  console.log('🔐 State: permissions =', permissions);
  
  const [ws, setWs] = useState(null);
  console.log('🔌 State: ws =', ws ? 'WebSocket exists' : 'null');
  
  const [cursorPositions, setCursorPositions] = useState({});
  console.log('📍 State: cursorPositions keys =', Object.keys(cursorPositions));
  
  const [userTools, setUserTools] = useState({});
  console.log('🛠️ State: userTools =', userTools);
  
  console.log('✅ All states declared');
  console.log('===================================================');
  
  const tools = [
    { id: 'select', name: 'Select', icon: <FiMousePointer /> },
    { id: 'draw', name: 'Draw', icon: <FiPenTool /> },
    { id: 'line', name: 'Line', icon: <FiMinus /> },
    { id: 'arrow', name: 'Arrow', icon: <FiArrowRight /> },
    { id: 'rectangle', name: 'Rectangle', icon: <FiSquare /> },
    { id: 'circle', name: 'Circle', icon: <FiCircle /> },
    { id: 'triangle', name: 'Triangle', icon: <FiTriangle /> },
    { id: 'star', name: 'Star', icon: <FiStar /> },
    { id: 'hexagon', name: 'Hexagon', icon: <FiHexagon /> },
    { id: 'text', name: 'Text', icon: <FiType /> },
    { id: 'sticky', name: 'Sticky Note', icon: <LuStickyNote /> },
    { id: 'image', name: 'Image', icon: <FiImage /> },
    { id: 'eraser', name: 'Eraser', icon: <BsEraser /> },
  ];

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#FFA500', '#800080', '#008000', '#800000', '#008080', '#000080', '#808080'
  ];

  const brushSizes = [1, 2, 3, 5, 8, 10, 15, 20, 30];

  // ✅ Add connection log
  const addConnectionLog = (message) => {
    console.log('📝 addConnectionLog called:', message);
    const timestamp = new Date().toLocaleTimeString();
    console.log(`📝 ${timestamp}: ${message}`);
    setConnectionLogs(prev => [...prev.slice(-10), {
      timestamp: timestamp,
      message
    }]);
  };

  // ✅ Get WebSocket URL
  const getWebSocketUrl = () => {
    console.log('🔗 getWebSocketUrl function called');
    console.log('🔍 Checking WebSocket parameters:');
    console.log('  - wsToken exists:', !!wsToken);
    console.log('  - wsToken value:', wsToken);
    console.log('  - sessionId:', sessionId);
    console.log('  - roomCode:', roomCode);
    console.log('  - isStreamer:', isStreamer);
    console.log('  - allowViewersToDraw:', allowViewersToDraw);
    
    const baseUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:9090';
    console.log('🌐 Base URL:', baseUrl);
    console.log('🌐 REACT_APP_WS_URL env:', process.env.REACT_APP_WS_URL);
    
    if (!wsToken) {
      console.error('❌ CRITICAL ERROR: wsToken is null or undefined');
      return null;
    }
    
    if (!sessionId) {
      console.error('❌ CRITICAL ERROR: sessionId is null or undefined');
      return null;
    }
    
    if (!roomCode) {
      console.error('❌ CRITICAL ERROR: roomCode is null or undefined');
      return null;
    }
    
    const url = `${baseUrl}/yjs?token=${encodeURIComponent(wsToken)}&sessionId=${encodeURIComponent(sessionId)}&roomCode=${encodeURIComponent(roomCode)}&isStreamer=${isStreamer}&allowViewersToDraw=${allowViewersToDraw}`;
    
    console.log('🔗 Constructed WebSocket URL:', url);
    console.log('🔗 URL Parameters:');
    console.log('  - token:', wsToken.substring(0, 20) + '...');
    console.log('  - sessionId:', sessionId);
    console.log('  - roomCode:', roomCode);
    
    return url;
  };

  // ✅ Initialize Yjs
  const initYjs = useCallback(() => {
    console.log('🔄 initYjs callback called');
    console.log('📋 Yjs parameters:');
    console.log('  - wsToken:', wsToken);
    console.log('  - sessionId:', sessionId);
    console.log('  - roomCode:', roomCode);
    console.log('  - allowViewersToDraw:', allowViewersToDraw);

    if (!wsToken) {
      console.error('❌ Yjs init failed: wsToken missing');
      addConnectionLog('Yjs: Missing wsToken');
      return null;
    }

    if (!sessionId) {
      console.error('❌ Yjs init failed: sessionId missing');
      addConnectionLog('Yjs: Missing sessionId');
      return null;
    }

    if (!roomCode) {
      console.error('❌ Yjs init failed: roomCode missing');
      addConnectionLog('Yjs: Missing roomCode');
      return null;
    }

    try {
      console.log('📄 Creating Y.Doc...');
      const ydoc = new Y.Doc();
      const yCanvasArray = ydoc.getArray('whiteboard');
      console.log('✅ Y.Doc created');

      // Initialize with empty canvas if not exists
      if (yCanvasArray.length === 0) {
        console.log('📝 Initializing empty canvas array');
        yCanvasArray.insert(0, [{
          version: '5.3.0',
          objects: [],
          background: '#ffffff',
          sessionId: sessionId,
          allowViewersToDraw: allowViewersToDraw,
          createdAt: new Date().toISOString()
        }]);
        console.log('✅ Canvas array initialized');
      }

      console.log('✅ Yjs initialized successfully');
      addConnectionLog('Yjs initialized');
      
      return { ydoc, yCanvasArray };
    } catch (error) {
      console.error('❌ Yjs initialization error:', error);
      addConnectionLog(`Yjs error: ${error.message}`);
      return null;
    }
  }, [wsToken, sessionId, roomCode, allowViewersToDraw]);

  // ✅ Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    console.log('🔗 connectWebSocket callback called');
    console.log(`🔁 Connection attempt #${connectionAttempt + 1}`);
    
    addConnectionLog(`Connection attempt #${connectionAttempt + 1}`);
    setConnectionAttempt(prev => prev + 1);
    setConnectionStatus('connecting');
    
    const wsUrl = getWebSocketUrl();
    console.log('🌐 WebSocket URL:', wsUrl);
    
    if (!wsUrl) {
      console.error('❌ Cannot connect: WebSocket URL is null');
      addConnectionLog('Failed: WebSocket URL is null');
      setConnectionStatus('error');
      return null;
    }
    
    console.log('🔌 Creating WebSocket connection...');
    const websocket = new WebSocket(wsUrl);
    console.log('✅ WebSocket object created');
    
    websocket.onopen = () => {
      console.log('✅ WebSocket onopen triggered - CONNECTED');
      console.log('📡 WebSocket readyState:', websocket.readyState);
      addConnectionLog('WebSocket connected successfully');
      setConnectionStatus('connected');
      
      // Initialize Yjs after connection
      console.log('🔄 Initializing Yjs after connection...');
      const yjs = initYjs();
      console.log('✅ Yjs init result:', yjs ? 'Success' : 'Failed');
      
      // Send welcome message to get permissions
      console.log('📤 Sending check-permissions message...');
      websocket.send(JSON.stringify({
        type: 'check-permissions'
      }));
      console.log('✅ check-permissions sent');
    };
    
    websocket.onmessage = (event) => {
      console.log('📨 WebSocket onmessage triggered');
      console.log('📩 Message type:', typeof event.data);
      console.log('📩 Message data:', event.data);
      handleWebSocketMessage(event);
    };
    
    websocket.onerror = (error) => {
      console.error('❌ WebSocket onerror triggered:', error);
      console.error('❌ Error event:', error);
      addConnectionLog(`WebSocket error: ${error.message}`);
      setConnectionStatus('error');
    };
    
    websocket.onclose = () => {
      console.log('🔌 WebSocket onclose triggered - DISCONNECTED');
      console.log('📡 WebSocket readyState:', websocket.readyState);
      addConnectionLog('WebSocket connection closed');
      setConnectionStatus('disconnected');
      
      // Auto-reconnect after 3 seconds
      console.log('⏰ Scheduling auto-reconnect in 3 seconds...');
      setTimeout(() => {
        console.log('🔄 Attempting auto-reconnect...');
        addConnectionLog('Auto-reconnect attempt');
        connectWebSocket();
      }, 3000);
    };
    
    console.log('✅ WebSocket connection process started');
    return websocket;
  }, [connectionAttempt, initYjs]);

  // ✅ Handle WebSocket Messages
  const handleWebSocketMessage = useCallback((event) => {
    console.log('📨 handleWebSocketMessage called');
    console.log('📩 Raw message:', event.data);
    
    try {
      // Handle binary data (Yjs updates)
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        console.log('🔢 Received binary data');
        const reader = new FileReader();
        reader.onload = () => {
          const buffer = new Uint8Array(reader.result);
          console.log('📦 Binary data size:', buffer.length, 'bytes');
          applyYjsUpdate(buffer);
        };
        reader.readAsArrayBuffer(event.data);
        return;
      }
      
      // Handle JSON messages
      console.log('📝 Parsing JSON message...');
      const message = JSON.parse(event.data);
      console.log('✅ JSON parsed successfully:', message.type);
      
      switch (message.type) {
        case 'welcome':
          console.log('👋 Welcome message received:', message);
          console.log('🏷️ Session title:', message.sessionTitle);
          console.log('🔐 Permissions:', message.permissions);
          addConnectionLog(`Welcome to: ${message.sessionTitle}`);
          setIsLoading(false);
          
          // Update permissions from server
          if (message.permissions) {
            console.log('🔄 Updating permissions from server');
            setPermissions(message.permissions);
            console.log('✅ New permissions:', message.permissions);
          }
          break;
          
        case 'permissions-info':
          console.log('🔐 Permissions info received:', message);
          console.log('🔐 Permissions data:', message.permissions);
          setPermissions(message.permissions);
          break;
          
        case 'user-joined':
          console.log(`👤 User joined: ${message.userName} (${message.userId})`);
          console.log('👤 User data:', message);
          addConnectionLog(`${message.userName} joined`);
          updateActiveUsers('add', message);
          break;
          
        case 'user-left':
          console.log(`👤 User left: ${message.userName} (${message.userId})`);
          console.log('👤 User data:', message);
          addConnectionLog(`${message.userName} left`);
          updateActiveUsers('remove', message);
          break;
          
        case 'active-users':
          console.log('👥 Active users list received');
          console.log('👥 Users count:', message.users?.length || 0);
          console.log('👥 Users:', message.users);
          setActiveUsers(message.users || []);
          break;
          
        case 'error':
          console.error('❌ Server error message:', message);
          console.error('❌ Error details:', message.message);
          addConnectionLog(`Error: ${message.message}`);
          break;
          
        case 'canvas-cleared':
          console.log(`🧹 Canvas cleared by ${message.clearedBy}`);
          addConnectionLog(`Canvas cleared by ${message.clearedBy}`);
          break;
          
        case 'user-tool-change':
          console.log(`🛠️ User tool change: ${message.userName} selected ${message.tool}`);
          setUserTools(prev => ({
            ...prev,
            [message.userId]: message.tool
          }));
          break;
          
        case 'cursor-move':
          console.log(`📍 Cursor move from ${message.userName}`);
          console.log('📍 Position:', message.position);
          // Store cursor position for other users
          setCursorPositions(prev => ({
            ...prev,
            [message.userId]: {
              ...message.position,
              userName: message.userName
            }
          }));
          break;
          
        default:
          console.log('❓ Unknown message type:', message.type);
          console.log('📦 Full message:', message);
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Raw data that failed:', event.data);
    }
  }, []);

  // ✅ Apply Yjs update to canvas
  const applyYjsUpdate = useCallback((update) => {
    console.log('🔄 applyYjsUpdate called');
    console.log('📦 Update size:', update.length, 'bytes');
    
    if (!fabricCanvasRef.current) {
      console.error('❌ Cannot apply update: fabricCanvasRef.current is null');
      return;
    }
    
    try {
      console.log('🔄 Applying Yjs update to canvas...');
      // This would normally use Y.applyUpdate, but for simplicity
      // we'll handle it through our WebSocket messages
      console.log('✅ Yjs update processed (simulated)');
    } catch (error) {
      console.error('❌ Error applying Yjs update:', error);
    }
  }, []);

  // ✅ Update active users list
  const updateActiveUsers = useCallback((action, userData) => {
    console.log(`👥 updateActiveUsers called: ${action}`);
    console.log('👤 User data:', userData);
    
    setActiveUsers(prev => {
      console.log('👥 Previous active users:', prev.length);
      
      if (action === 'add') {
        const newUsers = [...prev.filter(u => u.userId !== userData.userId), {
          userId: userData.userId,
          userName: userData.userName,
          userRole: userData.userRole,
          isStreamer: userData.isStreamer,
          permissions: userData.permissions || {}
        }];
        console.log('👥 New active users after add:', newUsers.length);
        return newUsers;
      } else {
        const newUsers = prev.filter(u => u.userId !== userData.userId);
        console.log('👥 New active users after remove:', newUsers.length);
        return newUsers;
      }
    });
  }, []);

  // ✅ Sync Canvas to Server
  const syncCanvasToServer = useCallback(() => {
    console.log('📤 syncCanvasToServer called');
    
    if (!fabricCanvasRef.current) {
      console.error('❌ Cannot sync: fabricCanvasRef.current is null');
      return;
    }
    
    if (!ws) {
      console.error('❌ Cannot sync: WebSocket is null');
      return;
    }
    
    if (ws.readyState !== WebSocket.OPEN) {
      console.error(`❌ Cannot sync: WebSocket state is ${ws.readyState}`);
      console.log('📡 WebSocket states:');
      console.log('  0: CONNECTING');
      console.log('  1: OPEN');
      console.log('  2: CLOSING');
      console.log('  3: CLOSED');
      return;
    }
    
    try {
      console.log('📤 Syncing canvas to server...');
      
      const canvas = fabricCanvasRef.current;
      const canvasState = canvas.toJSON();
      
      // Add metadata
      canvasState.sessionId = sessionId;
      canvasState.allowViewersToDraw = allowViewersToDraw;
      canvasState.lastUpdated = new Date().toISOString();
      canvasState.updatedBy = user?.id || 'anonymous';
      
      console.log('📦 Canvas state prepared:', {
        objects: canvasState.objects?.length || 0,
        sessionId: canvasState.sessionId,
        lastUpdated: canvasState.lastUpdated
      });
      
      // Send canvas update
      ws.send(JSON.stringify({
        type: 'canvas-update',
        data: canvasState
      }));
      
      console.log('✅ Canvas synced to server');
      addConnectionLog('Canvas synced');
      
    } catch (error) {
      console.error('❌ Error syncing canvas:', error);
      addConnectionLog(`Sync error: ${error.message}`);
    }
  }, [ws, sessionId, allowViewersToDraw, user]);

  // ✅ Send cursor position
  const sendCursorPosition = useCallback((position) => {
    console.log('📍 sendCursorPosition called:', position);
    
    if (!ws) {
      console.error('❌ Cannot send cursor: WebSocket is null');
      return;
    }
    
    if (ws.readyState !== WebSocket.OPEN) {
      console.error(`❌ Cannot send cursor: WebSocket state is ${ws.readyState}`);
      return;
    }
    
    console.log('📤 Sending cursor position:', position);
    ws.send(JSON.stringify({
      type: 'cursor-move',
      position: position
    }));
  }, [ws]);

  // ✅ Send tool change
  const sendToolChange = useCallback((toolName) => {
    console.log('🛠️ sendToolChange called:', toolName);
    
    if (!ws) {
      console.error('❌ Cannot send tool change: WebSocket is null');
      return;
    }
    
    if (ws.readyState !== WebSocket.OPEN) {
      console.error(`❌ Cannot send tool change: WebSocket state is ${ws.readyState}`);
      return;
    }
    
    console.log('📤 Sending tool change:', toolName);
    ws.send(JSON.stringify({
      type: 'tool-change',
      tool: toolName
    }));
  }, [ws]);

  // ✅ Initialize Canvas
  const initCanvas = useCallback(() => {
    console.log('🎨 initCanvas callback called');
    addConnectionLog('Initializing canvas...');
    
    if (!containerRef.current) {
      console.log('❌ Container not ready, retrying...');
      console.log('📦 containerRef.current:', containerRef.current);
      addConnectionLog('Container not ready, retrying...');
      setTimeout(() => {
        console.log('🔄 Retrying initCanvas...');
        initCanvas();
      }, 500);
      return;
    }
    
    console.log('✅ Container ready');
    console.log('📦 Container dimensions:', {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight
    });
    addConnectionLog('Container ready');
    
    // Clean up existing canvas
    if (fabricCanvasRef.current) {
      console.log('🧹 Cleaning up existing canvas');
      fabricCanvasRef.current.dispose();
      fabricCanvasRef.current = null;
      console.log('✅ Old canvas disposed');
    }
    
    // Create new canvas
    console.log('🆕 Creating new fabric canvas...');
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });
    
    fabricCanvasRef.current = canvas;
    console.log('✅ Fabric canvas created');
    console.log('🎨 Canvas properties:', {
      width: canvas.width,
      height: canvas.height,
      backgroundColor: canvas.backgroundColor
    });
    addConnectionLog('Fabric canvas created');
    
    // Setup drawing based on permissions
    canvas.isDrawingMode = false;
    console.log('🎨 Drawing mode initially:', canvas.isDrawingMode);
    
    if (permissions.canDraw) {
      console.log('🖊️ Setting up drawing tools (permissions.canDraw = true)');
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.width = brushWidth;
      canvas.freeDrawingBrush.color = brushColor;
      console.log('🖊️ Brush configured:', {
        width: canvas.freeDrawingBrush.width,
        color: canvas.freeDrawingBrush.color
      });
    } else {
      console.log('🚫 Drawing disabled (permissions.canDraw = false)');
    }
    
    // Event Listeners
    console.log('🎯 Setting up canvas event listeners...');
    
    canvas.on('mouse:move', (e) => {
      if (!e.absolutePointer) {
        console.log('❌ mouse:move - No absolutePointer');
        return;
      }
      
      const pos = {
        x: Math.round(e.absolutePointer.x),
        y: Math.round(e.absolutePointer.y)
      };
      
      console.log('🖱️ Mouse move:', pos);
      setCursorPosition(pos);
      sendCursorPosition(pos);
    });
    
    canvas.on('object:added', (e) => {
      if (e.target) {
        console.log('➕ Object added:', e.target.type);
        console.log('📦 Object details:', {
          id: e.target.id,
          type: e.target.type,
          left: e.target.left,
          top: e.target.top
        });
        
        // Generate ID if not exists
        if (!e.target.id) {
          e.target.id = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.log('🆔 Generated object ID:', e.target.id);
        }
        
        // Save state
        saveState();
        
        // Sync to server if we have permission
        if (permissions.canDraw) {
          console.log('📤 Scheduling canvas sync...');
          setTimeout(() => {
            syncCanvasToServer();
          }, 100);
        }
      }
    });
    
    canvas.on('object:modified', (e) => {
      if (e.target) {
        console.log('✏️ Object modified:', e.target.type);
        console.log('📦 Object ID:', e.target.id);
        
        setTimeout(() => {
          saveState();
          if (permissions.canEdit) {
            console.log('📤 Syncing modified object...');
            syncCanvasToServer();
          }
        }, 100);
      }
    });
    
    canvas.on('object:removed', (e) => {
      if (e.target) {
        console.log('➖ Object removed:', e.target.type);
        console.log('📦 Object ID:', e.target.id);
        
        setTimeout(() => {
          saveState();
          if (permissions.canDelete) {
            console.log('📤 Syncing after removal...');
            syncCanvasToServer();
          }
        }, 100);
      }
    });
    
    // Handle drawing events
    canvas.on('path:created', (e) => {
      console.log('🖊️ Path created');
      
      setTimeout(() => {
        saveState();
        if (permissions.canDraw) {
          console.log('📤 Syncing drawn path...');
          syncCanvasToServer();
        }
      }, 100);
    });
    
    // Window resize handler
    const handleResize = () => {
      console.log('🔄 Window resize detected');
      
      if (containerRef.current && canvas) {
        console.log('📏 New container dimensions:', {
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
        
        canvas.setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
        canvas.renderAll();
        console.log('✅ Canvas resized');
      }
    };
    
    window.addEventListener('resize', handleResize);
    console.log('🎯 Window resize listener added');
    
    // Initial save
    saveState();
    
    console.log('✅ Canvas initialization complete');
    addConnectionLog('Canvas initialization complete');
    
    return () => {
      console.log('🧹 Cleaning up canvas event listeners');
      window.removeEventListener('resize', handleResize);
    };
  }, [permissions, brushWidth, brushColor, syncCanvasToServer, sendCursorPosition]);

  // ✅ Save State for Undo/Redo
  const saveState = () => {
    console.log('💾 saveState called');
    
    if (!fabricCanvasRef.current) {
      console.error('❌ Cannot save state: fabricCanvasRef.current is null');
      return;
    }
    
    const state = fabricCanvasRef.current.toJSON();
    const newHistory = [...history.slice(0, historyIndex + 1), state];
    
    console.log('📜 History update:', {
      oldLength: history.length,
      newLength: newHistory.length,
      oldIndex: historyIndex,
      newIndex: newHistory.length - 1
    });
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    console.log('✅ State saved');
  };

  // ✅ Undo
  const handleUndo = () => {
    console.log('↩️ handleUndo called');
    console.log('📜 Current history:', {
      length: history.length,
      index: historyIndex
    });
    
    if (historyIndex > 0 && permissions.canEdit) {
      const newIndex = historyIndex - 1;
      console.log('📜 New history index:', newIndex);
      
      setHistoryIndex(newIndex);
      
      console.log('🔄 Loading previous state...');
      fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
        fabricCanvasRef.current.renderAll();
        console.log('✅ Undo applied');
        syncCanvasToServer();
      });
    } else {
      console.log('🚫 Cannot undo:', {
        canEdit: permissions.canEdit,
        historyIndex,
        historyLength: history.length
      });
    }
  };

  // ✅ Redo
  const handleRedo = () => {
    console.log('↪️ handleRedo called');
    console.log('📜 Current history:', {
      length: history.length,
      index: historyIndex
    });
    
    if (historyIndex < history.length - 1 && permissions.canEdit) {
      const newIndex = historyIndex + 1;
      console.log('📜 New history index:', newIndex);
      
      setHistoryIndex(newIndex);
      
      console.log('🔄 Loading next state...');
      fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
        fabricCanvasRef.current.renderAll();
        console.log('✅ Redo applied');
        syncCanvasToServer();
      });
    } else {
      console.log('🚫 Cannot redo:', {
        canEdit: permissions.canEdit,
        historyIndex,
        historyLength: history.length
      });
    }
  };

  // ✅ Tool Handlers with Permission Check
  const handleToolSelect = (selectedTool) => {
    console.log('🛠️ handleToolSelect called:', selectedTool);
    console.log('🔐 Current permissions:', permissions);
    
    // Check permissions
    if ((selectedTool === 'draw' || selectedTool === 'eraser') && !permissions.canDraw) {
      console.log('🚫 No permission to draw/erase');
      console.log('🚫 Permission check failed: permissions.canDraw =', permissions.canDraw);
      addConnectionLog('No permission to draw');
      return;
    }
    
    console.log('✅ Tool permission check passed');
    setTool(selectedTool);
    console.log('🔄 Tool state updated to:', selectedTool);
    
    sendToolChange(selectedTool);
    
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.error('❌ Canvas not available for tool change');
      return;
    }
    
    console.log('🔄 Switching to tool:', selectedTool);
    
    switch (selectedTool) {
      case 'select':
        console.log('🎯 Switching to select tool');
        canvas.isDrawingMode = false;
        canvas.selection = true;
        break;
      case 'draw':
        if (permissions.canDraw) {
          console.log('🖊️ Switching to draw tool');
          canvas.isDrawingMode = true;
          canvas.freeDrawingBrush.width = brushWidth;
          canvas.freeDrawingBrush.color = brushColor;
          console.log('🖊️ Brush settings:', {
            width: canvas.freeDrawingBrush.width,
            color: canvas.freeDrawingBrush.color
          });
        }
        break;
      case 'rectangle':
        if (permissions.canDraw) {
          console.log('⬜ Adding rectangle');
          addRectangle();
        }
        break;
      case 'circle':
        if (permissions.canDraw) {
          console.log('⭕ Adding circle');
          addCircle();
        }
        break;
      case 'triangle':
        if (permissions.canDraw) {
          console.log('🔺 Adding triangle');
          addTriangle();
        }
        break;
      case 'text':
        if (permissions.canDraw) {
          console.log('🔤 Adding text');
          addText();
        }
        break;
      case 'sticky':
        if (permissions.canDraw) {
          console.log('📝 Adding sticky note');
          addStickyNote();
        }
        break;
      case 'image':
        if (permissions.canDraw) {
          console.log('🖼️ Uploading image');
          uploadImage();
        }
        break;
      case 'eraser':
        if (permissions.canDelete) {
          console.log('🧹 Activating eraser');
          activateEraser();
        }
        break;
      case 'line':
        if (permissions.canDraw) {
          console.log('📏 Drawing line');
          startDrawingLine();
        }
        break;
      case 'arrow':
        if (permissions.canDraw) {
          console.log('➡️ Drawing arrow');
          startDrawingArrow();
        }
        break;
      case 'star':
        if (permissions.canDraw) {
          console.log('⭐ Adding star');
          addStar();
        }
        break;
      case 'hexagon':
        if (permissions.canDraw) {
          console.log('⬢ Adding hexagon');
          addHexagon();
        }
        break;
    }
  };

  // Drawing Functions
  const addRectangle = () => {
    console.log('⬜ addRectangle called');
    console.log('🎨 Drawing properties:', {
      fillColor,
      brushColor,
      brushWidth,
      opacity
    });
    
    const rect = new fabric.Rect({
      left: 100, top: 100, width: 100, height: 100,
      fill: fillColor, stroke: brushColor, strokeWidth: brushWidth,
      opacity: opacity, selectable: true
    });
    
    console.log('📦 Rectangle created:', rect);
    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.setActiveObject(rect);
    setTool('select');
    console.log('✅ Rectangle added, switching to select tool');
  };

  const addCircle = () => {
    console.log('⭕ addCircle called');
    
    const circle = new fabric.Circle({
      left: 100, top: 100, radius: 50,
      fill: fillColor, stroke: brushColor, strokeWidth: brushWidth,
      opacity: opacity, selectable: true
    });
    
    console.log('📦 Circle created:', circle);
    fabricCanvasRef.current.add(circle);
    fabricCanvasRef.current.setActiveObject(circle);
    setTool('select');
    console.log('✅ Circle added, switching to select tool');
  };

  const addTriangle = () => {
    console.log('🔺 addTriangle called');
    
    const triangle = new fabric.Triangle({
      left: 100, top: 100, width: 100, height: 100,
      fill: fillColor, stroke: brushColor, strokeWidth: brushWidth,
      opacity: opacity, selectable: true
    });
    
    console.log('📦 Triangle created:', triangle);
    fabricCanvasRef.current.add(triangle);
    fabricCanvasRef.current.setActiveObject(triangle);
    setTool('select');
    console.log('✅ Triangle added, switching to select tool');
  };

  const addStar = () => {
    console.log('⭐ addStar called');
    
    const star = new fabric.Path('M 100 10 L 123 80 L 200 80 L 138 120 L 160 190 L 100 145 L 40 190 L 62 120 L 0 80 L 77 80 Z', {
      left: 100, top: 100,
      fill: fillColor, stroke: brushColor, strokeWidth: brushWidth,
      opacity: opacity, selectable: true
    });
    
    console.log('📦 Star created:', star);
    fabricCanvasRef.current.add(star);
    fabricCanvasRef.current.setActiveObject(star);
    setTool('select');
    console.log('✅ Star added, switching to select tool');
  };

  const addHexagon = () => {
    console.log('⬢ addHexagon called');
    
    const hexagon = new fabric.Polygon([
      { x: 50, y: 0 }, { x: 100, y: 25 }, { x: 100, y: 75 },
      { x: 50, y: 100 }, { x: 0, y: 75 }, { x: 0, y: 25 }
    ], {
      left: 100, top: 100,
      fill: fillColor, stroke: brushColor, strokeWidth: brushWidth,
      opacity: opacity, selectable: true
    });
    
    console.log('📦 Hexagon created:', hexagon);
    fabricCanvasRef.current.add(hexagon);
    fabricCanvasRef.current.setActiveObject(hexagon);
    setTool('select');
    console.log('✅ Hexagon added, switching to select tool');
  };

  const addText = () => {
    console.log('🔤 addText called');
    console.log('🔤 Text properties:', {
      fontSize,
      fontFamily,
      brushColor
    });
    
    const text = new fabric.IText('Double click to edit', {
      left: 100, top: 100,
      fontSize: fontSize, fontFamily: fontFamily,
      fill: brushColor, selectable: true
    });
    
    console.log('📦 Text created:', text);
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    setTool('select');
    console.log('✅ Text added, switching to select tool');
  };

  const addStickyNote = () => {
    console.log('📝 addStickyNote called');
    console.log('🎨 Sticky note color:', stickyNoteColor);
    
    const stickyNote = new fabric.Rect({
      left: 100, top: 100, width: 200, height: 150,
      fill: stickyNoteColor, stroke: '#d4d4d4', strokeWidth: 1,
      opacity: 0.9, shadow: 'rgba(0,0,0,0.2) 2px 2px 5px',
      selectable: true
    });
    
    const text = new fabric.IText('Double click to edit note', {
      left: 110, top: 110,
      fontSize: 16, fontFamily: 'Arial',
      fill: '#000000', selectable: true
    });
    
    const group = new fabric.Group([stickyNote, text], {
      selectable: true
    });
    
    console.log('📦 Sticky note group created:', group);
    fabricCanvasRef.current.add(group);
    fabricCanvasRef.current.setActiveObject(group);
    setTool('select');
    console.log('✅ Sticky note added, switching to select tool');
  };

  const startDrawingLine = () => {
    console.log('📏 startDrawingLine called');
    
    const canvas = fabricCanvasRef.current;
    let isDrawing = false;
    let line = null;
    
    console.log('🎨 Line properties:', {
      brushColor,
      brushWidth
    });
    
    const mouseDown = (options) => {
      console.log('🖱️ Line: Mouse down');
      isDrawing = true;
      const pointer = canvas.getPointer(options.e);
      console.log('📍 Start point:', pointer);
      
      line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        stroke: brushColor, strokeWidth: brushWidth, selectable: true
      });
      canvas.add(line);
      console.log('📦 Line created and added');
    };
    
    const mouseMove = (options) => {
      if (!isDrawing || !line) return;
      
      const pointer = canvas.getPointer(options.e);
      line.set({ x2: pointer.x, y2: pointer.y });
      canvas.renderAll();
      console.log('🔄 Line updated to:', { x2: pointer.x, y2: pointer.y });
    };
    
    const mouseUp = () => {
      console.log('🖱️ Line: Mouse up');
      isDrawing = false;
      canvas.off('mouse:down', mouseDown);
      canvas.off('mouse:move', mouseMove);
      canvas.off('mouse:up', mouseUp);
      setTool('select');
      console.log('✅ Line drawing complete, switching to select tool');
    };
    
    canvas.on('mouse:down', mouseDown);
    canvas.on('mouse:move', mouseMove);
    canvas.on('mouse:up', mouseUp);
    
    console.log('🎯 Line drawing listeners attached');
  };

  const startDrawingArrow = () => {
    console.log('➡️ startDrawingArrow called');
    
    const canvas = fabricCanvasRef.current;
    let isDrawing = false;
    let line = null;
    let arrowHead = null;
    
    console.log('🎨 Arrow properties:', {
      brushColor,
      brushWidth
    });
    
    const mouseDown = (options) => {
      console.log('🖱️ Arrow: Mouse down');
      isDrawing = true;
      const pointer = canvas.getPointer(options.e);
      console.log('📍 Start point:', pointer);
      
      line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        stroke: brushColor, strokeWidth: brushWidth, selectable: true
      });
      arrowHead = new fabric.Triangle({
        width: 15, height: 15, fill: brushColor,
        left: pointer.x, top: pointer.y, angle: 0,
        selectable: false
      });
      canvas.add(line);
      canvas.add(arrowHead);
      console.log('📦 Arrow line and head created');
    };
    
    const mouseMove = (options) => {
      if (!isDrawing || !line || !arrowHead) return;
      
      const pointer = canvas.getPointer(options.e);
      line.set({ x2: pointer.x, y2: pointer.y });
      
      const dx = pointer.x - line.x1;
      const dy = pointer.y - line.y1;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      
      arrowHead.set({
        left: pointer.x, top: pointer.y, angle: angle
      });
      
      canvas.renderAll();
      console.log('🔄 Arrow updated:', { x2: pointer.x, y2: pointer.y, angle });
    };
    
    const mouseUp = () => {
      console.log('🖱️ Arrow: Mouse up');
      isDrawing = false;
      if (line && arrowHead) {
        const group = new fabric.Group([line, arrowHead], {
          selectable: true
        });
        canvas.remove(line);
        canvas.remove(arrowHead);
        canvas.add(group);
        console.log('📦 Arrow grouped');
      }
      canvas.off('mouse:down', mouseDown);
      canvas.off('mouse:move', mouseMove);
      canvas.off('mouse:up', mouseUp);
      setTool('select');
      console.log('✅ Arrow drawing complete, switching to select tool');
    };
    
    canvas.on('mouse:down', mouseDown);
    canvas.on('mouse:move', mouseMove);
    canvas.on('mouse:up', mouseUp);
    
    console.log('🎯 Arrow drawing listeners attached');
  };

  const uploadImage = () => {
    console.log('🖼️ uploadImage called');
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    console.log('📁 File input created');
    
    input.onchange = (e) => {
      console.log('📁 File selected');
      const file = e.target.files[0];
      if (!file) {
        console.log('❌ No file selected');
        return;
      }
      
      console.log('📦 File info:', {
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      const reader = new FileReader();
      reader.onload = (event) => {
        console.log('📸 File read successfully');
        fabric.Image.fromURL(event.target.result, (img) => {
          img.set({
            left: 100, top: 100,
            scaleX: 0.5, scaleY: 0.5,
            selectable: true
          });
          console.log('🖼️ Image loaded to fabric:', img);
          fabricCanvasRef.current.add(img);
          fabricCanvasRef.current.setActiveObject(img);
          setTool('select');
          console.log('✅ Image added, switching to select tool');
        });
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
    console.log('📁 File dialog opened');
  };

  const activateEraser = () => {
    console.log('🧹 activateEraser called');
    
    const canvas = fabricCanvasRef.current;
    canvas.isDrawingMode = false;
    canvas.selection = false;
    console.log('🎨 Drawing mode disabled, selection disabled');
    
    const mouseDown = (options) => {
      console.log('🖱️ Eraser: Mouse down');
      const pointer = canvas.getPointer(options.e);
      console.log('📍 Eraser position:', pointer);
      
      const objects = canvas.getObjects();
      console.log('📦 Total objects:', objects.length);
      
      let removedCount = 0;
      objects.forEach(obj => {
        if (obj.containsPoint(pointer)) {
          canvas.remove(obj);
          removedCount++;
          console.log('🗑️ Object removed:', obj.type);
        }
      });
      
      canvas.renderAll();
      console.log(`✅ Removed ${removedCount} objects`);
    };
    
    canvas.on('mouse:down', mouseDown);
    console.log('🎯 Eraser listener attached');
    
    setTimeout(() => {
      console.log('⏰ Eraser timeout reached (5 seconds)');
      canvas.off('mouse:down', mouseDown);
      setTool('select');
      console.log('✅ Eraser deactivated, switching to select tool');
    }, 5000);
  };

  // Export Functions
  const exportAsImage = () => {
    console.log('📸 exportAsImage called');
    
    if (!fabricCanvasRef.current) {
      console.error('❌ Cannot export: fabricCanvasRef.current is null');
      return;
    }
    
    console.log('📸 Generating PNG data URL...');
    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png', quality: 1, multiplier: 2
    });
    
    const fileName = `whiteboard-${sessionInfo?.title || 'session'}-${new Date().toISOString().slice(0, 10)}.png`;
    console.log('📁 File name:', fileName);
    
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = fileName;
    link.click();
    
    console.log('✅ PNG export initiated');
  };

  const exportAsJSON = () => {
    console.log('📄 exportAsJSON called');
    
    if (!fabricCanvasRef.current) {
      console.error('❌ Cannot export: fabricCanvasRef.current is null');
      return;
    }
    
    console.log('📄 Generating JSON...');
    const json = fabricCanvasRef.current.toJSON();
    const dataStr = JSON.stringify(json);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const fileName = `whiteboard-${sessionInfo?.title || 'session'}-${new Date().toISOString().slice(0, 10)}.json`;
    console.log('📁 File name:', fileName);
    
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = fileName;
    link.click();
    
    console.log('✅ JSON export initiated');
  };

  const importFromJSON = () => {
    console.log('📥 importFromJSON called');
    console.log('🔐 Permission check:', {
      canEdit: permissions.canEdit,
      canImport: permissions.canImport
    });
    
    if (!permissions.canEdit) {
      console.log('🚫 No permission to import');
      return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    console.log('📁 JSON file input created');
    
    input.onchange = (e) => {
      console.log('📁 JSON file selected');
      const file = e.target.files[0];
      if (!file) {
        console.log('❌ No file selected');
        return;
      }
      
      console.log('📦 JSON file info:', {
        name: file.name,
        size: file.size
      });
      
      const reader = new FileReader();
      reader.onload = (event) => {
        console.log('📄 JSON file read');
        try {
          const json = JSON.parse(event.target.result);
          console.log('✅ JSON parsed, loading to canvas...');
          
          fabricCanvasRef.current.loadFromJSON(json, () => {
            console.log('✅ JSON loaded to canvas');
            fabricCanvasRef.current.renderAll();
            saveState();
            syncCanvasToServer();
          });
        } catch (error) {
          console.error('❌ Error loading JSON:', error);
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
    console.log('📁 JSON file dialog opened');
  };

  // Clear Canvas with Permission Check
  const handleClear = () => {
    console.log('🗑️ handleClear called');
    console.log('🔐 Permission check:', {
      canClear: permissions.canClear
    });
    
    if (!permissions.canClear) {
      console.log('🚫 No permission to clear canvas');
      return;
    }
    
    if (window.confirm('Are you sure you want to clear the whiteboard? Other users will also see this change.')) {
      console.log('✅ User confirmed clear');
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('📤 Sending clear-canvas message to server');
        ws.send(JSON.stringify({
          type: 'clear-canvas'
        }));
      }
      
      console.log('🧹 Clearing fabric canvas...');
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = '#ffffff';
      saveState();
      console.log('✅ Canvas cleared');
    } else {
      console.log('❌ User cancelled clear');
    }
  };

  // Zoom Functions
  const handleZoomIn = () => {
    console.log('🔍 handleZoomIn called');
    const newZoom = Math.min(zoom * 1.2, 5);
    console.log('🔍 Zoom change:', { old: zoom, new: newZoom });
    setZoom(newZoom);
    
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(newZoom);
      fabricCanvasRef.current.renderAll();
      console.log('✅ Zoom applied');
    }
  };

  const handleZoomOut = () => {
    console.log('🔍 handleZoomOut called');
    const newZoom = Math.max(zoom / 1.2, 0.2);
    console.log('🔍 Zoom change:', { old: zoom, new: newZoom });
    setZoom(newZoom);
    
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(newZoom);
      fabricCanvasRef.current.renderAll();
      console.log('✅ Zoom applied');
    }
  };

  const handleZoomReset = () => {
    console.log('🔍 handleZoomReset called');
    setZoom(1);
    console.log('🔍 Zoom reset to 1');
    
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(1);
      fabricCanvasRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
      fabricCanvasRef.current.renderAll();
      console.log('✅ Zoom reset');
    }
  };

  // Force Reconnect
  const forceReconnect = () => {
    console.log('🔁 forceReconnect called');
    console.log('🔌 Current WebSocket state:', ws ? ws.readyState : 'null');
    addConnectionLog('Force reconnection initiated');
    
    if (ws) {
      console.log('🔌 Closing existing WebSocket...');
      ws.close();
    }
    
    const newWs = connectWebSocket();
    setWs(newWs);
    console.log('✅ New WebSocket connection initiated');
  };

  // Check Permissions
  const checkPermissions = () => {
    console.log('🔐 checkPermissions called');
    
    if (ws) {
      console.log('📡 WebSocket state:', ws.readyState);
    } else {
      console.log('❌ WebSocket is null');
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('📤 Sending check-permissions message...');
      ws.send(JSON.stringify({
        type: 'check-permissions'
      }));
      console.log('✅ Permissions check sent');
    }
  };

  // ✅ Main Effect - Component Mount/Unmount
  useEffect(() => {
    console.log('🎯 useEffect [isActive] triggered');
    console.log('📋 Effect dependencies:', { isActive });
    
    if (isActive) {
      console.log('🚀 Whiteboard ACTIVE - Starting initialization...');
      addConnectionLog('Whiteboard activated');
      
      // Initialize WebSocket connection
      console.log('🔌 Initializing WebSocket connection...');
      const websocket = connectWebSocket();
      setWs(websocket);
      console.log('✅ WebSocket set in state');
      
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        console.log('⏰ Timeout reached, calling initCanvas...');
        initCanvas();
      }, 500);
      
      console.log('⏰ Timeout set for canvas initialization');
      
      return () => {
        console.log('🧹 useEffect cleanup [isActive]');
        console.log('⏰ Clearing initialization timeout...');
        clearTimeout(timeoutId);
      };
    } else {
      console.log('⏸️ Whiteboard INACTIVE - Skipping initialization');
      addConnectionLog('Whiteboard deactivated');
    }
  }, [isActive, initCanvas, connectWebSocket]);

  // ✅ Cleanup Effect
  useEffect(() => {
    console.log('🎯 Component mount effect - Setting up cleanup');
    
    return () => {
      console.log('===================================================');
      console.log('🧹 WhiteboardComponent UNMOUNTING - Cleanup');
      console.log('===================================================');
      addConnectionLog('Component unmounting');
      
      // Clean up WebSocket
      if (ws) {
        console.log('🔌 Closing WebSocket...');
        console.log('📡 WebSocket readyState:', ws.readyState);
        ws.close();
        console.log('✅ WebSocket close called');
      } else {
        console.log('🔌 No WebSocket to close');
      }
      
      // Clean up fabric canvas
      if (fabricCanvasRef.current) {
        console.log('🎨 Disposing fabric canvas...');
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
        console.log('✅ Fabric canvas disposed');
      } else {
        console.log('🎨 No fabric canvas to dispose');
      }
      
      console.log('✅ Cleanup complete');
      console.log('===================================================');
    };
  }, [ws]);

  // Render remote cursors
  useEffect(() => {
    console.log('🎯 useEffect [cursorPositions] triggered');
    console.log('📍 cursorPositions:', cursorPositions);
    
    if (!fabricCanvasRef.current || Object.keys(cursorPositions).length === 0) {
      console.log('❌ Cannot render cursors:', {
        hasCanvas: !!fabricCanvasRef.current,
        cursorCount: Object.keys(cursorPositions).length
      });
      return;
    }
    
    console.log(`🎨 Rendering ${Object.keys(cursorPositions).length} remote cursors`);
    
    const canvas = fabricCanvasRef.current;
    const ctx = canvas.getContext();
    
    // Clear previous cursor drawings
    canvas.renderAll();
    
    // Draw remote cursors
    Object.entries(cursorPositions).forEach(([userId, data]) => {
      const { x, y, userName } = data;
      console.log(`📍 Drawing cursor for ${userName} at (${x}, ${y})`);
      
      // Draw cursor
      ctx.save();
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x + 10, y);
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, y + 10);
      ctx.stroke();
      
      // Draw username
      ctx.fillStyle = '#FF0000';
      ctx.font = '12px Arial';
      ctx.fillText(userName, x + 15, y + 5);
      ctx.restore();
    });
    
    console.log('✅ Remote cursors rendered');
  }, [cursorPositions]);

  console.log('🎨 Whiteboard render function executing');
  
  if (!isActive) {
    console.log('⏸️ Whiteboard not active, returning null');
    return null;
  }

  if (isLoading) {
    console.log('⏳ Rendering loading state');
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div>Connecting to whiteboard...</div>
          <div className="text-sm text-gray-400 mt-2">
            Session: {sessionId} | Room: {roomCode}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {connectionStatus === 'connecting' ? 'Establishing connection...' : 
             connectionStatus === 'connected' ? 'Loading canvas...' : 
             'Waiting for connection...'}
          </div>
        </div>
      </div>
    );
  }

  console.log('🎨 Rendering Whiteboard UI');
  console.log('📊 Current state:', {
    connectionStatus,
    activeUsers: activeUsers.length,
    permissions,
    tool
  });
  
  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <FiEdit3 className="mr-2" />
            {sessionInfo?.title || 'Collaborative Whiteboard'}
          </h2>
          
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-sm text-gray-300">
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 
               'Disconnected'}
            </span>
            
            <span className="text-xs bg-gray-700 px-2 py-1 rounded">
              {isStreamer ? '🎤 Streamer' : '👀 Viewer'}
            </span>
            
            {!permissions.canDraw && (
              <span className="text-xs bg-yellow-800 px-2 py-1 rounded flex items-center">
                <FiLock className="mr-1" size={10} /> View Only
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Active Users */}
          <div className="flex items-center space-x-1 text-sm text-gray-300">
            <FiUsers />
            <span>{activeUsers.length + 1} online</span>
          </div>
          
          {/* Debug Buttons */}
          {showDebug && (
            <button
              onClick={forceReconnect}
              className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white text-sm"
            >
              🔁 Reconnect
            </button>
          )}
          
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm"
          >
            {showDebug ? 'Hide Debug' : 'Debug'}
          </button>
          
          <button
            onClick={checkPermissions}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm"
            title="Check Permissions"
          >
            <FiRefreshCw />
          </button>
          
          <button
            onClick={handleZoomReset}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
            title="Reset Zoom"
          >
            <FiMaximize2 />
          </button>
          
          <button
            onClick={onClose}
            className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
            title="Close Whiteboard"
          >
            <FiX />
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tools Sidebar */}
        <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 space-y-4">
          {tools.map((toolItem) => (
            <button
              key={toolItem.id}
              onClick={() => handleToolSelect(toolItem.id)}
              className={`p-3 rounded-xl transition-all duration-200 ${
                tool === toolItem.id 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              } ${
                ((toolItem.id === 'draw' || toolItem.id === 'eraser') && !permissions.canDraw) ||
                (toolItem.id === 'eraser' && !permissions.canDelete) ||
                (['rectangle', 'circle', 'triangle', 'text', 'sticky', 'image', 'line', 'arrow', 'star', 'hexagon'].includes(toolItem.id) && !permissions.canDraw)
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
              title={toolItem.name}
              disabled={
                ((toolItem.id === 'draw' || toolItem.id === 'eraser') && !permissions.canDraw) ||
                (toolItem.id === 'eraser' && !permissions.canDelete) ||
                (['rectangle', 'circle', 'triangle', 'text', 'sticky', 'image', 'line', 'arrow', 'star', 'hexagon'].includes(toolItem.id) && !permissions.canDraw)
              }
            >
              {toolItem.icon}
            </button>
          ))}
        </div>

        {/* Properties Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
                <BsBrush className="mr-2" />
                Brush Properties
                {!permissions.canDraw && (
                  <FiLock className="ml-auto" size={12} />
                )}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400">Width</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {brushSizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setBrushWidth(size)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          brushWidth === size 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        } ${!permissions.canDraw ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!permissions.canDraw}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Stroke Color</label>
                  <div className="grid grid-cols-7 gap-1 mt-1">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setBrushColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          brushColor === color ? 'border-white' : 'border-gray-700'
                        } ${!permissions.canDraw ? 'opacity-50' : ''}`}
                        style={{ backgroundColor: color }}
                        disabled={!permissions.canDraw}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className={`w-full mt-2 bg-gray-700 border border-gray-600 rounded ${!permissions.canDraw ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!permissions.canDraw}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Fill Color</label>
                  <div className="grid grid-cols-7 gap-1 mt-1">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFillColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          fillColor === color ? 'border-white' : 'border-gray-700'
                        } ${!permissions.canDraw ? 'opacity-50' : ''}`}
                        style={{ backgroundColor: color }}
                        disabled={!permissions.canDraw}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    className={`w-full mt-2 bg-gray-700 border border-gray-600 rounded ${!permissions.canDraw ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!permissions.canDraw}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">
                    Opacity: {Math.round(opacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className={`w-full mt-1 ${!permissions.canDraw ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!permissions.canDraw}
                  />
                </div>
              </div>
            </div>

            {/* Session Info */}
            {sessionInfo && (
              <div className="pt-4 border-t border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Session Info</h3>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>Title: {sessionInfo.title}</div>
                  <div>Room: {sessionInfo.roomCode}</div>
                  {sessionInfo.streamerName && (
                    <div>Host: {sessionInfo.streamerName}</div>
                  )}
                  <div>Participants: {activeUsers.length + 1}</div>
                  <div>Allow Viewers to Draw: {allowViewersToDraw ? 'Yes' : 'No'}</div>
                  <div className="pt-2">
                    <div className="text-gray-300">Your Permissions:</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {permissions.canDraw && (
                        <span className="bg-green-900 px-2 py-1 rounded text-xs">Draw</span>
                      )}
                      {permissions.canEdit && (
                        <span className="bg-blue-900 px-2 py-1 rounded text-xs">Edit</span>
                      )}
                      {permissions.canDelete && (
                        <span className="bg-red-900 px-2 py-1 rounded text-xs">Delete</span>
                      )}
                      {permissions.canClear && (
                        <span className="bg-purple-900 px-2 py-1 rounded text-xs">Clear</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden" ref={containerRef}>
          <canvas ref={canvasRef} className="absolute inset-0" />
          
          {/* View Only Overlay */}
          {!permissions.canDraw && connectionStatus === 'connected' && (
            <div className="absolute top-4 right-4 bg-yellow-800/80 text-white text-xs px-3 py-2 rounded-lg">
              👀 View Only Mode
            </div>
          )}
          
          {/* Status Bar */}
          <div className="absolute bottom-4 left-4 bg-black/70 text-white text-sm px-3 py-2 rounded-lg">
            X: {cursorPosition.x}, Y: {cursorPosition.y} | Zoom: {Math.round(zoom * 100)}% | Tool: {tool}
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex space-x-2">
            <button
              onClick={handleZoomOut}
              className="bg-black/70 text-white p-2 rounded-lg hover:bg-black/80"
              title="Zoom Out"
            >
              <FiZoomOut />
            </button>
            <button
              onClick={handleZoomIn}
              className="bg-black/70 text-white p-2 rounded-lg hover:bg-black/80"
              title="Zoom In"
            >
              <FiZoomIn />
            </button>
          </div>

          {/* Debug Info Panel */}
          {showDebug && (
            <div className="absolute top-4 left-4 bg-black/80 text-white text-xs p-3 rounded-lg max-w-md max-h-64 overflow-y-auto">
              <div className="font-bold mb-2">Debug Info:</div>
              <div className="space-y-1">
                <div>Status: <span className={connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>{connectionStatus}</span></div>
                <div>Connection Attempts: {connectionAttempt}</div>
                <div>Session ID: {sessionId}</div>
                <div>Room Code: {roomCode}</div>
                <div>User: {user?.name || 'Anonymous'}</div>
                <div>Role: {isStreamer ? 'Streamer' : 'Viewer'}</div>
                <div>Canvas: {fabricCanvasRef.current ? 'Loaded' : 'Not loaded'}</div>
                <div>WS: {ws && ws.readyState === WebSocket.OPEN ? 'Connected' : 'Disconnected'}</div>
                
                <div className="mt-2 font-bold">Permissions:</div>
                <div className="grid grid-cols-2 gap-1">
                  <div>Draw: {permissions.canDraw ? '✅' : '❌'}</div>
                  <div>Edit: {permissions.canEdit ? '✅' : '❌'}</div>
                  <div>Delete: {permissions.canDelete ? '✅' : '❌'}</div>
                  <div>Clear: {permissions.canClear ? '✅' : '❌'}</div>
                </div>
                
                <div className="mt-2 font-bold">Active Users ({activeUsers.length}):</div>
                <div className="text-xs max-h-20 overflow-y-auto">
                  {activeUsers.map((user, index) => (
                    <div key={index} className="py-1 border-b border-gray-700">
                      {user.userName} ({user.userRole}) {user.isStreamer && '🎤'}
                    </div>
                  ))}
                </div>
                
                <div className="mt-2 font-bold">Connection Logs:</div>
                <div className="text-xs max-h-32 overflow-y-auto">
                  {connectionLogs.slice().reverse().map((log, index) => (
                    <div key={index} className="border-b border-gray-700 py-1">
                      <span className="text-gray-400">[{log.timestamp}]</span> {log.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="w-64 bg-gray-800 border-l border-gray-700 p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">History</h3>
              <div className="flex space-x-2">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0 || !permissions.canEdit}
                  className={`flex-1 p-2 rounded-lg flex items-center justify-center space-x-1 ${
                    historyIndex <= 0 || !permissions.canEdit
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  <FaUndo />
                  <span>Undo</span>
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1 || !permissions.canEdit}
                  className={`flex-1 p-2 rounded-lg flex items-center justify-center space-x-1 ${
                    historyIndex >= history.length - 1 || !permissions.canEdit
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  <FaRedo />
                  <span>Redo</span>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={handleClear}
                  disabled={!permissions.canClear}
                  className={`w-full p-2 rounded-lg flex items-center justify-center space-x-2 ${
                    permissions.canClear
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <FiTrash2 />
                  <span>Clear Canvas</span>
                </button>
                <button
                  onClick={exportAsImage}
                  className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white flex items-center justify-center space-x-2"
                >
                  <FiDownload />
                  <span>Export as PNG</span>
                </button>
                <button
                  onClick={exportAsJSON}
                  className="w-full p-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white flex items-center justify-center space-x-2"
                >
                  <FiSave />
                  <span>Export as JSON</span>
                </button>
                <button
                  onClick={importFromJSON}
                  disabled={!permissions.canEdit}
                  className={`w-full p-2 rounded-lg flex items-center justify-center space-x-2 ${
                    permissions.canEdit
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <FiUpload />
                  <span>Import JSON</span>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Active Users</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                <div className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-white">You ({user?.name || 'Anonymous'})</span>
                  <span className="text-xs bg-blue-900 px-2 py-1 rounded ml-auto">
                    {isStreamer ? 'Streamer' : 'Viewer'}
                  </span>
                </div>
                {activeUsers.map((activeUser, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-300">{activeUser.userName}</span>
                    <span className="text-xs bg-gray-800 px-2 py-1 rounded ml-auto">
                      {activeUser.isStreamer ? 'Streamer' : activeUser.userRole}
                    </span>
                    {userTools[activeUser.userId] && (
                      <span className="text-xs bg-purple-900 px-2 py-1 rounded">
                        {userTools[activeUser.userId]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

console.log('===================================================');
console.log('🎨 WHITEBOARD COMPONENT DEFINED');
console.log('===================================================');

export default WhiteboardComponent;