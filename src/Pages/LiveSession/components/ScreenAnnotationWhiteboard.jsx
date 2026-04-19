// import React, { useState, useEffect, useRef, useCallback, memo } from "react";
// import * as Y from "yjs";
// import { WebsocketProvider } from "y-websocket";
// import {
//   FiSquare, FiCircle, FiMinus, FiRefreshCcw,
//   FiTrash2, FiX, FiMousePointer, FiEdit2
// } from "react-icons/fi";
// import { FaEraser, FaPaintBrush } from "react-icons/fa";
// import { toast } from "react-toastify";

// const FLUSH_INTERVAL = 50;
// const MIN_MOVE_DIST = 0.6;
// // ✅ NAYA: Canvas ka internal resolution fix kar diya (16:9 Aspect Ratio)
// const BASE_W = 1920;
// const BASE_H = 1080;

// function uid() {
//   return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
// }

// const ScreenAnnotationWhiteboard = memo(
//   ({
//     sessionId,
//     roomCode,
//     wsToken,
//     sessionInfo,
//     isActive,
//     onClose,
//     allowViewersToDraw = true,
//   }) => {
//     // ── canvas refs ──
//     const canvasRef = useRef(null);
//     const ctxRef = useRef(null);
//     const containerRef = useRef(null);

//     // ── Yjs refs ──
//     const yDocRef = useRef(null);
//     const yProviderRef = useRef(null);
//     const yWhiteboardRef = useRef(null);
//     const yUndoManagerRef = useRef(null);

//     // ── raf / flush ──
//     const rafIdRef = useRef(null);
//     const pendingObjsRef = useRef(null);
//     const flushTimerRef = useRef(null);

//     // ── stroke state ──
//     const currentStrokeIdRef = useRef(null);
//     const strokeBufferRef = useRef([]);
//     const lastLocalPointRef = useRef(null);
//     const lastLocalMidRef = useRef(null);
//     const pointerIdRef = useRef(null);

//     // ── state ──
//     const [tool, setTool] = useState("pen");
//     const [color, setColor] = useState("#00c8ff"); // Default bright color for screen share
//     const [strokeWidth, setStrokeWidth] = useState(8); // ✅ Thicker stroke for 1080p canvas
//     const [isConnected, setIsConnected] = useState(false);
//     const [participants, setParticipants] = useState([]);
//     const [isDrawing, setIsDrawing] = useState(false);
    
//     // 🎨 Special toggle for Overlay
//     const [isAnnotationActive, setIsAnnotationActive] = useState(true);

//     // ✅ NAYA: Calculate points relatively using virtual resolution (1920x1080)
//     const getTransformedPoint = useCallback((e) => {
//       if (!canvasRef.current) return { x: 0, y: 0 };
//       const rect = canvasRef.current.getBoundingClientRect();
//       return {
//         x: ((e.clientX - rect.left) / rect.width) * BASE_W,
//         y: ((e.clientY - rect.top) / rect.height) * BASE_H,
//       };
//     }, []);

//     const getCurrentObjects = useCallback(() => {
//       if (!yWhiteboardRef.current || yWhiteboardRef.current.length === 0) return [];
//       return (yWhiteboardRef.current.toArray()[0]?.objects) || [];
//     }, []);

//     const commitState = useCallback((updater) => {
//       if (!yWhiteboardRef.current || !yDocRef.current) return;
//       yDocRef.current.transact(() => {
//         const cur = yWhiteboardRef.current.toArray()[0] || {
//           version: "1.0.0", objects: [],
//           createdAt: new Date().toISOString(),
//         };
//         const next = updater(cur);
//         if (yWhiteboardRef.current.length === 0) {
//           yWhiteboardRef.current.insert(0, [next]);
//         } else {
//           yWhiteboardRef.current.delete(0, 1);
//           yWhiteboardRef.current.insert(0, [next]);
//         }
//       }, "drawing");
//     }, []);

//     const addObject = useCallback((obj) => {
//       commitState((cur) => ({
//         ...cur,
//         objects: [...(cur.objects || []), obj],
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString(),
//       }));
//     }, [commitState, sessionInfo]);

//     const drawObject = useCallback((ctx, obj) => {
//       if (!obj) return;
//       ctx.save();
//       ctx.strokeStyle = obj.color || "#00c8ff";
//       ctx.fillStyle = obj.fillColor || "transparent";
//       ctx.lineWidth = obj.strokeWidth || 8;
//       ctx.globalAlpha = obj.opacity ?? 1;

