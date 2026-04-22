import React, { useCallback, useRef } from 'react';
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import { useCanvasStore } from '@/store/canvasStore';
import { CanvasLayer } from './CanvasLayer';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import type { Point } from '@/types';

interface CanvasViewportProps {
  children?: React.ReactNode;
  onGenerateSeats?: (sectionId: string) => void;
  onRename?: (sectionId: string) => void;
  polygonActive?: boolean;
  onPolygonFinish?: (points: Point[]) => void;
  onPolygonCancel?: () => void;
}

export function CanvasViewport({
  children,
  onGenerateSeats,
  onRename,
  polygonActive,
  onPolygonFinish,
  onPolygonCancel,
}: CanvasViewportProps) {
  const gridEnabled = useCanvasStore((s) => s.gridEnabled);
  const gridSize = useCanvasStore((s) => s.gridSize);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const setPanOffset = useCanvasStore((s) => s.setPanOffset);
  const setCursorPosition = useCanvasStore((s) => s.setCursorPosition);
  const venueData = useCanvasStore((s) => s.venueData);
  const canvasLocked = useCanvasStore((s) => s.canvasLocked);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!contentRef.current) return;
      const rect = contentRef.current.getBoundingClientRect();
      const state = transformRef.current?.state;
      const scale = state?.scale ?? 1;
      setCursorPosition({
        x: Math.round((e.clientX - rect.left) / scale),
        y: Math.round((e.clientY - rect.top) / scale),
      });
    },
    [setCursorPosition]
  );

  return (
    <div
      className="flex-1 relative overflow-hidden"
      style={{ background: 'var(--bg-canvas)' }}
      onMouseMove={handleMouseMove}
    >
      <Breadcrumb />
      {canvasLocked && (
        <>
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 0 1px var(--accent-border)',
              background:
                'linear-gradient(180deg, var(--accent-soft) 0%, transparent 12%, transparent 88%, var(--accent-soft) 100%)',
              mixBlendMode: 'normal',
              opacity: 0.5,
            }}
          />
          <div
            className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[11px] font-medium pointer-events-none animate-fade-in"
            style={{
              background: 'var(--accent-soft)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent)',
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="mono-label mono-label--tight" style={{ color: 'var(--accent)' }}>
              Canvas locked
            </span>
          </div>
        </>
      )}
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.1}
        maxScale={5}
        panning={{ activationKeys: [' '], velocityDisabled: true, disabled: canvasLocked }}
        wheel={{ step: 0.08, disabled: canvasLocked }}
        pinch={{ disabled: canvasLocked }}
        doubleClick={{ disabled: true }}
        limitToBounds={false}
        onTransform={(ref) => {
          setZoom(ref.state.scale);
          setPanOffset({ x: ref.state.positionX, y: ref.state.positionY });
        }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{
            width: `${venueData.venue.width}px`,
            height: `${venueData.venue.height}px`,
            position: 'relative',
          }}
        >
          <div
            ref={contentRef}
            className="relative"
            style={{
              width: `${venueData.venue.width}px`,
              height: `${venueData.venue.height}px`,
              background: venueData.venue.background,
            }}
          >
            {gridEnabled && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ opacity: 0.35 }}
              >
                <defs>
                  <pattern
                    id="grid"
                    width={gridSize}
                    height={gridSize}
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="1" cy="1" r="0.6" fill="var(--text-faint)" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            )}

            <CanvasLayer
              onGenerateSeats={onGenerateSeats}
              onRename={onRename}
              polygonActive={polygonActive}
              onPolygonFinish={onPolygonFinish}
              onPolygonCancel={onPolygonCancel}
            />

            {venueData.sections.length === 0 && !venueData.stage && !polygonActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center space-y-3 animate-fade-in">
                  <div
                    className="mono-label mx-auto inline-block px-2.5 py-1 rounded-sm"
                    style={{
                      color: 'var(--text-muted)',
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    Empty canvas
                  </div>
                  <p
                    className="display-heading text-[28px]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Drag a shape or pick a template
                  </p>
                  <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    Start building your venue on the left, or open a template.
                  </p>
                </div>
              </div>
            )}
            {children}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
