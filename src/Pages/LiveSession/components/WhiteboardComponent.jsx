import React, {
  useState, useEffect, useRef, useCallback, memo,
} from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";
import {
  FiSquare, FiCircle, FiMinus, FiDownload, FiRefreshCcw,
  FiTrash2, FiMove, FiPlus, FiMinusCircle, FiX, FiImage,
  FiMousePointer
} from "react-icons/fi";
import { FaEraser, FaPaintBrush } from "react-icons/fa";
import { toast } from "react-toastify";

// ─── constants ────────────────────────────────────────────────────────────────
const DEFAULT_MEDIA_W = 480;
const DEFAULT_MEDIA_H = 270;
const FLUSH_INTERVAL  = 50;   // ms — throttle Yjs stroke sync
const MIN_MOVE_DIST   = 0.6;  // px — ignore pointer jitter
const BASE_W = 1920;
const BASE_H = 1080;

// ─── helpers ──────────────────────────────────────────────────────────────────
function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function pointToLineDist(p, v, w) {
  const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x)*(w.x - v.x) + (p.y - v.y)*(w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t*(w.x - v.x)), p.y - (v.y + t*(w.y - v.y)));
}

// ─── StreamerWhiteboard ───────────────────────────────────────────────────────
const StreamerWhiteboard = memo(
  ({
    sessionId,
    roomCode,
    wsToken,
    sessionInfo,
    isActive,
    onClose,
    allowViewersToDraw = true,
    mainScreenMode     = false,
    compact            = false,
  }) => {
    // ── canvas refs ──
    const canvasRef           = useRef(null);
    const backgroundCanvasRef = useRef(null);
    const ctxRef              = useRef(null);
    const bgCtxRef            = useRef(null);
    const containerRef        = useRef(null);

    // ── Yjs refs ──
    const yDocRef          = useRef(null);
    const yProviderRef     = useRef(null);
    const yWhiteboardRef   = useRef(null);
    const ySettingsRef     = useRef(null);
    const yUndoManagerRef  = useRef(null);
    const yObserverCleanup = useRef(null);

    // ── media caches ──
    const imageCacheRef = useRef(new Map());

    // ── raf / flush ──
    const rafIdRef        = useRef(null);
    const pendingObjsRef  = useRef(null);
    const flushTimerRef   = useRef(null);
    const pendingUpdateRef= useRef(null); // Used for dragging/resizing

    // ── stroke & shapes state ──
    const currentStrokeIdRef  = useRef(null);
    const strokeBufferRef     = useRef([]);
    const lastLocalPointRef   = useRef(null);
    const lastLocalMidRef     = useRef(null);
    const pointerIdRef        = useRef(null);
    const shapeStartRef       = useRef(null);

    // ── pan ──
    const lastPanPointRef  = useRef({ x: 0, y: 0 });
    const canvasOffsetRef  = useRef({ x: 0, y: 0 });
    const lastPointRef     = useRef({ x: 0, y: 0 });

    // ── selected object (for move/delete/resize) ──
    const selectedIdRef = useRef(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const isResizingRef = useRef(false);

    // ── state ──
    const [tool,            setTool]            = useState("pen");
    const [color,           setColor]           = useState("#000000");
    const [strokeWidth,     setStrokeWidth]     = useState(2);
    const [opacity,         setOpacity]         = useState(1);
    const [currentZoom,     setCurrentZoom]     = useState(1);
    const [isConnected,     setIsConnected]     = useState(false);
    const [participants,    setParticipants]    = useState([]);
    const [backgroundColor, setBackgroundColor] = useState("#ffffff");
    const [isGridVisible,   setIsGridVisible]   = useState(false);
    const [isPanning,       setIsPanning]       = useState(false);
    const [isDrawing,       setIsDrawing]       = useState(false);
    const [selectedId,      setSelectedId]      = useState(null);

    const fileInputRef       = useRef(null);

    // ═══════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════
    const getTransformedPoint = useCallback((e) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect   = canvasRef.current.getBoundingClientRect();
      const scaleX = BASE_W / rect.width;
      const scaleY = BASE_H / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top)  * scaleY;
      return {
        x: (x - canvasOffsetRef.current.x) / currentZoom,
        y: (y - canvasOffsetRef.current.y) / currentZoom,
      };
    }, [currentZoom]);

    const getCurrentObjects = useCallback(() => {
      if (!yWhiteboardRef.current || yWhiteboardRef.current.length === 0) return [];
      return (yWhiteboardRef.current.toArray()[0]?.objects) || [];
    }, []);

    // ═══════════════════════════════════════════════════════
    // Yjs write helpers
    // ═══════════════════════════════════════════════════════
    const commitState = useCallback((updater) => {
      if (!yWhiteboardRef.current || !yDocRef.current) return;
      yDocRef.current.transact(() => {
        const cur = yWhiteboardRef.current.toArray()[0] || {
          version: "1.0.0", objects: [], background: backgroundColor,
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
    }, [backgroundColor]);

    const addObject = useCallback((obj) => {
      commitState((cur) => ({
        ...cur,
        objects: [...(cur.objects || []), obj],
        updatedBy: sessionInfo?.streamerId,
        updatedAt: new Date().toISOString(),
      }));
    }, [commitState, sessionInfo]);

    const deleteObject = useCallback((id) => {
      commitState((cur) => ({
        ...cur,
        objects: (cur.objects || []).filter((o) => o.id !== id),
        updatedBy: sessionInfo?.streamerId,
        updatedAt: new Date().toISOString(),
      }));
      if (selectedIdRef.current === id) {
        selectedIdRef.current = null;
        setSelectedId(null);
      }
    }, [commitState, sessionInfo]);

    const updateObject = useCallback((id, patch) => {
      commitState((cur) => ({
        ...cur,
        objects: (cur.objects || []).map((o) => o.id === id ? { ...o, ...patch } : o),
        updatedBy: sessionInfo?.streamerId,
        updatedAt: new Date().toISOString(),
      }));
    }, [commitState, sessionInfo]);

    // ═══════════════════════════════════════════════════════
    // Drawing & Hit Test
    // ═══════════════════════════════════════════════════════
    const drawGrid = useCallback((ctx, w, h) => {
      ctx.save();
      ctx.strokeStyle = "#e0e0e0";
      ctx.lineWidth   = 0.5;
      ctx.globalAlpha = 0.3;
      const gs = 20;
      for (let x = 0; x <= w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y <= h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.restore();
    }, []);

    const drawObject = useCallback((ctx, obj) => {
      if (!obj) return;
      ctx.save();
      ctx.strokeStyle = obj.color       || "#000000";
      ctx.fillStyle   = obj.fillColor   || "transparent";
      ctx.lineWidth   = (obj.strokeWidth || 2) / currentZoom;
      ctx.globalAlpha = obj.opacity     ?? 1;

      switch (obj.type) {
        case "pen":
        case "pencil":
        case "eraser": {
          if (!obj.points?.length) break;
          if (obj.type === "eraser") ctx.globalCompositeOperation = "destination-out";
          ctx.beginPath();
          ctx.moveTo(obj.points[0].x, obj.points[0].y);
          obj.points.forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.stroke();
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
        case "text": {
          ctx.font      = `${obj.fontSize || 16}px Arial`;
          ctx.fillStyle = obj.color || "#000";
          ctx.fillText(obj.text || "", obj.x, obj.y);
          break;
        }
        case "image": {
          let img = imageCacheRef.current.get(obj.id);
          if (!img) {
            img       = new Image();
            img.src   = obj.src;
            img.onload = () => scheduleRedraw(getCurrentObjects());
            imageCacheRef.current.set(obj.id, img);
          }
          if (img.complete && img.naturalWidth > 0) {
            ctx.globalAlpha = obj.opacity ?? 1;
            ctx.drawImage(img, obj.x, obj.y, obj.width || DEFAULT_MEDIA_W, obj.height || DEFAULT_MEDIA_H);
          } else {
            ctx.strokeStyle = "#aaa"; ctx.strokeRect(obj.x, obj.y, obj.width || DEFAULT_MEDIA_W, obj.height || DEFAULT_MEDIA_H);
            ctx.fillStyle   = "#eee"; ctx.font = "14px Arial";
            ctx.fillText("Loading image…", obj.x + 8, obj.y + 20);
          }
          break;
        }
        default: break;
      }

      // Selection Highlight & Resize Handle (for rect, image, circle, line)
      if (selectedIdRef.current === obj.id && tool === "select") {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2 / currentZoom;
        ctx.setLineDash([6 / currentZoom, 3 / currentZoom]);

        let hx, hy; // handle coordinates

        if (["rectangle", "image"].includes(obj.type)) {
          const bw = obj.width || DEFAULT_MEDIA_W;
          const bh = obj.height || DEFAULT_MEDIA_H;
          ctx.strokeRect(obj.x - 2, obj.y - 2, bw + 4, bh + 4);
          hx = obj.x + bw; hy = obj.y + bh;
        } else if (obj.type === "circle") {
          const bw = obj.radius * 2;
          ctx.strokeRect(obj.x - obj.radius - 2, obj.y - obj.radius - 2, bw + 4, bw + 4);
          hx = obj.x + obj.radius * 0.707; hy = obj.y + obj.radius * 0.707; // 45 deg angle
        } else if (obj.type === "line") {
          hx = obj.x2; hy = obj.y2;
        }

        ctx.setLineDash([]);

        // Draw Handle
        if (hx !== undefined && hy !== undefined) {
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 2 / currentZoom;
          ctx.beginPath();
          ctx.arc(hx, hy, 6 / currentZoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentZoom, tool]);

    const hitTest = useCallback((pt) => {
      const objs = getCurrentObjects();
      for (let i = objs.length - 1; i >= 0; i--) {
        const o = objs[i];
        if (["image", "rectangle"].includes(o.type)) {
          const w = o.width || DEFAULT_MEDIA_W;
          const h = o.height || DEFAULT_MEDIA_H;
          if (pt.x >= o.x && pt.x <= o.x + w && pt.y >= o.y && pt.y <= o.y + h) return o;
        } else if (o.type === "circle") {
          if (Math.hypot(pt.x - o.x, pt.y - o.y) <= o.radius) return o;
        } else if (o.type === "line") {
          if (pointToLineDist(pt, {x: o.x1, y: o.y1}, {x: o.x2, y: o.y2}) < 15 / currentZoom) return o;
        }
      }
      return null;
    }, [getCurrentObjects, currentZoom]);

    const hitTestHandle = useCallback((pt, obj) => {
      let hx, hy;
      if (["rectangle", "image"].includes(obj.type)) {
        hx = obj.x + (obj.width || DEFAULT_MEDIA_W);
        hy = obj.y + (obj.height || DEFAULT_MEDIA_H);
      } else if (obj.type === "circle") {
        hx = obj.x + obj.radius * 0.707; 
        hy = obj.y + obj.radius * 0.707;
      } else if (obj.type === "line") {
        hx = obj.x2; hy = obj.y2;
      } else return false;

      return Math.hypot(pt.x - hx, pt.y - hy) < 15 / currentZoom;
    }, [currentZoom]);

    const redrawCanvas = useCallback((objects) => {
      if (!ctxRef.current || !bgCtxRef.current || !canvasRef.current) return;
      const ctx    = ctxRef.current;
      const bgCtx  = bgCtxRef.current;
      const canvas = canvasRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      bgCtx.clearRect(0, 0, canvas.width, canvas.height);

      bgCtx.fillStyle = backgroundColor;
      bgCtx.fillRect(0, 0, canvas.width, canvas.height);
      if (isGridVisible) drawGrid(bgCtx, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
      ctx.scale(currentZoom, currentZoom);
      (objects || []).forEach((obj) => drawObject(ctx, obj));
      ctx.restore();
    }, [backgroundColor, isGridVisible, currentZoom, drawGrid, drawObject]);

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
        if (state.background) setBackgroundColor(state.background);
        scheduleRedraw(Array.isArray(state.objects) ? state.objects : []);
      } catch (e) { console.error(e); }
    }, [scheduleRedraw]);

    // ═══════════════════════════════════════════════════════
    // Smooth stroke & Shape flushing
    // ═══════════════════════════════════════════════════════
    const drawSmoothStroke = useCallback((prev, next, strokeType) => {
      if (!ctxRef.current) return;
      const ctx = ctxRef.current;
      ctx.save();
      ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
      ctx.scale(currentZoom, currentZoom);
      ctx.lineCap   = "round";
      ctx.lineJoin  = "round";
      ctx.globalAlpha = opacity ?? 1;
      ctx.lineWidth   = (strokeWidth || 2) / currentZoom;

      if (strokeType === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color || "#000000";
      }

      const mid = { x: (prev.x + next.x) / 2, y: (prev.y + next.y) / 2 };
      if (!lastLocalMidRef.current) lastLocalMidRef.current = { x: prev.x, y: prev.y };
      ctx.beginPath();
      ctx.moveTo(lastLocalMidRef.current.x, lastLocalMidRef.current.y);
      ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
      ctx.stroke();
      lastLocalMidRef.current = mid;
      ctx.restore();
    }, [currentZoom, color, strokeWidth, opacity]);

    const flushStrokeToYjs = useCallback(() => {
      const strokeId = currentStrokeIdRef.current;
      if (!strokeId) return;
      const buffered = strokeBufferRef.current;
      if (!buffered.length) return;
      const pts = buffered.slice();
      strokeBufferRef.current = [];

      commitState((cur) => {
        const objs   = [...(cur.objects || [])];
        const idx    = objs.findIndex((o) => o?.id === strokeId);
        if (idx === -1) return cur;
        const target = { ...objs[idx] };
        target.points = [...(target.points || []), ...pts];
        objs[idx] = target;
        return { ...cur, objects: objs, updatedAt: new Date().toISOString() };
      });
    }, [commitState]);

    const flushShapeToYjs = useCallback((currentPoint) => {
      const strokeId = currentStrokeIdRef.current;
      const startP = shapeStartRef.current;
      if (!strokeId || !startP || !currentPoint) return;

      commitState((cur) => {
        const objs   = [...(cur.objects || [])];
        const idx    = objs.findIndex((o) => o?.id === strokeId);
        if (idx === -1) return cur;
        const target = { ...objs[idx] };
        
        if (target.type === "rectangle") {
          target.width = currentPoint.x - startP.x;
          target.height = currentPoint.y - startP.y;
        } else if (target.type === "circle") {
          target.radius = Math.hypot(currentPoint.x - startP.x, currentPoint.y - startP.y);
        } else if (target.type === "line") {
          target.x2 = currentPoint.x;
          target.y2 = currentPoint.y;
        }
        
        objs[idx] = target;
        return { ...cur, objects: objs, updatedAt: new Date().toISOString() };
      });
    }, [commitState]);

    const scheduleFlush = useCallback(() => {
      if (flushTimerRef.current) return;
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        if (tool === "pen" || tool === "eraser") {
          flushStrokeToYjs();
        } else if (["line", "rectangle", "circle"].includes(tool)) {
          flushShapeToYjs(lastPointRef.current);
        }
      }, FLUSH_INTERVAL);
    }, [flushStrokeToYjs, flushShapeToYjs, tool]);

    // ═══════════════════════════════════════════════════════
    // Yjs init
    // ═══════════════════════════════════════════════════════
    useEffect(() => {
      if (!sessionId || !wsToken) return;

      const initYjs = async () => {
        try {
          const ydoc      = new Y.Doc();
          yDocRef.current = ydoc;

          const baseWs   = import.meta.env.VITE_WS_URL || "ws://localhost:9090";
          const provider = new WebsocketProvider(`${baseWs}/yjs`, sessionId, ydoc, {
            WebSocketPolyfill: WebSocket,
            params: {
              token: wsToken, isStreamer: true, allowViewersToDraw,
              roomCode, userId: sessionInfo?.streamerId, userName: sessionInfo?.streamerName,
            },
          });
          yProviderRef.current  = provider;

          const yWhiteboard      = ydoc.getArray("whiteboard");
          yWhiteboardRef.current = yWhiteboard;

          const ySettings        = ydoc.getMap("room_settings");
          ySettingsRef.current   = ySettings;

          provider.awareness.setLocalState({
            userId: sessionInfo?.streamerId || "streamer",
            userName: sessionInfo?.streamerName || "Streamer",
            role: "STREAMER", isStreamer: true, color, tool, cursor: null,
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

          new IndexeddbPersistence(`whiteboard-${sessionId}`, ydoc);

          const observer = (event) => {
            const origin = event?.transaction?.origin;
            if (origin === "drawing" && (isDrawing || currentStrokeIdRef.current)) return;
            loadWhiteboardState();
          };
          yWhiteboard.observe(observer);
          yObserverCleanup.current = () => { try { yWhiteboard.unobserve(observer); } catch {} };

        } catch (err) {
          console.error("Failed to init Yjs:", err);
          toast.error("Failed to connect to whiteboard server");
        }
      };

      initYjs();

      return () => {
        try { 
          if (tool === "pen" || tool === "eraser") flushStrokeToYjs(true); 
          else flushShapeToYjs(lastPointRef.current);
        } catch {}
        if (yObserverCleanup.current) { yObserverCleanup.current(); yObserverCleanup.current = null; }
        if (yProviderRef.current) { try { yProviderRef.current.disconnect(); yProviderRef.current.destroy(); } catch {} }
        if (yDocRef.current)      { try { yDocRef.current.destroy(); } catch {} }
        yProviderRef.current = yDocRef.current = yWhiteboardRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, roomCode, wsToken, allowViewersToDraw, sessionInfo]);

    // keep awareness fresh
    useEffect(() => {
      const p = yProviderRef.current;
      if (!p) return;
      try {
        const prev = p.awareness.getLocalState() || {};
        p.awareness.setLocalState({ ...prev, color, tool,
          userId: sessionInfo?.streamerId || "streamer",
          userName: sessionInfo?.streamerName || "Streamer",
          role: "STREAMER", isStreamer: true,
        });
      } catch {}
    }, [color, tool, sessionInfo]);

    // cleanup timers
    useEffect(() => () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      if (rafIdRef.current)      cancelAnimationFrame(rafIdRef.current);
    }, []);

    // ═══════════════════════════════════════════════════════
    // Canvas init + resize
    // ═══════════════════════════════════════════════════════
    useEffect(() => {
      if (!canvasRef.current || !backgroundCanvasRef.current || !containerRef.current) return;
      const canvas    = canvasRef.current;
      const bgCanvas  = backgroundCanvasRef.current;
      const container = containerRef.current;

      const resize = () => {
        canvas.width  = bgCanvas.width  = container.clientWidth;
        canvas.height = bgCanvas.height = container.clientHeight;
        const ctx   = canvas.getContext("2d");
        const bgCtx = bgCanvas.getContext("2d");
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctxRef.current = ctx; bgCtxRef.current = bgCtx;
        
        // Internal resolution fix
        canvas.width = BASE_W;
        canvas.height = BASE_H;
        bgCanvas.width = BASE_W;
        bgCanvas.height = BASE_H;
        
        if (yWhiteboardRef.current) {
          const s = yWhiteboardRef.current.toArray()[0] || {};
          scheduleRedraw(s.objects || []);
        }
      };

      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(container);
      return () => ro.disconnect();
    }, [scheduleRedraw]);

    // ═══════════════════════════════════════════════════════
    // Paste handler — Ctrl+V image
    // ═══════════════════════════════════════════════════════
    useEffect(() => {
      const handlePaste = async (e) => {
        for (const item of e.clipboardData.items) {
          if (item.type.startsWith("image/")) {
            const file   = item.getAsFile();
            const b64    = await fileToBase64(file);
            const img    = new Image();
            img.src      = b64;
            img.onload   = () => {
              const ratio = img.naturalWidth / img.naturalHeight;
              const w     = Math.min(img.naturalWidth, DEFAULT_MEDIA_W);
              const h     = w / ratio;
              addObject({
                id: uid(), type: "image", src: b64,
                x: 80, y: 80, width: w, height: h,
                opacity: 1, timestamp: Date.now(),
              });
            };
            break;
          }
        }
      };
      window.addEventListener("paste", handlePaste);
      return () => window.removeEventListener("paste", handlePaste);
    }, [addObject]);

    // ═══════════════════════════════════════════════════════
    // Keyboard — Delete selected
    // ═══════════════════════════════════════════════════════
    useEffect(() => {
      const handleKey = (e) => {
        if ((e.key === "Delete" || e.key === "Backspace") && selectedIdRef.current) {
          if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
          deleteObject(selectedIdRef.current);
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "z") {
          e.preventDefault();
          yUndoManagerRef.current?.undo();
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
          e.preventDefault();
          yUndoManagerRef.current?.redo();
        }
      };
      window.addEventListener("keydown", handleKey);
      return () => window.removeEventListener("keydown", handleKey);
    }, [deleteObject]);

    // ═══════════════════════════════════════════════════════
    // Image upload handler
    // ═══════════════════════════════════════════════════════
    const handleImageUpload = useCallback(async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { toast.error("Image must be < 10MB"); return; }
      const b64  = await fileToBase64(file);
      const img  = new Image();
      img.src    = b64;
      img.onload = () => {
        const ratio = img.naturalWidth / img.naturalHeight;
        const w     = Math.min(img.naturalWidth, DEFAULT_MEDIA_W);
        const h     = w / ratio;
        addObject({ id: uid(), type: "image", src: b64, x: 80, y: 80, width: w, height: h, opacity: 1, timestamp: Date.now() });
      };
      e.target.value = "";
    }, [addObject]);

    // ═══════════════════════════════════════════════════════
    // Pointer events
    // ═══════════════════════════════════════════════════════
    const handlePointerDown = useCallback((e) => {
      e.preventDefault();
      if (!canvasRef.current || e.button === 2) return;
      try { canvasRef.current.setPointerCapture(e.pointerId); pointerIdRef.current = e.pointerId; } catch {}

      if (tool === "pan" || e.altKey || e.button === 1) {
        setIsPanning(true);
        lastPanPointRef.current = { x: e.clientX, y: e.clientY };
        canvasRef.current.style.cursor = "grabbing";
        return;
      }

      const p = getTransformedPoint(e);

      // Select / Move / Resize tool
      if (tool === "select") {
        const objs = getCurrentObjects();
        const selObj = objs.find(o => o.id === selectedIdRef.current);
        
        // 1. Check if Handle is clicked (Resize)
        if (selObj && hitTestHandle(p, selObj)) {
          isResizingRef.current = true;
          return;
        }

        // 2. Check if Object is clicked (Drag/Move)
        const hit = hitTest(p);
        if (hit) {
          selectedIdRef.current = hit.id;
          setSelectedId(hit.id);
          dragOffsetRef.current = { 
            x: p.x - (hit.type === 'line' ? hit.x1 : hit.x), 
            y: p.y - (hit.type === 'line' ? hit.y1 : hit.y) 
          };
          isDraggingRef.current = true;
        } else {
          selectedIdRef.current = null;
          setSelectedId(null);
        }
        scheduleRedraw(getCurrentObjects());
        return;
      }

      setIsDrawing(true);
      lastPointRef.current      = p;
      lastLocalPointRef.current = p;
      lastLocalMidRef.current   = null;
      shapeStartRef.current     = p; // Set the origin point for shapes

      const strokeId = uid();
      currentStrokeIdRef.current = strokeId;

      if (tool === "pen" || tool === "eraser") {
        strokeBufferRef.current    = [];
        addObject({
          id: strokeId, type: tool,
          points: [{ x: p.x, y: p.y }],
          color: tool === "eraser" ? backgroundColor : color,
          strokeWidth, opacity, timestamp: Date.now(),
        });
        drawSmoothStroke(p, { x: p.x + 0.01, y: p.y + 0.01 }, tool);
      } else if (["line", "rectangle", "circle"].includes(tool)) {
         const baseObj = {
            id: strokeId, type: tool,
            x: p.x, y: p.y,
            color, strokeWidth, opacity, timestamp: Date.now()
         };
         if (tool === "line") { baseObj.x1 = p.x; baseObj.y1 = p.y; baseObj.x2 = p.x; baseObj.y2 = p.y; }
         if (tool === "rectangle") { baseObj.width = 0; baseObj.height = 0; }
         if (tool === "circle") { baseObj.radius = 0; }
         addObject(baseObj);
      }
    }, [tool, getTransformedPoint, hitTestHandle, hitTest, addObject, drawSmoothStroke, scheduleRedraw, getCurrentObjects, backgroundColor, color, strokeWidth, opacity]);

    const handlePointerMove = useCallback((e) => {
      if (!canvasRef.current) return;

      if (isPanning) {
        const dx = e.clientX - lastPanPointRef.current.x;
        const dy = e.clientY - lastPanPointRef.current.y;
        canvasOffsetRef.current.x += dx;
        canvasOffsetRef.current.y += dy;
        lastPanPointRef.current = { x: e.clientX, y: e.clientY };
        scheduleRedraw(getCurrentObjects());
        return;
      }

      const p = getTransformedPoint(e);

      // Drag or Resize media object
      if (tool === "select" && selectedIdRef.current) {
        if (isResizingRef.current) {
          const objs = getCurrentObjects();
          const selObj = objs.find(o => o.id === selectedIdRef.current);
          if (!selObj) return;

          let patch = {};
          if (["rectangle", "image"].includes(selObj.type)) {
            patch.width = Math.max(20, p.x - selObj.x);
            patch.height = Math.max(20, p.y - selObj.y);
          } else if (selObj.type === "circle") {
            patch.radius = Math.max(10, Math.hypot(p.x - selObj.x, p.y - selObj.y));
          } else if (selObj.type === "line") {
            patch.x2 = p.x;
            patch.y2 = p.y;
          }
          pendingUpdateRef.current = patch;

        } else if (isDraggingRef.current) {
          const selObj = getCurrentObjects().find(o => o.id === selectedIdRef.current);
          if (!selObj) return;

          let patch = {};
          const newX = p.x - dragOffsetRef.current.x;
          const newY = p.y - dragOffsetRef.current.y;

          if (selObj.type === "line") {
            const dx = newX - selObj.x1;
            const dy = newY - selObj.y1;
            patch.x1 = newX;
            patch.y1 = newY;
            patch.x2 = selObj.x2 + dx;
            patch.y2 = selObj.y2 + dy;
          } else {
            patch.x = newX;
            patch.y = newY;
          }
          pendingUpdateRef.current = patch;
        }

        if (pendingUpdateRef.current) {
          // Instant Local Feedback
          const tempObjs = getCurrentObjects().map(o => o.id === selectedIdRef.current ? { ...o, ...pendingUpdateRef.current } : o);
          redrawCanvas(tempObjs);

          // Throttled Network Sync
          if (!flushTimerRef.current) {
            flushTimerRef.current = setTimeout(() => {
                flushTimerRef.current = null;
                if (pendingUpdateRef.current) {
                    updateObject(selectedIdRef.current, pendingUpdateRef.current);
                    pendingUpdateRef.current = null;
                }
            }, FLUSH_INTERVAL);
          }
        }
        return;
      }

      if (!isDrawing) return;

      if (tool === "pen" || tool === "eraser") {
        const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e];
        for (const evt of events) {
          const next = getTransformedPoint(evt);
          const prev = lastLocalPointRef.current || lastPointRef.current;
          const dist = prev ? Math.hypot(next.x - prev.x, next.y - prev.y) : 999;
          if (dist < MIN_MOVE_DIST) continue;
          if (prev) drawSmoothStroke(prev, next, tool);
          strokeBufferRef.current.push(next);
          scheduleFlush();
          lastLocalPointRef.current = next;
          lastPointRef.current      = next;
        }
      } else if (["line", "rectangle", "circle"].includes(tool)) {
        lastPointRef.current = p;

        // Instant local UI feedback
        redrawCanvas(getCurrentObjects());
        const ctx = ctxRef.current;
        ctx.save();
        ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
        ctx.scale(currentZoom, currentZoom);
        ctx.strokeStyle = color;
        ctx.lineWidth = (strokeWidth || 2) / currentZoom;
        ctx.globalAlpha = opacity ?? 1;

        if (tool === "rectangle") {
            ctx.strokeRect(shapeStartRef.current.x, shapeStartRef.current.y, p.x - shapeStartRef.current.x, p.y - shapeStartRef.current.y);
        } else if (tool === "circle") {
            ctx.beginPath();
            ctx.arc(shapeStartRef.current.x, shapeStartRef.current.y, Math.hypot(p.x - shapeStartRef.current.x, p.y - shapeStartRef.current.y), 0, Math.PI * 2);
            ctx.stroke();
        } else if (tool === "line") {
            ctx.beginPath();
            ctx.moveTo(shapeStartRef.current.x, shapeStartRef.current.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        }
        ctx.restore();

        // Throttled sync to network
        if (!flushTimerRef.current) {
          flushTimerRef.current = setTimeout(() => {
              flushTimerRef.current = null;
              flushShapeToYjs(lastPointRef.current);
          }, FLUSH_INTERVAL);
        }
      }
    }, [isDrawing, isPanning, tool, getTransformedPoint, drawSmoothStroke, scheduleFlush, flushShapeToYjs, scheduleRedraw, getCurrentObjects, updateObject, redrawCanvas, color, strokeWidth, opacity, currentZoom]);

    const endStrokeCleanup = useCallback(() => {
      if (tool === "pen" || tool === "eraser") {
         flushStrokeToYjs(true);
      } else if (["line", "rectangle", "circle"].includes(tool)) {
         flushShapeToYjs(lastPointRef.current);
      } else if (tool === "select" && pendingUpdateRef.current) {
         updateObject(selectedIdRef.current, pendingUpdateRef.current);
         pendingUpdateRef.current = null;
      }
      
      currentStrokeIdRef.current = null;
      strokeBufferRef.current    = [];
      lastLocalPointRef.current  = null;
      lastLocalMidRef.current    = null;
      shapeStartRef.current      = null;
      isDraggingRef.current      = false;
      isResizingRef.current      = false;

      if (canvasRef.current && pointerIdRef.current != null) {
        try { canvasRef.current.releasePointerCapture(pointerIdRef.current); } catch {}
      }
      pointerIdRef.current = null;
    }, [flushStrokeToYjs, flushShapeToYjs, tool, updateObject]);

    const handlePointerUp    = useCallback(() => { setIsDrawing(false); setIsPanning(false); endStrokeCleanup(); if (canvasRef.current) canvasRef.current.style.cursor = tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair"; }, [tool, endStrokeCleanup]);
    const handlePointerLeave = useCallback(() => { setIsDrawing(false); setIsPanning(false); endStrokeCleanup(); }, [endStrokeCleanup]);

    // ── wheel zoom ──
    const handleWheel = useCallback((e) => {
      e.preventDefault();
      if (!canvasRef.current) return;
      const rect   = canvasRef.current.getBoundingClientRect();
      const scaleX = BASE_W / rect.width;
      const scaleY = BASE_H / rect.height;
      const mx     = (e.clientX - rect.left) * scaleX;
      const my     = (e.clientY - rect.top) * scaleY;
      
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZ   = Math.max(0.5, Math.min(3, currentZoom * factor));
      const change = newZ / currentZoom;
      
      canvasOffsetRef.current.x = mx - (mx - canvasOffsetRef.current.x) * change;
      canvasOffsetRef.current.y = my - (my - canvasOffsetRef.current.y) * change;
      setCurrentZoom(newZ);
      scheduleRedraw(getCurrentObjects());
    }, [currentZoom, scheduleRedraw, getCurrentObjects]);

    const handleZoomIn    = useCallback(() => { setCurrentZoom((p) => Math.min(p + 0.1, 3));  scheduleRedraw(getCurrentObjects()); }, [scheduleRedraw, getCurrentObjects]);
    const handleZoomOut   = useCallback(() => { setCurrentZoom((p) => Math.max(p - 0.1, 0.5)); scheduleRedraw(getCurrentObjects()); }, [scheduleRedraw, getCurrentObjects]);
    const handleZoomReset = useCallback(() => { setCurrentZoom(1); canvasOffsetRef.current = { x: 0, y: 0 }; scheduleRedraw(getCurrentObjects()); }, [scheduleRedraw, getCurrentObjects]);

    const cursorStyle = tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair";

    // ═══════════════════════════════════════════════════════
    // Whiteboard actions
    // ═══════════════════════════════════════════════════════
    const handleClearWhiteboard = useCallback(() => {
      if (!yWhiteboardRef.current || !yDocRef.current) return;
      if (!window.confirm("Clear entire whiteboard?")) return;
      yDocRef.current.transact(() => {
        yWhiteboardRef.current.delete(0, yWhiteboardRef.current.length);
        yWhiteboardRef.current.insert(0, [{
          version: "1.0.0", objects: [], background: backgroundColor,
          clearedAt: new Date().toISOString(), clearedBy: sessionInfo?.streamerId,
        }]);
      }, "drawing");
      imageCacheRef.current.clear();
      scheduleRedraw([]);
      toast.success("Whiteboard cleared");
    }, [backgroundColor, sessionInfo, scheduleRedraw]);

    const handleExport = useCallback(() => {
      if (!canvasRef.current || !backgroundCanvasRef.current) return;
      const exp = document.createElement("canvas");
      exp.width  = canvasRef.current.width;
      exp.height = canvasRef.current.height;
      const ctx  = exp.getContext("2d");
      ctx.drawImage(backgroundCanvasRef.current, 0, 0);
      ctx.drawImage(canvasRef.current,           0, 0);
      const link     = document.createElement("a");
      link.download  = `whiteboard-${sessionId}-${Date.now()}.png`;
      link.href      = exp.toDataURL("image/png");
      link.click();
      toast.success("Whiteboard exported");
    }, [sessionId]);

    const handleUndo = useCallback(() => yUndoManagerRef.current?.undo(), []);
    const handleRedo = useCallback(() => yUndoManagerRef.current?.redo(), []);

    const handleDeleteSelected = useCallback(() => {
      if (selectedIdRef.current) deleteObject(selectedIdRef.current);
    }, [deleteObject]);

    // ═══════════════════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════════════════
    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 z-20 w-full h-full bg-gray-900 overflow-hidden ${isActive ? "block" : "hidden"}`}
        onWheel={handleWheel}
      >
        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        {/* Background canvas */}
        <canvas ref={backgroundCanvasRef} className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: "none" }} />

        {/* Main drawing canvas */}
        <canvas
          ref={canvasRef}
          className={`absolute top-0 left-0 w-full h-full`}
          style={{ touchAction: "none", cursor: cursorStyle, zIndex: 20 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* ── Top Toolbar ── */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700 px-2 py-1.5 flex items-center gap-1.5 flex-wrap">

            {/* Connection status */}
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-white text-xs mr-1">{isConnected ? "Live" : "Offline"}</span>

            <div className="w-px h-5 bg-gray-600" />

            {/* Draw tools */}
            {[
              { t: "pen",       icon: <FaPaintBrush className="w-3.5 h-3.5" />,   title: "Pen" },
              { t: "eraser",    icon: <FaEraser     className="w-3.5 h-3.5" />,   title: "Eraser" },
              { t: "line",      icon: <FiMinus      className="w-3.5 h-3.5" />,   title: "Line" },
              { t: "rectangle", icon: <FiSquare     className="w-3.5 h-3.5" />,   title: "Rectangle" },
              { t: "circle",    icon: <FiCircle     className="w-3.5 h-3.5" />,   title: "Circle" },
              { t: "select",    icon: <FiMousePointer className="w-3.5 h-3.5" />, title: "Select / Move / Resize" },
              { t: "pan",       icon: <FiMove       className="w-3.5 h-3.5" />,   title: "Pan (Alt+Drag)" },
            ].map(({ t, icon, title }) => (
              <button key={t} onClick={() => setTool(t)} title={title}
                className={`p-1.5 rounded-lg transition-colors ${tool === t ? "bg-blue-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"}`}>
                {icon}
              </button>
            ))}

            <div className="w-px h-5 bg-gray-600" />

            {/* Color + stroke */}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-gray-600" title="Color" />
            <select value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="bg-gray-700 text-white text-xs rounded px-1.5 py-1 border border-gray-600 w-14">
              {[1,2,3,5,8].map((v) => <option key={v} value={v}>{v}px</option>)}
            </select>
            <select value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
              className="bg-gray-700 text-white text-xs rounded px-1.5 py-1 border border-gray-600 w-14">
              {[1,0.8,0.6,0.4].map((v) => <option key={v} value={v}>{v*100}%</option>)}
            </select>

            <div className="w-px h-5 bg-gray-600" />

            {/* Image insert button */}
            <button onClick={() => fileInputRef.current?.click()} title="Upload Image"
              className="p-1.5 bg-gray-700 hover:bg-green-700 rounded-lg transition-colors text-gray-300 hover:text-white">
              <FiImage className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-5 bg-gray-600" />

            {/* Delete selected */}
            {selectedId && (
              <button onClick={handleDeleteSelected} title="Delete selected (Del)"
                className="p-1.5 bg-red-700 hover:bg-red-600 rounded-lg transition-colors text-white">
                <FiTrash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Zoom */}
            <button onClick={handleZoomOut}   title="Zoom Out"  className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiMinusCircle className="w-3.5 h-3.5 text-white"/></button>
            <span className="text-white text-xs min-w-[44px] text-center">{Math.round(currentZoom * 100)}%</span>
            <button onClick={handleZoomIn}    title="Zoom In"   className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiPlus className="w-3.5 h-3.5 text-white"/></button>
            <button onClick={handleZoomReset} title="Reset Zoom" className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiRefreshCcw className="w-3.5 h-3.5 text-white"/></button>

            <div className="w-px h-5 bg-gray-600" />

            {/* Undo/Redo */}
            <button onClick={handleUndo} title="Undo (Ctrl+Z)"             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiRefreshCcw className="w-3.5 h-3.5 text-white"/></button>
            <button onClick={handleRedo} title="Redo (Ctrl+Y)"             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiRefreshCcw className="w-3.5 h-3.5 text-white transform scale-x-[-1]"/></button>

            {/* Grid */}
            <button onClick={() => setIsGridVisible((v) => !v)} title="Toggle Grid"
              className={`p-1.5 rounded-lg transition-colors ${isGridVisible ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
              <FiSquare className="w-3.5 h-3.5" />
            </button>

            {/* Clear + Export */}
            <button onClick={handleClearWhiteboard} title="Clear All" className="p-1.5 bg-red-900 hover:bg-red-800 rounded-lg"><FiTrash2   className="w-3.5 h-3.5 text-white"/></button>
            <button onClick={handleExport}          title="Export PNG" className="p-1.5 bg-blue-900 hover:bg-blue-800 rounded-lg"><FiDownload className="w-3.5 h-3.5 text-white"/></button>

            <div className="w-px h-5 bg-gray-600" />
            <button onClick={onClose} title="Close" className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg"><FiX className="w-3.5 h-3.5 text-white"/></button>
          </div>
        </div>

        {/* ── Bottom status bar ── */}
        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm border border-gray-700">
          <div className="flex items-center gap-3">
            <span>Tool: <span className="font-bold capitalize">{tool}</span></span>
            <span className="w-1 h-1 bg-gray-500 rounded-full" />
            <span>Zoom: <span className="font-bold">{Math.round(currentZoom * 100)}%</span></span>
            <span className="w-1 h-1 bg-gray-500 rounded-full" />
            <span>Viewers: <span className="font-bold">{participants.length}</span></span>
            {selectedId && <><span className="w-1 h-1 bg-gray-500 rounded-full" /><span className="text-blue-400">Object selected — Del to remove</span></>}
            <span className="w-1 h-1 bg-gray-500 rounded-full" />
            <span className="text-gray-400">Ctrl+V to paste image</span>
          </div>
        </div>

        {/* ── Viewers list ── */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm border border-gray-700">
          <div className="flex items-center gap-2">
            <span>{participants.length} viewer{participants.length !== 1 ? "s" : ""}</span>
            {participants.map((p) => (
              <div key={p.clientId} className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-medium" title={p.userName || "User"}>
                {(p.userName || "U").charAt(0)}
              </div>
            ))}
          </div>
        </div>

        {isPanning && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-600 flex items-center gap-2 pointer-events-none">
            <FiMove className="w-4 h-4" /> <span>Panning…</span>
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    if (prev.sessionId         !== next.sessionId)         return false;
    if (prev.roomCode          !== next.roomCode)          return false;
    if (prev.wsToken           !== next.wsToken)           return false;
    if (prev.isActive          !== next.isActive)          return false;
    if (prev.allowViewersToDraw !== next.allowViewersToDraw) return false;
    if (prev.mainScreenMode    !== next.mainScreenMode)    return false;
    if (prev.compact           !== next.compact)           return false;
    if (prev.sessionInfo?.streamerId   !== next.sessionInfo?.streamerId)   return false;
    if (prev.sessionInfo?.streamerName !== next.sessionInfo?.streamerName) return false;
    return true;
  }
);

StreamerWhiteboard.displayName = "StreamerWhiteboard";
export default StreamerWhiteboard;



// import React, {
//   useState, useEffect, useRef, useCallback, memo,
// } from "react";
// import * as Y from "yjs";
// import { WebsocketProvider } from "y-websocket";
// import { IndexeddbPersistence } from "y-indexeddb";
// import {
//   FiSquare, FiCircle, FiMinus, FiDownload, FiRefreshCcw,
//   FiTrash2, FiMove, FiPlus, FiMinusCircle, FiX, FiImage,
//   FiMousePointer
// } from "react-icons/fi";
// import { FaEraser, FaPaintBrush } from "react-icons/fa";
// import { toast } from "react-toastify";

// // ─── constants ────────────────────────────────────────────────────────────────
// const DEFAULT_MEDIA_W = 480;
// const DEFAULT_MEDIA_H = 270;
// const FLUSH_INTERVAL  = 50;   // ms — throttle Yjs stroke sync
// const MIN_MOVE_DIST   = 0.6;  // px — ignore pointer jitter
// const BASE_W = 1920;
// const BASE_H = 1080;

// // ─── helpers ──────────────────────────────────────────────────────────────────
// function uid() {
//   return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
// }

// function fileToBase64(file) {
//   return new Promise((res, rej) => {
//     const r = new FileReader();
//     r.onload  = () => res(r.result);
//     r.onerror = rej;
//     r.readAsDataURL(file);
//   });
// }

// function pointToLineDist(p, v, w) {
//   const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
//   if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
//   let t = ((p.x - v.x)*(w.x - v.x) + (p.y - v.y)*(w.y - v.y)) / l2;
//   t = Math.max(0, Math.min(1, t));
//   return Math.hypot(p.x - (v.x + t*(w.x - v.x)), p.y - (v.y + t*(w.y - v.y)));
// }

// // ─── StreamerWhiteboard ───────────────────────────────────────────────────────
// const StreamerWhiteboard = memo(
//   ({
//     sessionId,
//     roomCode,
//     wsToken,
//     sessionInfo,
//     isActive,
//     onClose,
//     allowViewersToDraw = true,
//     mainScreenMode     = false,
//     compact            = false,
//   }) => {
//     // ── canvas refs ──
//     const canvasRef           = useRef(null);
//     const backgroundCanvasRef = useRef(null);
//     const ctxRef              = useRef(null);
//     const bgCtxRef            = useRef(null);
//     const containerRef        = useRef(null);

//     // ── Yjs refs ──
//     const yDocRef          = useRef(null);
//     const yProviderRef     = useRef(null);
//     const yWhiteboardRef   = useRef(null);
//     const ySettingsRef     = useRef(null);
//     const yUndoManagerRef  = useRef(null);
//     const yObserverCleanup = useRef(null);

//     // ── media caches ──
//     const imageCacheRef = useRef(new Map());

//     // ── raf / flush ──
//     const rafIdRef        = useRef(null);
//     const pendingObjsRef  = useRef(null);
//     const flushTimerRef   = useRef(null);
//     const pendingUpdateRef= useRef(null); // Used for dragging/resizing

//     // ── stroke & shapes state ──
//     const currentStrokeIdRef  = useRef(null);
//     const strokeBufferRef     = useRef([]);
//     const lastLocalPointRef   = useRef(null);
//     const lastLocalMidRef     = useRef(null);
//     const pointerIdRef        = useRef(null);
//     const shapeStartRef       = useRef(null);

//     // ── pan ──
//     const lastPanPointRef  = useRef({ x: 0, y: 0 });
//     const canvasOffsetRef  = useRef({ x: 0, y: 0 });
//     const lastPointRef     = useRef({ x: 0, y: 0 });

//     // ── selected object (for move/delete/resize) ──
//     const selectedIdRef = useRef(null);
//     const dragOffsetRef = useRef({ x: 0, y: 0 });
//     const isDraggingRef = useRef(false);
//     const isResizingRef = useRef(false);

//     // ── state ──
//     const [tool,            setTool]            = useState("pen");
//     const [color,           setColor]           = useState("#000000");
//     const [strokeWidth,     setStrokeWidth]     = useState(2);
//     const [opacity,         setOpacity]         = useState(1);
//     const [currentZoom,     setCurrentZoom]     = useState(1);
//     const [isConnected,     setIsConnected]     = useState(false);
//     const [participants,    setParticipants]    = useState([]);
//     const [backgroundColor, setBackgroundColor] = useState("#ffffff");
//     const [isGridVisible,   setIsGridVisible]   = useState(false);
//     const [isPanning,       setIsPanning]       = useState(false);
//     const [isDrawing,       setIsDrawing]       = useState(false);
//     const [selectedId,      setSelectedId]      = useState(null);

//     const fileInputRef       = useRef(null);

//     // ═══════════════════════════════════════════════════════
//     // Helpers
//     // ═══════════════════════════════════════════════════════
//     const getTransformedPoint = useCallback((e) => {
//       if (!canvasRef.current) return { x: 0, y: 0 };
//       const rect   = canvasRef.current.getBoundingClientRect();
//       const scaleX = BASE_W / rect.width;
//       const scaleY = BASE_H / rect.height;
//       const x = (e.clientX - rect.left) * scaleX;
//       const y = (e.clientY - rect.top)  * scaleY;
//       return {
//         x: (x - canvasOffsetRef.current.x) / currentZoom,
//         y: (y - canvasOffsetRef.current.y) / currentZoom,
//       };
//     }, [currentZoom]);

//     const getCurrentObjects = useCallback(() => {
//       if (!yWhiteboardRef.current || yWhiteboardRef.current.length === 0) return [];
//       return (yWhiteboardRef.current.toArray()[0]?.objects) || [];
//     }, []);

//     // ═══════════════════════════════════════════════════════
//     // Yjs write helpers
//     // ═══════════════════════════════════════════════════════
//     const commitState = useCallback((updater) => {
//       if (!yWhiteboardRef.current || !yDocRef.current) return;
//       yDocRef.current.transact(() => {
//         const cur = yWhiteboardRef.current.toArray()[0] || {
//           version: "1.0.0", objects: [], background: backgroundColor,
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
//     }, [backgroundColor]);

//     const addObject = useCallback((obj) => {
//       commitState((cur) => ({
//         ...cur,
//         objects: [...(cur.objects || []), obj],
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString(),
//       }));
//     }, [commitState, sessionInfo]);

//     const deleteObject = useCallback((id) => {
//       commitState((cur) => ({
//         ...cur,
//         objects: (cur.objects || []).filter((o) => o.id !== id),
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString(),
//       }));
//       if (selectedIdRef.current === id) {
//         selectedIdRef.current = null;
//         setSelectedId(null);
//       }
//     }, [commitState, sessionInfo]);

//     const updateObject = useCallback((id, patch) => {
//       commitState((cur) => ({
//         ...cur,
//         objects: (cur.objects || []).map((o) => o.id === id ? { ...o, ...patch } : o),
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString(),
//       }));
//     }, [commitState, sessionInfo]);

//     // ═══════════════════════════════════════════════════════
//     // Drawing & Hit Test
//     // ═══════════════════════════════════════════════════════
//     const drawGrid = useCallback((ctx, w, h) => {
//       ctx.save();
//       ctx.strokeStyle = "#e0e0e0";
//       ctx.lineWidth   = 0.5;
//       ctx.globalAlpha = 0.3;
//       const gs = 20;
//       for (let x = 0; x <= w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
//       for (let y = 0; y <= h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
//       ctx.restore();
//     }, []);

//     const drawObject = useCallback((ctx, obj) => {
//       if (!obj) return;
//       ctx.save();
//       ctx.strokeStyle = obj.color       || "#000000";
//       ctx.fillStyle   = obj.fillColor   || "transparent";
//       ctx.lineWidth   = (obj.strokeWidth || 2) / currentZoom;
//       ctx.globalAlpha = obj.opacity     ?? 1;

//       switch (obj.type) {
//         case "pen":
//         case "pencil":
//         case "eraser": {
//           if (!obj.points?.length) break;
//           if (obj.type === "eraser") ctx.globalCompositeOperation = "destination-out";
//           ctx.beginPath();
//           ctx.moveTo(obj.points[0].x, obj.points[0].y);
//           obj.points.forEach((p) => ctx.lineTo(p.x, p.y));
//           ctx.stroke();
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
//         case "text": {
//           ctx.font      = `${obj.fontSize || 16}px Arial`;
//           ctx.fillStyle = obj.color || "#000";
//           ctx.fillText(obj.text || "", obj.x, obj.y);
//           break;
//         }
//         case "image": {
//           let img = imageCacheRef.current.get(obj.id);
//           if (!img) {
//             img       = new Image();
//             img.src   = obj.src;
//             img.onload = () => scheduleRedraw(getCurrentObjects());
//             imageCacheRef.current.set(obj.id, img);
//           }
//           if (img.complete && img.naturalWidth > 0) {
//             ctx.globalAlpha = obj.opacity ?? 1;
//             ctx.drawImage(img, obj.x, obj.y, obj.width || DEFAULT_MEDIA_W, obj.height || DEFAULT_MEDIA_H);
//           } else {
//             ctx.strokeStyle = "#aaa"; ctx.strokeRect(obj.x, obj.y, obj.width || DEFAULT_MEDIA_W, obj.height || DEFAULT_MEDIA_H);
//             ctx.fillStyle   = "#eee"; ctx.font = "14px Arial";
//             ctx.fillText("Loading image…", obj.x + 8, obj.y + 20);
//           }
//           break;
//         }
//         default: break;
//       }

//       // Selection Highlight & Resize Handle (for rect, image, circle, line)
//       if (selectedIdRef.current === obj.id && tool === "select") {
//         ctx.strokeStyle = "#3b82f6";
//         ctx.lineWidth = 2 / currentZoom;
//         ctx.setLineDash([6 / currentZoom, 3 / currentZoom]);

//         let hx, hy; // handle coordinates

//         if (["rectangle", "image"].includes(obj.type)) {
//           const bw = obj.width || DEFAULT_MEDIA_W;
//           const bh = obj.height || DEFAULT_MEDIA_H;
//           ctx.strokeRect(obj.x - 2, obj.y - 2, bw + 4, bh + 4);
//           hx = obj.x + bw; hy = obj.y + bh;
//         } else if (obj.type === "circle") {
//           const bw = obj.radius * 2;
//           ctx.strokeRect(obj.x - obj.radius - 2, obj.y - obj.radius - 2, bw + 4, bw + 4);
//           hx = obj.x + obj.radius * 0.707; hy = obj.y + obj.radius * 0.707; // 45 deg angle
//         } else if (obj.type === "line") {
//           hx = obj.x2; hy = obj.y2;
//         }

//         ctx.setLineDash([]);

//         // Draw Handle
//         if (hx !== undefined && hy !== undefined) {
//           ctx.fillStyle = "#ffffff";
//           ctx.strokeStyle = "#3b82f6";
//           ctx.lineWidth = 2 / currentZoom;
//           ctx.beginPath();
//           ctx.arc(hx, hy, 6 / currentZoom, 0, Math.PI * 2);
//           ctx.fill();
//           ctx.stroke();
//         }
//       }

//       ctx.restore();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [currentZoom, tool]);

//     const hitTest = useCallback((pt) => {
//       const objs = getCurrentObjects();
//       for (let i = objs.length - 1; i >= 0; i--) {
//         const o = objs[i];
//         if (["image", "rectangle"].includes(o.type)) {
//           const w = o.width || DEFAULT_MEDIA_W;
//           const h = o.height || DEFAULT_MEDIA_H;
//           if (pt.x >= o.x && pt.x <= o.x + w && pt.y >= o.y && pt.y <= o.y + h) return o;
//         } else if (o.type === "circle") {
//           if (Math.hypot(pt.x - o.x, pt.y - o.y) <= o.radius) return o;
//         } else if (o.type === "line") {
//           if (pointToLineDist(pt, {x: o.x1, y: o.y1}, {x: o.x2, y: o.y2}) < 15 / currentZoom) return o;
//         }
//       }
//       return null;
//     }, [getCurrentObjects, currentZoom]);

//     const hitTestHandle = useCallback((pt, obj) => {
//       let hx, hy;
//       if (["rectangle", "image"].includes(obj.type)) {
//         hx = obj.x + (obj.width || DEFAULT_MEDIA_W);
//         hy = obj.y + (obj.height || DEFAULT_MEDIA_H);
//       } else if (obj.type === "circle") {
//         hx = obj.x + obj.radius * 0.707; 
//         hy = obj.y + obj.radius * 0.707;
//       } else if (obj.type === "line") {
//         hx = obj.x2; hy = obj.y2;
//       } else return false;

//       return Math.hypot(pt.x - hx, pt.y - hy) < 15 / currentZoom;
//     }, [currentZoom]);

//     const redrawCanvas = useCallback((objects) => {
//       if (!ctxRef.current || !bgCtxRef.current || !canvasRef.current) return;
//       const ctx    = ctxRef.current;
//       const bgCtx  = bgCtxRef.current;
//       const canvas = canvasRef.current;

//       ctx.clearRect(0, 0, canvas.width, canvas.height);
//       bgCtx.clearRect(0, 0, canvas.width, canvas.height);

//       bgCtx.fillStyle = backgroundColor;
//       bgCtx.fillRect(0, 0, canvas.width, canvas.height);
//       if (isGridVisible) drawGrid(bgCtx, canvas.width, canvas.height);

//       ctx.save();
//       ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//       ctx.scale(currentZoom, currentZoom);
//       (objects || []).forEach((obj) => drawObject(ctx, obj));
//       ctx.restore();
//     }, [backgroundColor, isGridVisible, currentZoom, drawGrid, drawObject]);

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
//         if (state.background) setBackgroundColor(state.background);
//         scheduleRedraw(Array.isArray(state.objects) ? state.objects : []);
//       } catch (e) { console.error(e); }
//     }, [scheduleRedraw]);

//     // ═══════════════════════════════════════════════════════
//     // Smooth stroke & Shape flushing
//     // ═══════════════════════════════════════════════════════
//     const drawSmoothStroke = useCallback((prev, next, strokeType) => {
//       if (!ctxRef.current) return;
//       const ctx = ctxRef.current;
//       ctx.save();
//       ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//       ctx.scale(currentZoom, currentZoom);
//       ctx.lineCap   = "round";
//       ctx.lineJoin  = "round";
//       ctx.globalAlpha = opacity ?? 1;
//       ctx.lineWidth   = (strokeWidth || 2) / currentZoom;

//       if (strokeType === "eraser") {
//         ctx.globalCompositeOperation = "destination-out";
//         ctx.strokeStyle = "rgba(0,0,0,1)";
//       } else {
//         ctx.globalCompositeOperation = "source-over";
//         ctx.strokeStyle = color || "#000000";
//       }

//       const mid = { x: (prev.x + next.x) / 2, y: (prev.y + next.y) / 2 };
//       if (!lastLocalMidRef.current) lastLocalMidRef.current = { x: prev.x, y: prev.y };
//       ctx.beginPath();
//       ctx.moveTo(lastLocalMidRef.current.x, lastLocalMidRef.current.y);
//       ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
//       ctx.stroke();
//       lastLocalMidRef.current = mid;
//       ctx.restore();
//     }, [currentZoom, color, strokeWidth, opacity]);

//     const flushStrokeToYjs = useCallback(() => {
//       const strokeId = currentStrokeIdRef.current;
//       if (!strokeId) return;
//       const buffered = strokeBufferRef.current;
//       if (!buffered.length) return;
//       const pts = buffered.slice();
//       strokeBufferRef.current = [];

//       commitState((cur) => {
//         const objs   = [...(cur.objects || [])];
//         const idx    = objs.findIndex((o) => o?.id === strokeId);
//         if (idx === -1) return cur;
//         const target = { ...objs[idx] };
//         target.points = [...(target.points || []), ...pts];
//         objs[idx] = target;
//         return { ...cur, objects: objs, updatedAt: new Date().toISOString() };
//       });
//     }, [commitState]);

//     const flushShapeToYjs = useCallback((currentPoint) => {
//       const strokeId = currentStrokeIdRef.current;
//       const startP = shapeStartRef.current;
//       if (!strokeId || !startP || !currentPoint) return;

//       commitState((cur) => {
//         const objs   = [...(cur.objects || [])];
//         const idx    = objs.findIndex((o) => o?.id === strokeId);
//         if (idx === -1) return cur;
//         const target = { ...objs[idx] };
        
//         if (target.type === "rectangle") {
//           target.width = currentPoint.x - startP.x;
//           target.height = currentPoint.y - startP.y;
//         } else if (target.type === "circle") {
//           target.radius = Math.hypot(currentPoint.x - startP.x, currentPoint.y - startP.y);
//         } else if (target.type === "line") {
//           target.x2 = currentPoint.x;
//           target.y2 = currentPoint.y;
//         }
        
//         objs[idx] = target;
//         return { ...cur, objects: objs, updatedAt: new Date().toISOString() };
//       });
//     }, [commitState]);

//     const scheduleFlush = useCallback(() => {
//       if (flushTimerRef.current) return;
//       flushTimerRef.current = setTimeout(() => {
//         flushTimerRef.current = null;
//         if (tool === "pen" || tool === "eraser") {
//           flushStrokeToYjs();
//         } else if (["line", "rectangle", "circle"].includes(tool)) {
//           flushShapeToYjs(lastPointRef.current);
//         }
//       }, FLUSH_INTERVAL);
//     }, [flushStrokeToYjs, flushShapeToYjs, tool]);

//     // ═══════════════════════════════════════════════════════
//     // Yjs init
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       if (!sessionId || !wsToken) return;

//       const initYjs = async () => {
//         try {
//           const ydoc      = new Y.Doc();
//           yDocRef.current = ydoc;

//           const baseWs   = import.meta.env.VITE_WS_URL || "ws://localhost:9090";
//           const provider = new WebsocketProvider(`${baseWs}/yjs`, sessionId, ydoc, {
//             WebSocketPolyfill: WebSocket,
//             params: {
//               token: wsToken, isStreamer: true, allowViewersToDraw,
//               roomCode, userId: sessionInfo?.streamerId, userName: sessionInfo?.streamerName,
//             },
//           });
//           yProviderRef.current  = provider;

//           const yWhiteboard      = ydoc.getArray("whiteboard");
//           yWhiteboardRef.current = yWhiteboard;

//           const ySettings        = ydoc.getMap("room_settings");
//           ySettingsRef.current   = ySettings;

//           provider.awareness.setLocalState({
//             userId: sessionInfo?.streamerId || "streamer",
//             userName: sessionInfo?.streamerName || "Streamer",
//             role: "STREAMER", isStreamer: true, color, tool, cursor: null,
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

//           new IndexeddbPersistence(`whiteboard-${sessionId}`, ydoc);

//           const observer = (event) => {
//             const origin = event?.transaction?.origin;
//             if (origin === "drawing" && (isDrawing || currentStrokeIdRef.current)) return;
//             loadWhiteboardState();
//           };
//           yWhiteboard.observe(observer);
//           yObserverCleanup.current = () => { try { yWhiteboard.unobserve(observer); } catch {} };

//         } catch (err) {
//           console.error("Failed to init Yjs:", err);
//           toast.error("Failed to connect to whiteboard server");
//         }
//       };

//       initYjs();

//       return () => {
//         try { 
//           if (tool === "pen" || tool === "eraser") flushStrokeToYjs(true); 
//           else flushShapeToYjs(lastPointRef.current);
//         } catch {}
//         if (yObserverCleanup.current) { yObserverCleanup.current(); yObserverCleanup.current = null; }
//         if (yProviderRef.current) { try { yProviderRef.current.disconnect(); yProviderRef.current.destroy(); } catch {} }
//         if (yDocRef.current)      { try { yDocRef.current.destroy(); } catch {} }
//         yProviderRef.current = yDocRef.current = yWhiteboardRef.current = null;
//       };
//       // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [sessionId, roomCode, wsToken, allowViewersToDraw, sessionInfo]);

//     // keep awareness fresh
//     useEffect(() => {
//       const p = yProviderRef.current;
//       if (!p) return;
//       try {
//         const prev = p.awareness.getLocalState() || {};
//         p.awareness.setLocalState({ ...prev, color, tool,
//           userId: sessionInfo?.streamerId || "streamer",
//           userName: sessionInfo?.streamerName || "Streamer",
//           role: "STREAMER", isStreamer: true,
//         });
//       } catch {}
//     }, [color, tool, sessionInfo]);

//     // cleanup timers
//     useEffect(() => () => {
//       if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
//       if (rafIdRef.current)      cancelAnimationFrame(rafIdRef.current);
//     }, []);

//     // ═══════════════════════════════════════════════════════
//     // Canvas init + resize
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       if (!canvasRef.current || !backgroundCanvasRef.current || !containerRef.current) return;
//       const canvas    = canvasRef.current;
//       const bgCanvas  = backgroundCanvasRef.current;
//       const container = containerRef.current;

//       const resize = () => {
//         canvas.width  = bgCanvas.width  = container.clientWidth;
//         canvas.height = bgCanvas.height = container.clientHeight;
//         const ctx   = canvas.getContext("2d");
//         const bgCtx = bgCanvas.getContext("2d");
//         ctx.lineCap = "round"; ctx.lineJoin = "round";
//         ctxRef.current = ctx; bgCtxRef.current = bgCtx;
        
//         // Internal resolution fix
//         canvas.width = BASE_W;
//         canvas.height = BASE_H;
//         bgCanvas.width = BASE_W;
//         bgCanvas.height = BASE_H;
        
//         if (yWhiteboardRef.current) {
//           const s = yWhiteboardRef.current.toArray()[0] || {};
//           scheduleRedraw(s.objects || []);
//         }
//       };

//       resize();
//       const ro = new ResizeObserver(resize);
//       ro.observe(container);
//       return () => ro.disconnect();
//     }, [scheduleRedraw]);

//     // ═══════════════════════════════════════════════════════
//     // Paste handler — Ctrl+V image
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       const handlePaste = async (e) => {
//         for (const item of e.clipboardData.items) {
//           if (item.type.startsWith("image/")) {
//             const file   = item.getAsFile();
//             const b64    = await fileToBase64(file);
//             const img    = new Image();
//             img.src      = b64;
//             img.onload   = () => {
//               const ratio = img.naturalWidth / img.naturalHeight;
//               const w     = Math.min(img.naturalWidth, DEFAULT_MEDIA_W);
//               const h     = w / ratio;
//               addObject({
//                 id: uid(), type: "image", src: b64,
//                 x: 80, y: 80, width: w, height: h,
//                 opacity: 1, timestamp: Date.now(),
//               });
//             };
//             break;
//           }
//         }
//       };
//       window.addEventListener("paste", handlePaste);
//       return () => window.removeEventListener("paste", handlePaste);
//     }, [addObject]);

//     // ═══════════════════════════════════════════════════════
//     // Keyboard — Delete selected
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       const handleKey = (e) => {
//         if ((e.key === "Delete" || e.key === "Backspace") && selectedIdRef.current) {
//           if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
//           deleteObject(selectedIdRef.current);
//         }
//         if ((e.ctrlKey || e.metaKey) && e.key === "z") {
//           e.preventDefault();
//           yUndoManagerRef.current?.undo();
//         }
//         if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
//           e.preventDefault();
//           yUndoManagerRef.current?.redo();
//         }
//       };
//       window.addEventListener("keydown", handleKey);
//       return () => window.removeEventListener("keydown", handleKey);
//     }, [deleteObject]);

//     // ═══════════════════════════════════════════════════════
//     // Image upload handler
//     // ═══════════════════════════════════════════════════════
//     const handleImageUpload = useCallback(async (e) => {
//       const file = e.target.files?.[0];
//       if (!file) return;
//       if (file.size > 10 * 1024 * 1024) { toast.error("Image must be < 10MB"); return; }
//       const b64  = await fileToBase64(file);
//       const img  = new Image();
//       img.src    = b64;
//       img.onload = () => {
//         const ratio = img.naturalWidth / img.naturalHeight;
//         const w     = Math.min(img.naturalWidth, DEFAULT_MEDIA_W);
//         const h     = w / ratio;
//         addObject({ id: uid(), type: "image", src: b64, x: 80, y: 80, width: w, height: h, opacity: 1, timestamp: Date.now() });
//       };
//       e.target.value = "";
//     }, [addObject]);

//     // ═══════════════════════════════════════════════════════
//     // Pointer events
//     // ═══════════════════════════════════════════════════════
//     const handlePointerDown = useCallback((e) => {
//       e.preventDefault();
//       if (!canvasRef.current || e.button === 2) return;
//       try { canvasRef.current.setPointerCapture(e.pointerId); pointerIdRef.current = e.pointerId; } catch {}

//       if (tool === "pan" || e.altKey || e.button === 1) {
//         setIsPanning(true);
//         lastPanPointRef.current = { x: e.clientX, y: e.clientY };
//         canvasRef.current.style.cursor = "grabbing";
//         return;
//       }

//       const p = getTransformedPoint(e);

//       // Select / Move / Resize tool
//       if (tool === "select") {
//         const objs = getCurrentObjects();
//         const selObj = objs.find(o => o.id === selectedIdRef.current);
        
//         // 1. Check if Handle is clicked (Resize)
//         if (selObj && hitTestHandle(p, selObj)) {
//           isResizingRef.current = true;
//           return;
//         }

//         // 2. Check if Object is clicked (Drag/Move)
//         const hit = hitTest(p);
//         if (hit) {
//           selectedIdRef.current = hit.id;
//           setSelectedId(hit.id);
//           dragOffsetRef.current = { 
//             x: p.x - (hit.type === 'line' ? hit.x1 : hit.x), 
//             y: p.y - (hit.type === 'line' ? hit.y1 : hit.y) 
//           };
//           isDraggingRef.current = true;
//         } else {
//           selectedIdRef.current = null;
//           setSelectedId(null);
//         }
//         scheduleRedraw(getCurrentObjects());
//         return;
//       }

//       setIsDrawing(true);
//       lastPointRef.current      = p;
//       lastLocalPointRef.current = p;
//       lastLocalMidRef.current   = null;
//       shapeStartRef.current     = p; // Set the origin point for shapes

//       const strokeId = uid();
//       currentStrokeIdRef.current = strokeId;

//       if (tool === "pen" || tool === "eraser") {
//         strokeBufferRef.current    = [];
//         addObject({
//           id: strokeId, type: tool,
//           points: [{ x: p.x, y: p.y }],
//           color: tool === "eraser" ? backgroundColor : color,
//           strokeWidth, opacity, timestamp: Date.now(),
//         });
//         drawSmoothStroke(p, { x: p.x + 0.01, y: p.y + 0.01 }, tool);
//       } else if (["line", "rectangle", "circle"].includes(tool)) {
//          const baseObj = {
//             id: strokeId, type: tool,
//             x: p.x, y: p.y,
//             color, strokeWidth, opacity, timestamp: Date.now()
//          };
//          if (tool === "line") { baseObj.x1 = p.x; baseObj.y1 = p.y; baseObj.x2 = p.x; baseObj.y2 = p.y; }
//          if (tool === "rectangle") { baseObj.width = 0; baseObj.height = 0; }
//          if (tool === "circle") { baseObj.radius = 0; }
//          addObject(baseObj);
//       }
//     }, [tool, getTransformedPoint, hitTestHandle, hitTest, addObject, drawSmoothStroke, scheduleRedraw, getCurrentObjects, backgroundColor, color, strokeWidth, opacity]);

//     const handlePointerMove = useCallback((e) => {
//       if (!canvasRef.current) return;

//       if (isPanning) {
//         const dx = e.clientX - lastPanPointRef.current.x;
//         const dy = e.clientY - lastPanPointRef.current.y;
//         canvasOffsetRef.current.x += dx;
//         canvasOffsetRef.current.y += dy;
//         lastPanPointRef.current = { x: e.clientX, y: e.clientY };
//         scheduleRedraw(getCurrentObjects());
//         return;
//       }

//       const p = getTransformedPoint(e);

//       // Drag or Resize media object
//       if (tool === "select" && selectedIdRef.current) {
//         if (isResizingRef.current) {
//           const objs = getCurrentObjects();
//           const selObj = objs.find(o => o.id === selectedIdRef.current);
//           if (!selObj) return;

//           let patch = {};
//           if (["rectangle", "image"].includes(selObj.type)) {
//             patch.width = Math.max(20, p.x - selObj.x);
//             patch.height = Math.max(20, p.y - selObj.y);
//           } else if (selObj.type === "circle") {
//             patch.radius = Math.max(10, Math.hypot(p.x - selObj.x, p.y - selObj.y));
//           } else if (selObj.type === "line") {
//             patch.x2 = p.x;
//             patch.y2 = p.y;
//           }
//           pendingUpdateRef.current = patch;

//         } else if (isDraggingRef.current) {
//           const selObj = getCurrentObjects().find(o => o.id === selectedIdRef.current);
//           if (!selObj) return;

//           let patch = {};
//           const newX = p.x - dragOffsetRef.current.x;
//           const newY = p.y - dragOffsetRef.current.y;

//           if (selObj.type === "line") {
//             const dx = newX - selObj.x1;
//             const dy = newY - selObj.y1;
//             patch.x1 = newX;
//             patch.y1 = newY;
//             patch.x2 = selObj.x2 + dx;
//             patch.y2 = selObj.y2 + dy;
//           } else {
//             patch.x = newX;
//             patch.y = newY;
//           }
//           pendingUpdateRef.current = patch;
//         }

//         if (pendingUpdateRef.current) {
//           // Instant Local Feedback
//           const tempObjs = getCurrentObjects().map(o => o.id === selectedIdRef.current ? { ...o, ...pendingUpdateRef.current } : o);
//           redrawCanvas(tempObjs);

//           // Throttled Network Sync
//           if (!flushTimerRef.current) {
//             flushTimerRef.current = setTimeout(() => {
//                 flushTimerRef.current = null;
//                 if (pendingUpdateRef.current) {
//                     updateObject(selectedIdRef.current, pendingUpdateRef.current);
//                     pendingUpdateRef.current = null;
//                 }
//             }, FLUSH_INTERVAL);
//           }
//         }
//         return;
//       }

//       if (!isDrawing) return;

//       if (tool === "pen" || tool === "eraser") {
//         const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e];
//         for (const evt of events) {
//           const next = getTransformedPoint(evt);
//           const prev = lastLocalPointRef.current || lastPointRef.current;
//           const dist = prev ? Math.hypot(next.x - prev.x, next.y - prev.y) : 999;
//           if (dist < MIN_MOVE_DIST) continue;
//           if (prev) drawSmoothStroke(prev, next, tool);
//           strokeBufferRef.current.push(next);
//           scheduleFlush();
//           lastLocalPointRef.current = next;
//           lastPointRef.current      = next;
//         }
//       } else if (["line", "rectangle", "circle"].includes(tool)) {
//         lastPointRef.current = p;

//         // Instant local UI feedback
//         redrawCanvas(getCurrentObjects());
//         const ctx = ctxRef.current;
//         ctx.save();
//         ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//         ctx.scale(currentZoom, currentZoom);
//         ctx.strokeStyle = color;
//         ctx.lineWidth = (strokeWidth || 2) / currentZoom;
//         ctx.globalAlpha = opacity ?? 1;

//         if (tool === "rectangle") {
//             ctx.strokeRect(shapeStartRef.current.x, shapeStartRef.current.y, p.x - shapeStartRef.current.x, p.y - shapeStartRef.current.y);
//         } else if (tool === "circle") {
//             ctx.beginPath();
//             ctx.arc(shapeStartRef.current.x, shapeStartRef.current.y, Math.hypot(p.x - shapeStartRef.current.x, p.y - shapeStartRef.current.y), 0, Math.PI * 2);
//             ctx.stroke();
//         } else if (tool === "line") {
//             ctx.beginPath();
//             ctx.moveTo(shapeStartRef.current.x, shapeStartRef.current.y);
//             ctx.lineTo(p.x, p.y);
//             ctx.stroke();
//         }
//         ctx.restore();

//         // Throttled sync to network
//         if (!flushTimerRef.current) {
//           flushTimerRef.current = setTimeout(() => {
//               flushTimerRef.current = null;
//               flushShapeToYjs(lastPointRef.current);
//           }, FLUSH_INTERVAL);
//         }
//       }
//     }, [isDrawing, isPanning, tool, getTransformedPoint, drawSmoothStroke, scheduleFlush, flushShapeToYjs, scheduleRedraw, getCurrentObjects, updateObject, redrawCanvas, color, strokeWidth, opacity, currentZoom]);

//     const endStrokeCleanup = useCallback(() => {
//       if (tool === "pen" || tool === "eraser") {
//          flushStrokeToYjs(true);
//       } else if (["line", "rectangle", "circle"].includes(tool)) {
//          flushShapeToYjs(lastPointRef.current);
//       } else if (tool === "select" && pendingUpdateRef.current) {
//          updateObject(selectedIdRef.current, pendingUpdateRef.current);
//          pendingUpdateRef.current = null;
//       }
      
//       currentStrokeIdRef.current = null;
//       strokeBufferRef.current    = [];
//       lastLocalPointRef.current  = null;
//       lastLocalMidRef.current    = null;
//       shapeStartRef.current      = null;
//       isDraggingRef.current      = false;
//       isResizingRef.current      = false;

//       if (canvasRef.current && pointerIdRef.current != null) {
//         try { canvasRef.current.releasePointerCapture(pointerIdRef.current); } catch {}
//       }
//       pointerIdRef.current = null;
//     }, [flushStrokeToYjs, flushShapeToYjs, tool, updateObject]);

//     const handlePointerUp    = useCallback(() => { setIsDrawing(false); setIsPanning(false); endStrokeCleanup(); if (canvasRef.current) canvasRef.current.style.cursor = tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair"; }, [tool, endStrokeCleanup]);
//     const handlePointerLeave = useCallback(() => { setIsDrawing(false); setIsPanning(false); endStrokeCleanup(); }, [endStrokeCleanup]);

//     // ── wheel zoom ──
//     const handleWheel = useCallback((e) => {
//       e.preventDefault();
//       if (!canvasRef.current) return;
//       const rect   = canvasRef.current.getBoundingClientRect();
//       const scaleX = BASE_W / rect.width;
//       const scaleY = BASE_H / rect.height;
//       const mx     = (e.clientX - rect.left) * scaleX;
//       const my     = (e.clientY - rect.top) * scaleY;
      
//       const factor = e.deltaY > 0 ? 0.9 : 1.1;
//       const newZ   = Math.max(0.5, Math.min(3, currentZoom * factor));
//       const change = newZ / currentZoom;
      
//       canvasOffsetRef.current.x = mx - (mx - canvasOffsetRef.current.x) * change;
//       canvasOffsetRef.current.y = my - (my - canvasOffsetRef.current.y) * change;
//       setCurrentZoom(newZ);
//       scheduleRedraw(getCurrentObjects());
//     }, [currentZoom, scheduleRedraw, getCurrentObjects]);

//     const handleZoomIn    = useCallback(() => { setCurrentZoom((p) => Math.min(p + 0.1, 3));  scheduleRedraw(getCurrentObjects()); }, [scheduleRedraw, getCurrentObjects]);
//     const handleZoomOut   = useCallback(() => { setCurrentZoom((p) => Math.max(p - 0.1, 0.5)); scheduleRedraw(getCurrentObjects()); }, [scheduleRedraw, getCurrentObjects]);
//     const handleZoomReset = useCallback(() => { setCurrentZoom(1); canvasOffsetRef.current = { x: 0, y: 0 }; scheduleRedraw(getCurrentObjects()); }, [scheduleRedraw, getCurrentObjects]);

//     const cursorStyle = tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair";

//     // ═══════════════════════════════════════════════════════
//     // Whiteboard actions
//     // ═══════════════════════════════════════════════════════
//     const handleClearWhiteboard = useCallback(() => {
//       if (!yWhiteboardRef.current || !yDocRef.current) return;
//       if (!window.confirm("Clear entire whiteboard?")) return;
//       yDocRef.current.transact(() => {
//         yWhiteboardRef.current.delete(0, yWhiteboardRef.current.length);
//         yWhiteboardRef.current.insert(0, [{
//           version: "1.0.0", objects: [], background: backgroundColor,
//           clearedAt: new Date().toISOString(), clearedBy: sessionInfo?.streamerId,
//         }]);
//       }, "drawing");
//       imageCacheRef.current.clear();
//       scheduleRedraw([]);
//       toast.success("Whiteboard cleared");
//     }, [backgroundColor, sessionInfo, scheduleRedraw]);

//     const handleExport = useCallback(() => {
//       if (!canvasRef.current || !backgroundCanvasRef.current) return;
//       const exp = document.createElement("canvas");
//       exp.width  = canvasRef.current.width;
//       exp.height = canvasRef.current.height;
//       const ctx  = exp.getContext("2d");
//       ctx.drawImage(backgroundCanvasRef.current, 0, 0);
//       ctx.drawImage(canvasRef.current,           0, 0);
//       const link     = document.createElement("a");
//       link.download  = `whiteboard-${sessionId}-${Date.now()}.png`;
//       link.href      = exp.toDataURL("image/png");
//       link.click();
//       toast.success("Whiteboard exported");
//     }, [sessionId]);

//     const handleUndo = useCallback(() => yUndoManagerRef.current?.undo(), []);
//     const handleRedo = useCallback(() => yUndoManagerRef.current?.redo(), []);

//     const handleDeleteSelected = useCallback(() => {
//       if (selectedIdRef.current) deleteObject(selectedIdRef.current);
//     }, [deleteObject]);

//     // ═══════════════════════════════════════════════════════
//     // Render
//     // ═══════════════════════════════════════════════════════
//     return (
//       <div
//         ref={containerRef}
//         className={`absolute inset-0 z-20 w-full h-full bg-gray-900 overflow-hidden ${isActive ? "block" : "hidden"}`}
//         onWheel={handleWheel}
//       >
//         {/* Hidden file inputs */}
//         <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

//         {/* Background canvas */}
//         <canvas ref={backgroundCanvasRef} className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: "none" }} />

//         {/* Main drawing canvas */}
//         <canvas
//           ref={canvasRef}
//           className={`absolute top-0 left-0 w-full h-full`}
//           style={{ touchAction: "none", cursor: cursorStyle, zIndex: 20 }}
//           onPointerDown={handlePointerDown}
//           onPointerMove={handlePointerMove}
//           onPointerUp={handlePointerUp}
//           onPointerLeave={handlePointerLeave}
//           onContextMenu={(e) => e.preventDefault()}
//         />

//         {/* ── Top Toolbar ── */}
//         <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30">
//           <div className="bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700 px-2 py-1.5 flex items-center gap-1.5 flex-wrap">

//             {/* Connection status */}
//             <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
//             <span className="text-white text-xs mr-1">{isConnected ? "Live" : "Offline"}</span>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Draw tools */}
//             {[
//               { t: "pen",       icon: <FaPaintBrush className="w-3.5 h-3.5" />,   title: "Pen" },
//               { t: "eraser",    icon: <FaEraser     className="w-3.5 h-3.5" />,   title: "Eraser" },
//               { t: "line",      icon: <FiMinus      className="w-3.5 h-3.5" />,   title: "Line" },
//               { t: "rectangle", icon: <FiSquare     className="w-3.5 h-3.5" />,   title: "Rectangle" },
//               { t: "circle",    icon: <FiCircle     className="w-3.5 h-3.5" />,   title: "Circle" },
//               { t: "select",    icon: <FiMousePointer className="w-3.5 h-3.5" />, title: "Select / Move / Resize" },
//               { t: "pan",       icon: <FiMove       className="w-3.5 h-3.5" />,   title: "Pan (Alt+Drag)" },
//             ].map(({ t, icon, title }) => (
//               <button key={t} onClick={() => setTool(t)} title={title}
//                 className={`p-1.5 rounded-lg transition-colors ${tool === t ? "bg-blue-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"}`}>
//                 {icon}
//               </button>
//             ))}

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Color + stroke */}
//             <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
//               className="w-6 h-6 rounded cursor-pointer border border-gray-600" title="Color" />
//             <select value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))}
//               className="bg-gray-700 text-white text-xs rounded px-1.5 py-1 border border-gray-600 w-14">
//               {[1,2,3,5,8].map((v) => <option key={v} value={v}>{v}px</option>)}
//             </select>
//             <select value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
//               className="bg-gray-700 text-white text-xs rounded px-1.5 py-1 border border-gray-600 w-14">
//               {[1,0.8,0.6,0.4].map((v) => <option key={v} value={v}>{v*100}%</option>)}
//             </select>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Image insert button */}
//             <button onClick={() => fileInputRef.current?.click()} title="Upload Image"
//               className="p-1.5 bg-gray-700 hover:bg-green-700 rounded-lg transition-colors text-gray-300 hover:text-white">
//               <FiImage className="w-3.5 h-3.5" />
//             </button>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Delete selected */}
//             {selectedId && (
//               <button onClick={handleDeleteSelected} title="Delete selected (Del)"
//                 className="p-1.5 bg-red-700 hover:bg-red-600 rounded-lg transition-colors text-white">
//                 <FiTrash2 className="w-3.5 h-3.5" />
//               </button>
//             )}

//             {/* Zoom */}
//             <button onClick={handleZoomOut}   title="Zoom Out"  className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiMinusCircle className="w-3.5 h-3.5 text-white"/></button>
//             <span className="text-white text-xs min-w-[44px] text-center">{Math.round(currentZoom * 100)}%</span>
//             <button onClick={handleZoomIn}    title="Zoom In"   className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiPlus className="w-3.5 h-3.5 text-white"/></button>
//             <button onClick={handleZoomReset} title="Reset Zoom" className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiRefreshCcw className="w-3.5 h-3.5 text-white"/></button>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Undo/Redo */}
//             <button onClick={handleUndo} title="Undo (Ctrl+Z)"             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiRefreshCcw className="w-3.5 h-3.5 text-white"/></button>
//             <button onClick={handleRedo} title="Redo (Ctrl+Y)"             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiRefreshCcw className="w-3.5 h-3.5 text-white transform scale-x-[-1]"/></button>

//             {/* Grid */}
//             <button onClick={() => setIsGridVisible((v) => !v)} title="Toggle Grid"
//               className={`p-1.5 rounded-lg transition-colors ${isGridVisible ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
//               <FiSquare className="w-3.5 h-3.5" />
//             </button>

//             {/* Clear + Export */}
//             <button onClick={handleClearWhiteboard} title="Clear All" className="p-1.5 bg-red-900 hover:bg-red-800 rounded-lg"><FiTrash2   className="w-3.5 h-3.5 text-white"/></button>
//             <button onClick={handleExport}          title="Export PNG" className="p-1.5 bg-blue-900 hover:bg-blue-800 rounded-lg"><FiDownload className="w-3.5 h-3.5 text-white"/></button>

//             <div className="w-px h-5 bg-gray-600" />
//             <button onClick={onClose} title="Close" className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg"><FiX className="w-3.5 h-3.5 text-white"/></button>
//           </div>
//         </div>

//         {/* ── Bottom status bar ── */}
//         <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm border border-gray-700">
//           <div className="flex items-center gap-3">
//             <span>Tool: <span className="font-bold capitalize">{tool}</span></span>
//             <span className="w-1 h-1 bg-gray-500 rounded-full" />
//             <span>Zoom: <span className="font-bold">{Math.round(currentZoom * 100)}%</span></span>
//             <span className="w-1 h-1 bg-gray-500 rounded-full" />
//             <span>Viewers: <span className="font-bold">{participants.length}</span></span>
//             {selectedId && <><span className="w-1 h-1 bg-gray-500 rounded-full" /><span className="text-blue-400">Object selected — Del to remove</span></>}
//             <span className="w-1 h-1 bg-gray-500 rounded-full" />
//             <span className="text-gray-400">Ctrl+V to paste image</span>
//           </div>
//         </div>

//         {/* ── Viewers list ── */}
//         <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm border border-gray-700">
//           <div className="flex items-center gap-2">
//             <span>{participants.length} viewer{participants.length !== 1 ? "s" : ""}</span>
//             {participants.map((p) => (
//               <div key={p.clientId} className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-medium" title={p.userName || "User"}>
//                 {(p.userName || "U").charAt(0)}
//               </div>
//             ))}
//           </div>
//         </div>

//         {isPanning && (
//           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-600 flex items-center gap-2 pointer-events-none">
//             <FiMove className="w-4 h-4" /> <span>Panning…</span>
//           </div>
//         )}
//       </div>
//     );
//   },
//   (prev, next) => {
//     if (prev.sessionId         !== next.sessionId)         return false;
//     if (prev.roomCode          !== next.roomCode)          return false;
//     if (prev.wsToken           !== next.wsToken)           return false;
//     if (prev.isActive          !== next.isActive)          return false;
//     if (prev.allowViewersToDraw !== next.allowViewersToDraw) return false;
//     if (prev.mainScreenMode    !== next.mainScreenMode)    return false;
//     if (prev.compact           !== next.compact)           return false;
//     if (prev.sessionInfo?.streamerId   !== next.sessionInfo?.streamerId)   return false;
//     if (prev.sessionInfo?.streamerName !== next.sessionInfo?.streamerName) return false;
//     return true;
//   }
// );

// StreamerWhiteboard.displayName = "StreamerWhiteboard";
// export default StreamerWhiteboard;




// import React, {
//   useState, useEffect, useRef, useCallback, memo,
// } from "react";
// import * as Y from "yjs";
// import { WebsocketProvider } from "y-websocket";
// import { IndexeddbPersistence } from "y-indexeddb";
// import {
//   FiSquare, FiCircle, FiMinus, FiDownload, FiRefreshCcw,
//   FiTrash2, FiMove, FiPlus, FiMinusCircle, FiX, FiImage,
//   FiFileText, FiMousePointer
// } from "react-icons/fi";
// import { FaEraser, FaPaintBrush } from "react-icons/fa";
// import { toast } from "react-toastify";

// // ─── constants ────────────────────────────────────────────────────────────────
// const DEFAULT_MEDIA_W = 480;
// const DEFAULT_MEDIA_H = 270;
// const FLUSH_INTERVAL  = 50;   // ms — throttle Yjs stroke sync
// const MIN_MOVE_DIST   = 0.6;  // px — ignore pointer jitter

// // ─── helpers ──────────────────────────────────────────────────────────────────
// function uid() {
//   return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
// }

// function fileToBase64(file) {
//   return new Promise((res, rej) => {
//     const r = new FileReader();
//     r.onload  = () => res(r.result);
//     r.onerror = rej;
//     r.readAsDataURL(file);
//   });
// }

// // ─── StreamerWhiteboard ───────────────────────────────────────────────────────
// const StreamerWhiteboard = memo(
//   ({
//     sessionId,
//     roomCode,
//     wsToken,
//     sessionInfo,
//     isActive,
//     onClose,
//     allowViewersToDraw = true,
//     mainScreenMode     = false,
//     compact            = false,
//   }) => {
//     // ── canvas refs ──
//     const canvasRef           = useRef(null);
//     const backgroundCanvasRef = useRef(null);
//     const ctxRef              = useRef(null);
//     const bgCtxRef            = useRef(null);
//     const containerRef        = useRef(null);

//     // ── Yjs refs ──
//     const yDocRef          = useRef(null);
//     const yProviderRef     = useRef(null);
//     const yWhiteboardRef   = useRef(null);
//     const ySettingsRef     = useRef(null);
//     const yUndoManagerRef  = useRef(null);
//     const yObserverCleanup = useRef(null);

//     // ── media caches ──
//     const imageCacheRef = useRef(new Map());   // id → HTMLImageElement

//     // ── raf / flush ──
//     const rafIdRef        = useRef(null);
//     const pendingObjsRef  = useRef(null);
//     const flushTimerRef   = useRef(null);

//     // ── stroke & shapes state ──
//     const currentStrokeIdRef  = useRef(null);
//     const strokeBufferRef     = useRef([]);
//     const lastLocalPointRef   = useRef(null);
//     const lastLocalMidRef     = useRef(null);
//     const pointerIdRef        = useRef(null);
//     const shapeStartRef       = useRef(null); // ✅ Added for shapes (Square, Circle, Line)

//     // ── pan ──
//     const lastPanPointRef  = useRef({ x: 0, y: 0 });
//     const canvasOffsetRef  = useRef({ x: 0, y: 0 });
//     const lastPointRef     = useRef({ x: 0, y: 0 });

//     // ── selected object (for move/delete) ──
//     const selectedIdRef = useRef(null);
//     const dragOffsetRef = useRef({ x: 0, y: 0 });
//     const isDraggingRef = useRef(false);

//     // ── state ──
//     const [tool,            setTool]            = useState("pen");
//     const [color,           setColor]           = useState("#000000");
//     const [strokeWidth,     setStrokeWidth]     = useState(2);
//     const [opacity,         setOpacity]         = useState(1);
//     const [currentZoom,     setCurrentZoom]     = useState(1);
//     const [isConnected,     setIsConnected]     = useState(false);
//     const [participants,    setParticipants]    = useState([]);
//     const [backgroundColor, setBackgroundColor] = useState("#ffffff");
//     const [isGridVisible,   setIsGridVisible]   = useState(false);
//     const [isPanning,       setIsPanning]       = useState(false);
//     const [isDrawing,       setIsDrawing]       = useState(false);
//     const [selectedId,      setSelectedId]      = useState(null);

//     const fileInputRef       = useRef(null);
//     const pdfInputRef        = useRef(null);

//     // ═══════════════════════════════════════════════════════
//     // Helpers
//     // ═══════════════════════════════════════════════════════
//     const getTransformedPoint = useCallback((e) => {
//       if (!canvasRef.current) return { x: 0, y: 0 };
//       const rect   = canvasRef.current.getBoundingClientRect();
//       const scaleX = canvasRef.current.width  / rect.width;
//       const scaleY = canvasRef.current.height / rect.height;
//       const x = (e.clientX - rect.left) * scaleX;
//       const y = (e.clientY - rect.top)  * scaleY;
//       return {
//         x: (x - canvasOffsetRef.current.x) / currentZoom,
//         y: (y - canvasOffsetRef.current.y) / currentZoom,
//       };
//     }, [currentZoom]);

//     const getCurrentObjects = useCallback(() => {
//       if (!yWhiteboardRef.current || yWhiteboardRef.current.length === 0) return [];
//       return (yWhiteboardRef.current.toArray()[0]?.objects) || [];
//     }, []);

//     // ═══════════════════════════════════════════════════════
//     // Yjs write helpers
//     // ═══════════════════════════════════════════════════════
//     const commitState = useCallback((updater) => {
//       if (!yWhiteboardRef.current || !yDocRef.current) return;
//       yDocRef.current.transact(() => {
//         const cur = yWhiteboardRef.current.toArray()[0] || {
//           version: "1.0.0", objects: [], background: backgroundColor,
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
//     }, [backgroundColor]);

//     const addObject = useCallback((obj) => {
//       commitState((cur) => ({
//         ...cur,
//         objects: [...(cur.objects || []), obj],
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString(),
//       }));
//     }, [commitState, sessionInfo]);

//     const deleteObject = useCallback((id) => {
//       commitState((cur) => ({
//         ...cur,
//         objects: (cur.objects || []).filter((o) => o.id !== id),
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString(),
//       }));
//       if (selectedIdRef.current === id) {
//         selectedIdRef.current = null;
//         setSelectedId(null);
//       }
//     }, [commitState, sessionInfo]);

//     const updateObject = useCallback((id, patch) => {
//       commitState((cur) => ({
//         ...cur,
//         objects: (cur.objects || []).map((o) => o.id === id ? { ...o, ...patch } : o),
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString(),
//       }));
//     }, [commitState, sessionInfo]);

//     // ═══════════════════════════════════════════════════════
//     // Drawing
//     // ═══════════════════════════════════════════════════════
//     const drawGrid = useCallback((ctx, w, h) => {
//       ctx.save();
//       ctx.strokeStyle = "#e0e0e0";
//       ctx.lineWidth   = 0.5;
//       ctx.globalAlpha = 0.3;
//       const gs = 20;
//       for (let x = 0; x <= w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
//       for (let y = 0; y <= h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
//       ctx.restore();
//     }, []);

//     const drawObject = useCallback((ctx, obj) => {
//       if (!obj) return;
//       ctx.save();
//       ctx.strokeStyle = obj.color       || "#000000";
//       ctx.fillStyle   = obj.fillColor   || "transparent";
//       ctx.lineWidth   = (obj.strokeWidth || 2) / currentZoom;
//       ctx.globalAlpha = obj.opacity     ?? 1;

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
//         case "text": {
//           ctx.font      = `${obj.fontSize || 16}px Arial`;
//           ctx.fillStyle = obj.color || "#000";
//           ctx.fillText(obj.text || "", obj.x, obj.y);
//           break;
//         }
//         case "image": {
//           let img = imageCacheRef.current.get(obj.id);
//           if (!img) {
//             img       = new Image();
//             img.src   = obj.src;
//             img.onload = () => scheduleRedraw(getCurrentObjects());
//             imageCacheRef.current.set(obj.id, img);
//           }
//           if (img.complete && img.naturalWidth > 0) {
//             ctx.globalAlpha = obj.opacity ?? 1;
//             ctx.drawImage(img, obj.x, obj.y, obj.width || DEFAULT_MEDIA_W, obj.height || DEFAULT_MEDIA_H);
//           } else {
//             ctx.strokeStyle = "#aaa"; ctx.strokeRect(obj.x, obj.y, obj.width || DEFAULT_MEDIA_W, obj.height || DEFAULT_MEDIA_H);
//             ctx.fillStyle   = "#eee"; ctx.font = "14px Arial";
//             ctx.fillText("Loading image…", obj.x + 8, obj.y + 20);
//           }
//           break;
//         }
//         case "pdf": {
//           let img = imageCacheRef.current.get(obj.id);
//           if (!img) {
//             img       = new Image();
//             img.src   = obj.src; // base64 rendered page
//             img.onload = () => scheduleRedraw(getCurrentObjects());
//             imageCacheRef.current.set(obj.id, img);
//           }
//           const w = obj.width  || DEFAULT_MEDIA_W;
//           const h = obj.height || DEFAULT_MEDIA_H;
//           if (img.complete && img.naturalWidth > 0) {
//             ctx.globalAlpha = obj.opacity ?? 1;
//             ctx.drawImage(img, obj.x, obj.y, w, h);
//           } else {
//             ctx.fillStyle   = "#f9fafb"; ctx.fillRect(obj.x, obj.y, w, h);
//             ctx.strokeStyle = "#d1d5db"; ctx.strokeRect(obj.x, obj.y, w, h);
//             ctx.fillStyle   = "#6b7280"; ctx.font = "14px Arial";
//             ctx.fillText("Rendering PDF…", obj.x + 8, obj.y + h / 2);
//           }
//           if (selectedIdRef.current === obj.id) {
//             ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2 / currentZoom;
//             ctx.setLineDash([6 / currentZoom, 3 / currentZoom]);
//             ctx.strokeRect(obj.x - 2, obj.y - 2, w + 4, h + 4);
//             ctx.setLineDash([]);
//           }
//           break;
//         }
//         default: break;
//       }

//       if ((obj.type === "image") && selectedIdRef.current === obj.id) {
//         ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2 / currentZoom;
//         ctx.setLineDash([6 / currentZoom, 3 / currentZoom]);
//         ctx.strokeRect(obj.x - 2, obj.y - 2, (obj.width || DEFAULT_MEDIA_W) + 4, (obj.height || DEFAULT_MEDIA_H) + 4);
//         ctx.setLineDash([]);
//       }

//       ctx.restore();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [currentZoom]);

//     const redrawCanvas = useCallback((objects) => {
//       if (!ctxRef.current || !bgCtxRef.current || !canvasRef.current) return;
//       const ctx    = ctxRef.current;
//       const bgCtx  = bgCtxRef.current;
//       const canvas = canvasRef.current;

//       ctx.clearRect(0, 0, canvas.width, canvas.height);
//       bgCtx.clearRect(0, 0, canvas.width, canvas.height);

//       bgCtx.fillStyle = backgroundColor;
//       bgCtx.fillRect(0, 0, canvas.width, canvas.height);
//       if (isGridVisible) drawGrid(bgCtx, canvas.width, canvas.height);

//       ctx.save();
//       ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//       ctx.scale(currentZoom, currentZoom);
//       (objects || []).forEach((obj) => drawObject(ctx, obj));
//       ctx.restore();
//     }, [backgroundColor, isGridVisible, currentZoom, drawGrid, drawObject]);

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
//         if (state.background) setBackgroundColor(state.background);
//         if (Array.isArray(state.objects)) scheduleRedraw(state.objects);
//       } catch (e) { console.error(e); }
//     }, [scheduleRedraw]);

//     // ═══════════════════════════════════════════════════════
//     // Smooth stroke & Shape flushing
//     // ═══════════════════════════════════════════════════════
//     const drawSmoothStroke = useCallback((prev, next, strokeType) => {
//       if (!ctxRef.current) return;
//       const ctx = ctxRef.current;
//       ctx.save();
//       ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//       ctx.scale(currentZoom, currentZoom);
//       ctx.lineCap   = "round";
//       ctx.lineJoin  = "round";
//       ctx.globalAlpha = opacity ?? 1;
//       ctx.lineWidth   = (strokeWidth || 2) / currentZoom;

//       if (strokeType === "eraser") {
//         ctx.globalCompositeOperation = "destination-out";
//         ctx.strokeStyle = "rgba(0,0,0,1)";
//       } else {
//         ctx.globalCompositeOperation = "source-over";
//         ctx.strokeStyle = color || "#000000";
//       }

//       const mid = { x: (prev.x + next.x) / 2, y: (prev.y + next.y) / 2 };
//       if (!lastLocalMidRef.current) lastLocalMidRef.current = { x: prev.x, y: prev.y };
//       ctx.beginPath();
//       ctx.moveTo(lastLocalMidRef.current.x, lastLocalMidRef.current.y);
//       ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
//       ctx.stroke();
//       lastLocalMidRef.current = mid;
//       ctx.restore();
//     }, [currentZoom, color, strokeWidth, opacity]);

//     const flushStrokeToYjs = useCallback((force = false) => {
//       const strokeId = currentStrokeIdRef.current;
//       if (!strokeId) return;
//       const buffered = strokeBufferRef.current;
//       if (!buffered.length) return;
//       const pts = buffered.slice();
//       strokeBufferRef.current = [];

//       commitState((cur) => {
//         const objs   = [...(cur.objects || [])];
//         const idx    = objs.findIndex((o) => o?.id === strokeId);
//         if (idx === -1) return cur;
//         const target = { ...objs[idx] };
//         target.points = [...(target.points || []), ...pts];
//         objs[idx] = target;
//         return { ...cur, objects: objs, updatedAt: new Date().toISOString() };
//       });
//     }, [commitState]);

//     const flushShapeToYjs = useCallback((currentPoint) => {
//       const strokeId = currentStrokeIdRef.current;
//       const startP = shapeStartRef.current;
//       if (!strokeId || !startP || !currentPoint) return;

//       commitState((cur) => {
//         const objs   = [...(cur.objects || [])];
//         const idx    = objs.findIndex((o) => o?.id === strokeId);
//         if (idx === -1) return cur;
//         const target = { ...objs[idx] };
        
//         if (target.type === "rectangle") {
//           target.width = currentPoint.x - startP.x;
//           target.height = currentPoint.y - startP.y;
//         } else if (target.type === "circle") {
//           target.radius = Math.hypot(currentPoint.x - startP.x, currentPoint.y - startP.y);
//         } else if (target.type === "line") {
//           target.x2 = currentPoint.x;
//           target.y2 = currentPoint.y;
//         }
        
//         objs[idx] = target;
//         return { ...cur, objects: objs, updatedAt: new Date().toISOString() };
//       });
//     }, [commitState]);

//     const scheduleFlush = useCallback(() => {
//       if (flushTimerRef.current) return;
//       flushTimerRef.current = setTimeout(() => {
//         flushTimerRef.current = null;
//         if (tool === "pen" || tool === "eraser") {
//           flushStrokeToYjs(false);
//         } else {
//           flushShapeToYjs(lastPointRef.current);
//         }
//       }, FLUSH_INTERVAL);
//     }, [flushStrokeToYjs, flushShapeToYjs, tool]);

//     // ═══════════════════════════════════════════════════════
//     // Hit-test for select tool
//     // ═══════════════════════════════════════════════════════
//     const hitTest = useCallback((pt) => {
//       const objs = getCurrentObjects();
//       for (let i = objs.length - 1; i >= 0; i--) {
//         const o = objs[i];
//         const w = o.width  || DEFAULT_MEDIA_W;
//         const h = o.height || DEFAULT_MEDIA_H;
//         if (["image", "pdf"].includes(o.type)) {
//           if (pt.x >= o.x && pt.x <= o.x + w && pt.y >= o.y && pt.y <= o.y + h) return o;
//         }
//       }
//       return null;
//     }, [getCurrentObjects]);

//     // ═══════════════════════════════════════════════════════
//     // Yjs init
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       if (!sessionId || !wsToken) return;

//       const initYjs = async () => {
//         try {
//           const ydoc      = new Y.Doc();
//           yDocRef.current = ydoc;

//           const baseWs   = import.meta.env.VITE_WS_URL || "ws://localhost:9090";
//           const provider = new WebsocketProvider(`${baseWs}/yjs`, sessionId, ydoc, {
//             WebSocketPolyfill: WebSocket,
//             params: {
//               token: wsToken, isStreamer: true, allowViewersToDraw,
//               roomCode, userId: sessionInfo?.streamerId, userName: sessionInfo?.streamerName,
//             },
//           });
//           yProviderRef.current  = provider;

//           const yWhiteboard      = ydoc.getArray("whiteboard");
//           yWhiteboardRef.current = yWhiteboard;

//           const ySettings        = ydoc.getMap("room_settings");
//           ySettingsRef.current   = ySettings;

//           provider.awareness.setLocalState({
//             userId: sessionInfo?.streamerId || "streamer",
//             userName: sessionInfo?.streamerName || "Streamer",
//             role: "STREAMER", isStreamer: true, color, tool, cursor: null,
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

//           new IndexeddbPersistence(`whiteboard-${sessionId}`, ydoc);

//           const observer = (event) => {
//             const origin = event?.transaction?.origin;
//             if (origin === "drawing" && (isDrawing || currentStrokeIdRef.current)) return;
//             loadWhiteboardState();
//           };
//           yWhiteboard.observe(observer);
//           yObserverCleanup.current = () => { try { yWhiteboard.unobserve(observer); } catch {} };

//         } catch (err) {
//           console.error("Failed to init Yjs:", err);
//           toast.error("Failed to connect to whiteboard server");
//         }
//       };

//       initYjs();

//       return () => {
//         try { 
//           if (tool === "pen" || tool === "eraser") flushStrokeToYjs(true); 
//           else flushShapeToYjs(lastPointRef.current);
//         } catch {}
//         if (yObserverCleanup.current) { yObserverCleanup.current(); yObserverCleanup.current = null; }
//         if (yProviderRef.current) { try { yProviderRef.current.disconnect(); yProviderRef.current.destroy(); } catch {} }
//         if (yDocRef.current)      { try { yDocRef.current.destroy(); } catch {} }
//         yProviderRef.current = yDocRef.current = yWhiteboardRef.current = null;
//       };
//       // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [sessionId, roomCode, wsToken, allowViewersToDraw, sessionInfo]);

//     // keep awareness fresh
//     useEffect(() => {
//       const p = yProviderRef.current;
//       if (!p) return;
//       try {
//         const prev = p.awareness.getLocalState() || {};
//         p.awareness.setLocalState({ ...prev, color, tool,
//           userId: sessionInfo?.streamerId || "streamer",
//           userName: sessionInfo?.streamerName || "Streamer",
//           role: "STREAMER", isStreamer: true,
//         });
//       } catch {}
//     }, [color, tool, sessionInfo]);

//     // cleanup timers
//     useEffect(() => () => {
//       if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
//       if (rafIdRef.current)      cancelAnimationFrame(rafIdRef.current);
//     }, []);

//     // ═══════════════════════════════════════════════════════
//     // Canvas init + resize
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       if (!canvasRef.current || !backgroundCanvasRef.current || !containerRef.current) return;
//       const canvas    = canvasRef.current;
//       const bgCanvas  = backgroundCanvasRef.current;
//       const container = containerRef.current;

//       const resize = () => {
//         canvas.width  = bgCanvas.width  = container.clientWidth;
//         canvas.height = bgCanvas.height = container.clientHeight;
//         const ctx   = canvas.getContext("2d");
//         const bgCtx = bgCanvas.getContext("2d");
//         ctx.lineCap = "round"; ctx.lineJoin = "round";
//         ctxRef.current = ctx; bgCtxRef.current = bgCtx;
//         if (yWhiteboardRef.current) {
//           const s = yWhiteboardRef.current.toArray()[0] || {};
//           scheduleRedraw(s.objects || []);
//         }
//       };

//       resize();
//       const ro = new ResizeObserver(resize);
//       ro.observe(container);
//       return () => ro.disconnect();
//     }, [scheduleRedraw]);

//     // ═══════════════════════════════════════════════════════
//     // Paste handler — Ctrl+V image
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       const handlePaste = async (e) => {
//         for (const item of e.clipboardData.items) {
//           if (item.type.startsWith("image/")) {
//             const file   = item.getAsFile();
//             const b64    = await fileToBase64(file);
//             const img    = new Image();
//             img.src      = b64;
//             img.onload   = () => {
//               const ratio = img.naturalWidth / img.naturalHeight;
//               const w     = Math.min(img.naturalWidth, DEFAULT_MEDIA_W);
//               const h     = w / ratio;
//               addObject({
//                 id: uid(), type: "image", src: b64,
//                 x: 80, y: 80, width: w, height: h,
//                 opacity: 1, timestamp: Date.now(),
//               });
//             };
//             break;
//           }
//         }
//       };
//       window.addEventListener("paste", handlePaste);
//       return () => window.removeEventListener("paste", handlePaste);
//     }, [addObject]);

//     // ═══════════════════════════════════════════════════════
//     // Keyboard — Delete selected
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       const handleKey = (e) => {
//         if ((e.key === "Delete" || e.key === "Backspace") && selectedIdRef.current) {
//           // Don't delete if user is typing in an input
//           if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
//           deleteObject(selectedIdRef.current);
//         }
//         if ((e.ctrlKey || e.metaKey) && e.key === "z") {
//           e.preventDefault();
//           yUndoManagerRef.current?.undo();
//         }
//         if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
//           e.preventDefault();
//           yUndoManagerRef.current?.redo();
//         }
//       };
//       window.addEventListener("keydown", handleKey);
//       return () => window.removeEventListener("keydown", handleKey);
//     }, [deleteObject]);

//     // ═══════════════════════════════════════════════════════
//     // Media upload handlers
//     // ═══════════════════════════════════════════════════════
//     const handleImageUpload = useCallback(async (e) => {
//       const file = e.target.files?.[0];
//       if (!file) return;
//       if (file.size > 10 * 1024 * 1024) { toast.error("Image must be < 10MB"); return; }
//       const b64  = await fileToBase64(file);
//       const img  = new Image();
//       img.src    = b64;
//       img.onload = () => {
//         const ratio = img.naturalWidth / img.naturalHeight;
//         const w     = Math.min(img.naturalWidth, DEFAULT_MEDIA_W);
//         const h     = w / ratio;
//         addObject({ id: uid(), type: "image", src: b64, x: 80, y: 80, width: w, height: h, opacity: 1, timestamp: Date.now() });
//       };
//       e.target.value = "";
//     }, [addObject]);

//     const handlePdfUpload = useCallback(async (e) => {
//       const file = e.target.files?.[0];
//       if (!file) return;

//       // Dynamically import pdfjs
//       const pdfjsLib = await import("pdfjs-dist");
//       pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

//       const arrayBuffer = await file.arrayBuffer();
//       const pdfDoc      = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

//       let yPos = 80;
//       for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
//         const page     = await pdfDoc.getPage(pageNum);
//         const viewport = page.getViewport({ scale: 1.5 });
//         const offCanvas = document.createElement("canvas");
//         offCanvas.width  = viewport.width;
//         offCanvas.height = viewport.height;
//         await page.render({ canvasContext: offCanvas.getContext("2d"), viewport }).promise;
//         const src = offCanvas.toDataURL("image/png");
//         addObject({
//           id: uid(), type: "pdf", src,
//           x: 80, y: yPos,
//           width: Math.min(viewport.width, DEFAULT_MEDIA_W),
//           height: Math.min(viewport.width, DEFAULT_MEDIA_W) * (viewport.height / viewport.width),
//           page: pageNum, opacity: 1, timestamp: Date.now(),
//         });
//         yPos += Math.min(viewport.width, DEFAULT_MEDIA_W) * (viewport.height / viewport.width) + 20;
//       }
//       toast.success(`PDF loaded — ${pdfDoc.numPages} page(s)`);
//       e.target.value = "";
//     }, [addObject]);

//     // ═══════════════════════════════════════════════════════
//     // Pointer events
//     // ═══════════════════════════════════════════════════════
//     const handlePointerDown = useCallback((e) => {
//       e.preventDefault();
//       if (!canvasRef.current || e.button === 2) return;
//       try { canvasRef.current.setPointerCapture(e.pointerId); pointerIdRef.current = e.pointerId; } catch {}

//       if (tool === "pan" || e.altKey || e.button === 1) {
//         setIsPanning(true);
//         lastPanPointRef.current = { x: e.clientX, y: e.clientY };
//         canvasRef.current.style.cursor = "grabbing";
//         return;
//       }

//       const p = getTransformedPoint(e);

//       // Select tool
//       if (tool === "select") {
//         const hit = hitTest(p);
//         if (hit) {
//           selectedIdRef.current = hit.id;
//           setSelectedId(hit.id);
//           dragOffsetRef.current = { x: p.x - hit.x, y: p.y - hit.y };
//           isDraggingRef.current = true;
//         } else {
//           selectedIdRef.current = null;
//           setSelectedId(null);
//         }
//         scheduleRedraw(getCurrentObjects());
//         return;
//       }

//       setIsDrawing(true);
//       lastPointRef.current      = p;
//       lastLocalPointRef.current = p;
//       lastLocalMidRef.current   = null;
//       shapeStartRef.current     = p; // Set the origin point for shapes

//       const strokeId = uid();
//       currentStrokeIdRef.current = strokeId;

//       if (tool === "pen" || tool === "eraser") {
//         strokeBufferRef.current    = [];
//         addObject({
//           id: strokeId, type: tool,
//           points: [{ x: p.x, y: p.y }],
//           color: tool === "eraser" ? backgroundColor : color,
//           strokeWidth, opacity, timestamp: Date.now(),
//         });
//         drawSmoothStroke(p, { x: p.x + 0.01, y: p.y + 0.01 }, tool);
//       } else if (["line", "rectangle", "circle"].includes(tool)) {
//          // Create initial shape object
//          const baseObj = {
//             id: strokeId, type: tool,
//             x: p.x, y: p.y,
//             color, strokeWidth, opacity, timestamp: Date.now()
//          };
//          if (tool === "line") { baseObj.x1 = p.x; baseObj.y1 = p.y; baseObj.x2 = p.x; baseObj.y2 = p.y; }
//          if (tool === "rectangle") { baseObj.width = 0; baseObj.height = 0; }
//          if (tool === "circle") { baseObj.radius = 0; }
//          addObject(baseObj);
//       }
//     }, [tool, getTransformedPoint, hitTest, addObject, drawSmoothStroke, scheduleRedraw, getCurrentObjects, backgroundColor, color, strokeWidth, opacity]);

//     const handlePointerMove = useCallback((e) => {
//       if (!canvasRef.current) return;

//       if (isPanning) {
//         const dx = e.clientX - lastPanPointRef.current.x;
//         const dy = e.clientY - lastPanPointRef.current.y;
//         canvasOffsetRef.current.x += dx;
//         canvasOffsetRef.current.y += dy;
//         lastPanPointRef.current = { x: e.clientX, y: e.clientY };
//         scheduleRedraw(getCurrentObjects());
//         return;
//       }

//       // drag media object
//       if (tool === "select" && isDraggingRef.current && selectedIdRef.current) {
//         const p = getTransformedPoint(e);
//         updateObject(selectedIdRef.current, {
//           x: p.x - dragOffsetRef.current.x,
//           y: p.y - dragOffsetRef.current.y,
//         });
//         return;
//       }

//       if (!isDrawing) return;

//       if (tool === "pen" || tool === "eraser") {
//         const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e];
//         for (const evt of events) {
//           const next = getTransformedPoint(evt);
//           const prev = lastLocalPointRef.current || lastPointRef.current;
//           const dist = prev ? Math.hypot(next.x - prev.x, next.y - prev.y) : 999;
//           if (dist < MIN_MOVE_DIST) continue;
//           if (prev) drawSmoothStroke(prev, next, tool);
//           strokeBufferRef.current.push(next);
//           scheduleFlush();
//           lastLocalPointRef.current = next;
//           lastPointRef.current      = next;
//         }
//       } else if (["line", "rectangle", "circle"].includes(tool)) {
//         const next = getTransformedPoint(e);
//         lastPointRef.current = next;

//         // 1. Instant local UI feedback
//         redrawCanvas(getCurrentObjects());
//         const ctx = ctxRef.current;
//         ctx.save();
//         ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//         ctx.scale(currentZoom, currentZoom);
//         ctx.strokeStyle = color;
//         ctx.lineWidth = (strokeWidth || 2) / currentZoom;
//         ctx.globalAlpha = opacity ?? 1;

//         if (tool === "rectangle") {
//             ctx.strokeRect(shapeStartRef.current.x, shapeStartRef.current.y, next.x - shapeStartRef.current.x, next.y - shapeStartRef.current.y);
//         } else if (tool === "circle") {
//             ctx.beginPath();
//             ctx.arc(shapeStartRef.current.x, shapeStartRef.current.y, Math.hypot(next.x - shapeStartRef.current.x, next.y - shapeStartRef.current.y), 0, Math.PI * 2);
//             ctx.stroke();
//         } else if (tool === "line") {
//             ctx.beginPath();
//             ctx.moveTo(shapeStartRef.current.x, shapeStartRef.current.y);
//             ctx.lineTo(next.x, next.y);
//             ctx.stroke();
//         }
//         ctx.restore();

//         // 2. Throttled sync to network
//         if (!flushTimerRef.current) {
//           flushTimerRef.current = setTimeout(() => {
//               flushTimerRef.current = null;
//               flushShapeToYjs(lastPointRef.current);
//           }, FLUSH_INTERVAL);
//         }
//       }
//     }, [isDrawing, isPanning, tool, getTransformedPoint, drawSmoothStroke, scheduleFlush, flushShapeToYjs, scheduleRedraw, getCurrentObjects, updateObject, redrawCanvas, color, strokeWidth, opacity, currentZoom]);

//     const endStrokeCleanup = useCallback(() => {
//       if (tool === "pen" || tool === "eraser") {
//          flushStrokeToYjs(true);
//       } else if (["line", "rectangle", "circle"].includes(tool)) {
//          flushShapeToYjs(lastPointRef.current);
//       }
      
//       currentStrokeIdRef.current = null;
//       strokeBufferRef.current    = [];
//       lastLocalPointRef.current  = null;
//       lastLocalMidRef.current    = null;
//       shapeStartRef.current      = null;
//       isDraggingRef.current      = false;
//       if (canvasRef.current && pointerIdRef.current != null) {
//         try { canvasRef.current.releasePointerCapture(pointerIdRef.current); } catch {}
//       }
//       pointerIdRef.current = null;
//     }, [flushStrokeToYjs, flushShapeToYjs, tool]);

//     const handlePointerUp   = useCallback(() => { setIsDrawing(false); setIsPanning(false); endStrokeCleanup(); if (canvasRef.current) canvasRef.current.style.cursor = tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair"; }, [tool, endStrokeCleanup]);
//     const handlePointerLeave = useCallback(() => { setIsDrawing(false); setIsPanning(false); endStrokeCleanup(); }, [endStrokeCleanup]);

//     // ═══════════════════════════════════════════════════════
//     // Zoom + wheel
//     // ═══════════════════════════════════════════════════════
//     const handleWheel = useCallback((e) => {
//       e.preventDefault();
//       if (!canvasRef.current) return;
//       const rect   = canvasRef.current.getBoundingClientRect();
//       const mx     = e.clientX - rect.left;
//       const my     = e.clientY - rect.top;
//       const factor = e.deltaY > 0 ? 0.9 : 1.1;
//       const newZ   = Math.max(0.5, Math.min(3, currentZoom * factor));
//       const change = newZ / currentZoom;
//       canvasOffsetRef.current.x = mx - (mx - canvasOffsetRef.current.x) * change;
//       canvasOffsetRef.current.y = my - (my - canvasOffsetRef.current.y) * change;
//       setCurrentZoom(newZ);
//       scheduleRedraw(getCurrentObjects());
//     }, [currentZoom, scheduleRedraw, getCurrentObjects]);

//     const handleZoomIn    = useCallback(() => { setCurrentZoom((p) => Math.min(p + 0.1, 3));  scheduleRedraw(getCurrentObjects()); }, [scheduleRedraw, getCurrentObjects]);
//     const handleZoomOut   = useCallback(() => { setCurrentZoom((p) => Math.max(p - 0.1, 0.5)); scheduleRedraw(getCurrentObjects()); }, [scheduleRedraw, getCurrentObjects]);
//     const handleZoomReset = useCallback(() => { setCurrentZoom(1); canvasOffsetRef.current = { x: 0, y: 0 }; scheduleRedraw(getCurrentObjects()); }, [scheduleRedraw, getCurrentObjects]);

//     // ═══════════════════════════════════════════════════════
//     // Whiteboard actions
//     // ═══════════════════════════════════════════════════════
//     const handleClearWhiteboard = useCallback(() => {
//       if (!yWhiteboardRef.current || !yDocRef.current) return;
//       if (!window.confirm("Clear entire whiteboard?")) return;
//       yDocRef.current.transact(() => {
//         yWhiteboardRef.current.delete(0, yWhiteboardRef.current.length);
//         yWhiteboardRef.current.insert(0, [{
//           version: "1.0.0", objects: [], background: backgroundColor,
//           clearedAt: new Date().toISOString(), clearedBy: sessionInfo?.streamerId,
//         }]);
//       }, "drawing");
//       imageCacheRef.current.clear();
//       scheduleRedraw([]);
//       toast.success("Whiteboard cleared");
//     }, [backgroundColor, sessionInfo, scheduleRedraw]);

//     const handleExport = useCallback(() => {
//       if (!canvasRef.current || !backgroundCanvasRef.current) return;
//       const exp = document.createElement("canvas");
//       exp.width  = canvasRef.current.width;
//       exp.height = canvasRef.current.height;
//       const ctx  = exp.getContext("2d");
//       ctx.drawImage(backgroundCanvasRef.current, 0, 0);
//       ctx.drawImage(canvasRef.current,           0, 0);
//       const link     = document.createElement("a");
//       link.download  = `whiteboard-${sessionId}-${Date.now()}.png`;
//       link.href      = exp.toDataURL("image/png");
//       link.click();
//       toast.success("Whiteboard exported");
//     }, [sessionId]);

//     const handleUndo = useCallback(() => yUndoManagerRef.current?.undo(), []);
//     const handleRedo = useCallback(() => yUndoManagerRef.current?.redo(), []);

//     const handleDeleteSelected = useCallback(() => {
//       if (selectedIdRef.current) deleteObject(selectedIdRef.current);
//     }, [deleteObject]);

//     // ═══════════════════════════════════════════════════════
//     // Render
//     // ═══════════════════════════════════════════════════════
//     const cursorStyle = tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair";

//     return (
//       <div
//         ref={containerRef}
//         className={`absolute inset-0 z-20 w-full h-full bg-gray-900 overflow-hidden ${isActive ? "block" : "hidden"}`}
//         onWheel={handleWheel}
//       >
//         {/* Hidden file inputs */}
//         <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
//         <input ref={pdfInputRef}  type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handlePdfUpload} />

//         {/* Background canvas */}
//         <canvas ref={backgroundCanvasRef} className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: "none" }} />

//         {/* Main drawing canvas */}
//         <canvas
//           ref={canvasRef}
//           className={`absolute top-0 left-0 w-full h-full`}
//           style={{ touchAction: "none", cursor: cursorStyle, zIndex: 20 }}
//           onPointerDown={handlePointerDown}
//           onPointerMove={handlePointerMove}
//           onPointerUp={handlePointerUp}
//           onPointerLeave={handlePointerLeave}
//           onContextMenu={(e) => e.preventDefault()}
//         />

//         {/* ── Top Toolbar ── */}
//         <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30">
//           <div className="bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700 px-2 py-1.5 flex items-center gap-1.5 flex-wrap">

//             {/* Connection status */}
//             <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
//             <span className="text-white text-xs mr-1">{isConnected ? "Live" : "Offline"}</span>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Draw tools */}
//             {[
//               { t: "pen",       icon: <FaPaintBrush className="w-3.5 h-3.5" />,   title: "Pen" },
//               { t: "eraser",    icon: <FaEraser     className="w-3.5 h-3.5" />,   title: "Eraser" },
//               { t: "line",      icon: <FiMinus      className="w-3.5 h-3.5" />,   title: "Line" },
//               { t: "rectangle", icon: <FiSquare     className="w-3.5 h-3.5" />,   title: "Rectangle" },
//               { t: "circle",    icon: <FiCircle     className="w-3.5 h-3.5" />,   title: "Circle" },
//               { t: "select",    icon: <FiMousePointer className="w-3.5 h-3.5" />, title: "Select / Move (media)" },
//               { t: "pan",       icon: <FiMove       className="w-3.5 h-3.5" />,   title: "Pan (Alt+Drag)" },
//             ].map(({ t, icon, title }) => (
//               <button key={t} onClick={() => setTool(t)} title={title}
//                 className={`p-1.5 rounded-lg transition-colors ${tool === t ? "bg-blue-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"}`}>
//                 {icon}
//               </button>
//             ))}

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Color + stroke */}
//             <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
//               className="w-6 h-6 rounded cursor-pointer border border-gray-600" title="Color" />
//             <select value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))}
//               className="bg-gray-700 text-white text-xs rounded px-1.5 py-1 border border-gray-600 w-14">
//               {[1,2,3,5,8].map((v) => <option key={v} value={v}>{v}px</option>)}
//             </select>
//             <select value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
//               className="bg-gray-700 text-white text-xs rounded px-1.5 py-1 border border-gray-600 w-14">
//               {[1,0.8,0.6,0.4].map((v) => <option key={v} value={v}>{v*100}%</option>)}
//             </select>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Media insert buttons */}
//             <button onClick={() => fileInputRef.current?.click()} title="Upload Image"
//               className="p-1.5 bg-gray-700 hover:bg-green-700 rounded-lg transition-colors text-gray-300 hover:text-white">
//               <FiImage className="w-3.5 h-3.5" />
//             </button>
//             <button onClick={() => pdfInputRef.current?.click()} title="Upload PDF / Document"
//               className="p-1.5 bg-gray-700 hover:bg-orange-700 rounded-lg transition-colors text-gray-300 hover:text-white">
//               <FiFileText className="w-3.5 h-3.5" />
//             </button>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Delete selected */}
//             {selectedId && (
//               <button onClick={handleDeleteSelected} title="Delete selected (Del)"
//                 className="p-1.5 bg-red-700 hover:bg-red-600 rounded-lg transition-colors text-white">
//                 <FiTrash2 className="w-3.5 h-3.5" />
//               </button>
//             )}

//             {/* Zoom */}
//             <button onClick={handleZoomOut}   title="Zoom Out"  className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiMinusCircle className="w-3.5 h-3.5 text-white"/></button>
//             <span className="text-white text-xs min-w-[44px] text-center">{Math.round(currentZoom * 100)}%</span>
//             <button onClick={handleZoomIn}    title="Zoom In"   className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiPlus className="w-3.5 h-3.5 text-white"/></button>
//             <button onClick={handleZoomReset} title="Reset Zoom" className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiRefreshCcw className="w-3.5 h-3.5 text-white"/></button>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Undo/Redo */}
//             <button onClick={handleUndo} title="Undo (Ctrl+Z)"             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiRefreshCcw className="w-3.5 h-3.5 text-white"/></button>
//             <button onClick={handleRedo} title="Redo (Ctrl+Y)"             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiRefreshCcw className="w-3.5 h-3.5 text-white transform scale-x-[-1]"/></button>

//             {/* Grid */}
//             <button onClick={() => setIsGridVisible((v) => !v)} title="Toggle Grid"
//               className={`p-1.5 rounded-lg transition-colors ${isGridVisible ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
//               <FiSquare className="w-3.5 h-3.5" />
//             </button>

//             {/* Clear + Export */}
//             <button onClick={handleClearWhiteboard} title="Clear All" className="p-1.5 bg-red-900 hover:bg-red-800 rounded-lg"><FiTrash2   className="w-3.5 h-3.5 text-white"/></button>
//             <button onClick={handleExport}          title="Export PNG" className="p-1.5 bg-blue-900 hover:bg-blue-800 rounded-lg"><FiDownload className="w-3.5 h-3.5 text-white"/></button>

//             <div className="w-px h-5 bg-gray-600" />
//             <button onClick={onClose} title="Close" className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg"><FiX className="w-3.5 h-3.5 text-white"/></button>
//           </div>
//         </div>

//         {/* ── Bottom status bar ── */}
//         <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm border border-gray-700">
//           <div className="flex items-center gap-3">
//             <span>Tool: <span className="font-bold capitalize">{tool}</span></span>
//             <span className="w-1 h-1 bg-gray-500 rounded-full" />
//             <span>Zoom: <span className="font-bold">{Math.round(currentZoom * 100)}%</span></span>
//             <span className="w-1 h-1 bg-gray-500 rounded-full" />
//             <span>Viewers: <span className="font-bold">{participants.length}</span></span>
//             {selectedId && <><span className="w-1 h-1 bg-gray-500 rounded-full" /><span className="text-blue-400">Object selected — Del to remove</span></>}
//             <span className="w-1 h-1 bg-gray-500 rounded-full" />
//             <span className="text-gray-400">Ctrl+V to paste image</span>
//           </div>
//         </div>

//         {/* ── Viewers list ── */}
//         <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm border border-gray-700">
//           <div className="flex items-center gap-2">
//             <span>{participants.length} viewer{participants.length !== 1 ? "s" : ""}</span>
//             {participants.map((p) => (
//               <div key={p.clientId} className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-medium" title={p.userName || "User"}>
//                 {(p.userName || "U").charAt(0)}
//               </div>
//             ))}
//           </div>
//         </div>

//         {isPanning && (
//           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-600 flex items-center gap-2 pointer-events-none">
//             <FiMove className="w-4 h-4" /> <span>Panning…</span>
//           </div>
//         )}
//       </div>
//     );
//   },
//   (prev, next) => {
//     if (prev.sessionId         !== next.sessionId)         return false;
//     if (prev.roomCode          !== next.roomCode)          return false;
//     if (prev.wsToken           !== next.wsToken)           return false;
//     if (prev.isActive          !== next.isActive)          return false;
//     if (prev.allowViewersToDraw !== next.allowViewersToDraw) return false;
//     if (prev.mainScreenMode    !== next.mainScreenMode)    return false;
//     if (prev.compact           !== next.compact)           return false;
//     if (prev.sessionInfo?.streamerId   !== next.sessionInfo?.streamerId)   return false;
//     if (prev.sessionInfo?.streamerName !== next.sessionInfo?.streamerName) return false;
//     return true;
//   }
// );

// StreamerWhiteboard.displayName = "StreamerWhiteboard";
// export default StreamerWhiteboard;



// import React, {
//   useState, useEffect, useRef, useCallback, memo,
// } from "react";
// import * as Y from "yjs";
// import { WebsocketProvider } from "y-websocket";
// import { IndexeddbPersistence } from "y-indexeddb";
// import {
//   FiSquare, FiCircle, FiMinus, FiDownload, FiRefreshCcw,
//   FiTrash2, FiMove, FiPlus, FiMinusCircle, FiX, FiImage,
//   FiVideo, FiGlobe, FiFileText, FiMousePointer, FiLink,
// } from "react-icons/fi";
// import { FaEraser, FaPaintBrush } from "react-icons/fa";
// import { toast } from "react-toastify";

// // ─── constants ────────────────────────────────────────────────────────────────
// const DEFAULT_MEDIA_W = 480;
// const DEFAULT_MEDIA_H = 270;
// const FLUSH_INTERVAL  = 50;   // ms — throttle Yjs stroke sync
// const MIN_MOVE_DIST   = 0.6;  // px — ignore pointer jitter

// // ─── helpers ──────────────────────────────────────────────────────────────────
// function uid() {
//   return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
// }

// function fileToBase64(file) {
//   return new Promise((res, rej) => {
//     const r = new FileReader();
//     r.onload  = () => res(r.result);
//     r.onerror = rej;
//     r.readAsDataURL(file);
//   });
// }

// // ─── StreamerWhiteboard ───────────────────────────────────────────────────────
// const StreamerWhiteboard = memo(
//   ({
//     sessionId,
//     roomCode,
//     wsToken,
//     sessionInfo,
//     isActive,
//     onClose,
//     allowViewersToDraw = true,
//     mainScreenMode     = false,
//     compact            = false,
//   }) => {
//     // ── canvas refs ──
//     const canvasRef           = useRef(null);
//     const backgroundCanvasRef = useRef(null);
//     const ctxRef              = useRef(null);
//     const bgCtxRef            = useRef(null);
//     const containerRef        = useRef(null);

//     // ── Yjs refs ──
//     const yDocRef          = useRef(null);
//     const yProviderRef     = useRef(null);
//     const yWhiteboardRef   = useRef(null);
//     const ySettingsRef     = useRef(null);
//     const yVideoStateRef   = useRef(null);
//     const yUndoManagerRef  = useRef(null);
//     const yObserverCleanup = useRef(null);

//     // ── media caches ──
//     const imageCacheRef = useRef(new Map());   // id → HTMLImageElement
//     const videoCacheRef = useRef(new Map());   // id → HTMLVideoElement

//     // ── raf / flush ──
//     const rafIdRef        = useRef(null);
//     const pendingObjsRef  = useRef(null);
//     const flushTimerRef   = useRef(null);

//     // ── stroke state ──
//     const currentStrokeIdRef  = useRef(null);
//     const strokeBufferRef     = useRef([]);
//     const lastLocalPointRef   = useRef(null);
//     const lastLocalMidRef     = useRef(null);
//     const pointerIdRef        = useRef(null);

//     // ── pan ──
//     const lastPanPointRef  = useRef({ x: 0, y: 0 });
//     const canvasOffsetRef  = useRef({ x: 0, y: 0 });
//     const lastPointRef     = useRef({ x: 0, y: 0 });

//     // ── selected object (for move/delete) ──
//     const selectedIdRef = useRef(null);
//     const dragOffsetRef = useRef({ x: 0, y: 0 });
//     const isDraggingRef = useRef(false);

//     // ── state ──
//     const [tool,            setTool]            = useState("pen");
//     const [color,           setColor]           = useState("#000000");
//     const [strokeWidth,     setStrokeWidth]     = useState(2);
//     const [opacity,         setOpacity]         = useState(1);
//     const [currentZoom,     setCurrentZoom]     = useState(1);
//     const [isConnected,     setIsConnected]     = useState(false);
//     const [participants,    setParticipants]     = useState([]);
//     const [backgroundColor, setBackgroundColor] = useState("#ffffff");
//     const [isGridVisible,   setIsGridVisible]   = useState(false);
//     const [isPanning,       setIsPanning]       = useState(false);
//     const [isDrawing,       setIsDrawing]       = useState(false);
//     const [selectedId,      setSelectedId]      = useState(null);

//     // ── modals ──
//     const [showUrlModal,     setShowUrlModal]     = useState(false);
//     const [urlModalType,     setUrlModalType]     = useState("website"); // "website"|"video"
//     const [urlInput,         setUrlInput]         = useState("");
//     const fileInputRef       = useRef(null);
//     const pdfInputRef        = useRef(null);

//     // ── animation frame for video ──
//     const videoRafRef = useRef(null);

//     // ═══════════════════════════════════════════════════════
//     // Helpers
//     // ═══════════════════════════════════════════════════════
//     const getTransformedPoint = useCallback((e) => {
//       if (!canvasRef.current) return { x: 0, y: 0 };
//       const rect   = canvasRef.current.getBoundingClientRect();
//       const scaleX = canvasRef.current.width  / rect.width;
//       const scaleY = canvasRef.current.height / rect.height;
//       const x = (e.clientX - rect.left) * scaleX;
//       const y = (e.clientY - rect.top)  * scaleY;
//       return {
//         x: (x - canvasOffsetRef.current.x) / currentZoom,
//         y: (y - canvasOffsetRef.current.y) / currentZoom,
//       };
//     }, [currentZoom]);

//     const getCurrentObjects = useCallback(() => {
//       if (!yWhiteboardRef.current || yWhiteboardRef.current.length === 0) return [];
//       return (yWhiteboardRef.current.toArray()[0]?.objects) || [];
//     }, []);

//     // ═══════════════════════════════════════════════════════
//     // Yjs write helpers
//     // ═══════════════════════════════════════════════════════
//     const commitState = useCallback((updater) => {
//       if (!yWhiteboardRef.current || !yDocRef.current) return;
//       yDocRef.current.transact(() => {
//         const cur = yWhiteboardRef.current.toArray()[0] || {
//           version: "1.0.0", objects: [], background: backgroundColor,
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
//     }, [backgroundColor]);

//     const addObject = useCallback((obj) => {
//       commitState((cur) => ({
//         ...cur,
//         objects: [...(cur.objects || []), obj],
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString(),
//       }));
//     }, [commitState, sessionInfo]);

//     const deleteObject = useCallback((id) => {
//       commitState((cur) => ({
//         ...cur,
//         objects: (cur.objects || []).filter((o) => o.id !== id),
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString(),
//       }));
//       if (selectedIdRef.current === id) {
//         selectedIdRef.current = null;
//         setSelectedId(null);
//       }
//     }, [commitState, sessionInfo]);

//     const updateObject = useCallback((id, patch) => {
//       commitState((cur) => ({
//         ...cur,
//         objects: (cur.objects || []).map((o) => o.id === id ? { ...o, ...patch } : o),
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString(),
//       }));
//     }, [commitState, sessionInfo]);

//     // ═══════════════════════════════════════════════════════
//     // Drawing
//     // ═══════════════════════════════════════════════════════
//     const drawGrid = useCallback((ctx, w, h) => {
//       ctx.save();
//       ctx.strokeStyle = "#e0e0e0";
//       ctx.lineWidth   = 0.5;
//       ctx.globalAlpha = 0.3;
//       const gs = 20;
//       for (let x = 0; x <= w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
//       for (let y = 0; y <= h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
//       ctx.restore();
//     }, []);

//     const drawObject = useCallback((ctx, obj) => {
//       if (!obj) return;
//       ctx.save();
//       ctx.strokeStyle = obj.color       || "#000000";
//       ctx.fillStyle   = obj.fillColor   || "transparent";
//       ctx.lineWidth   = (obj.strokeWidth || 2) / currentZoom;
//       ctx.globalAlpha = obj.opacity     ?? 1;

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
//         case "text": {
//           ctx.font      = `${obj.fontSize || 16}px Arial`;
//           ctx.fillStyle = obj.color || "#000";
//           ctx.fillText(obj.text || "", obj.x, obj.y);
//           break;
//         }

//         // ── image ──
//         case "image": {
//           let img = imageCacheRef.current.get(obj.id);
//           if (!img) {
//             img       = new Image();
//             img.src   = obj.src;
//             img.onload = () => scheduleRedraw(getCurrentObjects());
//             imageCacheRef.current.set(obj.id, img);
//           }
//           if (img.complete && img.naturalWidth > 0) {
//             ctx.globalAlpha = obj.opacity ?? 1;
//             ctx.drawImage(img, obj.x, obj.y, obj.width || DEFAULT_MEDIA_W, obj.height || DEFAULT_MEDIA_H);
//           } else {
//             // placeholder while loading
//             ctx.strokeStyle = "#aaa"; ctx.strokeRect(obj.x, obj.y, obj.width || DEFAULT_MEDIA_W, obj.height || DEFAULT_MEDIA_H);
//             ctx.fillStyle   = "#eee"; ctx.font = "14px Arial";
//             ctx.fillText("Loading image…", obj.x + 8, obj.y + 20);
//           }
//           break;
//         }

//         // ── video ──
//         case "video": {
//           let vid = videoCacheRef.current.get(obj.id);
//           if (!vid) {
//             vid     = document.createElement("video");
//             vid.src = obj.src;
//             vid.crossOrigin  = "anonymous";
//             vid.preload      = "auto";
//             vid.muted        = false;
//             vid.playsInline  = true;
//             videoCacheRef.current.set(obj.id, vid);
//           }
//           const w = obj.width  || DEFAULT_MEDIA_W;
//           const h = obj.height || DEFAULT_MEDIA_H;
//           if (vid.readyState >= 2) {
//             ctx.globalAlpha = obj.opacity ?? 1;
//             ctx.drawImage(vid, obj.x, obj.y, w, h);
//           } else {
//             ctx.fillStyle   = "#111"; ctx.fillRect(obj.x, obj.y, w, h);
//             ctx.fillStyle   = "#fff"; ctx.font = "14px Arial";
//             ctx.fillText("Loading video…", obj.x + 8, obj.y + h / 2);
//           }
//           // selection border
//           if (selectedIdRef.current === obj.id) {
//             ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2 / currentZoom;
//             ctx.setLineDash([6 / currentZoom, 3 / currentZoom]);
//             ctx.strokeRect(obj.x - 2, obj.y - 2, w + 4, h + 4);
//             ctx.setLineDash([]);
//           }
//           break;
//         }

//         // ── website placeholder on canvas ──
//         case "website": {
//           const w = obj.width  || DEFAULT_MEDIA_W;
//           const h = obj.height || DEFAULT_MEDIA_H;
//           ctx.fillStyle   = "#f0f4ff"; ctx.fillRect(obj.x, obj.y, w, h);
//           ctx.strokeStyle = "#93c5fd"; ctx.lineWidth = 1.5 / currentZoom;
//           ctx.strokeRect(obj.x, obj.y, w, h);
//           ctx.fillStyle = "#1e40af"; ctx.font = `bold ${14 / currentZoom}px Arial`;
//           ctx.fillText("🌐 " + (obj.url || "Website"), obj.x + 10, obj.y + 24);
//           ctx.fillStyle = "#64748b"; ctx.font = `${11 / currentZoom}px Arial`;
//           ctx.fillText(obj.url || "", obj.x + 10, obj.y + 42);
//           if (selectedIdRef.current === obj.id) {
//             ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2 / currentZoom;
//             ctx.setLineDash([6 / currentZoom, 3 / currentZoom]);
//             ctx.strokeRect(obj.x - 2, obj.y - 2, w + 4, h + 4);
//             ctx.setLineDash([]);
//           }
//           break;
//         }

//         // ── pdf page ──
//         case "pdf": {
//           let img = imageCacheRef.current.get(obj.id);
//           if (!img) {
//             img       = new Image();
//             img.src   = obj.src; // base64 rendered page
//             img.onload = () => scheduleRedraw(getCurrentObjects());
//             imageCacheRef.current.set(obj.id, img);
//           }
//           const w = obj.width  || DEFAULT_MEDIA_W;
//           const h = obj.height || DEFAULT_MEDIA_H;
//           if (img.complete && img.naturalWidth > 0) {
//             ctx.globalAlpha = obj.opacity ?? 1;
//             ctx.drawImage(img, obj.x, obj.y, w, h);
//           } else {
//             ctx.fillStyle   = "#f9fafb"; ctx.fillRect(obj.x, obj.y, w, h);
//             ctx.strokeStyle = "#d1d5db"; ctx.strokeRect(obj.x, obj.y, w, h);
//             ctx.fillStyle   = "#6b7280"; ctx.font = "14px Arial";
//             ctx.fillText("Rendering PDF…", obj.x + 8, obj.y + h / 2);
//           }
//           if (selectedIdRef.current === obj.id) {
//             ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2 / currentZoom;
//             ctx.setLineDash([6 / currentZoom, 3 / currentZoom]);
//             ctx.strokeRect(obj.x - 2, obj.y - 2, w + 4, h + 4);
//             ctx.setLineDash([]);
//           }
//           break;
//         }

//         default: break;
//       }

//       // selection highlight for image
//       if (
//         (obj.type === "image") &&
//         selectedIdRef.current === obj.id
//       ) {
//         ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2 / currentZoom;
//         ctx.setLineDash([6 / currentZoom, 3 / currentZoom]);
//         ctx.strokeRect(obj.x - 2, obj.y - 2, (obj.width || DEFAULT_MEDIA_W) + 4, (obj.height || DEFAULT_MEDIA_H) + 4);
//         ctx.setLineDash([]);
//       }

//       ctx.restore();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [currentZoom]);

//     const redrawCanvas = useCallback((objects) => {
//       if (!ctxRef.current || !bgCtxRef.current || !canvasRef.current) return;
//       const ctx    = ctxRef.current;
//       const bgCtx  = bgCtxRef.current;
//       const canvas = canvasRef.current;

//       ctx.clearRect(0, 0, canvas.width, canvas.height);
//       bgCtx.clearRect(0, 0, canvas.width, canvas.height);

//       bgCtx.fillStyle = backgroundColor;
//       bgCtx.fillRect(0, 0, canvas.width, canvas.height);
//       if (isGridVisible) drawGrid(bgCtx, canvas.width, canvas.height);

//       ctx.save();
//       ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//       ctx.scale(currentZoom, currentZoom);
//       (objects || []).forEach((obj) => drawObject(ctx, obj));
//       ctx.restore();
//     }, [backgroundColor, isGridVisible, currentZoom, drawGrid, drawObject]);

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
//         if (state.background) setBackgroundColor(state.background);
//         if (Array.isArray(state.objects)) scheduleRedraw(state.objects);
//       } catch (e) { console.error(e); }
//     }, [scheduleRedraw]);

//     // ═══════════════════════════════════════════════════════
//     // Video RAF loop — keeps video frames painted on canvas
//     // ═══════════════════════════════════════════════════════
//     const startVideoLoop = useCallback(() => {
//       if (videoRafRef.current) return;
//       const loop = () => {
//         const hasVideo = getCurrentObjects().some((o) => o.type === "video");
//         if (!hasVideo) { videoRafRef.current = null; return; }
//         scheduleRedraw(getCurrentObjects());
//         videoRafRef.current = requestAnimationFrame(loop);
//       };
//       videoRafRef.current = requestAnimationFrame(loop);
//     }, [getCurrentObjects, scheduleRedraw]);

//     // ═══════════════════════════════════════════════════════
//     // Smooth stroke (local incremental draw)
//     // ═══════════════════════════════════════════════════════
//     const drawSmoothStroke = useCallback((prev, next, strokeType) => {
//       if (!ctxRef.current) return;
//       const ctx = ctxRef.current;
//       ctx.save();
//       ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//       ctx.scale(currentZoom, currentZoom);
//       ctx.lineCap   = "round";
//       ctx.lineJoin  = "round";
//       ctx.globalAlpha = opacity ?? 1;
//       ctx.lineWidth   = (strokeWidth || 2) / currentZoom;

//       if (strokeType === "eraser") {
//         ctx.globalCompositeOperation = "destination-out";
//         ctx.strokeStyle = "rgba(0,0,0,1)";
//       } else {
//         ctx.globalCompositeOperation = "source-over";
//         ctx.strokeStyle = color || "#000000";
//       }

//       const mid = { x: (prev.x + next.x) / 2, y: (prev.y + next.y) / 2 };
//       if (!lastLocalMidRef.current) lastLocalMidRef.current = { x: prev.x, y: prev.y };
//       ctx.beginPath();
//       ctx.moveTo(lastLocalMidRef.current.x, lastLocalMidRef.current.y);
//       ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
//       ctx.stroke();
//       lastLocalMidRef.current = mid;
//       ctx.restore();
//     }, [currentZoom, color, strokeWidth, opacity]);

//     // ═══════════════════════════════════════════════════════
//     // Throttled Yjs stroke flush
//     // ═══════════════════════════════════════════════════════
//     const flushStrokeToYjs = useCallback((force = false) => {
//       const strokeId = currentStrokeIdRef.current;
//       if (!strokeId) return;
//       const buffered = strokeBufferRef.current;
//       if (!buffered.length) return;
//       const pts = buffered.slice();
//       strokeBufferRef.current = [];

//       commitState((cur) => {
//         const objs   = [...(cur.objects || [])];
//         const idx    = objs.findIndex((o) => o?.id === strokeId);
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

//     // ═══════════════════════════════════════════════════════
//     // Hit-test for select tool
//     // ═══════════════════════════════════════════════════════
//     const hitTest = useCallback((pt) => {
//       const objs = getCurrentObjects();
//       for (let i = objs.length - 1; i >= 0; i--) {
//         const o = objs[i];
//         const w = o.width  || DEFAULT_MEDIA_W;
//         const h = o.height || DEFAULT_MEDIA_H;
//         if (["image", "video", "website", "pdf"].includes(o.type)) {
//           if (pt.x >= o.x && pt.x <= o.x + w && pt.y >= o.y && pt.y <= o.y + h) return o;
//         }
//       }
//       return null;
//     }, [getCurrentObjects]);

//     // ═══════════════════════════════════════════════════════
//     // Yjs init
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       if (!sessionId || !wsToken) return;

//       const initYjs = async () => {
//         try {
//           const ydoc    = new Y.Doc();
//           yDocRef.current = ydoc;

//           const baseWs  = import.meta.env.VITE_WS_URL || "ws://localhost:9090";
//           const provider = new WebsocketProvider(`${baseWs}/yjs`, sessionId, ydoc, {
//             WebSocketPolyfill: WebSocket,
//             params: {
//               token: wsToken, isStreamer: true, allowViewersToDraw,
//               roomCode, userId: sessionInfo?.streamerId, userName: sessionInfo?.streamerName,
//             },
//           });
//           yProviderRef.current  = provider;

//           const yWhiteboard     = ydoc.getArray("whiteboard");
//           yWhiteboardRef.current = yWhiteboard;

//           const ySettings       = ydoc.getMap("room_settings");
//           ySettingsRef.current  = ySettings;

//           const yVideoState     = ydoc.getMap("video_state");
//           yVideoStateRef.current = yVideoState;

//           provider.awareness.setLocalState({
//             userId: sessionInfo?.streamerId || "streamer",
//             userName: sessionInfo?.streamerName || "Streamer",
//             role: "STREAMER", isStreamer: true, color, tool, cursor: null,
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

//           new IndexeddbPersistence(`whiteboard-${sessionId}`, ydoc);

//           const observer = (event) => {
//             const origin = event?.transaction?.origin;
//             if (origin === "drawing" && (isDrawing || currentStrokeIdRef.current)) return;
//             loadWhiteboardState();
//           };
//           yWhiteboard.observe(observer);
//           yObserverCleanup.current = () => { try { yWhiteboard.unobserve(observer); } catch {} };

//           // video state observer — sync play/pause from yjs to all video elements
//           yVideoState.observe(() => {
//             const action      = yVideoState.get("action");
//             const targetId    = yVideoState.get("targetId");
//             const currentTime = yVideoState.get("currentTime");
//             const vid         = videoCacheRef.current.get(targetId);
//             if (!vid) return;
//             if (typeof currentTime === "number") vid.currentTime = currentTime;
//             if (action === "play")  vid.play().catch(() => {});
//             if (action === "pause") vid.pause();
//           });

//         } catch (err) {
//           console.error("Failed to init Yjs:", err);
//           toast.error("Failed to connect to whiteboard server");
//         }
//       };

//       initYjs();

//       return () => {
//         try { flushStrokeToYjs(true); } catch {}
//         if (yObserverCleanup.current) { yObserverCleanup.current(); yObserverCleanup.current = null; }
//         if (yProviderRef.current) { try { yProviderRef.current.disconnect(); yProviderRef.current.destroy(); } catch {} }
//         if (yDocRef.current)      { try { yDocRef.current.destroy(); } catch {} }
//         yProviderRef.current = yDocRef.current = yWhiteboardRef.current = null;
//         if (videoRafRef.current) { cancelAnimationFrame(videoRafRef.current); videoRafRef.current = null; }
//       };
//       // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [sessionId, roomCode, wsToken, allowViewersToDraw, sessionInfo]);

//     // keep awareness fresh
//     useEffect(() => {
//       const p = yProviderRef.current;
//       if (!p) return;
//       try {
//         const prev = p.awareness.getLocalState() || {};
//         p.awareness.setLocalState({ ...prev, color, tool,
//           userId: sessionInfo?.streamerId || "streamer",
//           userName: sessionInfo?.streamerName || "Streamer",
//           role: "STREAMER", isStreamer: true,
//         });
//       } catch {}
//     }, [color, tool, sessionInfo]);

//     // cleanup timers
//     useEffect(() => () => {
//       if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
//       if (rafIdRef.current)      cancelAnimationFrame(rafIdRef.current);
//     }, []);

//     // ═══════════════════════════════════════════════════════
//     // Canvas init + resize
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       if (!canvasRef.current || !backgroundCanvasRef.current || !containerRef.current) return;
//       const canvas    = canvasRef.current;
//       const bgCanvas  = backgroundCanvasRef.current;
//       const container = containerRef.current;

//       const resize = () => {
//         canvas.width  = bgCanvas.width  = container.clientWidth;
//         canvas.height = bgCanvas.height = container.clientHeight;
//         const ctx   = canvas.getContext("2d");
//         const bgCtx = bgCanvas.getContext("2d");
//         ctx.lineCap = "round"; ctx.lineJoin = "round";
//         ctxRef.current = ctx; bgCtxRef.current = bgCtx;
//         if (yWhiteboardRef.current) {
//           const s = yWhiteboardRef.current.toArray()[0] || {};
//           scheduleRedraw(s.objects || []);
//         }
//       };

//       resize();
//       const ro = new ResizeObserver(resize);
//       ro.observe(container);
//       return () => ro.disconnect();
//     }, [scheduleRedraw]);

//     // ═══════════════════════════════════════════════════════
//     // Paste handler — Ctrl+V image
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       const handlePaste = async (e) => {
//         for (const item of e.clipboardData.items) {
//           if (item.type.startsWith("image/")) {
//             const file   = item.getAsFile();
//             const b64    = await fileToBase64(file);
//             const img    = new Image();
//             img.src      = b64;
//             img.onload   = () => {
//               const ratio = img.naturalWidth / img.naturalHeight;
//               const w     = Math.min(img.naturalWidth, DEFAULT_MEDIA_W);
//               const h     = w / ratio;
//               addObject({
//                 id: uid(), type: "image", src: b64,
//                 x: 80, y: 80, width: w, height: h,
//                 opacity: 1, timestamp: Date.now(),
//               });
//             };
//             break;
//           }
//         }
//       };
//       window.addEventListener("paste", handlePaste);
//       return () => window.removeEventListener("paste", handlePaste);
//     }, [addObject]);

//     // ═══════════════════════════════════════════════════════
//     // Keyboard — Delete selected
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       const handleKey = (e) => {
//         if ((e.key === "Delete" || e.key === "Backspace") && selectedIdRef.current) {
//           // Don't delete if user is typing in an input
//           if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
//           deleteObject(selectedIdRef.current);
//         }
//         if ((e.ctrlKey || e.metaKey) && e.key === "z") {
//           e.preventDefault();
//           yUndoManagerRef.current?.undo();
//         }
//         if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
//           e.preventDefault();
//           yUndoManagerRef.current?.redo();
//         }
//       };
//       window.addEventListener("keydown", handleKey);
//       return () => window.removeEventListener("keydown", handleKey);
//     }, [deleteObject]);

//     // ═══════════════════════════════════════════════════════
//     // Media upload handlers
//     // ═══════════════════════════════════════════════════════
//     const handleImageUpload = useCallback(async (e) => {
//       const file = e.target.files?.[0];
//       if (!file) return;
//       if (file.size > 10 * 1024 * 1024) { toast.error("Image must be < 10MB"); return; }
//       const b64  = await fileToBase64(file);
//       const img  = new Image();
//       img.src    = b64;
//       img.onload = () => {
//         const ratio = img.naturalWidth / img.naturalHeight;
//         const w     = Math.min(img.naturalWidth, DEFAULT_MEDIA_W);
//         const h     = w / ratio;
//         addObject({ id: uid(), type: "image", src: b64, x: 80, y: 80, width: w, height: h, opacity: 1, timestamp: Date.now() });
//       };
//       e.target.value = "";
//     }, [addObject]);

//     const handlePdfUpload = useCallback(async (e) => {
//       const file = e.target.files?.[0];
//       if (!file) return;

//       // Dynamically import pdfjs
//       const pdfjsLib = await import("pdfjs-dist");
//       pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

//       const arrayBuffer = await file.arrayBuffer();
//       const pdfDoc      = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

//       let yPos = 80;
//       for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
//         const page     = await pdfDoc.getPage(pageNum);
//         const viewport = page.getViewport({ scale: 1.5 });
//         const offCanvas = document.createElement("canvas");
//         offCanvas.width  = viewport.width;
//         offCanvas.height = viewport.height;
//         await page.render({ canvasContext: offCanvas.getContext("2d"), viewport }).promise;
//         const src = offCanvas.toDataURL("image/png");
//         addObject({
//           id: uid(), type: "pdf", src,
//           x: 80, y: yPos,
//           width: Math.min(viewport.width, DEFAULT_MEDIA_W),
//           height: Math.min(viewport.width, DEFAULT_MEDIA_W) * (viewport.height / viewport.width),
//           page: pageNum, opacity: 1, timestamp: Date.now(),
//         });
//         yPos += Math.min(viewport.width, DEFAULT_MEDIA_W) * (viewport.height / viewport.width) + 20;
//       }
//       toast.success(`PDF loaded — ${pdfDoc.numPages} page(s)`);
//       e.target.value = "";
//     }, [addObject]);

//     const handleUrlSubmit = useCallback(() => {
//       let url = urlInput.trim();
//       if (!url) return;
//       if (!url.startsWith("http")) url = "https://" + url;

//       if (urlModalType === "video") {
//         addObject({
//           id: uid(), type: "video", src: url,
//           x: 80, y: 80, width: DEFAULT_MEDIA_W, height: DEFAULT_MEDIA_H,
//           opacity: 1, timestamp: Date.now(),
//         });
//         // Notify video state
//         if (yVideoStateRef.current) {
//           yVideoStateRef.current.set("action", "load");
//           yVideoStateRef.current.set("url", url);
//         }
//         startVideoLoop();
//       } else {
//         addObject({
//           id: uid(), type: "website", url,
//           x: 80, y: 80, width: DEFAULT_MEDIA_W, height: DEFAULT_MEDIA_H,
//           opacity: 1, timestamp: Date.now(),
//         });
//         // Sync URL to viewers via settings
//         if (ySettingsRef.current) {
//           ySettingsRef.current.set("activeUrl", url);
//           ySettingsRef.current.set("urlMode", true);
//         }
//       }
//       setUrlInput("");
//       setShowUrlModal(false);
//     }, [urlInput, urlModalType, addObject, startVideoLoop]);

//     // ═══════════════════════════════════════════════════════
//     // Video controls (play/pause/seek broadcast)
//     // ═══════════════════════════════════════════════════════
//     const broadcastVideoAction = useCallback((objId, action, currentTime) => {
//       if (!yVideoStateRef.current) return;
//       yVideoStateRef.current.set("targetId",   objId);
//       yVideoStateRef.current.set("action",     action);
//       yVideoStateRef.current.set("currentTime", currentTime);
//       yVideoStateRef.current.set("ts",          Date.now());
//       // also apply locally
//       const vid = videoCacheRef.current.get(objId);
//       if (!vid) return;
//       if (typeof currentTime === "number") vid.currentTime = currentTime;
//       if (action === "play")  { vid.play().catch(() => {}); startVideoLoop(); }
//       if (action === "pause") vid.pause();
//     }, [startVideoLoop]);

//     // ═══════════════════════════════════════════════════════
//     // Pointer events
//     // ═══════════════════════════════════════════════════════
//     const handlePointerDown = useCallback((e) => {
//       e.preventDefault();
//       if (!canvasRef.current || e.button === 2) return;
//       try { canvasRef.current.setPointerCapture(e.pointerId); pointerIdRef.current = e.pointerId; } catch {}

//       if (tool === "pan" || e.altKey || e.button === 1) {
//         setIsPanning(true);
//         lastPanPointRef.current = { x: e.clientX, y: e.clientY };
//         canvasRef.current.style.cursor = "grabbing";
//         return;
//       }

//       const p = getTransformedPoint(e);

//       // Select tool
//       if (tool === "select") {
//         const hit = hitTest(p);
//         if (hit) {
//           selectedIdRef.current = hit.id;
//           setSelectedId(hit.id);
//           dragOffsetRef.current = { x: p.x - hit.x, y: p.y - hit.y };
//           isDraggingRef.current = true;
//         } else {
//           selectedIdRef.current = null;
//           setSelectedId(null);
//         }
//         scheduleRedraw(getCurrentObjects());
//         return;
//       }

//       setIsDrawing(true);
//       lastPointRef.current      = p;
//       lastLocalPointRef.current = p;
//       lastLocalMidRef.current   = null;

//       if (tool === "pen" || tool === "eraser") {
//         const strokeId = uid();
//         currentStrokeIdRef.current = strokeId;
//         strokeBufferRef.current    = [];
//         addObject({
//           id: strokeId, type: tool,
//           points: [{ x: p.x, y: p.y }],
//           color: tool === "eraser" ? backgroundColor : color,
//           strokeWidth, opacity, timestamp: Date.now(),
//         });
//         drawSmoothStroke(p, { x: p.x + 0.01, y: p.y + 0.01 }, tool);
//       }
//     }, [tool, getTransformedPoint, hitTest, addObject, drawSmoothStroke,
//         scheduleRedraw, getCurrentObjects, backgroundColor, color, strokeWidth, opacity]);

//     const handlePointerMove = useCallback((e) => {
//       if (!canvasRef.current) return;

//       if (isPanning) {
//         const dx = e.clientX - lastPanPointRef.current.x;
//         const dy = e.clientY - lastPanPointRef.current.y;
//         canvasOffsetRef.current.x += dx;
//         canvasOffsetRef.current.y += dy;
//         lastPanPointRef.current = { x: e.clientX, y: e.clientY };
//         scheduleRedraw(getCurrentObjects());
//         return;
//       }

//       // drag media object
//       if (tool === "select" && isDraggingRef.current && selectedIdRef.current) {
//         const p = getTransformedPoint(e);
//         updateObject(selectedIdRef.current, {
//           x: p.x - dragOffsetRef.current.x,
//           y: p.y - dragOffsetRef.current.y,
//         });
//         return;
//       }

//       if (!isDrawing || (tool !== "pen" && tool !== "eraser")) return;

//       const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e];
//       for (const evt of events) {
//         const next = getTransformedPoint(evt);
//         const prev = lastLocalPointRef.current || lastPointRef.current;
//         const dist = prev ? Math.hypot(next.x - prev.x, next.y - prev.y) : 999;
//         if (dist < MIN_MOVE_DIST) continue;
//         if (prev) drawSmoothStroke(prev, next, tool);
//         strokeBufferRef.current.push(next);
//         scheduleFlush();
//         lastLocalPointRef.current = next;
//         lastPointRef.current      = next;
//       }
//     }, [isDrawing, isPanning, tool, getTransformedPoint, drawSmoothStroke,
//         scheduleFlush, scheduleRedraw, getCurrentObjects, updateObject]);

//     const endStrokeCleanup = useCallback(() => {
//       flushStrokeToYjs(true);
//       currentStrokeIdRef.current = null;
//       strokeBufferRef.current    = [];
//       lastLocalPointRef.current  = null;
//       lastLocalMidRef.current    = null;
//       isDraggingRef.current      = false;
//       if (canvasRef.current && pointerIdRef.current != null) {
//         try { canvasRef.current.releasePointerCapture(pointerIdRef.current); } catch {}
//       }
//       pointerIdRef.current = null;
//     }, [flushStrokeToYjs]);

//     const handlePointerUp   = useCallback(() => { setIsDrawing(false); setIsPanning(false); endStrokeCleanup(); if (canvasRef.current) canvasRef.current.style.cursor = tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair"; }, [tool, endStrokeCleanup]);
//     const handlePointerLeave = useCallback(() => { setIsDrawing(false); setIsPanning(false); endStrokeCleanup(); }, [endStrokeCleanup]);

//     // ═══════════════════════════════════════════════════════
//     // Zoom + wheel
//     // ═══════════════════════════════════════════════════════
//     const handleWheel = useCallback((e) => {
//       e.preventDefault();
//       if (!canvasRef.current) return;
//       const rect   = canvasRef.current.getBoundingClientRect();
//       const mx     = e.clientX - rect.left;
//       const my     = e.clientY - rect.top;
//       const factor = e.deltaY > 0 ? 0.9 : 1.1;
//       const newZ   = Math.max(0.5, Math.min(3, currentZoom * factor));
//       const change = newZ / currentZoom;
//       canvasOffsetRef.current.x = mx - (mx - canvasOffsetRef.current.x) * change;
//       canvasOffsetRef.current.y = my - (my - canvasOffsetRef.current.y) * change;
//       setCurrentZoom(newZ);
//       scheduleRedraw(getCurrentObjects());
//     }, [currentZoom, scheduleRedraw, getCurrentObjects]);

//     const handleZoomIn    = useCallback(() => { setCurrentZoom((p) => Math.min(p + 0.1, 3));  scheduleRedraw(getCurrentObjects()); }, [scheduleRedraw, getCurrentObjects]);
//     const handleZoomOut   = useCallback(() => { setCurrentZoom((p) => Math.max(p - 0.1, 0.5)); scheduleRedraw(getCurrentObjects()); }, [scheduleRedraw, getCurrentObjects]);
//     const handleZoomReset = useCallback(() => { setCurrentZoom(1); canvasOffsetRef.current = { x: 0, y: 0 }; scheduleRedraw(getCurrentObjects()); }, [scheduleRedraw, getCurrentObjects]);

//     // ═══════════════════════════════════════════════════════
//     // Whiteboard actions
//     // ═══════════════════════════════════════════════════════
//     const handleClearWhiteboard = useCallback(() => {
//       if (!yWhiteboardRef.current || !yDocRef.current) return;
//       if (!window.confirm("Clear entire whiteboard?")) return;
//       yDocRef.current.transact(() => {
//         yWhiteboardRef.current.delete(0, yWhiteboardRef.current.length);
//         yWhiteboardRef.current.insert(0, [{
//           version: "1.0.0", objects: [], background: backgroundColor,
//           clearedAt: new Date().toISOString(), clearedBy: sessionInfo?.streamerId,
//         }]);
//       }, "drawing");
//       imageCacheRef.current.clear();
//       videoCacheRef.current.forEach((v) => { v.pause(); v.src = ""; });
//       videoCacheRef.current.clear();
//       if (videoRafRef.current) { cancelAnimationFrame(videoRafRef.current); videoRafRef.current = null; }
//       scheduleRedraw([]);
//       toast.success("Whiteboard cleared");
//     }, [backgroundColor, sessionInfo, scheduleRedraw]);

//     const handleExport = useCallback(() => {
//       if (!canvasRef.current || !backgroundCanvasRef.current) return;
//       const exp = document.createElement("canvas");
//       exp.width  = canvasRef.current.width;
//       exp.height = canvasRef.current.height;
//       const ctx  = exp.getContext("2d");
//       ctx.drawImage(backgroundCanvasRef.current, 0, 0);
//       ctx.drawImage(canvasRef.current,           0, 0);
//       const link     = document.createElement("a");
//       link.download  = `whiteboard-${sessionId}-${Date.now()}.png`;
//       link.href      = exp.toDataURL("image/png");
//       link.click();
//       toast.success("Whiteboard exported");
//     }, [sessionId]);

//     const handleUndo = useCallback(() => yUndoManagerRef.current?.undo(), []);
//     const handleRedo = useCallback(() => yUndoManagerRef.current?.redo(), []);

//     const handleDeleteSelected = useCallback(() => {
//       if (selectedIdRef.current) deleteObject(selectedIdRef.current);
//     }, [deleteObject]);

//     // ═══════════════════════════════════════════════════════
//     // Render
//     // ═══════════════════════════════════════════════════════
//     const cursorStyle = tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair";

//     return (
//       <div
//         ref={containerRef}
//         className={`absolute inset-0 z-20 w-full h-full bg-gray-900 overflow-hidden ${isActive ? "block" : "hidden"}`}
//         onWheel={handleWheel}
//       >
//         {/* Hidden file inputs */}
//         <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
//         <input ref={pdfInputRef}  type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handlePdfUpload} />

//         {/* Background canvas */}
//         <canvas ref={backgroundCanvasRef} className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: "none" }} />

//         {/* Website iframes — rendered as overlays, positioned per object */}
//         {getCurrentObjects()
//           .filter((o) => o.type === "website")
//           .map((obj) => (
//             <div
//               key={obj.id}
//               style={{
//                 position:  "absolute",
//                 left:      (obj.x * currentZoom + canvasOffsetRef.current.x) + "px",
//                 top:       (obj.y * currentZoom + canvasOffsetRef.current.y) + "px",
//                 width:     (obj.width  || DEFAULT_MEDIA_W) * currentZoom + "px",
//                 height:    (obj.height || DEFAULT_MEDIA_H) * currentZoom + "px",
//                 zIndex:    15,
//                 pointerEvents: tool === "select" ? "all" : "none",
//                 border:    selectedId === obj.id ? "2px dashed #3b82f6" : "1px solid #93c5fd",
//                 borderRadius: 4,
//                 overflow:  "hidden",
//               }}
//             >
//               <iframe
//                 src={obj.url}
//                 title={obj.url}
//                 style={{ width: "100%", height: "100%", border: "none" }}
//                 sandbox="allow-scripts allow-same-origin allow-forms"
//               />
//             </div>
//           ))
//         }

//         {/* Video overlays — for play/pause/seek controls */}
//         {getCurrentObjects()
//           .filter((o) => o.type === "video")
//           .map((obj) => {
//             const vid = videoCacheRef.current.get(obj.id);
//             const isPlaying = vid && !vid.paused;
//             return (
//               <div
//                 key={obj.id}
//                 style={{
//                   position: "absolute",
//                   left:   (obj.x * currentZoom + canvasOffsetRef.current.x) + "px",
//                   top:    (obj.y * currentZoom + canvasOffsetRef.current.y) + "px",
//                   width:  (obj.width  || DEFAULT_MEDIA_W) * currentZoom + "px",
//                   height: (obj.height || DEFAULT_MEDIA_H) * currentZoom + "px",
//                   zIndex: 16, pointerEvents: "none",
//                 }}
//               >
//                 {/* Control bar at bottom */}
//                 <div style={{
//                   position: "absolute", bottom: 0, left: 0, right: 0,
//                   background: "rgba(0,0,0,0.6)", display: "flex",
//                   alignItems: "center", gap: 8, padding: "4px 8px",
//                   pointerEvents: "all", zIndex: 17,
//                 }}>
//                   <button
//                     onClick={() => broadcastVideoAction(obj.id, isPlaying ? "pause" : "play", vid?.currentTime || 0)}
//                     style={{ color: "#fff", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
//                   >
//                     {isPlaying ? "⏸" : "▶"}
//                   </button>
//                   <input
//                     type="range" min={0} max={vid?.duration || 100} step={0.1}
//                     value={vid?.currentTime || 0}
//                     onChange={(e) => broadcastVideoAction(obj.id, "seek", parseFloat(e.target.value))}
//                     style={{ flex: 1, accentColor: "#3b82f6" }}
//                   />
//                   <button
//                     onClick={() => deleteObject(obj.id)}
//                     style={{ color: "#f87171", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}
//                   >✕</button>
//                 </div>
//               </div>
//             );
//           })
//         }

//         {/* Main drawing canvas */}
//         <canvas
//           ref={canvasRef}
//           className={`absolute top-0 left-0 w-full h-full`}
//           style={{ touchAction: "none", cursor: cursorStyle, zIndex: 20 }}
//           onPointerDown={handlePointerDown}
//           onPointerMove={handlePointerMove}
//           onPointerUp={handlePointerUp}
//           onPointerLeave={handlePointerLeave}
//           onContextMenu={(e) => e.preventDefault()}
//         />

//         {/* ── URL Modal ── */}
//         {showUrlModal && (
//           <div
//             className="absolute inset-0 flex items-center justify-center z-50"
//             style={{ background: "rgba(0,0,0,0.6)" }}
//           >
//             <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 w-96 shadow-2xl">
//               <h3 className="text-white text-lg font-semibold mb-4">
//                 {urlModalType === "video" ? "Add Video URL" : "Add Website URL"}
//               </h3>
//               <input
//                 type="url"
//                 autoFocus
//                 value={urlInput}
//                 onChange={(e) => setUrlInput(e.target.value)}
//                 onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit(); if (e.key === "Escape") setShowUrlModal(false); }}
//                 placeholder={urlModalType === "video" ? "https://example.com/video.mp4" : "https://example.com"}
//                 className="w-full bg-gray-700 text-white border border-gray-500 rounded-lg px-3 py-2 mb-4 outline-none focus:border-blue-500"
//               />
//               {urlModalType === "website" && (
//                 <p className="text-yellow-400 text-xs mb-3">Note: Some websites block embedding (e.g. Google, YouTube). Use direct .mp4 links for video.</p>
//               )}
//               <div className="flex gap-3">
//                 <button onClick={handleUrlSubmit} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 font-medium transition-colors">Add</button>
//                 <button onClick={() => setShowUrlModal(false)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white rounded-lg py-2 transition-colors">Cancel</button>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* ── Top Toolbar ── */}
//         <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30">
//           <div className="bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700 px-2 py-1.5 flex items-center gap-1.5 flex-wrap">

//             {/* Connection status */}
//             <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
//             <span className="text-white text-xs mr-1">{isConnected ? "Live" : "Offline"}</span>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Draw tools */}
//             {[
//               { t: "pen",       icon: <FaPaintBrush className="w-3.5 h-3.5" />,   title: "Pen" },
//               { t: "eraser",    icon: <FaEraser     className="w-3.5 h-3.5" />,   title: "Eraser" },
//               { t: "line",      icon: <FiMinus      className="w-3.5 h-3.5" />,   title: "Line" },
//               { t: "rectangle", icon: <FiSquare     className="w-3.5 h-3.5" />,   title: "Rectangle" },
//               { t: "circle",    icon: <FiCircle     className="w-3.5 h-3.5" />,   title: "Circle" },
//               { t: "select",    icon: <FiMousePointer className="w-3.5 h-3.5" />, title: "Select / Move (media)" },
//               { t: "pan",       icon: <FiMove       className="w-3.5 h-3.5" />,   title: "Pan (Alt+Drag)" },
//             ].map(({ t, icon, title }) => (
//               <button key={t} onClick={() => setTool(t)} title={title}
//                 className={`p-1.5 rounded-lg transition-colors ${tool === t ? "bg-blue-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"}`}>
//                 {icon}
//               </button>
//             ))}

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Color + stroke */}
//             <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
//               className="w-6 h-6 rounded cursor-pointer border border-gray-600" title="Color" />
//             <select value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))}
//               className="bg-gray-700 text-white text-xs rounded px-1.5 py-1 border border-gray-600 w-14">
//               {[1,2,3,5,8].map((v) => <option key={v} value={v}>{v}px</option>)}
//             </select>
//             <select value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
//               className="bg-gray-700 text-white text-xs rounded px-1.5 py-1 border border-gray-600 w-14">
//               {[1,0.8,0.6,0.4].map((v) => <option key={v} value={v}>{v*100}%</option>)}
//             </select>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Media insert buttons */}
//             <button onClick={() => fileInputRef.current?.click()} title="Upload Image"
//               className="p-1.5 bg-gray-700 hover:bg-green-700 rounded-lg transition-colors text-gray-300 hover:text-white">
//               <FiImage className="w-3.5 h-3.5" />
//             </button>
//             <button onClick={() => { setUrlModalType("video"); setShowUrlModal(true); }} title="Add Video URL"
//               className="p-1.5 bg-gray-700 hover:bg-purple-700 rounded-lg transition-colors text-gray-300 hover:text-white">
//               <FiVideo className="w-3.5 h-3.5" />
//             </button>
//             <button onClick={() => { setUrlModalType("website"); setShowUrlModal(true); }} title="Embed Website"
//               className="p-1.5 bg-gray-700 hover:bg-blue-700 rounded-lg transition-colors text-gray-300 hover:text-white">
//               <FiGlobe className="w-3.5 h-3.5" />
//             </button>
//             <button onClick={() => pdfInputRef.current?.click()} title="Upload PDF / Document"
//               className="p-1.5 bg-gray-700 hover:bg-orange-700 rounded-lg transition-colors text-gray-300 hover:text-white">
//               <FiFileText className="w-3.5 h-3.5" />
//             </button>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Delete selected */}
//             {selectedId && (
//               <button onClick={handleDeleteSelected} title="Delete selected (Del)"
//                 className="p-1.5 bg-red-700 hover:bg-red-600 rounded-lg transition-colors text-white">
//                 <FiTrash2 className="w-3.5 h-3.5" />
//               </button>
//             )}

//             {/* Zoom */}
//             <button onClick={handleZoomOut}   title="Zoom Out"  className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiMinusCircle className="w-3.5 h-3.5 text-white"/></button>
//             <span className="text-white text-xs min-w-[44px] text-center">{Math.round(currentZoom * 100)}%</span>
//             <button onClick={handleZoomIn}    title="Zoom In"   className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiPlus className="w-3.5 h-3.5 text-white"/></button>
//             <button onClick={handleZoomReset} title="Reset Zoom" className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiRefreshCcw className="w-3.5 h-3.5 text-white"/></button>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Undo/Redo */}
//             <button onClick={handleUndo} title="Undo (Ctrl+Z)"             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiRefreshCcw className="w-3.5 h-3.5 text-white"/></button>
//             <button onClick={handleRedo} title="Redo (Ctrl+Y)"             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiRefreshCcw className="w-3.5 h-3.5 text-white transform scale-x-[-1]"/></button>

//             {/* Grid */}
//             <button onClick={() => setIsGridVisible((v) => !v)} title="Toggle Grid"
//               className={`p-1.5 rounded-lg transition-colors ${isGridVisible ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
//               <FiSquare className="w-3.5 h-3.5" />
//             </button>

//             {/* Clear + Export */}
//             <button onClick={handleClearWhiteboard} title="Clear All" className="p-1.5 bg-red-900 hover:bg-red-800 rounded-lg"><FiTrash2   className="w-3.5 h-3.5 text-white"/></button>
//             <button onClick={handleExport}          title="Export PNG" className="p-1.5 bg-blue-900 hover:bg-blue-800 rounded-lg"><FiDownload className="w-3.5 h-3.5 text-white"/></button>

//             <div className="w-px h-5 bg-gray-600" />
//             <button onClick={onClose} title="Close" className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg"><FiX className="w-3.5 h-3.5 text-white"/></button>
//           </div>
//         </div>

//         {/* ── Bottom status bar ── */}
//         <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm border border-gray-700">
//           <div className="flex items-center gap-3">
//             <span>Tool: <span className="font-bold capitalize">{tool}</span></span>
//             <span className="w-1 h-1 bg-gray-500 rounded-full" />
//             <span>Zoom: <span className="font-bold">{Math.round(currentZoom * 100)}%</span></span>
//             <span className="w-1 h-1 bg-gray-500 rounded-full" />
//             <span>Viewers: <span className="font-bold">{participants.length}</span></span>
//             {selectedId && <><span className="w-1 h-1 bg-gray-500 rounded-full" /><span className="text-blue-400">Object selected — Del to remove</span></>}
//             <span className="w-1 h-1 bg-gray-500 rounded-full" />
//             <span className="text-gray-400">Ctrl+V to paste image</span>
//           </div>
//         </div>

//         {/* ── Viewers list ── */}
//         <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm border border-gray-700">
//           <div className="flex items-center gap-2">
//             <span>{participants.length} viewer{participants.length !== 1 ? "s" : ""}</span>
//             {participants.map((p) => (
//               <div key={p.clientId} className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-medium" title={p.userName || "User"}>
//                 {(p.userName || "U").charAt(0)}
//               </div>
//             ))}
//           </div>
//         </div>

//         {isPanning && (
//           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-600 flex items-center gap-2 pointer-events-none">
//             <FiMove className="w-4 h-4" /> <span>Panning…</span>
//           </div>
//         )}
//       </div>
//     );
//   },
//   (prev, next) => {
//     if (prev.sessionId         !== next.sessionId)         return false;
//     if (prev.roomCode          !== next.roomCode)          return false;
//     if (prev.wsToken           !== next.wsToken)           return false;
//     if (prev.isActive          !== next.isActive)          return false;
//     if (prev.allowViewersToDraw !== next.allowViewersToDraw) return false;
//     if (prev.mainScreenMode    !== next.mainScreenMode)    return false;
//     if (prev.compact           !== next.compact)           return false;
//     if (prev.sessionInfo?.streamerId   !== next.sessionInfo?.streamerId)   return false;
//     if (prev.sessionInfo?.streamerName !== next.sessionInfo?.streamerName) return false;
//     return true;
//   }
// );

// StreamerWhiteboard.displayName = "StreamerWhiteboard";
// export default StreamerWhiteboard;





// import React, {
//   useState, useEffect, useRef, useCallback, memo,
// } from "react";
// import * as Y from "yjs";
// import { WebsocketProvider } from "y-websocket";
// import { IndexeddbPersistence } from "y-indexeddb";
// import {
//   FiSquare, FiCircle, FiMinus, FiDownload, FiRefreshCcw,
//   FiTrash2, FiMove, FiPlus, FiMinusCircle, FiX, FiImage,
//   FiVideo, FiGlobe, FiFileText, FiMousePointer, FiLink,
// } from "react-icons/fi";
// import { FaEraser, FaPaintBrush } from "react-icons/fa";
// import { toast } from "react-toastify";

// // ─── constants ────────────────────────────────────────────────────────────────
// const DEFAULT_MEDIA_W = 480;
// const DEFAULT_MEDIA_H = 270;
// const FLUSH_INTERVAL  = 50;   // ms — throttle Yjs stroke sync
// const MIN_MOVE_DIST   = 0.6;  // px — ignore pointer jitter

// // ─── helpers ──────────────────────────────────────────────────────────────────
// function uid() {
//   return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
// }

// function fileToBase64(file) {
//   return new Promise((res, rej) => {
//     const r = new FileReader();
//     r.onload  = () => res(r.result);
//     r.onerror = rej;
//     r.readAsDataURL(file);
//   });
// }

// // ─── StreamerWhiteboard ───────────────────────────────────────────────────────
// const StreamerWhiteboard = memo(
//   ({
//     sessionId,
//     roomCode,
//     wsToken,
//     sessionInfo,
//     isActive,
//     onClose,
//     allowViewersToDraw = true,
//     mainScreenMode     = false,
//     compact            = false,
//   }) => {
//     // ── canvas refs ──
//     const canvasRef           = useRef(null);
//     const backgroundCanvasRef = useRef(null);
//     const ctxRef              = useRef(null);
//     const bgCtxRef            = useRef(null);
//     const containerRef        = useRef(null);

//     // ── Yjs refs ──
//     const yDocRef          = useRef(null);
//     const yProviderRef     = useRef(null);
//     const yWhiteboardRef   = useRef(null);
//     const ySettingsRef     = useRef(null);
//     const yVideoStateRef   = useRef(null);
//     const yUndoManagerRef  = useRef(null);
//     const yObserverCleanup = useRef(null);

//     // ── media caches ──
//     const imageCacheRef = useRef(new Map());   // id → HTMLImageElement
//     const videoCacheRef = useRef(new Map());   // id → HTMLVideoElement

//     // ── raf / flush ──
//     const rafIdRef        = useRef(null);
//     const pendingObjsRef  = useRef(null);
//     const flushTimerRef   = useRef(null);

//     // ── stroke state ──
//     const currentStrokeIdRef  = useRef(null);
//     const strokeBufferRef     = useRef([]);
//     const lastLocalPointRef   = useRef(null);
//     const lastLocalMidRef     = useRef(null);
//     const pointerIdRef        = useRef(null);

//     // ── pan ──
//     const lastPanPointRef  = useRef({ x: 0, y: 0 });
//     const canvasOffsetRef  = useRef({ x: 0, y: 0 });
//     const lastPointRef     = useRef({ x: 0, y: 0 });

//     // ── selected object (for move/delete) ──
//     const selectedIdRef = useRef(null);
//     const dragOffsetRef = useRef({ x: 0, y: 0 });
//     const isDraggingRef = useRef(false);

//     // ── state ──
//     const [tool,            setTool]            = useState("pen");
//     const [color,           setColor]           = useState("#000000");
//     const [strokeWidth,     setStrokeWidth]     = useState(2);
//     const [opacity,         setOpacity]         = useState(1);
//     const [currentZoom,     setCurrentZoom]     = useState(1);
//     const [isConnected,     setIsConnected]     = useState(false);
//     const [participants,    setParticipants]     = useState([]);
//     const [backgroundColor, setBackgroundColor] = useState("#ffffff");
//     const [isGridVisible,   setIsGridVisible]   = useState(false);
//     const [isPanning,       setIsPanning]       = useState(false);
//     const [isDrawing,       setIsDrawing]       = useState(false);
//     const [selectedId,      setSelectedId]      = useState(null);

//     // ── modals ──
//     const [showUrlModal,     setShowUrlModal]     = useState(false);
//     const [urlModalType,     setUrlModalType]     = useState("website"); // "website"|"video"
//     const [urlInput,         setUrlInput]         = useState("");
//     const fileInputRef       = useRef(null);
//     const pdfInputRef        = useRef(null);

//     // ── animation frame for video ──
//     const videoRafRef = useRef(null);

//     // ═══════════════════════════════════════════════════════
//     // Helpers
//     // ═══════════════════════════════════════════════════════
//     const getTransformedPoint = useCallback((e) => {
//       if (!canvasRef.current) return { x: 0, y: 0 };
//       const rect   = canvasRef.current.getBoundingClientRect();
//       const scaleX = canvasRef.current.width  / rect.width;
//       const scaleY = canvasRef.current.height / rect.height;
//       const x = (e.clientX - rect.left) * scaleX;
//       const y = (e.clientY - rect.top)  * scaleY;
//       return {
//         x: (x - canvasOffsetRef.current.x) / currentZoom,
//         y: (y - canvasOffsetRef.current.y) / currentZoom,
//       };
//     }, [currentZoom]);

//     const getCurrentObjects = useCallback(() => {
//       if (!yWhiteboardRef.current || yWhiteboardRef.current.length === 0) return [];
//       return (yWhiteboardRef.current.toArray()[0]?.objects) || [];
//     }, []);

//     // ═══════════════════════════════════════════════════════
//     // Yjs write helpers
//     // ═══════════════════════════════════════════════════════
//     const commitState = useCallback((updater) => {
//       if (!yWhiteboardRef.current || !yDocRef.current) return;
//       yDocRef.current.transact(() => {
//         const cur = yWhiteboardRef.current.toArray()[0] || {
//           version: "1.0.0", objects: [], background: backgroundColor,
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
//     }, [backgroundColor]);

//     const addObject = useCallback((obj) => {
//       commitState((cur) => ({
//         ...cur,
//         objects: [...(cur.objects || []), obj],
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString(),
//       }));
//     }, [commitState, sessionInfo]);

//     const deleteObject = useCallback((id) => {
//       commitState((cur) => ({
//         ...cur,
//         objects: (cur.objects || []).filter((o) => o.id !== id),
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString(),
//       }));
//       if (selectedIdRef.current === id) {
//         selectedIdRef.current = null;
//         setSelectedId(null);
//       }
//     }, [commitState, sessionInfo]);

//     const updateObject = useCallback((id, patch) => {
//       commitState((cur) => ({
//         ...cur,
//         objects: (cur.objects || []).map((o) => o.id === id ? { ...o, ...patch } : o),
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString(),
//       }));
//     }, [commitState, sessionInfo]);

//     // ═══════════════════════════════════════════════════════
//     // Drawing
//     // ═══════════════════════════════════════════════════════
//     const drawGrid = useCallback((ctx, w, h) => {
//       ctx.save();
//       ctx.strokeStyle = "#e0e0e0";
//       ctx.lineWidth   = 0.5;
//       ctx.globalAlpha = 0.3;
//       const gs = 20;
//       for (let x = 0; x <= w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
//       for (let y = 0; y <= h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
//       ctx.restore();
//     }, []);

//     const drawObject = useCallback((ctx, obj) => {
//       if (!obj) return;
//       ctx.save();
//       ctx.strokeStyle = obj.color       || "#000000";
//       ctx.fillStyle   = obj.fillColor   || "transparent";
//       ctx.lineWidth   = (obj.strokeWidth || 2) / currentZoom;
//       ctx.globalAlpha = obj.opacity     ?? 1;

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
//         case "text": {
//           ctx.font      = `${obj.fontSize || 16}px Arial`;
//           ctx.fillStyle = obj.color || "#000";
//           ctx.fillText(obj.text || "", obj.x, obj.y);
//           break;
//         }

//         // ── image ──
//         case "image": {
//           let img = imageCacheRef.current.get(obj.id);
//           if (!img) {
//             img       = new Image();
//             img.src   = obj.src;
//             img.onload = () => scheduleRedraw(getCurrentObjects());
//             imageCacheRef.current.set(obj.id, img);
//           }
//           if (img.complete && img.naturalWidth > 0) {
//             ctx.globalAlpha = obj.opacity ?? 1;
//             ctx.drawImage(img, obj.x, obj.y, obj.width || DEFAULT_MEDIA_W, obj.height || DEFAULT_MEDIA_H);
//           } else {
//             // placeholder while loading
//             ctx.strokeStyle = "#aaa"; ctx.strokeRect(obj.x, obj.y, obj.width || DEFAULT_MEDIA_W, obj.height || DEFAULT_MEDIA_H);
//             ctx.fillStyle   = "#eee"; ctx.font = "14px Arial";
//             ctx.fillText("Loading image…", obj.x + 8, obj.y + 20);
//           }
//           break;
//         }

//         // ── video ──
//         case "video": {
//           let vid = videoCacheRef.current.get(obj.id);
//           if (!vid) {
//             vid     = document.createElement("video");
//             vid.src = obj.src;
//             vid.crossOrigin  = "anonymous";
//             vid.preload      = "auto";
//             vid.muted        = false;
//             vid.playsInline  = true;
//             videoCacheRef.current.set(obj.id, vid);
//           }
//           const w = obj.width  || DEFAULT_MEDIA_W;
//           const h = obj.height || DEFAULT_MEDIA_H;
//           if (vid.readyState >= 2) {
//             ctx.globalAlpha = obj.opacity ?? 1;
//             ctx.drawImage(vid, obj.x, obj.y, w, h);
//           } else {
//             ctx.fillStyle   = "#111"; ctx.fillRect(obj.x, obj.y, w, h);
//             ctx.fillStyle   = "#fff"; ctx.font = "14px Arial";
//             ctx.fillText("Loading video…", obj.x + 8, obj.y + h / 2);
//           }
//           // selection border
//           if (selectedIdRef.current === obj.id) {
//             ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2 / currentZoom;
//             ctx.setLineDash([6 / currentZoom, 3 / currentZoom]);
//             ctx.strokeRect(obj.x - 2, obj.y - 2, w + 4, h + 4);
//             ctx.setLineDash([]);
//           }
//           break;
//         }

//         // ── website placeholder on canvas ──
//         case "website": {
//           const w = obj.width  || DEFAULT_MEDIA_W;
//           const h = obj.height || DEFAULT_MEDIA_H;
//           ctx.fillStyle   = "#f0f4ff"; ctx.fillRect(obj.x, obj.y, w, h);
//           ctx.strokeStyle = "#93c5fd"; ctx.lineWidth = 1.5 / currentZoom;
//           ctx.strokeRect(obj.x, obj.y, w, h);
//           ctx.fillStyle = "#1e40af"; ctx.font = `bold ${14 / currentZoom}px Arial`;
//           ctx.fillText("🌐 " + (obj.url || "Website"), obj.x + 10, obj.y + 24);
//           ctx.fillStyle = "#64748b"; ctx.font = `${11 / currentZoom}px Arial`;
//           ctx.fillText(obj.url || "", obj.x + 10, obj.y + 42);
//           if (selectedIdRef.current === obj.id) {
//             ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2 / currentZoom;
//             ctx.setLineDash([6 / currentZoom, 3 / currentZoom]);
//             ctx.strokeRect(obj.x - 2, obj.y - 2, w + 4, h + 4);
//             ctx.setLineDash([]);
//           }
//           break;
//         }

//         // ── pdf page ──
//         case "pdf": {
//           let img = imageCacheRef.current.get(obj.id);
//           if (!img) {
//             img       = new Image();
//             img.src   = obj.src; // base64 rendered page
//             img.onload = () => scheduleRedraw(getCurrentObjects());
//             imageCacheRef.current.set(obj.id, img);
//           }
//           const w = obj.width  || DEFAULT_MEDIA_W;
//           const h = obj.height || DEFAULT_MEDIA_H;
//           if (img.complete && img.naturalWidth > 0) {
//             ctx.globalAlpha = obj.opacity ?? 1;
//             ctx.drawImage(img, obj.x, obj.y, w, h);
//           } else {
//             ctx.fillStyle   = "#f9fafb"; ctx.fillRect(obj.x, obj.y, w, h);
//             ctx.strokeStyle = "#d1d5db"; ctx.strokeRect(obj.x, obj.y, w, h);
//             ctx.fillStyle   = "#6b7280"; ctx.font = "14px Arial";
//             ctx.fillText("Rendering PDF…", obj.x + 8, obj.y + h / 2);
//           }
//           if (selectedIdRef.current === obj.id) {
//             ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2 / currentZoom;
//             ctx.setLineDash([6 / currentZoom, 3 / currentZoom]);
//             ctx.strokeRect(obj.x - 2, obj.y - 2, w + 4, h + 4);
//             ctx.setLineDash([]);
//           }
//           break;
//         }

//         default: break;
//       }

//       // selection highlight for image
//       if (
//         (obj.type === "image") &&
//         selectedIdRef.current === obj.id
//       ) {
//         ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 2 / currentZoom;
//         ctx.setLineDash([6 / currentZoom, 3 / currentZoom]);
//         ctx.strokeRect(obj.x - 2, obj.y - 2, (obj.width || DEFAULT_MEDIA_W) + 4, (obj.height || DEFAULT_MEDIA_H) + 4);
//         ctx.setLineDash([]);
//       }

//       ctx.restore();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [currentZoom]);

//     const redrawCanvas = useCallback((objects) => {
//       if (!ctxRef.current || !bgCtxRef.current || !canvasRef.current) return;
//       const ctx    = ctxRef.current;
//       const bgCtx  = bgCtxRef.current;
//       const canvas = canvasRef.current;

//       ctx.clearRect(0, 0, canvas.width, canvas.height);
//       bgCtx.clearRect(0, 0, canvas.width, canvas.height);

//       bgCtx.fillStyle = backgroundColor;
//       bgCtx.fillRect(0, 0, canvas.width, canvas.height);
//       if (isGridVisible) drawGrid(bgCtx, canvas.width, canvas.height);

//       ctx.save();
//       ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//       ctx.scale(currentZoom, currentZoom);
//       (objects || []).forEach((obj) => drawObject(ctx, obj));
//       ctx.restore();
//     }, [backgroundColor, isGridVisible, currentZoom, drawGrid, drawObject]);

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
//         if (state.background) setBackgroundColor(state.background);
//         if (Array.isArray(state.objects)) scheduleRedraw(state.objects);
//       } catch (e) { console.error(e); }
//     }, [scheduleRedraw]);

//     // ═══════════════════════════════════════════════════════
//     // Video RAF loop — keeps video frames painted on canvas
//     // ═══════════════════════════════════════════════════════
//     const startVideoLoop = useCallback(() => {
//       if (videoRafRef.current) return;
//       const loop = () => {
//         const hasVideo = getCurrentObjects().some((o) => o.type === "video");
//         if (!hasVideo) { videoRafRef.current = null; return; }
//         scheduleRedraw(getCurrentObjects());
//         videoRafRef.current = requestAnimationFrame(loop);
//       };
//       videoRafRef.current = requestAnimationFrame(loop);
//     }, [getCurrentObjects, scheduleRedraw]);

//     // ═══════════════════════════════════════════════════════
//     // Smooth stroke (local incremental draw)
//     // ═══════════════════════════════════════════════════════
//     const drawSmoothStroke = useCallback((prev, next, strokeType) => {
//       if (!ctxRef.current) return;
//       const ctx = ctxRef.current;
//       ctx.save();
//       ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//       ctx.scale(currentZoom, currentZoom);
//       ctx.lineCap   = "round";
//       ctx.lineJoin  = "round";
//       ctx.globalAlpha = opacity ?? 1;
//       ctx.lineWidth   = (strokeWidth || 2) / currentZoom;

//       if (strokeType === "eraser") {
//         ctx.globalCompositeOperation = "destination-out";
//         ctx.strokeStyle = "rgba(0,0,0,1)";
//       } else {
//         ctx.globalCompositeOperation = "source-over";
//         ctx.strokeStyle = color || "#000000";
//       }

//       const mid = { x: (prev.x + next.x) / 2, y: (prev.y + next.y) / 2 };
//       if (!lastLocalMidRef.current) lastLocalMidRef.current = { x: prev.x, y: prev.y };
//       ctx.beginPath();
//       ctx.moveTo(lastLocalMidRef.current.x, lastLocalMidRef.current.y);
//       ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
//       ctx.stroke();
//       lastLocalMidRef.current = mid;
//       ctx.restore();
//     }, [currentZoom, color, strokeWidth, opacity]);

//     // ═══════════════════════════════════════════════════════
//     // Throttled Yjs stroke flush
//     // ═══════════════════════════════════════════════════════
//     const flushStrokeToYjs = useCallback((force = false) => {
//       const strokeId = currentStrokeIdRef.current;
//       if (!strokeId) return;
//       const buffered = strokeBufferRef.current;
//       if (!buffered.length) return;
//       const pts = buffered.slice();
//       strokeBufferRef.current = [];

//       commitState((cur) => {
//         const objs   = [...(cur.objects || [])];
//         const idx    = objs.findIndex((o) => o?.id === strokeId);
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

//     // ═══════════════════════════════════════════════════════
//     // Hit-test for select tool
//     // ═══════════════════════════════════════════════════════
//     const hitTest = useCallback((pt) => {
//       const objs = getCurrentObjects();
//       for (let i = objs.length - 1; i >= 0; i--) {
//         const o = objs[i];
//         const w = o.width  || DEFAULT_MEDIA_W;
//         const h = o.height || DEFAULT_MEDIA_H;
//         if (["image", "video", "website", "pdf"].includes(o.type)) {
//           if (pt.x >= o.x && pt.x <= o.x + w && pt.y >= o.y && pt.y <= o.y + h) return o;
//         }
//       }
//       return null;
//     }, [getCurrentObjects]);

//     // ═══════════════════════════════════════════════════════
//     // Yjs init
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       if (!sessionId || !wsToken) return;

//       const initYjs = async () => {
//         try {
//           const ydoc    = new Y.Doc();
//           yDocRef.current = ydoc;

//           const baseWs  = import.meta.env.VITE_WS_URL || "ws://localhost:9090";
//           const provider = new WebsocketProvider(`${baseWs}/yjs`, sessionId, ydoc, {
//             WebSocketPolyfill: WebSocket,
//             params: {
//               token: wsToken, isStreamer: true, allowViewersToDraw,
//               roomCode, userId: sessionInfo?.streamerId, userName: sessionInfo?.streamerName,
//             },
//           });
//           yProviderRef.current  = provider;

//           const yWhiteboard     = ydoc.getArray("whiteboard");
//           yWhiteboardRef.current = yWhiteboard;

//           const ySettings       = ydoc.getMap("room_settings");
//           ySettingsRef.current  = ySettings;

//           const yVideoState     = ydoc.getMap("video_state");
//           yVideoStateRef.current = yVideoState;

//           provider.awareness.setLocalState({
//             userId: sessionInfo?.streamerId || "streamer",
//             userName: sessionInfo?.streamerName || "Streamer",
//             role: "STREAMER", isStreamer: true, color, tool, cursor: null,
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

//           new IndexeddbPersistence(`whiteboard-${sessionId}`, ydoc);

//           const observer = (event) => {
//             const origin = event?.transaction?.origin;
//             if (origin === "drawing" && (isDrawing || currentStrokeIdRef.current)) return;
//             loadWhiteboardState();
//           };
//           yWhiteboard.observe(observer);
//           yObserverCleanup.current = () => { try { yWhiteboard.unobserve(observer); } catch {} };

//           // video state observer — sync play/pause from yjs to all video elements
//           yVideoState.observe(() => {
//             const action      = yVideoState.get("action");
//             const targetId    = yVideoState.get("targetId");
//             const currentTime = yVideoState.get("currentTime");
//             const vid         = videoCacheRef.current.get(targetId);
//             if (!vid) return;
//             if (typeof currentTime === "number") vid.currentTime = currentTime;
//             if (action === "play")  vid.play().catch(() => {});
//             if (action === "pause") vid.pause();
//           });

//         } catch (err) {
//           console.error("Failed to init Yjs:", err);
//           toast.error("Failed to connect to whiteboard server");
//         }
//       };

//       initYjs();

//       return () => {
//         try { flushStrokeToYjs(true); } catch {}
//         if (yObserverCleanup.current) { yObserverCleanup.current(); yObserverCleanup.current = null; }
//         if (yProviderRef.current) { try { yProviderRef.current.disconnect(); yProviderRef.current.destroy(); } catch {} }
//         if (yDocRef.current)      { try { yDocRef.current.destroy(); } catch {} }
//         yProviderRef.current = yDocRef.current = yWhiteboardRef.current = null;
//         if (videoRafRef.current) { cancelAnimationFrame(videoRafRef.current); videoRafRef.current = null; }
//       };
//       // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [sessionId, roomCode, wsToken, allowViewersToDraw, sessionInfo]);

//     // keep awareness fresh
//     useEffect(() => {
//       const p = yProviderRef.current;
//       if (!p) return;
//       try {
//         const prev = p.awareness.getLocalState() || {};
//         p.awareness.setLocalState({ ...prev, color, tool,
//           userId: sessionInfo?.streamerId || "streamer",
//           userName: sessionInfo?.streamerName || "Streamer",
//           role: "STREAMER", isStreamer: true,
//         });
//       } catch {}
//     }, [color, tool, sessionInfo]);

//     // cleanup timers
//     useEffect(() => () => {
//       if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
//       if (rafIdRef.current)      cancelAnimationFrame(rafIdRef.current);
//     }, []);

//     // ═══════════════════════════════════════════════════════
//     // Canvas init + resize
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       if (!canvasRef.current || !backgroundCanvasRef.current || !containerRef.current) return;
//       const canvas    = canvasRef.current;
//       const bgCanvas  = backgroundCanvasRef.current;
//       const container = containerRef.current;

//       const resize = () => {
//         canvas.width  = bgCanvas.width  = container.clientWidth;
//         canvas.height = bgCanvas.height = container.clientHeight;
//         const ctx   = canvas.getContext("2d");
//         const bgCtx = bgCanvas.getContext("2d");
//         ctx.lineCap = "round"; ctx.lineJoin = "round";
//         ctxRef.current = ctx; bgCtxRef.current = bgCtx;
//         if (yWhiteboardRef.current) {
//           const s = yWhiteboardRef.current.toArray()[0] || {};
//           scheduleRedraw(s.objects || []);
//         }
//       };

//       resize();
//       const ro = new ResizeObserver(resize);
//       ro.observe(container);
//       return () => ro.disconnect();
//     }, [scheduleRedraw]);

//     // ═══════════════════════════════════════════════════════
//     // Paste handler — Ctrl+V image
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       const handlePaste = async (e) => {
//         for (const item of e.clipboardData.items) {
//           if (item.type.startsWith("image/")) {
//             const file   = item.getAsFile();
//             const b64    = await fileToBase64(file);
//             const img    = new Image();
//             img.src      = b64;
//             img.onload   = () => {
//               const ratio = img.naturalWidth / img.naturalHeight;
//               const w     = Math.min(img.naturalWidth, DEFAULT_MEDIA_W);
//               const h     = w / ratio;
//               addObject({
//                 id: uid(), type: "image", src: b64,
//                 x: 80, y: 80, width: w, height: h,
//                 opacity: 1, timestamp: Date.now(),
//               });
//             };
//             break;
//           }
//         }
//       };
//       window.addEventListener("paste", handlePaste);
//       return () => window.removeEventListener("paste", handlePaste);
//     }, [addObject]);

//     // ═══════════════════════════════════════════════════════
//     // Keyboard — Delete selected
//     // ═══════════════════════════════════════════════════════
//     useEffect(() => {
//       const handleKey = (e) => {
//         if ((e.key === "Delete" || e.key === "Backspace") && selectedIdRef.current) {
//           // Don't delete if user is typing in an input
//           if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
//           deleteObject(selectedIdRef.current);
//         }
//         if ((e.ctrlKey || e.metaKey) && e.key === "z") {
//           e.preventDefault();
//           yUndoManagerRef.current?.undo();
//         }
//         if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
//           e.preventDefault();
//           yUndoManagerRef.current?.redo();
//         }
//       };
//       window.addEventListener("keydown", handleKey);
//       return () => window.removeEventListener("keydown", handleKey);
//     }, [deleteObject]);

//     // ═══════════════════════════════════════════════════════
//     // Media upload handlers
//     // ═══════════════════════════════════════════════════════
//     const handleImageUpload = useCallback(async (e) => {
//       const file = e.target.files?.[0];
//       if (!file) return;
//       if (file.size > 10 * 1024 * 1024) { toast.error("Image must be < 10MB"); return; }
//       const b64  = await fileToBase64(file);
//       const img  = new Image();
//       img.src    = b64;
//       img.onload = () => {
//         const ratio = img.naturalWidth / img.naturalHeight;
//         const w     = Math.min(img.naturalWidth, DEFAULT_MEDIA_W);
//         const h     = w / ratio;
//         addObject({ id: uid(), type: "image", src: b64, x: 80, y: 80, width: w, height: h, opacity: 1, timestamp: Date.now() });
//       };
//       e.target.value = "";
//     }, [addObject]);

//     const handlePdfUpload = useCallback(async (e) => {
//       const file = e.target.files?.[0];
//       if (!file) return;

//       // Dynamically import pdfjs
//       const pdfjsLib = await import("pdfjs-dist");
//       pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

//       const arrayBuffer = await file.arrayBuffer();
//       const pdfDoc      = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

//       let yPos = 80;
//       for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
//         const page     = await pdfDoc.getPage(pageNum);
//         const viewport = page.getViewport({ scale: 1.5 });
//         const offCanvas = document.createElement("canvas");
//         offCanvas.width  = viewport.width;
//         offCanvas.height = viewport.height;
//         await page.render({ canvasContext: offCanvas.getContext("2d"), viewport }).promise;
//         const src = offCanvas.toDataURL("image/png");
//         addObject({
//           id: uid(), type: "pdf", src,
//           x: 80, y: yPos,
//           width: Math.min(viewport.width, DEFAULT_MEDIA_W),
//           height: Math.min(viewport.width, DEFAULT_MEDIA_W) * (viewport.height / viewport.width),
//           page: pageNum, opacity: 1, timestamp: Date.now(),
//         });
//         yPos += Math.min(viewport.width, DEFAULT_MEDIA_W) * (viewport.height / viewport.width) + 20;
//       }
//       toast.success(`PDF loaded — ${pdfDoc.numPages} page(s)`);
//       e.target.value = "";
//     }, [addObject]);

//     const handleUrlSubmit = useCallback(() => {
//       let url = urlInput.trim();
//       if (!url) return;
//       if (!url.startsWith("http")) url = "https://" + url;

//       if (urlModalType === "video") {
//         addObject({
//           id: uid(), type: "video", src: url,
//           x: 80, y: 80, width: DEFAULT_MEDIA_W, height: DEFAULT_MEDIA_H,
//           opacity: 1, timestamp: Date.now(),
//         });
//         // Notify video state
//         if (yVideoStateRef.current) {
//           yVideoStateRef.current.set("action", "load");
//           yVideoStateRef.current.set("url", url);
//         }
//         startVideoLoop();
//       } else {
//         addObject({
//           id: uid(), type: "website", url,
//           x: 80, y: 80, width: DEFAULT_MEDIA_W, height: DEFAULT_MEDIA_H,
//           opacity: 1, timestamp: Date.now(),
//         });
//         // Sync URL to viewers via settings
//         if (ySettingsRef.current) {
//           ySettingsRef.current.set("activeUrl", url);
//           ySettingsRef.current.set("urlMode", true);
//         }
//       }
//       setUrlInput("");
//       setShowUrlModal(false);
//     }, [urlInput, urlModalType, addObject, startVideoLoop]);

//     // ═══════════════════════════════════════════════════════
//     // Video controls (play/pause/seek broadcast)
//     // ═══════════════════════════════════════════════════════
//     const broadcastVideoAction = useCallback((objId, action, currentTime) => {
//       if (!yVideoStateRef.current) return;
//       yVideoStateRef.current.set("targetId",   objId);
//       yVideoStateRef.current.set("action",     action);
//       yVideoStateRef.current.set("currentTime", currentTime);
//       yVideoStateRef.current.set("ts",          Date.now());
//       // also apply locally
//       const vid = videoCacheRef.current.get(objId);
//       if (!vid) return;
//       if (typeof currentTime === "number") vid.currentTime = currentTime;
//       if (action === "play")  { vid.play().catch(() => {}); startVideoLoop(); }
//       if (action === "pause") vid.pause();
//     }, [startVideoLoop]);

//     // ═══════════════════════════════════════════════════════
//     // Pointer events
//     // ═══════════════════════════════════════════════════════
//     const handlePointerDown = useCallback((e) => {
//       e.preventDefault();
//       if (!canvasRef.current || e.button === 2) return;
//       try { canvasRef.current.setPointerCapture(e.pointerId); pointerIdRef.current = e.pointerId; } catch {}

//       if (tool === "pan" || e.altKey || e.button === 1) {
//         setIsPanning(true);
//         lastPanPointRef.current = { x: e.clientX, y: e.clientY };
//         canvasRef.current.style.cursor = "grabbing";
//         return;
//       }

//       const p = getTransformedPoint(e);

//       // Select tool
//       if (tool === "select") {
//         const hit = hitTest(p);
//         if (hit) {
//           selectedIdRef.current = hit.id;
//           setSelectedId(hit.id);
//           dragOffsetRef.current = { x: p.x - hit.x, y: p.y - hit.y };
//           isDraggingRef.current = true;
//         } else {
//           selectedIdRef.current = null;
//           setSelectedId(null);
//         }
//         scheduleRedraw(getCurrentObjects());
//         return;
//       }

//       setIsDrawing(true);
//       lastPointRef.current      = p;
//       lastLocalPointRef.current = p;
//       lastLocalMidRef.current   = null;

//       if (tool === "pen" || tool === "eraser") {
//         const strokeId = uid();
//         currentStrokeIdRef.current = strokeId;
//         strokeBufferRef.current    = [];
//         addObject({
//           id: strokeId, type: tool,
//           points: [{ x: p.x, y: p.y }],
//           color: tool === "eraser" ? backgroundColor : color,
//           strokeWidth, opacity, timestamp: Date.now(),
//         });
//         drawSmoothStroke(p, { x: p.x + 0.01, y: p.y + 0.01 }, tool);
//       }
//     }, [tool, getTransformedPoint, hitTest, addObject, drawSmoothStroke,
//         scheduleRedraw, getCurrentObjects, backgroundColor, color, strokeWidth, opacity]);

//     const handlePointerMove = useCallback((e) => {
//       if (!canvasRef.current) return;

//       if (isPanning) {
//         const dx = e.clientX - lastPanPointRef.current.x;
//         const dy = e.clientY - lastPanPointRef.current.y;
//         canvasOffsetRef.current.x += dx;
//         canvasOffsetRef.current.y += dy;
//         lastPanPointRef.current = { x: e.clientX, y: e.clientY };
//         scheduleRedraw(getCurrentObjects());
//         return;
//       }

//       // drag media object
//       if (tool === "select" && isDraggingRef.current && selectedIdRef.current) {
//         const p = getTransformedPoint(e);
//         updateObject(selectedIdRef.current, {
//           x: p.x - dragOffsetRef.current.x,
//           y: p.y - dragOffsetRef.current.y,
//         });
//         return;
//       }

//       if (!isDrawing || (tool !== "pen" && tool !== "eraser")) return;

//       const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e];
//       for (const evt of events) {
//         const next = getTransformedPoint(evt);
//         const prev = lastLocalPointRef.current || lastPointRef.current;
//         const dist = prev ? Math.hypot(next.x - prev.x, next.y - prev.y) : 999;
//         if (dist < MIN_MOVE_DIST) continue;
//         if (prev) drawSmoothStroke(prev, next, tool);
//         strokeBufferRef.current.push(next);
//         scheduleFlush();
//         lastLocalPointRef.current = next;
//         lastPointRef.current      = next;
//       }
//     }, [isDrawing, isPanning, tool, getTransformedPoint, drawSmoothStroke,
//         scheduleFlush, scheduleRedraw, getCurrentObjects, updateObject]);

//     const endStrokeCleanup = useCallback(() => {
//       flushStrokeToYjs(true);
//       currentStrokeIdRef.current = null;
//       strokeBufferRef.current    = [];
//       lastLocalPointRef.current  = null;
//       lastLocalMidRef.current    = null;
//       isDraggingRef.current      = false;
//       if (canvasRef.current && pointerIdRef.current != null) {
//         try { canvasRef.current.releasePointerCapture(pointerIdRef.current); } catch {}
//       }
//       pointerIdRef.current = null;
//     }, [flushStrokeToYjs]);

//     const handlePointerUp   = useCallback(() => { setIsDrawing(false); setIsPanning(false); endStrokeCleanup(); if (canvasRef.current) canvasRef.current.style.cursor = tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair"; }, [tool, endStrokeCleanup]);
//     const handlePointerLeave = useCallback(() => { setIsDrawing(false); setIsPanning(false); endStrokeCleanup(); }, [endStrokeCleanup]);

//     // ═══════════════════════════════════════════════════════
//     // Zoom + wheel
//     // ═══════════════════════════════════════════════════════
//     const handleWheel = useCallback((e) => {
//       e.preventDefault();
//       if (!canvasRef.current) return;
//       const rect   = canvasRef.current.getBoundingClientRect();
//       const mx     = e.clientX - rect.left;
//       const my     = e.clientY - rect.top;
//       const factor = e.deltaY > 0 ? 0.9 : 1.1;
//       const newZ   = Math.max(0.5, Math.min(3, currentZoom * factor));
//       const change = newZ / currentZoom;
//       canvasOffsetRef.current.x = mx - (mx - canvasOffsetRef.current.x) * change;
//       canvasOffsetRef.current.y = my - (my - canvasOffsetRef.current.y) * change;
//       setCurrentZoom(newZ);
//       scheduleRedraw(getCurrentObjects());
//     }, [currentZoom, scheduleRedraw, getCurrentObjects]);

//     const handleZoomIn    = useCallback(() => { setCurrentZoom((p) => Math.min(p + 0.1, 3));  scheduleRedraw(getCurrentObjects()); }, [scheduleRedraw, getCurrentObjects]);
//     const handleZoomOut   = useCallback(() => { setCurrentZoom((p) => Math.max(p - 0.1, 0.5)); scheduleRedraw(getCurrentObjects()); }, [scheduleRedraw, getCurrentObjects]);
//     const handleZoomReset = useCallback(() => { setCurrentZoom(1); canvasOffsetRef.current = { x: 0, y: 0 }; scheduleRedraw(getCurrentObjects()); }, [scheduleRedraw, getCurrentObjects]);

//     // ═══════════════════════════════════════════════════════
//     // Whiteboard actions
//     // ═══════════════════════════════════════════════════════
//     const handleClearWhiteboard = useCallback(() => {
//       if (!yWhiteboardRef.current || !yDocRef.current) return;
//       if (!window.confirm("Clear entire whiteboard?")) return;
//       yDocRef.current.transact(() => {
//         yWhiteboardRef.current.delete(0, yWhiteboardRef.current.length);
//         yWhiteboardRef.current.insert(0, [{
//           version: "1.0.0", objects: [], background: backgroundColor,
//           clearedAt: new Date().toISOString(), clearedBy: sessionInfo?.streamerId,
//         }]);
//       }, "drawing");
//       imageCacheRef.current.clear();
//       videoCacheRef.current.forEach((v) => { v.pause(); v.src = ""; });
//       videoCacheRef.current.clear();
//       if (videoRafRef.current) { cancelAnimationFrame(videoRafRef.current); videoRafRef.current = null; }
//       scheduleRedraw([]);
//       toast.success("Whiteboard cleared");
//     }, [backgroundColor, sessionInfo, scheduleRedraw]);

//     const handleExport = useCallback(() => {
//       if (!canvasRef.current || !backgroundCanvasRef.current) return;
//       const exp = document.createElement("canvas");
//       exp.width  = canvasRef.current.width;
//       exp.height = canvasRef.current.height;
//       const ctx  = exp.getContext("2d");
//       ctx.drawImage(backgroundCanvasRef.current, 0, 0);
//       ctx.drawImage(canvasRef.current,           0, 0);
//       const link     = document.createElement("a");
//       link.download  = `whiteboard-${sessionId}-${Date.now()}.png`;
//       link.href      = exp.toDataURL("image/png");
//       link.click();
//       toast.success("Whiteboard exported");
//     }, [sessionId]);

//     const handleUndo = useCallback(() => yUndoManagerRef.current?.undo(), []);
//     const handleRedo = useCallback(() => yUndoManagerRef.current?.redo(), []);

//     const handleDeleteSelected = useCallback(() => {
//       if (selectedIdRef.current) deleteObject(selectedIdRef.current);
//     }, [deleteObject]);

//     // ═══════════════════════════════════════════════════════
//     // Render
//     // ═══════════════════════════════════════════════════════
//     const cursorStyle = tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair";

//     return (
//       <div
//         ref={containerRef}
//         className={`absolute inset-0 z-20 w-full h-full bg-gray-900 overflow-hidden ${isActive ? "block" : "hidden"}`}
//         onWheel={handleWheel}
//       >
//         {/* Hidden file inputs */}
//         <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
//         <input ref={pdfInputRef}  type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handlePdfUpload} />

//         {/* Background canvas */}
//         <canvas ref={backgroundCanvasRef} className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: "none" }} />

//         {/* Website iframes — rendered as overlays, positioned per object */}
//         {getCurrentObjects()
//           .filter((o) => o.type === "website")
//           .map((obj) => (
//             <div
//               key={obj.id}
//               style={{
//                 position:  "absolute",
//                 left:      (obj.x * currentZoom + canvasOffsetRef.current.x) + "px",
//                 top:       (obj.y * currentZoom + canvasOffsetRef.current.y) + "px",
//                 width:     (obj.width  || DEFAULT_MEDIA_W) * currentZoom + "px",
//                 height:    (obj.height || DEFAULT_MEDIA_H) * currentZoom + "px",
//                 zIndex:    15,
//                 pointerEvents: tool === "select" ? "all" : "none",
//                 border:    selectedId === obj.id ? "2px dashed #3b82f6" : "1px solid #93c5fd",
//                 borderRadius: 4,
//                 overflow:  "hidden",
//               }}
//             >
//               <iframe
//                 src={obj.url}
//                 title={obj.url}
//                 style={{ width: "100%", height: "100%", border: "none" }}
//                 sandbox="allow-scripts allow-same-origin allow-forms"
//               />
//             </div>
//           ))
//         }

//         {/* Video overlays — for play/pause/seek controls */}
//         {getCurrentObjects()
//           .filter((o) => o.type === "video")
//           .map((obj) => {
//             const vid = videoCacheRef.current.get(obj.id);
//             const isPlaying = vid && !vid.paused;
//             return (
//               <div
//                 key={obj.id}
//                 style={{
//                   position: "absolute",
//                   left:   (obj.x * currentZoom + canvasOffsetRef.current.x) + "px",
//                   top:    (obj.y * currentZoom + canvasOffsetRef.current.y) + "px",
//                   width:  (obj.width  || DEFAULT_MEDIA_W) * currentZoom + "px",
//                   height: (obj.height || DEFAULT_MEDIA_H) * currentZoom + "px",
//                   zIndex: 16, pointerEvents: "none",
//                 }}
//               >
//                 {/* Control bar at bottom */}
//                 <div style={{
//                   position: "absolute", bottom: 0, left: 0, right: 0,
//                   background: "rgba(0,0,0,0.6)", display: "flex",
//                   alignItems: "center", gap: 8, padding: "4px 8px",
//                   pointerEvents: "all", zIndex: 17,
//                 }}>
//                   <button
//                     onClick={() => broadcastVideoAction(obj.id, isPlaying ? "pause" : "play", vid?.currentTime || 0)}
//                     style={{ color: "#fff", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
//                   >
//                     {isPlaying ? "⏸" : "▶"}
//                   </button>
//                   <input
//                     type="range" min={0} max={vid?.duration || 100} step={0.1}
//                     value={vid?.currentTime || 0}
//                     onChange={(e) => broadcastVideoAction(obj.id, "seek", parseFloat(e.target.value))}
//                     style={{ flex: 1, accentColor: "#3b82f6" }}
//                   />
//                   <button
//                     onClick={() => deleteObject(obj.id)}
//                     style={{ color: "#f87171", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}
//                   >✕</button>
//                 </div>
//               </div>
//             );
//           })
//         }

//         {/* Main drawing canvas */}
//         <canvas
//           ref={canvasRef}
//           className={`absolute top-0 left-0 w-full h-full`}
//           style={{ touchAction: "none", cursor: cursorStyle, zIndex: 20 }}
//           onPointerDown={handlePointerDown}
//           onPointerMove={handlePointerMove}
//           onPointerUp={handlePointerUp}
//           onPointerLeave={handlePointerLeave}
//           onContextMenu={(e) => e.preventDefault()}
//         />

//         {/* ── URL Modal ── */}
//         {showUrlModal && (
//           <div
//             className="absolute inset-0 flex items-center justify-center z-50"
//             style={{ background: "rgba(0,0,0,0.6)" }}
//           >
//             <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 w-96 shadow-2xl">
//               <h3 className="text-white text-lg font-semibold mb-4">
//                 {urlModalType === "video" ? "Add Video URL" : "Add Website URL"}
//               </h3>
//               <input
//                 type="url"
//                 autoFocus
//                 value={urlInput}
//                 onChange={(e) => setUrlInput(e.target.value)}
//                 onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit(); if (e.key === "Escape") setShowUrlModal(false); }}
//                 placeholder={urlModalType === "video" ? "https://example.com/video.mp4" : "https://example.com"}
//                 className="w-full bg-gray-700 text-white border border-gray-500 rounded-lg px-3 py-2 mb-4 outline-none focus:border-blue-500"
//               />
//               {urlModalType === "website" && (
//                 <p className="text-yellow-400 text-xs mb-3">Note: Some websites block embedding (e.g. Google, YouTube). Use direct .mp4 links for video.</p>
//               )}
//               <div className="flex gap-3">
//                 <button onClick={handleUrlSubmit} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 font-medium transition-colors">Add</button>
//                 <button onClick={() => setShowUrlModal(false)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white rounded-lg py-2 transition-colors">Cancel</button>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* ── Top Toolbar ── */}
//         <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30">
//           <div className="bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700 px-2 py-1.5 flex items-center gap-1.5 flex-wrap">

//             {/* Connection status */}
//             <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
//             <span className="text-white text-xs mr-1">{isConnected ? "Live" : "Offline"}</span>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Draw tools */}
//             {[
//               { t: "pen",       icon: <FaPaintBrush className="w-3.5 h-3.5" />,   title: "Pen" },
//               { t: "eraser",    icon: <FaEraser     className="w-3.5 h-3.5" />,   title: "Eraser" },
//               { t: "line",      icon: <FiMinus      className="w-3.5 h-3.5" />,   title: "Line" },
//               { t: "rectangle", icon: <FiSquare     className="w-3.5 h-3.5" />,   title: "Rectangle" },
//               { t: "circle",    icon: <FiCircle     className="w-3.5 h-3.5" />,   title: "Circle" },
//               { t: "select",    icon: <FiMousePointer className="w-3.5 h-3.5" />, title: "Select / Move (media)" },
//               { t: "pan",       icon: <FiMove       className="w-3.5 h-3.5" />,   title: "Pan (Alt+Drag)" },
//             ].map(({ t, icon, title }) => (
//               <button key={t} onClick={() => setTool(t)} title={title}
//                 className={`p-1.5 rounded-lg transition-colors ${tool === t ? "bg-blue-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"}`}>
//                 {icon}
//               </button>
//             ))}

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Color + stroke */}
//             <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
//               className="w-6 h-6 rounded cursor-pointer border border-gray-600" title="Color" />
//             <select value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))}
//               className="bg-gray-700 text-white text-xs rounded px-1.5 py-1 border border-gray-600 w-14">
//               {[1,2,3,5,8].map((v) => <option key={v} value={v}>{v}px</option>)}
//             </select>
//             <select value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
//               className="bg-gray-700 text-white text-xs rounded px-1.5 py-1 border border-gray-600 w-14">
//               {[1,0.8,0.6,0.4].map((v) => <option key={v} value={v}>{v*100}%</option>)}
//             </select>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Media insert buttons */}
//             <button onClick={() => fileInputRef.current?.click()} title="Upload Image"
//               className="p-1.5 bg-gray-700 hover:bg-green-700 rounded-lg transition-colors text-gray-300 hover:text-white">
//               <FiImage className="w-3.5 h-3.5" />
//             </button>
//             <button onClick={() => { setUrlModalType("video"); setShowUrlModal(true); }} title="Add Video URL"
//               className="p-1.5 bg-gray-700 hover:bg-purple-700 rounded-lg transition-colors text-gray-300 hover:text-white">
//               <FiVideo className="w-3.5 h-3.5" />
//             </button>
//             <button onClick={() => { setUrlModalType("website"); setShowUrlModal(true); }} title="Embed Website"
//               className="p-1.5 bg-gray-700 hover:bg-blue-700 rounded-lg transition-colors text-gray-300 hover:text-white">
//               <FiGlobe className="w-3.5 h-3.5" />
//             </button>
//             <button onClick={() => pdfInputRef.current?.click()} title="Upload PDF / Document"
//               className="p-1.5 bg-gray-700 hover:bg-orange-700 rounded-lg transition-colors text-gray-300 hover:text-white">
//               <FiFileText className="w-3.5 h-3.5" />
//             </button>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Delete selected */}
//             {selectedId && (
//               <button onClick={handleDeleteSelected} title="Delete selected (Del)"
//                 className="p-1.5 bg-red-700 hover:bg-red-600 rounded-lg transition-colors text-white">
//                 <FiTrash2 className="w-3.5 h-3.5" />
//               </button>
//             )}

//             {/* Zoom */}
//             <button onClick={handleZoomOut}   title="Zoom Out"  className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiMinusCircle className="w-3.5 h-3.5 text-white"/></button>
//             <span className="text-white text-xs min-w-[44px] text-center">{Math.round(currentZoom * 100)}%</span>
//             <button onClick={handleZoomIn}    title="Zoom In"   className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiPlus className="w-3.5 h-3.5 text-white"/></button>
//             <button onClick={handleZoomReset} title="Reset Zoom" className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiRefreshCcw className="w-3.5 h-3.5 text-white"/></button>

//             <div className="w-px h-5 bg-gray-600" />

//             {/* Undo/Redo */}
//             <button onClick={handleUndo} title="Undo (Ctrl+Z)"             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiRefreshCcw className="w-3.5 h-3.5 text-white"/></button>
//             <button onClick={handleRedo} title="Redo (Ctrl+Y)"             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg"><FiRefreshCcw className="w-3.5 h-3.5 text-white transform scale-x-[-1]"/></button>

//             {/* Grid */}
//             <button onClick={() => setIsGridVisible((v) => !v)} title="Toggle Grid"
//               className={`p-1.5 rounded-lg transition-colors ${isGridVisible ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
//               <FiSquare className="w-3.5 h-3.5" />
//             </button>

//             {/* Clear + Export */}
//             <button onClick={handleClearWhiteboard} title="Clear All" className="p-1.5 bg-red-900 hover:bg-red-800 rounded-lg"><FiTrash2   className="w-3.5 h-3.5 text-white"/></button>
//             <button onClick={handleExport}          title="Export PNG" className="p-1.5 bg-blue-900 hover:bg-blue-800 rounded-lg"><FiDownload className="w-3.5 h-3.5 text-white"/></button>

//             <div className="w-px h-5 bg-gray-600" />
//             <button onClick={onClose} title="Close" className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg"><FiX className="w-3.5 h-3.5 text-white"/></button>
//           </div>
//         </div>

//         {/* ── Bottom status bar ── */}
//         <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm border border-gray-700">
//           <div className="flex items-center gap-3">
//             <span>Tool: <span className="font-bold capitalize">{tool}</span></span>
//             <span className="w-1 h-1 bg-gray-500 rounded-full" />
//             <span>Zoom: <span className="font-bold">{Math.round(currentZoom * 100)}%</span></span>
//             <span className="w-1 h-1 bg-gray-500 rounded-full" />
//             <span>Viewers: <span className="font-bold">{participants.length}</span></span>
//             {selectedId && <><span className="w-1 h-1 bg-gray-500 rounded-full" /><span className="text-blue-400">Object selected — Del to remove</span></>}
//             <span className="w-1 h-1 bg-gray-500 rounded-full" />
//             <span className="text-gray-400">Ctrl+V to paste image</span>
//           </div>
//         </div>

//         {/* ── Viewers list ── */}
//         <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm border border-gray-700">
//           <div className="flex items-center gap-2">
//             <span>{participants.length} viewer{participants.length !== 1 ? "s" : ""}</span>
//             {participants.map((p) => (
//               <div key={p.clientId} className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-medium" title={p.userName || "User"}>
//                 {(p.userName || "U").charAt(0)}
//               </div>
//             ))}
//           </div>
//         </div>

//         {isPanning && (
//           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-600 flex items-center gap-2 pointer-events-none">
//             <FiMove className="w-4 h-4" /> <span>Panning…</span>
//           </div>
//         )}
//       </div>
//     );
//   },
//   (prev, next) => {
//     if (prev.sessionId         !== next.sessionId)         return false;
//     if (prev.roomCode          !== next.roomCode)          return false;
//     if (prev.wsToken           !== next.wsToken)           return false;
//     if (prev.isActive          !== next.isActive)          return false;
//     if (prev.allowViewersToDraw !== next.allowViewersToDraw) return false;
//     if (prev.mainScreenMode    !== next.mainScreenMode)    return false;
//     if (prev.compact           !== next.compact)           return false;
//     if (prev.sessionInfo?.streamerId   !== next.sessionInfo?.streamerId)   return false;
//     if (prev.sessionInfo?.streamerName !== next.sessionInfo?.streamerName) return false;
//     return true;
//   }
// );

// StreamerWhiteboard.displayName = "StreamerWhiteboard";
// export default StreamerWhiteboard;





// working
// import React, { useState, useEffect, useRef, useCallback, memo } from "react";
// import * as Y from "yjs";
// import { WebsocketProvider } from "y-websocket";
// import { IndexeddbPersistence } from "y-indexeddb";

// import {
//   FiSquare,
//   FiCircle,
//   FiMinus,
//   FiDownload,
//   FiRefreshCcw,
//   FiTrash2,
//   FiMove,
//   FiPlus,
//   FiMinusCircle,
//   FiX,
// } from "react-icons/fi";
// import { FaEraser, FaPaintBrush } from "react-icons/fa";
// import { toast } from "react-toastify";

// // ✅ Memoized StreamerWhiteboard component with custom comparison
// const StreamerWhiteboard = memo(
//   ({
//     sessionId,
//     roomCode,
//     wsToken,
//     sessionInfo,
//     isActive,
//     onClose,
//     allowViewersToDraw = true,
//     mainScreenMode = false,
//     compact = false,
//   }) => {
//     // Canvas refs
//     const canvasRef = useRef(null);
//     const backgroundCanvasRef = useRef(null);
//     const ctxRef = useRef(null);
//     const bgCtxRef = useRef(null);
//     const containerRef = useRef(null);

//     // Yjs refs
//     const yDocRef = useRef(null);
//     const yProviderRef = useRef(null);
//     const yWhiteboardRef = useRef(null);
//     const ySettingsRef = useRef(null);
//     const yUndoManagerRef = useRef(null);

//     // ✅ observer cleanup refs
//     const yWhiteboardObserverCleanupRef = useRef(null);

//     // ✅ raf redraw scheduler refs (for fast remote updates)
//     const rafIdRef = useRef(null);
//     const pendingObjectsRef = useRef(null);

//     // State
//     const [isDrawing, setIsDrawing] = useState(false);
//     const [tool, setTool] = useState("pen");
//     const [color, setColor] = useState("#000000");
//     const [strokeWidth, setStrokeWidth] = useState(2);
//     const [opacity, setOpacity] = useState(1);
//     const [currentZoom, setCurrentZoom] = useState(1);
//     const [isConnected, setIsConnected] = useState(false);
//     const [participants, setParticipants] = useState([]);
//     const [isLocalDrawing, setIsLocalDrawing] = useState(false);
//     const [backgroundColor, setBackgroundColor] = useState("#ffffff");
//     const [isGridVisible, setIsGridVisible] = useState(false);
//     const [isPanning, setIsPanning] = useState(false);
//     const [showControls, setShowControls] = useState(!compact); // (kept for compatibility)

//     // Canvas state refs
//     const lastPointRef = useRef({ x: 0, y: 0 });
//     const canvasOffsetRef = useRef({ x: 0, y: 0 });
//     const lastPanPointRef = useRef({ x: 0, y: 0 });

//     // =========================
//     // ✅ Performance refs (smooth drawing during recording)
//     // =========================
//     const currentStrokeIdRef = useRef(null); // active pen/eraser stroke id
//     const strokeBufferRef = useRef([]); // buffered points for Yjs sync
//     const flushTimerRef = useRef(null); // throttle timer

//     const lastLocalPointRef = useRef(null); // last point drawn locally
//     const lastLocalMidRef = useRef(null); // last midpoint for smoothing
//     const pointerIdRef = useRef(null); // pointer capture id

//     // =========================
//     // Helpers
//     // =========================
//     const getTransformedPoint = useCallback(
//       (evt) => {
//         if (!canvasRef.current) return { x: 0, y: 0 };

//         const rect = canvasRef.current.getBoundingClientRect();
//         const scaleX = canvasRef.current.width / rect.width;
//         const scaleY = canvasRef.current.height / rect.height;

//         const x = (evt.clientX - rect.left) * scaleX;
//         const y = (evt.clientY - rect.top) * scaleY;

//         return {
//           x: (x - canvasOffsetRef.current.x) / currentZoom,
//           y: (y - canvasOffsetRef.current.y) / currentZoom,
//         };
//       },
//       [currentZoom]
//     );

//     // Draw grid (memoized)
//     const drawGrid = useCallback((ctx, width, height) => {
//       ctx.save();
//       ctx.strokeStyle = "#e0e0e0";
//       ctx.lineWidth = 0.5;
//       ctx.globalAlpha = 0.3;

//       const gridSize = 20;

//       for (let x = 0; x <= width; x += gridSize) {
//         ctx.beginPath();
//         ctx.moveTo(x, 0);
//         ctx.lineTo(x, height);
//         ctx.stroke();
//       }

//       for (let y = 0; y <= height; y += gridSize) {
//         ctx.beginPath();
//         ctx.moveTo(0, y);
//         ctx.lineTo(width, y);
//         ctx.stroke();
//       }

//       ctx.restore();
//     }, []);

//     // Draw individual object (memoized)
//     const drawObject = useCallback(
//       (ctx, obj) => {
//         if (!obj) return;

//         ctx.save();
//         ctx.strokeStyle = obj.color || "#000000";
//         ctx.fillStyle = obj.fillColor || "transparent";
//         ctx.lineWidth = (obj.strokeWidth || 2) / currentZoom;
//         ctx.globalAlpha = obj.opacity ?? 1;

//         switch (obj.type) {
//           case "pen":
//           case "pencil": {
//             if (!obj.points || obj.points.length < 1) break;
//             ctx.beginPath();
//             ctx.moveTo(obj.points[0].x, obj.points[0].y);
//             obj.points.forEach((p) => ctx.lineTo(p.x, p.y));
//             ctx.stroke();
//             break;
//           }

//           case "line": {
//             ctx.beginPath();
//             ctx.moveTo(obj.x1, obj.y1);
//             ctx.lineTo(obj.x2, obj.y2);
//             ctx.stroke();
//             break;
//           }

//           case "rectangle": {
//             if (obj.fillColor) ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
//             ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
//             break;
//           }

//           case "circle": {
//             ctx.beginPath();
//             ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);
//             if (obj.fillColor) ctx.fill();
//             ctx.stroke();
//             break;
//           }

//           case "text": {
//             ctx.font = `${obj.fontSize || 16}px Arial`;
//             ctx.fillStyle = obj.color || "#000";
//             ctx.fillText(obj.text || "", obj.x, obj.y);
//             break;
//           }

//           case "eraser": {
//             if (!obj.points || obj.points.length < 1) break;
//             ctx.save();
//             ctx.globalCompositeOperation = "destination-out";
//             ctx.beginPath();
//             ctx.moveTo(obj.points[0].x, obj.points[0].y);
//             obj.points.forEach((p) => ctx.lineTo(p.x, p.y));
//             ctx.stroke();
//             ctx.restore();
//             break;
//           }

//           default:
//             break;
//         }

//         ctx.restore();
//       },
//       [currentZoom]
//     );

//     // Redraw canvas from objects (memoized)
//     const redrawCanvas = useCallback(
//       (objects) => {
//         if (!ctxRef.current || !bgCtxRef.current || !canvasRef.current) return;

//         const ctx = ctxRef.current;
//         const bgCtx = bgCtxRef.current;
//         const canvas = canvasRef.current;

//         ctx.clearRect(0, 0, canvas.width, canvas.height);
//         bgCtx.clearRect(0, 0, canvas.width, canvas.height);

//         // Background
//         bgCtx.fillStyle = backgroundColor;
//         bgCtx.fillRect(0, 0, canvas.width, canvas.height);

//         // Grid
//         if (isGridVisible) {
//           drawGrid(bgCtx, canvas.width, canvas.height);
//         }

//         // Apply zoom/pan and draw
//         ctx.save();
//         ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//         ctx.scale(currentZoom, currentZoom);

//         (objects || []).forEach((obj) => drawObject(ctx, obj));

//         ctx.restore();
//       },
//       [backgroundColor, isGridVisible, currentZoom, drawGrid, drawObject]
//     );

//     // ✅ schedule redraw on next animation frame (fast remote updates, avoids spamming)
//     const scheduleRedraw = useCallback(
//       (objects) => {
//         pendingObjectsRef.current = objects || [];
//         if (rafIdRef.current) return;

//         rafIdRef.current = requestAnimationFrame(() => {
//           rafIdRef.current = null;
//           const objs = pendingObjectsRef.current || [];
//           pendingObjectsRef.current = null;
//           redrawCanvas(objs);
//         });
//       },
//       [redrawCanvas]
//     );

//     // Load whiteboard state from Yjs (memoized)
//     const loadWhiteboardState = useCallback(() => {
//       if (!yWhiteboardRef.current || yWhiteboardRef.current.length === 0) return;

//       try {
//         const state = yWhiteboardRef.current.toArray()[0] || {};
//         if (state.background) setBackgroundColor(state.background);

//         if (Array.isArray(state.objects)) {
//           // ✅ use scheduler for quick UI update
//           scheduleRedraw(state.objects);
//         }
//       } catch (error) {
//         console.error("Error loading whiteboard state:", error);
//       }
//     }, [scheduleRedraw]);

//     // Add object to Yjs document (memoized)
//     const addObject = useCallback(
//       (obj) => {
//         if (!yWhiteboardRef.current || !yDocRef.current) return;

//         setIsLocalDrawing(true);

//         try {
//           yDocRef.current.transact(() => {
//             const currentState = yWhiteboardRef.current.toArray()[0] || {
//               version: "1.0.0",
//               objects: [],
//               background: backgroundColor,
//               createdAt: new Date().toISOString(),
//             };

//             const updatedState = {
//               ...currentState,
//               objects: [...(currentState.objects || []), obj],
//               updatedBy: sessionInfo?.streamerId,
//               updatedAt: new Date().toISOString(),
//             };

//             if (yWhiteboardRef.current.length === 0) {
//               yWhiteboardRef.current.insert(0, [updatedState]);
//             } else {
//               yWhiteboardRef.current.delete(0, 1);
//               yWhiteboardRef.current.insert(0, [updatedState]);
//             }
//           }, "drawing");
//         } catch (error) {
//           console.error("Error adding object:", error);
//         } finally {
//           setIsLocalDrawing(false);
//         }
//       },
//       [backgroundColor, sessionInfo]
//     );

//     // =========================
//     // ✅ Incremental local draw (SMOOTH CURVE)
//     // =========================
//     const drawSmoothStroke = useCallback(
//       (prev, next, strokeType) => {
//         if (!ctxRef.current) return;
//         const ctx = ctxRef.current;

//         ctx.save();
//         ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//         ctx.scale(currentZoom, currentZoom);

//         ctx.lineCap = "round";
//         ctx.lineJoin = "round";
//         ctx.globalAlpha = opacity ?? 1;
//         ctx.lineWidth = (strokeWidth || 2) / currentZoom;

//         const isEraser = strokeType === "eraser";
//         if (isEraser) {
//           ctx.globalCompositeOperation = "destination-out";
//           ctx.strokeStyle = "rgba(0,0,0,1)";
//         } else {
//           ctx.globalCompositeOperation = "source-over";
//           ctx.strokeStyle = color || "#000000";
//         }

//         const mid = { x: (prev.x + next.x) / 2, y: (prev.y + next.y) / 2 };

//         if (!lastLocalMidRef.current) {
//           lastLocalMidRef.current = { x: prev.x, y: prev.y };
//         }

//         ctx.beginPath();
//         ctx.moveTo(lastLocalMidRef.current.x, lastLocalMidRef.current.y);
//         ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
//         ctx.stroke();

//         lastLocalMidRef.current = mid;

//         ctx.restore();
//       },
//       [currentZoom, color, strokeWidth, opacity]
//     );

//     // =========================
//     // ✅ Throttled Yjs sync (batch points)
//     // =========================
//     const flushStrokeToYjs = useCallback(
//       (force = false) => {
//         if (!yWhiteboardRef.current || !yDocRef.current) return;

//         const strokeId = currentStrokeIdRef.current;
//         if (!strokeId) return;

//         const buffered = strokeBufferRef.current;
//         if (!force && buffered.length === 0) return;
//         if (buffered.length === 0) return;

//         const pointsToAdd = buffered.slice();
//         strokeBufferRef.current = [];

//         try {
//           yDocRef.current.transact(() => {
//             const currentState = yWhiteboardRef.current.toArray()[0] || {
//               version: "1.0.0",
//               objects: [],
//               background: backgroundColor,
//               createdAt: new Date().toISOString(),
//             };

//             const objects = [...(currentState.objects || [])];

//             let idx = objects.length - 1;
//             const found = objects.findIndex((o) => o && o.id === strokeId);
//             if (found !== -1) idx = found;

//             const target = objects[idx];
//             if (!target || (target.type !== "pen" && target.type !== "eraser")) return;

//             target.points = [...(target.points || []), ...pointsToAdd];

//             const updatedState = {
//               ...currentState,
//               objects,
//               updatedBy: sessionInfo?.streamerId,
//               updatedAt: new Date().toISOString(),
//             };

//             if (yWhiteboardRef.current.length === 0) {
//               yWhiteboardRef.current.insert(0, [updatedState]);
//             } else {
//               yWhiteboardRef.current.delete(0, 1);
//               yWhiteboardRef.current.insert(0, [updatedState]);
//             }
//           }, "drawing");
//         } catch (error) {
//           console.error("Error flushing stroke points:", error);
//         }
//       },
//       [backgroundColor, sessionInfo]
//     );

//     const scheduleFlush = useCallback(() => {
//       if (flushTimerRef.current) return;
//       flushTimerRef.current = setTimeout(() => {
//         flushTimerRef.current = null;
//         flushStrokeToYjs(false);
//       }, 50);
//     }, [flushStrokeToYjs]);

//     useEffect(() => {
//       return () => {
//         if (flushTimerRef.current) {
//           clearTimeout(flushTimerRef.current);
//           flushTimerRef.current = null;
//         }
//         if (rafIdRef.current) {
//           cancelAnimationFrame(rafIdRef.current);
//           rafIdRef.current = null;
//         }
//       };
//     }, []);

//     // =========================
//     // ✅ Initialize Yjs document and WebSocket provider
//     // =========================
//     useEffect(() => {
//       if (!sessionId || !wsToken) return;

//       const initYjs = async () => {
//         try {
//           const ydoc = new Y.Doc();
//           yDocRef.current = ydoc;

//           const baseWs = import.meta.env.VITE_WS_URL || "ws://localhost:9090";
//           const url = `${baseWs}/yjs`;

//           const provider = new WebsocketProvider(url, sessionId, ydoc, {
//             WebSocketPolyfill: WebSocket,
//             params: {
//               token: wsToken,
//               isStreamer: true,
//               allowViewersToDraw,
//               roomCode,
//               userId: sessionInfo?.streamerId,
//               userName: sessionInfo?.streamerName,
//             },
//           });

//           yProviderRef.current = provider;

//           const yWhiteboard = ydoc.getArray("whiteboard");
//           yWhiteboardRef.current = yWhiteboard;

//           const ySettings = ydoc.getMap("room_settings");
//           ySettingsRef.current = ySettings;

//           provider.awareness.setLocalState({
//             userId: sessionInfo?.streamerId || "streamer",
//             userName: sessionInfo?.streamerName || "Streamer",
//             role: "STREAMER",
//             isStreamer: true,
//             color,
//             tool,
//             cursor: null,
//           });

//           provider.awareness.on("change", () => {
//             const states = Array.from(provider.awareness.getStates().entries());
//             const participantsList = states
//               .map(([clientId, state]) => ({ clientId, ...state }))
//               .filter((p) => p.userId);

//             setParticipants(participantsList);
//           });

//           provider.on("sync", (synced) => {
//             setIsConnected(!!synced);
//             if (synced) loadWhiteboardState();
//           });

//           // ✅ Undo manager tracks our transact origin ("drawing")
//           yUndoManagerRef.current = new Y.UndoManager(yWhiteboard, {
//             captureTimeout: 150,
//             trackedOrigins: new Set(["drawing"]),
//           });

//           // ✅ Local persistence
//           new IndexeddbPersistence(`whiteboard-${sessionId}`, ydoc);

//           // =========================================================
//           // ✅ IMPORTANT FIX:
//           // Streamer should listen remote changes & redraw quickly
//           // =========================================================
//           const observer = (event) => {
//             try {
//               const origin = event?.transaction?.origin;

//               // If it's our own drawing updates and we're actively drawing,
//               // skip full redraw (we already draw incrementally).
//               if (origin === "drawing" && (isDrawing || currentStrokeIdRef.current)) return;

//               // Otherwise (viewer draw / remote update), load & redraw ASAP
//               loadWhiteboardState();
//             } catch (e) {
//               // fallback
//               loadWhiteboardState();
//             }
//           };

//           yWhiteboard.observe(observer);

//           // store cleanup
//           yWhiteboardObserverCleanupRef.current = () => {
//             try {
//               yWhiteboard.unobserve(observer);
//             } catch {}
//           };
//         } catch (error) {
//           console.error("Failed to initialize Yjs:", error);
//           toast.error("Failed to connect to whiteboard server");
//         }
//       };

//       initYjs();

//       return () => {
//         // flush pending stroke safely before teardown
//         try {
//           flushStrokeToYjs(true);
//         } catch {}

//         // ✅ detach observer
//         if (yWhiteboardObserverCleanupRef.current) {
//           try {
//             yWhiteboardObserverCleanupRef.current();
//           } catch {}
//           yWhiteboardObserverCleanupRef.current = null;
//         }

//         if (yProviderRef.current) {
//           try {
//             yProviderRef.current.disconnect();
//             yProviderRef.current.destroy();
//           } catch {}
//         }
//         if (yDocRef.current) {
//           try {
//             yDocRef.current.destroy();
//           } catch {}
//         }
//         yProviderRef.current = null;
//         yDocRef.current = null;
//         yWhiteboardRef.current = null;
//         ySettingsRef.current = null;
//         yUndoManagerRef.current = null;
//       };
//       // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [sessionId, roomCode, wsToken, allowViewersToDraw, sessionInfo, loadWhiteboardState]);

//     // ✅ Keep awareness updated without reconnecting
//     useEffect(() => {
//       const provider = yProviderRef.current;
//       if (!provider) return;

//       try {
//         const prevState = provider.awareness.getLocalState() || {};
//         provider.awareness.setLocalState({
//           ...prevState,
//           userId: sessionInfo?.streamerId || "streamer",
//           userName: sessionInfo?.streamerName || "Streamer",
//           role: "STREAMER",
//           isStreamer: true,
//           color,
//           tool,
//         });
//       } catch {}
//     }, [color, tool, sessionInfo]);

//     // =========================
//     // ✅ Initialize canvas
//     // =========================
//     useEffect(() => {
//       if (!canvasRef.current || !backgroundCanvasRef.current || !containerRef.current) return;

//       const canvas = canvasRef.current;
//       const bgCanvas = backgroundCanvasRef.current;
//       const container = containerRef.current;

//       const resizeCanvas = () => {
//         const containerWidth = container.clientWidth;
//         const containerHeight = container.clientHeight;

//         canvas.width = containerWidth;
//         canvas.height = containerHeight;
//         bgCanvas.width = containerWidth;
//         bgCanvas.height = containerHeight;

//         const ctx = canvas.getContext("2d");
//         const bgCtx = bgCanvas.getContext("2d");

//         ctxRef.current = ctx;
//         bgCtxRef.current = bgCtx;

//         ctx.lineCap = "round";
//         ctx.lineJoin = "round";

//         if (yWhiteboardRef.current) {
//           const state = yWhiteboardRef.current.toArray()[0] || {};
//           scheduleRedraw(state.objects || []);
//         }
//       };

//       resizeCanvas();

//       const resizeObserver = new ResizeObserver(() => resizeCanvas());
//       resizeObserver.observe(container);

//       return () => resizeObserver.disconnect();
//     }, [scheduleRedraw]);

//     // =========================
//     // ✅ Pointer Events + coalesced events
//     // =========================
//     const handlePointerDown = useCallback(
//       (e) => {
//         e.preventDefault();
//         if (!canvasRef.current) return;

//         if (e.button === 2) return;

//         try {
//           canvasRef.current.setPointerCapture(e.pointerId);
//           pointerIdRef.current = e.pointerId;
//         } catch {}

//         if (tool === "pan" || e.altKey || e.button === 1) {
//           setIsPanning(true);
//           lastPanPointRef.current = { x: e.clientX, y: e.clientY };
//           canvasRef.current.style.cursor = "grabbing";
//           return;
//         }

//         setIsDrawing(true);

//         const p = getTransformedPoint(e);
//         lastPointRef.current = p;
//         lastLocalPointRef.current = p;
//         lastLocalMidRef.current = null;

//         if (tool === "pen" || tool === "eraser") {
//           const strokeId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
//           currentStrokeIdRef.current = strokeId;
//           strokeBufferRef.current = [];

//           addObject({
//             id: strokeId,
//             type: tool,
//             points: [{ x: p.x, y: p.y }],
//             color: tool === "eraser" ? backgroundColor : color,
//             strokeWidth,
//             opacity,
//             timestamp: Date.now(),
//           });

//           // dot for click-without-move
//           drawSmoothStroke(p, { x: p.x + 0.01, y: p.y + 0.01 }, tool);
//         }
//       },
//       [tool, getTransformedPoint, addObject, backgroundColor, color, strokeWidth, opacity, drawSmoothStroke]
//     );

//     const handlePointerMove = useCallback(
//       (e) => {
//         if (!canvasRef.current) return;

//         if (isPanning) {
//           const dx = e.clientX - lastPanPointRef.current.x;
//           const dy = e.clientY - lastPanPointRef.current.y;
//           canvasOffsetRef.current.x += dx;
//           canvasOffsetRef.current.y += dy;
//           lastPanPointRef.current = { x: e.clientX, y: e.clientY };

//           if (yWhiteboardRef.current) {
//             const state = yWhiteboardRef.current.toArray()[0] || {};
//             scheduleRedraw(state.objects || []);
//           }
//           return;
//         }

//         if (!isDrawing) return;
//         if (tool !== "pen" && tool !== "eraser") return;

//         const events =
//           typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e];

//         for (const evt of events) {
//           const next = getTransformedPoint(evt);
//           const prev = lastLocalPointRef.current || lastPointRef.current;

//           const dist = prev ? Math.hypot(next.x - prev.x, next.y - prev.y) : 999;

//           const minDist = 0.6;
//           if (dist < minDist) continue;

//           if (prev) drawSmoothStroke(prev, next, tool);

//           strokeBufferRef.current.push(next);
//           scheduleFlush();

//           lastLocalPointRef.current = next;
//           lastPointRef.current = next;
//         }
//       },
//       [isDrawing, isPanning, tool, getTransformedPoint, drawSmoothStroke, scheduleFlush, scheduleRedraw]
//     );

//     const endStrokeCleanup = useCallback(() => {
//       flushStrokeToYjs(true);

//       currentStrokeIdRef.current = null;
//       strokeBufferRef.current = [];
//       lastLocalPointRef.current = null;
//       lastLocalMidRef.current = null;

//       if (canvasRef.current && pointerIdRef.current != null) {
//         try {
//           canvasRef.current.releasePointerCapture(pointerIdRef.current);
//         } catch {}
//       }
//       pointerIdRef.current = null;
//     }, [flushStrokeToYjs]);

//     const handlePointerUp = useCallback(() => {
//       setIsDrawing(false);
//       setIsPanning(false);

//       endStrokeCleanup();

//       if (canvasRef.current) {
//         canvasRef.current.style.cursor = tool === "pan" ? "grab" : "crosshair";
//       }
//     }, [tool, endStrokeCleanup]);

//     const handlePointerLeave = useCallback(() => {
//       setIsDrawing(false);
//       setIsPanning(false);
//       endStrokeCleanup();
//     }, [endStrokeCleanup]);

//     // =========================
//     // Wheel Zoom
//     // =========================
//     const handleWheel = useCallback(
//       (e) => {
//         e.preventDefault();
//         if (!canvasRef.current) return;

//         const rect = canvasRef.current.getBoundingClientRect();
//         const mouseX = e.clientX - rect.left;
//         const mouseY = e.clientY - rect.top;

//         const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
//         const newZoom = Math.max(0.5, Math.min(3, currentZoom * scaleFactor));

//         const zoomChange = newZoom / currentZoom;

//         canvasOffsetRef.current.x =
//           mouseX - (mouseX - canvasOffsetRef.current.x) * zoomChange;
//         canvasOffsetRef.current.y =
//           mouseY - (mouseY - canvasOffsetRef.current.y) * zoomChange;

//         setCurrentZoom(newZoom);

//         if (yWhiteboardRef.current) {
//           const state = yWhiteboardRef.current.toArray()[0] || {};
//           scheduleRedraw(state.objects || []);
//         }
//       },
//       [currentZoom, scheduleRedraw]
//     );

//     // Zoom controls (memoized)
//     const handleZoomIn = useCallback(() => {
//       setCurrentZoom((prev) => Math.min(prev + 0.1, 3));
//       if (yWhiteboardRef.current) {
//         const state = yWhiteboardRef.current.toArray()[0] || {};
//         scheduleRedraw(state.objects || []);
//       }
//     }, [scheduleRedraw]);

//     const handleZoomOut = useCallback(() => {
//       setCurrentZoom((prev) => Math.max(prev - 0.1, 0.5));
//       if (yWhiteboardRef.current) {
//         const state = yWhiteboardRef.current.toArray()[0] || {};
//         scheduleRedraw(state.objects || []);
//       }
//     }, [scheduleRedraw]);

//     const handleZoomReset = useCallback(() => {
//       setCurrentZoom(1);
//       canvasOffsetRef.current = { x: 0, y: 0 };

//       if (yWhiteboardRef.current) {
//         const state = yWhiteboardRef.current.toArray()[0] || {};
//         scheduleRedraw(state.objects || []);
//       }
//     }, [scheduleRedraw]);

//     // Clear whiteboard (memoized)
//     const handleClearWhiteboard = useCallback(() => {
//       if (!yWhiteboardRef.current || !yDocRef.current) return;

//       if (window.confirm("Clear entire whiteboard?")) {
//         const emptyState = {
//           version: "1.0.0",
//           objects: [],
//           background: backgroundColor,
//           clearedAt: new Date().toISOString(),
//           clearedBy: sessionInfo?.streamerId,
//         };

//         yDocRef.current.transact(() => {
//           yWhiteboardRef.current.delete(0, yWhiteboardRef.current.length);
//           yWhiteboardRef.current.insert(0, [emptyState]);
//         }, "drawing");

//         scheduleRedraw([]);
//         toast.success("Whiteboard cleared");
//       }
//     }, [backgroundColor, sessionInfo, scheduleRedraw]);

//     // Export as image (memoized)
//     const handleExport = useCallback(() => {
//       if (!canvasRef.current || !backgroundCanvasRef.current) return;

//       const canvas = canvasRef.current;
//       const bgCanvas = backgroundCanvasRef.current;

//       const exportCanvas = document.createElement("canvas");
//       exportCanvas.width = canvas.width;
//       exportCanvas.height = canvas.height;

//       const exportCtx = exportCanvas.getContext("2d");
//       exportCtx.drawImage(bgCanvas, 0, 0);
//       exportCtx.drawImage(canvas, 0, 0);

//       const link = document.createElement("a");
//       link.download = `whiteboard-${sessionId}-${Date.now()}.png`;
//       link.href = exportCanvas.toDataURL("image/png");
//       link.click();

//       toast.success("Whiteboard exported");
//     }, [sessionId]);

//     // Undo/Redo (memoized)
//     const handleUndo = useCallback(() => {
//       if (yUndoManagerRef.current) yUndoManagerRef.current.undo();
//     }, []);

//     const handleRedo = useCallback(() => {
//       if (yUndoManagerRef.current) yUndoManagerRef.current.redo();
//     }, []);

//     return (
//       <div
//         ref={containerRef}
//         className={`absolute inset-0 z-20 w-full h-full bg-gray-900 overflow-hidden ${
//           isActive ? "block" : "hidden"
//         }`}
//         onWheel={handleWheel}
//       >
//         {/* Background canvas */}
//         <canvas
//           ref={backgroundCanvasRef}
//           className="absolute top-0 left-0 w-full h-full"
//           style={{ pointerEvents: "none" }}
//         />

//         {/* Main drawing canvas */}
//         <canvas
//           ref={canvasRef}
//           className={`absolute top-0 left-0 w-full h-full ${
//             tool === "pan" ? "cursor-grab" : "cursor-crosshair"
//           }`}
//           style={{ touchAction: "none" }}
//           onPointerDown={handlePointerDown}
//           onPointerMove={handlePointerMove}
//           onPointerUp={handlePointerUp}
//           onPointerLeave={handlePointerLeave}
//           onContextMenu={(e) => e.preventDefault()}
//         />

//         {/* Floating Controls - Always Visible */}
//         <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
//           <div className="bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 p-2 flex items-center space-x-2">
//             {/* Connection status */}
//             <div
//               className={`w-2 h-2 rounded-full ${
//                 isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
//               }`}
//             />
//             <span className="text-white text-xs mr-2">
//               {isConnected ? "Connected" : "Disconnected"}
//             </span>

//             <div className="w-px h-6 bg-gray-600"></div>

//             {/* Drawing tools */}
//             <div className="flex items-center space-x-1">
//               <button
//                 onClick={() => setTool("pen")}
//                 className={`p-1.5 rounded-lg transition-colors ${
//                   tool === "pen"
//                     ? "bg-blue-600 text-white"
//                     : "bg-gray-700 hover:bg-gray-600 text-gray-300"
//                 }`}
//                 title="Pen"
//               >
//                 <FaPaintBrush className="w-4 h-4" />
//               </button>

//               <button
//                 onClick={() => setTool("eraser")}
//                 className={`p-1.5 rounded-lg transition-colors ${
//                   tool === "eraser"
//                     ? "bg-blue-600 text-white"
//                     : "bg-gray-700 hover:bg-gray-600 text-gray-300"
//                 }`}
//                 title="Eraser"
//               >
//                 <FaEraser className="w-4 h-4" />
//               </button>

//               <button
//                 onClick={() => setTool("line")}
//                 className={`p-1.5 rounded-lg transition-colors ${
//                   tool === "line"
//                     ? "bg-blue-600 text-white"
//                     : "bg-gray-700 hover:bg-gray-600 text-gray-300"
//                 }`}
//                 title="Line"
//               >
//                 <FiMinus className="w-4 h-4" />
//               </button>

//               <button
//                 onClick={() => setTool("rectangle")}
//                 className={`p-1.5 rounded-lg transition-colors ${
//                   tool === "rectangle"
//                     ? "bg-blue-600 text-white"
//                     : "bg-gray-700 hover:bg-gray-600 text-gray-300"
//                 }`}
//                 title="Rectangle"
//               >
//                 <FiSquare className="w-4 h-4" />
//               </button>

//               <button
//                 onClick={() => setTool("circle")}
//                 className={`p-1.5 rounded-lg transition-colors ${
//                   tool === "circle"
//                     ? "bg-blue-600 text-white"
//                     : "bg-gray-700 hover:bg-gray-600 text-gray-300"
//                 }`}
//                 title="Circle"
//               >
//                 <FiCircle className="w-4 h-4" />
//               </button>

//               <button
//                 onClick={() => setTool("pan")}
//                 className={`p-1.5 rounded-lg transition-colors ${
//                   tool === "pan"
//                     ? "bg-blue-600 text-white"
//                     : "bg-gray-700 hover:bg-gray-600 text-gray-300"
//                 }`}
//                 title="Pan (Alt + Drag)"
//               >
//                 <FiMove className="w-4 h-4" />
//               </button>
//             </div>

//             <div className="w-px h-6 bg-gray-600"></div>

//             {/* Color picker */}
//             <input
//               type="color"
//               value={color}
//               onChange={(e) => setColor(e.target.value)}
//               className="w-7 h-7 rounded cursor-pointer border border-gray-600"
//               title="Color"
//             />

//             <select
//               value={strokeWidth}
//               onChange={(e) => setStrokeWidth(Number(e.target.value))}
//               className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 w-16"
//               title="Stroke Width"
//             >
//               <option value="1">1px</option>
//               <option value="2">2px</option>
//               <option value="3">3px</option>
//               <option value="5">5px</option>
//               <option value="8">8px</option>
//             </select>

//             <select
//               value={opacity}
//               onChange={(e) => setOpacity(Number(e.target.value))}
//               className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 w-16"
//               title="Opacity"
//             >
//               <option value="1">100%</option>
//               <option value="0.8">80%</option>
//               <option value="0.6">60%</option>
//               <option value="0.4">40%</option>
//             </select>

//             <div className="w-px h-6 bg-gray-600"></div>

//             {/* Zoom controls */}
//             <button
//               onClick={handleZoomOut}
//               className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//               title="Zoom Out"
//             >
//               <FiMinusCircle className="w-4 h-4 text-white" />
//             </button>
//             <span className="text-white text-sm min-w-[50px] text-center font-medium">
//               {Math.round(currentZoom * 100)}%
//             </span>
//             <button
//               onClick={handleZoomIn}
//               className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//               title="Zoom In"
//             >
//               <FiPlus className="w-4 h-4 text-white" />
//             </button>
//             <button
//               onClick={handleZoomReset}
//               className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//               title="Reset Zoom"
//             >
//               <FiRefreshCcw className="w-4 h-4 text-white" />
//             </button>

//             <div className="w-px h-6 bg-gray-600"></div>

//             {/* Undo/Redo */}
//             <button
//               onClick={handleUndo}
//               className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//               title="Undo"
//             >
//               <FiRefreshCcw className="w-4 h-4 text-white" />
//             </button>
//             <button
//               onClick={handleRedo}
//               className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//               title="Redo"
//             >
//               <FiRefreshCcw className="w-4 h-4 text-white transform scale-x-[-1]" />
//             </button>

//             {/* Clear/Export */}
//             <button
//               onClick={handleClearWhiteboard}
//               className="p-1.5 bg-red-900 hover:bg-red-800 rounded-lg transition-colors"
//               title="Clear Whiteboard"
//             >
//               <FiTrash2 className="w-4 h-4 text-white" />
//             </button>
//             <button
//               onClick={handleExport}
//               className="p-1.5 bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors"
//               title="Export as PNG"
//             >
//               <FiDownload className="w-4 h-4 text-white" />
//             </button>

//             {/* Grid toggle */}
//             <button
//               onClick={() => setIsGridVisible(!isGridVisible)}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 isGridVisible
//                   ? "bg-blue-600 text-white"
//                   : "bg-gray-700 text-gray-300 hover:bg-gray-600"
//               }`}
//               title="Toggle Grid"
//             >
//               <FiSquare className="w-4 h-4" />
//             </button>

//             <div className="w-px h-6 bg-gray-600"></div>

//             {/* Close button */}
//             <button
//               onClick={onClose}
//               className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
//               title="Close Whiteboard"
//             >
//               <FiX className="w-4 h-4 text-white" />
//             </button>
//           </div>
//         </div>

//         {/* Bottom Info Bar */}
//         <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded backdrop-blur-sm border border-gray-700">
//           <div className="flex items-center space-x-3">
//             <span>
//               Tool: <span className="font-bold capitalize">{tool}</span>
//             </span>
//             <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
//             <span>
//               Zoom:{" "}
//               <span className="font-bold">{Math.round(currentZoom * 100)}%</span>
//             </span>
//             <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
//             <span>
//               Viewers: <span className="font-bold">{participants.length}</span>
//             </span>
//             <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
//             <span>Alt+Click to pan</span>
//           </div>
//         </div>

//         {/* Viewers count in top right */}
//         <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded backdrop-blur-sm border border-gray-700">
//           <div className="flex items-center space-x-2">
//             <span>
//               {participants.length} active{" "}
//               {participants.length === 1 ? "viewer" : "viewers"}
//             </span>
//             {participants.map((p) => (
//               <div
//                 key={p.clientId}
//                 className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-medium"
//                 title={`${p.userName || "User"}`}
//               >
//                 {p.userName?.charAt(0) || "U"}
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Panning indicator */}
//         {isPanning && (
//           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-600">
//             <div className="flex items-center space-x-2">
//               <FiMove className="w-4 h-4" />
//               <span>Panning...</span>
//             </div>
//           </div>
//         )}

//         {/* Drawing disabled overlay */}
//         {!allowViewersToDraw && (
//           <div className="absolute bottom-2 right-2 bg-yellow-900/70 text-yellow-200 px-3 py-1.5 rounded-lg text-xs backdrop-blur-sm border border-yellow-600/30">
//             Viewers cannot draw
//           </div>
//         )}
//       </div>
//     );
//   },
//   (prevProps, nextProps) => {
//     if (prevProps.sessionId !== nextProps.sessionId) return false;
//     if (prevProps.roomCode !== nextProps.roomCode) return false;
//     if (prevProps.wsToken !== nextProps.wsToken) return false;
//     if (prevProps.isActive !== nextProps.isActive) return false;
//     if (prevProps.allowViewersToDraw !== nextProps.allowViewersToDraw) return false;
//     if (prevProps.mainScreenMode !== nextProps.mainScreenMode) return false;
//     if (prevProps.compact !== nextProps.compact) return false;

//     if (prevProps.sessionInfo?.streamerId !== nextProps.sessionInfo?.streamerId) return false;
//     if (prevProps.sessionInfo?.streamerName !== nextProps.sessionInfo?.streamerName) return false;

//     return true;
//   }
// );

// StreamerWhiteboard.displayName = "StreamerWhiteboard";

// export default StreamerWhiteboard;






// import React, { useState, useEffect, useRef, useCallback, memo } from "react";
// import * as Y from "yjs";
// import { WebsocketProvider } from "y-websocket";
// import { IndexeddbPersistence } from "y-indexeddb";

// import {
//   FiSquare,
//   FiCircle,
//   FiMinus,
//   FiDownload,
//   FiRefreshCcw,
//   FiTrash2,
//   FiMove,
//   FiPlus,
//   FiMinusCircle,
//   FiX,
// } from "react-icons/fi";
// import { FaEraser, FaPaintBrush } from "react-icons/fa";
// import { toast } from "react-toastify";

// // ✅ Memoized StreamerWhiteboard component with custom comparison
// const StreamerWhiteboard = memo(
//   ({
//     sessionId,
//     roomCode,
//     wsToken,
//     sessionInfo,
//     isActive,
//     onClose,
//     allowViewersToDraw = true,
//     mainScreenMode = false,
//     compact = false,
//   }) => {
//     // Canvas refs
//     const canvasRef = useRef(null);
//     const backgroundCanvasRef = useRef(null);
//     const ctxRef = useRef(null);
//     const bgCtxRef = useRef(null);
//     const containerRef = useRef(null);

//     // Yjs refs
//     const yDocRef = useRef(null);
//     const yProviderRef = useRef(null);
//     const yWhiteboardRef = useRef(null);
//     const ySettingsRef = useRef(null);
//     const yUndoManagerRef = useRef(null);

//     // State
//     const [isDrawing, setIsDrawing] = useState(false);
//     const [tool, setTool] = useState("pen");
//     const [color, setColor] = useState("#000000");
//     const [strokeWidth, setStrokeWidth] = useState(2);
//     const [opacity, setOpacity] = useState(1);
//     const [currentZoom, setCurrentZoom] = useState(1);
//     const [isConnected, setIsConnected] = useState(false);
//     const [participants, setParticipants] = useState([]);
//     const [isLocalDrawing, setIsLocalDrawing] = useState(false);
//     const [backgroundColor, setBackgroundColor] = useState("#ffffff");
//     const [isGridVisible, setIsGridVisible] = useState(false);
//     const [isPanning, setIsPanning] = useState(false);
//     const [showControls, setShowControls] = useState(!compact); // (kept for compatibility)

//     // Canvas state refs
//     const lastPointRef = useRef({ x: 0, y: 0 });
//     const canvasOffsetRef = useRef({ x: 0, y: 0 });
//     const lastPanPointRef = useRef({ x: 0, y: 0 });

//     // =========================
//     // ✅ Performance refs (smooth drawing during recording)
//     // =========================
//     const currentStrokeIdRef = useRef(null); // active pen/eraser stroke id
//     const strokeBufferRef = useRef([]); // buffered points for Yjs sync
//     const flushTimerRef = useRef(null); // throttle timer

//     const lastLocalPointRef = useRef(null); // last point drawn locally
//     const lastLocalMidRef = useRef(null); // last midpoint for smoothing
//     const pointerIdRef = useRef(null); // pointer capture id

//     // =========================
//     // Helpers
//     // =========================
//     const getTransformedPoint = useCallback(
//       (evt) => {
//         if (!canvasRef.current) return { x: 0, y: 0 };

//         const rect = canvasRef.current.getBoundingClientRect();
//         const scaleX = canvasRef.current.width / rect.width;
//         const scaleY = canvasRef.current.height / rect.height;

//         const x = (evt.clientX - rect.left) * scaleX;
//         const y = (evt.clientY - rect.top) * scaleY;

//         return {
//           x: (x - canvasOffsetRef.current.x) / currentZoom,
//           y: (y - canvasOffsetRef.current.y) / currentZoom,
//         };
//       },
//       [currentZoom]
//     );

//     // Draw grid (memoized)
//     const drawGrid = useCallback((ctx, width, height) => {
//       ctx.save();
//       ctx.strokeStyle = "#e0e0e0";
//       ctx.lineWidth = 0.5;
//       ctx.globalAlpha = 0.3;

//       const gridSize = 20;

//       for (let x = 0; x <= width; x += gridSize) {
//         ctx.beginPath();
//         ctx.moveTo(x, 0);
//         ctx.lineTo(x, height);
//         ctx.stroke();
//       }

//       for (let y = 0; y <= height; y += gridSize) {
//         ctx.beginPath();
//         ctx.moveTo(0, y);
//         ctx.lineTo(width, y);
//         ctx.stroke();
//       }

//       ctx.restore();
//     }, []);

//     // Draw individual object (memoized)
//     const drawObject = useCallback(
//       (ctx, obj) => {
//         if (!obj) return;

//         ctx.save();
//         ctx.strokeStyle = obj.color || "#000000";
//         ctx.fillStyle = obj.fillColor || "transparent";
//         ctx.lineWidth = (obj.strokeWidth || 2) / currentZoom;
//         ctx.globalAlpha = obj.opacity ?? 1;

//         switch (obj.type) {
//           case "pen":
//           case "pencil": {
//             if (!obj.points || obj.points.length < 1) break;
//             ctx.beginPath();
//             ctx.moveTo(obj.points[0].x, obj.points[0].y);
//             obj.points.forEach((p) => ctx.lineTo(p.x, p.y));
//             ctx.stroke();
//             break;
//           }

//           case "line": {
//             ctx.beginPath();
//             ctx.moveTo(obj.x1, obj.y1);
//             ctx.lineTo(obj.x2, obj.y2);
//             ctx.stroke();
//             break;
//           }

//           case "rectangle": {
//             if (obj.fillColor) ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
//             ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
//             break;
//           }

//           case "circle": {
//             ctx.beginPath();
//             ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);
//             if (obj.fillColor) ctx.fill();
//             ctx.stroke();
//             break;
//           }

//           case "text": {
//             ctx.font = `${obj.fontSize || 16}px Arial`;
//             ctx.fillStyle = obj.color || "#000";
//             ctx.fillText(obj.text || "", obj.x, obj.y);
//             break;
//           }

//           case "eraser": {
//             if (!obj.points || obj.points.length < 1) break;
//             ctx.save();
//             ctx.globalCompositeOperation = "destination-out";
//             ctx.beginPath();
//             ctx.moveTo(obj.points[0].x, obj.points[0].y);
//             obj.points.forEach((p) => ctx.lineTo(p.x, p.y));
//             ctx.stroke();
//             ctx.restore();
//             break;
//           }

//           default:
//             break;
//         }

//         ctx.restore();
//       },
//       [currentZoom]
//     );

//     // Redraw canvas from objects (memoized)
//     const redrawCanvas = useCallback(
//       (objects) => {
//         if (!ctxRef.current || !bgCtxRef.current || !canvasRef.current) return;

//         const ctx = ctxRef.current;
//         const bgCtx = bgCtxRef.current;
//         const canvas = canvasRef.current;

//         ctx.clearRect(0, 0, canvas.width, canvas.height);
//         bgCtx.clearRect(0, 0, canvas.width, canvas.height);

//         // Background
//         bgCtx.fillStyle = backgroundColor;
//         bgCtx.fillRect(0, 0, canvas.width, canvas.height);

//         // Grid
//         if (isGridVisible) {
//           drawGrid(bgCtx, canvas.width, canvas.height);
//         }

//         // Apply zoom/pan and draw
//         ctx.save();
//         ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//         ctx.scale(currentZoom, currentZoom);

//         (objects || []).forEach((obj) => drawObject(ctx, obj));

//         ctx.restore();
//       },
//       [backgroundColor, isGridVisible, currentZoom, drawGrid, drawObject]
//     );

//     // Load whiteboard state from Yjs (memoized)
//     const loadWhiteboardState = useCallback(() => {
//       if (!yWhiteboardRef.current || yWhiteboardRef.current.length === 0) return;

//       try {
//         const state = yWhiteboardRef.current.toArray()[0] || {};

//         if (state.background) setBackgroundColor(state.background);

//         if (Array.isArray(state.objects)) {
//           redrawCanvas(state.objects);
//         }
//       } catch (error) {
//         console.error("Error loading whiteboard state:", error);
//       }
//     }, [redrawCanvas]);

//     // Add object to Yjs document (memoized)
//     const addObject = useCallback(
//       (obj) => {
//         if (!yWhiteboardRef.current || !yDocRef.current) return;

//         setIsLocalDrawing(true);

//         try {
//           yDocRef.current.transact(() => {
//             const currentState = yWhiteboardRef.current.toArray()[0] || {
//               version: "1.0.0",
//               objects: [],
//               background: backgroundColor,
//               createdAt: new Date().toISOString(),
//             };

//             const updatedState = {
//               ...currentState,
//               objects: [...(currentState.objects || []), obj],
//               updatedBy: sessionInfo?.streamerId,
//               updatedAt: new Date().toISOString(),
//             };

//             if (yWhiteboardRef.current.length === 0) {
//               yWhiteboardRef.current.insert(0, [updatedState]);
//             } else {
//               yWhiteboardRef.current.delete(0, 1);
//               yWhiteboardRef.current.insert(0, [updatedState]);
//             }
//           }, "drawing");
//         } catch (error) {
//           console.error("Error adding object:", error);
//         } finally {
//           setIsLocalDrawing(false);
//         }
//       },
//       [backgroundColor, sessionInfo]
//     );

//     // =========================
//     // ✅ Incremental local draw (SMOOTH CURVE)
//     // - quadratic midpoint smoothing
//     // - also supports eraser via destination-out
//     // =========================
//     const drawSmoothStroke = useCallback(
//       (prev, next, strokeType) => {
//         if (!ctxRef.current) return;
//         const ctx = ctxRef.current;

//         ctx.save();
//         ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//         ctx.scale(currentZoom, currentZoom);

//         ctx.lineCap = "round";
//         ctx.lineJoin = "round";
//         ctx.globalAlpha = opacity ?? 1;
//         ctx.lineWidth = (strokeWidth || 2) / currentZoom;

//         const isEraser = strokeType === "eraser";
//         if (isEraser) {
//           ctx.globalCompositeOperation = "destination-out";
//           ctx.strokeStyle = "rgba(0,0,0,1)";
//         } else {
//           ctx.globalCompositeOperation = "source-over";
//           ctx.strokeStyle = color || "#000000";
//         }

//         const mid = { x: (prev.x + next.x) / 2, y: (prev.y + next.y) / 2 };

//         // If this is the first segment, init last midpoint
//         if (!lastLocalMidRef.current) {
//           lastLocalMidRef.current = { x: prev.x, y: prev.y };
//         }

//         // Quadratic curve from lastMid -> mid, control point at prev
//         ctx.beginPath();
//         ctx.moveTo(lastLocalMidRef.current.x, lastLocalMidRef.current.y);
//         ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
//         ctx.stroke();

//         lastLocalMidRef.current = mid;

//         ctx.restore();
//       },
//       [currentZoom, color, strokeWidth, opacity]
//     );

//     // =========================
//     // ✅ Throttled Yjs sync (batch points)
//     // =========================
//     const flushStrokeToYjs = useCallback(
//       (force = false) => {
//         if (!yWhiteboardRef.current || !yDocRef.current) return;

//         const strokeId = currentStrokeIdRef.current;
//         if (!strokeId) return;

//         const buffered = strokeBufferRef.current;
//         if (!force && buffered.length === 0) return;
//         if (buffered.length === 0) return;

//         const pointsToAdd = buffered.slice();
//         strokeBufferRef.current = [];

//         try {
//           yDocRef.current.transact(() => {
//             const currentState = yWhiteboardRef.current.toArray()[0] || {
//               version: "1.0.0",
//               objects: [],
//               background: backgroundColor,
//               createdAt: new Date().toISOString(),
//             };

//             const objects = [...(currentState.objects || [])];

//             // find by id, fallback to last
//             let idx = objects.length - 1;
//             const found = objects.findIndex((o) => o && o.id === strokeId);
//             if (found !== -1) idx = found;

//             const target = objects[idx];
//             if (!target || (target.type !== "pen" && target.type !== "eraser")) return;

//             target.points = [...(target.points || []), ...pointsToAdd];

//             const updatedState = {
//               ...currentState,
//               objects,
//               updatedBy: sessionInfo?.streamerId,
//               updatedAt: new Date().toISOString(),
//             };

//             if (yWhiteboardRef.current.length === 0) {
//               yWhiteboardRef.current.insert(0, [updatedState]);
//             } else {
//               yWhiteboardRef.current.delete(0, 1);
//               yWhiteboardRef.current.insert(0, [updatedState]);
//             }
//           }, "drawing");
//         } catch (error) {
//           console.error("Error flushing stroke points:", error);
//         }
//       },
//       [backgroundColor, sessionInfo]
//     );

//     const scheduleFlush = useCallback(() => {
//       if (flushTimerRef.current) return;
//       flushTimerRef.current = setTimeout(() => {
//         flushTimerRef.current = null;
//         flushStrokeToYjs(false);
//       }, 50);
//     }, [flushStrokeToYjs]);

//     useEffect(() => {
//       return () => {
//         if (flushTimerRef.current) {
//           clearTimeout(flushTimerRef.current);
//           flushTimerRef.current = null;
//         }
//       };
//     }, []);

//     // =========================
//     // ✅ Initialize Yjs document and WebSocket provider
//     // (Important: DO NOT re-init on color/tool changes)
//     // =========================
//     useEffect(() => {
//       if (!sessionId || !wsToken) return;

//       const initYjs = async () => {
//         try {
//           const ydoc = new Y.Doc();
//           yDocRef.current = ydoc;

//           const baseWs = import.meta.env.VITE_WS_URL || "ws://localhost:9090";
//           const url = `${baseWs}/yjs`;

//           const provider = new WebsocketProvider(url, sessionId, ydoc, {
//             WebSocketPolyfill: WebSocket,
//             params: {
//               token: wsToken,
//               isStreamer: true,
//               allowViewersToDraw,
//               roomCode,
//               userId: sessionInfo?.streamerId,
//               userName: sessionInfo?.streamerName,
//             },
//           });

//           yProviderRef.current = provider;

//           const yWhiteboard = ydoc.getArray("whiteboard");
//           yWhiteboardRef.current = yWhiteboard;

//           const ySettings = ydoc.getMap("room_settings");
//           ySettingsRef.current = ySettings;

//           // Awareness initial state
//           provider.awareness.setLocalState({
//             userId: sessionInfo?.streamerId || "streamer",
//             userName: sessionInfo?.streamerName || "Streamer",
//             role: "STREAMER",
//             isStreamer: true,
//             color,
//             tool,
//             cursor: null,
//           });

//           provider.awareness.on("change", () => {
//             const states = Array.from(provider.awareness.getStates().entries());
//             const participantsList = states
//               .map(([clientId, state]) => ({
//                 clientId,
//                 ...state,
//               }))
//               .filter((p) => p.userId);

//             setParticipants(participantsList);
//           });

//           provider.on("sync", (synced) => {
//             setIsConnected(!!synced);
//             if (synced) loadWhiteboardState();
//           });

//           // ✅ Undo manager should track our transact origin ("drawing")
//           yUndoManagerRef.current = new Y.UndoManager(yWhiteboard, {
//             captureTimeout: 150,
//             trackedOrigins: new Set(["drawing"]),
//           });

//           // Local persistence
//           new IndexeddbPersistence(`whiteboard-${sessionId}`, ydoc);
//         } catch (error) {
//           console.error("Failed to initialize Yjs:", error);
//           toast.error("Failed to connect to whiteboard server");
//         }
//       };

//       initYjs();

//       return () => {
//         // flush pending stroke safely before teardown
//         try {
//           flushStrokeToYjs(true);
//         } catch {}

//         if (yProviderRef.current) {
//           try {
//             yProviderRef.current.disconnect();
//             yProviderRef.current.destroy();
//           } catch {}
//         }
//         if (yDocRef.current) {
//           try {
//             yDocRef.current.destroy();
//           } catch {}
//         }
//         yProviderRef.current = null;
//         yDocRef.current = null;
//         yWhiteboardRef.current = null;
//         ySettingsRef.current = null;
//         yUndoManagerRef.current = null;
//       };
//       // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [sessionId, roomCode, wsToken, allowViewersToDraw, sessionInfo, loadWhiteboardState]);

//     // ✅ Keep awareness updated without reconnecting
//     useEffect(() => {
//       const provider = yProviderRef.current;
//       if (!provider) return;

//       try {
//         const prevState = provider.awareness.getLocalState() || {};
//         provider.awareness.setLocalState({
//           ...prevState,
//           userId: sessionInfo?.streamerId || "streamer",
//           userName: sessionInfo?.streamerName || "Streamer",
//           role: "STREAMER",
//           isStreamer: true,
//           color,
//           tool,
//         });
//       } catch {}
//     }, [color, tool, sessionInfo]);

//     // =========================
//     // ✅ Initialize canvas
//     // =========================
//     useEffect(() => {
//       if (!canvasRef.current || !backgroundCanvasRef.current || !containerRef.current) return;

//       const canvas = canvasRef.current;
//       const bgCanvas = backgroundCanvasRef.current;
//       const container = containerRef.current;

//       const resizeCanvas = () => {
//         const containerWidth = container.clientWidth;
//         const containerHeight = container.clientHeight;

//         canvas.width = containerWidth;
//         canvas.height = containerHeight;
//         bgCanvas.width = containerWidth;
//         bgCanvas.height = containerHeight;

//         const ctx = canvas.getContext("2d");
//         const bgCtx = bgCanvas.getContext("2d");

//         ctxRef.current = ctx;
//         bgCtxRef.current = bgCtx;

//         ctx.lineCap = "round";
//         ctx.lineJoin = "round";

//         if (yWhiteboardRef.current) {
//           const state = yWhiteboardRef.current.toArray()[0] || {};
//           redrawCanvas(state.objects || []);
//         }
//       };

//       resizeCanvas();

//       const resizeObserver = new ResizeObserver(() => resizeCanvas());
//       resizeObserver.observe(container);

//       return () => resizeObserver.disconnect();
//     }, [redrawCanvas]);

//     // =========================
//     // ✅ Pointer Events (better than mouse) + coalesced events
//     // =========================
//     const handlePointerDown = useCallback(
//       (e) => {
//         e.preventDefault();
//         if (!canvasRef.current) return;

//         // right click ignore
//         if (e.button === 2) return;

//         // capture pointer so we keep receiving move/up events
//         try {
//           canvasRef.current.setPointerCapture(e.pointerId);
//           pointerIdRef.current = e.pointerId;
//         } catch {}

//         // Pan tool (Alt key or middle mouse)
//         if (tool === "pan" || e.altKey || e.button === 1) {
//           setIsPanning(true);
//           lastPanPointRef.current = { x: e.clientX, y: e.clientY };
//           canvasRef.current.style.cursor = "grabbing";
//           return;
//         }

//         setIsDrawing(true);

//         const p = getTransformedPoint(e);
//         lastPointRef.current = p;
//         lastLocalPointRef.current = p;
//         lastLocalMidRef.current = null;

//         if (tool === "pen" || tool === "eraser") {
//           const strokeId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
//           currentStrokeIdRef.current = strokeId;
//           strokeBufferRef.current = [];

//           addObject({
//             id: strokeId,
//             type: tool,
//             points: [{ x: p.x, y: p.y }],
//             color: tool === "eraser" ? backgroundColor : color,
//             strokeWidth,
//             opacity,
//             timestamp: Date.now(),
//           });

//           // dot for click-without-move
//           drawSmoothStroke(p, { x: p.x + 0.01, y: p.y + 0.01 }, tool);
//         }
//       },
//       [tool, getTransformedPoint, addObject, backgroundColor, color, strokeWidth, opacity, drawSmoothStroke]
//     );

//     const handlePointerMove = useCallback(
//       (e) => {
//         if (!canvasRef.current) return;

//         if (isPanning) {
//           const dx = e.clientX - lastPanPointRef.current.x;
//           const dy = e.clientY - lastPanPointRef.current.y;
//           canvasOffsetRef.current.x += dx;
//           canvasOffsetRef.current.y += dy;
//           lastPanPointRef.current = { x: e.clientX, y: e.clientY };

//           if (yWhiteboardRef.current) {
//             const state = yWhiteboardRef.current.toArray()[0] || {};
//             redrawCanvas(state.objects || []);
//           }
//           return;
//         }

//         if (!isDrawing) return;
//         if (tool !== "pen" && tool !== "eraser") return;

//         // ✅ Use coalesced events (more points under CPU load/recording)
//         const events =
//           typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e];

//         for (const evt of events) {
//           const next = getTransformedPoint(evt);
//           const prev = lastLocalPointRef.current || lastPointRef.current;

//           const dist = prev ? Math.hypot(next.x - prev.x, next.y - prev.y) : 999;

//           // ✅ Lower threshold => more points => curve stays curve (recording ON)
//           const minDist = 0.6; // was 2
//           if (dist < minDist) continue;

//           // ✅ smooth local draw
//           if (prev) drawSmoothStroke(prev, next, tool);

//           // ✅ buffer points (throttled Yjs)
//           strokeBufferRef.current.push(next);
//           scheduleFlush();

//           lastLocalPointRef.current = next;
//           lastPointRef.current = next;
//         }
//       },
//       [isDrawing, isPanning, tool, getTransformedPoint, redrawCanvas, drawSmoothStroke, scheduleFlush]
//     );

//     const endStrokeCleanup = useCallback(() => {
//       // flush final buffered points
//       flushStrokeToYjs(true);

//       currentStrokeIdRef.current = null;
//       strokeBufferRef.current = [];
//       lastLocalPointRef.current = null;
//       lastLocalMidRef.current = null;

//       // release pointer capture
//       if (canvasRef.current && pointerIdRef.current != null) {
//         try {
//           canvasRef.current.releasePointerCapture(pointerIdRef.current);
//         } catch {}
//       }
//       pointerIdRef.current = null;
//     }, [flushStrokeToYjs]);

//     const handlePointerUp = useCallback(() => {
//       setIsDrawing(false);
//       setIsPanning(false);

//       endStrokeCleanup();

//       if (canvasRef.current) {
//         canvasRef.current.style.cursor = tool === "pan" ? "grab" : "crosshair";
//       }
//     }, [tool, endStrokeCleanup]);

//     const handlePointerLeave = useCallback(() => {
//       setIsDrawing(false);
//       setIsPanning(false);
//       endStrokeCleanup();
//     }, [endStrokeCleanup]);

//     // =========================
//     // Wheel Zoom
//     // =========================
//     const handleWheel = useCallback(
//       (e) => {
//         e.preventDefault();
//         if (!canvasRef.current) return;

//         const rect = canvasRef.current.getBoundingClientRect();
//         const mouseX = e.clientX - rect.left;
//         const mouseY = e.clientY - rect.top;

//         const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
//         const newZoom = Math.max(0.5, Math.min(3, currentZoom * scaleFactor));

//         const zoomChange = newZoom / currentZoom;

//         canvasOffsetRef.current.x = mouseX - (mouseX - canvasOffsetRef.current.x) * zoomChange;
//         canvasOffsetRef.current.y = mouseY - (mouseY - canvasOffsetRef.current.y) * zoomChange;

//         setCurrentZoom(newZoom);

//         if (yWhiteboardRef.current) {
//           const state = yWhiteboardRef.current.toArray()[0] || {};
//           redrawCanvas(state.objects || []);
//         }
//       },
//       [currentZoom, redrawCanvas]
//     );

//     // Zoom controls (memoized)
//     const handleZoomIn = useCallback(() => {
//       setCurrentZoom((prev) => Math.min(prev + 0.1, 3));
//       if (yWhiteboardRef.current) {
//         const state = yWhiteboardRef.current.toArray()[0] || {};
//         redrawCanvas(state.objects || []);
//       }
//     }, [redrawCanvas]);

//     const handleZoomOut = useCallback(() => {
//       setCurrentZoom((prev) => Math.max(prev - 0.1, 0.5));
//       if (yWhiteboardRef.current) {
//         const state = yWhiteboardRef.current.toArray()[0] || {};
//         redrawCanvas(state.objects || []);
//       }
//     }, [redrawCanvas]);

//     const handleZoomReset = useCallback(() => {
//       setCurrentZoom(1);
//       canvasOffsetRef.current = { x: 0, y: 0 };

//       if (yWhiteboardRef.current) {
//         const state = yWhiteboardRef.current.toArray()[0] || {};
//         redrawCanvas(state.objects || []);
//       }
//     }, [redrawCanvas]);

//     // Clear whiteboard (memoized)
//     const handleClearWhiteboard = useCallback(() => {
//       if (!yWhiteboardRef.current || !yDocRef.current) return;

//       if (window.confirm("Clear entire whiteboard?")) {
//         const emptyState = {
//           version: "1.0.0",
//           objects: [],
//           background: backgroundColor,
//           clearedAt: new Date().toISOString(),
//           clearedBy: sessionInfo?.streamerId,
//         };

//         yDocRef.current.transact(() => {
//           yWhiteboardRef.current.delete(0, yWhiteboardRef.current.length);
//           yWhiteboardRef.current.insert(0, [emptyState]);
//         }, "drawing");

//         redrawCanvas([]);
//         toast.success("Whiteboard cleared");
//       }
//     }, [backgroundColor, sessionInfo, redrawCanvas]);

//     // Export as image (memoized)
//     const handleExport = useCallback(() => {
//       if (!canvasRef.current || !backgroundCanvasRef.current) return;

//       const canvas = canvasRef.current;
//       const bgCanvas = backgroundCanvasRef.current;

//       const exportCanvas = document.createElement("canvas");
//       exportCanvas.width = canvas.width;
//       exportCanvas.height = canvas.height;

//       const exportCtx = exportCanvas.getContext("2d");
//       exportCtx.drawImage(bgCanvas, 0, 0);
//       exportCtx.drawImage(canvas, 0, 0);

//       const link = document.createElement("a");
//       link.download = `whiteboard-${sessionId}-${Date.now()}.png`;
//       link.href = exportCanvas.toDataURL("image/png");
//       link.click();

//       toast.success("Whiteboard exported");
//     }, [sessionId]);

//     // Undo/Redo (memoized)
//     const handleUndo = useCallback(() => {
//       if (yUndoManagerRef.current) yUndoManagerRef.current.undo();
//     }, []);

//     const handleRedo = useCallback(() => {
//       if (yUndoManagerRef.current) yUndoManagerRef.current.redo();
//     }, []);

//     return (
//       <div
//         ref={containerRef}
//         className={`absolute inset-0 z-20 w-full h-full bg-gray-900 overflow-hidden ${
//           isActive ? "block" : "hidden"
//         }`}
//         onWheel={handleWheel}
//       >
//         {/* Background canvas */}
//         <canvas
//           ref={backgroundCanvasRef}
//           className="absolute top-0 left-0 w-full h-full"
//           style={{ pointerEvents: "none" }}
//         />

//         {/* Main drawing canvas */}
//         <canvas
//           ref={canvasRef}
//           className={`absolute top-0 left-0 w-full h-full ${
//             tool === "pan" ? "cursor-grab" : "cursor-crosshair"
//           }`}
//           style={{ touchAction: "none" }} // ✅ important for pointer events
//           onPointerDown={handlePointerDown}
//           onPointerMove={handlePointerMove}
//           onPointerUp={handlePointerUp}
//           onPointerLeave={handlePointerLeave}
//           onContextMenu={(e) => e.preventDefault()}
//         />

//         {/* Floating Controls - Always Visible */}
//         <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
//           <div className="bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 p-2 flex items-center space-x-2">
//             {/* Connection status */}
//             <div
//               className={`w-2 h-2 rounded-full ${
//                 isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
//               }`}
//             />
//             <span className="text-white text-xs mr-2">
//               {isConnected ? "Connected" : "Disconnected"}
//             </span>

//             {/* Divider */}
//             <div className="w-px h-6 bg-gray-600"></div>

//             {/* Drawing tools */}
//             <div className="flex items-center space-x-1">
//               <button
//                 onClick={() => setTool("pen")}
//                 className={`p-1.5 rounded-lg transition-colors ${
//                   tool === "pen"
//                     ? "bg-blue-600 text-white"
//                     : "bg-gray-700 hover:bg-gray-600 text-gray-300"
//                 }`}
//                 title="Pen"
//               >
//                 <FaPaintBrush className="w-4 h-4" />
//               </button>

//               <button
//                 onClick={() => setTool("eraser")}
//                 className={`p-1.5 rounded-lg transition-colors ${
//                   tool === "eraser"
//                     ? "bg-blue-600 text-white"
//                     : "bg-gray-700 hover:bg-gray-600 text-gray-300"
//                 }`}
//                 title="Eraser"
//               >
//                 <FaEraser className="w-4 h-4" />
//               </button>

//               <button
//                 onClick={() => setTool("line")}
//                 className={`p-1.5 rounded-lg transition-colors ${
//                   tool === "line"
//                     ? "bg-blue-600 text-white"
//                     : "bg-gray-700 hover:bg-gray-600 text-gray-300"
//                 }`}
//                 title="Line"
//               >
//                 <FiMinus className="w-4 h-4" />
//               </button>

//               <button
//                 onClick={() => setTool("rectangle")}
//                 className={`p-1.5 rounded-lg transition-colors ${
//                   tool === "rectangle"
//                     ? "bg-blue-600 text-white"
//                     : "bg-gray-700 hover:bg-gray-600 text-gray-300"
//                 }`}
//                 title="Rectangle"
//               >
//                 <FiSquare className="w-4 h-4" />
//               </button>

//               <button
//                 onClick={() => setTool("circle")}
//                 className={`p-1.5 rounded-lg transition-colors ${
//                   tool === "circle"
//                     ? "bg-blue-600 text-white"
//                     : "bg-gray-700 hover:bg-gray-600 text-gray-300"
//                 }`}
//                 title="Circle"
//               >
//                 <FiCircle className="w-4 h-4" />
//               </button>

//               <button
//                 onClick={() => setTool("pan")}
//                 className={`p-1.5 rounded-lg transition-colors ${
//                   tool === "pan"
//                     ? "bg-blue-600 text-white"
//                     : "bg-gray-700 hover:bg-gray-600 text-gray-300"
//                 }`}
//                 title="Pan (Alt + Drag)"
//               >
//                 <FiMove className="w-4 h-4" />
//               </button>
//             </div>

//             {/* Divider */}
//             <div className="w-px h-6 bg-gray-600"></div>

//             {/* Color picker */}
//             <input
//               type="color"
//               value={color}
//               onChange={(e) => setColor(e.target.value)}
//               className="w-7 h-7 rounded cursor-pointer border border-gray-600"
//               title="Color"
//             />

//             <select
//               value={strokeWidth}
//               onChange={(e) => setStrokeWidth(Number(e.target.value))}
//               className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 w-16"
//               title="Stroke Width"
//             >
//               <option value="1">1px</option>
//               <option value="2">2px</option>
//               <option value="3">3px</option>
//               <option value="5">5px</option>
//               <option value="8">8px</option>
//             </select>

//             <select
//               value={opacity}
//               onChange={(e) => setOpacity(Number(e.target.value))}
//               className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 w-16"
//               title="Opacity"
//             >
//               <option value="1">100%</option>
//               <option value="0.8">80%</option>
//               <option value="0.6">60%</option>
//               <option value="0.4">40%</option>
//             </select>

//             {/* Divider */}
//             <div className="w-px h-6 bg-gray-600"></div>

//             {/* Zoom controls */}
//             <button
//               onClick={handleZoomOut}
//               className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//               title="Zoom Out"
//             >
//               <FiMinusCircle className="w-4 h-4 text-white" />
//             </button>
//             <span className="text-white text-sm min-w-[50px] text-center font-medium">
//               {Math.round(currentZoom * 100)}%
//             </span>
//             <button
//               onClick={handleZoomIn}
//               className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//               title="Zoom In"
//             >
//               <FiPlus className="w-4 h-4 text-white" />
//             </button>
//             <button
//               onClick={handleZoomReset}
//               className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//               title="Reset Zoom"
//             >
//               <FiRefreshCcw className="w-4 h-4 text-white" />
//             </button>

//             {/* Divider */}
//             <div className="w-px h-6 bg-gray-600"></div>

//             {/* Undo/Redo */}
//             <button
//               onClick={handleUndo}
//               className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//               title="Undo"
//             >
//               <FiRefreshCcw className="w-4 h-4 text-white" />
//             </button>
//             <button
//               onClick={handleRedo}
//               className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//               title="Redo"
//             >
//               <FiRefreshCcw className="w-4 h-4 text-white transform scale-x-[-1]" />
//             </button>

//             {/* Clear/Export */}
//             <button
//               onClick={handleClearWhiteboard}
//               className="p-1.5 bg-red-900 hover:bg-red-800 rounded-lg transition-colors"
//               title="Clear Whiteboard"
//             >
//               <FiTrash2 className="w-4 h-4 text-white" />
//             </button>
//             <button
//               onClick={handleExport}
//               className="p-1.5 bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors"
//               title="Export as PNG"
//             >
//               <FiDownload className="w-4 h-4 text-white" />
//             </button>

//             {/* Grid toggle */}
//             <button
//               onClick={() => setIsGridVisible(!isGridVisible)}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 isGridVisible
//                   ? "bg-blue-600 text-white"
//                   : "bg-gray-700 text-gray-300 hover:bg-gray-600"
//               }`}
//               title="Toggle Grid"
//             >
//               <FiSquare className="w-4 h-4" />
//             </button>

//             {/* Divider */}
//             <div className="w-px h-6 bg-gray-600"></div>

//             {/* Close button */}
//             <button
//               onClick={onClose}
//               className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
//               title="Close Whiteboard"
//             >
//               <FiX className="w-4 h-4 text-white" />
//             </button>
//           </div>
//         </div>

//         {/* Bottom Info Bar */}
//         <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded backdrop-blur-sm border border-gray-700">
//           <div className="flex items-center space-x-3">
//             <span>
//               Tool: <span className="font-bold capitalize">{tool}</span>
//             </span>
//             <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
//             <span>
//               Zoom: <span className="font-bold">{Math.round(currentZoom * 100)}%</span>
//             </span>
//             <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
//             <span>
//               Viewers: <span className="font-bold">{participants.length}</span>
//             </span>
//             <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
//             <span>Alt+Click to pan</span>
//           </div>
//         </div>

//         {/* Viewers count in top right */}
//         <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded backdrop-blur-sm border border-gray-700">
//           <div className="flex items-center space-x-2">
//             <span>
//               {participants.length} active {participants.length === 1 ? "viewer" : "viewers"}
//             </span>
//             {participants.map((p) => (
//               <div
//                 key={p.clientId}
//                 className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-medium"
//                 title={`${p.userName || "User"}`}
//               >
//                 {p.userName?.charAt(0) || "U"}
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Panning indicator */}
//         {isPanning && (
//           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-600">
//             <div className="flex items-center space-x-2">
//               <FiMove className="w-4 h-4" />
//               <span>Panning...</span>
//             </div>
//           </div>
//         )}

//         {/* Drawing disabled overlay */}
//         {!allowViewersToDraw && (
//           <div className="absolute bottom-2 right-2 bg-yellow-900/70 text-yellow-200 px-3 py-1.5 rounded-lg text-xs backdrop-blur-sm border border-yellow-600/30">
//             Viewers cannot draw
//           </div>
//         )}
//       </div>
//     );
//   },
//   (prevProps, nextProps) => {
//     if (prevProps.sessionId !== nextProps.sessionId) return false;
//     if (prevProps.roomCode !== nextProps.roomCode) return false;
//     if (prevProps.wsToken !== nextProps.wsToken) return false;
//     if (prevProps.isActive !== nextProps.isActive) return false;
//     if (prevProps.allowViewersToDraw !== nextProps.allowViewersToDraw) return false;
//     if (prevProps.mainScreenMode !== nextProps.mainScreenMode) return false;
//     if (prevProps.compact !== nextProps.compact) return false;

//     if (prevProps.sessionInfo?.streamerId !== nextProps.sessionInfo?.streamerId) return false;
//     if (prevProps.sessionInfo?.streamerName !== nextProps.sessionInfo?.streamerName) return false;

//     return true;
//   }
// );

// StreamerWhiteboard.displayName = "StreamerWhiteboard";

// export default StreamerWhiteboard;











// import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
// import * as Y from 'yjs';
// import { WebsocketProvider } from 'y-websocket';
// import { IndexeddbPersistence } from 'y-indexeddb';

// // Drawing tools
// import {
//   FiPenTool,
//   FiSquare,
//   FiCircle,
//   FiMinus,
//   FiType,
//   FiDelete,
//   FiDownload,
//   FiRefreshCcw,
//   FiTrash2,
//   FiMousePointer,
//   FiMove,
//   FiPlus,
//   FiMinusCircle,
//   FiX
// } from 'react-icons/fi';
// import { FaEraser, FaPaintBrush } from 'react-icons/fa';
// import { toast } from 'react-toastify';

// // ✅ Memoized StreamerWhiteboard component with custom comparison
// const StreamerWhiteboard = memo(({
//   sessionId,
//   roomCode,
//   wsToken,
//   sessionInfo,
//   isActive,
//   onClose,
//   allowViewersToDraw = true,
//   mainScreenMode = false,
//   compact = false
// }) => {
//   // Canvas refs
//   const canvasRef = useRef(null);
//   const backgroundCanvasRef = useRef(null);
//   const ctxRef = useRef(null);
//   const bgCtxRef = useRef(null);
//   const containerRef = useRef(null);

//   // Yjs refs
//   const yDocRef = useRef(null);
//   const yProviderRef = useRef(null);
//   const yWhiteboardRef = useRef(null);
//   const ySettingsRef = useRef(null);
//   const yUndoManagerRef = useRef(null);

//   // State
//   const [isDrawing, setIsDrawing] = useState(false);
//   const [tool, setTool] = useState('pen');
//   const [color, setColor] = useState('#000000');
//   const [strokeWidth, setStrokeWidth] = useState(2);
//   const [opacity, setOpacity] = useState(1);
//   const [currentZoom, setCurrentZoom] = useState(1);
//   const [isConnected, setIsConnected] = useState(false);
//   const [participants, setParticipants] = useState([]);
//   const [isLocalDrawing, setIsLocalDrawing] = useState(false);
//   const [backgroundColor, setBackgroundColor] = useState('#ffffff');
//   const [isGridVisible, setIsGridVisible] = useState(false);
//   const [isPanning, setIsPanning] = useState(false);
//   const [showControls, setShowControls] = useState(!compact);

//   // Canvas state
//   const lastPointRef = useRef({ x: 0, y: 0 });
//   const canvasOffsetRef = useRef({ x: 0, y: 0 });
//   const lastPanPointRef = useRef({ x: 0, y: 0 });

//   // =========================
//   // ✅ Performance refs (smooth drawing during recording)
//   // =========================
//   const currentStrokeIdRef = useRef(null); // active pen/eraser stroke id
//   const strokeBufferRef = useRef([]);      // buffered points for Yjs sync
//   const flushTimerRef = useRef(null);      // throttle timer
//   const lastLocalPointRef = useRef(null);  // last point drawn locally

//   // Draw grid (memoized)
//   const drawGrid = useCallback((ctx, width, height) => {
//     ctx.save();
//     ctx.strokeStyle = '#e0e0e0';
//     ctx.lineWidth = 0.5;
//     ctx.globalAlpha = 0.3;

//     const gridSize = 20;

//     for (let x = 0; x <= width; x += gridSize) {
//       ctx.beginPath();
//       ctx.moveTo(x, 0);
//       ctx.lineTo(x, height);
//       ctx.stroke();
//     }

//     for (let y = 0; y <= height; y += gridSize) {
//       ctx.beginPath();
//       ctx.moveTo(0, y);
//       ctx.lineTo(width, y);
//       ctx.stroke();
//     }

//     ctx.restore();
//   }, []);

//   // Draw individual object (memoized)
//   const drawObject = useCallback((ctx, obj) => {
//     if (!obj) return;

//     ctx.save();
//     ctx.strokeStyle = obj.color || '#000000';
//     ctx.fillStyle = obj.fillColor || 'transparent';
//     ctx.lineWidth = (obj.strokeWidth || 2) / currentZoom;
//     ctx.globalAlpha = obj.opacity ?? 1;

//     switch (obj.type) {
//       case 'pen':
//       case 'pencil': {
//         if (!obj.points || obj.points.length < 1) break;
//         ctx.beginPath();
//         ctx.moveTo(obj.points[0].x, obj.points[0].y);
//         obj.points.forEach(p => ctx.lineTo(p.x, p.y));
//         ctx.stroke();
//         break;
//       }

//       case 'line': {
//         ctx.beginPath();
//         ctx.moveTo(obj.x1, obj.y1);
//         ctx.lineTo(obj.x2, obj.y2);
//         ctx.stroke();
//         break;
//       }

//       case 'rectangle': {
//         if (obj.fillColor) ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
//         ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
//         break;
//       }

//       case 'circle': {
//         ctx.beginPath();
//         ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);
//         if (obj.fillColor) ctx.fill();
//         ctx.stroke();
//         break;
//       }

//       case 'text': {
//         ctx.font = `${obj.fontSize || 16}px Arial`;
//         ctx.fillStyle = obj.color || '#000';
//         ctx.fillText(obj.text || '', obj.x, obj.y);
//         break;
//       }

//       case 'eraser': {
//         if (!obj.points || obj.points.length < 1) break;
//         ctx.save();
//         ctx.globalCompositeOperation = 'destination-out';
//         ctx.beginPath();
//         ctx.moveTo(obj.points[0].x, obj.points[0].y);
//         obj.points.forEach(p => ctx.lineTo(p.x, p.y));
//         ctx.stroke();
//         ctx.restore();
//         break;
//       }

//       default:
//         break;
//     }

//     ctx.restore();
//   }, [currentZoom]);

//   // Redraw canvas from objects (memoized)
//   const redrawCanvas = useCallback((objects) => {
//     if (!ctxRef.current || !bgCtxRef.current || !canvasRef.current) return;

//     const ctx = ctxRef.current;
//     const bgCtx = bgCtxRef.current;
//     const canvas = canvasRef.current;

//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     bgCtx.clearRect(0, 0, canvas.width, canvas.height);

//     // Background
//     bgCtx.fillStyle = backgroundColor;
//     bgCtx.fillRect(0, 0, canvas.width, canvas.height);

//     // Grid
//     if (isGridVisible) {
//       drawGrid(bgCtx, canvas.width, canvas.height);
//     }

//     // Apply zoom/pan and draw
//     ctx.save();
//     ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//     ctx.scale(currentZoom, currentZoom);

//     (objects || []).forEach(obj => drawObject(ctx, obj));

//     ctx.restore();
//   }, [backgroundColor, isGridVisible, currentZoom, drawGrid, drawObject]);

//   // Load whiteboard state from Yjs (memoized)
//   const loadWhiteboardState = useCallback(() => {
//     if (!yWhiteboardRef.current || yWhiteboardRef.current.length === 0) return;

//     try {
//       const state = yWhiteboardRef.current.toArray()[0] || {};

//       if (state.background) setBackgroundColor(state.background);

//       if (Array.isArray(state.objects)) {
//         redrawCanvas(state.objects);
//       }
//     } catch (error) {
//       console.error('Error loading whiteboard state:', error);
//     }
//   }, [redrawCanvas]);

//   // Add object to Yjs document (memoized)
//   const addObject = useCallback((obj) => {
//     if (!yWhiteboardRef.current || !yDocRef.current) return;

//     setIsLocalDrawing(true);

//     try {
//       yDocRef.current.transact(() => {
//         const currentState = yWhiteboardRef.current.toArray()[0] || {
//           version: '1.0.0',
//           objects: [],
//           background: backgroundColor,
//           createdAt: new Date().toISOString()
//         };

//         const updatedState = {
//           ...currentState,
//           objects: [...(currentState.objects || []), obj],
//           updatedBy: sessionInfo?.streamerId,
//           updatedAt: new Date().toISOString()
//         };

//         if (yWhiteboardRef.current.length === 0) {
//           yWhiteboardRef.current.insert(0, [updatedState]);
//         } else {
//           yWhiteboardRef.current.delete(0, 1);
//           yWhiteboardRef.current.insert(0, [updatedState]);
//         }
//       }, 'drawing');
//     } catch (error) {
//       console.error('Error adding object:', error);
//     } finally {
//       setIsLocalDrawing(false);
//     }
//   }, [backgroundColor, sessionInfo]);

//   // =========================
//   // ✅ Incremental local draw (smooth)
//   // =========================
//   const drawStrokeSegment = useCallback((from, to, strokeType) => {
//     if (!ctxRef.current) return;
//     const ctx = ctxRef.current;

//     ctx.save();
//     ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//     ctx.scale(currentZoom, currentZoom);

//     ctx.lineCap = 'round';
//     ctx.lineJoin = 'round';
//     ctx.globalAlpha = opacity ?? 1;
//     ctx.lineWidth = (strokeWidth || 2) / currentZoom;

//     const isEraser = strokeType === 'eraser';
//     if (isEraser) {
//       ctx.globalCompositeOperation = 'destination-out';
//       ctx.strokeStyle = 'rgba(0,0,0,1)';
//     } else {
//       ctx.globalCompositeOperation = 'source-over';
//       ctx.strokeStyle = color || '#000000';
//     }

//     ctx.beginPath();
//     ctx.moveTo(from.x, from.y);
//     ctx.lineTo(to.x, to.y);
//     ctx.stroke();

//     ctx.restore();
//   }, [currentZoom, color, strokeWidth, opacity]);

//   // =========================
//   // ✅ Throttled Yjs sync (batch points)
//   // =========================
//   const flushStrokeToYjs = useCallback((force = false) => {
//     if (!yWhiteboardRef.current || !yDocRef.current) return;

//     const strokeId = currentStrokeIdRef.current;
//     if (!strokeId) return;

//     const buffered = strokeBufferRef.current;
//     if (!force && buffered.length === 0) return;
//     if (buffered.length === 0) return;

//     const pointsToAdd = buffered.slice();
//     strokeBufferRef.current = [];

//     try {
//       yDocRef.current.transact(() => {
//         const currentState = yWhiteboardRef.current.toArray()[0] || {
//           version: '1.0.0',
//           objects: [],
//           background: backgroundColor,
//           createdAt: new Date().toISOString()
//         };

//         const objects = [...(currentState.objects || [])];

//         // find by id, fallback to last
//         let idx = objects.length - 1;
//         const found = objects.findIndex(o => o && o.id === strokeId);
//         if (found !== -1) idx = found;

//         const target = objects[idx];
//         if (!target || (target.type !== 'pen' && target.type !== 'eraser')) return;

//         target.points = [...(target.points || []), ...pointsToAdd];

//         const updatedState = {
//           ...currentState,
//           objects,
//           updatedBy: sessionInfo?.streamerId,
//           updatedAt: new Date().toISOString()
//         };

//         if (yWhiteboardRef.current.length === 0) {
//           yWhiteboardRef.current.insert(0, [updatedState]);
//         } else {
//           yWhiteboardRef.current.delete(0, 1);
//           yWhiteboardRef.current.insert(0, [updatedState]);
//         }
//       }, 'drawing');
//     } catch (error) {
//       console.error('Error flushing stroke points:', error);
//     }
//   }, [backgroundColor, sessionInfo]);

//   const scheduleFlush = useCallback(() => {
//     if (flushTimerRef.current) return;
//     flushTimerRef.current = setTimeout(() => {
//       flushTimerRef.current = null;
//       flushStrokeToYjs(false);
//     }, 50);
//   }, [flushStrokeToYjs]);

//   useEffect(() => {
//     return () => {
//       if (flushTimerRef.current) {
//         clearTimeout(flushTimerRef.current);
//         flushTimerRef.current = null;
//       }
//     };
//   }, []);

//   // Initialize Yjs document and WebSocket provider
//   useEffect(() => {
//     if (!sessionId || !wsToken) return;

//     const initYjs = async () => {
//       try {
//         const ydoc = new Y.Doc();
//         yDocRef.current = ydoc;

//         const baseWs = import.meta.env.VITE_WS_URL || "ws://localhost:9090";
//         const url = `${baseWs}/yjs`;

//         const provider = new WebsocketProvider(
//           url,
//           sessionId,
//           ydoc,
//           {
//             WebSocketPolyfill: WebSocket,
//             params: {
//               token: wsToken,
//               isStreamer: true,
//               allowViewersToDraw,
//               roomCode,
//               userId: sessionInfo?.streamerId,
//               userName: sessionInfo?.streamerName,
//             }
//           }
//         );

//         yProviderRef.current = provider;

//         const yWhiteboard = ydoc.getArray('whiteboard');
//         yWhiteboardRef.current = yWhiteboard;

//         const ySettings = ydoc.getMap('room_settings');
//         ySettingsRef.current = ySettings;

//         provider.awareness.setLocalState({
//           userId: sessionInfo?.streamerId || 'streamer',
//           userName: sessionInfo?.streamerName || 'Streamer',
//           role: 'STREAMER',
//           isStreamer: true,
//           color,
//           tool,
//           cursor: null
//         });

//         provider.awareness.on('change', () => {
//           const states = Array.from(provider.awareness.getStates().entries());
//           const participantsList = states
//             .map(([clientId, state]) => ({
//               clientId,
//               ...state
//             }))
//             .filter(p => p.userId);

//           setParticipants(participantsList);
//         });

//         provider.on('sync', (isSynced) => {
//           setIsConnected(isSynced);
//           if (isSynced) loadWhiteboardState();
//         });

//         yUndoManagerRef.current = new Y.UndoManager(yWhiteboard, {
//           captureTimeout: 100,
//           trackedOrigins: new Set([ydoc.clientID])
//         });

//         new IndexeddbPersistence(`whiteboard-${sessionId}`, ydoc);

//       } catch (error) {
//         console.error('Failed to initialize Yjs:', error);
//         toast.error('Failed to connect to whiteboard server');
//       }
//     };

//     initYjs();

//     return () => {
//       if (yProviderRef.current) {
//         yProviderRef.current.disconnect();
//         yProviderRef.current.destroy();
//       }
//       if (yDocRef.current) {
//         yDocRef.current.destroy();
//       }
//       yProviderRef.current = null;
//       yDocRef.current = null;
//       yWhiteboardRef.current = null;
//       ySettingsRef.current = null;
//       yUndoManagerRef.current = null;
//     };
//   }, [sessionId, roomCode, wsToken, allowViewersToDraw, sessionInfo, color, tool, loadWhiteboardState]);

//   // Initialize canvas
//   useEffect(() => {
//     if (!canvasRef.current || !backgroundCanvasRef.current || !containerRef.current) return;

//     const canvas = canvasRef.current;
//     const bgCanvas = backgroundCanvasRef.current;
//     const container = containerRef.current;

//     const resizeCanvas = () => {
//       const containerWidth = container.clientWidth;
//       const containerHeight = container.clientHeight;

//       canvas.width = containerWidth;
//       canvas.height = containerHeight;
//       bgCanvas.width = containerWidth;
//       bgCanvas.height = containerHeight;

//       const ctx = canvas.getContext('2d');
//       const bgCtx = bgCanvas.getContext('2d');

//       ctxRef.current = ctx;
//       bgCtxRef.current = bgCtx;

//       ctx.lineCap = 'round';
//       ctx.lineJoin = 'round';

//       if (yWhiteboardRef.current) {
//         const state = yWhiteboardRef.current.toArray()[0] || {};
//         redrawCanvas(state.objects || []);
//       }
//     };

//     resizeCanvas();

//     const resizeObserver = new ResizeObserver(() => resizeCanvas());
//     resizeObserver.observe(container);

//     return () => resizeObserver.disconnect();
//   }, [redrawCanvas]);

//   // =========================
//   // ✅ Mouse Events (optimized)
//   // =========================
//   const handleMouseDown = useCallback((e) => {
//     e.preventDefault();
//     if (!canvasRef.current) return;

//     const rect = canvasRef.current.getBoundingClientRect();
//     const scaleX = canvasRef.current.width / rect.width;
//     const scaleY = canvasRef.current.height / rect.height;

//     const x = (e.clientX - rect.left) * scaleX;
//     const y = (e.clientY - rect.top) * scaleY;

//     // Pan tool (Alt key or middle mouse)
//     if (tool === 'pan' || e.altKey || e.button === 1) {
//       setIsPanning(true);
//       lastPanPointRef.current = { x: e.clientX, y: e.clientY };
//       canvasRef.current.style.cursor = 'grabbing';
//       return;
//     }

//     setIsDrawing(true);

//     const transformedX = (x - canvasOffsetRef.current.x) / currentZoom;
//     const transformedY = (y - canvasOffsetRef.current.y) / currentZoom;

//     lastPointRef.current = { x: transformedX, y: transformedY };
//     lastLocalPointRef.current = { x: transformedX, y: transformedY };

//     if (tool === 'pen' || tool === 'eraser') {
//       const strokeId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
//       currentStrokeIdRef.current = strokeId;
//       strokeBufferRef.current = [];

//       addObject({
//         id: strokeId,
//         type: tool,
//         points: [{ x: transformedX, y: transformedY }],
//         color: tool === 'eraser' ? backgroundColor : color,
//         strokeWidth,
//         opacity,
//         timestamp: Date.now()
//       });

//       // dot for click-without-move
//       drawStrokeSegment(
//         { x: transformedX, y: transformedY },
//         { x: transformedX + 0.01, y: transformedY + 0.01 },
//         tool
//       );
//     }
//   }, [tool, currentZoom, addObject, backgroundColor, color, strokeWidth, opacity, drawStrokeSegment]);

//   const handleMouseMove = useCallback((e) => {
//     if (!canvasRef.current) return;

//     if (isPanning) {
//       const dx = e.clientX - lastPanPointRef.current.x;
//       const dy = e.clientY - lastPanPointRef.current.y;
//       canvasOffsetRef.current.x += dx;
//       canvasOffsetRef.current.y += dy;
//       lastPanPointRef.current = { x: e.clientX, y: e.clientY };

//       if (yWhiteboardRef.current) {
//         const state = yWhiteboardRef.current.toArray()[0] || {};
//         redrawCanvas(state.objects || []);
//       }
//       return;
//     }

//     if (!isDrawing) return;
//     if (tool !== 'pen' && tool !== 'eraser') return;

//     const rect = canvasRef.current.getBoundingClientRect();
//     const scaleX = canvasRef.current.width / rect.width;
//     const scaleY = canvasRef.current.height / rect.height;

//     const x = (e.clientX - rect.left) * scaleX;
//     const y = (e.clientY - rect.top) * scaleY;

//     const transformedX = (x - canvasOffsetRef.current.x) / currentZoom;
//     const transformedY = (y - canvasOffsetRef.current.y) / currentZoom;

//     const prev = lastLocalPointRef.current || lastPointRef.current;
//     const next = { x: transformedX, y: transformedY };

//     // skip micro moves
//     const dist = prev ? Math.hypot(next.x - prev.x, next.y - prev.y) : 999;
//     if (dist < 2) return;

//     // ✅ 1) smooth local draw
//     if (prev) drawStrokeSegment(prev, next, tool);

//     // ✅ 2) buffer points (throttled Yjs)
//     strokeBufferRef.current.push(next);
//     scheduleFlush();

//     lastLocalPointRef.current = next;
//     lastPointRef.current = next;
//   }, [isDrawing, isPanning, tool, currentZoom, redrawCanvas, drawStrokeSegment, scheduleFlush]);

//   const handleMouseUp = useCallback(() => {
//     setIsDrawing(false);
//     setIsPanning(false);

//     // ✅ flush final buffered points
//     flushStrokeToYjs(true);

//     currentStrokeIdRef.current = null;
//     strokeBufferRef.current = [];
//     lastLocalPointRef.current = null;

//     if (canvasRef.current) {
//       canvasRef.current.style.cursor = tool === 'pan' ? 'grab' : 'crosshair';
//     }
//   }, [tool, flushStrokeToYjs]);

//   const handleMouseLeave = useCallback(() => {
//     setIsDrawing(false);
//     setIsPanning(false);

//     flushStrokeToYjs(true);
//     currentStrokeIdRef.current = null;
//     strokeBufferRef.current = [];
//     lastLocalPointRef.current = null;
//   }, [flushStrokeToYjs]);

//   // Handle wheel for zoom (memoized)
//   const handleWheel = useCallback((e) => {
//     e.preventDefault();
//     if (!canvasRef.current) return;

//     const rect = canvasRef.current.getBoundingClientRect();
//     const mouseX = e.clientX - rect.left;
//     const mouseY = e.clientY - rect.top;

//     const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
//     const newZoom = Math.max(0.5, Math.min(3, currentZoom * scaleFactor));

//     const zoomChange = newZoom / currentZoom;

//     canvasOffsetRef.current.x = mouseX - (mouseX - canvasOffsetRef.current.x) * zoomChange;
//     canvasOffsetRef.current.y = mouseY - (mouseY - canvasOffsetRef.current.y) * zoomChange;

//     setCurrentZoom(newZoom);

//     if (yWhiteboardRef.current) {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
//       redrawCanvas(state.objects || []);
//     }
//   }, [currentZoom, redrawCanvas]);

//   // Zoom controls (memoized)
//   const handleZoomIn = useCallback(() => {
//     setCurrentZoom(prev => Math.min(prev + 0.1, 3));
//     if (yWhiteboardRef.current) {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
//       redrawCanvas(state.objects || []);
//     }
//   }, [redrawCanvas]);

//   const handleZoomOut = useCallback(() => {
//     setCurrentZoom(prev => Math.max(prev - 0.1, 0.5));
//     if (yWhiteboardRef.current) {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
//       redrawCanvas(state.objects || []);
//     }
//   }, [redrawCanvas]);

//   const handleZoomReset = useCallback(() => {
//     setCurrentZoom(1);
//     canvasOffsetRef.current = { x: 0, y: 0 };

//     if (yWhiteboardRef.current) {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
//       redrawCanvas(state.objects || []);
//     }
//   }, [redrawCanvas]);

//   // Clear whiteboard (memoized)
//   const handleClearWhiteboard = useCallback(() => {
//     if (!yWhiteboardRef.current || !yDocRef.current) return;

//     if (window.confirm('Clear entire whiteboard?')) {
//       const emptyState = {
//         version: '1.0.0',
//         objects: [],
//         background: backgroundColor,
//         clearedAt: new Date().toISOString(),
//         clearedBy: sessionInfo?.streamerId
//       };

//       yDocRef.current.transact(() => {
//         yWhiteboardRef.current.delete(0, yWhiteboardRef.current.length);
//         yWhiteboardRef.current.insert(0, [emptyState]);
//       }, 'drawing');

//       redrawCanvas([]);
//       toast.success('Whiteboard cleared');
//     }
//   }, [backgroundColor, sessionInfo, redrawCanvas]);

//   // Export as image (memoized)
//   const handleExport = useCallback(() => {
//     if (!canvasRef.current || !backgroundCanvasRef.current) return;

//     const canvas = canvasRef.current;
//     const bgCanvas = backgroundCanvasRef.current;

//     const exportCanvas = document.createElement('canvas');
//     exportCanvas.width = canvas.width;
//     exportCanvas.height = canvas.height;

//     const exportCtx = exportCanvas.getContext('2d');

//     exportCtx.drawImage(bgCanvas, 0, 0);
//     exportCtx.drawImage(canvas, 0, 0);

//     const link = document.createElement('a');
//     link.download = `whiteboard-${sessionId}-${Date.now()}.png`;
//     link.href = exportCanvas.toDataURL('image/png');
//     link.click();

//     toast.success('Whiteboard exported');
//   }, [sessionId]);

//   // Undo/Redo (memoized)
//   const handleUndo = useCallback(() => {
//     if (yUndoManagerRef.current) {
//       yUndoManagerRef.current.undo();
//       // state change will sync; optional: loadWhiteboardState();
//     }
//   }, []);

//   const handleRedo = useCallback(() => {
//     if (yUndoManagerRef.current) {
//       yUndoManagerRef.current.redo();
//       // optional: loadWhiteboardState();
//     }
//   }, []);

//   return (
//     <div
//       ref={containerRef}
//       className={`absolute inset-0 z-20 w-full h-full bg-gray-900 overflow-hidden ${
//         isActive ? "block" : "hidden"
//       }`}
//       onWheel={handleWheel}
//     >
//       {/* Background canvas */}
//       <canvas
//         ref={backgroundCanvasRef}
//         className="absolute top-0 left-0 w-full h-full"
//         style={{ pointerEvents: 'none' }}
//       />

//       {/* Main drawing canvas */}
//       <canvas
//         ref={canvasRef}
//         className={`absolute top-0 left-0 w-full h-full ${
//           tool === 'pan' ? 'cursor-grab' : 'cursor-crosshair'
//         }`}
//         onMouseDown={handleMouseDown}
//         onMouseMove={handleMouseMove}
//         onMouseUp={handleMouseUp}
//         onMouseLeave={handleMouseLeave}
//         onContextMenu={(e) => e.preventDefault()}
//       />

//       {/* Floating Controls - Always Visible */}
//       <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
//         <div className="bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 p-2 flex items-center space-x-2">
//           {/* Connection status */}
//           <div className={`w-2 h-2 rounded-full ${
//             isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
//           }`} />
//           <span className="text-white text-xs mr-2">
//             {isConnected ? 'Connected' : 'Disconnected'}
//           </span>

//           {/* Divider */}
//           <div className="w-px h-6 bg-gray-600"></div>

//           {/* Drawing tools */}
//           <div className="flex items-center space-x-1">
//             <button
//               onClick={() => setTool('pen')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'pen' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Pen"
//             >
//               <FaPaintBrush className="w-4 h-4" />
//             </button>

//             <button
//               onClick={() => setTool('eraser')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'eraser' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Eraser"
//             >
//               <FaEraser className="w-4 h-4" />
//             </button>

//             <button
//               onClick={() => setTool('line')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Line"
//             >
//               <FiMinus className="w-4 h-4" />
//             </button>

//             <button
//               onClick={() => setTool('rectangle')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'rectangle' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Rectangle"
//             >
//               <FiSquare className="w-4 h-4" />
//             </button>

//             <button
//               onClick={() => setTool('circle')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'circle' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Circle"
//             >
//               <FiCircle className="w-4 h-4" />
//             </button>

//             <button
//               onClick={() => setTool('pan')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'pan' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Pan (Alt + Drag)"
//             >
//               <FiMove className="w-4 h-4" />
//             </button>
//           </div>

//           {/* Divider */}
//           <div className="w-px h-6 bg-gray-600"></div>

//           {/* Color picker */}
//           <input
//             type="color"
//             value={color}
//             onChange={(e) => setColor(e.target.value)}
//             className="w-7 h-7 rounded cursor-pointer border border-gray-600"
//             title="Color"
//           />

//           <select
//             value={strokeWidth}
//             onChange={(e) => setStrokeWidth(Number(e.target.value))}
//             className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 w-16"
//             title="Stroke Width"
//           >
//             <option value="1">1px</option>
//             <option value="2">2px</option>
//             <option value="3">3px</option>
//             <option value="5">5px</option>
//             <option value="8">8px</option>
//           </select>

//           <select
//             value={opacity}
//             onChange={(e) => setOpacity(Number(e.target.value))}
//             className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 w-16"
//             title="Opacity"
//           >
//             <option value="1">100%</option>
//             <option value="0.8">80%</option>
//             <option value="0.6">60%</option>
//             <option value="0.4">40%</option>
//           </select>

//           {/* Divider */}
//           <div className="w-px h-6 bg-gray-600"></div>

//           {/* Zoom controls */}
//           <button
//             onClick={handleZoomOut}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Zoom Out"
//           >
//             <FiMinusCircle className="w-4 h-4 text-white" />
//           </button>
//           <span className="text-white text-sm min-w-[50px] text-center font-medium">
//             {Math.round(currentZoom * 100)}%
//           </span>
//           <button
//             onClick={handleZoomIn}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Zoom In"
//           >
//             <FiPlus className="w-4 h-4 text-white" />
//           </button>
//           <button
//             onClick={handleZoomReset}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Reset Zoom"
//           >
//             <FiRefreshCcw className="w-4 h-4 text-white" />
//           </button>

//           {/* Divider */}
//           <div className="w-px h-6 bg-gray-600"></div>

//           {/* Undo/Redo */}
//           <button
//             onClick={handleUndo}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Undo"
//           >
//             <FiRefreshCcw className="w-4 h-4 text-white" />
//           </button>
//           <button
//             onClick={handleRedo}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Redo"
//           >
//             <FiRefreshCcw className="w-4 h-4 text-white transform scale-x-[-1]" />
//           </button>

//           {/* Clear/Export */}
//           <button
//             onClick={handleClearWhiteboard}
//             className="p-1.5 bg-red-900 hover:bg-red-800 rounded-lg transition-colors"
//             title="Clear Whiteboard"
//           >
//             <FiTrash2 className="w-4 h-4 text-white" />
//           </button>
//           <button
//             onClick={handleExport}
//             className="p-1.5 bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors"
//             title="Export as PNG"
//           >
//             <FiDownload className="w-4 h-4 text-white" />
//           </button>

//           {/* Grid toggle */}
//           <button
//             onClick={() => setIsGridVisible(!isGridVisible)}
//             className={`p-1.5 rounded-lg transition-colors ${
//               isGridVisible ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
//             }`}
//             title="Toggle Grid"
//           >
//             <FiSquare className="w-4 h-4" />
//           </button>

//           {/* Divider */}
//           <div className="w-px h-6 bg-gray-600"></div>

//           {/* Close button */}
//           <button
//             onClick={onClose}
//             className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
//             title="Close Whiteboard"
//           >
//             <FiX className="w-4 h-4 text-white" />
//           </button>
//         </div>
//       </div>

//       {/* Bottom Info Bar */}
//       <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded backdrop-blur-sm border border-gray-700">
//         <div className="flex items-center space-x-3">
//           <span>Tool: <span className="font-bold capitalize">{tool}</span></span>
//           <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
//           <span>Zoom: <span className="font-bold">{Math.round(currentZoom * 100)}%</span></span>
//           <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
//           <span>Viewers: <span className="font-bold">{participants.length}</span></span>
//           <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
//           <span>Alt+Click to pan</span>
//         </div>
//       </div>

//       {/* Viewers count in top right */}
//       <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded backdrop-blur-sm border border-gray-700">
//         <div className="flex items-center space-x-2">
//           <span>{participants.length} active {participants.length === 1 ? 'viewer' : 'viewers'}</span>
//           {participants.map((p) => (
//             <div
//               key={p.clientId}
//               className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-medium"
//               title={`${p.userName || 'User'}`}
//             >
//               {p.userName?.charAt(0) || 'U'}
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Panning indicator */}
//       {isPanning && (
//         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-600">
//           <div className="flex items-center space-x-2">
//             <FiMove className="w-4 h-4" />
//             <span>Panning...</span>
//           </div>
//         </div>
//       )}

//       {/* Drawing disabled overlay */}
//       {!allowViewersToDraw && (
//         <div className="absolute bottom-2 right-2 bg-yellow-900/70 text-yellow-200 px-3 py-1.5 rounded-lg text-xs backdrop-blur-sm border border-yellow-600/30">
//           Viewers cannot draw
//         </div>
//       )}
//     </div>
//   );
// }, (prevProps, nextProps) => {
//   if (prevProps.sessionId !== nextProps.sessionId) return false;
//   if (prevProps.roomCode !== nextProps.roomCode) return false;
//   if (prevProps.wsToken !== nextProps.wsToken) return false;
//   if (prevProps.isActive !== nextProps.isActive) return false;
//   if (prevProps.allowViewersToDraw !== nextProps.allowViewersToDraw) return false;
//   if (prevProps.mainScreenMode !== nextProps.mainScreenMode) return false;
//   if (prevProps.compact !== nextProps.compact) return false;

//   if (prevProps.sessionInfo?.streamerId !== nextProps.sessionInfo?.streamerId) return false;
//   if (prevProps.sessionInfo?.streamerName !== nextProps.sessionInfo?.streamerName) return false;

//   return true;
// });

// StreamerWhiteboard.displayName = 'StreamerWhiteboard';

// export default StreamerWhiteboard;




//badhya chal rha hai
// import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
// import * as Y from 'yjs';
// import { WebsocketProvider } from 'y-websocket';
// import { IndexeddbPersistence } from 'y-indexeddb';

// // Drawing tools
// import { 
//   FiPenTool, 
//   FiSquare, 
//   FiCircle, 
//   FiMinus, 
//   FiType, 
//   FiDelete,
//   FiDownload,
//   FiRefreshCcw,
//   FiTrash2,
//   FiMousePointer,
//   FiMove,
//   FiPlus,
//   FiMinusCircle,
//   FiX
// } from 'react-icons/fi';
// import { FaEraser, FaPaintBrush } from 'react-icons/fa';
// import { toast } from 'react-toastify';

// // ✅ Memoized StreamerWhiteboard component with custom comparison
// const StreamerWhiteboard = memo(({
//   sessionId,
//   roomCode,
//   wsToken,
//   sessionInfo,
//   isActive,
//   onClose,
//   allowViewersToDraw = true,
//   mainScreenMode = false,
//   compact = false
// }) => {
//   // Canvas refs
//   const canvasRef = useRef(null);
//   const backgroundCanvasRef = useRef(null);
//   const ctxRef = useRef(null);
//   const bgCtxRef = useRef(null);
//   const containerRef = useRef(null);
  
//   // Yjs refs
//   const yDocRef = useRef(null);
//   const yProviderRef = useRef(null);
//   const yWhiteboardRef = useRef(null);
//   const ySettingsRef = useRef(null);
//   const yUndoManagerRef = useRef(null);
  
//   // State
//   const [isDrawing, setIsDrawing] = useState(false);
//   const [tool, setTool] = useState('pen');
//   const [color, setColor] = useState('#000000');
//   const [strokeWidth, setStrokeWidth] = useState(2);
//   const [opacity, setOpacity] = useState(1);
//   const [currentZoom, setCurrentZoom] = useState(1);
//   const [isConnected, setIsConnected] = useState(false);
//   const [participants, setParticipants] = useState([]);
//   const [isLocalDrawing, setIsLocalDrawing] = useState(false);
//   const [backgroundColor, setBackgroundColor] = useState('#ffffff');
//   const [isGridVisible, setIsGridVisible] = useState(false);
//   const [isPanning, setIsPanning] = useState(false);
//   const [showControls, setShowControls] = useState(!compact);
  
//   // Canvas state
//   const lastPointRef = useRef({ x: 0, y: 0 });
//   const canvasOffsetRef = useRef({ x: 0, y: 0 });
//   const lastPanPointRef = useRef({ x: 0, y: 0 });
  
//   // Draw grid (memoized)
//   const drawGrid = useCallback((ctx, width, height) => {
//     ctx.save();
//     ctx.strokeStyle = '#e0e0e0';
//     ctx.lineWidth = 0.5;
//     ctx.globalAlpha = 0.3;
    
//     const gridSize = 20;
    
//     // Vertical lines
//     for (let x = 0; x <= width; x += gridSize) {
//       ctx.beginPath();
//       ctx.moveTo(x, 0);
//       ctx.lineTo(x, height);
//       ctx.stroke();
//     }
    
//     // Horizontal lines
//     for (let y = 0; y <= height; y += gridSize) {
//       ctx.beginPath();
//       ctx.moveTo(0, y);
//       ctx.lineTo(width, y);
//       ctx.stroke();
//     }
    
//     ctx.restore();
//   }, []);
  
//   // Draw individual object (memoized)
//   const drawObject = useCallback((ctx, obj) => {
//     ctx.save();
//     ctx.strokeStyle = obj.color || '#000000';
//     ctx.fillStyle = obj.fillColor || 'transparent';
//     ctx.lineWidth = (obj.strokeWidth || 2) / currentZoom;
//     ctx.globalAlpha = obj.opacity || 1;
    
//     switch (obj.type) {
//       case 'pen':
//       case 'pencil':
//         ctx.beginPath();
//         ctx.moveTo(obj.points[0].x, obj.points[0].y);
//         obj.points.forEach(point => {
//           ctx.lineTo(point.x, point.y);
//         });
//         ctx.stroke();
//         break;
        
//       case 'line':
//         ctx.beginPath();
//         ctx.moveTo(obj.x1, obj.y1);
//         ctx.lineTo(obj.x2, obj.y2);
//         ctx.stroke();
//         break;
        
//       case 'rectangle':
//         if (obj.fillColor) {
//           ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
//         }
//         ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
//         break;
        
//       case 'circle':
//         ctx.beginPath();
//         ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);
//         if (obj.fillColor) {
//           ctx.fill();
//         }
//         ctx.stroke();
//         break;
        
//       case 'text':
//         ctx.font = `${obj.fontSize || 16}px Arial`;
//         ctx.fillStyle = obj.color;
//         ctx.fillText(obj.text, obj.x, obj.y);
//         break;
        
//       case 'eraser':
//         ctx.save();
//         ctx.globalCompositeOperation = 'destination-out';
//         ctx.beginPath();
//         ctx.moveTo(obj.points[0].x, obj.points[0].y);
//         obj.points.forEach(point => {
//           ctx.lineTo(point.x, point.y);
//         });
//         ctx.stroke();
//         ctx.restore();
//         break;
//     }
    
//     ctx.restore();
//   }, [currentZoom]);
  
//   // Redraw canvas from objects (memoized)
//   const redrawCanvas = useCallback((objects) => {
//     if (!ctxRef.current || !bgCtxRef.current) return;
    
//     const ctx = ctxRef.current;
//     const bgCtx = bgCtxRef.current;
//     const canvas = canvasRef.current;
    
//     // Clear canvases
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     bgCtx.clearRect(0, 0, canvas.width, canvas.height);
    
//     // Draw background
//     bgCtx.fillStyle = backgroundColor;
//     bgCtx.fillRect(0, 0, canvas.width, canvas.height);
    
//     // Draw grid if visible
//     if (isGridVisible) {
//       drawGrid(bgCtx, canvas.width, canvas.height);
//     }
    
//     // Apply zoom and pan
//     ctx.save();
//     ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//     ctx.scale(currentZoom, currentZoom);
    
//     // Draw all objects
//     objects.forEach(obj => {
//       drawObject(ctx, obj);
//     });
    
//     ctx.restore();
//   }, [backgroundColor, isGridVisible, currentZoom, drawGrid, drawObject]);
  
//   // Load whiteboard state from Yjs (memoized)
//   const loadWhiteboardState = useCallback(() => {
//     if (!yWhiteboardRef.current || yWhiteboardRef.current.length === 0) return;
    
//     try {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
      
//       // Set background color
//       if (state.background) {
//         setBackgroundColor(state.background);
//       }
      
//       // Load drawings
//       if (state.objects && Array.isArray(state.objects)) {
//         redrawCanvas(state.objects);
//       }
      
//     } catch (error) {
//       console.error('Error loading whiteboard state:', error);
//     }
//   }, [redrawCanvas]);
  
//   // Add object to Yjs document (memoized)
// const addObject = useCallback((obj) => {
//   if (!yWhiteboardRef.current || !yDocRef.current) return;

//   setIsLocalDrawing(true);
  
//   try {
//     // ✅ Use transaction for atomic updates
//     yDocRef.current.transact(() => {
//       const currentState = yWhiteboardRef.current.toArray()[0] || {
//         version: '1.0.0',
//         objects: [],
//         background: backgroundColor,
//         createdAt: new Date().toISOString()
//       };
      
//       const updatedState = {
//         ...currentState,
//         objects: [...(currentState.objects || []), obj],
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString()
//       };
      
//       if (yWhiteboardRef.current.length === 0) {
//         yWhiteboardRef.current.insert(0, [updatedState]);
//       } else {
//         yWhiteboardRef.current.delete(0, 1);
//         yWhiteboardRef.current.insert(0, [updatedState]);
//       }
//     });
//   } catch (error) {
//     console.error('Error adding object:', error);
//   } finally {
//     setIsLocalDrawing(false);
//   }
// }, [backgroundColor, sessionInfo]);
//   // Initialize Yjs document and WebSocket provider
//   useEffect(() => {
//     if (!sessionId || !wsToken) return;
    
//     const initYjs = async () => {
//       try {
//         // Create Yjs document
//         const ydoc = new Y.Doc();
//         yDocRef.current = ydoc;
        
//         // WebSocket URL for Yjs
//         const baseWs = import.meta.env.VITE_WS_URL || "ws://localhost:9090";

//         // ✅ url me sirf /yjs
//         const url = `${baseWs}/yjs`;

//         // ✅ roomName = sessionId
//         const provider = new WebsocketProvider(
//           url,
//           sessionId,
//           ydoc,
//           {
//             WebSocketPolyfill: WebSocket,
//             params: {
//               token: wsToken,
//               isStreamer: true,
//               allowViewersToDraw,
//               roomCode,
//               userId: sessionInfo?.streamerId,
//               userName: sessionInfo?.streamerName,
//             }
//           }
//         );

//         yProviderRef.current = provider;
        
//         // Get or create shared whiteboard array
//         const yWhiteboard = ydoc.getArray('whiteboard');
//         yWhiteboardRef.current = yWhiteboard;
        
//         // Get or create settings map
//         const ySettings = ydoc.getMap('room_settings');
//         ySettingsRef.current = ySettings;
        
//         // Setup awareness
//         provider.awareness.setLocalState({
//           userId: sessionInfo?.streamerId || 'streamer',
//           userName: sessionInfo?.streamerName || 'Streamer',
//           role: 'STREAMER',
//           isStreamer: true,
//           color: color,
//           tool: tool,
//           cursor: null
//         });
        
//         // Listen for awareness updates
//         provider.awareness.on('change', () => {
//           const states = Array.from(provider.awareness.getStates().entries());
//           const participantsList = states
//             .map(([clientId, state]) => ({
//               clientId,
//               ...state
//             }))
//             .filter(p => p.userId);
          
//           setParticipants(participantsList);
//         });
        
//         // Listen for Yjs sync status
//         provider.on('sync', (isSynced) => {
//           setIsConnected(isSynced);
//           if (isSynced) {
//             loadWhiteboardState();
//           }
//         });
        
//         // Setup undo manager
//         yUndoManagerRef.current = new Y.UndoManager(yWhiteboard, {
//           captureTimeout: 100,
//           trackedOrigins: new Set([ydoc.clientID])
//         });
        
//         // Persist to IndexedDB for offline support
//         const indexeddbProvider = new IndexeddbPersistence(
//           `whiteboard-${sessionId}`,
//           ydoc
//         );
        
//       } catch (error) {
//         console.error('Failed to initialize Yjs:', error);
//         toast.error('Failed to connect to whiteboard server');
//       }
//     };
    
//     initYjs();
    
//     return () => {
//       // Cleanup Yjs resources
//       if (yProviderRef.current) {
//         yProviderRef.current.disconnect();
//         yProviderRef.current.destroy();
//       }
//       if (yDocRef.current) {
//         yDocRef.current.destroy();
//       }
//     };
//   }, [sessionId, roomCode, wsToken, allowViewersToDraw, sessionInfo, color, tool, loadWhiteboardState]);
  
//   // Initialize canvas
//   useEffect(() => {
//     if (!canvasRef.current || !backgroundCanvasRef.current || !containerRef.current) return;
    
//     const canvas = canvasRef.current;
//     const bgCanvas = backgroundCanvasRef.current;
//     const container = containerRef.current;
    
//     const resizeCanvas = () => {
//       const containerWidth = container.clientWidth;
//       const containerHeight = container.clientHeight;
      
//       canvas.width = containerWidth;
//       canvas.height = containerHeight;
//       bgCanvas.width = containerWidth;
//       bgCanvas.height = containerHeight;
      
//       // Set contexts
//       const ctx = canvas.getContext('2d');
//       const bgCtx = bgCanvas.getContext('2d');
      
//       ctxRef.current = ctx;
//       bgCtxRef.current = bgCtx;
      
//       // Apply initial styles
//       ctx.lineCap = 'round';
//       ctx.lineJoin = 'round';
      
//       // Redraw after resize
//       if (yWhiteboardRef.current) {
//         const state = yWhiteboardRef.current.toArray()[0] || {};
//         redrawCanvas(state.objects || []);
//       }
//     };
    
//     resizeCanvas();
    
//     const resizeObserver = new ResizeObserver(() => {
//       resizeCanvas();
//     });
    
//     resizeObserver.observe(container);
    
//     return () => {
//       resizeObserver.disconnect();
//     };
//   }, [redrawCanvas]);
  
//   // Handle mouse events for drawing (memoized)
//   const handleMouseDown = useCallback((e) => {
//     e.preventDefault();
    
//     const rect = canvasRef.current.getBoundingClientRect();
//     const scaleX = canvasRef.current.width / rect.width;
//     const scaleY = canvasRef.current.height / rect.height;
    
//     const x = (e.clientX - rect.left) * scaleX;
//     const y = (e.clientY - rect.top) * scaleY;
    
//     // Pan tool (Alt key or middle mouse)
//     if (tool === 'pan' || e.altKey || e.button === 1) {
//       setIsPanning(true);
//       lastPanPointRef.current = { x: e.clientX, y: e.clientY };
//       canvasRef.current.style.cursor = 'grabbing';
//       return;
//     }
    
//     setIsDrawing(true);
    
//     const transformedX = (x - canvasOffsetRef.current.x) / currentZoom;
//     const transformedY = (y - canvasOffsetRef.current.y) / currentZoom;
    
//     lastPointRef.current = { x: transformedX, y: transformedY };
    
//     // Start drawing based on tool
//     if (tool === 'pen' || tool === 'eraser') {
//       const points = [{ x: transformedX, y: transformedY }];
      
//       addObject({
//         type: tool,
//         points,
//         color: tool === 'eraser' ? backgroundColor : color,
//         strokeWidth,
//         opacity,
//         timestamp: Date.now()
//       });
//     }
//   }, [tool, color, strokeWidth, opacity, currentZoom, addObject, backgroundColor]);
  
// const handleMouseMove = useCallback((e) => {
//   if (isPanning) {
//     const dx = e.clientX - lastPanPointRef.current.x;
//     const dy = e.clientY - lastPanPointRef.current.y;
//     canvasOffsetRef.current.x += dx;
//     canvasOffsetRef.current.y += dy;
//     lastPanPointRef.current = { x: e.clientX, y: e.clientY };

//     if (yWhiteboardRef.current) {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
//       redrawCanvas(state.objects || []);
//     }
//     return;
//   }

//   if (!isDrawing || !yWhiteboardRef.current) return;

//   // ✅ Use requestAnimationFrame for smoother performance during recording
//   window.requestAnimationFrame(() => {
//     const rect = canvasRef.current.getBoundingClientRect();
//     const scaleX = canvasRef.current.width / rect.width;
//     const scaleY = canvasRef.current.height / rect.height;

//     const x = (e.clientX - rect.left) * scaleX;
//     const y = (e.clientY - rect.top) * scaleY;

//     const transformedX = (x - canvasOffsetRef.current.x) / currentZoom;
//     const transformedY = (y - canvasOffsetRef.current.y) / currentZoom;

//     const currentState = yWhiteboardRef.current.toArray()[0] || {};
//     const objects = [...(currentState.objects || [])];
//     const lastObject = objects[objects.length - 1];

//     if (lastObject && (lastObject.type === 'pen' || lastObject.type === 'eraser')) {
//       // ✅ Sirf tab point add karein jab mouse actually move hua ho
//       const lastPoint = lastObject.points[lastObject.points.length - 1];
//       const dist = Math.hypot(transformedX - lastPoint.x, transformedY - lastPoint.y);
      
//       if (dist < 2) return; // Bahut chote movement ko skip karein (CPU bachega)

//       lastObject.points.push({ x: transformedX, y: transformedY });

//       const updatedState = {
//         ...currentState,
//         objects,
//         updatedAt: new Date().toISOString()
//       };

//       // ✅ Yjs Transact: Isse networking aur sync background mein efficient ho jata hai
//       yDocRef.current.transact(() => {
//         yWhiteboardRef.current.delete(0, 1);
//         yWhiteboardRef.current.insert(0, [updatedState]);
//       }, 'drawing'); 

//       redrawCanvas(objects);
//     }
//   });
// }, [isDrawing, isPanning, redrawCanvas, currentZoom]);
//   const handleMouseUp = useCallback(() => {
//     setIsDrawing(false);
//     setIsPanning(false);
//     canvasRef.current.style.cursor = tool === 'pan' ? 'grab' : 'crosshair';
//   }, [tool]);
  
//   const handleMouseLeave = useCallback(() => {
//     setIsDrawing(false);
//     setIsPanning(false);
//   }, []);
  
//   // Handle wheel for zoom (memoized)
//   const handleWheel = useCallback((e) => {
//     e.preventDefault();
    
//     const rect = canvasRef.current.getBoundingClientRect();
//     const mouseX = e.clientX - rect.left;
//     const mouseY = e.clientY - rect.top;
    
//     const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
//     const newZoom = Math.max(0.5, Math.min(3, currentZoom * scaleFactor));
    
//     // Adjust offset to zoom towards mouse position
//     const zoomChange = newZoom / currentZoom;
    
//     canvasOffsetRef.current.x = mouseX - (mouseX - canvasOffsetRef.current.x) * zoomChange;
//     canvasOffsetRef.current.y = mouseY - (mouseY - canvasOffsetRef.current.y) * zoomChange;
    
//     setCurrentZoom(newZoom);
    
//     // Redraw with new zoom
//     if (yWhiteboardRef.current) {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
//       redrawCanvas(state.objects || []);
//     }
//   }, [currentZoom, redrawCanvas]);
  
//   // Zoom controls (memoized)
//   const handleZoomIn = useCallback(() => {
//     setCurrentZoom(prev => Math.min(prev + 0.1, 3));
//     if (yWhiteboardRef.current) {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
//       redrawCanvas(state.objects || []);
//     }
//   }, [redrawCanvas]);
  
//   const handleZoomOut = useCallback(() => {
//     setCurrentZoom(prev => Math.max(prev - 0.1, 0.5));
//     if (yWhiteboardRef.current) {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
//       redrawCanvas(state.objects || []);
//     }
//   }, [redrawCanvas]);
  
//   const handleZoomReset = useCallback(() => {
//     setCurrentZoom(1);
//     canvasOffsetRef.current = { x: 0, y: 0 };
    
//     if (yWhiteboardRef.current) {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
//       redrawCanvas(state.objects || []);
//     }
//   }, [redrawCanvas]);
  
//   // Clear whiteboard (memoized)
//   const handleClearWhiteboard = useCallback(() => {
//     if (window.confirm('Clear entire whiteboard?')) {
//       const emptyState = {
//         version: '1.0.0',
//         objects: [],
//         background: backgroundColor,
//         clearedAt: new Date().toISOString(),
//         clearedBy: sessionInfo?.streamerId
//       };
      
//       yWhiteboardRef.current.delete(0, yWhiteboardRef.current.length);
//       yWhiteboardRef.current.insert(0, [emptyState]);
      
//       redrawCanvas([]);
//       toast.success('Whiteboard cleared');
//     }
//   }, [backgroundColor, sessionInfo, redrawCanvas]);
  
//   // Export as image (memoized)
//   const handleExport = useCallback(() => {
//     const canvas = canvasRef.current;
//     const bgCanvas = backgroundCanvasRef.current;
    
//     // Create a combined canvas
//     const exportCanvas = document.createElement('canvas');
//     exportCanvas.width = canvas.width;
//     exportCanvas.height = canvas.height;
    
//     const exportCtx = exportCanvas.getContext('2d');
    
//     // Draw background
//     exportCtx.drawImage(bgCanvas, 0, 0);
    
//     // Draw drawings
//     exportCtx.drawImage(canvas, 0, 0);
    
//     // Download
//     const link = document.createElement('a');
//     link.download = `whiteboard-${sessionId}-${Date.now()}.png`;
//     link.href = exportCanvas.toDataURL('image/png');
//     link.click();
    
//     toast.success('Whiteboard exported');
//   }, [sessionId]);
  
//   // Undo/Redo (memoized)
//   const handleUndo = useCallback(() => {
//     if (yUndoManagerRef.current) {
//       yUndoManagerRef.current.undo();
//     }
//   }, []);
  
//   const handleRedo = useCallback(() => {
//     if (yUndoManagerRef.current) {
//       yUndoManagerRef.current.redo();
//     }
//   }, []);
  
//   return (
//     <div 
//       ref={containerRef}
//       className={`absolute inset-0 z-20 w-full h-full bg-gray-900 overflow-hidden ${
//         isActive ? "block" : "hidden"
//       }`}
//       onWheel={handleWheel}
//     >
//       {/* Background canvas */}
//       <canvas
//         ref={backgroundCanvasRef}
//         className="absolute top-0 left-0 w-full h-full"
//         style={{ pointerEvents: 'none' }}
//       />
      
//       {/* Main drawing canvas */}
//       <canvas
//         ref={canvasRef}
//         className={`absolute top-0 left-0 w-full h-full ${
//           tool === 'pan' ? 'cursor-grab' : 'cursor-crosshair'
//         }`}
//         onMouseDown={handleMouseDown}
//         onMouseMove={handleMouseMove}
//         onMouseUp={handleMouseUp}
//         onMouseLeave={handleMouseLeave}
//         onContextMenu={(e) => e.preventDefault()}
//       />
      
//       {/* Floating Controls - Always Visible */}
//       <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
//         <div className="bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 p-2 flex items-center space-x-2">
//           {/* Connection status */}
//           <div className={`w-2 h-2 rounded-full ${
//             isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
//           }`} />
//           <span className="text-white text-xs mr-2">
//             {isConnected ? 'Connected' : 'Disconnected'}
//           </span>
          
//           {/* Divider */}
//           <div className="w-px h-6 bg-gray-600"></div>
          
//           {/* Drawing tools */}
//           <div className="flex items-center space-x-1">
//             <button
//               onClick={() => setTool('pen')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'pen' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Pen"
//             >
//               <FaPaintBrush className="w-4 h-4" />
//             </button>
            
//             <button
//               onClick={() => setTool('eraser')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'eraser' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Eraser"
//             >
//               <FaEraser className="w-4 h-4" />
//             </button>
            
//             <button
//               onClick={() => setTool('line')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Line"
//             >
//               <FiMinus className="w-4 h-4" />
//             </button>
            
//             <button
//               onClick={() => setTool('rectangle')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'rectangle' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Rectangle"
//             >
//               <FiSquare className="w-4 h-4" />
//             </button>
            
//             <button
//               onClick={() => setTool('circle')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'circle' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Circle"
//             >
//               <FiCircle className="w-4 h-4" />
//             </button>
            
//             <button
//               onClick={() => setTool('pan')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'pan' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Pan (Alt + Drag)"
//             >
//               <FiMove className="w-4 h-4" />
//             </button>
//           </div>
          
//           {/* Divider */}
//           <div className="w-px h-6 bg-gray-600"></div>
          
//           {/* Color picker */}
//           <input
//             type="color"
//             value={color}
//             onChange={(e) => setColor(e.target.value)}
//             className="w-7 h-7 rounded cursor-pointer border border-gray-600"
//             title="Color"
//           />
          
//           <select
//             value={strokeWidth}
//             onChange={(e) => setStrokeWidth(Number(e.target.value))}
//             className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 w-16"
//             title="Stroke Width"
//           >
//             <option value="1">1px</option>
//             <option value="2">2px</option>
//             <option value="3">3px</option>
//             <option value="5">5px</option>
//             <option value="8">8px</option>
//           </select>
          
//           <select
//             value={opacity}
//             onChange={(e) => setOpacity(Number(e.target.value))}
//             className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 w-16"
//             title="Opacity"
//           >
//             <option value="1">100%</option>
//             <option value="0.8">80%</option>
//             <option value="0.6">60%</option>
//             <option value="0.4">40%</option>
//           </select>
          
//           {/* Divider */}
//           <div className="w-px h-6 bg-gray-600"></div>
          
//           {/* Zoom controls */}
//           <button
//             onClick={handleZoomOut}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Zoom Out"
//           >
//             <FiMinusCircle className="w-4 h-4 text-white" />
//           </button>
//           <span className="text-white text-sm min-w-[50px] text-center font-medium">
//             {Math.round(currentZoom * 100)}%
//           </span>
//           <button
//             onClick={handleZoomIn}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Zoom In"
//           >
//             <FiPlus className="w-4 h-4 text-white" />
//           </button>
//           <button
//             onClick={handleZoomReset}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Reset Zoom"
//           >
//             <FiRefreshCcw className="w-4 h-4 text-white" />
//           </button>
          
//           {/* Divider */}
//           <div className="w-px h-6 bg-gray-600"></div>
          
//           {/* Undo/Redo */}
//           <button
//             onClick={handleUndo}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Undo"
//           >
//             <FiRefreshCcw className="w-4 h-4 text-white" />
//           </button>
//           <button
//             onClick={handleRedo}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Redo"
//           >
//             <FiRefreshCcw className="w-4 h-4 text-white transform scale-x-[-1]" />
//           </button>
          
//           {/* Clear/Export */}
//           <button
//             onClick={handleClearWhiteboard}
//             className="p-1.5 bg-red-900 hover:bg-red-800 rounded-lg transition-colors"
//             title="Clear Whiteboard"
//           >
//             <FiTrash2 className="w-4 h-4 text-white" />
//           </button>
//           <button
//             onClick={handleExport}
//             className="p-1.5 bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors"
//             title="Export as PNG"
//           >
//             <FiDownload className="w-4 h-4 text-white" />
//           </button>
          
//           {/* Grid toggle */}
//           <button
//             onClick={() => setIsGridVisible(!isGridVisible)}
//             className={`p-1.5 rounded-lg transition-colors ${
//               isGridVisible ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
//             }`}
//             title="Toggle Grid"
//           >
//             <FiSquare className="w-4 h-4" />
//           </button>
          
//           {/* Divider */}
//           <div className="w-px h-6 bg-gray-600"></div>
          
//           {/* Close button */}
//           <button
//             onClick={onClose}
//             className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
//             title="Close Whiteboard"
//           >
//             <FiX className="w-4 h-4 text-white" />
//           </button>
//         </div>
//       </div>
      
//       {/* Bottom Info Bar */}
//       <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded backdrop-blur-sm border border-gray-700">
//         <div className="flex items-center space-x-3">
//           <span>Tool: <span className="font-bold capitalize">{tool}</span></span>
//           <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
//           <span>Zoom: <span className="font-bold">{Math.round(currentZoom * 100)}%</span></span>
//           <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
//           <span>Viewers: <span className="font-bold">{participants.length}</span></span>
//           <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
//           <span>Alt+Click to pan</span>
//         </div>
//       </div>
      
//       {/* Viewers count in top right */}
//       <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded backdrop-blur-sm border border-gray-700">
//         <div className="flex items-center space-x-2">
//           <span>{participants.length} active {participants.length === 1 ? 'viewer' : 'viewers'}</span>
//           {participants.map((p, i) => (
//             <div
//               key={p.clientId}
//               className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-medium"
//               title={`${p.userName || 'User'}`}
//             >
//               {p.userName?.charAt(0) || 'U'}
//             </div>
//           ))}
//         </div>
//       </div>
      
//       {/* Panning indicator */}
//       {isPanning && (
//         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-600">
//           <div className="flex items-center space-x-2">
//             <FiMove className="w-4 h-4" />
//             <span>Panning...</span>
//           </div>
//         </div>
//       )}
      
//       {/* Drawing disabled overlay */}
//       {!allowViewersToDraw && (
//         <div className="absolute bottom-2 right-2 bg-yellow-900/70 text-yellow-200 px-3 py-1.5 rounded-lg text-xs backdrop-blur-sm border border-yellow-600/30">
//           Viewers cannot draw
//         </div>
//       )}
//     </div>
//   );
// }, (prevProps, nextProps) => {
//   // ✅ Custom comparison function for React.memo
//   // Return true if props are equal (skip re-render), false if they've changed (re-render)
  
//   // Always re-render if these critical props change
//   if (prevProps.sessionId !== nextProps.sessionId) return false;
//   if (prevProps.roomCode !== nextProps.roomCode) return false;
//   if (prevProps.wsToken !== nextProps.wsToken) return false;
//   if (prevProps.isActive !== nextProps.isActive) return false;
//   if (prevProps.allowViewersToDraw !== nextProps.allowViewersToDraw) return false;
//   if (prevProps.mainScreenMode !== nextProps.mainScreenMode) return false;
//   if (prevProps.compact !== nextProps.compact) return false;
  
//   // Check sessionInfo deeply (only specific fields)
//   if (prevProps.sessionInfo?.streamerId !== nextProps.sessionInfo?.streamerId) return false;
//   if (prevProps.sessionInfo?.streamerName !== nextProps.sessionInfo?.streamerName) return false;
  
//   // If all checks pass, props are equal - skip re-render
//   return true;
// });

// // ✅ Set display name for better debugging
// StreamerWhiteboard.displayName = 'StreamerWhiteboard';

// export default StreamerWhiteboard;










// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import * as Y from 'yjs';
// import { WebsocketProvider } from 'y-websocket';
// import { IndexeddbPersistence } from 'y-indexeddb';

// // Drawing tools
// import { 
//   FiPenTool, 
//   FiSquare, 
//   FiCircle, 
//   FiMinus, 
//   FiType, 
//   FiDelete,
//   FiDownload,
//   FiRefreshCcw,
//   FiTrash2,
//   FiMousePointer,
//   FiMove,
//   FiPlus,
//   FiMinusCircle,
//   FiX
// } from 'react-icons/fi';
// import { FaEraser, FaPaintBrush } from 'react-icons/fa';
// import { toast } from 'react-toastify';

// const StreamerWhiteboard = ({
//   sessionId,
//   roomCode,
//   wsToken,
//   sessionInfo,
//   isActive,
//   onClose,
//   allowViewersToDraw = true,
//   mainScreenMode = false,
//   compact = false
// }) => {
//   // Canvas refs
//   const canvasRef = useRef(null);
//   const backgroundCanvasRef = useRef(null);
//   const ctxRef = useRef(null);
//   const bgCtxRef = useRef(null);
//   const containerRef = useRef(null);
  
//   // Yjs refs
//   const yDocRef = useRef(null);
//   const yProviderRef = useRef(null);
//   const yWhiteboardRef = useRef(null);
//   const ySettingsRef = useRef(null);
//   const yUndoManagerRef = useRef(null);
  
//   // State
//   const [isDrawing, setIsDrawing] = useState(false);
//   const [tool, setTool] = useState('pen');
//   const [color, setColor] = useState('#000000');
//   const [strokeWidth, setStrokeWidth] = useState(2);
//   const [opacity, setOpacity] = useState(1);
//   const [currentZoom, setCurrentZoom] = useState(1);
//   const [isConnected, setIsConnected] = useState(false);
//   const [participants, setParticipants] = useState([]);
//   const [isLocalDrawing, setIsLocalDrawing] = useState(false);
//   const [backgroundColor, setBackgroundColor] = useState('#ffffff');
//   const [isGridVisible, setIsGridVisible] = useState(false);
//   const [isPanning, setIsPanning] = useState(false);
//   const [showControls, setShowControls] = useState(!compact);
  
//   // Canvas state
//   const lastPointRef = useRef({ x: 0, y: 0 });
//   const canvasOffsetRef = useRef({ x: 0, y: 0 });
//   const lastPanPointRef = useRef({ x: 0, y: 0 });
  
//   // Initialize Yjs document and WebSocket provider
//   useEffect(() => {
//     if (!sessionId || !wsToken) return;
    
//     const initYjs = async () => {
//       try {
//         // Create Yjs document
//         const ydoc = new Y.Doc();
//         yDocRef.current = ydoc;
        
//         // WebSocket URL for Yjs
//     const baseWs = import.meta.env.VITE_WS_URL || "ws://localhost:9090";

// // ✅ url me sirf /yjs
// const url = `${baseWs}/yjs`;

// // ✅ roomName = sessionId
// const provider = new WebsocketProvider(
//   url,
//   sessionId,
//   ydoc,
//   {
//     WebSocketPolyfill: WebSocket,
//     params: {
//       token: wsToken,
//       isStreamer: true,
//       allowViewersToDraw,
//       roomCode,
//       userId: sessionInfo?.streamerId,
//       userName: sessionInfo?.streamerName,
//     }
//   }
// );

        
//         yProviderRef.current = provider;
        
//         // Get or create shared whiteboard array
//         const yWhiteboard = ydoc.getArray('whiteboard');
//         yWhiteboardRef.current = yWhiteboard;
        
//         // Get or create settings map
//         const ySettings = ydoc.getMap('room_settings');
//         ySettingsRef.current = ySettings;
        
//         // Setup awareness
//         provider.awareness.setLocalState({
//           userId: sessionInfo?.streamerId || 'streamer',
//           userName: sessionInfo?.streamerName || 'Streamer',
//           role: 'STREAMER',
//           isStreamer: true,
//           color: color,
//           tool: tool,
//           cursor: null
//         });
        
//         // Listen for awareness updates
//         provider.awareness.on('change', () => {
//           const states = Array.from(provider.awareness.getStates().entries());
//           const participantsList = states
//             .map(([clientId, state]) => ({
//               clientId,
//               ...state
//             }))
//             .filter(p => p.userId);
          
//           setParticipants(participantsList);
//         });
        
//         // Listen for Yjs sync status
//         provider.on('sync', (isSynced) => {
//           setIsConnected(isSynced);
//           if (isSynced) {
//             loadWhiteboardState();
//           }
//         });
        
//         // Setup undo manager
//         yUndoManagerRef.current = new Y.UndoManager(yWhiteboard, {
//           captureTimeout: 100,
//           trackedOrigins: new Set([ydoc.clientID])
//         });
        
//         // Persist to IndexedDB for offline support
//         const indexeddbProvider = new IndexeddbPersistence(
//           `whiteboard-${sessionId}`,
//           ydoc
//         );
        
//       } catch (error) {
//         console.error('Failed to initialize Yjs:', error);
//         toast.error('Failed to connect to whiteboard server');
//       }
//     };
    
//     initYjs();
    
//     return () => {
//       // Cleanup Yjs resources
//       if (yProviderRef.current) {
//         yProviderRef.current.disconnect();
//         yProviderRef.current.destroy();
//       }
//       if (yDocRef.current) {
//         yDocRef.current.destroy();
//       }
//     };
//   }, [sessionId, roomCode, wsToken, allowViewersToDraw]);
  
//   // Load whiteboard state from Yjs
//   const loadWhiteboardState = useCallback(() => {
//     if (!yWhiteboardRef.current || yWhiteboardRef.current.length === 0) return;
    
//     try {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
      
//       // Set background color
//       if (state.background) {
//         setBackgroundColor(state.background);
//       }
      
//       // Load drawings
//       if (state.objects && Array.isArray(state.objects)) {
//         redrawCanvas(state.objects);
//       }
      
//     } catch (error) {
//       console.error('Error loading whiteboard state:', error);
//     }
//   }, []);
  
//   // Initialize canvas
//   useEffect(() => {
//     if (!canvasRef.current || !backgroundCanvasRef.current || !containerRef.current) return;
    
//     const canvas = canvasRef.current;
//     const bgCanvas = backgroundCanvasRef.current;
//     const container = containerRef.current;
    
//     const resizeCanvas = () => {
//       const containerWidth = container.clientWidth;
//       const containerHeight = container.clientHeight;
      
//       canvas.width = containerWidth;
//       canvas.height = containerHeight;
//       bgCanvas.width = containerWidth;
//       bgCanvas.height = containerHeight;
      
//       // Set contexts
//       const ctx = canvas.getContext('2d');
//       const bgCtx = bgCanvas.getContext('2d');
      
//       ctxRef.current = ctx;
//       bgCtxRef.current = bgCtx;
      
//       // Apply initial styles
//       ctx.lineCap = 'round';
//       ctx.lineJoin = 'round';
      
//       // Redraw after resize
//       if (yWhiteboardRef.current) {
//         const state = yWhiteboardRef.current.toArray()[0] || {};
//         redrawCanvas(state.objects || []);
//       }
//     };
    
//     resizeCanvas();
    
//     const resizeObserver = new ResizeObserver(() => {
//       resizeCanvas();
//     });
    
//     resizeObserver.observe(container);
    
//     return () => {
//       resizeObserver.disconnect();
//     };
//   }, []);
  
//   // Redraw canvas from objects
//   const redrawCanvas = useCallback((objects) => {
//     if (!ctxRef.current || !bgCtxRef.current) return;
    
//     const ctx = ctxRef.current;
//     const bgCtx = bgCtxRef.current;
//     const canvas = canvasRef.current;
    
//     // Clear canvases
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     bgCtx.clearRect(0, 0, canvas.width, canvas.height);
    
//     // Draw background
//     bgCtx.fillStyle = backgroundColor;
//     bgCtx.fillRect(0, 0, canvas.width, canvas.height);
    
//     // Draw grid if visible
//     if (isGridVisible) {
//       drawGrid(bgCtx, canvas.width, canvas.height);
//     }
    
//     // Apply zoom and pan
//     ctx.save();
//     ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//     ctx.scale(currentZoom, currentZoom);
    
//     // Draw all objects
//     objects.forEach(obj => {
//       drawObject(ctx, obj);
//     });
    
//     ctx.restore();
//   }, [backgroundColor, isGridVisible, currentZoom]);
  
//   // Draw grid
//   const drawGrid = (ctx, width, height) => {
//     ctx.save();
//     ctx.strokeStyle = '#e0e0e0';
//     ctx.lineWidth = 0.5;
//     ctx.globalAlpha = 0.3;
    
//     const gridSize = 20;
    
//     // Vertical lines
//     for (let x = 0; x <= width; x += gridSize) {
//       ctx.beginPath();
//       ctx.moveTo(x, 0);
//       ctx.lineTo(x, height);
//       ctx.stroke();
//     }
    
//     // Horizontal lines
//     for (let y = 0; y <= height; y += gridSize) {
//       ctx.beginPath();
//       ctx.moveTo(0, y);
//       ctx.lineTo(width, y);
//       ctx.stroke();
//     }
    
//     ctx.restore();
//   };
  
//   // Draw individual object
//   const drawObject = (ctx, obj) => {
//     ctx.save();
//     ctx.strokeStyle = obj.color || '#000000';
//     ctx.fillStyle = obj.fillColor || 'transparent';
//     ctx.lineWidth = (obj.strokeWidth || 2) / currentZoom;
//     ctx.globalAlpha = obj.opacity || 1;
    
//     switch (obj.type) {
//       case 'pen':
//       case 'pencil':
//         ctx.beginPath();
//         ctx.moveTo(obj.points[0].x, obj.points[0].y);
//         obj.points.forEach(point => {
//           ctx.lineTo(point.x, point.y);
//         });
//         ctx.stroke();
//         break;
        
//       case 'line':
//         ctx.beginPath();
//         ctx.moveTo(obj.x1, obj.y1);
//         ctx.lineTo(obj.x2, obj.y2);
//         ctx.stroke();
//         break;
        
//       case 'rectangle':
//         if (obj.fillColor) {
//           ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
//         }
//         ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
//         break;
        
//       case 'circle':
//         ctx.beginPath();
//         ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);
//         if (obj.fillColor) {
//           ctx.fill();
//         }
//         ctx.stroke();
//         break;
        
//       case 'text':
//         ctx.font = `${obj.fontSize || 16}px Arial`;
//         ctx.fillStyle = obj.color;
//         ctx.fillText(obj.text, obj.x, obj.y);
//         break;
        
//       case 'eraser':
//         ctx.save();
//         ctx.globalCompositeOperation = 'destination-out';
//         ctx.beginPath();
//         ctx.moveTo(obj.points[0].x, obj.points[0].y);
//         obj.points.forEach(point => {
//           ctx.lineTo(point.x, point.y);
//         });
//         ctx.stroke();
//         ctx.restore();
//         break;
//     }
    
//     ctx.restore();
//   };
  
//   // Add object to Yjs document
//   const addObject = useCallback((obj) => {
//     if (!yWhiteboardRef.current) return;
    
//     setIsLocalDrawing(true);
    
//     try {
//       const currentState = yWhiteboardRef.current.toArray()[0] || {
//         version: '1.0.0',
//         objects: [],
//         background: backgroundColor,
//         createdAt: new Date().toISOString()
//       };
      
//       const updatedState = {
//         ...currentState,
//         objects: [...(currentState.objects || []), obj],
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString()
//       };
      
//       // Update Yjs document
//       if (yWhiteboardRef.current.length === 0) {
//         yWhiteboardRef.current.insert(0, [updatedState]);
//       } else {
//         yWhiteboardRef.current.delete(0, 1);
//         yWhiteboardRef.current.insert(0, [updatedState]);
//       }
      
//     } catch (error) {
//       console.error('Error adding object to Yjs:', error);
//     } finally {
//       setIsLocalDrawing(false);
//     }
//   }, [backgroundColor, sessionInfo]);
  
//   // Handle mouse events for drawing
//   const handleMouseDown = useCallback((e) => {
//     e.preventDefault();
    
//     const rect = canvasRef.current.getBoundingClientRect();
//     const scaleX = canvasRef.current.width / rect.width;
//     const scaleY = canvasRef.current.height / rect.height;
    
//     const x = (e.clientX - rect.left) * scaleX;
//     const y = (e.clientY - rect.top) * scaleY;
    
//     // Pan tool (Alt key or middle mouse)
//     if (tool === 'pan' || e.altKey || e.button === 1) {
//       setIsPanning(true);
//       lastPanPointRef.current = { x: e.clientX, y: e.clientY };
//       canvasRef.current.style.cursor = 'grabbing';
//       return;
//     }
    
//     setIsDrawing(true);
    
//     const transformedX = (x - canvasOffsetRef.current.x) / currentZoom;
//     const transformedY = (y - canvasOffsetRef.current.y) / currentZoom;
    
//     lastPointRef.current = { x: transformedX, y: transformedY };
    
//     // Start drawing based on tool
//     if (tool === 'pen' || tool === 'eraser') {
//       const points = [{ x: transformedX, y: transformedY }];
      
//       addObject({
//         type: tool,
//         points,
//         color: tool === 'eraser' ? backgroundColor : color,
//         strokeWidth,
//         opacity,
//         timestamp: Date.now()
//       });
//     }
//   }, [tool, color, strokeWidth, opacity, currentZoom, addObject, backgroundColor]);
  
//   const handleMouseMove = useCallback((e) => {
//     if (isPanning) {
//       // Handle panning
//       const dx = e.clientX - lastPanPointRef.current.x;
//       const dy = e.clientY - lastPanPointRef.current.y;
      
//       canvasOffsetRef.current.x += dx;
//       canvasOffsetRef.current.y += dy;
      
//       lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      
//       // Redraw with new offset
//       if (yWhiteboardRef.current) {
//         const state = yWhiteboardRef.current.toArray()[0] || {};
//         redrawCanvas(state.objects || []);
//       }
      
//       return;
//     }
    
//     if (!isDrawing || !yWhiteboardRef.current) return;
    
//     const rect = canvasRef.current.getBoundingClientRect();
//     const scaleX = canvasRef.current.width / rect.width;
//     const scaleY = canvasRef.current.height / rect.height;
    
//     const x = (e.clientX - rect.left) * scaleX;
//     const y = (e.clientY - rect.top) * scaleY;
    
//     const transformedX = (x - canvasOffsetRef.current.x) / currentZoom;
//     const transformedY = (y - canvasOffsetRef.current.y) / currentZoom;
    
//     const currentState = yWhiteboardRef.current.toArray()[0] || {};
//     const objects = [...(currentState.objects || [])];
//     const lastObject = objects[objects.length - 1];
    
//     if (lastObject && (lastObject.type === 'pen' || lastObject.type === 'eraser')) {
//       // Continue drawing
//       lastObject.points.push({ x: transformedX, y: transformedY });
      
//       const updatedState = {
//         ...currentState,
//         objects,
//         updatedAt: new Date().toISOString()
//       };
      
//       yWhiteboardRef.current.delete(0, 1);
//       yWhiteboardRef.current.insert(0, [updatedState]);
      
//       redrawCanvas(objects);
//     }
//   }, [isDrawing, isPanning, redrawCanvas, currentZoom]);
  
//   const handleMouseUp = useCallback(() => {
//     setIsDrawing(false);
//     setIsPanning(false);
//     canvasRef.current.style.cursor = tool === 'pan' ? 'grab' : 'crosshair';
//   }, [tool]);
  
//   const handleMouseLeave = useCallback(() => {
//     setIsDrawing(false);
//     setIsPanning(false);
//   }, []);
  
//   // Handle wheel for zoom
//   const handleWheel = useCallback((e) => {
//     e.preventDefault();
    
//     const rect = canvasRef.current.getBoundingClientRect();
//     const mouseX = e.clientX - rect.left;
//     const mouseY = e.clientY - rect.top;
    
//     const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
//     const newZoom = Math.max(0.5, Math.min(3, currentZoom * scaleFactor));
    
//     // Adjust offset to zoom towards mouse position
//     const zoomChange = newZoom / currentZoom;
    
//     canvasOffsetRef.current.x = mouseX - (mouseX - canvasOffsetRef.current.x) * zoomChange;
//     canvasOffsetRef.current.y = mouseY - (mouseY - canvasOffsetRef.current.y) * zoomChange;
    
//     setCurrentZoom(newZoom);
    
//     // Redraw with new zoom
//     if (yWhiteboardRef.current) {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
//       redrawCanvas(state.objects || []);
//     }
//   }, [currentZoom, redrawCanvas]);
  
//   // Zoom controls
//   const handleZoomIn = useCallback(() => {
//     setCurrentZoom(prev => Math.min(prev + 0.1, 3));
//     if (yWhiteboardRef.current) {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
//       redrawCanvas(state.objects || []);
//     }
//   }, [redrawCanvas]);
  
//   const handleZoomOut = useCallback(() => {
//     setCurrentZoom(prev => Math.max(prev - 0.1, 0.5));
//     if (yWhiteboardRef.current) {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
//       redrawCanvas(state.objects || []);
//     }
//   }, [redrawCanvas]);
  
//   const handleZoomReset = useCallback(() => {
//     setCurrentZoom(1);
//     canvasOffsetRef.current = { x: 0, y: 0 };
    
//     if (yWhiteboardRef.current) {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
//       redrawCanvas(state.objects || []);
//     }
//   }, [redrawCanvas]);
  
//   // Clear whiteboard
//   const handleClearWhiteboard = useCallback(() => {
//     if (window.confirm('Clear entire whiteboard?')) {
//       const emptyState = {
//         version: '1.0.0',
//         objects: [],
//         background: backgroundColor,
//         clearedAt: new Date().toISOString(),
//         clearedBy: sessionInfo?.streamerId
//       };
      
//       yWhiteboardRef.current.delete(0, yWhiteboardRef.current.length);
//       yWhiteboardRef.current.insert(0, [emptyState]);
      
//       redrawCanvas([]);
//       toast.success('Whiteboard cleared');
//     }
//   }, [backgroundColor, sessionInfo, redrawCanvas]);
  
//   // Export as image
//   const handleExport = useCallback(() => {
//     const canvas = canvasRef.current;
//     const bgCanvas = backgroundCanvasRef.current;
    
//     // Create a combined canvas
//     const exportCanvas = document.createElement('canvas');
//     exportCanvas.width = canvas.width;
//     exportCanvas.height = canvas.height;
    
//     const exportCtx = exportCanvas.getContext('2d');
    
//     // Draw background
//     exportCtx.drawImage(bgCanvas, 0, 0);
    
//     // Draw drawings
//     exportCtx.drawImage(canvas, 0, 0);
    
//     // Download
//     const link = document.createElement('a');
//     link.download = `whiteboard-${sessionId}-${Date.now()}.png`;
//     link.href = exportCanvas.toDataURL('image/png');
//     link.click();
    
//     toast.success('Whiteboard exported');
//   }, [sessionId]);
  
//   // Undo/Redo
//   const handleUndo = useCallback(() => {
//     if (yUndoManagerRef.current) {
//       yUndoManagerRef.current.undo();
//     }
//   }, []);
  
//   const handleRedo = useCallback(() => {
//     if (yUndoManagerRef.current) {
//       yUndoManagerRef.current.redo();
//     }
//   }, []);
  
//   return (
//     <div 
//       ref={containerRef}
//       className="relative w-full h-full bg-gray-900 overflow-hidden"
//       onWheel={handleWheel}
//     >
//       {/* Background canvas */}
//       <canvas
//         ref={backgroundCanvasRef}
//         className="absolute top-0 left-0 w-full h-full"
//         style={{ pointerEvents: 'none' }}
//       />
      
//       {/* Main drawing canvas */}
//       <canvas
//         ref={canvasRef}
//         className={`absolute top-0 left-0 w-full h-full ${
//           tool === 'pan' ? 'cursor-grab' : 'cursor-crosshair'
//         }`}
//         onMouseDown={handleMouseDown}
//         onMouseMove={handleMouseMove}
//         onMouseUp={handleMouseUp}
//         onMouseLeave={handleMouseLeave}
//         onContextMenu={(e) => e.preventDefault()}
//       />
      
//       {/* Floating Controls - Always Visible */}
//       <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
//         <div className="bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 p-2 flex items-center space-x-2">
//           {/* Connection status */}
//           <div className={`w-2 h-2 rounded-full ${
//             isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
//           }`} />
//           <span className="text-white text-xs mr-2">
//             {isConnected ? 'Connected' : 'Disconnected'}
//           </span>
          
//           {/* Divider */}
//           <div className="w-px h-6 bg-gray-600"></div>
          
//           {/* Drawing tools */}
//           <div className="flex items-center space-x-1">
//             <button
//               onClick={() => setTool('pen')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'pen' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Pen"
//             >
//               <FaPaintBrush className="w-4 h-4" />
//             </button>
            
//             <button
//               onClick={() => setTool('eraser')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'eraser' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Eraser"
//             >
//               <FaEraser className="w-4 h-4" />
//             </button>
            
//             <button
//               onClick={() => setTool('line')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Line"
//             >
//               <FiMinus className="w-4 h-4" />
//             </button>
            
//             <button
//               onClick={() => setTool('rectangle')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'rectangle' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Rectangle"
//             >
//               <FiSquare className="w-4 h-4" />
//             </button>
            
//             <button
//               onClick={() => setTool('circle')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'circle' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Circle"
//             >
//               <FiCircle className="w-4 h-4" />
//             </button>
            
//             <button
//               onClick={() => setTool('pan')}
//               className={`p-1.5 rounded-lg transition-colors ${
//                 tool === 'pan' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
//               }`}
//               title="Pan (Alt + Drag)"
//             >
//               <FiMove className="w-4 h-4" />
//             </button>
//           </div>
          
//           {/* Divider */}
//           <div className="w-px h-6 bg-gray-600"></div>
          
//           {/* Color picker */}
//           <input
//             type="color"
//             value={color}
//             onChange={(e) => setColor(e.target.value)}
//             className="w-7 h-7 rounded cursor-pointer border border-gray-600"
//             title="Color"
//           />
          
//           <select
//             value={strokeWidth}
//             onChange={(e) => setStrokeWidth(Number(e.target.value))}
//             className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 w-16"
//             title="Stroke Width"
//           >
//             <option value="1">1px</option>
//             <option value="2">2px</option>
//             <option value="3">3px</option>
//             <option value="5">5px</option>
//             <option value="8">8px</option>
//           </select>
          
//           <select
//             value={opacity}
//             onChange={(e) => setOpacity(Number(e.target.value))}
//             className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 w-16"
//             title="Opacity"
//           >
//             <option value="1">100%</option>
//             <option value="0.8">80%</option>
//             <option value="0.6">60%</option>
//             <option value="0.4">40%</option>
//           </select>
          
//           {/* Divider */}
//           <div className="w-px h-6 bg-gray-600"></div>
          
//           {/* Zoom controls */}
//           <button
//             onClick={handleZoomOut}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Zoom Out"
//           >
//             <FiMinusCircle className="w-4 h-4 text-white" />
//           </button>
//           <span className="text-white text-sm min-w-[50px] text-center font-medium">
//             {Math.round(currentZoom * 100)}%
//           </span>
//           <button
//             onClick={handleZoomIn}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Zoom In"
//           >
//             <FiPlus className="w-4 h-4 text-white" />
//           </button>
//           <button
//             onClick={handleZoomReset}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Reset Zoom"
//           >
//             <FiRefreshCcw className="w-4 h-4 text-white" />
//           </button>
          
//           {/* Divider */}
//           <div className="w-px h-6 bg-gray-600"></div>
          
//           {/* Undo/Redo */}
//           <button
//             onClick={handleUndo}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Undo"
//           >
//             <FiRefreshCcw className="w-4 h-4 text-white" />
//           </button>
//           <button
//             onClick={handleRedo}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Redo"
//           >
//             <FiRefreshCcw className="w-4 h-4 text-white transform scale-x-[-1]" />
//           </button>
          
//           {/* Clear/Export */}
//           <button
//             onClick={handleClearWhiteboard}
//             className="p-1.5 bg-red-900 hover:bg-red-800 rounded-lg transition-colors"
//             title="Clear Whiteboard"
//           >
//             <FiTrash2 className="w-4 h-4 text-white" />
//           </button>
//           <button
//             onClick={handleExport}
//             className="p-1.5 bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors"
//             title="Export as PNG"
//           >
//             <FiDownload className="w-4 h-4 text-white" />
//           </button>
          
//           {/* Grid toggle */}
//           <button
//             onClick={() => setIsGridVisible(!isGridVisible)}
//             className={`p-1.5 rounded-lg transition-colors ${
//               isGridVisible ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
//             }`}
//             title="Toggle Grid"
//           >
//             <FiSquare className="w-4 h-4" />
//           </button>
          
//           {/* Divider */}
//           <div className="w-px h-6 bg-gray-600"></div>
          
//           {/* Close button */}
//           <button
//             onClick={onClose}
//             className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
//             title="Close Whiteboard"
//           >
//             <FiX className="w-4 h-4 text-white" />
//           </button>
//         </div>
//       </div>
      
//       {/* Bottom Info Bar */}
//       <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded backdrop-blur-sm border border-gray-700">
//         <div className="flex items-center space-x-3">
//           <span>Tool: <span className="font-bold capitalize">{tool}</span></span>
//           <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
//           <span>Zoom: <span className="font-bold">{Math.round(currentZoom * 100)}%</span></span>
//           <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
//           <span>Viewers: <span className="font-bold">{participants.length}</span></span>
//           <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
//           <span>Alt+Click to pan</span>
//         </div>
//       </div>
      
//       {/* Viewers count in top right */}
//       <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded backdrop-blur-sm border border-gray-700">
//         <div className="flex items-center space-x-2">
//           <span>{participants.length} active {participants.length === 1 ? 'viewer' : 'viewers'}</span>
//           {participants.map((p, i) => (
//             <div
//               key={p.clientId}
//               className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-medium"
//               title={`${p.userName || 'User'}`}
//             >
//               {p.userName?.charAt(0) || 'U'}
//             </div>
//           ))}
//         </div>
//       </div>
      
//       {/* Panning indicator */}
//       {isPanning && (
//         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-600">
//           <div className="flex items-center space-x-2">
//             <FiMove className="w-4 h-4" />
//             <span>Panning...</span>
//           </div>
//         </div>
//       )}
      
//       {/* Drawing disabled overlay */}
//       {!allowViewersToDraw && (
//         <div className="absolute bottom-2 right-2 bg-yellow-900/70 text-yellow-200 px-3 py-1.5 rounded-lg text-xs backdrop-blur-sm border border-yellow-600/30">
//           Viewers cannot draw
//         </div>
//       )}
//     </div>
//   );
// };

// export default StreamerWhiteboard;



// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import * as Y from 'yjs';
// import { WebsocketProvider } from 'y-websocket';
// import { IndexeddbPersistence } from 'y-indexeddb';
// import * as awarenessProtocol from 'y-protocols/awareness';

// // Drawing tools
// import { 
//   FiPenTool, 
//   FiSquare, 
//   FiCircle, 
//   FiMinus, 
//   FiType, 
//   FiDelete,
//   FiDownload,
//   FiRefreshCcw,
//   FiTrash2,
//   FiMousePointer,
//   FiMove,
//   FiPlus,
//   FiMinusCircle
// } from 'react-icons/fi';
// import { FaEraser, FaPaintBrush, FaFillDrip } from 'react-icons/fa';
// import { toast } from 'react-toastify';

// const StreamerWhiteboard = ({
//   sessionId,
//   roomCode,
//   wsToken,
//   sessionInfo,
//   isActive,
//   onClose,
//   allowViewersToDraw = true,
//   mainScreenMode = false,
//   compact = false
// }) => {
//   // Canvas refs
//   const canvasRef = useRef(null);
//   const backgroundCanvasRef = useRef(null);
//   const ctxRef = useRef(null);
//   const bgCtxRef = useRef(null);
  
//   // Yjs refs
//   const yDocRef = useRef(null);
//   const yProviderRef = useRef(null);
//   const yWhiteboardRef = useRef(null);
//   const ySettingsRef = useRef(null);
//   const yUndoManagerRef = useRef(null);
  
//   // State
//   const [isDrawing, setIsDrawing] = useState(false);
//   const [tool, setTool] = useState('pen'); // pen, eraser, rectangle, circle, line, text
//   const [color, setColor] = useState('#000000');
//   const [strokeWidth, setStrokeWidth] = useState(2);
//   const [opacity, setOpacity] = useState(1);
//   const [currentZoom, setCurrentZoom] = useState(1);
//   const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
//   const [isConnected, setIsConnected] = useState(false);
//   const [participants, setParticipants] = useState([]);
//   const [isLocalDrawing, setIsLocalDrawing] = useState(false);
//   const [history, setHistory] = useState([]);
//   const [historyIndex, setHistoryIndex] = useState(-1);
//   const [backgroundColor, setBackgroundColor] = useState('#ffffff');
//   const [isGridVisible, setIsGridVisible] = useState(false);
  
//   // Canvas state
//   const lastPointRef = useRef({ x: 0, y: 0 });
//   const isPanningRef = useRef(false);
//   const panStartRef = useRef({ x: 0, y: 0 });
//   const canvasOffsetRef = useRef({ x: 0, y: 0 });
  
//   // Initialize Yjs document and WebSocket provider
//   useEffect(() => {
//     if (!sessionId || !wsToken) return;
    
//     const initYjs = async () => {
//       try {
//         // Create Yjs document
//         const ydoc = new Y.Doc();
//         yDocRef.current = ydoc;
        
//         // WebSocket URL for Yjs
//         const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:9090'}/yjs/${sessionId}?token=${wsToken}&isStreamer=true&allowViewersToDraw=${allowViewersToDraw}&roomCode=${roomCode}`;
        
//         // Create WebSocket provider
//         const provider = new WebsocketProvider(
//           wsUrl,
//           sessionId,
//           ydoc,
//           { WebSocketPolyfill: WebSocket }
//         );
        
//         yProviderRef.current = provider;
        
//         // Get or create shared whiteboard array
//         const yWhiteboard = ydoc.getArray('whiteboard');
//         yWhiteboardRef.current = yWhiteboard;
        
//         // Get or create settings map
//         const ySettings = ydoc.getMap('room_settings');
//         ySettingsRef.current = ySettings;
        
//         // Setup awareness
//         provider.awareness.setLocalState({
//           userId: sessionInfo?.streamerId || 'streamer',
//           userName: sessionInfo?.streamerName || 'Streamer',
//           role: 'STREAMER',
//           isStreamer: true,
//           color: color,
//           tool: tool,
//           cursor: null
//         });
        
//         // Listen for awareness updates
//         provider.awareness.on('change', () => {
//           const states = Array.from(provider.awareness.getStates().entries());
//           const participantsList = states
//             .map(([clientId, state]) => ({
//               clientId,
//               ...state
//             }))
//             .filter(p => p.userId);
          
//           setParticipants(participantsList);
//         });
        
//         // Listen for Yjs sync status
//         provider.on('sync', (isSynced) => {
//           setIsConnected(isSynced);
//           if (isSynced) {
//             loadWhiteboardState();
//           }
//         });
        
//         // Setup undo manager
//         yUndoManagerRef.current = new Y.UndoManager(yWhiteboard, {
//           captureTimeout: 100,
//           trackedOrigins: new Set([ydoc.clientID])
//         });
        
//         // Persist to IndexedDB for offline support
//         const indexeddbProvider = new IndexeddbPersistence(
//           `whiteboard-${sessionId}`,
//           ydoc
//         );
        
//       } catch (error) {
//         console.error('Failed to initialize Yjs:', error);
//         toast.error('Failed to connect to whiteboard server');
//       }
//     };
    
//     initYjs();
    
//     return () => {
//       // Cleanup Yjs resources
//       if (yProviderRef.current) {
//         yProviderRef.current.disconnect();
//         yProviderRef.current.destroy();
//       }
//       if (yDocRef.current) {
//         yDocRef.current.destroy();
//       }
//     };
//   }, [sessionId, roomCode, wsToken, allowViewersToDraw]);
  
//   // Load whiteboard state from Yjs
//   const loadWhiteboardState = useCallback(() => {
//     if (!yWhiteboardRef.current || yWhiteboardRef.current.length === 0) return;
    
//     try {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
      
//       // Set background color
//       if (state.background) {
//         setBackgroundColor(state.background);
//       }
      
//       // Load drawings
//       if (state.objects && Array.isArray(state.objects)) {
//         redrawCanvas(state.objects);
//       }
      
//     } catch (error) {
//       console.error('Error loading whiteboard state:', error);
//     }
//   }, []);
  
//   // Initialize canvas
//   useEffect(() => {
//     if (!canvasRef.current || !backgroundCanvasRef.current) return;
    
//     const canvas = canvasRef.current;
//     const bgCanvas = backgroundCanvasRef.current;
//     const container = canvas.parentElement;
    
//     // Set canvas dimensions
//     const resizeCanvas = () => {
//       const containerWidth = container.clientWidth;
//       const containerHeight = container.clientHeight;
      
//       canvas.width = containerWidth;
//       canvas.height = containerHeight;
//       bgCanvas.width = containerWidth;
//       bgCanvas.height = containerHeight;
      
//       setCanvasDimensions({ width: containerWidth, height: containerHeight });
      
//       // Set contexts
//       const ctx = canvas.getContext('2d');
//       const bgCtx = bgCanvas.getContext('2d');
      
//       ctxRef.current = ctx;
//       bgCtxRef.current = bgCtx;
      
//       // Apply initial styles
//       ctx.lineCap = 'round';
//       ctx.lineJoin = 'round';
      
//       // Redraw after resize
//       if (yWhiteboardRef.current) {
//         const state = yWhiteboardRef.current.toArray()[0] || {};
//         redrawCanvas(state.objects || []);
//       }
//     };
    
//     resizeCanvas();
//     window.addEventListener('resize', resizeCanvas);
    
//     return () => window.removeEventListener('resize', resizeCanvas);
//   }, []);
  
//   // Redraw canvas from objects
//   const redrawCanvas = useCallback((objects) => {
//     if (!ctxRef.current || !bgCtxRef.current) return;
    
//     const ctx = ctxRef.current;
//     const bgCtx = bgCtxRef.current;
//     const canvas = canvasRef.current;
    
//     // Clear canvases
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     bgCtx.clearRect(0, 0, canvas.width, canvas.height);
    
//     // Draw background
//     bgCtx.fillStyle = backgroundColor;
//     bgCtx.fillRect(0, 0, canvas.width, canvas.height);
    
//     // Draw grid if visible
//     if (isGridVisible) {
//       drawGrid(bgCtx, canvas.width, canvas.height);
//     }
    
//     // Apply zoom and pan
//     ctx.save();
//     ctx.translate(canvasOffsetRef.current.x, canvasOffsetRef.current.y);
//     ctx.scale(currentZoom, currentZoom);
    
//     // Draw all objects
//     objects.forEach(obj => {
//       drawObject(ctx, obj);
//     });
    
//     ctx.restore();
//   }, [backgroundColor, isGridVisible, currentZoom]);
  
//   // Draw individual object
//   const drawObject = (ctx, obj) => {
//     ctx.save();
//     ctx.strokeStyle = obj.color || '#000000';
//     ctx.fillStyle = obj.fillColor || 'transparent';
//     ctx.lineWidth = (obj.strokeWidth || 2) / currentZoom;
//     ctx.globalAlpha = obj.opacity || 1;
    
//     switch (obj.type) {
//       case 'pen':
//       case 'pencil':
//         ctx.beginPath();
//         ctx.moveTo(obj.points[0].x, obj.points[0].y);
//         obj.points.forEach(point => {
//           ctx.lineTo(point.x, point.y);
//         });
//         ctx.stroke();
//         break;
        
//       case 'line':
//         ctx.beginPath();
//         ctx.moveTo(obj.x1, obj.y1);
//         ctx.lineTo(obj.x2, obj.y2);
//         ctx.stroke();
//         break;
        
//       case 'rectangle':
//         if (obj.fillColor) {
//           ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
//         }
//         ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
//         break;
        
//       case 'circle':
//         ctx.beginPath();
//         ctx.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);
//         if (obj.fillColor) {
//           ctx.fill();
//         }
//         ctx.stroke();
//         break;
        
//       case 'text':
//         ctx.font = `${obj.fontSize || 16}px Arial`;
//         ctx.fillStyle = obj.color;
//         ctx.fillText(obj.text, obj.x, obj.y);
//         break;
        
//       case 'eraser':
//         ctx.save();
//         ctx.globalCompositeOperation = 'destination-out';
//         ctx.beginPath();
//         ctx.moveTo(obj.points[0].x, obj.points[0].y);
//         obj.points.forEach(point => {
//           ctx.lineTo(point.x, point.y);
//         });
//         ctx.stroke();
//         ctx.restore();
//         break;
//     }
    
//     ctx.restore();
//   };
  
//   // Draw grid
//   const drawGrid = (ctx, width, height) => {
//     ctx.save();
//     ctx.strokeStyle = '#e0e0e0';
//     ctx.lineWidth = 0.5;
//     ctx.globalAlpha = 0.3;
    
//     const gridSize = 20;
    
//     // Vertical lines
//     for (let x = 0; x <= width; x += gridSize) {
//       ctx.beginPath();
//       ctx.moveTo(x, 0);
//       ctx.lineTo(x, height);
//       ctx.stroke();
//     }
    
//     // Horizontal lines
//     for (let y = 0; y <= height; y += gridSize) {
//       ctx.beginPath();
//       ctx.moveTo(0, y);
//       ctx.lineTo(width, y);
//       ctx.stroke();
//     }
    
//     ctx.restore();
//   };
  
//   // Add object to Yjs document
//   const addObject = useCallback((obj) => {
//     if (!yWhiteboardRef.current) return;
    
//     setIsLocalDrawing(true);
    
//     try {
//       const currentState = yWhiteboardRef.current.toArray()[0] || {
//         version: '1.0.0',
//         objects: [],
//         background: backgroundColor,
//         createdAt: new Date().toISOString()
//       };
      
//       const updatedState = {
//         ...currentState,
//         objects: [...(currentState.objects || []), obj],
//         updatedBy: sessionInfo?.streamerId,
//         updatedAt: new Date().toISOString()
//       };
      
//       // Update Yjs document
//       if (yWhiteboardRef.current.length === 0) {
//         yWhiteboardRef.current.insert(0, [updatedState]);
//       } else {
//         yWhiteboardRef.current.delete(0, 1);
//         yWhiteboardRef.current.insert(0, [updatedState]);
//       }
      
//     } catch (error) {
//       console.error('Error adding object to Yjs:', error);
//     } finally {
//       setIsLocalDrawing(false);
//     }
//   }, [backgroundColor, sessionInfo]);
  
//   // Handle mouse events for drawing
//   const handleMouseDown = useCallback((e) => {
//     e.preventDefault();
    
//     const rect = canvasRef.current.getBoundingClientRect();
//     const scaleX = canvasRef.current.width / rect.width;
//     const scaleY = canvasRef.current.height / rect.height;
    
//     const x = (e.clientX - rect.left) * scaleX;
//     const y = (e.clientY - rect.top) * scaleY;
    
//     // Pan tool
//     if (tool === 'pan' || e.buttons === 4 || e.ctrlKey) {
//       isPanningRef.current = true;
//       panStartRef.current = { x: e.clientX, y: e.clientY };
//       canvasRef.current.style.cursor = 'grabbing';
//       return;
//     }
    
//     setIsDrawing(true);
    
//     const transformedX = (x - canvasOffsetRef.current.x) / currentZoom;
//     const transformedY = (y - canvasOffsetRef.current.y) / currentZoom;
    
//     lastPointRef.current = { x: transformedX, y: transformedY };
    
//     // Start drawing based on tool
//     if (tool === 'pen' || tool === 'eraser') {
//       const points = [{ x: transformedX, y: transformedY }];
      
//       addObject({
//         type: tool,
//         points,
//         color: tool === 'eraser' ? '#ffffff' : color,
//         strokeWidth,
//         opacity,
//         timestamp: Date.now()
//       });
//     }
//   }, [tool, color, strokeWidth, opacity, currentZoom, addObject]);
  
//   const handleMouseMove = useCallback((e) => {
//     if (isPanningRef.current) {
//       const dx = e.clientX - panStartRef.current.x;
//       const dy = e.clientY - panStartRef.current.y;
      
//       canvasOffsetRef.current.x += dx;
//       canvasOffsetRef.current.y += dy;
      
//       panStartRef.current = { x: e.clientX, y: e.clientY };
      
//       // Redraw with new offset
//       if (yWhiteboardRef.current) {
//         const state = yWhiteboardRef.current.toArray()[0] || {};
//         redrawCanvas(state.objects || []);
//       }
      
//       return;
//     }
    
//     if (!isDrawing || !yWhiteboardRef.current) return;
    
//     const rect = canvasRef.current.getBoundingClientRect();
//     const scaleX = canvasRef.current.width / rect.width;
//     const scaleY = canvasRef.current.height / rect.height;
    
//     const x = (e.clientX - rect.left) * scaleX;
//     const y = (e.clientY - rect.top) * scaleY;
    
//     const transformedX = (x - canvasOffsetRef.current.x) / currentZoom;
//     const transformedY = (y - canvasOffsetRef.current.y) / currentZoom;
    
//     const currentState = yWhiteboardRef.current.toArray()[0] || {};
//     const objects = [...(currentState.objects || [])];
//     const lastObject = objects[objects.length - 1];
    
//     if (lastObject && (lastObject.type === 'pen' || lastObject.type === 'eraser')) {
//       // Continue drawing
//       lastObject.points.push({ x: transformedX, y: transformedY });
      
//       const updatedState = {
//         ...currentState,
//         objects,
//         updatedAt: new Date().toISOString()
//       };
      
//       yWhiteboardRef.current.delete(0, 1);
//       yWhiteboardRef.current.insert(0, [updatedState]);
      
//       redrawCanvas(objects);
//     }
//   }, [isDrawing, redrawCanvas, currentZoom]);
  
//   const handleMouseUp = useCallback(() => {
//     setIsDrawing(false);
//     isPanningRef.current = false;
//     canvasRef.current.style.cursor = tool === 'pan' ? 'grab' : 'crosshair';
//   }, [tool]);
  
//   // Clear whiteboard
//   const handleClearWhiteboard = useCallback(() => {
//     if (window.confirm('Clear entire whiteboard?')) {
//       const emptyState = {
//         version: '1.0.0',
//         objects: [],
//         background: backgroundColor,
//         clearedAt: new Date().toISOString(),
//         clearedBy: sessionInfo?.streamerId
//       };
      
//       yWhiteboardRef.current.delete(0, yWhiteboardRef.current.length);
//       yWhiteboardRef.current.insert(0, [emptyState]);
      
//       redrawCanvas([]);
//       toast.success('Whiteboard cleared');
//     }
//   }, [backgroundColor, sessionInfo, redrawCanvas]);
  
//   // Export as image
//   const handleExport = useCallback(() => {
//     const canvas = canvasRef.current;
//     const bgCanvas = backgroundCanvasRef.current;
    
//     // Create a combined canvas
//     const exportCanvas = document.createElement('canvas');
//     exportCanvas.width = canvas.width;
//     exportCanvas.height = canvas.height;
    
//     const exportCtx = exportCanvas.getContext('2d');
    
//     // Draw background
//     exportCtx.drawImage(bgCanvas, 0, 0);
    
//     // Draw drawings
//     exportCtx.drawImage(canvas, 0, 0);
    
//     // Download
//     const link = document.createElement('a');
//     link.download = `whiteboard-${sessionId}-${Date.now()}.png`;
//     link.href = exportCanvas.toDataURL('image/png');
//     link.click();
    
//     toast.success('Whiteboard exported');
//   }, [sessionId]);
  
//   // Undo/Redo
//   const handleUndo = useCallback(() => {
//     if (yUndoManagerRef.current) {
//       yUndoManagerRef.current.undo();
//     }
//   }, []);
  
//   const handleRedo = useCallback(() => {
//     if (yUndoManagerRef.current) {
//       yUndoManagerRef.current.redo();
//     }
//   }, []);
  
//   // Zoom controls
//   const handleZoomIn = useCallback(() => {
//     setCurrentZoom(prev => Math.min(prev + 0.1, 3));
//   }, []);
  
//   const handleZoomOut = useCallback(() => {
//     setCurrentZoom(prev => Math.max(prev - 0.1, 0.5));
//   }, []);
  
//   const handleZoomReset = useCallback(() => {
//     setCurrentZoom(1);
//     canvasOffsetRef.current = { x: 0, y: 0 };
    
//     if (yWhiteboardRef.current) {
//       const state = yWhiteboardRef.current.toArray()[0] || {};
//       redrawCanvas(state.objects || []);
//     }
//   }, [redrawCanvas]);
  
//   return (
//     <div className={`flex flex-col h-full bg-gray-900 ${mainScreenMode ? 'fixed inset-0 z-50' : ''}`}>
//       {/* Header */}
//       <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
//         <div className="flex items-center space-x-2">
//           <h3 className="text-white font-semibold">Whiteboard</h3>
//           <div className={`px-2 py-1 rounded-full text-xs ${
//             isConnected ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
//           }`}>
//             {isConnected ? 'Connected' : 'Disconnected'}
//           </div>
//         </div>
        
//         <div className="flex items-center space-x-2">
//           {/* Zoom controls */}
//           <button
//             onClick={handleZoomOut}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Zoom Out"
//           >
//             <FiMinusCircle className="w-4 h-4 text-white" />
//           </button>
//           <span className="text-white text-sm">{Math.round(currentZoom * 100)}%</span>
//           <button
//             onClick={handleZoomIn}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Zoom In"
//           >
//             <FiPlus className="w-4 h-4 text-white" />
//           </button>
//           <button
//             onClick={handleZoomReset}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors ml-1"
//             title="Reset Zoom"
//           >
//             <FiRefreshCcw className="w-4 h-4 text-white" />
//           </button>
          
//           <div className="w-px h-6 bg-gray-600 mx-2"></div>
          
//           {/* Undo/Redo */}
//           <button
//             onClick={handleUndo}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Undo"
//           >
//             <FiRefreshCcw className="w-4 h-4 text-white" />
//           </button>
//           <button
//             onClick={handleRedo}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
//             title="Redo"
//           >
//             <FiRefreshCcw className="w-4 h-4 text-white transform scale-x-[-1]" />
//           </button>
          
//           <div className="w-px h-6 bg-gray-600 mx-2"></div>
          
//           {/* Clear/Export */}
//           <button
//             onClick={handleClearWhiteboard}
//             className="p-1.5 bg-red-900 hover:bg-red-800 rounded-lg transition-colors"
//             title="Clear Whiteboard"
//           >
//             <FiTrash2 className="w-4 h-4 text-white" />
//           </button>
//           <button
//             onClick={handleExport}
//             className="p-1.5 bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors"
//             title="Export as PNG"
//           >
//             <FiDownload className="w-4 h-4 text-white" />
//           </button>
          
//           {/* Close button */}
//           <button
//             onClick={onClose}
//             className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors ml-2"
//             title="Close Whiteboard"
//           >
//             <FiDelete className="w-4 h-4 text-white" />
//           </button>
//         </div>
//       </div>
      
//       {/* Toolbar */}
//       <div className="flex items-center p-2 bg-gray-800 border-b border-gray-700 overflow-x-auto">
//         {/* Drawing tools */}
//         <div className="flex items-center space-x-1 bg-gray-700 p-1 rounded-lg">
//           <button
//             onClick={() => setTool('pen')}
//             className={`p-2 rounded-lg transition-colors ${
//               tool === 'pen' ? 'bg-blue-600 text-white' : 'hover:bg-gray-600 text-gray-300'
//             }`}
//             title="Pen"
//           >
//             <FaPaintBrush className="w-4 h-4" />
//           </button>
          
//           <button
//             onClick={() => setTool('eraser')}
//             className={`p-2 rounded-lg transition-colors ${
//               tool === 'eraser' ? 'bg-blue-600 text-white' : 'hover:bg-gray-600 text-gray-300'
//             }`}
//             title="Eraser"
//           >
//             <FaEraser className="w-4 h-4" />
//           </button>
          
//           <button
//             onClick={() => setTool('line')}
//             className={`p-2 rounded-lg transition-colors ${
//               tool === 'line' ? 'bg-blue-600 text-white' : 'hover:bg-gray-600 text-gray-300'
//             }`}
//             title="Line"
//           >
//             <FiMinus className="w-4 h-4" />
//           </button>
          
//           <button
//             onClick={() => setTool('rectangle')}
//             className={`p-2 rounded-lg transition-colors ${
//               tool === 'rectangle' ? 'bg-blue-600 text-white' : 'hover:bg-gray-600 text-gray-300'
//             }`}
//             title="Rectangle"
//           >
//             <FiSquare className="w-4 h-4" />
//           </button>
          
//           <button
//             onClick={() => setTool('circle')}
//             className={`p-2 rounded-lg transition-colors ${
//               tool === 'circle' ? 'bg-blue-600 text-white' : 'hover:bg-gray-600 text-gray-300'
//             }`}
//             title="Circle"
//           >
//             <FiCircle className="w-4 h-4" />
//           </button>
          
//           <button
//             onClick={() => setTool('text')}
//             className={`p-2 rounded-lg transition-colors ${
//               tool === 'text' ? 'bg-blue-600 text-white' : 'hover:bg-gray-600 text-gray-300'
//             }`}
//             title="Text"
//           >
//             <FiType className="w-4 h-4" />
//           </button>
          
//           <button
//             onClick={() => setTool('pan')}
//             className={`p-2 rounded-lg transition-colors ${
//               tool === 'pan' ? 'bg-blue-600 text-white' : 'hover:bg-gray-600 text-gray-300'
//             }`}
//             title="Pan (Hold Ctrl or Middle Mouse)"
//           >
//             <FiMove className="w-4 h-4" />
//           </button>
          
//           <button
//             onClick={() => setTool('select')}
//             className={`p-2 rounded-lg transition-colors ${
//               tool === 'select' ? 'bg-blue-600 text-white' : 'hover:bg-gray-600 text-gray-300'
//             }`}
//             title="Select"
//           >
//             <FiMousePointer className="w-4 h-4" />
//           </button>
//         </div>
        
//         <div className="w-px h-6 bg-gray-600 mx-2"></div>
        
//         {/* Color picker */}
//         <div className="flex items-center space-x-2">
//           <input
//             type="color"
//             value={color}
//             onChange={(e) => setColor(e.target.value)}
//             className="w-8 h-8 rounded cursor-pointer"
//             title="Color"
//           />
          
//           <select
//             value={strokeWidth}
//             onChange={(e) => setStrokeWidth(Number(e.target.value))}
//             className="bg-gray-700 text-white text-sm rounded-lg px-2 py-1.5 border border-gray-600"
//             title="Stroke Width"
//           >
//             <option value="1">1px</option>
//             <option value="2">2px</option>
//             <option value="3">3px</option>
//             <option value="5">5px</option>
//             <option value="8">8px</option>
//             <option value="12">12px</option>
//           </select>
          
//           <select
//             value={opacity}
//             onChange={(e) => setOpacity(Number(e.target.value))}
//             className="bg-gray-700 text-white text-sm rounded-lg px-2 py-1.5 border border-gray-600"
//             title="Opacity"
//           >
//             <option value="1">100%</option>
//             <option value="0.8">80%</option>
//             <option value="0.6">60%</option>
//             <option value="0.4">40%</option>
//             <option value="0.2">20%</option>
//           </select>
//         </div>
        
//         <div className="w-px h-6 bg-gray-600 mx-2"></div>
        
//         {/* Background color */}
//         <div className="flex items-center space-x-2">
//           <span className="text-gray-300 text-sm">BG:</span>
//           <input
//             type="color"
//             value={backgroundColor}
//             onChange={(e) => {
//               setBackgroundColor(e.target.value);
              
//               // Update Yjs settings
//               if (ySettingsRef.current) {
//                 ySettingsRef.current.set('background', e.target.value);
//               }
              
//               // Redraw with new background
//               if (yWhiteboardRef.current) {
//                 const state = yWhiteboardRef.current.toArray()[0] || {};
//                 redrawCanvas(state.objects || []);
//               }
//             }}
//             className="w-6 h-6 rounded cursor-pointer"
//             title="Background Color"
//           />
          
//           <button
//             onClick={() => setIsGridVisible(!isGridVisible)}
//             className={`p-1.5 rounded-lg transition-colors ${
//               isGridVisible ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
//             }`}
//             title="Toggle Grid"
//           >
//             <FiSquare className="w-4 h-4" />
//           </button>
//         </div>
        
//         {/* Participants indicator */}
//         <div className="ml-auto flex items-center space-x-1">
//           <div className="text-gray-400 text-sm mr-2">
//             {participants.length} {participants.length === 1 ? 'user' : 'users'}
//           </div>
//           {participants.map((p, i) => (
//             <div
//               key={p.clientId}
//               className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-medium"
//               title={`${p.userName || 'User'} (${p.role || 'Viewer'})`}
//             >
//               {p.userName?.charAt(0) || 'U'}
//             </div>
//           ))}
//         </div>
//       </div>
      
//       {/* Canvas area */}
//       <div className="flex-1 relative overflow-hidden bg-gray-900">
//         {/* Background canvas */}
//         <canvas
//           ref={backgroundCanvasRef}
//           className="absolute top-0 left-0 w-full h-full"
//           style={{ pointerEvents: 'none' }}
//         />
        
//         {/* Main drawing canvas */}
//         <canvas
//           ref={canvasRef}
//           className="absolute top-0 left-0 w-full h-full cursor-crosshair"
//           onMouseDown={handleMouseDown}
//           onMouseMove={handleMouseMove}
//           onMouseUp={handleMouseUp}
//           onMouseLeave={handleMouseUp}
//           onContextMenu={(e) => e.preventDefault()}
//         />
        
//         {/* Drawing disabled overlay */}
//         {!allowViewersToDraw && (
//           <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-900 text-yellow-200 px-4 py-2 rounded-lg text-sm">
//             Viewers cannot draw (enabled by streamer)
//           </div>
//         )}
        
//         {/* Info overlay */}
//         <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-3 py-2 rounded-lg">
//           <div>Tool: {tool}</div>
//           <div>Zoom: {Math.round(currentZoom * 100)}%</div>
//           <div>Pan: Ctrl + Drag</div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default StreamerWhiteboard;// import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";









// import * as fabric from "fabric";
// import * as Y from "yjs";
// import { WebsocketProvider } from "y-websocket";
// import { useAuth } from "../../../contexts/AuthContext";

// import {
//   FiSquare,
//   FiCircle,
//   FiType,
//   FiPenTool,
//   FiMousePointer,
//   FiTrash2,
//   FiDownload,
//   FiUpload,
//   FiZoomIn,
//   FiZoomOut,
//   FiMaximize2,
//   FiMinimize2,
//   FiMinus,
//   FiArrowRight,
//   FiX,
//   FiLock,
//   FiUnlock,
//   FiChevronLeft,
//   FiChevronRight,
//   FiRefreshCw,
//   FiImage,
// } from "react-icons/fi";
// import { FaUndo, FaRedo } from "react-icons/fa";
// import { BsEraser } from "react-icons/bs";
// import { LuStickyNote } from "react-icons/lu";

// /**
//  * ✅ WHITEBOARD COMPONENT - STREAMER VERSION (UPDATED)
//  * ✅ MATCHED WITH VIEWER FIXES:
//  * 1) ✅ WebsocketProvider URL fixed (baseUrl + roomName + params)
//  * 2) ✅ Canvas state always at index 0 (single source of truth)
//  * 3) ✅ Uses ydoc.transact with origin "local-canvas" to prevent self-loop
//  * 4) ✅ Observer reads get(0) and ignores our own updates by updatedBy + origin
//  * 5) ✅ No duplicate provider.on('status') handlers
//  */
// const WhiteboardComponent = ({
//   sessionId,
//   roomCode,
//   wsToken,
//   sessionInfo,
//   isActive,
//   onClose,
//   isStreamer = true, // ✅ STREAMER ke liye TRUE
//   allowViewersToDraw = true,
//   mainScreenMode = true,
//   compact = true,
// }) => {
//   const { user } = useAuth();

//   // =========================
//   // ✅ STABLE REFS (No re-renders)
//   // =========================
//   const isMountedRef = useRef(true);
//   const canvasElRef = useRef(null);
//   const containerRef = useRef(null);
//   const fabricCanvasRef = useRef(null);
//   const ydocRef = useRef(null);
//   const yProviderRef = useRef(null);
//   const initCompleteRef = useRef(false);

//   // ✅ Permissions ref
//   const permissionsRef = useRef({
//     canDraw: true,
//     canAddObjects: true,
//     canDelete: true,
//     canEdit: true,
//     isViewer: false,
//     isStreamer: true,
//   });

//   // Tool ref for avoiding stale closures
//   const toolRef = useRef("select");

//   // Drawing settings refs
//   const brushWidthRef = useRef(5);
//   const brushColorRef = useRef("#000000");
//   const fillColorRef = useRef("#ffffff");
//   const opacityRef = useRef(1);
//   const fontSizeRef = useRef(20);

//   // History refs
//   const historyRef = useRef([]);
//   const historyIndexRef = useRef(-1);
//   const saveQueuedRef = useRef(false);

//   // Debounce refs
//   const syncTimeoutRef = useRef(null);
//   const resizeHandlerRef = useRef(null);
//   const loadTimeoutRef = useRef(null);

//   // =========================
//   // ✅ UI STATE
//   // =========================
//   const [tool, setTool] = useState("select");
//   const [brushWidth, setBrushWidth] = useState(5);
//   const [brushColor, setBrushColor] = useState("#000000");
//   const [fillColor, setFillColor] = useState("#ffffff");
//   const [opacity, setOpacity] = useState(1);
//   const [fontSize, setFontSize] = useState(20);
//   const [zoom, setZoom] = useState(1);
//   const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
//   const [isLoading, setIsLoading] = useState(true);
//   const [connectionStatus, setConnectionStatus] = useState("disconnected");
//   const [connectionError, setConnectionError] = useState(null);
//   const [roomSettings, setRoomSettings] = useState({
//     allowViewersToDraw,
//     streamerId: null,
//     streamerName: null,
//   });
//   const [activeUsers, setActiveUsers] = useState([]);

//   // UI toggles
//   const [showTools, setShowTools] = useState(true);
//   const [showColors, setShowColors] = useState(false);
//   const [showBrushSizes, setShowBrushSizes] = useState(false);
//   const [isFullscreen, setIsFullscreen] = useState(false);

//   // =========================
//   // ✅ MEMOIZED CONFIGS
//   // =========================
//   const tools = useMemo(
//     () => [
//       { id: "select", name: "Select", icon: <FiMousePointer size={16} /> },
//       { id: "draw", name: "Draw", icon: <FiPenTool size={16} /> },
//       { id: "rectangle", name: "Rectangle", icon: <FiSquare size={16} /> },
//       { id: "circle", name: "Circle", icon: <FiCircle size={16} /> },
//       { id: "line", name: "Line", icon: <FiMinus size={16} /> },
//       { id: "arrow", name: "Arrow", icon: <FiArrowRight size={16} /> },
//       { id: "text", name: "Text", icon: <FiType size={16} /> },
//       { id: "sticky", name: "Sticky", icon: <LuStickyNote size={16} /> },
//       { id: "eraser", name: "Eraser", icon: <BsEraser size={16} /> },
//     ],
//     []
//   );

//   const colors = useMemo(
//     () => [
//       "#000000",
//       "#FF0000",
//       "#00FF00",
//       "#0000FF",
//       "#FFFF00",
//       "#FF00FF",
//       "#00FFFF",
//       "#FFA500",
//       "#800080",
//       "#008000",
//       "#800000",
//       "#008080",
//       "#000080",
//       "#808080",
//     ],
//     []
//   );

//   const brushSizes = useMemo(() => [1, 2, 3, 5, 8, 10, 15, 20, 30], []);

//   // =========================
//   // ✅ HELPER FUNCTIONS
//   // =========================
//   const getUserId = useCallback(() => {
//     return user?.id || user?._id || user?.email || `streamer_${Date.now()}`;
//   }, [user]);

//   const safeSetState = useCallback((fn) => {
//     if (isMountedRef.current) {
//       fn();
//     }
//   }, []);

//   // =========================
//   // ✅ WEBSOCKET BASE URL (FIXED)
//   // =========================
//   const getWebSocketBaseUrl = useCallback(() => {
//     const baseUrl = import.meta.env.VITE_WS_URL || "ws://localhost:9090";
//     return `${baseUrl}/yjs`; // ✅ base endpoint only
//   }, []);

//   // =========================
//   // ✅ HISTORY MANAGEMENT
//   // =========================
//   const saveState = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     if (saveQueuedRef.current) return;
//     saveQueuedRef.current = true;

//     queueMicrotask(() => {
//       saveQueuedRef.current = false;
//       const c = fabricCanvasRef.current;
//       if (!c) return;

//       try {
//         const state = c.toJSON(["id"]);
//         const hist = historyRef.current;
//         const idx = historyIndexRef.current;

//         const next = hist.slice(0, idx + 1);
//         next.push(state);

//         historyRef.current = next;
//         historyIndexRef.current = next.length - 1;
//       } catch (e) {
//         console.error("❌ saveState error:", e);
//       }
//     });
//   }, []);

//   const loadFromHistoryIndex = useCallback((idx) => {
//     const canvas = fabricCanvasRef.current;
//     const hist = historyRef.current;
//     if (!canvas || !hist[idx]) return;

//     try {
//       canvas.loadFromJSON(hist[idx], () => {
//         canvas.renderAll();
//       });
//     } catch (e) {
//       console.error("❌ loadFromHistoryIndex error:", e);
//     }
//   }, []);

//   // =========================
//   // ✅ YJS SYNC FUNCTIONS (FIXED INDEX 0 + transact origin)
//   // =========================
//   const updateYjsCanvas = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     const ydoc = ydocRef.current;
//     if (!canvas || !ydoc) return;

//     try {
//       const json = canvas.toJSON(["id"]);
//       const yCanvasArray = ydoc.getArray("whiteboard");

//       const payload = {
//         ...json,
//         sessionId,
//         allowViewersToDraw: roomSettings.allowViewersToDraw,
//         lastUpdated: new Date().toISOString(),
//         updatedBy: getUserId(),
//         updatedByName: user?.name || "Streamer",
//         version: "5.3.0",
//       };

//       // ✅ always write at index 0, with origin to prevent self-loop in observers
//       ydoc.transact(() => {
//         if (yCanvasArray.length > 0) yCanvasArray.delete(0, yCanvasArray.length);
//         yCanvasArray.insert(0, [payload]);
//       }, "local-canvas");

//       console.log("📤 [STREAMER] Canvas state synced to Yjs");
//     } catch (e) {
//       console.error("❌ updateYjsCanvas error:", e);
//     }
//   }, [getUserId, roomSettings.allowViewersToDraw, sessionId, user?.name]);

//   const loadCanvasFromState = useCallback(
//     (state) => {
//       const canvas = fabricCanvasRef.current;
//       if (!canvas || !state) return;

//       try {
//         canvas.loadFromJSON(state, () => {
//           canvas.renderAll();
//           saveState();
//         });
//       } catch (e) {
//         console.error("❌ loadCanvasFromState error:", e);
//       }
//     },
//     [saveState]
//   );

//   const handleUndo = useCallback(() => {
//     const idx = historyIndexRef.current;
//     if (idx <= 0) return;

//     historyIndexRef.current = idx - 1;
//     loadFromHistoryIndex(idx - 1);

//     clearTimeout(syncTimeoutRef.current);
//     syncTimeoutRef.current = setTimeout(() => {
//       updateYjsCanvas();
//     }, 250);
//   }, [loadFromHistoryIndex, updateYjsCanvas]);

//   const handleRedo = useCallback(() => {
//     const hist = historyRef.current;
//     const idx = historyIndexRef.current;
//     if (idx >= hist.length - 1) return;

//     historyIndexRef.current = idx + 1;
//     loadFromHistoryIndex(idx + 1);

//     clearTimeout(syncTimeoutRef.current);
//     syncTimeoutRef.current = setTimeout(() => {
//       updateYjsCanvas();
//     }, 250);
//   }, [loadFromHistoryIndex, updateYjsCanvas]);

//   // =========================
//   // ✅ YJS INITIALIZATION - STREAMER (FIXED)
//   // =========================
//   const initYjs = useCallback(() => {
//     // Clean up provider first
//     if (yProviderRef.current) {
//       try {
//         console.log("🧹 [STREAMER] Destroying old YProvider");
//         yProviderRef.current.disconnect();
//         yProviderRef.current.destroy();
//       } catch (e) {
//         console.error("❌ [STREAMER] Error destroying provider:", e);
//       }
//       yProviderRef.current = null;
//     }

//     // Clean up Y.Doc
//     if (ydocRef.current) {
//       try {
//         console.log("🧹 [STREAMER] Destroying old Y.Doc with clientID:", ydocRef.current.clientID);
//         ydocRef.current.destroy();
//       } catch (e) {
//         console.error("❌ [STREAMER] Error destroying Y.Doc:", e);
//       }
//       ydocRef.current = null;
//     }

//     // Validate required props
//     if (!sessionId) {
//       console.error("❌ [STREAMER] Missing sessionId");
//       safeSetState(() => setIsLoading(false));
//       return;
//     }

//     if (!wsToken) {
//       console.error("❌ [STREAMER] Missing wsToken");
//       safeSetState(() => setIsLoading(false));
//       return;
//     }

//     const serverUrl = getWebSocketBaseUrl();

//     try {
//       console.log("📄 [STREAMER] Creating NEW Y.Doc");
//       const ydoc = new Y.Doc();
//       ydocRef.current = ydoc;

//       console.log("✅ [STREAMER] New Y.Doc created with clientID:", ydoc.clientID);

//       const yCanvasArray = ydoc.getArray("whiteboard");
//       const yUsers = ydoc.getMap("users");
//       const ySettings = ydoc.getMap("room_settings");

//       // ✅ ensure binaryType = arraybuffer in browser ws
//       class BinaryWebSocket extends WebSocket {
//         constructor(url, protocols) {
//           super(url, protocols);
//           this.binaryType = "arraybuffer";
//         }
//       }

//       console.log("🔌 [STREAMER] Creating WebSocketProvider (baseUrl + roomName + params)", {
//         serverUrl,
//         roomName: `${sessionId}`,
//       });

//       const provider = new WebsocketProvider(
//         serverUrl, // ✅ ws://host:9090/yjs
//         `${sessionId}`, // ✅ roomName => /yjs/<sessionId>
//         ydoc,
//         {
//           WebSocketPolyfill: BinaryWebSocket,
//           connect: true,
//           disableBc: true,
//           maxBackoffTime: 5000,
//           params: {
//             token: wsToken,
//             roomCode: roomCode || "",
//             userName: user?.name || user?.userName || "Streamer",
//             userId: getUserId(),
//             isStreamer: "true",
//             allowViewersToDraw: String(!!allowViewersToDraw),
//             roomName: sessionInfo?.title || "Whiteboard Session",
//             _t: Date.now(),
//           },
//         }
//       );

//       yProviderRef.current = provider;

//       provider.on("status", (event) => {
//         const status = event?.status || "unknown";
//         console.log("📡 [STREAMER] Yjs status:", status, "Y.Doc clientID:", ydoc.clientID);
//         safeSetState(() => setConnectionStatus(status));

//         if (status === "connected") {
//           safeSetState(() => {
//             setIsLoading(false);
//             setConnectionError(null);
//           });

//           // ✅ Register streamer
//           const uid = getUserId();
//           yUsers.set(uid, {
//             name: user?.name || "Streamer",
//             id: uid,
//             isStreamer: true,
//             isViewer: false,
//             permissions: permissionsRef.current,
//             joinedAt: new Date().toISOString(),
//             lastActive: new Date().toISOString(),
//             cursorPosition: { x: 0, y: 0 },
//             currentTool: toolRef.current || "select",
//             yjsClientId: ydoc.clientID,
//             connectionId: `${uid}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//           });

//           console.log("✅ [STREAMER] Registered with Yjs clientID:", ydoc.clientID);

//           // ✅ Initialize room settings (only if not present)
//           if (ySettings.get("allowViewersToDraw") === undefined) {
//             console.log("🎛️ [STREAMER] Initializing room settings");
//             ySettings.set("allowViewersToDraw", allowViewersToDraw);
//             ySettings.set("streamerId", uid);
//             ySettings.set("streamerName", user?.name || "Streamer");
//             ySettings.set("createdAt", new Date().toISOString());
//             ySettings.set("updatedAt", new Date().toISOString());
//           }

//           // ✅ Initialize canvas if empty
//           if (yCanvasArray.length === 0) {
//             console.log("🆕 [STREAMER] Creating initial canvas state");
//             const initialState = {
//               version: "5.3.0",
//               objects: [],
//               background: "#ffffff",
//               sessionId,
//               allowViewersToDraw,
//               createdAt: new Date().toISOString(),
//               updatedBy: uid,
//               updatedByName: user?.name || "Streamer",
//             };

//             ydoc.transact(() => {
//               yCanvasArray.insert(0, [initialState]);
//             }, "local-canvas");

//             console.log("✅ [STREAMER] Initial canvas state created");
//           } else {
//             console.log("📥 [STREAMER] Existing canvas state found");
//             const latestState = yCanvasArray.get(0);
//             if (latestState) loadCanvasFromState(latestState);
//           }
//         }
//       });

//       provider.on("connection-error", (error) => {
//         console.error("❌ [STREAMER] Yjs connection error:", error);
//         safeSetState(() => {
//           setConnectionError(error?.message || "Connection error");
//           setIsLoading(false);
//         });
//       });

//       // ✅ Room settings observer
//       ySettings.observe(() => {
//         try {
//           const s = ySettings.toJSON();
//           console.log("⚙️ [STREAMER] Room settings changed:", s);

//           safeSetState(() =>
//             setRoomSettings((prev) => ({
//               ...prev,
//               allowViewersToDraw: s.allowViewersToDraw ?? prev.allowViewersToDraw,
//               streamerId: s.streamerId ?? prev.streamerId,
//               streamerName: s.streamerName ?? prev.streamerName,
//             }))
//           );
//         } catch (error) {
//           console.error("❌ [STREAMER] Settings observer error:", error);
//         }
//       });

//       // ✅ Users observer
//       yUsers.observe(() => {
//         try {
//           const usersArr = Array.from(yUsers.values());
//           const others = usersArr.filter((u) => u.id !== getUserId());
//           safeSetState(() => setActiveUsers(others));
//         } catch (error) {
//           console.error("❌ [STREAMER] Users observer error:", error);
//         }
//       });

//       // ✅ Canvas observer - Receive updates (from viewers OR ourselves via remote)
//       yCanvasArray.observe((event) => {
//         try {
//           // ✅ ignore our local origin writes
//           if (event.transaction?.origin === "local-canvas") return;

//           if (yCanvasArray.length === 0) return;

//           // ✅ Always read index 0
//           const latest = yCanvasArray.get(0);
//           if (!latest) return;

//           // ✅ ignore if it's our own update by userId too
//           if (latest.updatedBy === getUserId()) return;

//           console.log("📥 [STREAMER] Incoming canvas update:", {
//             updatedBy: latest.updatedBy,
//             updatedByName: latest.updatedByName,
//             objects: latest.objects?.length || 0,
//           });

//           // Viewer updates should apply only if viewers can draw
//           if (roomSettings.allowViewersToDraw) {
//             loadCanvasFromState(latest);
//           }
//         } catch (error) {
//           console.error("❌ [STREAMER] Canvas observer error:", error);
//         }
//       });

//       console.log("✅ [STREAMER] Yjs initialized successfully with clientID:", ydoc.clientID);
//     } catch (err) {
//       console.error("❌ [STREAMER] initYjs error:", err);
//       safeSetState(() => {
//         setConnectionError(err?.message || "Initialization error");
//         setIsLoading(false);
//       });
//     }
//   }, [
//     allowViewersToDraw,
//     getWebSocketBaseUrl,
//     roomCode,
//     sessionId,
//     sessionInfo?.title,
//     user?.name,
//     user?.userName,
//     wsToken,
//     getUserId,
//     loadCanvasFromState,
//     safeSetState,
//     roomSettings.allowViewersToDraw,
//   ]);

//   // =========================
//   // ✅ FABRIC CANVAS INITIALIZATION
//   // =========================
//   const initCanvas = useCallback(() => {
//     if (!containerRef.current || !canvasElRef.current) return;

//     // Clean up existing canvas
//     if (fabricCanvasRef.current) {
//       fabricCanvasRef.current.dispose();
//       fabricCanvasRef.current = null;
//     }

//     const container = containerRef.current;

//     try {
//       const canvas = new fabric.Canvas(canvasElRef.current, {
//         width: container.clientWidth,
//         height: container.clientHeight,
//         backgroundColor: "#ffffff",
//         selection: true,
//         preserveObjectStacking: true,
//         renderOnAddRemove: true,
//       });

//       fabricCanvasRef.current = canvas;

//       // Setup brush
//       canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
//       canvas.freeDrawingBrush.width = brushWidthRef.current;
//       canvas.freeDrawingBrush.color = brushColorRef.current;

//       // Mouse move - cursor position
//       canvas.on("mouse:move", (e) => {
//         if (!e.absolutePointer) return;
//         safeSetState(() =>
//           setCursorPosition({
//             x: Math.round(e.absolutePointer.x),
//             y: Math.round(e.absolutePointer.y),
//           })
//         );
//       });

//       // Object added
//       canvas.on("object:added", (e) => {
//         if (e.target && !e.target.id) {
//           e.target.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2)}`;
//         }
//         saveState();
//       });

//       // Object modified
//       canvas.on("object:modified", () => {
//         saveState();
//         clearTimeout(syncTimeoutRef.current);
//         syncTimeoutRef.current = setTimeout(() => {
//           updateYjsCanvas();
//         }, 400);
//       });

//       // Object removed
//       canvas.on("object:removed", () => {
//         saveState();
//         clearTimeout(syncTimeoutRef.current);
//         syncTimeoutRef.current = setTimeout(() => {
//           updateYjsCanvas();
//         }, 400);
//       });

//       // Path created
//       canvas.on("path:created", (e) => {
//         if (e.path && !e.path.id) {
//           e.path.id = `path_${Date.now()}_${Math.random().toString(36).slice(2)}`;
//         }
//         saveState();
//       });

//       // Mouse up - trigger sync
//       canvas.on("mouse:up", () => {
//         clearTimeout(syncTimeoutRef.current);
//         syncTimeoutRef.current = setTimeout(() => {
//           updateYjsCanvas();
//         }, 300);
//       });

//       // Window resize handler
//       const handleResize = () => {
//         const c = fabricCanvasRef.current;
//         const ctr = containerRef.current;
//         if (!c || !ctr) return;
//         c.setDimensions({
//           width: ctr.clientWidth,
//           height: ctr.clientHeight,
//         });
//         c.renderAll();
//       };

//       resizeHandlerRef.current = handleResize;
//       window.addEventListener("resize", handleResize);

//       // Initial save
//       saveState();

//       console.log("✅ Fabric canvas initialized");
//     } catch (error) {
//       console.error("❌ Canvas initialization error:", error);
//     }
//   }, [saveState, updateYjsCanvas, safeSetState]);

//   // =========================
//   // ✅ TOOL FUNCTIONS
//   // =========================
//   const setBrushToCanvas = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     if (!canvas.freeDrawingBrush) {
//       canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
//     }
//     canvas.freeDrawingBrush.width = brushWidthRef.current;
//     canvas.freeDrawingBrush.color = brushColorRef.current;
//   }, []);

//   const addRectangle = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     const rect = new fabric.Rect({
//       left: 120,
//       top: 120,
//       width: 180,
//       height: 120,
//       fill: fillColorRef.current,
//       stroke: brushColorRef.current,
//       strokeWidth: brushWidthRef.current,
//       opacity: opacityRef.current,
//       selectable: true,
//       id: `rect_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });

//     canvas.add(rect);
//     canvas.setActiveObject(rect);
//     canvas.renderAll();
//     setTool("select");
//     setTimeout(updateYjsCanvas, 100);
//   }, [updateYjsCanvas]);

//   const addCircle = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     const circle = new fabric.Circle({
//       left: 140,
//       top: 140,
//       radius: 70,
//       fill: fillColorRef.current,
//       stroke: brushColorRef.current,
//       strokeWidth: brushWidthRef.current,
//       opacity: opacityRef.current,
//       selectable: true,
//       id: `circle_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });

//     canvas.add(circle);
//     canvas.setActiveObject(circle);
//     canvas.renderAll();
//     setTool("select");
//     setTimeout(updateYjsCanvas, 100);
//   }, [updateYjsCanvas]);

//   const addText = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     const text = new fabric.IText("Double click to edit", {
//       left: 140,
//       top: 140,
//       fontSize: fontSizeRef.current,
//       fill: brushColorRef.current,
//       selectable: true,
//       id: `text_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });

//     canvas.add(text);
//     canvas.setActiveObject(text);
//     canvas.renderAll();
//     setTool("select");
//     setTimeout(updateYjsCanvas, 100);
//   }, [updateYjsCanvas]);

//   const addSticky = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     const bg = new fabric.Rect({
//       left: 120,
//       top: 120,
//       width: 220,
//       height: 150,
//       fill: "#ffff88",
//       stroke: "#d4d4d4",
//       strokeWidth: 1,
//       opacity: 0.92,
//       selectable: true,
//       id: `sticky_bg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });

//     const tx = new fabric.IText("Edit note...", {
//       left: 130,
//       top: 130,
//       fontSize: 16,
//       fill: "#000000",
//       selectable: true,
//       id: `sticky_text_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });

//     const group = new fabric.Group([bg, tx], {
//       left: 120,
//       top: 120,
//       selectable: true,
//       id: `sticky_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });

//     canvas.add(group);
//     canvas.setActiveObject(group);
//     canvas.renderAll();
//     setTool("select");
//     setTimeout(updateYjsCanvas, 100);
//   }, [updateYjsCanvas]);

//   const startLineMode = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     canvas.isDrawingMode = false;
//     canvas.selection = false;

//     let line = null;
//     let isDown = false;

//     const onMouseDown = (opt) => {
//       isDown = true;
//       const pointer = canvas.getPointer(opt.e);
//       line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
//         stroke: brushColorRef.current,
//         strokeWidth: brushWidthRef.current,
//         opacity: opacityRef.current,
//         selectable: true,
//         id: `line_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//       });
//       canvas.add(line);
//     };

//     const onMouseMove = (opt) => {
//       if (!isDown || !line) return;
//       const pointer = canvas.getPointer(opt.e);
//       line.set({ x2: pointer.x, y2: pointer.y });
//       canvas.renderAll();
//     };

//     const onMouseUp = () => {
//       isDown = false;
//       canvas.off("mouse:down", onMouseDown);
//       canvas.off("mouse:move", onMouseMove);
//       canvas.off("mouse:up", onMouseUp);
//       canvas.selection = true;
//       setTool("select");
//       setTimeout(updateYjsCanvas, 100);
//     };

//     canvas.on("mouse:down", onMouseDown);
//     canvas.on("mouse:move", onMouseMove);
//     canvas.on("mouse:up", onMouseUp);
//   }, [updateYjsCanvas]);

//   const startArrowMode = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     canvas.isDrawingMode = false;
//     canvas.selection = false;

//     let isDown = false;
//     let shaft = null;
//     let head = null;

//     const onMouseDown = (opt) => {
//       isDown = true;
//       const pointer = canvas.getPointer(opt.e);

//       shaft = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
//         stroke: brushColorRef.current,
//         strokeWidth: brushWidthRef.current,
//         opacity: opacityRef.current,
//         selectable: false,
//       });

//       head = new fabric.Triangle({
//         left: pointer.x,
//         top: pointer.y,
//         width: 14,
//         height: 14,
//         fill: brushColorRef.current,
//         angle: 0,
//         originX: "center",
//         originY: "center",
//         selectable: false,
//       });

//       canvas.add(shaft);
//       canvas.add(head);
//     };

//     const onMouseMove = (opt) => {
//       if (!isDown || !shaft || !head) return;
//       const pointer = canvas.getPointer(opt.e);

//       shaft.set({ x2: pointer.x, y2: pointer.y });

//       const dx = pointer.x - shaft.x1;
//       const dy = pointer.y - shaft.y1;
//       const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

//       head.set({
//         left: pointer.x,
//         top: pointer.y,
//         angle: angle + 90,
//       });

//       canvas.renderAll();
//     };

//     const onMouseUp = () => {
//       isDown = false;

//       if (shaft && head) {
//         const group = new fabric.Group([shaft, head], {
//           selectable: true,
//           id: `arrow_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//         });
//         canvas.remove(shaft);
//         canvas.remove(head);
//         canvas.add(group);
//       }

//       canvas.off("mouse:down", onMouseDown);
//       canvas.off("mouse:move", onMouseMove);
//       canvas.off("mouse:up", onMouseUp);
//       canvas.selection = true;
//       setTool("select");
//       setTimeout(updateYjsCanvas, 100);
//     };

//     canvas.on("mouse:down", onMouseDown);
//     canvas.on("mouse:move", onMouseMove);
//     canvas.on("mouse:up", onMouseUp);
//   }, [updateYjsCanvas]);

//   const activateEraser = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     canvas.isDrawingMode = false;
//     canvas.selection = false;

//     const onMouseDown = (opt) => {
//       const pointer = canvas.getPointer(opt.e);
//       const objects = canvas.getObjects();

//       let removed = false;
//       objects.forEach((obj) => {
//         if (obj.containsPoint && obj.containsPoint(pointer)) {
//           canvas.remove(obj);
//           removed = true;
//         }
//       });

//       if (removed) {
//         canvas.renderAll();
//         setTimeout(updateYjsCanvas, 100);
//       }
//     };

//     canvas.on("mouse:down", onMouseDown);

//     // Auto-disable after 5 seconds
//     setTimeout(() => {
//       canvas.off("mouse:down", onMouseDown);
//       canvas.selection = true;
//       setTool("select");
//     }, 5000);
//   }, [updateYjsCanvas]);

//   const handleToolSelect = useCallback(
//     (toolId) => {
//       const canvas = fabricCanvasRef.current;
//       if (!canvas) return;

//       toolRef.current = toolId;
//       setTool(toolId);

//       switch (toolId) {
//         case "select":
//           canvas.isDrawingMode = false;
//           canvas.selection = true;
//           break;

//         case "draw":
//           canvas.selection = false;
//           canvas.isDrawingMode = true;
//           setBrushToCanvas();
//           break;

//         case "rectangle":
//           addRectangle();
//           break;

//         case "circle":
//           addCircle();
//           break;

//         case "line":
//           startLineMode();
//           break;

//         case "arrow":
//           startArrowMode();
//           break;

//         case "text":
//           addText();
//           break;

//         case "sticky":
//           addSticky();
//           break;

//         case "eraser":
//           activateEraser();
//           break;

//         default:
//           break;
//       }
//     },
//     [activateEraser, addCircle, addRectangle, addSticky, addText, setBrushToCanvas, startArrowMode, startLineMode]
//   );

//   // =========================
//   // ✅ EXPORT/IMPORT/CLEAR/DELETE
//   // =========================
//   const exportAsImage = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     const dataURL = canvas.toDataURL({
//       format: "png",
//       quality: 1,
//       multiplier: 2,
//     });

//     const link = document.createElement("a");
//     link.href = dataURL;
//     link.download = `whiteboard-${sessionInfo?.title || "session"}-${new Date().toISOString().slice(0, 10)}.png`;
//     link.click();
//   }, [sessionInfo?.title]);

//   const exportAsJSON = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     const json = canvas.toJSON(["id"]);
//     const dataStr = JSON.stringify(json, null, 2);
//     const blob = new Blob([dataStr], { type: "application/json" });
//     const url = URL.createObjectURL(blob);

//     const link = document.createElement("a");
//     link.href = url;
//     link.download = `whiteboard-${sessionInfo?.title || "session"}-${new Date().toISOString().slice(0, 10)}.json`;
//     link.click();

//     URL.revokeObjectURL(url);
//   }, [sessionInfo?.title]);

//   const importFromJSON = useCallback(() => {
//     const input = document.createElement("input");
//     input.type = "file";
//     input.accept = ".json,application/json";

//     input.onchange = (e) => {
//       const file = e.target.files?.[0];
//       if (!file) return;

//       const reader = new FileReader();
//       reader.onload = (ev) => {
//         try {
//           const json = JSON.parse(ev.target.result);
//           const canvas = fabricCanvasRef.current;
//           if (!canvas) return;

//           canvas.loadFromJSON(json, () => {
//             canvas.renderAll();
//             saveState();
//             setTimeout(updateYjsCanvas, 200);
//           });
//         } catch (error) {
//           alert("Invalid JSON file: " + error.message);
//         }
//       };
//       reader.readAsText(file);
//     };

//     input.click();
//   }, [saveState, updateYjsCanvas]);

//   const handleClear = useCallback(() => {
//     if (!window.confirm("Are you sure you want to clear the whiteboard?")) return;

//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     canvas.clear();
//     canvas.backgroundColor = "#ffffff";
//     canvas.renderAll();
//     saveState();
//     setTimeout(updateYjsCanvas, 200);
//   }, [saveState, updateYjsCanvas]);

//   const deleteSelected = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     const activeObject = canvas.getActiveObject();
//     if (!activeObject) return;

//     canvas.remove(activeObject);
//     canvas.discardActiveObject();
//     canvas.renderAll();
//     saveState();
//     setTimeout(updateYjsCanvas, 200);
//   }, [saveState, updateYjsCanvas]);

//   // =========================
//   // ✅ TOGGLE VIEWER DRAW (FIXED: write to ySettings, keep state in sync)
//   // =========================
//   const toggleViewersDraw = useCallback(() => {
//     const ydoc = ydocRef.current;
//     if (!ydoc) return;

//     const ySettings = ydoc.getMap("room_settings");
//     const newValue = !roomSettings.allowViewersToDraw;

//     ySettings.set("allowViewersToDraw", newValue);
//     ySettings.set("updatedAt", new Date().toISOString());
//     ySettings.set("updatedBy", getUserId());

//     console.log("🎨 Viewers draw toggled:", newValue ? "ENABLED" : "DISABLED");
//   }, [getUserId, roomSettings.allowViewersToDraw]);

//   // =========================
//   // ✅ ZOOM FUNCTIONS
//   // =========================
//   const handleZoomIn = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     const newZoom = Math.min(zoom * 1.2, 5);
//     setZoom(newZoom);
//     canvas.setZoom(newZoom);
//     canvas.renderAll();
//   }, [zoom]);

//   const handleZoomOut = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     const newZoom = Math.max(zoom / 1.2, 0.2);
//     setZoom(newZoom);
//     canvas.setZoom(newZoom);
//     canvas.renderAll();
//   }, [zoom]);

//   const handleZoomReset = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     setZoom(1);
//     canvas.setZoom(1);
//     canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
//     canvas.renderAll();
//   }, []);

//   const toggleFullscreen = useCallback(() => {
//     setIsFullscreen((prev) => !prev);
//   }, []);

//   // =========================
//   // ✅ SYNC REFS WITH STATE
//   // =========================
//   useEffect(() => {
//     brushWidthRef.current = brushWidth;
//   }, [brushWidth]);
//   useEffect(() => {
//     brushColorRef.current = brushColor;
//   }, [brushColor]);
//   useEffect(() => {
//     fillColorRef.current = fillColor;
//   }, [fillColor]);
//   useEffect(() => {
//     opacityRef.current = opacity;
//   }, [opacity]);
//   useEffect(() => {
//     fontSizeRef.current = fontSize;
//   }, [fontSize]);

//   // =========================
//   // ✅ LIFECYCLE - MOUNT
//   // =========================
//   useEffect(() => {
//     isMountedRef.current = true;
//     return () => {
//       isMountedRef.current = false;
//     };
//   }, []);

//   // =========================
//   // ✅ LIFECYCLE - INITIALIZATION
//   // =========================
//   useEffect(() => {
//     if (!isActive) return;

//     initCompleteRef.current = false;

//     safeSetState(() => {
//       setIsLoading(true);
//       setConnectionStatus("connecting");
//       setConnectionError(null);
//     });

//     initCanvas();

//     const timer = setTimeout(() => {
//       initYjs();
//     }, 500);

//     return () => {
//       clearTimeout(timer);
//       clearTimeout(syncTimeoutRef.current);
//       clearTimeout(loadTimeoutRef.current);
//     };
//   }, [initCanvas, initYjs, isActive, safeSetState]);

//   // =========================
//   // ✅ LIFECYCLE - CLEANUP
//   // =========================
//   useEffect(() => {
//     return () => {
//       console.log("🧹 Cleaning up WhiteboardComponent...");

//       if (resizeHandlerRef.current) {
//         window.removeEventListener("resize", resizeHandlerRef.current);
//       }

//       if (yProviderRef.current) {
//         try {
//           yProviderRef.current.disconnect();
//           yProviderRef.current.destroy();
//         } catch (e) {
//           console.error("Error cleaning up provider:", e);
//         }
//         yProviderRef.current = null;
//       }

//       if (ydocRef.current) {
//         try {
//           ydocRef.current.destroy();
//         } catch (e) {
//           console.error("Error cleaning up Y.Doc:", e);
//         }
//         ydocRef.current = null;
//       }

//       if (fabricCanvasRef.current) {
//         try {
//           fabricCanvasRef.current.dispose();
//         } catch (e) {
//           console.error("Error cleaning up canvas:", e);
//         }
//         fabricCanvasRef.current = null;
//       }
//     };
//   }, []);

//   // =========================
//   // ✅ RENDER - UI
//   // =========================
//   return (
//     <div className={`relative w-full h-full ${mainScreenMode ? "bg-black/10" : "bg-black/30"}`}>
//       {/* Header */}
//       <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <div className="px-3 py-1 rounded-lg bg-black/60 text-white text-xs flex items-center gap-2">
//             <span className={`w-2 h-2 rounded-full ${connectionStatus === "connected" ? "bg-green-500" : "bg-yellow-500"}`} />
//             WB • {connectionStatus}
//           </div>
//           <div className="px-3 py-1 rounded-lg bg-black/60 text-white text-xs">
//             {cursorPosition.x}, {cursorPosition.y} • {zoom.toFixed(2)}x
//           </div>
//           {connectionError && (
//             <div className="px-3 py-1 rounded-lg bg-red-600/80 text-white text-xs">⚠️ {connectionError}</div>
//           )}
//           {activeUsers.length > 0 && (
//             <div className="px-3 py-1 rounded-lg bg-black/60 text-white text-xs">
//               👥 {activeUsers.length} viewer{activeUsers.length !== 1 ? "s" : ""}
//             </div>
//           )}
//         </div>

//         <div className="flex items-center gap-2">
//           <button
//             onClick={toggleViewersDraw}
//             className="px-3 py-1 rounded-lg bg-black/60 text-white text-xs flex items-center gap-2 hover:bg-black/70 transition-colors"
//             title={roomSettings.allowViewersToDraw ? "Disable viewer drawing" : "Enable viewer drawing"}
//           >
//             {roomSettings.allowViewersToDraw ? <FiUnlock size={14} /> : <FiLock size={14} />}
//             <span className="hidden sm:inline">Viewers: {roomSettings.allowViewersToDraw ? "Can draw" : "View only"}</span>
//           </button>

//           <button
//             onClick={toggleFullscreen}
//             className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/70 transition-colors"
//             title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
//           >
//             {isFullscreen ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
//           </button>

//           <button
//             onClick={onClose}
//             className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/70 transition-colors"
//             title="Close whiteboard"
//           >
//             <FiX size={16} />
//           </button>
//         </div>
//       </div>

//       {/* Floating Toolbar */}
//       <div className="absolute top-14 right-2 z-20 flex flex-col gap-2">
//         <div className="flex flex-col rounded-xl bg-black/60 backdrop-blur-sm p-2">
//           <div className="flex items-center justify-between gap-2 px-1 pb-2 border-b border-white/20">
//             <button className="text-white/90 hover:text-white p-1" onClick={() => setShowTools((prev) => !prev)} title="Toggle tools">
//               {showTools ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
//             </button>

//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => setShowColors((prev) => !prev)}
//                 className="w-6 h-6 rounded-md border-2 border-white/30 hover:border-white/50 transition-colors"
//                 style={{ backgroundColor: brushColor }}
//                 title="Select color"
//               />
//               <button
//                 onClick={() => setShowBrushSizes((prev) => !prev)}
//                 className="w-6 h-6 rounded-md border border-white/30 text-white text-xs flex items-center justify-center hover:bg-white/10 transition-colors"
//                 title="Brush size"
//               >
//                 {brushWidth}
//               </button>
//             </div>
//           </div>

//           {showTools && (
//             <div className="flex flex-col gap-1 pt-2">
//               {tools.map((t) => (
//                 <button
//                   key={t.id}
//                   onClick={() => handleToolSelect(t.id)}
//                   className={`flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors ${
//                     tool === t.id ? "bg-white/20" : ""
//                   }`}
//                   title={t.name}
//                 >
//                   {t.icon}
//                   {!compact && <span className="text-xs">{t.name}</span>}
//                 </button>
//               ))}

//               <div className="my-1 h-px bg-white/20" />

//               <button
//                 onClick={handleUndo}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Undo"
//               >
//                 <FaUndo size={14} />
//                 {!compact && <span className="text-xs">Undo</span>}
//               </button>
//               <button
//                 onClick={handleRedo}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Redo"
//               >
//                 <FaRedo size={14} />
//                 {!compact && <span className="text-xs">Redo</span>}
//               </button>

//               <div className="my-1 h-px bg-white/20" />

//               <button
//                 onClick={deleteSelected}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Delete selected"
//               >
//                 <FiTrash2 size={14} />
//                 {!compact && <span className="text-xs">Delete</span>}
//               </button>

//               <button
//                 onClick={handleClear}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Clear all"
//               >
//                 <FiRefreshCw size={14} />
//                 {!compact && <span className="text-xs">Clear</span>}
//               </button>

//               <div className="my-1 h-px bg-white/20" />

//               <button
//                 onClick={exportAsImage}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Export as PNG"
//               >
//                 <FiDownload size={14} />
//                 {!compact && <span className="text-xs">PNG</span>}
//               </button>

//               <button
//                 onClick={exportAsJSON}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Export as JSON"
//               >
//                 <FiDownload size={14} />
//                 {!compact && <span className="text-xs">JSON</span>}
//               </button>

//               <button
//                 onClick={importFromJSON}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Import JSON"
//               >
//                 <FiUpload size={14} />
//                 {!compact && <span className="text-xs">Import</span>}
//               </button>

//               <div className="my-1 h-px bg-white/20" />

//               <button
//                 onClick={handleZoomIn}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Zoom in"
//               >
//                 <FiZoomIn size={14} />
//                 {!compact && <span className="text-xs">Zoom+</span>}
//               </button>
//               <button
//                 onClick={handleZoomOut}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Zoom out"
//               >
//                 <FiZoomOut size={14} />
//                 {!compact && <span className="text-xs">Zoom-</span>}
//               </button>
//               <button
//                 onClick={handleZoomReset}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Reset zoom"
//               >
//                 <FiRefreshCw size={14} />
//                 {!compact && <span className="text-xs">Reset</span>}
//               </button>
//             </div>
//           )}

//           {showColors && (
//             <div className="mt-2 grid grid-cols-7 gap-1 pt-2 border-t border-white/20">
//               {colors.map((c) => (
//                 <button
//                   key={c}
//                   onClick={() => {
//                     setBrushColor(c);
//                     setBrushToCanvas();
//                   }}
//                   className={`w-5 h-5 rounded border border-white/30 hover:border-white/50 transition-colors ${
//                     brushColor === c ? "ring-2 ring-white" : ""
//                   }`}
//                   style={{ backgroundColor: c }}
//                   title={c}
//                 />
//               ))}
//             </div>
//           )}

//           {showBrushSizes && (
//             <div className="mt-2 flex flex-wrap gap-1 pt-2 border-t border-white/20">
//               {brushSizes.map((s) => (
//                 <button
//                   key={s}
//                   onClick={() => {
//                     setBrushWidth(s);
//                     setBrushToCanvas();
//                   }}
//                   className={`px-2 py-1 rounded-md text-white text-xs border border-white/30 hover:bg-white/10 transition-colors ${
//                     brushWidth === s ? "bg-white/20" : ""
//                   }`}
//                 >
//                   {s}
//                 </button>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Canvas Container */}
//       <div ref={containerRef} className={`absolute inset-0 ${isFullscreen ? "p-0" : "p-2"}`}>
//         <div className="relative w-full h-full rounded-xl overflow-hidden bg-white shadow-lg">
//           {isLoading && (
//             <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
//               <div className="px-4 py-3 rounded-lg bg-black/80 text-white text-sm flex items-center gap-3">
//                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//                 Loading whiteboard...
//               </div>
//             </div>
//           )}
//           <canvas ref={canvasElRef} className="w-full h-full" />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default WhiteboardComponent;











// import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import * as fabric from "fabric";
// import * as Y from "yjs";
// import { WebsocketProvider } from "y-websocket";
// import { useAuth } from "../../../contexts/AuthContext";

// import {
//   FiSquare,
//   FiCircle,
//   FiType,
//   FiPenTool,
//   FiMousePointer,
//   FiTrash2,
//   FiDownload,
//   FiUpload,
//   FiZoomIn,
//   FiZoomOut,
//   FiMaximize2,
//   FiMinimize2,
//   FiMinus,
//   FiArrowRight,
//   FiX,
//   FiLock,
//   FiUnlock,
//   FiChevronLeft,
//   FiChevronRight,
//   FiRefreshCw,
//   FiImage,
// } from "react-icons/fi";
// import { FaUndo, FaRedo } from "react-icons/fa";
// import { BsEraser } from "react-icons/bs";
// import { LuStickyNote } from "react-icons/lu";

// /**
//  * ✅ WHITEBOARD COMPONENT - STREAMER VERSION
//  * - Extremely stable
//  * - No infinite loops
//  * - Proper Yjs initialization
//  * - Clean state management
//  */
// const WhiteboardComponent = ({
//   sessionId,
//   roomCode,
//   wsToken,
//   sessionInfo,
//   isActive,
//   onClose,
//   isStreamer = true, // ✅ STREAMER ke liye TRUE
//   allowViewersToDraw = true,
//   mainScreenMode = true,
//   compact = true,
// }) => {
//   const { user } = useAuth();

//   // =========================
//   // ✅ STABLE REFS (No re-renders)
//   // =========================
//   const isMountedRef = useRef(true);
//   const canvasElRef = useRef(null);
//   const containerRef = useRef(null);
//   const fabricCanvasRef = useRef(null);
//   const ydocRef = useRef(null);
//   const yProviderRef = useRef(null);
//   const initCompleteRef = useRef(false);
//   // ✅ ADD THIS LINE - Permissions ref
// const permissionsRef = useRef({
//   canDraw: true,
//   canAddObjects: true,
//   canDelete: true,
//   canEdit: true,
//   isViewer: false,
//   isStreamer: true
// });
  
//   // Tool ref for avoiding stale closures
//   const toolRef = useRef("select");
  
//   // Drawing settings refs
//   const brushWidthRef = useRef(5);
//   const brushColorRef = useRef("#000000");
//   const fillColorRef = useRef("#ffffff");
//   const opacityRef = useRef(1);
//   const fontSizeRef = useRef(20);
  
//   // History refs
//   const historyRef = useRef([]);
//   const historyIndexRef = useRef(-1);
//   const saveQueuedRef = useRef(false);
  
//   // Debounce refs
//   const syncTimeoutRef = useRef(null);
//   const resizeHandlerRef = useRef(null);
//   const loadTimeoutRef = useRef(null);

//   // =========================
//   // ✅ UI STATE
//   // =========================
//   const [tool, setTool] = useState("select");
//   const [brushWidth, setBrushWidth] = useState(5);
//   const [brushColor, setBrushColor] = useState("#000000");
//   const [fillColor, setFillColor] = useState("#ffffff");
//   const [opacity, setOpacity] = useState(1);
//   const [fontSize, setFontSize] = useState(20);
//   const [zoom, setZoom] = useState(1);
//   const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
//   const [isLoading, setIsLoading] = useState(true);
//   const [connectionStatus, setConnectionStatus] = useState("disconnected");
//   const [connectionError, setConnectionError] = useState(null);
//   const [roomSettings, setRoomSettings] = useState({
//     allowViewersToDraw,
//     streamerId: null,
//     streamerName: null,
//   });
//   const [activeUsers, setActiveUsers] = useState([]);
  
//   // UI toggles
//   const [showTools, setShowTools] = useState(true);
//   const [showColors, setShowColors] = useState(false);
//   const [showBrushSizes, setShowBrushSizes] = useState(false);
//   const [isFullscreen, setIsFullscreen] = useState(false);

//   // =========================
//   // ✅ MEMOIZED CONFIGS
//   // =========================
//   const tools = useMemo(() => [
//     { id: "select", name: "Select", icon: <FiMousePointer size={16} /> },
//     { id: "draw", name: "Draw", icon: <FiPenTool size={16} /> },
//     { id: "rectangle", name: "Rectangle", icon: <FiSquare size={16} /> },
//     { id: "circle", name: "Circle", icon: <FiCircle size={16} /> },
//     { id: "line", name: "Line", icon: <FiMinus size={16} /> },
//     { id: "arrow", name: "Arrow", icon: <FiArrowRight size={16} /> },
//     { id: "text", name: "Text", icon: <FiType size={16} /> },
//     { id: "sticky", name: "Sticky", icon: <LuStickyNote size={16} /> },
//     { id: "eraser", name: "Eraser", icon: <BsEraser size={16} /> },
//   ], []);

//   const colors = useMemo(() => [
//     "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF",
//     "#00FFFF", "#FFA500", "#800080", "#008000", "#800000", "#008080",
//     "#000080", "#808080",
//   ], []);

//   const brushSizes = useMemo(() => [1, 2, 3, 5, 8, 10, 15, 20, 30], []);

//   // =========================
//   // ✅ HELPER FUNCTIONS
//   // =========================
//   const getUserId = useCallback(() => {
//     return user?.id || user?._id || user?.email || `streamer_${Date.now()}`;
//   }, [user]);

//   const safeSetState = useCallback((fn) => {
//     if (isMountedRef.current) {
//       fn();
//     }
//   }, []);

//   // =========================
//   // ✅ WEBSOCKET URL - STREAMER
//   // =========================
//   const getWebSocketUrl = useCallback(() => {
//     const baseUrl = import.meta.env.VITE_WS_URL || "ws://localhost:9090";
    
//     if (!sessionId) {
//       setConnectionError("Session ID is required");
//       return null;
//     }
//     if (!wsToken) {
//       setConnectionError("Authentication token is required");
//       return null;
//     }

//     const queryParams = new URLSearchParams({
//       token: wsToken,
//       roomCode: roomCode || "",
//       userName: user?.name || user?.userName || "Streamer",
//       userId: getUserId(),
//       isStreamer: "true", // ✅ STREAMER - ALWAYS TRUE
//       allowViewersToDraw: String(!!allowViewersToDraw),
//       roomName: sessionInfo?.title || "Whiteboard Session",
//     });

//     return `${baseUrl}/yjs/${sessionId}?${queryParams.toString()}`;
//   }, [allowViewersToDraw, getUserId, roomCode, sessionId, sessionInfo?.title, user?.name, wsToken]);

//   // =========================
//   // ✅ HISTORY MANAGEMENT
//   // =========================
//   const saveState = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     if (saveQueuedRef.current) return;
//     saveQueuedRef.current = true;

//     queueMicrotask(() => {
//       saveQueuedRef.current = false;
//       const c = fabricCanvasRef.current;
//       if (!c) return;

//       try {
//         const state = c.toJSON(["id"]);
//         const hist = historyRef.current;
//         const idx = historyIndexRef.current;

//         const next = hist.slice(0, idx + 1);
//         next.push(state);

//         historyRef.current = next;
//         historyIndexRef.current = next.length - 1;
//       } catch (e) {
//         console.error("❌ saveState error:", e);
//       }
//     });
//   }, []);

//   const loadFromHistoryIndex = useCallback((idx) => {
//     const canvas = fabricCanvasRef.current;
//     const hist = historyRef.current;
//     if (!canvas || !hist[idx]) return;

//     try {
//       canvas.loadFromJSON(hist[idx], () => {
//         canvas.renderAll();
//       });
//     } catch (e) {
//       console.error("❌ loadFromHistoryIndex error:", e);
//     }
//   }, []);

//   const handleUndo = useCallback(() => {
//     const idx = historyIndexRef.current;
//     if (idx <= 0) return;

//     historyIndexRef.current = idx - 1;
//     loadFromHistoryIndex(idx - 1);
    
//     clearTimeout(syncTimeoutRef.current);
//     syncTimeoutRef.current = setTimeout(() => {
//       updateYjsCanvas();
//     }, 250);
//   }, [loadFromHistoryIndex]);

//   const handleRedo = useCallback(() => {
//     const hist = historyRef.current;
//     const idx = historyIndexRef.current;
//     if (idx >= hist.length - 1) return;

//     historyIndexRef.current = idx + 1;
//     loadFromHistoryIndex(idx + 1);
    
//     clearTimeout(syncTimeoutRef.current);
//     syncTimeoutRef.current = setTimeout(() => {
//       updateYjsCanvas();
//     }, 250);
//   }, [loadFromHistoryIndex]);

//   // =========================
//   // ✅ YJS SYNC FUNCTIONS
//   // =========================
//   const updateYjsCanvas = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     const ydoc = ydocRef.current;
//     if (!canvas || !ydoc) return;

//     try {
//       const json = canvas.toJSON(["id"]);
//       const yCanvasArray = ydoc.getArray("whiteboard");

//       const payload = {
//         ...json,
//         sessionId,
//         allowViewersToDraw: roomSettings.allowViewersToDraw,
//         lastUpdated: new Date().toISOString(),
//         updatedBy: getUserId(),
//         updatedByName: user?.name || "Streamer",
//         version: "5.3.0",
//       };

//       // Replace with new state
//       if (yCanvasArray.length > 0) {
//         yCanvasArray.delete(0, yCanvasArray.length);
//       }
//       yCanvasArray.push([payload]);
      
//       console.log("📤 Canvas state synced to Yjs");
//     } catch (e) {
//       console.error("❌ updateYjsCanvas error:", e);
//     }
//   }, [getUserId, roomSettings.allowViewersToDraw, sessionId, user?.name]);

//   const loadCanvasFromState = useCallback((state) => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas || !state) return;

//     try {
//       canvas.loadFromJSON(state, () => {
//         canvas.renderAll();
//         saveState();
//       });
//     } catch (e) {
//       console.error("❌ loadCanvasFromState error:", e);
//     }
//   }, [saveState]);

//   // =========================
//   // ✅ YJS INITIALIZATION - STREAMER (SIMPLE & STABLE)
//   // =========================
// // =========================
// // COMPLETELY FIXED: Yjs Initialization for STREAMER
// // ALWAYS create NEW Y.Doc - NEVER reuse existing!
// // =========================
// const initYjs = useCallback(() => {
//   // ✅ CRITICAL FIX #1: ALWAYS destroy old Y.Doc and provider FIRST
  
//   // Clean up provider first
//   if (yProviderRef.current) {
//     try {
//       console.log('🧹 [STREAMER] Destroying old YProvider');
//       yProviderRef.current.disconnect();
//       yProviderRef.current.destroy();
//     } catch (e) {
//       console.error('❌ [STREAMER] Error destroying provider:', e);
//     }
//     yProviderRef.current = null;
//   }
  
//   // Clean up Y.Doc
//   if (ydocRef.current) {
//     try {
//       console.log('🧹 [STREAMER] Destroying old Y.Doc with clientID:', ydocRef.current.clientID);
//       ydocRef.current.destroy();
//     } catch (e) {
//       console.error('❌ [STREAMER] Error destroying Y.Doc:', e);
//     }
//     ydocRef.current = null;
//   }

//   // Validate required props
//   if (!sessionId) {
//     console.error('❌ [STREAMER] Missing sessionId');
//     safeSetState(() => setIsLoading(false));
//     return;
//   }
  
//   if (!wsToken) {
//     console.error('❌ [STREAMER] Missing wsToken');
//     safeSetState(() => setIsLoading(false));
//     return;
//   }

//   // Build WebSocket URL
//   const wsUrl = getWebSocketUrl();
//   if (!wsUrl) {
//     console.error('❌ [STREAMER] Failed to create WebSocket URL');
//     safeSetState(() => setIsLoading(false));
//     return;
//   }

//   try {
//     // ✅ CRITICAL FIX #2: ALWAYS create BRAND NEW Y.Doc
//     console.log('📄 [STREAMER] Creating NEW Y.Doc');
//     const ydoc = new Y.Doc();
//     ydocRef.current = ydoc;
    
//     console.log('✅ [STREAMER] New Y.Doc created with clientID:', ydoc.clientID);

//     // Get Yjs shared data structures
//     const yCanvasArray = ydoc.getArray("whiteboard");
//     const yUsers = ydoc.getMap("users");
//     const ySettings = ydoc.getMap("room_settings");

//     // ✅ CRITICAL FIX #3: Create NEW WebSocketProvider
//     console.log('🔌 [STREAMER] Creating WebSocketProvider for session:', sessionId);
//     const provider = new WebsocketProvider(wsUrl, `whiteboard-${sessionId}`, ydoc, {
//       WebSocketPolyfill: WebSocket,
//       connect: true,
//       disableBc: true,
//       maxBackoffTime: 5000,
//     });

//     yProviderRef.current = provider;

//     // Handle connection status
//     provider.on("status", (event) => {
//       const status = event?.status || "unknown";
//       console.log('📡 [STREAMER] Yjs status:', status, 'Y.Doc clientID:', ydoc.clientID);
//       safeSetState(() => setConnectionStatus(status));
      
//       if (status === "connected") {
//         safeSetState(() => setIsLoading(false));
        
//         // ✅ Register streamer in users map
//         yUsers.set(getUserId(), {
//           name: user?.name || "Streamer",
//           id: getUserId(),
//           isStreamer: true,
//           isViewer: false,
//           permissions: permissionsRef.current,
//           joinedAt: new Date().toISOString(),
//           lastActive: new Date().toISOString(),
//           cursorPosition: { x: 0, y: 0 },
//           currentTool: toolRef.current || "select",
//           yjsClientId: ydoc.clientID,
//           connectionId: `${getUserId()}_${Date.now()}_${Math.random().toString(36).slice(2)}`
//         });
        
//         console.log('✅ [STREAMER] Registered with Yjs clientID:', ydoc.clientID);
//       }
//     });

//     // Handle connection errors
//     provider.on("connection-error", (error) => {
//       console.error("❌ [STREAMER] Yjs connection error:", error);
//       safeSetState(() => {
//         setConnectionError(error?.message || "Connection error");
//         setIsLoading(false);
//       });
//     });

//     // ✅ Streamer initializes room settings ONLY ONCE
//     provider.on("status", (event) => {
//       if (event?.status === "connected") {
//         // Check if settings already exist in THIS Y.Doc
//         if (ySettings.get("allowViewersToDraw") === undefined) {
//           console.log('🎨 [STREAMER] Initializing room settings:', {
//             allowViewersToDraw,
//             streamerId: getUserId(),
//             streamerName: user?.name || "Streamer"
//           });
          
//           ySettings.set("allowViewersToDraw", allowViewersToDraw);
//           ySettings.set("streamerId", getUserId());
//           ySettings.set("streamerName", user?.name || "Streamer");
//           ySettings.set("createdAt", new Date().toISOString());
//           ySettings.set("updatedAt", new Date().toISOString());
//         }
//       }
//     });

//     // ✅ Room settings observer
//     ySettings.observe((event) => {
//       try {
//         const s = ySettings.toJSON();
//         console.log('⚙️ [STREAMER] Room settings changed:', s);
        
//         safeSetState(() =>
//           setRoomSettings((prev) => ({
//             ...prev,
//             allowViewersToDraw: s.allowViewersToDraw ?? prev.allowViewersToDraw,
//             streamerId: s.streamerId ?? prev.streamerId,
//             streamerName: s.streamerName ?? prev.streamerName,
//           }))
//         );
//       } catch (error) {
//         console.error('❌ [STREAMER] Settings observer error:', error);
//       }
//     });

//     // ✅ Users observer
//     yUsers.observe(() => {
//       try {
//         const users = Array.from(yUsers.values());
//         const others = users.filter((u) => u.id !== getUserId());
//         safeSetState(() => setActiveUsers(others));
//       } catch (error) {
//         console.error('❌ [STREAMER] Users observer error:', error);
//       }
//     });

//     // ✅ Canvas observer - Receive updates from viewers
//     yCanvasArray.observe((event) => {
//       try {
//         if (yCanvasArray.length === 0) return;
        
//         const latest = yCanvasArray.get(yCanvasArray.length - 1);
//         if (!latest) return;

//         // Don't re-apply our own updates
//         if (latest.updatedBy === getUserId()) {
//           return;
//         }

//         console.log('📥 [STREAMER] Loading canvas from viewer:', {
//           updatedBy: latest.updatedBy,
//           objects: latest.objects?.length || 0
//         });

//         // Only load if viewers are allowed to draw
//         if (roomSettings.allowViewersToDraw) {
//           loadCanvasFromState(latest);
//         }
        
//       } catch (error) {
//         console.error('❌ [STREAMER] Canvas observer error:', error);
//       }
//     });

//     // ✅ Initialize canvas state if empty
//     if (yCanvasArray.length === 0) {
//       console.log('🆕 [STREAMER] Creating initial canvas state');
      
//       const initialState = {
//         version: "5.3.0",
//         objects: [],
//         background: "#ffffff",
//         sessionId,
//         allowViewersToDraw,
//         createdAt: new Date().toISOString(),
//         updatedBy: getUserId(),
//         updatedByName: user?.name || "Streamer"
//       };
      
//       yCanvasArray.insert(0, [initialState]);
//       console.log('✅ [STREAMER] Initial canvas state created');
      
//     } else {
//       console.log('📥 [STREAMER] Existing canvas state found with', 
//         yCanvasArray.length, 'states');
      
//       // Load the latest state
//       const latestState = yCanvasArray.get(yCanvasArray.length - 1);
//       loadCanvasFromState(latestState);
//     }

//     console.log('✅ [STREAMER] Yjs initialized successfully with clientID:', ydoc.clientID);
    
//   } catch (err) {
//     console.error("❌ [STREAMER] initYjs error:", err);
//     safeSetState(() => {
//       setConnectionError(err?.message || "Initialization error");
//       setIsLoading(false);
//     });
//   }
// }, [
//   allowViewersToDraw,
//   getWebSocketUrl,
//   loadCanvasFromState,
//   roomSettings.allowViewersToDraw,
//   sessionId,
//   user?.name,
//   wsToken,
//   getUserId
// ]);
//   // =========================
//   // ✅ FABRIC CANVAS INITIALIZATION
//   // =========================
//   const initCanvas = useCallback(() => {
//     if (!containerRef.current || !canvasElRef.current) return;

//     // Clean up existing canvas
//     if (fabricCanvasRef.current) {
//       fabricCanvasRef.current.dispose();
//       fabricCanvasRef.current = null;
//     }

//     const container = containerRef.current;
    
//     try {
//       const canvas = new fabric.Canvas(canvasElRef.current, {
//         width: container.clientWidth,
//         height: container.clientHeight,
//         backgroundColor: "#ffffff",
//         selection: true,
//         preserveObjectStacking: true,
//         renderOnAddRemove: true,
//       });

//       fabricCanvasRef.current = canvas;

//       // Setup brush
//       canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
//       canvas.freeDrawingBrush.width = brushWidthRef.current;
//       canvas.freeDrawingBrush.color = brushColorRef.current;

//       // Mouse move - cursor position
//       canvas.on("mouse:move", (e) => {
//         if (!e.absolutePointer) return;
//         safeSetState(() =>
//           setCursorPosition({
//             x: Math.round(e.absolutePointer.x),
//             y: Math.round(e.absolutePointer.y),
//           })
//         );
//       });

//       // Object added
//       canvas.on("object:added", (e) => {
//         if (e.target && !e.target.id) {
//           e.target.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2)}`;
//         }
//         saveState();
//       });

//       // Object modified
//       canvas.on("object:modified", () => {
//         saveState();
//         clearTimeout(syncTimeoutRef.current);
//         syncTimeoutRef.current = setTimeout(() => {
//           updateYjsCanvas();
//         }, 400);
//       });

//       // Object removed
//       canvas.on("object:removed", () => {
//         saveState();
//         clearTimeout(syncTimeoutRef.current);
//         syncTimeoutRef.current = setTimeout(() => {
//           updateYjsCanvas();
//         }, 400);
//       });

//       // Path created
//       canvas.on("path:created", (e) => {
//         if (e.path && !e.path.id) {
//           e.path.id = `path_${Date.now()}_${Math.random().toString(36).slice(2)}`;
//         }
//         saveState();
//       });

//       // Mouse up - trigger sync
//       canvas.on("mouse:up", () => {
//         clearTimeout(syncTimeoutRef.current);
//         syncTimeoutRef.current = setTimeout(() => {
//           updateYjsCanvas();
//         }, 300);
//       });

//       // Window resize handler
//       const handleResize = () => {
//         const c = fabricCanvasRef.current;
//         const ctr = containerRef.current;
//         if (!c || !ctr) return;
//         c.setDimensions({
//           width: ctr.clientWidth,
//           height: ctr.clientHeight,
//         });
//         c.renderAll();
//       };

//       resizeHandlerRef.current = handleResize;
//       window.addEventListener("resize", handleResize);

//       // Initial save
//       saveState();
      
//       console.log("✅ Fabric canvas initialized");
      
//     } catch (error) {
//       console.error("❌ Canvas initialization error:", error);
//     }
//   }, [saveState, updateYjsCanvas, safeSetState]);

//   // =========================
//   // ✅ TOOL FUNCTIONS
//   // =========================
//   const setBrushToCanvas = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;
    
//     if (!canvas.freeDrawingBrush) {
//       canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
//     }
//     canvas.freeDrawingBrush.width = brushWidthRef.current;
//     canvas.freeDrawingBrush.color = brushColorRef.current;
//   }, []);

//   const addRectangle = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     const rect = new fabric.Rect({
//       left: 120,
//       top: 120,
//       width: 180,
//       height: 120,
//       fill: fillColorRef.current,
//       stroke: brushColorRef.current,
//       strokeWidth: brushWidthRef.current,
//       opacity: opacityRef.current,
//       selectable: true,
//       id: `rect_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });

//     canvas.add(rect);
//     canvas.setActiveObject(rect);
//     canvas.renderAll();
//     setTool("select");
//     setTimeout(updateYjsCanvas, 100);
//   }, [updateYjsCanvas]);

//   const addCircle = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     const circle = new fabric.Circle({
//       left: 140,
//       top: 140,
//       radius: 70,
//       fill: fillColorRef.current,
//       stroke: brushColorRef.current,
//       strokeWidth: brushWidthRef.current,
//       opacity: opacityRef.current,
//       selectable: true,
//       id: `circle_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });

//     canvas.add(circle);
//     canvas.setActiveObject(circle);
//     canvas.renderAll();
//     setTool("select");
//     setTimeout(updateYjsCanvas, 100);
//   }, [updateYjsCanvas]);

//   const addText = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     const text = new fabric.IText("Double click to edit", {
//       left: 140,
//       top: 140,
//       fontSize: fontSizeRef.current,
//       fill: brushColorRef.current,
//       selectable: true,
//       id: `text_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });

//     canvas.add(text);
//     canvas.setActiveObject(text);
//     canvas.renderAll();
//     setTool("select");
//     setTimeout(updateYjsCanvas, 100);
//   }, [updateYjsCanvas]);

//   const addSticky = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     const bg = new fabric.Rect({
//       left: 120,
//       top: 120,
//       width: 220,
//       height: 150,
//       fill: "#ffff88",
//       stroke: "#d4d4d4",
//       strokeWidth: 1,
//       opacity: 0.92,
//       selectable: true,
//       id: `sticky_bg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });

//     const tx = new fabric.IText("Edit note...", {
//       left: 130,
//       top: 130,
//       fontSize: 16,
//       fill: "#000000",
//       selectable: true,
//       id: `sticky_text_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });

//     const group = new fabric.Group([bg, tx], {
//       left: 120,
//       top: 120,
//       selectable: true,
//       id: `sticky_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });

//     canvas.add(group);
//     canvas.setActiveObject(group);
//     canvas.renderAll();
//     setTool("select");
//     setTimeout(updateYjsCanvas, 100);
//   }, [updateYjsCanvas]);

//   const startLineMode = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     canvas.isDrawingMode = false;
//     canvas.selection = false;

//     let line = null;
//     let isDown = false;

//     const onMouseDown = (opt) => {
//       isDown = true;
//       const pointer = canvas.getPointer(opt.e);
//       line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
//         stroke: brushColorRef.current,
//         strokeWidth: brushWidthRef.current,
//         opacity: opacityRef.current,
//         selectable: true,
//         id: `line_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//       });
//       canvas.add(line);
//     };

//     const onMouseMove = (opt) => {
//       if (!isDown || !line) return;
//       const pointer = canvas.getPointer(opt.e);
//       line.set({ x2: pointer.x, y2: pointer.y });
//       canvas.renderAll();
//     };

//     const onMouseUp = () => {
//       isDown = false;
//       canvas.off("mouse:down", onMouseDown);
//       canvas.off("mouse:move", onMouseMove);
//       canvas.off("mouse:up", onMouseUp);
//       canvas.selection = true;
//       setTool("select");
//       setTimeout(updateYjsCanvas, 100);
//     };

//     canvas.on("mouse:down", onMouseDown);
//     canvas.on("mouse:move", onMouseMove);
//     canvas.on("mouse:up", onMouseUp);
//   }, [updateYjsCanvas]);

//   const startArrowMode = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     canvas.isDrawingMode = false;
//     canvas.selection = false;

//     let isDown = false;
//     let shaft = null;
//     let head = null;

//     const onMouseDown = (opt) => {
//       isDown = true;
//       const pointer = canvas.getPointer(opt.e);

//       shaft = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
//         stroke: brushColorRef.current,
//         strokeWidth: brushWidthRef.current,
//         opacity: opacityRef.current,
//         selectable: false,
//       });

//       head = new fabric.Triangle({
//         left: pointer.x,
//         top: pointer.y,
//         width: 14,
//         height: 14,
//         fill: brushColorRef.current,
//         angle: 0,
//         originX: "center",
//         originY: "center",
//         selectable: false,
//       });

//       canvas.add(shaft);
//       canvas.add(head);
//     };

//     const onMouseMove = (opt) => {
//       if (!isDown || !shaft || !head) return;
//       const pointer = canvas.getPointer(opt.e);
      
//       shaft.set({ x2: pointer.x, y2: pointer.y });

//       const dx = pointer.x - shaft.x1;
//       const dy = pointer.y - shaft.y1;
//       const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

//       head.set({
//         left: pointer.x,
//         top: pointer.y,
//         angle: angle + 90,
//       });
      
//       canvas.renderAll();
//     };

//     const onMouseUp = () => {
//       isDown = false;

//       if (shaft && head) {
//         const group = new fabric.Group([shaft, head], {
//           selectable: true,
//           id: `arrow_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//         });
//         canvas.remove(shaft);
//         canvas.remove(head);
//         canvas.add(group);
//       }

//       canvas.off("mouse:down", onMouseDown);
//       canvas.off("mouse:move", onMouseMove);
//       canvas.off("mouse:up", onMouseUp);
//       canvas.selection = true;
//       setTool("select");
//       setTimeout(updateYjsCanvas, 100);
//     };

//     canvas.on("mouse:down", onMouseDown);
//     canvas.on("mouse:move", onMouseMove);
//     canvas.on("mouse:up", onMouseUp);
//   }, [updateYjsCanvas]);

//   const activateEraser = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     canvas.isDrawingMode = false;
//     canvas.selection = false;

//     const onMouseDown = (opt) => {
//       const pointer = canvas.getPointer(opt.e);
//       const objects = canvas.getObjects();
      
//       let removed = false;
//       objects.forEach((obj) => {
//         if (obj.containsPoint && obj.containsPoint(pointer)) {
//           canvas.remove(obj);
//           removed = true;
//         }
//       });

//       if (removed) {
//         canvas.renderAll();
//         setTimeout(updateYjsCanvas, 100);
//       }
//     };

//     canvas.on("mouse:down", onMouseDown);

//     // Auto-disable after 5 seconds
//     setTimeout(() => {
//       canvas.off("mouse:down", onMouseDown);
//       canvas.selection = true;
//       setTool("select");
//     }, 5000);
//   }, [updateYjsCanvas]);

//   const handleToolSelect = useCallback((toolId) => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     toolRef.current = toolId;
//     setTool(toolId);

//     switch (toolId) {
//       case "select":
//         canvas.isDrawingMode = false;
//         canvas.selection = true;
//         break;
        
//       case "draw":
//         canvas.selection = false;
//         canvas.isDrawingMode = true;
//         setBrushToCanvas();
//         break;
        
//       case "rectangle":
//         addRectangle();
//         break;
        
//       case "circle":
//         addCircle();
//         break;
        
//       case "line":
//         startLineMode();
//         break;
        
//       case "arrow":
//         startArrowMode();
//         break;
        
//       case "text":
//         addText();
//         break;
        
//       case "sticky":
//         addSticky();
//         break;
        
//       case "eraser":
//         activateEraser();
//         break;
        
//       default:
//         break;
//     }
//   }, [activateEraser, addCircle, addRectangle, addSticky, addText, setBrushToCanvas, startArrowMode, startLineMode]);

//   // =========================
//   // ✅ EXPORT/IMPORT/CLEAR/DELETE
//   // =========================
//   const exportAsImage = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;
    
//     const dataURL = canvas.toDataURL({
//       format: "png",
//       quality: 1,
//       multiplier: 2,
//     });
    
//     const link = document.createElement("a");
//     link.href = dataURL;
//     link.download = `whiteboard-${sessionInfo?.title || "session"}-${new Date().toISOString().slice(0, 10)}.png`;
//     link.click();
//   }, [sessionInfo?.title]);

//   const exportAsJSON = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;
    
//     const json = canvas.toJSON(["id"]);
//     const dataStr = JSON.stringify(json, null, 2);
//     const blob = new Blob([dataStr], { type: "application/json" });
//     const url = URL.createObjectURL(blob);
    
//     const link = document.createElement("a");
//     link.href = url;
//     link.download = `whiteboard-${sessionInfo?.title || "session"}-${new Date().toISOString().slice(0, 10)}.json`;
//     link.click();
    
//     URL.revokeObjectURL(url);
//   }, [sessionInfo?.title]);

//   const importFromJSON = useCallback(() => {
//     const input = document.createElement("input");
//     input.type = "file";
//     input.accept = ".json,application/json";
    
//     input.onchange = (e) => {
//       const file = e.target.files?.[0];
//       if (!file) return;
      
//       const reader = new FileReader();
//       reader.onload = (ev) => {
//         try {
//           const json = JSON.parse(ev.target.result);
//           const canvas = fabricCanvasRef.current;
//           if (!canvas) return;
          
//           canvas.loadFromJSON(json, () => {
//             canvas.renderAll();
//             saveState();
//             setTimeout(updateYjsCanvas, 200);
//           });
//         } catch (error) {
//           alert("Invalid JSON file: " + error.message);
//         }
//       };
//       reader.readAsText(file);
//     };
    
//     input.click();
//   }, [saveState, updateYjsCanvas]);

//   const handleClear = useCallback(() => {
//     if (!window.confirm("Are you sure you want to clear the whiteboard?")) return;
    
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;
    
//     canvas.clear();
//     canvas.backgroundColor = "#ffffff";
//     canvas.renderAll();
//     saveState();
//     setTimeout(updateYjsCanvas, 200);
//   }, [saveState, updateYjsCanvas]);

//   const deleteSelected = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;
    
//     const activeObject = canvas.getActiveObject();
//     if (!activeObject) return;
    
//     canvas.remove(activeObject);
//     canvas.discardActiveObject();
//     canvas.renderAll();
//     saveState();
//     setTimeout(updateYjsCanvas, 200);
//   }, [saveState, updateYjsCanvas]);

//   // =========================
//   // ✅ TOGGLE VIEWER DRAW
//   // =========================
//   const toggleViewersDraw = useCallback(() => {
//     const ydoc = ydocRef.current;
//     if (!ydoc) return;
    
//     const ySettings = ydoc.getMap("room_settings");
//     const newValue = !roomSettings.allowViewersToDraw;
    
//     ySettings.set("allowViewersToDraw", newValue);
//     ySettings.set("updatedAt", new Date().toISOString());
//     ySettings.set("updatedBy", getUserId());
    
//     console.log("🎨 Viewers draw toggled:", newValue ? "ENABLED" : "DISABLED");
//   }, [getUserId, roomSettings.allowViewersToDraw]);

//   // =========================
//   // ✅ ZOOM FUNCTIONS
//   // =========================
//   const handleZoomIn = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;
    
//     const newZoom = Math.min(zoom * 1.2, 5);
//     setZoom(newZoom);
//     canvas.setZoom(newZoom);
//     canvas.renderAll();
//   }, [zoom]);

//   const handleZoomOut = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;
    
//     const newZoom = Math.max(zoom / 1.2, 0.2);
//     setZoom(newZoom);
//     canvas.setZoom(newZoom);
//     canvas.renderAll();
//   }, [zoom]);

//   const handleZoomReset = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;
    
//     setZoom(1);
//     canvas.setZoom(1);
//     canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
//     canvas.renderAll();
//   }, []);

//   const toggleFullscreen = useCallback(() => {
//     setIsFullscreen(prev => !prev);
//   }, []);

//   // =========================
//   // ✅ SYNC REFS WITH STATE
//   // =========================
//   useEffect(() => { brushWidthRef.current = brushWidth; }, [brushWidth]);
//   useEffect(() => { brushColorRef.current = brushColor; }, [brushColor]);
//   useEffect(() => { fillColorRef.current = fillColor; }, [fillColor]);
//   useEffect(() => { opacityRef.current = opacity; }, [opacity]);
//   useEffect(() => { fontSizeRef.current = fontSize; }, [fontSize]);

//   // =========================
//   // ✅ LIFECYCLE - MOUNT
//   // =========================
//   useEffect(() => {
//     isMountedRef.current = true;
//     return () => {
//       isMountedRef.current = false;
//     };
//   }, []);

//   // =========================
//   // ✅ LIFECYCLE - INITIALIZATION
//   // =========================
//   useEffect(() => {
//     if (!isActive) return;

//     // Reset initialization flag
//     initCompleteRef.current = false;
    
//     safeSetState(() => {
//       setIsLoading(true);
//       setConnectionStatus("connecting");
//       setConnectionError(null);
//     });

//     // Initialize canvas immediately
//     initCanvas();

//     // Initialize Yjs after a short delay
//     const timer = setTimeout(() => {
//       initYjs();
//     }, 500);

//     return () => {
//       clearTimeout(timer);
//       clearTimeout(syncTimeoutRef.current);
//       clearTimeout(loadTimeoutRef.current);
//     };
//   }, [initCanvas, initYjs, isActive, safeSetState]);

//   // =========================
//   // ✅ LIFECYCLE - CLEANUP
//   // =========================
//   useEffect(() => {
//     return () => {
//       console.log("🧹 Cleaning up WhiteboardComponent...");
      
//       // Remove resize listener
//       if (resizeHandlerRef.current) {
//         window.removeEventListener("resize", resizeHandlerRef.current);
//       }

//       // Clean up Yjs provider
//       if (yProviderRef.current) {
//         try {
//           yProviderRef.current.disconnect();
//           yProviderRef.current.destroy();
//         } catch (e) {
//           console.error("Error cleaning up provider:", e);
//         }
//         yProviderRef.current = null;
//       }

//       // Clean up Y.Doc
//       if (ydocRef.current) {
//         try {
//           ydocRef.current.destroy();
//         } catch (e) {
//           console.error("Error cleaning up Y.Doc:", e);
//         }
//         ydocRef.current = null;
//       }

//       // Clean up Fabric canvas
//       if (fabricCanvasRef.current) {
//         try {
//           fabricCanvasRef.current.dispose();
//         } catch (e) {
//           console.error("Error cleaning up canvas:", e);
//         }
//         fabricCanvasRef.current = null;
//       }
//     };
//   }, []);

//   // =========================
//   // ✅ RENDER - UI
//   // =========================
//   return (
//     <div className={`relative w-full h-full ${mainScreenMode ? "bg-black/10" : "bg-black/30"}`}>
//       {/* Header */}
//       <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <div className="px-3 py-1 rounded-lg bg-black/60 text-white text-xs flex items-center gap-2">
//             <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`} />
//             WB • {connectionStatus}
//           </div>
//           <div className="px-3 py-1 rounded-lg bg-black/60 text-white text-xs">
//             {cursorPosition.x}, {cursorPosition.y} • {zoom.toFixed(2)}x
//           </div>
//           {connectionError && (
//             <div className="px-3 py-1 rounded-lg bg-red-600/80 text-white text-xs">
//               ⚠️ {connectionError}
//             </div>
//           )}
//           {activeUsers.length > 0 && (
//             <div className="px-3 py-1 rounded-lg bg-black/60 text-white text-xs">
//               👥 {activeUsers.length} viewer{activeUsers.length !== 1 ? 's' : ''}
//             </div>
//           )}
//         </div>

//         <div className="flex items-center gap-2">
//           <button
//             onClick={toggleViewersDraw}
//             className="px-3 py-1 rounded-lg bg-black/60 text-white text-xs flex items-center gap-2 hover:bg-black/70 transition-colors"
//             title={roomSettings.allowViewersToDraw ? "Disable viewer drawing" : "Enable viewer drawing"}
//           >
//             {roomSettings.allowViewersToDraw ? <FiUnlock size={14} /> : <FiLock size={14} />}
//             <span className="hidden sm:inline">
//               Viewers: {roomSettings.allowViewersToDraw ? "Can draw" : "View only"}
//             </span>
//           </button>

//           <button
//             onClick={toggleFullscreen}
//             className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/70 transition-colors"
//             title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
//           >
//             {isFullscreen ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
//           </button>

//           <button
//             onClick={onClose}
//             className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/70 transition-colors"
//             title="Close whiteboard"
//           >
//             <FiX size={16} />
//           </button>
//         </div>
//       </div>

//       {/* Floating Toolbar */}
//       <div className="absolute top-14 right-2 z-20 flex flex-col gap-2">
//         <div className="flex flex-col rounded-xl bg-black/60 backdrop-blur-sm p-2">
//           <div className="flex items-center justify-between gap-2 px-1 pb-2 border-b border-white/20">
//             <button
//               className="text-white/90 hover:text-white p-1"
//               onClick={() => setShowTools(prev => !prev)}
//               title="Toggle tools"
//             >
//               {showTools ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
//             </button>

//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => setShowColors(prev => !prev)}
//                 className="w-6 h-6 rounded-md border-2 border-white/30 hover:border-white/50 transition-colors"
//                 style={{ backgroundColor: brushColor }}
//                 title="Select color"
//               />
//               <button
//                 onClick={() => setShowBrushSizes(prev => !prev)}
//                 className="w-6 h-6 rounded-md border border-white/30 text-white text-xs flex items-center justify-center hover:bg-white/10 transition-colors"
//                 title="Brush size"
//               >
//                 {brushWidth}
//               </button>
//             </div>
//           </div>

//           {showTools && (
//             <div className="flex flex-col gap-1 pt-2">
//               {tools.map((t) => (
//                 <button
//                   key={t.id}
//                   onClick={() => handleToolSelect(t.id)}
//                   className={`flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors ${
//                     tool === t.id ? "bg-white/20" : ""
//                   }`}
//                   title={t.name}
//                 >
//                   {t.icon}
//                   {!compact && <span className="text-xs">{t.name}</span>}
//                 </button>
//               ))}

//               <div className="my-1 h-px bg-white/20" />

//               <button
//                 onClick={handleUndo}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Undo"
//               >
//                 <FaUndo size={14} />
//                 {!compact && <span className="text-xs">Undo</span>}
//               </button>
//               <button
//                 onClick={handleRedo}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Redo"
//               >
//                 <FaRedo size={14} />
//                 {!compact && <span className="text-xs">Redo</span>}
//               </button>

//               <div className="my-1 h-px bg-white/20" />

//               <button
//                 onClick={deleteSelected}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Delete selected"
//               >
//                 <FiTrash2 size={14} />
//                 {!compact && <span className="text-xs">Delete</span>}
//               </button>

//               <button
//                 onClick={handleClear}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Clear all"
//               >
//                 <FiRefreshCw size={14} />
//                 {!compact && <span className="text-xs">Clear</span>}
//               </button>

//               <div className="my-1 h-px bg-white/20" />

//               <button
//                 onClick={exportAsImage}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Export as PNG"
//               >
//                 <FiDownload size={14} />
//                 {!compact && <span className="text-xs">PNG</span>}
//               </button>

//               <button
//                 onClick={exportAsJSON}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Export as JSON"
//               >
//                 <FiDownload size={14} />
//                 {!compact && <span className="text-xs">JSON</span>}
//               </button>

//               <button
//                 onClick={importFromJSON}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Import JSON"
//               >
//                 <FiUpload size={14} />
//                 {!compact && <span className="text-xs">Import</span>}
//               </button>

//               <div className="my-1 h-px bg-white/20" />

//               <button
//                 onClick={handleZoomIn}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Zoom in"
//               >
//                 <FiZoomIn size={14} />
//                 {!compact && <span className="text-xs">Zoom+</span>}
//               </button>
//               <button
//                 onClick={handleZoomOut}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Zoom out"
//               >
//                 <FiZoomOut size={14} />
//                 {!compact && <span className="text-xs">Zoom-</span>}
//               </button>
//               <button
//                 onClick={handleZoomReset}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
//                 title="Reset zoom"
//               >
//                 <FiRefreshCw size={14} />
//                 {!compact && <span className="text-xs">Reset</span>}
//               </button>
//             </div>
//           )}

//           {showColors && (
//             <div className="mt-2 grid grid-cols-7 gap-1 pt-2 border-t border-white/20">
//               {colors.map((c) => (
//                 <button
//                   key={c}
//                   onClick={() => {
//                     setBrushColor(c);
//                     setBrushToCanvas();
//                   }}
//                   className={`w-5 h-5 rounded border border-white/30 hover:border-white/50 transition-colors ${
//                     brushColor === c ? "ring-2 ring-white" : ""
//                   }`}
//                   style={{ backgroundColor: c }}
//                   title={c}
//                 />
//               ))}
//             </div>
//           )}

//           {showBrushSizes && (
//             <div className="mt-2 flex flex-wrap gap-1 pt-2 border-t border-white/20">
//               {brushSizes.map((s) => (
//                 <button
//                   key={s}
//                   onClick={() => {
//                     setBrushWidth(s);
//                     setBrushToCanvas();
//                   }}
//                   className={`px-2 py-1 rounded-md text-white text-xs border border-white/30 hover:bg-white/10 transition-colors ${
//                     brushWidth === s ? "bg-white/20" : ""
//                   }`}
//                 >
//                   {s}
//                 </button>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Canvas Container */}
//       <div
//         ref={containerRef}
//         className={`absolute inset-0 ${isFullscreen ? "p-0" : "p-2"}`}
//       >
//         <div className="relative w-full h-full rounded-xl overflow-hidden bg-white shadow-lg">
//           {isLoading && (
//             <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
//               <div className="px-4 py-3 rounded-lg bg-black/80 text-white text-sm flex items-center gap-3">
//                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//                 Loading whiteboard...
//               </div>
//             </div>
//           )}
//           <canvas ref={canvasElRef} className="w-full h-full" />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default WhiteboardComponent;











// import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import * as fabric from "fabric";
// import * as Y from "yjs";
// import { WebsocketProvider } from "y-websocket";
// import { useAuth } from "../../../contexts/AuthContext";

// import {
//   FiSquare,
//   FiCircle,
//   FiType,
//   FiPenTool,
//   FiMousePointer,
//   FiTrash2,
//   FiDownload,
//   FiUpload,
//   FiZoomIn,
//   FiZoomOut,
//   FiMaximize2,
//   FiMinimize2,
//   FiMinus,
//   FiArrowRight,
//   FiX,
//   FiLock,
//   FiUnlock,
//   FiChevronLeft,
//   FiChevronRight,
//   FiRefreshCw,
//   FiImage,
// } from "react-icons/fi";
// import { FaUndo, FaRedo } from "react-icons/fa";
// import { BsEraser } from "react-icons/bs";
// import { LuStickyNote } from "react-icons/lu";

// /**
//  * WhiteboardComponent (Fixed)
//  * - New UI style (compact toolbar)
//  * - Old stability (debounced sync on mouse:up, no infinite setState loop)
//  */
// const WhiteboardComponent = ({
//   sessionId,
//   roomCode,
//   wsToken,
//   sessionInfo,
//   isActive,
//   onClose,
//   isStreamer = false,
//   allowViewersToDraw = true,
//   mainScreenMode = true,
//   compact = true,
// }) => {
//   const { user } = useAuth();

//   // =========================
//   // Refs
//   // =========================
//   const isMountedRef = useRef(false);

//   const canvasElRef = useRef(null);
//   const containerRef = useRef(null);
//   const fabricCanvasRef = useRef(null);

//   const ydocRef = useRef(null);
//   const yProviderRef = useRef(null);

//   // Stable refs for frequently-changing values (avoid re-registering listeners)
//   const brushWidthRef = useRef(5);
//   const brushColorRef = useRef("#000000");
//   const fillColorRef = useRef("#ffffff");
//   const opacityRef = useRef(1);
//   const fontSizeRef = useRef(20);

//   const permissionsRef = useRef({
//     canDraw: isStreamer,
//     canEdit: isStreamer,
//     canDelete: isStreamer,
//     canClear: isStreamer,
//     canExport: true,
//     canImport: isStreamer,
//   });

//   // Undo/Redo history in refs (NO render-loop)
//   const historyRef = useRef([]);
//   const historyIndexRef = useRef(-1);
//   const saveQueuedRef = useRef(false);

//   // Debounce timers
//   const syncTimeoutRef = useRef(null);
//   const resizeHandlerRef = useRef(null);

//   // =========================
//   // UI State
//   // =========================
//   const [tool, setTool] = useState("select");
//   const [brushWidth, setBrushWidth] = useState(5);
//   const [brushColor, setBrushColor] = useState("#000000");
//   const [fillColor, setFillColor] = useState("#ffffff");
//   const [opacity, setOpacity] = useState(1);
//   const [fontSize, setFontSize] = useState(20);

//   const [zoom, setZoom] = useState(1);
//   const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

//   const [isLoading, setIsLoading] = useState(true);
//   const [connectionStatus, setConnectionStatus] = useState("disconnected");

//   const [roomSettings, setRoomSettings] = useState({
//     allowViewersToDraw,
//     streamerId: null,
//     streamerName: null,
//   });

//   // Compact UI toggles
//   const [showTools, setShowTools] = useState(true);
//   const [showColors, setShowColors] = useState(false);
//   const [showBrushSizes, setShowBrushSizes] = useState(false);
//   const [isFullscreen, setIsFullscreen] = useState(false);

//   // =========================
//   // Memo: Tools config
//   // =========================
//   const tools = useMemo(
//     () => [
//       { id: "select", name: "Select", icon: <FiMousePointer size={16} /> },
//       { id: "draw", name: "Draw", icon: <FiPenTool size={16} /> },
//       { id: "rectangle", name: "Rectangle", icon: <FiSquare size={16} /> },
//       { id: "circle", name: "Circle", icon: <FiCircle size={16} /> },
//       { id: "line", name: "Line", icon: <FiMinus size={16} /> },
//       { id: "arrow", name: "Arrow", icon: <FiArrowRight size={16} /> },
//       { id: "text", name: "Text", icon: <FiType size={16} /> },
//       { id: "sticky", name: "Sticky", icon: <LuStickyNote size={16} /> },
//       { id: "eraser", name: "Eraser", icon: <BsEraser size={16} /> },
//     ],
//     []
//   );

//   const colors = useMemo(
//     () => [
//       "#000000",
//       "#FF0000",
//       "#00FF00",
//       "#0000FF",
//       "#FFFF00",
//       "#FF00FF",
//       "#00FFFF",
//       "#FFA500",
//       "#800080",
//       "#008000",
//       "#800000",
//       "#008080",
//       "#000080",
//       "#808080",
//     ],
//     []
//   );

//   const brushSizes = useMemo(() => [1, 2, 3, 5, 8, 10, 15, 20, 30], []);

//   // =========================
//   // Keep refs updated
//   // =========================
//   useEffect(() => {
//     brushWidthRef.current = brushWidth;
//   }, [brushWidth]);
//   useEffect(() => {
//     brushColorRef.current = brushColor;
//   }, [brushColor]);
//   useEffect(() => {
//     fillColorRef.current = fillColor;
//   }, [fillColor]);
//   useEffect(() => {
//     opacityRef.current = opacity;
//   }, [opacity]);
//   useEffect(() => {
//     fontSizeRef.current = fontSize;
//   }, [fontSize]);

//   // Permissions derived from settings
//   useEffect(() => {
//     const perms = {
//       canDraw: isStreamer || !!roomSettings.allowViewersToDraw,
//       canEdit: isStreamer || !!roomSettings.allowViewersToDraw,
//       canDelete: isStreamer,
//       canClear: isStreamer,
//       canExport: true,
//       canImport: isStreamer,
//     };
//     permissionsRef.current = perms;
//   }, [isStreamer, roomSettings.allowViewersToDraw]);

//   // =========================
//   // Helpers
//   // =========================
//   const getUserId = () => user?.id || user?._id || "anonymous";

//   const getWebSocketUrl = useCallback(() => {
//     const baseUrl = import.meta.env.VITE_WS_URL || "ws://localhost:9090";
//     if (!sessionId || !wsToken) return null;

//     const queryParams = new URLSearchParams({
//       token: wsToken,
//       roomCode: roomCode || "",
//       userName: user?.name || "Anonymous",
//       userId: getUserId(),
//       isStreamer: String(!!isStreamer),
//       allowViewersToDraw: String(!!allowViewersToDraw),
//       roomName: sessionInfo?.title || "Whiteboard Session",
//     });

//     return `${baseUrl}/yjs/${sessionId}?${queryParams.toString()}`;
//   }, [allowViewersToDraw, isStreamer, roomCode, sessionId, sessionInfo?.title, user?.name, wsToken]);

//   const safeSetState = (setter) => {
//     if (isMountedRef.current) setter();
//   };

//   // =========================
//   // History / SaveState (SAFE)
//   // =========================
//   const saveState = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     // throttle: avoid saving multiple times in same tick (prevents depth loops)
//     if (saveQueuedRef.current) return;
//     saveQueuedRef.current = true;

//     queueMicrotask(() => {
//       saveQueuedRef.current = false;
//       const c = fabricCanvasRef.current;
//       if (!c) return;

//       const state = c.toJSON(["id"]);
//       const hist = historyRef.current;
//       const idx = historyIndexRef.current;

//       const next = hist.slice(0, idx + 1);
//       next.push(state);

//       historyRef.current = next;
//       historyIndexRef.current = next.length - 1;
//     });
//   }, []);

//   const loadFromHistoryIndex = useCallback(
//     (idx) => {
//       const canvas = fabricCanvasRef.current;
//       const hist = historyRef.current;
//       if (!canvas) return;
//       if (!hist[idx]) return;

//       canvas.loadFromJSON(hist[idx], () => {
//         canvas.renderAll();
//       });
//     },
//     []
//   );

//   const handleUndo = useCallback(() => {
//     if (!permissionsRef.current.canEdit) return;
//     const idx = historyIndexRef.current;
//     if (idx <= 0) return;

//     const nextIdx = idx - 1;
//     historyIndexRef.current = nextIdx;
//     loadFromHistoryIndex(nextIdx);

//     // sync after undo (debounced)
//     clearTimeout(syncTimeoutRef.current);
//     syncTimeoutRef.current = setTimeout(() => {
//       updateYjsCanvas();
//     }, 250);
//   }, [loadFromHistoryIndex]);

//   const handleRedo = useCallback(() => {
//     if (!permissionsRef.current.canEdit) return;

//     const hist = historyRef.current;
//     const idx = historyIndexRef.current;
//     if (idx >= hist.length - 1) return;

//     const nextIdx = idx + 1;
//     historyIndexRef.current = nextIdx;
//     loadFromHistoryIndex(nextIdx);

//     clearTimeout(syncTimeoutRef.current);
//     syncTimeoutRef.current = setTimeout(() => {
//       updateYjsCanvas();
//     }, 250);
//   }, [loadFromHistoryIndex]);

//   // =========================
//   // Yjs Sync
//   // =========================
//   const loadCanvasFromState = useCallback((state) => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;

//     try {
//       canvas.loadFromJSON(state, () => {
//         canvas.renderAll();
//         // Save to history but do NOT cause sync back immediately
//         saveState();
//       });
//     } catch (e) {
//       console.error("❌ loadCanvasFromState error:", e);
//     }
//   }, [saveState]);

//   const updateYjsCanvas = useCallback(() => {
//     const canvas = fabricCanvasRef.current;
//     const ydoc = ydocRef.current;
//     if (!canvas || !ydoc) return;

//     try {
//       const json = canvas.toJSON(["id"]);
//       const hasObjects = Array.isArray(json.objects) && json.objects.length > 0;

//       // Don’t spam empty updates
//       if (!hasObjects) return;

//       const yCanvasArray = ydoc.getArray("whiteboard");
//       const payload = {
//         ...json,
//         sessionId,
//         allowViewersToDraw: roomSettings.allowViewersToDraw,
//         lastUpdated: new Date().toISOString(),
//         updatedBy: getUserId(),
//         updatedByName: user?.name || "User",
//         version: "5.3.0",
//       };

//       // Replace last snapshot
//       if (yCanvasArray.length > 0) yCanvasArray.delete(0, yCanvasArray.length);
//       yCanvasArray.push([payload]);
//     } catch (e) {
//       console.error("❌ updateYjsCanvas error:", e);
//     }
//   }, [roomSettings.allowViewersToDraw, sessionId, user?.name]);

//   const toggleViewersDraw = useCallback(() => {
//     if (!isStreamer || !ydocRef.current) return;
//     const ySettings = ydocRef.current.getMap("room_settings");
//     const newValue = !roomSettings.allowViewersToDraw;
//     ySettings.set("allowViewersToDraw", newValue);
//     ySettings.set("updatedAt", new Date().toISOString());
//     ySettings.set("updatedBy", getUserId());
//   }, [isStreamer, roomSettings.allowViewersToDraw]);

//   const initYjs = useCallback(() => {
//     // cleanup any previous
//     if (yProviderRef.current) {
//       try {
//         yProviderRef.current.disconnect();
//         yProviderRef.current.destroy();
//       } catch {}
//       yProviderRef.current = null;
//     }
//     if (ydocRef.current) {
//       try {
//         ydocRef.current.destroy();
//       } catch {}
//       ydocRef.current = null;
//     }

//     if (!sessionId || !wsToken) {
//       safeSetState(() => setIsLoading(false));
//       return;
//     }

//     const wsUrl = getWebSocketUrl();
//     if (!wsUrl) {
//       safeSetState(() => setIsLoading(false));
//       return;
//     }

//     const ydoc = new Y.Doc();
//     ydocRef.current = ydoc;

//     const provider = new WebsocketProvider(wsUrl, `whiteboard-${sessionId}`, ydoc, {
//       WebSocketPolyfill: WebSocket,
//       connect: true,
//       disableBc: true,
//       maxBackoffTime: 5000,
//     });

//     yProviderRef.current = provider;

//     provider.on("status", (event) => {
//       const status = event?.status || "unknown";
//       safeSetState(() => setConnectionStatus(status));
//       if (status === "connected") safeSetState(() => setIsLoading(false));
//     });

//     const ySettings = ydoc.getMap("room_settings");

//     // streamer initializes settings once
//     provider.on("status", (event) => {
//       if (event?.status === "connected") {
//         if (isStreamer && ySettings.get("allowViewersToDraw") === undefined) {
//           ySettings.set("allowViewersToDraw", allowViewersToDraw);
//           ySettings.set("streamerId", getUserId());
//           ySettings.set("streamerName", user?.name || "Streamer");
//         }
//       }
//     });

//     ySettings.observe(() => {
//       const s = ySettings.toJSON();
//       safeSetState(() =>
//         setRoomSettings((prev) => ({
//           ...prev,
//           allowViewersToDraw: s.allowViewersToDraw ?? prev.allowViewersToDraw,
//           streamerId: s.streamerId ?? prev.streamerId,
//           streamerName: s.streamerName ?? prev.streamerName,
//         }))
//       );
//     });

//     const yCanvasArray = ydoc.getArray("whiteboard");
//     yCanvasArray.observe(() => {
//       if (yCanvasArray.length === 0) return;
//       const latest = yCanvasArray.get(yCanvasArray.length - 1);
//       if (!latest) return;

//       // prevent echo: don’t re-apply own update
//       if (latest.updatedBy === getUserId()) return;

//       loadCanvasFromState(latest);
//     });

//     // create initial state if empty
//     if (yCanvasArray.length === 0) {
//       yCanvasArray.insert(0, [
//         {
//           version: "5.3.0",
//           objects: [],
//           background: "#ffffff",
//           sessionId,
//           allowViewersToDraw,
//           createdAt: new Date().toISOString(),
//           updatedBy: "system",
//         },
//       ]);
//     }
//   }, [allowViewersToDraw, getWebSocketUrl, isStreamer, loadCanvasFromState, sessionId, user?.name, wsToken]);

//   // =========================
//   // Fabric Canvas Init
//   // =========================
//   const initCanvas = useCallback(() => {
//     if (!containerRef.current || !canvasElRef.current) return;

//     // dispose previous
//     if (fabricCanvasRef.current) {
//       try {
//         fabricCanvasRef.current.dispose();
//       } catch {}
//       fabricCanvasRef.current = null;
//     }

//     const container = containerRef.current;
//     const canvas = new fabric.Canvas(canvasElRef.current, {
//       width: container.clientWidth,
//       height: container.clientHeight,
//       backgroundColor: "#ffffff",
//       selection: true,
//       preserveObjectStacking: true,
//       renderOnAddRemove: true,
//     });

//     fabricCanvasRef.current = canvas;

//     // brush setup
//     canvas.isDrawingMode = false;
//     canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
//     canvas.freeDrawingBrush.width = brushWidthRef.current;
//     canvas.freeDrawingBrush.color = brushColorRef.current;

//     // cursor display
//     canvas.on("mouse:move", (e) => {
//       if (!e.absolutePointer) return;
//       safeSetState(() =>
//         setCursorPosition({
//           x: Math.round(e.absolutePointer.x),
//           y: Math.round(e.absolutePointer.y),
//         })
//       );
//     });

//     // Object added -> generate id + saveState
//     canvas.on("object:added", (e) => {
//       if (e?.target && !e.target.id) {
//         e.target.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2)}`;
//       }
//       saveState();
//     });

//     // Object modified -> saveState and debounce sync
//     canvas.on("object:modified", () => {
//       saveState();
//       if (!permissionsRef.current.canEdit) return;

//       clearTimeout(syncTimeoutRef.current);
//       syncTimeoutRef.current = setTimeout(() => {
//         updateYjsCanvas();
//       }, 400);
//     });

//     // path created -> saveState ONLY (NO sync here)
//     canvas.on("path:created", (e) => {
//       if (e?.path && !e.path.id) {
//         e.path.id = `path_${Date.now()}_${Math.random().toString(36).slice(2)}`;
//       }
//       saveState();
//     });

//     // mouse up -> debounce sync (main sync point)
//     canvas.on("mouse:up", () => {
//       if (!permissionsRef.current.canEdit) return;
//       clearTimeout(syncTimeoutRef.current);
//       syncTimeoutRef.current = setTimeout(() => {
//         updateYjsCanvas();
//       }, 250);
//     });

//     // resize
//     const handleResize = () => {
//       const c = fabricCanvasRef.current;
//       const ctr = containerRef.current;
//       if (!c || !ctr) return;
//       c.setDimensions({ width: ctr.clientWidth, height: ctr.clientHeight });
//       c.renderAll();
//     };

//     resizeHandlerRef.current = handleResize;
//     window.addEventListener("resize", handleResize);

//     // initial history snapshot
//     saveState();
//   }, [saveState, updateYjsCanvas]);

//   // =========================
//   // Tools actions
//   // =========================
//   const setBrushToCanvas = useCallback(() => {
//     const c = fabricCanvasRef.current;
//     if (!c) return;
//     if (!c.freeDrawingBrush) c.freeDrawingBrush = new fabric.PencilBrush(c);
//     c.freeDrawingBrush.width = brushWidthRef.current;
//     c.freeDrawingBrush.color = brushColorRef.current;
//   }, []);

//   const addRectangle = useCallback(() => {
//     if (!permissionsRef.current.canDraw) return;
//     const c = fabricCanvasRef.current;
//     if (!c) return;
//     const rect = new fabric.Rect({
//       left: 120,
//       top: 120,
//       width: 180,
//       height: 120,
//       fill: fillColorRef.current,
//       stroke: brushColorRef.current,
//       strokeWidth: brushWidthRef.current,
//       opacity: opacityRef.current,
//       selectable: true,
//       id: `rect_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });
//     c.add(rect);
//     c.setActiveObject(rect);
//     c.renderAll();
//     setTool("select");
//     setTimeout(updateYjsCanvas, 80);
//   }, [updateYjsCanvas]);

//   const addCircle = useCallback(() => {
//     if (!permissionsRef.current.canDraw) return;
//     const c = fabricCanvasRef.current;
//     if (!c) return;
//     const circle = new fabric.Circle({
//       left: 140,
//       top: 140,
//       radius: 70,
//       fill: fillColorRef.current,
//       stroke: brushColorRef.current,
//       strokeWidth: brushWidthRef.current,
//       opacity: opacityRef.current,
//       selectable: true,
//       id: `circle_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });
//     c.add(circle);
//     c.setActiveObject(circle);
//     c.renderAll();
//     setTool("select");
//     setTimeout(updateYjsCanvas, 80);
//   }, [updateYjsCanvas]);

//   const addText = useCallback(() => {
//     if (!permissionsRef.current.canDraw) return;
//     const c = fabricCanvasRef.current;
//     if (!c) return;
//     const text = new fabric.IText("Double click to edit", {
//       left: 140,
//       top: 140,
//       fontSize: fontSizeRef.current,
//       fill: brushColorRef.current,
//       selectable: true,
//       id: `text_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });
//     c.add(text);
//     c.setActiveObject(text);
//     c.renderAll();
//     setTool("select");
//     setTimeout(updateYjsCanvas, 80);
//   }, [updateYjsCanvas]);

//   const addSticky = useCallback(() => {
//     if (!permissionsRef.current.canDraw) return;
//     const c = fabricCanvasRef.current;
//     if (!c) return;

//     const bg = new fabric.Rect({
//       left: 120,
//       top: 120,
//       width: 220,
//       height: 150,
//       fill: "#ffff88",
//       stroke: "#d4d4d4",
//       strokeWidth: 1,
//       opacity: 0.92,
//       selectable: true,
//       id: `sticky_bg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });

//     const tx = new fabric.IText("Edit note...", {
//       left: 130,
//       top: 130,
//       fontSize: 16,
//       fill: "#000000",
//       selectable: true,
//       id: `sticky_text_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });

//     const group = new fabric.Group([bg, tx], {
//       left: 120,
//       top: 120,
//       selectable: true,
//       id: `sticky_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//     });

//     c.add(group);
//     c.setActiveObject(group);
//     c.renderAll();
//     setTool("select");
//     setTimeout(updateYjsCanvas, 80);
//   }, [updateYjsCanvas]);

//   const startLineMode = useCallback(() => {
//     if (!permissionsRef.current.canDraw) return;
//     const c = fabricCanvasRef.current;
//     if (!c) return;
//     c.isDrawingMode = false;
//     c.selection = false;

//     let line = null;
//     let isDown = false;

//     const onDown = (opt) => {
//       isDown = true;
//       const p = c.getPointer(opt.e);
//       line = new fabric.Line([p.x, p.y, p.x, p.y], {
//         stroke: brushColorRef.current,
//         strokeWidth: brushWidthRef.current,
//         opacity: opacityRef.current,
//         selectable: true,
//         id: `line_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//       });
//       c.add(line);
//     };

//     const onMove = (opt) => {
//       if (!isDown || !line) return;
//       const p = c.getPointer(opt.e);
//       line.set({ x2: p.x, y2: p.y });
//       c.renderAll();
//     };

//     const onUp = () => {
//       isDown = false;
//       c.off("mouse:down", onDown);
//       c.off("mouse:move", onMove);
//       c.off("mouse:up", onUp);
//       c.selection = true;
//       setTool("select");
//       setTimeout(updateYjsCanvas, 80);
//     };

//     c.on("mouse:down", onDown);
//     c.on("mouse:move", onMove);
//     c.on("mouse:up", onUp);
//   }, [updateYjsCanvas]);

//   const startArrowMode = useCallback(() => {
//     if (!permissionsRef.current.canDraw) return;
//     const c = fabricCanvasRef.current;
//     if (!c) return;
//     c.isDrawingMode = false;
//     c.selection = false;

//     let isDown = false;
//     let shaft = null;
//     let head = null;

//     const onDown = (opt) => {
//       isDown = true;
//       const p = c.getPointer(opt.e);

//       shaft = new fabric.Line([p.x, p.y, p.x, p.y], {
//         stroke: brushColorRef.current,
//         strokeWidth: brushWidthRef.current,
//         opacity: opacityRef.current,
//         selectable: false,
//       });

//       head = new fabric.Triangle({
//         left: p.x,
//         top: p.y,
//         width: 14,
//         height: 14,
//         fill: brushColorRef.current,
//         angle: 0,
//         originX: "center",
//         originY: "center",
//         selectable: false,
//       });

//       c.add(shaft);
//       c.add(head);
//     };

//     const onMove = (opt) => {
//       if (!isDown || !shaft || !head) return;
//       const p = c.getPointer(opt.e);
//       shaft.set({ x2: p.x, y2: p.y });

//       const dx = p.x - shaft.x1;
//       const dy = p.y - shaft.y1;
//       const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

//       head.set({ left: p.x, top: p.y, angle: angle + 90 });
//       c.renderAll();
//     };

//     const onUp = () => {
//       isDown = false;

//       if (shaft && head) {
//         const group = new fabric.Group([shaft, head], {
//           selectable: true,
//           id: `arrow_${Date.now()}_${Math.random().toString(36).slice(2)}`,
//         });
//         c.remove(shaft);
//         c.remove(head);
//         c.add(group);
//       }

//       c.off("mouse:down", onDown);
//       c.off("mouse:move", onMove);
//       c.off("mouse:up", onUp);
//       c.selection = true;
//       setTool("select");
//       setTimeout(updateYjsCanvas, 80);
//     };

//     c.on("mouse:down", onDown);
//     c.on("mouse:move", onMove);
//     c.on("mouse:up", onUp);
//   }, [updateYjsCanvas]);

//   const activateEraser = useCallback(() => {
//     if (!permissionsRef.current.canDelete) return;
//     const c = fabricCanvasRef.current;
//     if (!c) return;
//     c.isDrawingMode = false;
//     c.selection = false;

//     const onDown = (opt) => {
//       const p = c.getPointer(opt.e);
//       const objs = c.getObjects();
//       let removed = 0;
//       objs.forEach((obj) => {
//         if (obj.containsPoint && obj.containsPoint(p)) {
//           c.remove(obj);
//           removed++;
//         }
//       });
//       c.renderAll();
//       if (removed > 0) setTimeout(updateYjsCanvas, 80);
//     };

//     c.on("mouse:down", onDown);

//     // auto-off
//     setTimeout(() => {
//       c.off("mouse:down", onDown);
//       c.selection = true;
//       setTool("select");
//     }, 5000);
//   }, [updateYjsCanvas]);

//   const handleToolSelect = useCallback(
//     (t) => {
//       const c = fabricCanvasRef.current;
//       if (!c) return;

//       // permission checks
//       if ((t === "draw" || t === "rectangle" || t === "circle" || t === "line" || t === "arrow" || t === "text" || t === "sticky") && !permissionsRef.current.canDraw) {
//         alert("You do not have permission to draw.");
//         return;
//       }
//       if (t === "eraser" && !permissionsRef.current.canDelete) {
//         alert("Only the streamer can erase/delete.");
//         return;
//       }

//       setTool(t);

//       switch (t) {
//         case "select":
//           c.isDrawingMode = false;
//           c.selection = true;
//           break;

//         case "draw":
//           c.selection = false;
//           c.isDrawingMode = true;
//           setBrushToCanvas();
//           break;

//         case "rectangle":
//           addRectangle();
//           break;

//         case "circle":
//           addCircle();
//           break;

//         case "line":
//           startLineMode();
//           break;

//         case "arrow":
//           startArrowMode();
//           break;

//         case "text":
//           addText();
//           break;

//         case "sticky":
//           addSticky();
//           break;

//         case "eraser":
//           activateEraser();
//           break;

//         default:
//           break;
//       }
//     },
//     [activateEraser, addCircle, addRectangle, addSticky, addText, setBrushToCanvas, startArrowMode, startLineMode]
//   );

//   // =========================
//   // Export / Import / Clear / Delete
//   // =========================
//   const exportAsImage = useCallback(() => {
//     const c = fabricCanvasRef.current;
//     if (!c) return;
//     const dataURL = c.toDataURL({ format: "png", quality: 1, multiplier: 2 });
//     const fileName = `whiteboard-${sessionInfo?.title || "session"}-${new Date().toISOString().slice(0, 10)}.png`;
//     const link = document.createElement("a");
//     link.href = dataURL;
//     link.download = fileName;
//     link.click();
//   }, [sessionInfo?.title]);

//   const exportAsJSON = useCallback(() => {
//     const c = fabricCanvasRef.current;
//     if (!c) return;
//     const json = c.toJSON(["id"]);
//     const dataStr = JSON.stringify(json);
//     const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
//     const fileName = `whiteboard-${sessionInfo?.title || "session"}-${new Date().toISOString().slice(0, 10)}.json`;
//     const link = document.createElement("a");
//     link.href = dataUri;
//     link.download = fileName;
//     link.click();
//   }, [sessionInfo?.title]);

//   const importFromJSON = useCallback(() => {
//     if (!permissionsRef.current.canImport) {
//       alert("Only streamer can import JSON.");
//       return;
//     }
//     const input = document.createElement("input");
//     input.type = "file";
//     input.accept = ".json,application/json";
//     input.onchange = (e) => {
//       const file = e.target.files?.[0];
//       if (!file) return;
//       const reader = new FileReader();
//       reader.onload = (ev) => {
//         try {
//           const json = JSON.parse(ev.target.result);
//           const c = fabricCanvasRef.current;
//           if (!c) return;
//           c.loadFromJSON(json, () => {
//             c.renderAll();
//             saveState();
//             setTimeout(updateYjsCanvas, 80);
//           });
//         } catch {
//           alert("Invalid JSON file.");
//         }
//       };
//       reader.readAsText(file);
//     };
//     input.click();
//   }, [saveState, updateYjsCanvas]);

//   const handleClear = useCallback(() => {
//     if (!permissionsRef.current.canClear) {
//       alert("Only streamer can clear the board.");
//       return;
//     }
//     if (!window.confirm("Clear the whiteboard?")) return;
//     const c = fabricCanvasRef.current;
//     if (!c) return;
//     c.clear();
//     c.backgroundColor = "#ffffff";
//     c.renderAll();
//     saveState();
//     setTimeout(updateYjsCanvas, 80);
//   }, [saveState, updateYjsCanvas]);

//   const deleteSelected = useCallback(() => {
//     if (!permissionsRef.current.canDelete) {
//       alert("Only streamer can delete objects.");
//       return;
//     }
//     const c = fabricCanvasRef.current;
//     if (!c) return;
//     const active = c.getActiveObject();
//     if (!active) return;
//     c.remove(active);
//     c.discardActiveObject();
//     c.renderAll();
//     saveState();
//     setTimeout(updateYjsCanvas, 80);
//   }, [saveState, updateYjsCanvas]);

//   // =========================
//   // Zoom / Fullscreen
//   // =========================
//   const handleZoomIn = useCallback(() => {
//     const c = fabricCanvasRef.current;
//     if (!c) return;
//     const newZoom = Math.min(zoom * 1.2, 5);
//     setZoom(newZoom);
//     c.setZoom(newZoom);
//     c.renderAll();
//   }, [zoom]);

//   const handleZoomOut = useCallback(() => {
//     const c = fabricCanvasRef.current;
//     if (!c) return;
//     const newZoom = Math.max(zoom / 1.2, 0.2);
//     setZoom(newZoom);
//     c.setZoom(newZoom);
//     c.renderAll();
//   }, [zoom]);

//   const toggleFullscreen = useCallback(() => {
//     setIsFullscreen((p) => !p);
//   }, []);

//   // =========================
//   // Main lifecycle
//   // =========================
//   useEffect(() => {
//     isMountedRef.current = true;
//     return () => {
//       isMountedRef.current = false;
//     };
//   }, []);

//   useEffect(() => {
//     if (!isActive) return;

//     safeSetState(() => {
//       setIsLoading(true);
//       setConnectionStatus("connecting");
//     });

//     initCanvas();

//     const t = setTimeout(() => {
//       initYjs();
//     }, 600);

//     return () => clearTimeout(t);
//   }, [initCanvas, initYjs, isActive]);

//   // cleanup on unmount
//   useEffect(() => {
//     return () => {
//       clearTimeout(syncTimeoutRef.current);

//       if (resizeHandlerRef.current) {
//         window.removeEventListener("resize", resizeHandlerRef.current);
//       }

//       if (yProviderRef.current) {
//         try {
//           yProviderRef.current.disconnect();
//           yProviderRef.current.destroy();
//         } catch {}
//         yProviderRef.current = null;
//       }

//       if (ydocRef.current) {
//         try {
//           ydocRef.current.destroy();
//         } catch {}
//         ydocRef.current = null;
//       }

//       if (fabricCanvasRef.current) {
//         try {
//           fabricCanvasRef.current.dispose();
//         } catch {}
//         fabricCanvasRef.current = null;
//       }
//     };
//   }, []);

//   // =========================
//   // UI
//   // =========================
//   const canDraw = permissionsRef.current.canDraw;

//   return (
//     <div
//       className={`relative w-full h-full ${
//         mainScreenMode ? "bg-black/10" : "bg-black/30"
//       }`}
//     >
//       {/* Header (compact) */}
//       <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <div className="px-3 py-1 rounded-lg bg-black/60 text-white text-xs">
//             WB • {connectionStatus}
//             {roomSettings.streamerName ? ` • Host: ${roomSettings.streamerName}` : ""}
//           </div>
//           <div className="px-3 py-1 rounded-lg bg-black/60 text-white text-xs">
//             {cursorPosition.x}, {cursorPosition.y} • Zoom {zoom.toFixed(2)}
//           </div>
//         </div>

//         <div className="flex items-center gap-2">
//           {isStreamer && (
//             <button
//               onClick={toggleViewersDraw}
//               className="px-3 py-1 rounded-lg bg-black/60 text-white text-xs flex items-center gap-2 hover:bg-black/70"
//               title="Toggle viewer draw"
//             >
//               {roomSettings.allowViewersToDraw ? <FiUnlock /> : <FiLock />}
//               <span className="hidden sm:inline">
//                 Viewers: {roomSettings.allowViewersToDraw ? "Can draw" : "View only"}
//               </span>
//             </button>
//           )}

//           <button
//             onClick={toggleFullscreen}
//             className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/70"
//             title="Fullscreen"
//           >
//             {isFullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
//           </button>

//           <button
//             onClick={onClose}
//             className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/70"
//             title="Close"
//           >
//             <FiX />
//           </button>
//         </div>
//       </div>

//       {/* Toolbar */}
//       <div className="absolute top-14 right-2 z-20 flex flex-col gap-2">
//         <div className="flex flex-col rounded-xl bg-black/60 p-2">
//           <div className="flex items-center justify-between gap-2 px-1 pb-2">
//             <button
//               className="text-white/90 hover:text-white"
//               onClick={() => setShowTools((p) => !p)}
//               title="Toggle tools"
//             >
//               {showTools ? <FiChevronRight /> : <FiChevronLeft />}
//             </button>

//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => setShowColors((p) => !p)}
//                 className="w-6 h-6 rounded-md border border-white/30"
//                 style={{ background: brushColor }}
//                 title="Colors"
//               />
//               <button
//                 onClick={() => setShowBrushSizes((p) => !p)}
//                 className="w-6 h-6 rounded-md border border-white/30 text-white text-xs flex items-center justify-center"
//                 title="Brush size"
//               >
//                 {brushWidth}
//               </button>
//             </div>
//           </div>

//           {showTools && (
//             <div className="flex flex-col gap-1">
//               {tools.map((t) => (
//                 <button
//                   key={t.id}
//                   onClick={() => handleToolSelect(t.id)}
//                   className={`flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10 ${
//                     tool === t.id ? "bg-white/15" : ""
//                   } ${!canDraw && t.id !== "select" && !isStreamer ? "opacity-50" : ""}`}
//                   title={t.name}
//                 >
//                   {t.icon}
//                   {!compact && <span className="text-xs">{t.name}</span>}
//                 </button>
//               ))}

//               <div className="my-1 h-px bg-white/15" />

//               <button
//                 onClick={handleUndo}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10"
//                 title="Undo"
//               >
//                 <FaUndo />
//                 {!compact && <span className="text-xs">Undo</span>}
//               </button>
//               <button
//                 onClick={handleRedo}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10"
//                 title="Redo"
//               >
//                 <FaRedo />
//                 {!compact && <span className="text-xs">Redo</span>}
//               </button>

//               <div className="my-1 h-px bg-white/15" />

//               <button
//                 onClick={deleteSelected}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10"
//                 title="Delete selected"
//               >
//                 <FiTrash2 />
//                 {!compact && <span className="text-xs">Delete</span>}
//               </button>

//               {isStreamer && (
//                 <button
//                   onClick={handleClear}
//                   className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10"
//                   title="Clear"
//                 >
//                   <FiRefreshCw />
//                   {!compact && <span className="text-xs">Clear</span>}
//                 </button>
//               )}

//               <div className="my-1 h-px bg-white/15" />

//               <button
//                 onClick={exportAsImage}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10"
//                 title="Export PNG"
//               >
//                 <FiDownload />
//                 {!compact && <span className="text-xs">PNG</span>}
//               </button>

//               <button
//                 onClick={exportAsJSON}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10"
//                 title="Export JSON"
//               >
//                 <FiDownload />
//                 {!compact && <span className="text-xs">JSON</span>}
//               </button>

//               {isStreamer && (
//                 <button
//                   onClick={importFromJSON}
//                   className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10"
//                   title="Import JSON"
//                 >
//                   <FiUpload />
//                   {!compact && <span className="text-xs">Import</span>}
//                 </button>
//               )}

//               <div className="my-1 h-px bg-white/15" />

//               <button
//                 onClick={handleZoomIn}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10"
//                 title="Zoom in"
//               >
//                 <FiZoomIn />
//                 {!compact && <span className="text-xs">Zoom+</span>}
//               </button>
//               <button
//                 onClick={handleZoomOut}
//                 className="flex items-center gap-2 px-2 py-2 rounded-lg text-white hover:bg-white/10"
//                 title="Zoom out"
//               >
//                 <FiZoomOut />
//                 {!compact && <span className="text-xs">Zoom-</span>}
//               </button>
//             </div>
//           )}

//           {showColors && (
//             <div className="mt-2 grid grid-cols-7 gap-1">
//               {colors.map((c) => (
//                 <button
//                   key={c}
//                   onClick={() => {
//                     setBrushColor(c);
//                     setBrushToCanvas();
//                   }}
//                   className="w-5 h-5 rounded border border-white/20"
//                   style={{ background: c }}
//                   title={c}
//                 />
//               ))}
//             </div>
//           )}

//           {showBrushSizes && (
//             <div className="mt-2 flex flex-wrap gap-1">
//               {brushSizes.map((s) => (
//                 <button
//                   key={s}
//                   onClick={() => {
//                     setBrushWidth(s);
//                     setBrushToCanvas();
//                   }}
//                   className={`px-2 py-1 rounded-md text-white text-xs border border-white/20 hover:bg-white/10 ${
//                     brushWidth === s ? "bg-white/15" : ""
//                   }`}
//                 >
//                   {s}
//                 </button>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Canvas container */}
//       <div
//         ref={containerRef}
//         className={`absolute inset-0 ${
//           isFullscreen ? "p-0" : "p-2"
//         }`}
//       >
//         <div className="w-full h-full rounded-xl overflow-hidden bg-white">
//           {isLoading && (
//             <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20">
//               <div className="px-4 py-2 rounded-lg bg-black/70 text-white text-sm">
//                 Loading whiteboard...
//               </div>
//             </div>
//           )}
//           <canvas ref={canvasElRef} className="w-full h-full" />
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
// import { 
//   FiSquare, FiCircle, FiType, FiPenTool, FiEdit3, FiMousePointer, FiTrash2, 
//   FiDownload, FiUpload, FiSave, FiZoomIn, FiZoomOut, FiMaximize2,
//   FiMinimize2, FiImage, FiStar, FiHexagon, FiTriangle, FiMinus, FiArrowRight,
//   FiX, FiUsers, FiMessageSquare, FiRefreshCw, FiLock, FiUnlock, FiCheck
// } from 'react-icons/fi';
// import { FaRedo, FaUndo } from "react-icons/fa";
// import { BsBrush, BsEraser } from 'react-icons/bs';
// import { LuStickyNote } from 'react-icons/lu';

// console.log('===================================================');
// console.log('🎨 WHITEBOARD COMPONENT STARTING - FIXED VERSION');
// console.log('===================================================');

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
//   console.log('🚀 WhiteboardComponent FUNCTION CALLED');
//   console.log('📋 PROPS RECEIVED:', {
//     sessionId,
//     roomCode,
//     hasWsToken: !!wsToken,
//     sessionInfo,
//     isActive,
//     isStreamer,
//     allowViewersToDraw
//   });

//   const { user } = useAuth();
//   console.log('🔐 Auth Context - User:', user);
  
//   const canvasRef = useRef(null);
//   const fabricCanvasRef = useRef(null);
//   const containerRef = useRef(null);
//   const ydocRef = useRef(null);
//   const yProviderRef = useRef(null);
  
//   // Refs for stable values
//   const permissionsRef = useRef({
//     canDraw: isStreamer,
//     canEdit: isStreamer,
//     canDelete: isStreamer,
//     canClear: isStreamer,
//     canChat: true,
//     canExport: true,
//     canImport: isStreamer
//   });
  
//   const brushWidthRef = useRef(5);
//   const brushColorRef = useRef('#000000');
  
//   // State declarations
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
//   const [cursorPositions, setCursorPositions] = useState({});
//   const [userTools, setUserTools] = useState({});
//   const [authenticated, setAuthenticated] = useState(false);
//   const [connectionError, setConnectionError] = useState(null);
//   const [roomSettings, setRoomSettings] = useState({
//     allowViewersToDraw: allowViewersToDraw,
//     streamerId: null,
//     streamerName: null
//   });

//   // Update refs when state changes
//   brushWidthRef.current = brushWidth;
//   brushColorRef.current = brushColor;
//   permissionsRef.current = permissions;

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

//   // Connection log function
//   const addConnectionLog = (message) => {
//     const timestamp = new Date().toLocaleTimeString();
//     console.log(`📝 ${timestamp}: ${message}`);
//     setConnectionLogs(prev => [
//       ...prev.slice(-10),
//       { timestamp, message }
//     ]);
//   };

//   // WebSocket URL builder
//   const getWebSocketUrl = () => {
//     console.log('🔗 getWebSocketUrl function called');

//     const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:9090';

//     if (!sessionId) {
//       console.error('❌ CRITICAL ERROR: sessionId is null or undefined');
//       setConnectionError('Session ID is required');
//       return null;
//     }

//     if (!wsToken) {
//       console.error('❌ CRITICAL ERROR: WebSocket token is required');
//       setConnectionError('Authentication token is required');
//       return null;
//     }

//     const queryParams = new URLSearchParams({
//       token: wsToken,
//       roomCode: roomCode || '',
//       userName: user?.name || 'Anonymous',
//       userId: user?.id || user?._id || 'anonymous',
//       isStreamer: String(!!isStreamer),
//       allowViewersToDraw: String(!!allowViewersToDraw),
//       roomName: sessionInfo?.title || 'Whiteboard Session',
//     });

//     const url = `${baseUrl}/yjs/${sessionId}?${queryParams.toString()}`;

//     console.log('🔗 Constructed WebSocket URL:', {
//       urlBase: `${baseUrl}/yjs/${sessionId}`,
//       hasToken: !!wsToken,
//       tokenLength: wsToken?.length,
//       isStreamer: !!isStreamer,
//       allowViewersToDraw: !!allowViewersToDraw
//     });

//     return url;
//   };

//   // ✅ FIXED: Load canvas from Yjs state
//   const loadCanvasFromState = useCallback((state) => {
//     console.log('🎨 loadCanvasFromState called');
    
//     if (!fabricCanvasRef.current) {
//       console.error('❌ Canvas not initialized');
//       return;
//     }
    
//     try {
//       console.log('📦 Loading state:', {
//         objects: state.objects?.length || 0,
//         background: state.background,
//         version: state.version,
//         from: state.updatedBy
//       });
      
//       fabricCanvasRef.current.loadFromJSON(state, () => {
//         console.log('✅ Canvas loaded from state');
//         fabricCanvasRef.current.renderAll();
//         saveState();
//       });
//     } catch (error) {
//       console.error('❌ Error loading canvas state:', error);
//     }
//   }, []);

//   // ✅ FIXED: Update Yjs canvas - ONLY sends when there are ACTUAL objects
//   const updateYjsCanvas = useCallback(() => {
//     console.log('📤 updateYjsCanvas called');
    
//     if (!ydocRef.current || !fabricCanvasRef.current) {
//       console.error('❌ Cannot update: Yjs or Canvas not ready');
//       return;
//     }
    
//     try {
//       const yCanvasArray = ydocRef.current.getArray('whiteboard');
//       const canvasState = fabricCanvasRef.current.toJSON();
      
//       // 🚨🚨🚨 CRITICAL: Check if there are ACTUAL objects
//       const hasRealObjects = canvasState.objects && 
//                             Array.isArray(canvasState.objects) && 
//                             canvasState.objects.length > 0;
      
//       // Log what we're sending
//       if (hasRealObjects) {
//         console.log(`🎨 Canvas has ${canvasState.objects.length} objects:`);
//         canvasState.objects.forEach((obj, i) => {
//           console.log(`   ${i+1}. ${obj.type || 'unknown'} - id: ${obj.id || 'no-id'}`);
//         });
//       }
      
//       // 🚨🚨🚨 CRITICAL: ONLY send if there are actual objects
//       if (!hasRealObjects) {
//         console.log('⚠️ Skipping empty canvas update - no objects to sync');
//         return;
//       }
      
//       // Add metadata
//       canvasState.sessionId = sessionId;
//       canvasState.allowViewersToDraw = roomSettings.allowViewersToDraw;
//       canvasState.lastUpdated = new Date().toISOString();
//       canvasState.updatedBy = user?.id || user?._id || 'streamer';
//       canvasState.updatedByName = user?.name || 'Streamer';
//       canvasState.version = '5.3.0';
//       canvasState.updateId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
//       console.log('📤 STREAMER sending canvas update:', {
//         objects: canvasState.objects?.length || 0,
//         user: canvasState.updatedBy,
//         updateId: canvasState.updateId,
//         timestamp: canvasState.lastUpdated
//       });
      
//       // 🚨🚨🚨 CRITICAL: Replace last state (don't append infinitely)
//       if (yCanvasArray.length > 0) {
//         yCanvasArray.delete(0, yCanvasArray.length);
//       }
//       yCanvasArray.push([canvasState]);
      
//       console.log(`✅ Streamer canvas state sent to Yjs`);
      
//     } catch (error) {
//       console.error('❌ Error updating Yjs canvas:', error);
//     }
//   }, [sessionId, roomSettings.allowViewersToDraw, user]);

//   // ✅ FIXED: Handle canvas changes - ONLY on mouse up!
//   const handleCanvasChange = useCallback(() => {
//     console.log('🔄 handleCanvasChange called - but we now use mouse:up instead!');
//     // This function is now only called on mouse:up, not on every path:created
//   }, []);

//   // ✅ Save State for Undo/Redo
//   const saveState = () => {
//     if (!fabricCanvasRef.current) return;
    
//     const state = fabricCanvasRef.current.toJSON();
//     const newHistory = [...history.slice(0, historyIndex + 1), state];
//     setHistory(newHistory);
//     setHistoryIndex(newHistory.length - 1);
//     console.log('💾 State saved, history length:', newHistory.length);
//   };

//   // ✅ Undo
//   const handleUndo = () => {
//     if (historyIndex > 0 && permissionsRef.current.canEdit) {
//       const newIndex = historyIndex - 1;
//       setHistoryIndex(newIndex);
//       fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
//         fabricCanvasRef.current.renderAll();
//         console.log('✅ Undo applied');
//         // Only sync after undo if there are objects
//         const objects = fabricCanvasRef.current.getObjects();
//         if (objects.length > 0) {
//           setTimeout(() => updateYjsCanvas(), 100);
//         }
//       });
//     }
//   };

//   // ✅ Redo
//   const handleRedo = () => {
//     if (historyIndex < history.length - 1 && permissionsRef.current.canEdit) {
//       const newIndex = historyIndex + 1;
//       setHistoryIndex(newIndex);
//       fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
//         fabricCanvasRef.current.renderAll();
//         console.log('✅ Redo applied');
//         const objects = fabricCanvasRef.current.getObjects();
//         if (objects.length > 0) {
//           setTimeout(() => updateYjsCanvas(), 100);
//         }
//       });
//     }
//   };

//   // ✅ Toggle viewers drawing permission (Streamer only)
//   const toggleViewersDraw = () => {
//     if (!isStreamer || !ydocRef.current) return;
    
//     const ySettings = ydocRef.current.getMap('room_settings');
//     const newValue = !roomSettings.allowViewersToDraw;
    
//     ySettings.set('allowViewersToDraw', newValue);
//     ySettings.set('updatedAt', new Date().toISOString());
//     ySettings.set('updatedBy', user?.id);
    
//     setRoomSettings(prev => ({
//       ...prev,
//       allowViewersToDraw: newValue
//     }));
    
//     console.log(`🔄 Viewers can now ${newValue ? 'draw' : 'view only'}`);
//     addConnectionLog(`Streamer changed viewer permissions: ${newValue ? 'Can draw' : 'View only'}`);
//   };

//   // ✅ Initialize Yjs
//   const initYjs = useCallback(() => {
//     console.log('🔄 initYjs callback called');

//     if (yProviderRef.current) {
//       try {
//         yProviderRef.current.disconnect();
//         yProviderRef.current.destroy();
//       } catch (error) {
//         console.error('❌ Error destroying previous provider:', error);
//       }
//       yProviderRef.current = null;
//     }

//     setConnectionError(null);
//     setConnectionStatus('connecting');
    
//     if (!sessionId || !wsToken) {
//       setConnectionError('Missing session ID or token');
//       setIsLoading(false);
//       return null;
//     }

//     try {
//       console.log('📄 Creating Y.Doc...');
//       const ydoc = new Y.Doc();
//       ydocRef.current = ydoc;
      
//       const yCanvasArray = ydoc.getArray('whiteboard');
//       const yUsers = ydoc.getMap('users');
//       const ySettings = ydoc.getMap('room_settings');

//       const wsUrl = getWebSocketUrl();
//       if (!wsUrl) {
//         setConnectionError('Failed to create WebSocket URL');
//         setIsLoading(false);
//         return null;
//       }

//       console.log('🔌 Creating WebSocketProvider...');
      
//       const provider = new WebsocketProvider(
//         wsUrl,
//         `whiteboard-${sessionId}`,
//         ydoc,
//         {
//           WebSocketPolyfill: WebSocket,
//           connect: true,
//           disableBc: true,
//           maxBackoffTime: 5000,
//         }
//       );

//       yProviderRef.current = provider;

//       provider.on('connection-error', (error) => {
//         console.error('❌ Yjs connection error:', error);
//         setConnectionError(error.message || 'Connection error');
//       });

//       provider.on('status', (event) => {
//         const status = event?.status || 'unknown';
//         console.log('📡 Yjs Provider status:', status);
        
//         switch (status) {
//           case 'connected':
//             setConnectionStatus('connected');
//             setAuthenticated(true);
//             setConnectionError(null);
            
//             if (user?.id || user?._id) {
//               const userId = user.id || user._id;
//               yUsers.set(userId, {
//                 name: user.name || 'Anonymous',
//                 id: userId,
//                 isStreamer: isStreamer,
//                 permissions: permissionsRef.current,
//                 joinedAt: new Date().toISOString(),
//                 lastActive: new Date().toISOString(),
//                 cursorPosition: { x: 0, y: 0 }
//               });
//             }
            
//             if (isStreamer && ySettings.get('allowViewersToDraw') === undefined) {
//               ySettings.set('allowViewersToDraw', allowViewersToDraw);
//               ySettings.set('streamerId', user?.id || user?._id);
//               ySettings.set('streamerName', user?.name || 'Streamer');
//               ySettings.set('createdAt', new Date().toISOString());
//               console.log('✅ Room settings initialized by streamer');
//             }
            
//             setIsLoading(false);
//             break;
            
//           case 'synced':
//             console.log('✅ Yjs synced successfully');
//             const settings = ySettings.toJSON();
//             if (settings) {
//               setRoomSettings(prev => ({
//                 ...prev,
//                 allowViewersToDraw: settings.allowViewersToDraw || allowViewersToDraw,
//                 streamerId: settings.streamerId,
//                 streamerName: settings.streamerName
//               }));
//             }
//             break;
//         }
//       });

//       ySettings.observe((event) => {
//         const settings = ySettings.toJSON();
//         if (settings.allowViewersToDraw !== undefined) {
//           setRoomSettings(prev => ({
//             ...prev,
//             allowViewersToDraw: settings.allowViewersToDraw
//           }));
//         }
//       });

//       yUsers.observe((event) => {
//         const users = Array.from(yUsers.values());
//         const currentUserId = user?.id || user?._id;
//         const otherUsers = users.filter(u => u.id !== currentUserId);
//         setActiveUsers(otherUsers);
        
//         const cursorPos = {};
//         users.forEach(u => {
//           if (u.cursorPosition) cursorPos[u.id] = u.cursorPosition;
//         });
//         setCursorPositions(cursorPos);
//       });

//       // ✅ FIXED: Canvas observer for streamer
//       yCanvasArray.observe((event) => {
//         if (yCanvasArray.length === 0) return;
//         const latestState = yCanvasArray.get(yCanvasArray.length - 1);
        
//         if (latestState && fabricCanvasRef.current) {
//           const currentUserId = user?.id || user?._id;
//           // Only load if update is from someone else
//           if (latestState.updatedBy !== currentUserId) {
//             console.log('📥 Loading shared canvas state from:', latestState.updatedBy);
//             loadCanvasFromState(latestState);
//           }
//         }
//       });

//       // Initialize with empty canvas if not exists
//       if (yCanvasArray.length === 0) {
//         console.log('📝 Initializing empty canvas array');
//         const initialState = {
//           version: '5.3.0',
//           objects: [],
//           background: '#ffffff',
//           sessionId: sessionId,
//           allowViewersToDraw: allowViewersToDraw,
//           createdAt: new Date().toISOString(),
//           updatedBy: user?.id || user?._id || 'system'
//         };
//         yCanvasArray.insert(0, [initialState]);
//       }

//       console.log('✅ Yjs initialized successfully');
//       return { ydoc, provider, yCanvasArray };
      
//     } catch (error) {
//       console.error('❌ Yjs initialization error:', error);
//       setConnectionError(error.message || 'Initialization error');
//       setIsLoading(false);
//       return null;
//     }
//   }, [sessionId, wsToken, user, isStreamer, allowViewersToDraw, loadCanvasFromState]);

//   // ✅ FIXED: Initialize Canvas with proper event handlers
//   const initCanvas = useCallback(() => {
//     console.log('🎨 initCanvas callback called');
    
//     if (!containerRef.current) {
//       setTimeout(() => initCanvas(), 500);
//       return;
//     }
    
//     if (fabricCanvasRef.current) {
//       fabricCanvasRef.current.dispose();
//       fabricCanvasRef.current = null;
//     }
    
//     const canvas = new fabric.Canvas(canvasRef.current, {
//       width: containerRef.current.clientWidth,
//       height: containerRef.current.clientHeight,
//       backgroundColor: '#ffffff',
//       selection: true,
//       preserveObjectStacking: true,
//       renderOnAddRemove: true
//     });
    
//     fabricCanvasRef.current = canvas;
    
//     // Setup drawing tools
//     canvas.isDrawingMode = false;
//     if (permissionsRef.current.canDraw) {
//       canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
//       canvas.freeDrawingBrush.width = brushWidthRef.current;
//       canvas.freeDrawingBrush.color = brushColorRef.current;
//     }
    
//     // 🚨🚨🚨 CRITICAL FIX: Mouse move for cursor sharing
//     canvas.on('mouse:move', (e) => {
//       if (!e.absolutePointer) return;
      
//       const pos = {
//         x: Math.round(e.absolutePointer.x),
//         y: Math.round(e.absolutePointer.y)
//       };
//       setCursorPosition(pos);
      
//       if (ydocRef.current && (user?.id || user?._id)) {
//         const userId = user.id || user._id;
//         const yUsers = ydocRef.current.getMap('users');
//         const currentUser = yUsers.get(userId);
//         if (currentUser) {
//           yUsers.set(userId, {
//             ...currentUser,
//             cursorPosition: pos,
//             lastActive: new Date().toISOString()
//           });
//         }
//       }
//     });
    
//     // 🚨🚨🚨 CRITICAL FIX: Object added - generate ID and save state
//     canvas.on('object:added', (e) => {
//       if (e.target) {
//         if (!e.target.id) {
//           e.target.id = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//         }
//         saveState();
//       }
//     });
    
//     // 🚨🚨🚨 CRITICAL FIX: Object modified - sync after debounce
//     canvas.on('object:modified', (e) => {
//       if (e.target) {
//         saveState();
//         if (permissionsRef.current.canEdit) {
//           if (window.canvasSyncTimeout) clearTimeout(window.canvasSyncTimeout);
//           window.canvasSyncTimeout = setTimeout(() => {
//             const objects = canvas.getObjects();
//             if (objects.length > 0) {
//               updateYjsCanvas();
//             }
//           }, 500);
//         }
//       }
//     });
    
//     // 🚨🚨🚨 CRITICAL FIX: Path created - DON'T sync here!
//     canvas.on('path:created', (e) => {
//       if (e.path && permissionsRef.current.canDraw) {
//         if (!e.path.id) {
//           e.path.id = `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//         }
//         saveState();
//         // DO NOT call handleCanvasChange here!
//       }
//     });
    
//     // 🚨🚨🚨 CRITICAL FIX: Mouse up - SYNC HERE!
//     canvas.on('mouse:up', () => {
//       console.log('🐭 Mouse up - checking if we should sync');
//       const objects = canvas.getObjects();
//       if (objects.length > 0) {
//         if (window.canvasSyncTimeout) clearTimeout(window.canvasSyncTimeout);
//         window.canvasSyncTimeout = setTimeout(() => {
//           console.log(`📤 Syncing ${objects.length} objects after mouse up`);
//           updateYjsCanvas();
//         }, 300);
//       }
//     });
    
//     // Handle resize
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
    
//     return () => {
//       window.removeEventListener('resize', handleResize);
//     };
//   }, [updateYjsCanvas]);

//   // ✅ Main Effect
//   useEffect(() => {
//     if (isActive) {
//       console.log('🚀 Whiteboard ACTIVE');
//       setConnectionError(null);
//       setConnectionStatus('connecting');
//       setIsLoading(true);
      
//       initCanvas();
      
//       const initTimeout = setTimeout(() => {
//         initYjs();
//       }, 1000);
      
//       return () => clearTimeout(initTimeout);
//     }
//   }, [isActive, initCanvas, initYjs]);

//   // ✅ Cleanup Effect
//   useEffect(() => {
//     return () => {
//       console.log('🧹 WhiteboardComponent UNMOUNTING');
      
//       if (window.canvasLoadTimeout) clearTimeout(window.canvasLoadTimeout);
//       if (window.canvasSyncTimeout) clearTimeout(window.canvasSyncTimeout);
      
//       if (yProviderRef.current) {
//         try {
//           yProviderRef.current.disconnect();
//           yProviderRef.current.destroy();
//         } catch (error) {
//           console.error('❌ Error destroying Yjs provider:', error);
//         }
//       }
      
//       if (ydocRef.current) {
//         try {
//           ydocRef.current.destroy();
//         } catch (error) {
//           console.error('❌ Error destroying Y.Doc:', error);
//         }
//       }
      
//       if (fabricCanvasRef.current) {
//         try {
//           fabricCanvasRef.current.dispose();
//           fabricCanvasRef.current = null;
//         } catch (error) {
//           console.error('❌ Error disposing fabric canvas:', error);
//         }
//       }
//     };
//   }, []);

//   // Update permissions when room settings change
//   useEffect(() => {
//     const newPermissions = {
//       canDraw: isStreamer || roomSettings.allowViewersToDraw,
//       canEdit: isStreamer || roomSettings.allowViewersToDraw,
//       canDelete: isStreamer,
//       canClear: isStreamer,
//       canChat: true,
//       canExport: true,
//       canImport: isStreamer
//     };
//     setPermissions(newPermissions);
//     permissionsRef.current = newPermissions;
//   }, [roomSettings, isStreamer]);

//   // ✅ Render user cursors
//   useEffect(() => {
//     if (!fabricCanvasRef.current) return;
    
//     const renderCursors = () => {
//       const canvas = fabricCanvasRef.current;
//       if (!canvas) return;
      
//       const ctx = canvas.getContext();
//       canvas.renderAll();
      
//       activeUsers.forEach((userData) => {
//         if (userData.cursorPosition) {
//           const { x, y } = userData.cursorPosition;
//           const { name, currentTool } = userData;
          
//           ctx.save();
//           ctx.strokeStyle = '#FF0000';
//           ctx.lineWidth = 2;
//           ctx.beginPath();
//           ctx.moveTo(x - 10, y);
//           ctx.lineTo(x + 10, y);
//           ctx.moveTo(x, y - 10);
//           ctx.lineTo(x, y + 10);
//           ctx.stroke();
          
//           ctx.fillStyle = '#FF0000';
//           ctx.font = '12px Arial';
//           ctx.fillText(`${name}${currentTool ? ` (${currentTool})` : ''}`, x + 15, y + 5);
//           ctx.restore();
//         }
//       });
//     };
    
//     const animationId = requestAnimationFrame(renderCursors);
//     return () => cancelAnimationFrame(animationId);
//   }, [activeUsers]);

//   // ============ Drawing Functions ============
//   const handleToolSelect = (selectedTool) => {
//     if ((selectedTool === 'draw' || selectedTool === 'eraser') && !permissionsRef.current.canDraw) {
//       alert('You do not have permission to draw.');
//       return;
//     }
    
//     setTool(selectedTool);
    
//     if (ydocRef.current && (user?.id || user?._id)) {
//       const userId = user.id || user._id;
//       const yUsers = ydocRef.current.getMap('users');
//       const currentUser = yUsers.get(userId);
//       if (currentUser) {
//         yUsers.set(userId, {
//           ...currentUser,
//           currentTool: selectedTool,
//           lastActive: new Date().toISOString()
//         });
//       }
//     }
    
//     const canvas = fabricCanvasRef.current;
//     if (!canvas) return;
    
//     switch (selectedTool) {
//       case 'select':
//         canvas.isDrawingMode = false;
//         canvas.selection = true;
//         break;
//       case 'draw':
//         if (permissionsRef.current.canDraw) {
//           canvas.isDrawingMode = true;
//           canvas.freeDrawingBrush.width = brushWidthRef.current;
//           canvas.freeDrawingBrush.color = brushColorRef.current;
//         }
//         break;
//       case 'rectangle':
//         if (permissionsRef.current.canDraw) addRectangle();
//         break;
//       case 'circle':
//         if (permissionsRef.current.canDraw) addCircle();
//         break;
//       case 'triangle':
//         if (permissionsRef.current.canDraw) addTriangle();
//         break;
//       case 'text':
//         if (permissionsRef.current.canDraw) addText();
//         break;
//       case 'sticky':
//         if (permissionsRef.current.canDraw) addStickyNote();
//         break;
//       case 'image':
//         if (permissionsRef.current.canDraw) uploadImage();
//         break;
//       case 'eraser':
//         if (permissionsRef.current.canDelete) activateEraser();
//         break;
//       case 'line':
//         if (permissionsRef.current.canDraw) startDrawingLine();
//         break;
//       case 'arrow':
//         if (permissionsRef.current.canDraw) startDrawingArrow();
//         break;
//       case 'star':
//         if (permissionsRef.current.canDraw) addStar();
//         break;
//       case 'hexagon':
//         if (permissionsRef.current.canDraw) addHexagon();
//         break;
//     }
//   };

//   const addRectangle = () => {
//     if (!permissionsRef.current.canDraw) return;
//     const rect = new fabric.Rect({
//       left: 100, top: 100, width: 100, height: 100,
//       fill: fillColor, stroke: brushColor, strokeWidth: brushWidth,
//       opacity: opacity, selectable: true,
//       id: `rect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
//     });
//     fabricCanvasRef.current.add(rect);
//     fabricCanvasRef.current.setActiveObject(rect);
//     setTool('select');
//     setTimeout(() => updateYjsCanvas(), 100);
//   };

//   const addCircle = () => {
//     if (!permissionsRef.current.canDraw) return;
//     const circle = new fabric.Circle({
//       left: 100, top: 100, radius: 50,
//       fill: fillColor, stroke: brushColor, strokeWidth: brushWidth,
//       opacity: opacity, selectable: true,
//       id: `circle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
//     });
//     fabricCanvasRef.current.add(circle);
//     fabricCanvasRef.current.setActiveObject(circle);
//     setTool('select');
//     setTimeout(() => updateYjsCanvas(), 100);
//   };

//   const addTriangle = () => {
//     if (!permissionsRef.current.canDraw) return;
//     const triangle = new fabric.Triangle({
//       left: 100, top: 100, width: 100, height: 100,
//       fill: fillColor, stroke: brushColor, strokeWidth: brushWidth,
//       opacity: opacity, selectable: true,
//       id: `triangle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
//     });
//     fabricCanvasRef.current.add(triangle);
//     fabricCanvasRef.current.setActiveObject(triangle);
//     setTool('select');
//     setTimeout(() => updateYjsCanvas(), 100);
//   };

//   const addStar = () => {
//     if (!permissionsRef.current.canDraw) return;
//     const star = new fabric.Path('M 100 10 L 123 80 L 200 80 L 138 120 L 160 190 L 100 145 L 40 190 L 62 120 L 0 80 L 77 80 Z', {
//       left: 100, top: 100,
//       fill: fillColor, stroke: brushColor, strokeWidth: brushWidth,
//       opacity: opacity, selectable: true,
//       id: `star_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
//     });
//     fabricCanvasRef.current.add(star);
//     fabricCanvasRef.current.setActiveObject(star);
//     setTool('select');
//     setTimeout(() => updateYjsCanvas(), 100);
//   };

//   const addHexagon = () => {
//     if (!permissionsRef.current.canDraw) return;
//     const hexagon = new fabric.Polygon([
//       { x: 50, y: 0 }, { x: 100, y: 25 }, { x: 100, y: 75 },
//       { x: 50, y: 100 }, { x: 0, y: 75 }, { x: 0, y: 25 }
//     ], {
//       left: 100, top: 100,
//       fill: fillColor, stroke: brushColor, strokeWidth: brushWidth,
//       opacity: opacity, selectable: true,
//       id: `hexagon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
//     });
//     fabricCanvasRef.current.add(hexagon);
//     fabricCanvasRef.current.setActiveObject(hexagon);
//     setTool('select');
//     setTimeout(() => updateYjsCanvas(), 100);
//   };

//   const addText = () => {
//     if (!permissionsRef.current.canDraw) return;
//     const text = new fabric.IText('Double click to edit', {
//       left: 100, top: 100,
//       fontSize: fontSize, fontFamily: fontFamily,
//       fill: brushColor, selectable: true,
//       id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
//     });
//     fabricCanvasRef.current.add(text);
//     fabricCanvasRef.current.setActiveObject(text);
//     setTool('select');
//     setTimeout(() => updateYjsCanvas(), 100);
//   };

//   const addStickyNote = () => {
//     if (!permissionsRef.current.canDraw) return;
//     const stickyNote = new fabric.Rect({
//       left: 100, top: 100, width: 200, height: 150,
//       fill: stickyNoteColor, stroke: '#d4d4d4', strokeWidth: 1,
//       opacity: 0.9, shadow: 'rgba(0,0,0,0.2) 2px 2px 5px',
//       selectable: true,
//       id: `sticky_bg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
//     });
//     const text = new fabric.IText('Double click to edit note', {
//       left: 110, top: 110,
//       fontSize: 16, fontFamily: 'Arial',
//       fill: '#000000', selectable: true,
//       id: `sticky_text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
//     });
//     const group = new fabric.Group([stickyNote, text], {
//       selectable: true,
//       id: `sticky_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
//     });
//     fabricCanvasRef.current.add(group);
//     fabricCanvasRef.current.setActiveObject(group);
//     setTool('select');
//     setTimeout(() => updateYjsCanvas(), 100);
//   };

//   const startDrawingLine = () => {
//     if (!permissionsRef.current.canDraw) return;
//     const canvas = fabricCanvasRef.current;
//     let isDrawing = false;
//     let line = null;
    
//     const mouseDown = (options) => {
//       isDrawing = true;
//       const pointer = canvas.getPointer(options.e);
//       line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
//         stroke: brushColor, strokeWidth: brushWidth, selectable: true,
//         id: `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
//       setTimeout(() => updateYjsCanvas(), 100);
//     };
    
//     canvas.on('mouse:down', mouseDown);
//     canvas.on('mouse:move', mouseMove);
//     canvas.on('mouse:up', mouseUp);
//   };

//   const startDrawingArrow = () => {
//     if (!permissionsRef.current.canDraw) return;
//     const canvas = fabricCanvasRef.current;
//     let isDrawing = false;
//     let line = null;
//     let arrowHead = null;
    
//     const mouseDown = (options) => {
//       isDrawing = true;
//       const pointer = canvas.getPointer(options.e);
//       line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
//         stroke: brushColor, strokeWidth: brushWidth, selectable: true,
//         id: `arrow_line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
//       });
//       arrowHead = new fabric.Triangle({
//         width: 15, height: 15, fill: brushColor,
//         left: pointer.x, top: pointer.y, angle: 0,
//         selectable: false,
//         id: `arrow_head_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
//       arrowHead.set({ left: pointer.x, top: pointer.y, angle });
//       canvas.renderAll();
//     };
    
//     const mouseUp = () => {
//       isDrawing = false;
//       if (line && arrowHead) {
//         const group = new fabric.Group([line, arrowHead], {
//           selectable: true,
//           id: `arrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
//         });
//         canvas.remove(line);
//         canvas.remove(arrowHead);
//         canvas.add(group);
//       }
//       canvas.off('mouse:down', mouseDown);
//       canvas.off('mouse:move', mouseMove);
//       canvas.off('mouse:up', mouseUp);
//       setTool('select');
//       setTimeout(() => updateYjsCanvas(), 100);
//     };
    
//     canvas.on('mouse:down', mouseDown);
//     canvas.on('mouse:move', mouseMove);
//     canvas.on('mouse:up', mouseUp);
//   };

//   const uploadImage = () => {
//     if (!permissionsRef.current.canDraw) return;
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
//             selectable: true,
//             id: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
//           });
//           fabricCanvasRef.current.add(img);
//           fabricCanvasRef.current.setActiveObject(img);
//           setTool('select');
//           setTimeout(() => updateYjsCanvas(), 100);
//         });
//       };
//       reader.readAsDataURL(file);
//     };
//     input.click();
//   };

//   const activateEraser = () => {
//     if (!permissionsRef.current.canDelete) return;
//     const canvas = fabricCanvasRef.current;
//     canvas.isDrawingMode = false;
//     canvas.selection = false;
    
//     const mouseDown = (options) => {
//       const pointer = canvas.getPointer(options.e);
//       const objects = canvas.getObjects();
//       let removedCount = 0;
//       objects.forEach(obj => {
//         if (obj.containsPoint(pointer)) {
//           canvas.remove(obj);
//           removedCount++;
//         }
//       });
//       canvas.renderAll();
//       if (removedCount > 0) {
//         setTimeout(() => updateYjsCanvas(), 100);
//       }
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
//     const fileName = `whiteboard-${sessionInfo?.title || 'session'}-${new Date().toISOString().slice(0, 10)}.png`;
//     const link = document.createElement('a');
//     link.href = dataURL;
//     link.download = fileName;
//     link.click();
//   };

//   const exportAsJSON = () => {
//     if (!fabricCanvasRef.current) return;
//     const json = fabricCanvasRef.current.toJSON();
//     const dataStr = JSON.stringify(json);
//     const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
//     const fileName = `whiteboard-${sessionInfo?.title || 'session'}-${new Date().toISOString().slice(0, 10)}.json`;
//     const link = document.createElement('a');
//     link.href = dataUri;
//     link.download = fileName;
//     link.click();
//   };

//   const importFromJSON = () => {
//     if (!permissionsRef.current.canEdit) {
//       alert('You do not have permission to import files.');
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
//             setTimeout(() => updateYjsCanvas(), 100);
//           });
//         } catch (error) {
//           alert('Error loading JSON file. Please check the file format.');
//         }
//       };
//       reader.readAsText(file);
//     };
//     input.click();
//   };

//   const handleClear = () => {
//     if (!permissionsRef.current.canClear) {
//       alert('Only the streamer can clear the canvas.');
//       return;
//     }
    
//     if (window.confirm('Are you sure you want to clear the whiteboard?')) {
//       fabricCanvasRef.current.clear();
//       fabricCanvasRef.current.backgroundColor = '#ffffff';
//       saveState();
//       setTimeout(() => updateYjsCanvas(), 100);
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
//     addConnectionLog('Force reconnection initiated');
    
//     if (yProviderRef.current) {
//       try {
//         yProviderRef.current.disconnect();
//         yProviderRef.current.destroy();
//         yProviderRef.current = null;
//       } catch (error) {
//         console.error('Error destroying Yjs provider:', error);
//       }
//     }
    
//     if (window.canvasLoadTimeout) clearTimeout(window.canvasLoadTimeout);
//     if (window.canvasSyncTimeout) clearTimeout(window.canvasSyncTimeout);
    
//     setIsLoading(true);
//     setConnectionStatus('disconnected');
//     setConnectionError(null);
    
//     setTimeout(() => {
//       console.log('🔄 Reinitializing Yjs connection...');
//       initYjs();
//     }, 1000);
//   };

//   const checkPermissions = () => {
//     const newPermissions = {
//       canDraw: isStreamer || roomSettings.allowViewersToDraw,
//       canEdit: isStreamer || roomSettings.allowViewersToDraw,
//       canDelete: isStreamer,
//       canClear: isStreamer,
//       canChat: true,
//       canExport: true,
//       canImport: isStreamer
//     };
//     setPermissions(newPermissions);
//     permissionsRef.current = newPermissions;
//   };

//   if (!isActive) return null;

//   // Loading state
//   if (isLoading || connectionStatus === 'connecting') {
//     return (
//       <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
//         <div className="text-white text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
//           <div>Connecting to whiteboard...</div>
//           <div className="text-sm text-gray-400 mt-2">
//             Session: {sessionId} | Room: {roomCode}
//           </div>
          
//           {connectionError && (
//             <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
//               <div className="text-red-300 font-medium">Connection Error:</div>
//               <div className="text-sm text-red-400">{connectionError}</div>
//             </div>
//           )}
          
//           <button
//             onClick={forceReconnect}
//             className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white flex items-center justify-center mx-auto"
//           >
//             <FiRefreshCw className="mr-2" />
//             Retry Connection
//           </button>
//         </div>
//       </div>
//     );
//   }

//   if (connectionError && !isLoading) {
//     return (
//       <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
//         <div className="text-white text-center max-w-md">
//           <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
//             <FiX className="text-2xl" />
//           </div>
//           <h3 className="text-xl font-bold mb-2">Connection Failed</h3>
//           <div className="text-gray-300 mb-4">{connectionError}</div>
          
//           <div className="flex space-x-3">
//             <button
//               onClick={forceReconnect}
//               className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
//             >
//               Retry Connection
//             </button>
//             <button
//               onClick={onClose}
//               className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
//             >
//               Close Whiteboard
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

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
//                connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
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
//           <div className="flex items-center space-x-1 text-sm text-gray-300">
//             <FiUsers />
//             <span>{activeUsers.length + 1} online</span>
//           </div>
          
//           {isStreamer && (
//             <button
//               onClick={toggleViewersDraw}
//               className={`px-3 py-2 rounded-lg text-white text-sm flex items-center ${
//                 roomSettings.allowViewersToDraw 
//                   ? 'bg-green-600 hover:bg-green-700' 
//                   : 'bg-red-600 hover:bg-red-700'
//               }`}
//             >
//               {roomSettings.allowViewersToDraw ? '👥 Drawing ON' : '👥 Drawing OFF'}
//             </button>
//           )}
          
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

//       {/* Main Area - UI remains same */}
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
//                 {!permissions.canDraw && <FiLock className="ml-auto" size={12} />}
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
//                   <label className="text-xs text-gray-400">Opacity: {Math.round(opacity * 100)}%</label>
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
//             <div className="pt-4 border-t border-gray-700">
//               <h3 className="text-sm font-semibold text-gray-300 mb-2">Session Info</h3>
//               <div className="text-xs text-gray-400 space-y-1">
//                 <div className="flex justify-between">
//                   <span>Title:</span>
//                   <span className="text-gray-300">{sessionInfo?.title || 'Whiteboard Session'}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span>Room:</span>
//                   <span className="text-gray-300">{sessionInfo?.roomCode || roomCode || 'N/A'}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span>Participants:</span>
//                   <span className="text-gray-300">{activeUsers.length + 1}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span>Viewers can draw:</span>
//                   <span className={`font-medium ${roomSettings.allowViewersToDraw ? 'text-green-400' : 'text-red-400'}`}>
//                     {roomSettings.allowViewersToDraw ? 'Yes' : 'No'}
//                   </span>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Canvas Area */}
//         <div className="flex-1 relative overflow-hidden" ref={containerRef}>
//           <canvas ref={canvasRef} className="absolute inset-0" />
          
//           {/* View Only Overlay */}
//           {!permissions.canDraw && connectionStatus === 'connected' && (
//             <div className="absolute top-4 right-4 bg-yellow-800/80 text-white text-xs px-3 py-2 rounded-lg flex items-center">
//               <FiLock className="mr-1" size={12} /> View Only Mode
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
//                 <div>Session ID: {sessionId}</div>
//                 <div>User: {user?.name || 'Anonymous'} ({user?.id || user?._id})</div>
//                 <div>Role: {isStreamer ? 'Streamer' : 'Viewer'}</div>
//                 <div>Canvas Objects: {fabricCanvasRef.current?.getObjects().length || 0}</div>
                
//                 <div className="mt-2 font-bold">Room Settings:</div>
//                 <div className="grid grid-cols-2 gap-1">
//                   <div>Allow Viewers to Draw: {roomSettings.allowViewersToDraw ? '✅' : '❌'}</div>
//                   <div>Streamer: {roomSettings.streamerName || 'Unknown'}</div>
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
//                     <span className="text-sm text-gray-300">{activeUser.name}</span>
//                     <span className="text-xs bg-gray-800 px-2 py-1 rounded ml-auto">
//                       {activeUser.isStreamer ? 'Streamer' : 'Viewer'}
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             </div>
            
//             {/* Room Controls for Streamer */}
//             {isStreamer && (
//               <div className="pt-4 border-t border-gray-700">
//                 <h3 className="text-sm font-semibold text-gray-300 mb-2">Room Controls</h3>
//                 <div className="space-y-2">
//                   <button
//                     onClick={toggleViewersDraw}
//                     className={`w-full p-2 rounded-lg flex items-center justify-center space-x-2 ${
//                       roomSettings.allowViewersToDraw 
//                         ? 'bg-red-600 hover:bg-red-700' 
//                         : 'bg-green-600 hover:bg-green-700'
//                     } text-white`}
//                   >
//                     {roomSettings.allowViewersToDraw ? (
//                       <>
//                         <FiLock />
//                         <span>Disable Viewer Drawing</span>
//                       </>
//                     ) : (
//                       <>
//                         <FiUnlock />
//                         <span>Enable Viewer Drawing</span>
//                       </>
//                     )}
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// console.log('===================================================');
// console.log('🎨 WHITEBOARD COMPONENT DEFINED - FIXED');
// console.log('===================================================');

// export default WhiteboardComponent;