//       switch (obj.type) {
//         case "pen":
//         case "pencil": {
//           if (!obj.points?.length) break;
//           ctx.beginPath();
//           ctx.moveTo(obj.points[0].x, obj.points[0].y);
//           obj.points.forEach((p) => ctx.lineTo(p.x, p.y));
//           ctx.stroke();
//           break;
//         }
//         case "eraser": {
//           if (!obj.points?.length) break;
//           ctx.save();
//           ctx.globalCompositeOperation = "destination-out";
//           ctx.beginPath();
//           ctx.moveTo(obj.points[0].x, obj.points[0].y);
//           obj.points.forEach((p) => ctx.lineTo(p.x, p.y));
//           ctx.stroke();
//           ctx.restore();
//           break;
//         }
//         case "line": {
//           ctx.beginPath(); ctx.moveTo(obj.x1, obj.y1); ctx.lineTo(obj.x2, obj.y2); ctx.stroke();
//           break;
//         }
//         case "rectangle": {
//           if (obj.fillColor) ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
//           ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
//           break;
//         }
//         case "circle": {
//           ctx.beginPath(); ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);
//           if (obj.fillColor) ctx.fill();
//           ctx.stroke();
//           break;
//         }
//         default: break;
//       }
//       ctx.restore();
//     }, []);

//     const redrawCanvas = useCallback((objects) => {
//       if (!ctxRef.current || !canvasRef.current) return;
//       const ctx = ctxRef.current;

//       // 🛑 Hamesha clear karein taaki transparent rahe
//       ctx.clearRect(0, 0, BASE_W, BASE_H);

//       ctx.save();
//       (objects || []).forEach((obj) => drawObject(ctx, obj));
//       ctx.restore();
//     }, [drawObject]);

//     const scheduleRedraw = useCallback((objects) => {
//       pendingObjsRef.current = objects || [];
//       if (rafIdRef.current) return;
//       rafIdRef.current = requestAnimationFrame(() => {
//         rafIdRef.current = null;
//         redrawCanvas(pendingObjsRef.current || []);
//         pendingObjsRef.current = null;
//       });
//     }, [redrawCanvas]);

//     const loadWhiteboardState = useCallback(() => {
//       if (!yWhiteboardRef.current || yWhiteboardRef.current.length === 0) return;
//       try {
//         const state = yWhiteboardRef.current.toArray()[0] || {};
//         if (Array.isArray(state.objects)) scheduleRedraw(state.objects);
//       } catch (e) { console.error(e); }
//     }, [scheduleRedraw]);

//     const drawSmoothStroke = useCallback((prev, next, strokeType) => {
//       if (!ctxRef.current) return;
//       const ctx = ctxRef.current;
//       ctx.save();
//       ctx.lineCap = "round";
//       ctx.lineJoin = "round";
//       ctx.lineWidth = strokeWidth || 8;

//       if (strokeType === "eraser") {
//         ctx.globalCompositeOperation = "destination-out";
//         ctx.strokeStyle = "rgba(0,0,0,1)";
//       } else {
//         ctx.globalCompositeOperation = "source-over";
//         ctx.strokeStyle = color || "#00c8ff";
//       }

//       const mid = { x: (prev.x + next.x) / 2, y: (prev.y + next.y) / 2 };
//       if (!lastLocalMidRef.current) lastLocalMidRef.current = { x: prev.x, y: prev.y };
//       ctx.beginPath();
//       ctx.moveTo(lastLocalMidRef.current.x, lastLocalMidRef.current.y);
//       ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
//       ctx.stroke();
//       lastLocalMidRef.current = mid;
//       ctx.restore();
//     }, [color, strokeWidth]);

//     const flushStrokeToYjs = useCallback((force = false) => {
//       const strokeId = currentStrokeIdRef.current;
//       if (!strokeId) return;
//       const buffered = strokeBufferRef.current;
//       if (!buffered.length) return;
//       const pts = buffered.slice();
//       strokeBufferRef.current = [];

//       commitState((cur) => {
//         const objs = [...(cur.objects || [])];
//         const idx = objs.findIndex((o) => o?.id === strokeId);
//         if (idx === -1) return cur;
//         const target = { ...objs[idx] };
//         target.points = [...(target.points || []), ...pts];
//         objs[idx] = target;
//         return { ...cur, objects: objs, updatedAt: new Date().toISOString() };
//       });
//     }, [commitState]);

//     const scheduleFlush = useCallback(() => {
//       if (flushTimerRef.current) return;
//       flushTimerRef.current = setTimeout(() => {
//         flushTimerRef.current = null;
//         flushStrokeToYjs(false);
//       }, FLUSH_INTERVAL);
//     }, [flushStrokeToYjs]);

//     useEffect(() => {
//       if (!sessionId || !wsToken) return;

//       const initYjs = async () => {
//         try {
//           const ydoc = new Y.Doc();
//           yDocRef.current = ydoc;

