import React, {
  forwardRef, useRef, useEffect, useCallback, useImperativeHandle,
} from 'react';
import { Box } from '@mui/material';

export interface DrawingCanvasHandle {
  undo: () => void;
  clear: () => void;
}

interface DrawingCanvasProps {
  tool: 'pen' | 'eraser';
  color: string;
  lineWidth: number;
  active: boolean;
}

const HISTORY_LIMIT = 20;

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  ({ tool, color, lineWidth, active }, ref) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);
    const historyRef = useRef<ImageData[]>([]);

    // Keep canvas pixel size in sync with container (fixes blur on retina or resize)
    useEffect(() => {
      const wrapper = wrapperRef.current;
      const canvas = canvasRef.current;
      if (!wrapper || !canvas) return;
      const ro = new ResizeObserver(entries => {
        const { width, height } = entries[0].contentRect;
        const ctx = canvas.getContext('2d');
        let saved: ImageData | null = null;
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          saved = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);
        if (saved && ctx) ctx.putImageData(saved, 0, 0);
      });
      ro.observe(wrapper);
      return () => ro.disconnect();
    }, []);

    const getXY = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const r = canvasRef.current!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!active) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const cv = canvasRef.current!;
      const ctx = cv.getContext('2d')!;
      // Snapshot before stroke for undo
      historyRef.current.push(ctx.getImageData(0, 0, cv.width, cv.height));
      if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
      drawingRef.current = true;
      lastPosRef.current = getXY(e);
      // Paint a dot on click/tap
      const pos = lastPosRef.current;
      ctx.save();
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }, [active, tool, color, lineWidth]);

    const onMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current || !active) return;
      const ctx = canvasRef.current!.getContext('2d')!;
      const pos = getXY(e);
      const last = lastPosRef.current!;
      ctx.save();
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.restore();
      lastPosRef.current = pos;
    }, [active, tool, color, lineWidth]);

    const onUp = useCallback(() => {
      drawingRef.current = false;
      lastPosRef.current = null;
    }, []);

    useImperativeHandle(ref, () => ({
      undo() {
        const cv = canvasRef.current;
        if (!cv || !historyRef.current.length) return;
        cv.getContext('2d')!.putImageData(historyRef.current.pop()!, 0, 0);
      },
      clear() {
        const cv = canvasRef.current;
        if (!cv) return;
        cv.getContext('2d')!.clearRect(0, 0, cv.width, cv.height);
        historyRef.current = [];
      },
    }));

    return (
      <Box
        ref={wrapperRef}
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: active ? 10 : 0,
          pointerEvents: active ? 'auto' : 'none',
          cursor: active ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        />
      </Box>
    );
  },
);

DrawingCanvas.displayName = 'DrawingCanvas';
export default DrawingCanvas;
