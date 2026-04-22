import { useCallback, useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { Toolbar } from '@/layout/Toolbar';
import { StatusBar } from '@/layout/StatusBar';
import { CanvasViewport } from '@/components/canvas/CanvasViewport';
import { LeftSidebar } from '@/components/sidebar/LeftSidebar';
import { RightSidebar } from '@/components/sidebar/RightSidebar';
import { SeatGenerationDialog } from '@/components/dialogs/SeatGenerationDialog';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { ExportComponentDialog } from '@/components/dialogs/ExportComponentDialog';
import { ShortcutsDialog } from '@/components/dialogs/ShortcutsDialog';
import { useCanvasStore, getTransformRef } from '@/store/canvasStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { downloadVenueJson } from '@/utils/exportJson';
import { parseVenueData, ImportError } from '@/utils/importJson';
import { readAutoSave, writeAutoSave } from '@/utils/autoSave';
import { getVisibleSections, flattenSections, findSectionById } from '@/utils/sectionTree';
import { createSection } from '@/utils/createSection';
import type { Point, Section, SectionShape } from '@/types';
import { toast } from 'sonner';
import { DesktopExperienceNotice } from '@/components/playground/DesktopExperienceNotice';

const AUTOSAVE_INTERVAL_MS = 30_000;

export default function Playground() {
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const removeSection = useCanvasStore((s) => s.removeSection);
  const deleteSeats = useCanvasStore((s) => s.deleteSeats);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const addSection = useCanvasStore((s) => s.addSection);
  const setSelectedIds = useCanvasStore((s) => s.setSelectedIds);
  const loadVenueData = useCanvasStore((s) => s.loadVenueData);
  const newCanvas = useCanvasStore((s) => s.newCanvas);
  const markSaved = useCanvasStore((s) => s.markSaved);
  const toggleCanvasLock = useCanvasStore((s) => s.toggleCanvasLock);
  const scaleSection = useCanvasStore((s) => s.scaleSection);
  const copySelection = useCanvasStore((s) => s.copySelection);
  const cutSelection = useCanvasStore((s) => s.cutSelection);
  const pasteClipboard = useCanvasStore((s) => s.pasteClipboard);
  const nudgeSelection = useCanvasStore((s) => s.nudgeSelection);
  const reorderSection = useCanvasStore((s) => s.reorderSection);
  const setSectionZIndexToExtreme = useCanvasStore((s) => s.setSectionZIndexToExtreme);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const groupSections = useCanvasStore((s) => s.groupSections);
  const uncontainSection = useCanvasStore((s) => s.uncontainSection);
  const updateSection = useCanvasStore((s) => s.updateSection);

  const [polygonActive, setPolygonActive] = useState(false);
  const [seatDialogSectionId, setSeatDialogSectionId] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [restorable, setRestorable] = useState<{ savedAt: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = readAutoSave();
    if (saved?.data?.sections?.length) {
      setRestorable({ savedAt: saved.savedAt });
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const { venueData, dirty } = useCanvasStore.getState();
      if (dirty) {
        writeAutoSave(venueData);
        markSaved();
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [markSaved]);

  const restoreAutoSave = useCallback(() => {
    const saved = readAutoSave();
    if (!saved) return;
    loadVenueData(saved.data);
    setRestorable(null);
    toast.success('Restored previous session');
  }, [loadVenueData]);

  const dismissRestore = useCallback(() => setRestorable(null), []);

  const handleSave = useCallback(() => {
    const { venueData } = useCanvasStore.getState();
    downloadVenueJson(venueData);
    writeAutoSave(venueData);
    markSaved();
    toast.success('Saved JSON');
  }, [markSaved]);

  const handleOpen = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChosen = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = parseVenueData(text);
        loadVenueData(data);
        toast.success(`Loaded ${data.venue.name}`);
      } catch (err) {
        if (err instanceof ImportError) {
          toast.error(err.message);
        } else {
          toast.error('Could not open file');
        }
      } finally {
        e.target.value = '';
      }
    },
    [loadVenueData]
  );

  const handleNew = useCallback(() => {
    const { venueData } = useCanvasStore.getState();
    if (venueData.sections.length > 0 || venueData.stage) {
      setConfirmNew(true);
    } else {
      newCanvas();
    }
  }, [newCanvas]);

  const handlePolygonFinish = useCallback(
    (points: Point[]) => {
      if (points.length < 3) return;
      const minX = Math.min(...points.map((p) => p.x));
      const minY = Math.min(...points.map((p) => p.y));
      const maxX = Math.max(...points.map((p) => p.x));
      const maxY = Math.max(...points.map((p) => p.y));
      const width = Math.max(20, maxX - minX);
      const height = Math.max(20, maxY - minY);
      const localPoints = points.map((p) => ({ x: p.x - minX, y: p.y - minY }));

      const { venueData } = useCanvasStore.getState();
      const section: Section = {
        id: nanoid(),
        type: 'polygon',
        name: `Polygon ${venueData.sections.length + 1}`,
        price: 0,
        currency: '$',
        bounds: { x: minX, y: minY, width, height },
        rotation: 0,
        fill: '#a855f733',
        stroke: '#a855f7',
        strokeWidth: 1,
        opacity: 0.95,
        labelVisible: true,
        seats: [],
        zIndex: Math.max(0, ...venueData.sections.map((s) => s.zIndex)) + 1,
        seatIcon: 'chair',
        points: localPoints,
      };
      addSection(section);
      setSelectedIds([section.id]);
      setPolygonActive(false);
    },
    [addSection, setSelectedIds]
  );

  const handleDelete = useCallback(() => {
    const { selectedIds, venueData, canvasLocked } = useCanvasStore.getState();
    if (canvasLocked) return;
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const sectionIds: string[] = [];
    for (const sec of flattenSections(venueData.sections)) {
      if (selectedSet.has(sec.id)) sectionIds.push(sec.id);
    }
    for (const id of sectionIds) removeSection(id);
    const seatIds = selectedIds.filter((id) => !sectionIds.includes(id));
    if (seatIds.length) deleteSeats(seatIds);
  }, [removeSection, deleteSeats]);

  const handleScale = useCallback(
    (factor: number) => {
      const { selectedIds, venueData, canvasLocked } = useCanvasStore.getState();
      if (canvasLocked || !selectedIds.length) return;
      const selectedSet = new Set(selectedIds);
      for (const sec of flattenSections(venueData.sections)) {
        if (selectedSet.has(sec.id)) scaleSection(sec.id, factor);
      }
    },
    [scaleSection]
  );

  const handleEscape = useCallback(() => {
    if (polygonActive) {
      setPolygonActive(false);
      return;
    }
    const { drillPath, drillUp, selectedIds } = useCanvasStore.getState();
    if (selectedIds.length) {
      clearSelection();
      return;
    }
    if (drillPath.length) {
      drillUp();
    }
  }, [polygonActive, clearSelection]);

  const handleSelectAll = useCallback(() => {
    const { venueData, drillPath } = useCanvasStore.getState();
    setSelectedIds(getVisibleSections(venueData, drillPath).map((s) => s.id));
  }, [setSelectedIds]);

  const handleNudge = useCallback(
    (dx: number, dy: number) => {
      nudgeSelection(dx, dy);
    },
    [nudgeSelection]
  );

  const handleZoomIn = useCallback(() => {
    const ref = getTransformRef();
    ref?.zoomIn(0.2);
  }, []);

  const handleZoomOut = useCallback(() => {
    const ref = getTransformRef();
    ref?.zoomOut(0.2);
  }, []);

  const handleZoomActual = useCallback(() => {
    const ref = getTransformRef();
    if (!ref) return;
    ref.setTransform(ref.state.positionX, ref.state.positionY, 1);
  }, []);

  const handleZoomFit = useCallback(() => {
    const ref = getTransformRef();
    if (!ref) return;
    const { venueData } = useCanvasStore.getState();
    const wrapperEl =
      (ref as unknown as { instance?: { wrapperComponent?: HTMLElement | null } }).instance
        ?.wrapperComponent ?? null;
    const rect = wrapperEl?.getBoundingClientRect();
    const viewportW = rect?.width ?? window.innerWidth;
    const viewportH = rect?.height ?? window.innerHeight;
    const pad = 40;
    const scale = Math.max(
      0.1,
      Math.min(
        (viewportW - pad * 2) / Math.max(1, venueData.venue.width),
        (viewportH - pad * 2) / Math.max(1, venueData.venue.height)
      )
    );
    const cx = (viewportW - venueData.venue.width * scale) / 2;
    const cy = (viewportH - venueData.venue.height * scale) / 2;
    ref.setTransform(cx, cy, scale);
  }, []);

  const handleReorder = useCallback(
    (direction: 'up' | 'down') => {
      const { selectedIds, venueData, canvasLocked } = useCanvasStore.getState();
      if (canvasLocked) return;
      const selectedSet = new Set(selectedIds);
      for (const sec of flattenSections(venueData.sections)) {
        if (selectedSet.has(sec.id)) reorderSection(sec.id, direction);
      }
    },
    [reorderSection]
  );

  const handleReorderExtreme = useCallback(
    (extreme: 'front' | 'back') => {
      const { selectedIds, venueData, canvasLocked } = useCanvasStore.getState();
      if (canvasLocked) return;
      const selectedSet = new Set(selectedIds);
      for (const sec of flattenSections(venueData.sections)) {
        if (selectedSet.has(sec.id)) setSectionZIndexToExtreme(sec.id, extreme);
      }
    },
    [setSectionZIndexToExtreme]
  );

  const handleRename = useCallback(() => {
    const { selectedIds, venueData, canvasLocked } = useCanvasStore.getState();
    if (canvasLocked || selectedIds.length !== 1) return;
    const section = findSectionById(venueData, selectedIds[0]);
    if (!section) return;
    const next = window.prompt('Rename section', section.name);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === section.name) return;
    updateSection(section.id, { name: trimmed });
  }, [updateSection]);

  const handleCopy = useCallback(() => {
    copySelection();
  }, [copySelection]);

  const handleCut = useCallback(() => {
    const { canvasLocked } = useCanvasStore.getState();
    if (canvasLocked) return;
    cutSelection();
  }, [cutSelection]);

  const handlePaste = useCallback(() => {
    const { canvasLocked } = useCanvasStore.getState();
    if (canvasLocked) return;
    const ids = pasteClipboard({ x: 20, y: 20 });
    if (ids.length) toast.success(`Pasted ${ids.length} item${ids.length > 1 ? 's' : ''}`);
  }, [pasteClipboard]);

  const handleGroup = useCallback(() => {
    const { selectedIds, venueData, canvasLocked } = useCanvasStore.getState();
    if (canvasLocked || selectedIds.length === 0) return;
    const sectionIds: string[] = [];
    const selectedSet = new Set(selectedIds);
    for (const sec of flattenSections(venueData.sections)) {
      if (selectedSet.has(sec.id)) sectionIds.push(sec.id);
    }
    if (sectionIds.length < 2) return;
    const id = groupSections(sectionIds);
    if (id) toast.success('Grouped');
  }, [groupSections]);

  const handleUngroup = useCallback(() => {
    const { selectedIds, venueData, canvasLocked } = useCanvasStore.getState();
    if (canvasLocked || selectedIds.length !== 1) return;
    const sec = findSectionById(venueData, selectedIds[0]);
    if (!sec || !sec.children || sec.children.length === 0) return;
    uncontainSection(sec.id);
    toast.success('Ungrouped');
  }, [uncontainSection]);

  const spawnShape = useCallback(
    (type: SectionShape) => {
      const { canvasLocked, venueData, cursorPosition, drillPath } = useCanvasStore.getState();
      if (canvasLocked) return;
      const parent = drillPath.length
        ? findSectionById(venueData, drillPath[drillPath.length - 1])
        : null;
      const siblings = parent?.children ?? venueData.sections;
      const zIndex = Math.max(0, ...siblings.map((s) => s.zIndex)) + 1;
      const section = createSection({
        type,
        x: cursorPosition.x - 110,
        y: cursorPosition.y - 80,
        zIndex,
      });
      addSection(section);
      setSelectedIds([section.id]);
    },
    [addSection, setSelectedIds]
  );

  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onSave: handleSave,
    onOpen: handleOpen,
    onNew: handleNew,
    onDelete: handleDelete,
    onEscape: handleEscape,
    onSelectAll: handleSelectAll,
    onExport: () => setExportOpen(true),
    onToggleLock: toggleCanvasLock,
    onScaleUp: () => handleScale(1.1),
    onScaleDown: () => handleScale(1 / 1.1),
    onCopy: handleCopy,
    onCut: handleCut,
    onPaste: handlePaste,
    onNudge: handleNudge,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onZoomFit: handleZoomFit,
    onZoomActual: handleZoomActual,
    onSendBackward: () => handleReorder('down'),
    onBringForward: () => handleReorder('up'),
    onSendToBack: () => handleReorderExtreme('back'),
    onBringToFront: () => handleReorderExtreme('front'),
    onRename: handleRename,
    onGroup: handleGroup,
    onUngroup: handleUngroup,
    onShowHelp: () => setShortcutsOpen(true),
    onToolSelect: () => setActiveTool('select'),
    onToolHand: () => setActiveTool('hand'),
    onToolRect: () => spawnShape('rectangle'),
    onToolEllipse: () => spawnShape('ellipse'),
    onToolPolygon: () => setPolygonActive((a) => !a),
  });

  return (
    <div
      className="flex flex-col h-[100dvh] min-h-[100dvh] w-screen overflow-hidden"
      style={{ background: 'var(--bg-app)' }}
    >
      <DesktopExperienceNotice />

      <Toolbar
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onExportComponent={() => setExportOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          polygonActive={polygonActive}
          onStartPolygon={() => setPolygonActive((a) => !a)}
        />

        <CanvasViewport
          polygonActive={polygonActive}
          onPolygonFinish={handlePolygonFinish}
          onPolygonCancel={() => setPolygonActive(false)}
          onGenerateSeats={(id) => setSeatDialogSectionId(id)}
        />

        <RightSidebar onGenerateSeats={(id) => setSeatDialogSectionId(id)} />
      </div>

      <StatusBar onShowHelp={() => setShortcutsOpen(true)} />

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileChosen}
      />

      <SeatGenerationDialog
        open={seatDialogSectionId !== null}
        sectionId={seatDialogSectionId}
        onClose={() => setSeatDialogSectionId(null)}
      />

      <ConfirmDialog
        open={confirmNew}
        title="Start a new canvas?"
        description="Your current unsaved work will be cleared. This can be undone with Ctrl+Z."
        confirmLabel="New Canvas"
        danger
        onConfirm={() => {
          newCanvas();
          setConfirmNew(false);
        }}
        onCancel={() => setConfirmNew(false)}
      />

      <ExportComponentDialog open={exportOpen} onClose={() => setExportOpen(false)} />

      <ConfirmDialog
        open={!!restorable}
        title="Restore previous session?"
        description={
          restorable
            ? `A session from ${new Date(restorable.savedAt).toLocaleString()} was found in local storage.`
            : undefined
        }
        confirmLabel="Restore"
        cancelLabel="Dismiss"
        onConfirm={restoreAutoSave}
        onCancel={dismissRestore}
      />
    </div>
  );
}