//           const baseWs = import.meta.env.VITE_WS_URL || "ws://localhost:9090";
//           const provider = new WebsocketProvider(`${baseWs}/yjs`, sessionId, ydoc, {
//             WebSocketPolyfill: WebSocket,
//             params: {
//               token: wsToken, isStreamer: true, allowViewersToDraw,
//               roomCode, userId: sessionInfo?.streamerId, userName: sessionInfo?.streamerName,
//             },
//           });
//           yProviderRef.current = provider;

//           const yWhiteboard = ydoc.getArray("whiteboard");
//           yWhiteboardRef.current = yWhiteboard;

//           provider.awareness.setLocalState({
//             userId: sessionInfo?.streamerId || "streamer",
//             userName: sessionInfo?.streamerName || "Streamer",
//             role: "STREAMER", isStreamer: true, color, tool,
//           });

//           provider.awareness.on("change", () => {
//             const states = Array.from(provider.awareness.getStates().entries());
//             setParticipants(states.map(([id, s]) => ({ clientId: id, ...s })).filter((p) => p.userId));
//           });

//           provider.on("sync", (synced) => {
//             setIsConnected(!!synced);
//             if (synced) loadWhiteboardState();
//           });

//           yUndoManagerRef.current = new Y.UndoManager(yWhiteboard, {
//             captureTimeout: 150, trackedOrigins: new Set(["drawing"]),
//           });

//           // ❌ y-indexeddb hata diya gaya hai

//           const observer = (event) => {
//             const origin = event?.transaction?.origin;
//             if (origin === "drawing" && (isDrawing || currentStrokeIdRef.current)) return;
//             loadWhiteboardState();
//           };
//           yWhiteboard.observe(observer);

//         } catch (err) {
//           console.error("Failed to init Yjs Annotation:", err);
//           toast.error("Failed to connect annotation server");
//         }
//       };

//       initYjs();

//       return () => {
//         try { flushStrokeToYjs(true); } catch {}
//         if (yProviderRef.current) { try { yProviderRef.current.disconnect(); yProviderRef.current.destroy(); } catch {} }
//         if (yDocRef.current) { try { yDocRef.current.destroy(); } catch {} }
//         yProviderRef.current = yDocRef.current = yWhiteboardRef.current = null;
//       };
//     }, [sessionId, roomCode, wsToken, allowViewersToDraw, sessionInfo, loadWhiteboardState, isDrawing, flushStrokeToYjs]);

//     useEffect(() => {
//       const p = yProviderRef.current;
//       if (!p) return;
//       try {
//         const prev = p.awareness.getLocalState() || {};
//         p.awareness.setLocalState({ ...prev, color, tool });
//       } catch {}
//     }, [color, tool]);

//     useEffect(() => () => {
//       if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
//       if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
//     }, []);

//     // ✅ NAYA: Canvas setup fixed resolution once, CSS will handle the scaling
//     useEffect(() => {
//       if (!canvasRef.current) return;
//       canvasRef.current.width = BASE_W;
//       canvasRef.current.height = BASE_H;
//       ctxRef.current = canvasRef.current.getContext("2d");
//       ctxRef.current.lineCap = "round"; 
//       ctxRef.current.lineJoin = "round";
//       loadWhiteboardState();
//     }, [loadWhiteboardState]);

//     const handlePointerDown = useCallback((e) => {
//       if (!isAnnotationActive || !canvasRef.current || e.button === 2) return;
//       e.preventDefault();
//       try { canvasRef.current.setPointerCapture(e.pointerId); pointerIdRef.current = e.pointerId; } catch {}

//       const p = getTransformedPoint(e);
//       setIsDrawing(true);
//       lastLocalPointRef.current = p;
//       lastLocalMidRef.current = null;

//       if (tool === "pen" || tool === "eraser") {
//         const strokeId = uid();
//         currentStrokeIdRef.current = strokeId;
//         strokeBufferRef.current = [];
//         addObject({
//           id: strokeId, type: tool,
//           points: [{ x: p.x, y: p.y }],
//           color: tool === "eraser" ? "transparent" : color, // Erase visually clears
//           strokeWidth, timestamp: Date.now(),
//         });
//         drawSmoothStroke(p, { x: p.x + 0.01, y: p.y + 0.01 }, tool);
//       }
//     }, [tool, getTransformedPoint, addObject, drawSmoothStroke, color, strokeWidth, isAnnotationActive]);

//     const handlePointerMove = useCallback((e) => {
//       if (!isAnnotationActive || !canvasRef.current || !isDrawing) return;
//       if (tool !== "pen" && tool !== "eraser") return;

//       const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e];
//       for (const evt of events) {
//         const next = getTransformedPoint(evt);
//         const prev = lastLocalPointRef.current;
//         const dist = prev ? Math.hypot(next.x - prev.x, next.y - prev.y) : 999;
//         if (dist < MIN_MOVE_DIST) continue;
//         if (prev) drawSmoothStroke(prev, next, tool);
//         strokeBufferRef.current.push(next);
//         scheduleFlush();
//         lastLocalPointRef.current = next;
//       }
//     }, [isDrawing, tool, getTransformedPoint, drawSmoothStroke, scheduleFlush, isAnnotationActive]);

//     const endStrokeCleanup = useCallback(() => {
//       flushStrokeToYjs(true);
//       currentStrokeIdRef.current = null;
//       strokeBufferRef.current = [];
//       lastLocalPointRef.current = null;
//       lastLocalMidRef.current = null;
//       if (canvasRef.current && pointerIdRef.current != null) {
//         try { canvasRef.current.releasePointerCapture(pointerIdRef.current); } catch {}
//       }
//       pointerIdRef.current = null;
//     }, [flushStrokeToYjs]);

//     const handlePointerUp = useCallback(() => { setIsDrawing(false); endStrokeCleanup(); }, [endStrokeCleanup]);
//     const handlePointerLeave = useCallback(() => { setIsDrawing(false); endStrokeCleanup(); }, [endStrokeCleanup]);

//     const handleClearWhiteboard = useCallback(() => {
//       if (!yWhiteboardRef.current || !yDocRef.current) return;
//       if (!window.confirm("Clear all annotations?")) return;
//       yDocRef.current.transact(() => {
//         yWhiteboardRef.current.delete(0, yWhiteboardRef.current.length);
//         yWhiteboardRef.current.insert(0, [{
//           version: "1.0.0", objects: [],
//           clearedAt: new Date().toISOString(), clearedBy: sessionInfo?.streamerId,
//         }]);
//       }, "drawing");
//       scheduleRedraw([]);
//       toast.success("Annotations cleared");
//     }, [sessionInfo, scheduleRedraw]);

//     const handleUndo = useCallback(() => yUndoManagerRef.current?.undo(), []);
//     const handleRedo = useCallback(() => yUndoManagerRef.current?.redo(), []);

//     return (
//       <div
//         ref={containerRef}
//         className={`absolute inset-0 z-40 w-full h-full overflow-hidden ${isActive ? "block" : "hidden"}`}
//         // 🛑 pointer-events-none makes the wrapper pass clicks down, 
//         // while pointer-events-auto inside makes toolbar and canvas clickable.
//         style={{ pointerEvents: "none" }} 
//       >
//         {/* Main drawing canvas */}
//         <canvas
//           ref={canvasRef}
//           className="absolute top-0 left-0 w-full h-full"
//           style={{ 
//             touchAction: "none", 
//             cursor: isAnnotationActive ? "crosshair" : "default", 
//             zIndex: 20,
//             pointerEvents: isAnnotationActive ? "auto" : "none" // Toggle canvas clickability
//           }}
//           onPointerDown={handlePointerDown}
//           onPointerMove={handlePointerMove}
//           onPointerUp={handlePointerUp}
//           onPointerLeave={handlePointerLeave}
//           onContextMenu={(e) => e.preventDefault()}
//         />

//         {/* ── Sleek Top Toolbar for Overlay ── */}
//         <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30" style={{ pointerEvents: "auto" }}>
//           <div className="bg-gray-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700 px-3 py-2 flex items-center gap-2 flex-wrap">

//             {/* Connection status */}
//             <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            
//             <div className="w-px h-6 bg-gray-600 mx-1" />

//             {/* Toggle Annotation Tool */}
//             <button 
//               onClick={() => setIsAnnotationActive(!isAnnotationActive)} 
//               title={isAnnotationActive ? "Turn Off Drawing to click screen" : "Turn On Drawing"}
//               className={`px-3 py-1.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 ${
//                 isAnnotationActive ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-gray-700 hover:bg-gray-600 text-gray-300"
//               }`}
//             >
//               {isAnnotationActive ? <FiEdit2 className="w-4 h-4" /> : <FiMousePointer className="w-4 h-4" />}
//               {isAnnotationActive ? "Draw ON" : "Draw OFF"}
//             </button>

//             {isAnnotationActive && (
//               <>
//                 <div className="w-px h-6 bg-gray-600 mx-1" />

//                 {/* Draw tools */}
//                 {[
//                   { t: "pen", icon: <FaPaintBrush className="w-4 h-4" />, title: "Pen" },
//                   { t: "eraser", icon: <FaEraser className="w-4 h-4" />, title: "Eraser" },
//                   { t: "line", icon: <FiMinus className="w-4 h-4" />, title: "Line" },
//                   { t: "rectangle", icon: <FiSquare className="w-4 h-4" />, title: "Rectangle" },
//                   { t: "circle", icon: <FiCircle className="w-4 h-4" />, title: "Circle" },
//                 ].map(({ t, icon, title }) => (
//                   <button key={t} onClick={() => setTool(t)} title={title}
//                     className={`p-2 rounded-xl transition-colors ${tool === t ? "bg-gray-600 text-white" : "hover:bg-gray-700 text-gray-400"}`}>
//                     {icon}
//                   </button>
//                 ))}

//                 <div className="w-px h-6 bg-gray-600 mx-1" />

//                 {/* Color + stroke */}
//                 <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
//                   className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0" title="Color" />
//                 <select value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))}
//                   className="bg-gray-800 text-white text-sm rounded-lg px-2 py-1 outline-none border border-gray-600 w-16">
//                   {/* ✅ Values update kardiye bade canvas ke hisab se */}
//                   {[4, 8, 12, 16, 24].map((v) => <option key={v} value={v}>{v}px</option>)}
//                 </select>

//                 <div className="w-px h-6 bg-gray-600 mx-1" />

//                 {/* Undo/Redo */}
//                 <button onClick={handleUndo} title="Undo (Ctrl+Z)" className="p-2 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white">
//                     <FiRefreshCcw className="w-4 h-4" />
//                 </button>
//                 <button onClick={handleRedo} title="Redo (Ctrl+Y)" className="p-2 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white">
//                     <FiRefreshCcw className="w-4 h-4 transform scale-x-[-1]" />
//                 </button>

//                 <div className="w-px h-6 bg-gray-600 mx-1" />

//                 {/* Clear All */}
//                 <button onClick={handleClearWhiteboard} title="Clear Annotations" className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-colors">
//                     <FiTrash2 className="w-4 h-4" />
//                 </button>
//               </>
//             )}

//             <div className="w-px h-6 bg-gray-600 mx-1" />
//             <button onClick={onClose} title="Close Annotation" className="p-2 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-colors">
//                 <FiX className="w-4 h-4" />
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   },
//   (prev, next) => {
//     if (prev.sessionId !== next.sessionId) return false;
//     if (prev.isActive !== next.isActive) return false;
//     return true;
//   }
// );

// ScreenAnnotationWhiteboard.displayName = "ScreenAnnotationWhiteboard";
// export default ScreenAnnotationWhiteboard;









import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import {
  FiSquare, FiCircle, FiMinus, FiRefreshCcw,
  FiTrash2, FiX, FiMousePointer, FiEdit2
} from "react-icons/fi";
import { FaEraser, FaPaintBrush } from "react-icons/fa";
import { toast } from "react-toastify";

const FLUSH_INTERVAL = 50;
const MIN_MOVE_DIST = 0.6;
const BASE_W = 1920;
const BASE_H = 1080;

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const ScreenAnnotationWhiteboard = memo(
  ({
    sessionId,
    roomCode,
    wsToken,
    sessionInfo,
    isActive,
    onClose,
    allowViewersToDraw = true,
  }) => {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const containerRef = useRef(null);

    const yDocRef = useRef(null);
    const yProviderRef = useRef(null);
    const yWhiteboardRef = useRef(null);
    const yUndoManagerRef = useRef(null);

    const rafIdRef = useRef(null);
    const pendingObjsRef = useRef(null);
    const flushTimerRef = useRef(null);

    const currentStrokeIdRef = useRef(null);
    const strokeBufferRef = useRef([]);
    const lastLocalPointRef = useRef(null);
    const lastLocalMidRef = useRef(null);
    const pointerIdRef = useRef(null);
    
    // 🔥 FIX: isDrawing ki jagah ref use kiya taaki reconnect loop na bane
    const isDrawingRef = useRef(false); 

    const [tool, setTool] = useState("pen");
    const [color, setColor] = useState("#00c8ff"); 
    const [strokeWidth, setStrokeWidth] = useState(8); 
    const [isConnected, setIsConnected] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [isAnnotationActive, setIsAnnotationActive] = useState(true);

    const getTransformedPoint = useCallback((e) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * BASE_W,
        y: ((e.clientY - rect.top) / rect.height) * BASE_H,
      };
    }, []);

    const commitState = useCallback((updater) => {
      if (!yWhiteboardRef.current || !yDocRef.current) return;
      yDocRef.current.transact(() => {
        const cur = yWhiteboardRef.current.toArray()[0] || {
          version: "1.0.0", objects: [],
          createdAt: new Date().toISOString(),
        };
        const next = updater(cur);
        if (yWhiteboardRef.current.length === 0) {
          yWhiteboardRef.current.insert(0, [next]);
        } else {
          yWhiteboardRef.current.delete(0, 1);
          yWhiteboardRef.current.insert(0, [next]);
        }
      }, "drawing");
    }, []);

    const addObject = useCallback((obj) => {
      commitState((cur) => ({
        ...cur,
        objects: [...(cur.objects || []), obj],
        updatedBy: sessionInfo?.streamerId,
        updatedAt: new Date().toISOString(),
      }));
    }, [commitState, sessionInfo]);

    const drawObject = useCallback((ctx, obj) => {
      if (!obj) return;
      ctx.save();
      ctx.strokeStyle = obj.color || "#00c8ff";
      ctx.fillStyle = obj.fillColor || "transparent";
      ctx.lineWidth = obj.strokeWidth || 8;
      ctx.globalAlpha = obj.opacity ?? 1;

      switch (obj.type) {
        case "pen":
        case "pencil": {
          if (!obj.points?.length) break;
          ctx.beginPath();
          ctx.moveTo(obj.points[0].x, obj.points[0].y);
          obj.points.forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.stroke();
          break;
        }
        case "eraser": {
          if (!obj.points?.length) break;
          ctx.save();
          ctx.globalCompositeOperation = "destination-out";
          ctx.beginPath();
          ctx.moveTo(obj.points[0].x, obj.points[0].y);
          obj.points.forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.stroke();
          ctx.restore();
          break;
        }
        case "line": {
          ctx.beginPath(); ctx.moveTo(obj.x1, obj.y1); ctx.lineTo(obj.x2, obj.y2); ctx.stroke();
          break;
        }
        case "rectangle": {
          if (obj.fillColor) ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
          ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
          break;
        }
        case "circle": {
          ctx.beginPath(); ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);
          if (obj.fillColor) ctx.fill();
          ctx.stroke();
          break;
        }
        default: break;
      }
      ctx.restore();
    }, []);

    const redrawCanvas = useCallback((objects) => {
      if (!ctxRef.current || !canvasRef.current) return;
      const ctx = ctxRef.current;
      ctx.clearRect(0, 0, BASE_W, BASE_H);
      ctx.save();
      (objects || []).forEach((obj) => drawObject(ctx, obj));
      ctx.restore();
    }, [drawObject]);

    const scheduleRedraw = useCallback((objects) => {
      pendingObjsRef.current = objects || [];
      if (rafIdRef.current) return;
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        redrawCanvas(pendingObjsRef.current || []);
        pendingObjsRef.current = null;
      });
    }, [redrawCanvas]);

    const loadWhiteboardState = useCallback(() => {
      if (!yWhiteboardRef.current || yWhiteboardRef.current.length === 0) return;
      try {
        const state = yWhiteboardRef.current.toArray()[0] || {};
        if (Array.isArray(state.objects)) scheduleRedraw(state.objects);
      } catch (e) { console.error(e); }
    }, [scheduleRedraw]);

    const drawSmoothStroke = useCallback((prev, next, strokeType) => {
      if (!ctxRef.current) return;
      const ctx = ctxRef.current;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = strokeWidth || 8;

      if (strokeType === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color || "#00c8ff";
      }

      const mid = { x: (prev.x + next.x) / 2, y: (prev.y + next.y) / 2 };
      if (!lastLocalMidRef.current) lastLocalMidRef.current = { x: prev.x, y: prev.y };
      ctx.beginPath();
      ctx.moveTo(lastLocalMidRef.current.x, lastLocalMidRef.current.y);
      ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
      ctx.stroke();
      lastLocalMidRef.current = mid;
      ctx.restore();
    }, [color, strokeWidth]);

    const flushStrokeToYjs = useCallback((force = false) => {
      const strokeId = currentStrokeIdRef.current;
      if (!strokeId) return;
      const buffered = strokeBufferRef.current;
      if (!buffered.length) return;
      const pts = buffered.slice();
      strokeBufferRef.current = [];

      commitState((cur) => {
        const objs = [...(cur.objects || [])];
        const idx = objs.findIndex((o) => o?.id === strokeId);
        if (idx === -1) return cur;
        const target = { ...objs[idx] };
        target.points = [...(target.points || []), ...pts];
        objs[idx] = target;
        return { ...cur, objects: objs, updatedAt: new Date().toISOString() };
      });
    }, [commitState]);

    const scheduleFlush = useCallback(() => {
      if (flushTimerRef.current) return;
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        flushStrokeToYjs(false);
      }, FLUSH_INTERVAL);
    }, [flushStrokeToYjs]);

    useEffect(() => {
      if (!sessionId || !wsToken) return;

      const initYjs = async () => {
        try {
          const ydoc = new Y.Doc();
          yDocRef.current = ydoc;

          const baseWs = import.meta.env.VITE_WS_URL || "ws://localhost:9090";
          const provider = new WebsocketProvider(`${baseWs}/yjs`, sessionId, ydoc, {
            WebSocketPolyfill: WebSocket,
            params: {
              token: wsToken, isStreamer: true, allowViewersToDraw,
              roomCode, userId: sessionInfo?.streamerId, userName: sessionInfo?.streamerName,
            },
          });
          yProviderRef.current = provider;

          const yWhiteboard = ydoc.getArray("whiteboard");
          yWhiteboardRef.current = yWhiteboard;

          provider.awareness.setLocalState({
            userId: sessionInfo?.streamerId || "streamer",
            userName: sessionInfo?.streamerName || "Streamer",
            role: "STREAMER", isStreamer: true, color, tool,
          });

          provider.awareness.on("change", () => {
            const states = Array.from(provider.awareness.getStates().entries());
            setParticipants(states.map(([id, s]) => ({ clientId: id, ...s })).filter((p) => p.userId));
          });

          provider.on("sync", (synced) => {
            setIsConnected(!!synced);
            if (synced) loadWhiteboardState();
          });

          yUndoManagerRef.current = new Y.UndoManager(yWhiteboard, {
            captureTimeout: 150, trackedOrigins: new Set(["drawing"]),
          });

          const observer = (event) => {
            const origin = event?.transaction?.origin;
            if (origin === "drawing" && (isDrawingRef.current || currentStrokeIdRef.current)) return;
            loadWhiteboardState();
          };
          yWhiteboard.observe(observer);

        } catch (err) {
          console.error("Failed to init Yjs Annotation:", err);
        }
      };

      initYjs();

      return () => {
        try { flushStrokeToYjs(true); } catch {}
        if (yProviderRef.current) { try { yProviderRef.current.disconnect(); yProviderRef.current.destroy(); } catch {} }
        if (yDocRef.current) { try { yDocRef.current.destroy(); } catch {} }
        yProviderRef.current = yDocRef.current = yWhiteboardRef.current = null;
      };
    // 🔥 FIX: Cleaned up dependencies to prevent disconnection loop!
    }, [sessionId, roomCode, wsToken, allowViewersToDraw, sessionInfo]);

    useEffect(() => {
      const p = yProviderRef.current;
      if (!p) return;
      try {
        const prev = p.awareness.getLocalState() || {};
        p.awareness.setLocalState({ ...prev, color, tool });
      } catch {}
    }, [color, tool]);

    useEffect(() => () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    }, []);

    useEffect(() => {
      if (!canvasRef.current) return;
      canvasRef.current.width = BASE_W;
      canvasRef.current.height = BASE_H;
      ctxRef.current = canvasRef.current.getContext("2d");
      ctxRef.current.lineCap = "round"; 
      ctxRef.current.lineJoin = "round";
      loadWhiteboardState();
    }, [loadWhiteboardState]);

    const handlePointerDown = useCallback((e) => {
      if (!isAnnotationActive || !canvasRef.current || e.button === 2) return;
      e.preventDefault();
      try { canvasRef.current.setPointerCapture(e.pointerId); pointerIdRef.current = e.pointerId; } catch {}

      const p = getTransformedPoint(e);
      isDrawingRef.current = true;
      lastLocalPointRef.current = p;
      lastLocalMidRef.current = null;

      if (tool === "pen" || tool === "eraser") {
        const strokeId = uid();
        currentStrokeIdRef.current = strokeId;
        strokeBufferRef.current = [];
        addObject({
          id: strokeId, type: tool,
          points: [{ x: p.x, y: p.y }],
          color: tool === "eraser" ? "transparent" : color,
          strokeWidth, timestamp: Date.now(),
        });
        drawSmoothStroke(p, { x: p.x + 0.01, y: p.y + 0.01 }, tool);
      }
    }, [tool, getTransformedPoint, addObject, drawSmoothStroke, color, strokeWidth, isAnnotationActive]);

    const handlePointerMove = useCallback((e) => {
      if (!isAnnotationActive || !canvasRef.current || !isDrawingRef.current) return;
      if (tool !== "pen" && tool !== "eraser") return;

      const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e];
      for (const evt of events) {
        const next = getTransformedPoint(evt);
        const prev = lastLocalPointRef.current;
        const dist = prev ? Math.hypot(next.x - prev.x, next.y - prev.y) : 999;
        if (dist < MIN_MOVE_DIST) continue;
        if (prev) drawSmoothStroke(prev, next, tool);
        strokeBufferRef.current.push(next);
        scheduleFlush();
        lastLocalPointRef.current = next;
      }
    }, [tool, getTransformedPoint, drawSmoothStroke, scheduleFlush, isAnnotationActive]);

    const endStrokeCleanup = useCallback(() => {
      flushStrokeToYjs(true);
      currentStrokeIdRef.current = null;
      strokeBufferRef.current = [];
      lastLocalPointRef.current = null;
      lastLocalMidRef.current = null;
      if (canvasRef.current && pointerIdRef.current != null) {
        try { canvasRef.current.releasePointerCapture(pointerIdRef.current); } catch {}
      }
      pointerIdRef.current = null;
      loadWhiteboardState(); // 🔥 FIX: Force state sync after drawing finishes
    }, [flushStrokeToYjs, loadWhiteboardState]);

    const handlePointerUp = useCallback(() => { isDrawingRef.current = false; endStrokeCleanup(); }, [endStrokeCleanup]);
    const handlePointerLeave = useCallback(() => { isDrawingRef.current = false; endStrokeCleanup(); }, [endStrokeCleanup]);

    const handleClearWhiteboard = useCallback(() => {
      if (!yWhiteboardRef.current || !yDocRef.current) return;
      if (!window.confirm("Clear all annotations?")) return;
      yDocRef.current.transact(() => {
        yWhiteboardRef.current.delete(0, yWhiteboardRef.current.length);
        yWhiteboardRef.current.insert(0, [{
          version: "1.0.0", objects: [],
          clearedAt: new Date().toISOString(), clearedBy: sessionInfo?.streamerId,
        }]);
      }, "drawing");
      scheduleRedraw([]);
      toast.success("Annotations cleared");
    }, [sessionInfo, scheduleRedraw]);

    const handleUndo = useCallback(() => yUndoManagerRef.current?.undo(), []);
    const handleRedo = useCallback(() => yUndoManagerRef.current?.redo(), []);

    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 z-40 w-full h-full overflow-hidden ${isActive ? "block" : "hidden"}`}
        style={{ pointerEvents: "none" }} 
      >
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
          style={{ 
            touchAction: "none", 
            cursor: isAnnotationActive ? "crosshair" : "default", 
            zIndex: 20,
            pointerEvents: isAnnotationActive ? "auto" : "none" 
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onContextMenu={(e) => e.preventDefault()}
        />

        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30" style={{ pointerEvents: "auto" }}>
          <div className="bg-gray-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700 px-3 py-2 flex items-center gap-2 flex-wrap">

            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            
            <div className="w-px h-6 bg-gray-600 mx-1" />

            <button 
              onClick={() => setIsAnnotationActive(!isAnnotationActive)} 
              title={isAnnotationActive ? "Turn Off Drawing to click screen" : "Turn On Drawing"}
              className={`px-3 py-1.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 ${
                isAnnotationActive ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              {isAnnotationActive ? <FiEdit2 className="w-4 h-4" /> : <FiMousePointer className="w-4 h-4" />}
              {isAnnotationActive ? "Draw ON" : "Draw OFF"}
            </button>

            {isAnnotationActive && (
              <>
                <div className="w-px h-6 bg-gray-600 mx-1" />

                {[
                  { t: "pen", icon: <FaPaintBrush className="w-4 h-4" />, title: "Pen" },
                  { t: "eraser", icon: <FaEraser className="w-4 h-4" />, title: "Eraser" },
                  { t: "line", icon: <FiMinus className="w-4 h-4" />, title: "Line" },
                  { t: "rectangle", icon: <FiSquare className="w-4 h-4" />, title: "Rectangle" },
                  { t: "circle", icon: <FiCircle className="w-4 h-4" />, title: "Circle" },
                ].map(({ t, icon, title }) => (
                  <button key={t} onClick={() => setTool(t)} title={title}
                    className={`p-2 rounded-xl transition-colors ${tool === t ? "bg-gray-600 text-white" : "hover:bg-gray-700 text-gray-400"}`}>
                    {icon}
                  </button>
                ))}

                <div className="w-px h-6 bg-gray-600 mx-1" />

                <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0" title="Color" />
                <select value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="bg-gray-800 text-white text-sm rounded-lg px-2 py-1 outline-none border border-gray-600 w-16">
                  {[4, 8, 12, 16, 24].map((v) => <option key={v} value={v}>{v}px</option>)}
                </select>

                <div className="w-px h-6 bg-gray-600 mx-1" />

                <button onClick={handleUndo} title="Undo (Ctrl+Z)" className="p-2 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white">
                    <FiRefreshCcw className="w-4 h-4" />
                </button>
                <button onClick={handleRedo} title="Redo (Ctrl+Y)" className="p-2 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white">
                    <FiRefreshCcw className="w-4 h-4 transform scale-x-[-1]" />
                </button>

                <div className="w-px h-6 bg-gray-600 mx-1" />

                <button onClick={handleClearWhiteboard} title="Clear Annotations" className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-colors">
                    <FiTrash2 className="w-4 h-4" />
                </button>
              </>
            )}

            <div className="w-px h-6 bg-gray-600 mx-1" />
            <button onClick={onClose} title="Close Annotation" className="p-2 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-colors">
                <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) => {
    if (prev.sessionId !== next.sessionId) return false;
    if (prev.isActive !== next.isActive) return false;
    return true;
  }
);

ScreenAnnotationWhiteboard.displayName = "ScreenAnnotationWhiteboard";
export default ScreenAnnotationWhiteboard;