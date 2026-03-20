import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Stage, Layer, Rect, Text, Group, Circle, Line, Path, Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';
import { 
  Monitor, 
  MonitorPlay, 
  Tablet, 
  Smartphone,
  ScanBarcode, 
  Printer, 
  Tv, 
  Activity, 
  Factory, 
  Cpu, 
  Database, 
  Weight, 
  Wifi, 
  Network, 
  Router,
  CircuitBoard,
  Settings,
  Plus,
  Trash2,
  Settings2,
  Download,
  Save,
  Upload,
  Grid3X3,
  Layers,
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  X,
  FilePlus,
  Layout as LayoutIcon,
  Edit3,
  Folder,
  ChevronDown,
  FolderPlus,
  ZoomIn,
  ZoomOut,
  Minus,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Undo2,
  Redo2,
  Pin,
  PinOff,
  Check,
  Pen,
  Circle as CircleIcon,
  Eraser,
  MousePointer2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface LayoutItem {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  name: string;
  note?: string;
  quantity?: number;
  options?: string[];
  optionQuantities?: Record<string, number>;
}

type ItemType = 
  | 'Wifi' 
  | 'PLC' 
  | 'PC' 
  | 'TV' 
  | 'Scale' 
  | 'Kiosk' 
  | 'PDA' 
  | 'Scanner' 
  | 'LabelPrinter'
  | 'LAN'
  | 'Switch'
  | 'Sensor'
  | 'Machine'
  | 'DataIntegration';

type ItemCategory = 'general' | 'facility' | 'network';

interface Connection {
  id: string;
  from: string;
  to: string;
}

type BgElementType = 'pen' | 'rect' | 'circle' | 'symbol' | 'text';

interface BackgroundElement {
  id: string;
  type: BgElementType;
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  symbolType?: string;
  pathData?: string;
  text?: string;
  fontSize?: number;
}

interface ItemDefinition {
  type: ItemType;
  label: string;
  icon: React.ReactNode;
  color: string;
  pathData: string;
  category: ItemCategory;
}

interface Layout {
  id: string;
  name: string;
  items: LayoutItem[];
  connections?: Connection[];
  canvasSize: { width: number; height: number };
  bgImageUrl: string | null;
  bgImageOpacity: number;
  backgroundElements?: BackgroundElement[];
}

interface Project {
  id: string;
  name: string;
  layouts: Layout[];
  isExpanded?: boolean;
}

// --- Custom Icons ---
const KioskIcon = ({ size = 20, color = 'currentColor', strokeWidth = 1.6 }: { size?: number, color?: string, strokeWidth?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Body */}
    <rect x="5" y="2" width="14" height="14" rx="2" />
    {/* Screen */}
    <rect x="8" y="5" width="8" height="6" />
    {/* Buttons/Slots */}
    <line x1="10" y1="13" x2="11" y2="13" />
    <line x1="13" y1="13" x2="14" y2="13" />
    {/* Stand */}
    <path d="M11 16v4h2v-4" />
    {/* Base */}
    <rect x="5" y="20" width="14" height="2" rx="1" />
  </svg>
);

const ZebraPrinterIcon = ({ size = 20, color = 'currentColor', strokeWidth = 1.6 }: { size?: number, color?: string, strokeWidth?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Main Chassis - Industrial Box Shape */}
    <rect x="4" y="4" width="16" height="16" rx="1" />
    {/* Side Panel (Media View Window) */}
    <rect x="6" y="7" width="7" height="8" rx="0.5" />
    {/* Front Control Panel (Right Side) */}
    <path d="M15 4v16" />
    {/* Screen on Control Panel */}
    <rect x="16.5" y="6" width="2" height="3" rx="0.5" />
    {/* Control Buttons */}
    <circle cx="17.5" cy="11" r="0.5" fill="currentColor" />
    <circle cx="17.5" cy="13" r="0.5" fill="currentColor" />
    <circle cx="17.5" cy="15" r="0.5" fill="currentColor" />
    {/* Label Exit Slot */}
    <line x1="6" y1="17" x2="13" y2="17" />
  </svg>
);

const ARCH_SYMBOLS = [
  { id: 'door', label: '문', path: 'M 0 0 L 50 0 M 50 0 A 50 50 0 0 1 0 50' },
  { id: 'window', label: '창문', path: 'M 0 0 L 50 0 M 0 20 L 50 20 M 0 7 L 50 7 M 0 13 L 50 13' },
  { id: 'stairs', label: '계단', path: 'M 0 0 L 50 0 L 50 50 L 0 50 Z M 0 10 L 50 10 M 0 20 L 50 20 M 0 30 L 50 30 M 0 40 L 50 40 M 25 45 L 25 5 M 20 10 L 25 5 L 30 10' },
  { id: 'toilet', label: '화장실', path: 'M 10 0 L 40 0 L 40 15 L 10 15 Z M 12 15 C 12 50 38 50 38 15' },
  { id: 'entrance', label: '출입구', path: 'M 10 40 L 25 10 L 40 40 Z M 25 10 L 25 50' },
  { id: 'xray', label: 'X-ray', path: 'M 0 0 L 50 0 L 50 50 L 0 50 Z M 5 5 L 45 45 M 45 5 L 5 45 M 10 10 L 40 10 L 40 40 L 10 40 Z' },
  { id: 'weight_sorter', label: '중량 선별기', path: 'M 0 10 L 50 10 L 50 40 L 0 40 Z M 10 10 L 10 40 M 40 10 L 40 40 M 20 5 L 30 5 L 30 15 L 20 15 Z' },
  { id: 'hygiene', label: '위생전실', path: 'M 0 0 L 50 0 L 50 50 L 0 50 Z M 15 10 C 15 5 35 5 35 10 L 35 25 C 35 35 15 35 15 25 Z M 20 40 L 30 40 M 25 35 L 25 45' },
  { id: 'conveyor', label: '컨베어', path: 'M 0 15 L 50 15 L 50 35 L 0 35 Z M 5 15 L 5 35 M 15 15 L 15 35 M 25 15 L 25 35 M 35 15 L 35 35 M 45 15 L 45 35' },
];
const ITEM_DEFINITIONS: ItemDefinition[] = [
  { 
    type: 'PC', 
    label: 'PC', 
    icon: <Monitor size={20} />, 
    color: '#10b981',
    pathData: 'M2 3h20v14H2z M8 21h8 M12 17v4',
    category: 'general'
  },
  { 
    type: 'Kiosk', 
    label: '키오스크', 
    icon: <KioskIcon size={20} />, 
    color: '#ec4899',
    pathData: 'M5 2h14v14H5z M8 5h8v6H8z M10 13h1 M13 13h1 M11 16v4h2v-4 M5 20h14v2H5z',
    category: 'general'
  },
  { 
    type: 'PDA', 
    label: 'PDA', 
    icon: <Smartphone size={20} />, 
    color: '#06b6d4',
    pathData: 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M12 18h.01',
    category: 'general'
  },
  { 
    type: 'Scanner', 
    label: '스캐너', 
    icon: <ScanBarcode size={20} />, 
    color: '#f97316',
    pathData: 'M7 2h10l1 4h-12l1-4z M8 6h8v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4z M10 12h4v8a2 2 0 0 1-2 2h-0a2 2 0 0 1-2-2v-8z',
    category: 'general'
  },
  { 
    type: 'LabelPrinter', 
    label: '라벨프린터', 
    icon: <ZebraPrinterIcon size={20} />, 
    color: '#64748b',
    pathData: 'M4 4h16v16H4z M6 7h7v8H6z M15 4v16 M16.5 6h2v3h-2z M6 17h7',
    category: 'general'
  },
  { 
    type: 'TV', 
    label: 'TV', 
    icon: <Tv size={20} />, 
    color: '#f59e0b',
    pathData: 'M2 7h20v13H2z M7 21l5-4 5 4 M12 17v4 M8 3l4 4 4-4',
    category: 'general'
  },
  { 
    type: 'Sensor', 
    label: '센서', 
    icon: <Activity size={20} />, 
    color: '#ef4444',
    pathData: 'M22 12h-4l-3 9L9 3l-3 9H2',
    category: 'facility'
  },
  { 
    type: 'Machine', 
    label: '기계장치', 
    icon: <Settings size={20} />, 
    color: '#475569',
    pathData: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z',
    category: 'facility'
  },
  { 
    type: 'PLC', 
    label: 'PLC', 
    icon: <Cpu size={20} />, 
    color: '#8b5cf6',
    pathData: 'M4 4h16v16H4z M9 9h6v6H9z M9 1v3 M15 1v3 M9 20v3 M15 20v3 M20 9h3 M20 14h3 M1 9h3 M1 14h3',
    category: 'facility'
  },
  { 
    type: 'DataIntegration', 
    label: '데이터 연동', 
    icon: <CircuitBoard size={20} />, 
    color: '#14b8a6',
    pathData: 'M12 3c7.2 0 9 1.8 9 3s-1.8 3-9 3-9-1.8-9-3 1.8-3 9-3z M3 6v12c0 1.2 1.8 3 9 3s9-1.8 9-3V6 M3 12c0 1.2 1.8 3 9 3s9-1.8 9-3 M3 18c0 1.2 1.8 3 9 3s9-1.8 9-3',
    category: 'facility'
  },
  { 
    type: 'Scale', 
    label: '저울', 
    icon: <Weight size={20} />, 
    color: '#8b5cf6',
    pathData: 'M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M12 4v16 M4 12h16',
    category: 'facility'
  },
  { 
    type: 'Wifi', 
    label: 'Wifi', 
    icon: <Wifi size={20} />, 
    color: '#3b82f6',
    pathData: 'M5 12.55a11 11 0 0 1 14.08 0 M1.42 9a16 16 0 0 1 21.16 0 M8.59 16.11a6 6 0 0 1 6.82 0 M12 20h.01',
    category: 'network'
  },
  { 
    type: 'LAN', 
    label: 'LAN', 
    icon: <Network size={20} />, 
    color: '#2563eb',
    pathData: 'M12 2v6 M12 8h8v6 M12 8H4v6 M4 14v8 M12 14v8 M20 14v8',
    category: 'network'
  },
  { 
    type: 'Switch', 
    label: '스위치', 
    icon: <Router size={20} />, 
    color: '#0284c7',
    pathData: 'M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z M6 15h12 M6 9h12',
    category: 'network'
  }
];

const ITEM_OPTIONS = [
  { id: 'scanner', label: '스캐너', color: '#ef4444' },
  { id: 'lan', label: 'LAN', color: '#3b82f6' },
  { id: 'datalink', label: '데이터연동', color: '#10b981' },
  { id: 'plc', label: 'PLC', color: '#f59e0b' },
  { id: 'sensor', label: '센서', color: '#8b5cf6' },
];

const OPTION_TO_TYPE: Record<string, string> = {
  'scanner': 'Scanner',
  'lan': 'LAN',
  'datalink': 'DataIntegration',
  'plc': 'PLC',
  'sensor': 'Sensor'
};

const GRID_SIZE = 40;
const SNAP_SIZE = 10;

const snapToGrid = (value: number, snap: number = SNAP_SIZE) => {
  return Math.round(value / snap) * snap;
};

const STORAGE_KEY = 'equipment_layout_data';
const ACTIVE_LAYOUT_KEY = 'equipment_active_layout_id';

// Global cache for tinted icon canvases to prevent redundant processing
const iconCanvasCache = new Map<string, HTMLCanvasElement>();

const EquipmentIcon = ({ def, isSelected, isHighlighted, opacity = 0.85, size = 56 }: { def: ItemDefinition | undefined, isSelected: boolean, isHighlighted?: boolean, opacity?: number, size?: number }) => {
  const iconSize = size * (42 / 56); // Increased from 32/56 for a tighter fit
  const [tintedCanvas, setTintedCanvas] = useState<HTMLCanvasElement | null>(null);
  
  // OFF-SCREEN CANVAS TINTING & CACHING
  useEffect(() => {
    if (!def) {
      setTintedCanvas(null);
      return;
    }

    const cacheKey = `${def.type}-${def.color}-${iconSize}`;
    if (iconCanvasCache.has(cacheKey)) {
      setTintedCanvas(iconCanvasCache.get(cacheKey)!);
      return;
    }

    // 1. Generate Base SVG (Pure Black)
    const renderSize = iconSize * 4;
    const baseSvgString = renderToStaticMarkup(
      React.cloneElement(def.icon as React.ReactElement<any>, { 
        size: renderSize, 
        color: "#000000", // Base color for masking
        strokeWidth: 1.6,
        xmlns: "http://www.w3.org/2000/svg"
      })
    );
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(baseSvgString)}`;

    // 2. Load Base Image and Apply Tinting via Off-screen Canvas
    const img = new window.Image();
    img.src = dataUrl;
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      canvas.width = renderSize * dpr;
      canvas.height = renderSize * dpr;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Set high quality smoothing for the initial draw
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Scale context to handle high-DPI
        ctx.scale(dpr, dpr);
        
        // Draw the black icon as a mask
        ctx.drawImage(img, 0, 0);
        
        // MASKING: Use source-in to fill the icon's pixels with the target color
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = def.color;
        ctx.fillRect(0, 0, renderSize, renderSize);
        
        iconCanvasCache.set(cacheKey, canvas);
        setTintedCanvas(canvas);
      }
    };
    img.onerror = () => {
      console.error("Failed to load base icon for tinting:", def.type);
      setTintedCanvas(null);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [def?.type, def?.color, iconSize]);

  const halfSize = size / 2;
  const iconHalfSize = iconSize / 2;

  return (
    <Group>
      {/* Background/Selection Ring */}
      <Rect
        x={-halfSize}
        y={-halfSize}
        width={size}
        height={size}
        fill={`rgba(255, 255, 255, ${opacity})`}
        cornerRadius={size * (10 / 56)} // Slightly reduced from 12/56
        shadowBlur={isSelected ? 10 : 2}
        shadowColor="black"
        shadowOpacity={isSelected ? 0.3 : 0.1}
        shadowOffset={{ x: 0, y: 2 }}
      />
      <Rect
        x={-halfSize}
        y={-halfSize}
        width={size}
        height={size}
        fill={`${def?.color}15`}
        cornerRadius={size * (10 / 56)} // Slightly reduced from 12/56
        stroke={isSelected ? def?.color : isHighlighted ? def?.color : `${def?.color}00`}
        strokeWidth={isSelected ? 2 : isHighlighted ? 4 : 2}
        dash={isHighlighted && !isSelected ? [4, 4] : []}
      />
      {tintedCanvas && (
        <KonvaImage
          image={tintedCanvas}
          x={-iconHalfSize}
          y={-iconHalfSize - (size * 0.05)} // Lowered slightly for slight overlap with badges
          width={iconSize}
          height={iconSize}
          imageSmoothingEnabled={false}
        />
      )}
    </Group>
  );
};

export default function App() {
  // Load initial data
  const [projects, setProjects] = useState<Project[]>([]);

  const [activeLayoutId, setActiveLayoutId] = useState<string | null>(null);

  const [fileHandle, setFileHandle] = useState<any>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionRect, setSelectionRect] = useState({ x1: 0, y1: 0, x2: 0, y2: 0, visible: false });
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number, y: number } | null>(null);
  
  const [editingItem, setEditingItem] = useState<LayoutItem | null>(null);
  const [itemsToDelete, setItemsToDelete] = useState<string[] | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'project' | 'layout';
    projectId: string;
    layoutId?: string;
    name: string;
  } | null>(null);
  const [hoveredItem, setHoveredItem] = useState<{ id: string, x: number, y: number } | null>(null);
  const [highlightedItemType, setHighlightedItemType] = useState<string | null>(null);
  const [renamingLayoutId, setRenamingLayoutId] = useState<string | null>(null);
  const [tempLayoutName, setTempLayoutName] = useState('');
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [tempProjectName, setTempProjectName] = useState('');
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [globalIconOpacity, setGlobalIconOpacity] = useState(0.85);
  const [globalIconSize, setGlobalIconSize] = useState(56);
  const [zoom, setZoom] = useState(1);
  const [leftSidebarPinned, setLeftSidebarPinned] = useState(true);
  const [rightSidebarPinned, setRightSidebarPinned] = useState(true);
  const [leftSidebarHovered, setLeftSidebarHovered] = useState(false);
  const [rightSidebarHovered, setRightSidebarHovered] = useState(false);
  const [showConnections, setShowConnections] = useState(true);
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [lineStartId, setLineStartId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);
  const [hiddenItemTypes, setHiddenItemTypes] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Background Edit Mode States
  const [isBgEditMode, setIsBgEditMode] = useState(false);
  const [bgDrawTool, setBgDrawTool] = useState<'select' | 'pen' | 'rect' | 'circle' | 'eraser' | 'symbol' | 'text'>('pen');
  const [bgDrawColor, setBgDrawColor] = useState('#000000');
  const [bgDrawWidth, setBgDrawWidth] = useState(2);
  const [bgFontSize, setBgFontSize] = useState(20);
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null);
  const [currentBgElement, setCurrentBgElement] = useState<BackgroundElement | null>(null);
  const [selectedBgElementId, setSelectedBgElementId] = useState<string | null>(null);
  const bgTransformerRef = useRef<any>(null);

  const rgbToHex = (r: number, g: number, b: number) => {
    const clamp = (n: number) => Math.max(0, Math.min(255, n));
    return "#" + ((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b)).toString(16).slice(1);
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };
  
  // Helper for saving/loading data with settings
  const getSaveData = () => {
    return JSON.stringify({
      projects,
      settings: {
        showGrid,
        globalIconOpacity,
        globalIconSize,
        showConnections,
        hiddenItemTypes
      }
    }, null, 2);
  };

  const loadSaveData = (parsed: any) => {
    let projectsToLoad: Project[] = [];
    if (Array.isArray(parsed)) {
      // Old format: just an array of projects
      projectsToLoad = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.projects)) {
      // New format: object with projects and settings
      projectsToLoad = parsed.projects;
      if (parsed.settings) {
        if (typeof parsed.settings.showGrid === 'boolean') setShowGrid(parsed.settings.showGrid);
        if (typeof parsed.settings.globalIconOpacity === 'number') setGlobalIconOpacity(parsed.settings.globalIconOpacity);
        if (typeof parsed.settings.globalIconSize === 'number') setGlobalIconSize(parsed.settings.globalIconSize);
        if (typeof parsed.settings.showConnections === 'boolean') setShowConnections(parsed.settings.showConnections);
        if (Array.isArray(parsed.settings.hiddenItemTypes)) setHiddenItemTypes(parsed.settings.hiddenItemTypes);
      }
    } else {
      return false;
    }

    const isValid = projectsToLoad.every(p => 
      p.id && p.name && Array.isArray(p.layouts)
    );

    if (isValid) {
      setProjects(projectsToLoad);
      if (projectsToLoad.length > 0 && projectsToLoad[0].layouts.length > 0) {
        setActiveLayoutId(projectsToLoad[0].layouts[0].id);
      }
      return true;
    }
    return false;
  };

  // Undo/Redo History
  interface HistoryState {
    projects: Project[];
    activeLayoutId: string | null;
  }
  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);

  const pushToHistory = () => {
    const currentState: HistoryState = {
      projects: JSON.parse(JSON.stringify(projects)),
      activeLayoutId
    };
    setUndoStack(prev => [...prev, currentState].slice(-50));
    setRedoStack([]);
  };

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const currentState: HistoryState = {
      projects: JSON.parse(JSON.stringify(projects)),
      activeLayoutId
    };
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, currentState]);
    setProjects(previous.projects);
    setActiveLayoutId(previous.activeLayoutId);
  }, [undoStack, projects, activeLayoutId]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const currentState: HistoryState = {
      projects: JSON.parse(JSON.stringify(projects)),
      activeLayoutId
    };
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, currentState]);
    setProjects(next.projects);
    setActiveLayoutId(next.activeLayoutId);
  }, [redoStack, projects, activeLayoutId]);

  const stageRef = useRef<any>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const legendGroupRef = useRef<any>(null);

  // Save active layout ID whenever it changes
  useEffect(() => {
    setHoveredItem(null);
    setSelectedIds([]);
  }, [activeLayoutId]);

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          undo();
        }
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          redo();
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only if not editing an input
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          if (selectedIds.length > 0) {
            setItemsToDelete(selectedIds);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, undo, redo]);

  // Get current project and layout
  const currentProject = useMemo(() => {
    if (projects.length === 0) return null;
    for (const project of projects) {
      if (project.layouts.some(l => l.id === activeLayoutId)) {
        return project;
      }
    }
    return projects[0];
  }, [projects, activeLayoutId]);

  const currentLayout = useMemo(() => {
    if (projects.length === 0 || !currentProject) return null;
    const layout = currentProject.layouts.find(l => l.id === activeLayoutId);
    if (layout) return layout;
    return currentProject.layouts[0];
  }, [projects, activeLayoutId, currentProject]);

  // Load background image
  const [bgImage] = useImage(currentLayout?.bgImageUrl || '');

  // Update current layout helper
  const updateCurrentLayout = (updates: Partial<Layout>, shouldPushHistory = true) => {
    if (shouldPushHistory) pushToHistory();
    setProjects(prev => prev.map(p => ({
      ...p,
      layouts: p.layouts.map(l => 
        l.id === activeLayoutId ? { ...l, ...updates } : l
      )
    })));
  };

  // Update selected bg element when color/width changes
  useEffect(() => {
    if (isBgEditMode && selectedBgElementId && currentLayout) {
      const el = currentLayout.backgroundElements?.find(b => b.id === selectedBgElementId);
      if (el && (el.stroke !== bgDrawColor || el.strokeWidth !== bgDrawWidth)) {
        updateCurrentLayout({
          backgroundElements: currentLayout.backgroundElements?.map(b => 
            b.id === selectedBgElementId ? { ...b, stroke: bgDrawColor, strokeWidth: bgDrawWidth } : b
          )
        }, false);
      }
    }
  }, [bgDrawColor, bgDrawWidth]);

  // Sync UI controls to selected bg element
  useEffect(() => {
    if (isBgEditMode && selectedBgElementId && currentLayout) {
      const el = currentLayout.backgroundElements?.find(b => b.id === selectedBgElementId);
      if (el) {
        setBgDrawColor(el.stroke);
        setBgDrawWidth(el.strokeWidth);
      }
    }
  }, [selectedBgElementId]);

  // Handle delete key for background elements
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && isBgEditMode && selectedBgElementId) {
        pushToHistory();
        updateCurrentLayout({
          backgroundElements: currentLayout?.backgroundElements?.filter(b => b.id !== selectedBgElementId)
        });
        setSelectedBgElementId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBgEditMode, selectedBgElementId, currentLayout]);

  // Update transformer
  useEffect(() => {
    if (isBgEditMode && bgDrawTool === 'select' && selectedBgElementId && bgTransformerRef.current && stageRef.current) {
      const node = stageRef.current.findOne(`#bg-${selectedBgElementId}`);
      if (node) {
        bgTransformerRef.current.nodes([node]);
        bgTransformerRef.current.getLayer().batchDraw();
      }
    } else if (bgTransformerRef.current) {
      bgTransformerRef.current.nodes([]);
    }
  }, [isBgEditMode, bgDrawTool, selectedBgElementId, currentLayout?.backgroundElements]);

  // Reset selection and cursor when tool changes
  useEffect(() => {
    if (bgDrawTool !== 'select') {
      setSelectedBgElementId(null);
    }
    
    // Reset cursor when tool changes
    if (stageRef.current) {
      const container = stageRef.current.container();
      if (isBgEditMode) {
        container.style.cursor = bgDrawTool === 'select' ? 'default' : 'crosshair';
      } else {
        container.style.cursor = isDrawingLine ? 'crosshair' : 'default';
      }
    }
  }, [bgDrawTool, isBgEditMode, isDrawingLine]);

  // Project Management
  const addProject = () => {
    pushToHistory();
    const newId = Math.random().toString(36).substr(2, 9);
    const newLayoutId = Math.random().toString(36).substr(2, 9);
    const newProject: Project = {
      id: newId,
      name: `새 프로젝트`,
      layouts: [
        {
          id: newLayoutId,
          name: '기본 레이아웃',
          items: [],
          connections: [],
          canvasSize: { width: 800, height: 600 },
          bgImageUrl: null,
          bgImageOpacity: 0.5,
        }
      ],
      isExpanded: true
    };
    setProjects([...projects, newProject]);
    setActiveLayoutId(newLayoutId);
  };

  const deleteProject = (id: string) => {
    if (projects.length <= 1) return;
    const project = projects.find(p => p.id === id);
    if (!project) return;
    setDeleteConfirm({
      type: 'project',
      projectId: id,
      name: project.name
    });
  };

  const renameProject = (id: string, newName: string) => {
    if (!newName.trim()) return;
    pushToHistory();
    setProjects(projects.map(p => p.id === id ? { ...p, name: newName } : p));
    setRenamingProjectId(null);
  };

  const toggleProject = (id: string) => {
    setProjects(projects.map(p => p.id === id ? { ...p, isExpanded: !p.isExpanded } : p));
  };

  // Layout Management
  const addLayout = (projectId: string) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    pushToHistory();
    const newLayout: Layout = {
      id: newId,
      name: `레이아웃 ${project.layouts.length + 1}`,
      items: [],
      connections: [],
      canvasSize: { width: 800, height: 600 },
      bgImageUrl: null,
      bgImageOpacity: 0.5,
    };
    setProjects(projects.map(p => 
      p.id === projectId ? { ...p, layouts: [...p.layouts, newLayout], isExpanded: true } : p
    ));
    setActiveLayoutId(newId);
    setSelectedIds([]);
  };

  const deleteLayout = (projectId: string, layoutId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    if (projects.length === 1 && project.layouts.length <= 1) return;
    const layout = project.layouts.find(l => l.id === layoutId);
    if (!layout) return;
    
    setDeleteConfirm({
      type: 'layout',
      projectId,
      layoutId,
      name: layout.name
    });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    
    if (deleteConfirm.type === 'project') {
      const id = deleteConfirm.projectId;
      if (projects.length <= 1) return;
      pushToHistory();
      const newProjects = projects.filter(p => p.id !== id);
      setProjects(newProjects);
      
      // If active layout was in deleted project, switch to first available
      const projectToDelete = projects.find(p => p.id === id);
      if (projectToDelete?.layouts.some(l => l.id === activeLayoutId)) {
        setActiveLayoutId(newProjects[0].layouts[0].id);
      }
    } else {
      const { projectId, layoutId } = deleteConfirm;
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      if (projects.length === 1 && project.layouts.length <= 1) return;

      pushToHistory();
      const newProjects = projects.map(p => {
        if (p.id === projectId) {
          return { ...p, layouts: p.layouts.filter(l => l.id !== layoutId) };
        }
        return p;
      }).filter(p => p.layouts.length > 0);
      
      setProjects(newProjects);

      if (activeLayoutId === layoutId) {
        setActiveLayoutId(newProjects[0].layouts[0].id);
      }
      setSelectedIds([]);
      setHoveredItem(null);
    }
    
    setDeleteConfirm(null);
  };

  const renameLayout = (projectId: string, layoutId: string, newName: string) => {
    if (!newName.trim()) return;
    pushToHistory();
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          layouts: p.layouts.map(l => l.id === layoutId ? { ...l, name: newName } : l)
        };
      }
      return p;
    }));
    setRenamingLayoutId(null);
  };

  // Item Management
  const addItem = (type: ItemType) => {
    const def = ITEM_DEFINITIONS.find(d => d.type === type);
    
    let x = 100;
    let y = 100;

    if (mainRef.current) {
      const { scrollLeft, scrollTop, clientWidth, clientHeight } = mainRef.current;
      // Calculate center of visible area relative to the canvas
      // We need to account for the p-8 padding and the m-auto centering
      // But a simple approximation is often good enough:
      x = scrollLeft + clientWidth / 2;
      y = scrollTop + clientHeight / 2;

      // Snap to grid if enabled
      if (showGrid) {
        x = snapToGrid(x);
        y = snapToGrid(y);
      }

      // Ensure it's within canvas bounds
      x = Math.max(50, Math.min(x, currentLayout.canvasSize.width - 50));
      y = Math.max(50, Math.min(y, currentLayout.canvasSize.height - 50));
    }

    const newItem: LayoutItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x,
      y,
      name: def?.label || type,
    };
    updateCurrentLayout({
      items: [...currentLayout.items, newItem]
    });
    setSelectedIds([newItem.id]);
  };

  const removeItem = (id: string) => {
    const isConnection = currentLayout.connections?.some(c => c.id === id);
    if (isConnection) {
      updateCurrentLayout({
        connections: currentLayout.connections?.filter(c => c.id !== id)
      });
      setSelectedIds(selectedIds.filter(sid => sid !== id));
      return;
    }
    setItemsToDelete([id]);
  };

  const confirmRemoveItems = () => {
    if (!itemsToDelete || itemsToDelete.length === 0) return;
    updateCurrentLayout({
      items: currentLayout.items.filter(item => !itemsToDelete.includes(item.id)),
      connections: currentLayout.connections?.filter(c => !itemsToDelete.includes(c.from) && !itemsToDelete.includes(c.to))
    });
    
    if (hoveredItem && itemsToDelete.includes(hoveredItem.id)) setHoveredItem(null);
    setSelectedIds(selectedIds.filter(id => !itemsToDelete.includes(id)));
    setItemsToDelete(null);
  };

  const cancelRemoveItem = () => {
    setItemsToDelete(null);
  };

  const bringToFront = (id: string) => {
    const itemIndex = currentLayout.items.findIndex(i => i.id === id);
    if (itemIndex === -1 || itemIndex === currentLayout.items.length - 1) return;
    const item = currentLayout.items[itemIndex];
    const newItems = currentLayout.items.filter(i => i.id !== id);
    newItems.push(item);
    updateCurrentLayout({ items: newItems });
  };

  const sendToBack = (id: string) => {
    const itemIndex = currentLayout.items.findIndex(i => i.id === id);
    if (itemIndex === -1 || itemIndex === 0) return;
    const item = currentLayout.items[itemIndex];
    const newItems = currentLayout.items.filter(i => i.id !== id);
    newItems.unshift(item);
    updateCurrentLayout({ items: newItems });
  };

  const bringForward = (id: string) => {
    const itemIndex = currentLayout.items.findIndex(i => i.id === id);
    if (itemIndex === -1 || itemIndex === currentLayout.items.length - 1) return;
    const newItems = [...currentLayout.items];
    [newItems[itemIndex], newItems[itemIndex + 1]] = [newItems[itemIndex + 1], newItems[itemIndex]];
    updateCurrentLayout({ items: newItems });
  };

  const sendBackward = (id: string) => {
    const itemIndex = currentLayout.items.findIndex(i => i.id === id);
    if (itemIndex === -1 || itemIndex === 0) return;
    const newItems = [...currentLayout.items];
    [newItems[itemIndex], newItems[itemIndex - 1]] = [newItems[itemIndex - 1], newItems[itemIndex]];
    updateCurrentLayout({ items: newItems });
  };

  const updateItemPosition = (id: string, x: number, y: number) => {
    updateCurrentLayout({
      items: currentLayout.items.map(item => 
        item.id === id ? { ...item, x, y } : item
      )
    });
  };

  const updateItemDetails = (id: string, name: string, note: string, quantity: number, options: string[], optionQuantities: Record<string, number>) => {
    updateCurrentLayout({
      items: currentLayout.items.map(item => 
        item.id === id ? { ...item, name, note, quantity, options, optionQuantities } : item
      )
    });
    setEditingItem(null);
  };

  // Export/Import Projects
  const saveProjectsAs = async () => {
    const data = getSaveData();
    
    // Try modern File System Access API
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: importedFileName || `layout-projects-${new Date().toISOString().split('T')[0]}.json`,
          startIn: fileHandle || undefined,
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();
        setFileHandle(handle);
        setImportedFileName(handle.name);
        showToast('저장 완료');
        return;
      } catch (err: any) {
        if (err.name === 'SecurityError' || err.message.includes('Cross origin sub frames')) {
          console.warn('showSaveFilePicker blocked in iframe, falling back to download');
        } else if (err.name === 'AbortError') {
          return;
        } else {
          console.error('Save As failed', err);
        }
      }
    }

    // Fallback: Download as a new file
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = importedFileName || `layout-projects-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportProjects = async () => {
    // If we have a file handle, try to overwrite
    if (fileHandle) {
      const data = getSaveData();
      try {
        const options = { mode: 'readwrite' };
        if ((await fileHandle.queryPermission(options)) !== 'granted') {
          if ((await fileHandle.requestPermission(options)) !== 'granted') {
            throw new Error('Permission not granted');
          }
        }
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        showToast('저장 완료');
      } catch (err) {
        console.error('Failed to save to file handle, falling back to Save As', err);
        saveProjectsAs();
      }
    } else {
      saveProjectsAs();
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        pushToHistory();
        if (loadSaveData(parsed)) {
          setFileHandle(null); 
          setImportedFileName(file.name);
        } else {
          alert('올바른 세이브 파일 형식이 아닙니다.');
        }
      } catch (err) {
        console.error('Failed to import projects', err);
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportWithHandle = async () => {
    const isIframe = window.self !== window.top;

    if (!isIframe && 'showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          }],
        });
        setFileHandle(handle);
        const file = await handle.getFile();
        setImportedFileName(file.name);
        const content = await file.text();
        const parsed = JSON.parse(content);
        
        pushToHistory();
        if (!loadSaveData(parsed)) {
          alert('올바른 세이브 파일 형식이 아닙니다.');
        }
      } catch (err: any) {
        console.error('Import failed', err);
        if (err.name !== 'AbortError') {
          importRef.current?.click();
        }
      }
    } else {
      importRef.current?.click();
    }
  };

  // Background Image Upload
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        
        // Create an image object to get dimensions
        const img = new Image();
        img.onload = () => {
          updateCurrentLayout({ 
            bgImageUrl: base64,
            canvasSize: { width: img.width, height: img.height }
          });
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    }
  };

  // Legend calculation (Project level + Current Layout)
  const { legend, currentTotal, projectTotal } = useMemo(() => {
    if (!currentProject) return { legend: [], currentTotal: 0, projectTotal: 0 };
    const totalCounts: Record<string, number> = {};
    const currentCounts: Record<string, number> = {};

    currentProject.layouts.forEach(l => {
      l.items.forEach(item => {
        const qty = item.quantity || 1;
        
        // Count base type
        totalCounts[item.type] = (totalCounts[item.type] || 0) + qty;
        if (l.id === activeLayoutId) {
          currentCounts[item.type] = (currentCounts[item.type] || 0) + qty;
        }

        // Count options
        if (item.options) {
          item.options.forEach(opt => {
            const mappedType = OPTION_TO_TYPE[opt] || opt;
            const optQty = item.optionQuantities?.[opt] || 1;
            totalCounts[mappedType] = (totalCounts[mappedType] || 0) + optQty;
            if (l.id === activeLayoutId) {
              currentCounts[mappedType] = (currentCounts[mappedType] || 0) + optQty;
            }
          });
        }
      });
    });

    const legendData = Object.keys(totalCounts).map(type => {
      const def = ITEM_DEFINITIONS.find(d => d.type === type);
      return {
        key: type,
        type,
        label: def ? def.label : type,
        color: def ? def.color : '#999',
        icon: def ? def.icon : null,
        count: totalCounts[type],
        currentCount: currentCounts[type] || 0
      };
    }).sort((a, b) => b.count - a.count);

    const currentTotal = Object.keys(currentCounts)
      .filter(type => !hiddenItemTypes.includes(type))
      .reduce((acc, type) => acc + currentCounts[type], 0);
      
    const projectTotal = Object.keys(totalCounts)
      .filter(type => !hiddenItemTypes.includes(type))
      .reduce((acc, type) => acc + totalCounts[type], 0);

    return { legend: legendData, currentTotal, projectTotal };
  }, [currentProject, activeLayoutId, hiddenItemTypes]);

  // Grid lines
  const renderGrid = () => {
    if (!showGrid) return null;
    const lines = [];
    for (let i = 0; i <= currentLayout.canvasSize.width / GRID_SIZE; i++) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i * GRID_SIZE, 0, i * GRID_SIZE, currentLayout.canvasSize.height]}
          stroke="#e2e8f0"
          strokeWidth={1}
          listening={false}
        />
      );
    }
    for (let i = 0; i <= currentLayout.canvasSize.height / GRID_SIZE; i++) {
      lines.push(
        <Line
          key={`h-${i}`}
          points={[0, i * GRID_SIZE, currentLayout.canvasSize.width, i * GRID_SIZE]}
          stroke="#e2e8f0"
          strokeWidth={1}
          listening={false}
        />
      );
    }
    return lines;
  };

  return (
    <div className="flex h-screen bg-stone-50 font-sans text-stone-900 overflow-hidden">
      {/* Hidden file input for import fallback */}
      <input 
        type="file" 
        ref={importRef} 
        onChange={handleImportFile} 
        accept=".json" 
        className="hidden" 
      />
      {/* Left Sidebar: Tools & Layouts */}
      {projects.length > 0 && currentProject && currentLayout && (
      <aside 
        className={`bg-white border-r border-stone-200 flex flex-col shadow-sm z-20 transition-all duration-300 relative ${leftSidebarPinned || leftSidebarHovered ? 'w-72' : 'w-12'}`}
        onMouseEnter={() => setLeftSidebarHovered(true)}
        onMouseLeave={() => setLeftSidebarHovered(false)}
      >
        <button
          onClick={() => setLeftSidebarPinned(!leftSidebarPinned)}
          className={`absolute top-6 -right-3 w-6 h-6 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-sm z-30 hover:bg-blue-50 hover:text-blue-600 transition-all ${leftSidebarPinned ? 'text-blue-600' : 'text-stone-400'} ${!leftSidebarPinned && !leftSidebarHovered ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          title={leftSidebarPinned ? "고정 해제" : "사이드바 고정"}
        >
          {leftSidebarPinned ? <Pin size={12} /> : <PinOff size={12} />}
        </button>

        {!leftSidebarPinned && !leftSidebarHovered && (
          <div className="absolute inset-0 flex flex-col items-center py-6 gap-6 pointer-events-none">
            <Layers className="text-blue-600" size={24} />
            <div className="w-px h-full bg-stone-100" />
          </div>
        )}

        <div className={`flex flex-col h-full transition-opacity duration-300 ${!leftSidebarPinned && !leftSidebarHovered ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="p-6 border-b border-stone-100">
            <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <Layers className="text-blue-600" size={24} />
              Layout Designer
            </h1>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* File Management */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 px-2">파일 관리</h2>
              <div className="grid grid-cols-3 gap-2 px-2">
                <button 
                  onClick={exportProjects}
                  className="flex items-center justify-center py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-all"
                  title="저장하기"
                >
                  <Download size={16} />
                </button>
                <button 
                  onClick={saveProjectsAs}
                  className="flex items-center justify-center py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-all"
                  title="다른 이름으로 저장"
                >
                  <Save size={16} />
                </button>
                <button 
                  onClick={handleImportWithHandle}
                  className="flex items-center justify-center py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-all"
                  title="불러오기"
                >
                  <Upload size={16} />
                </button>
              </div>
          </section>

          {/* Project & Layout List */}
          <section>
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">프로젝트 목록</h2>
              <button 
                onClick={addProject}
                className="p-1 hover:bg-blue-50 text-blue-600 rounded-md transition-colors"
                title="프로젝트 추가"
              >
                <FolderPlus size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {projects.map((project) => (
                <div key={project.id} className="space-y-1">
                  {/* Project Header */}
                  <div 
                    onClick={() => toggleProject(project.id)}
                    className="group flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-stone-100 text-stone-700 transition-all font-semibold"
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      {project.isExpanded ? <ChevronDown size={14} className="text-stone-400" /> : <ChevronRight size={14} className="text-stone-400" />}
                      <Folder size={14} className="text-stone-500" />
                      {renamingProjectId === project.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={tempProjectName}
                          onChange={(e) => setTempProjectName(e.target.value)}
                          onBlur={() => renameProject(project.id, tempProjectName)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') renameProject(project.id, tempProjectName);
                            if (e.key === 'Escape') setRenamingProjectId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-medium bg-white border border-blue-300 rounded px-1 w-full outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      ) : (
                        <span className="text-sm truncate">{project.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          addLayout(project.id);
                        }}
                        className="p-1 hover:bg-blue-100 text-blue-500 rounded"
                        title="레이아웃 추가"
                      >
                        <Plus size={14} />
                      </button>
                      {renamingProjectId !== project.id && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingProjectId(project.id);
                            setTempProjectName(project.name);
                          }}
                          className="p-1 hover:bg-blue-100 text-blue-500 rounded"
                          title="이름 변경"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                      {projects.length > 1 && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                          }}
                          className="p-1 hover:bg-red-50 text-red-500 rounded"
                          title="프로젝트 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Layouts List */}
                  {project.isExpanded && (
                    <div className="pl-6 space-y-1">
                      {project.layouts.map((layout) => (
                        <div 
                          key={layout.id}
                          onClick={() => setActiveLayoutId(layout.id)}
                          className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${activeLayoutId === layout.id ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'hover:bg-stone-50 text-stone-600 border border-transparent'}`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                            <LayoutIcon size={14} className={activeLayoutId === layout.id ? 'text-blue-500' : 'text-stone-400'} />
                            {renamingLayoutId === layout.id ? (
                              <input
                                autoFocus
                                type="text"
                                value={tempLayoutName}
                                onChange={(e) => setTempLayoutName(e.target.value)}
                                onBlur={() => renameLayout(project.id, layout.id, tempLayoutName)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') renameLayout(project.id, layout.id, tempLayoutName);
                                  if (e.key === 'Escape') setRenamingLayoutId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm font-medium bg-white border border-blue-300 rounded px-1 w-full outline-none focus:ring-2 focus:ring-blue-500/20"
                              />
                            ) : (
                              <span className="text-sm font-medium truncate">{layout.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            {renamingLayoutId !== layout.id && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenamingLayoutId(layout.id);
                                  setTempLayoutName(layout.name);
                                }}
                                className="p-1 hover:bg-blue-100 text-blue-500 rounded"
                                title="이름 변경"
                              >
                                <Edit3 size={14} />
                              </button>
                            )}
                            {(projects.length > 1 || project.layouts.length > 1) && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteLayout(project.id, layout.id);
                                }}
                                className="p-1 hover:bg-red-50 text-red-500 rounded"
                                title="삭제"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Background Edit Mode */}
          <section>
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">배경 편집</h2>
              <button 
                onClick={() => {
                  const newMode = !isBgEditMode;
                  setIsBgEditMode(newMode);
                  if (newMode) {
                    setSelectedIds([]);
                    setHighlightedItemType(null);
                  } else {
                    setSelectedBgElementId(null);
                  }
                }}
                className={`p-1 rounded-md transition-colors ${isBgEditMode ? 'bg-blue-100 text-blue-600' : 'hover:bg-stone-100 text-stone-500'}`}
                title={isBgEditMode ? "배경 잠금" : "배경 편집 모드"}
              >
                {isBgEditMode ? <Check size={16} /> : <Edit3 size={16} />}
              </button>
            </div>
            
            {isBgEditMode && (
              <div className="space-y-3 px-2 mb-4">
                <div className="grid grid-cols-6 gap-1">
                  <button onClick={() => setBgDrawTool('select')} className={`p-2 rounded flex items-center justify-center transition-colors ${bgDrawTool === 'select' ? 'bg-blue-100 text-blue-600' : 'bg-stone-50 hover:bg-stone-100 text-stone-600'}`} title="선택"><MousePointer2 size={16}/></button>
                  <button onClick={() => setBgDrawTool('pen')} className={`p-2 rounded flex items-center justify-center transition-colors ${bgDrawTool === 'pen' ? 'bg-blue-100 text-blue-600' : 'bg-stone-50 hover:bg-stone-100 text-stone-600'}`} title="펜"><Pen size={16}/></button>
                  <button onClick={() => setBgDrawTool('rect')} className={`p-2 rounded flex items-center justify-center transition-colors ${bgDrawTool === 'rect' ? 'bg-blue-100 text-blue-600' : 'bg-stone-50 hover:bg-stone-100 text-stone-600'}`} title="사각형"><Square size={16}/></button>
                  <button onClick={() => setBgDrawTool('circle')} className={`p-2 rounded flex items-center justify-center transition-colors ${bgDrawTool === 'circle' ? 'bg-blue-100 text-blue-600' : 'bg-stone-50 hover:bg-stone-100 text-stone-600'}`} title="원"><CircleIcon size={16}/></button>
                  <button onClick={() => setBgDrawTool('text')} className={`p-2 rounded flex items-center justify-center transition-colors ${bgDrawTool === 'text' ? 'bg-blue-100 text-blue-600' : 'bg-stone-50 hover:bg-stone-100 text-stone-600'}`} title="텍스트"><Edit3 size={16}/></button>
                  <button onClick={() => setBgDrawTool('eraser')} className={`p-2 rounded flex items-center justify-center transition-colors ${bgDrawTool === 'eraser' ? 'bg-blue-100 text-blue-600' : 'bg-stone-50 hover:bg-stone-100 text-stone-600'}`} title="지우개"><Eraser size={16}/></button>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {['#000000', '#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7'].map(color => (
                    <button
                      key={color}
                      onClick={() => setBgDrawColor(color)}
                      className={`w-5 h-5 rounded-full border border-stone-200 transition-transform hover:scale-110 ${bgDrawColor === color ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                      style={{ backgroundColor: color }}
                      title={color === '#ffffff' ? '하얀색' : color}
                    />
                  ))}
                  <div className="relative w-5 h-5 rounded-full border border-stone-200 overflow-hidden cursor-pointer group shrink-0">
                    <input 
                      type="color" 
                      value={bgDrawColor} 
                      onChange={e => setBgDrawColor(e.target.value)} 
                      className="absolute inset-[-5px] w-[200%] h-[200%] cursor-pointer border-0 p-0" 
                      title="커스텀 색상" 
                    />
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex items-center gap-1">
                    <input 
                      type="text" 
                      value={bgDrawColor} 
                      onChange={e => {
                        let val = e.target.value;
                        if (!val.startsWith('#')) val = '#' + val;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                          setBgDrawColor(val);
                        }
                      }}
                      className="w-16 text-[10px] px-1 py-0.5 border border-stone-200 rounded font-mono uppercase bg-white"
                      placeholder="#HEX"
                      title="HEX 입력"
                    />
                    <div className="flex items-center gap-0.5 ml-auto">
                      {['R', 'G', 'B'].map((label) => {
                        const rgb = hexToRgb(bgDrawColor);
                        const key = label.toLowerCase() as keyof typeof rgb;
                        return (
                          <div key={label} className="flex flex-col items-center">
                            <span className="text-[8px] text-stone-400 leading-none mb-0.5">{label}</span>
                            <input
                              type="text"
                              value={rgb[key]}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const newRgb = { ...rgb, [key]: val };
                                setBgDrawColor(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                              }}
                              className="w-7 text-[9px] px-0.5 py-0.5 border border-stone-200 rounded text-center bg-white"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-stone-400 w-8">선 굵기</span>
                    <input type="range" min="1" max="20" value={bgDrawWidth} onChange={e => setBgDrawWidth(Number(e.target.value))} className="flex-1 h-1 accent-blue-600" title="선 굵기" />
                    <span className="text-[10px] font-mono text-stone-500 w-4">{bgDrawWidth}</span>
                  </div>
                  {bgDrawTool === 'text' && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-stone-400 w-8">글자 크기</span>
                      <input type="range" min="8" max="100" value={bgFontSize} onChange={e => setBgFontSize(Number(e.target.value))} className="flex-1 h-1 accent-blue-600" title="글자 크기" />
                      <span className="text-[10px] font-mono text-stone-500 w-4">{bgFontSize}</span>
                    </div>
                  )}
                </div>

                {/* Architectural Symbols */}
                <div className="pt-2 border-t border-stone-100">
                  <div className="text-[10px] font-bold text-stone-400 uppercase mb-2">도면 심볼</div>
                  <div className="grid grid-cols-4 gap-1">
                    {ARCH_SYMBOLS.map(symbol => (
                      <button
                        key={symbol.id}
                        onClick={() => {
                          setBgDrawTool('symbol');
                          setSelectedSymbolId(symbol.id);
                        }}
                        className={`p-1.5 rounded border transition-all flex flex-col items-center gap-1 ${bgDrawTool === 'symbol' && selectedSymbolId === symbol.id ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-stone-100 hover:border-stone-200 text-stone-500'}`}
                        title={symbol.label}
                      >
                        <svg width="16" height="16" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d={symbol.path} />
                        </svg>
                        <span className="text-[8px] truncate w-full text-center">{symbol.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Equipment Icons */}
          {!isBgEditMode && (
            <>
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 px-2">일반</h2>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {ITEM_DEFINITIONS.filter(def => def.category === 'general').map((def) => (
                <button
                  key={def.type}
                  onClick={() => addItem(def.type)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-stone-100 bg-stone-50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all group"
                >
                  <div className="relative w-7 h-7 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
                    {/* Rounded Square Background matching legend style exactly */}
                    <div 
                      className="absolute inset-0 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${def.color}15` }}
                    >
                      <div 
                        className="flex items-center justify-center"
                        dangerouslySetInnerHTML={{ 
                          __html: renderToStaticMarkup(
                            React.cloneElement(def.icon as React.ReactElement<any>, { 
                              size: 16, 
                              color: def.color, 
                              strokeWidth: 1.6,
                              xmlns: "http://www.w3.org/2000/svg"
                            })
                          )
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[8px] font-bold text-stone-600 truncate w-full text-center">{def.label}</span>
                </button>
              ))}
            </div>

            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 px-2">설비</h2>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {ITEM_DEFINITIONS.filter(def => def.category === 'facility').map((def) => (
                <button
                  key={def.type}
                  onClick={() => addItem(def.type)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-stone-100 bg-stone-50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all group"
                >
                  <div className="relative w-7 h-7 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
                    {/* Rounded Square Background matching legend style exactly */}
                    <div 
                      className="absolute inset-0 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${def.color}15` }}
                    >
                      <div 
                        className="flex items-center justify-center"
                        dangerouslySetInnerHTML={{ 
                          __html: renderToStaticMarkup(
                            React.cloneElement(def.icon as React.ReactElement<any>, { 
                              size: 16, 
                              color: def.color, 
                              strokeWidth: 1.6,
                              xmlns: "http://www.w3.org/2000/svg"
                            })
                          )
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[8px] font-bold text-stone-600 truncate w-full text-center">{def.label}</span>
                </button>
              ))}
            </div>

            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 px-2">네트워크</h2>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {ITEM_DEFINITIONS.filter(def => def.category === 'network').map((def) => (
                <button
                  key={def.type}
                  onClick={() => addItem(def.type)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-stone-100 bg-stone-50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all group"
                >
                  <div className="relative w-7 h-7 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
                    {/* Rounded Square Background matching legend style exactly */}
                    <div 
                      className="absolute inset-0 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${def.color}15` }}
                    >
                      <div 
                        className="flex items-center justify-center"
                        dangerouslySetInnerHTML={{ 
                          __html: renderToStaticMarkup(
                            React.cloneElement(def.icon as React.ReactElement<any>, { 
                              size: 16, 
                              color: def.color, 
                              strokeWidth: 1.6,
                              xmlns: "http://www.w3.org/2000/svg"
                            })
                          )
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[8px] font-bold text-stone-600 truncate w-full text-center">{def.label}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 px-2">
              <button
                onClick={() => {
                  setIsDrawingLine(!isDrawingLine);
                  setLineStartId(null);
                  setSelectedIds([]);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${isDrawingLine ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-transparent'}`}
              >
                <Minus size={14} />
                {isDrawingLine ? '연결 취소' : '선 연결'}
              </button>
              <button
                onClick={() => setShowConnections(!showConnections)}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all bg-stone-100 hover:bg-stone-200 text-stone-700 border border-transparent`}
              >
                {showConnections ? <EyeOff size={14} /> : <Eye size={14} />}
                {showConnections ? '선 숨기기' : '선 보이기'}
              </button>
            </div>
            
            {/* Global Icon Opacity Control */}
            <div className="mt-6 px-2">
              <label className="text-[10px] font-bold text-stone-500 uppercase flex items-center justify-between mb-2">
                <span>아이콘 배경 불투명도</span>
                <span className="text-stone-400">{Math.round(globalIconOpacity * 100)}%</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={globalIconOpacity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setGlobalIconOpacity(val);
                }}
                className="w-full accent-stone-600"
              />
            </div>

            {/* Global Icon Size Control */}
            <div className="mt-4 px-2">
              <label className="text-[10px] font-bold text-stone-500 uppercase flex items-center justify-between mb-2">
                <span>아이콘 크기</span>
                <span className="text-stone-400">{globalIconSize}px</span>
              </label>
              <input 
                type="range" 
                min="20" 
                max="100" 
                step="2"
                value={globalIconSize}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setGlobalIconSize(val);
                }}
                className="w-full accent-stone-600"
              />
            </div>
          </section>

          {/* Canvas Settings */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 px-2">도면 설정</h2>
            <div className="space-y-4 px-2">
              {/* Background Upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-500 uppercase flex items-center gap-1">
                  <ImageIcon size={12} />
                  배경 도면
                </label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleBgUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  {currentLayout.bgImageUrl ? '이미지 변경' : '이미지 업로드'}
                </button>
                
                {currentLayout.bgImageUrl && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-stone-400 uppercase">투명도</label>
                      <span className="text-[10px] font-mono text-stone-500">{Math.round(currentLayout.bgImageOpacity * 100)}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={currentLayout.bgImageOpacity}
                      onChange={(e) => updateCurrentLayout({ bgImageOpacity: parseFloat(e.target.value) }, false)}
                      onMouseDown={() => pushToHistory()}
                      className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <button 
                      onClick={() => updateCurrentLayout({ bgImageUrl: null })}
                      className="w-full text-[10px] text-red-500 hover:underline text-center mt-1"
                    >
                      이미지 제거
                    </button>
                  </div>
                )}
              </div>

              {/* Size Inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">너비 (px)</label>
                  <input 
                    type="number" 
                    value={currentLayout.canvasSize.width}
                    onChange={(e) => updateCurrentLayout({ canvasSize: { ...currentLayout.canvasSize, width: parseInt(e.target.value) || 0 } }, false)}
                    onFocus={() => pushToHistory()}
                    className="w-full px-2 py-1.5 rounded-md border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">높이 (px)</label>
                  <input 
                    type="number" 
                    value={currentLayout.canvasSize.height}
                    onChange={(e) => updateCurrentLayout({ canvasSize: { ...currentLayout.canvasSize, height: parseInt(e.target.value) || 0 } }, false)}
                    onFocus={() => pushToHistory()}
                    className="w-full px-2 py-1.5 rounded-md border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              
              <button 
                onClick={() => setShowGrid(!showGrid)}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-colors ${showGrid ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-stone-200 text-stone-600'}`}
              >
                <Grid3X3 size={14} />
                {showGrid ? '그리드 끄기' : '그리드 켜기'}
              </button>
            </div>
          </section>
          </>
          )}
        </div>

      </div>
    </aside>
    )}

      {/* Main Canvas Area */}
      <main 
        ref={mainRef} 
        className="flex-1 relative overflow-auto bg-stone-100/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedIds([]);
            setHighlightedItemType(null);
          }
        }}
      >
        {projects.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-xl border border-stone-200 text-center space-y-6">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <Layers size={40} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-stone-900">Layout Designer</h2>
                <p className="text-stone-500">프로젝트를 생성하거나 기존 파일을 불러와서 작업을 시작하세요.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={addProject}
                  className="flex flex-col items-center gap-3 p-6 bg-stone-50 hover:bg-blue-50 hover:text-blue-600 border border-stone-100 hover:border-blue-200 rounded-2xl transition-all group"
                >
                  <FolderPlus size={24} className="text-stone-400 group-hover:text-blue-500" />
                  <span className="font-bold text-sm">새 프로젝트</span>
                </button>
                <button 
                  onClick={handleImportWithHandle}
                  className="flex flex-col items-center gap-3 p-6 bg-stone-50 hover:bg-blue-50 hover:text-blue-600 border border-stone-100 hover:border-blue-200 rounded-2xl transition-all group"
                >
                  <Upload size={24} className="text-stone-400 group-hover:text-blue-500" />
                  <span className="font-bold text-sm">파일 불러오기</span>
                </button>
              </div>
            </div>
          </div>
        ) : currentLayout && (
          <>
        {/* Zoom Controls */}
        <div className="absolute bottom-8 right-8 flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-stone-200 shadow-lg rounded-2xl p-2 z-20">
          {/* Undo/Redo Buttons */}
          <div className="flex items-center gap-1 mr-1">
            <button 
              onClick={undo}
              disabled={undoStack.length === 0}
              className={`p-2 rounded-xl transition-colors ${undoStack.length === 0 ? 'text-stone-300 cursor-not-allowed' : 'text-stone-600 hover:bg-stone-100'}`}
              title="실행 취소 (Ctrl+Z)"
            >
              <Undo2 size={18} />
            </button>
            <button 
              onClick={redo}
              disabled={redoStack.length === 0}
              className={`p-2 rounded-xl transition-colors ${redoStack.length === 0 ? 'text-stone-300 cursor-not-allowed' : 'text-stone-600 hover:bg-stone-100'}`}
              title="다시 실행 (Ctrl+Y)"
            >
              <Redo2 size={18} />
            </button>
          </div>
          <div className="w-px h-8 bg-stone-100 mx-1" />
          
          <button 
            onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
            className="p-2 hover:bg-stone-100 rounded-xl text-stone-600 transition-colors"
            title="축소"
          >
            <ZoomOut size={18} />
          </button>
          <div className="flex flex-col items-center min-w-[80px] px-2">
            <span className="text-[10px] font-bold text-stone-400 uppercase leading-none mb-1">확대/축소</span>
            <span className="text-xs font-bold text-stone-700">{Math.round(zoom * 100)}%</span>
            <input 
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-24 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-2"
            />
          </div>
          <button 
            onClick={() => setZoom(Math.min(3, zoom + 0.1))}
            className="p-2 hover:bg-stone-100 rounded-xl text-stone-600 transition-colors"
            title="확대"
          >
            <ZoomIn size={18} />
          </button>
          <div className="w-px h-8 bg-stone-100 mx-1" />
          <button 
            onClick={() => setZoom(1)}
            className="px-3 py-1.5 hover:bg-stone-100 rounded-xl text-[10px] font-bold text-stone-500 uppercase transition-colors"
          >
            1:1
          </button>
        </div>

        <div 
          className="min-w-full min-h-full flex p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedIds([]);
              setHighlightedItemType(null);
            }
          }}
        >
          <div 
            className="bg-white shadow-2xl rounded-sm border border-stone-200 relative m-auto"
            style={{ 
              width: currentLayout.canvasSize.width * zoom, 
              height: currentLayout.canvasSize.height * zoom,
              flexShrink: 0,
              cursor: isBgEditMode ? (bgDrawTool === 'select' ? 'default' : 'crosshair') : (isDrawingLine ? 'crosshair' : 'default')
            }}
          >
            <Stage
              width={currentLayout.canvasSize.width * zoom}
              height={currentLayout.canvasSize.height * zoom}
              scaleX={zoom}
              scaleY={zoom}
              ref={stageRef}
              onMouseMove={(e) => {
                const stage = e.target.getStage();
                const pos = stage?.getPointerPosition();
                if (!pos) return;
                
                const adjustedX = pos.x / zoom;
                const adjustedY = pos.y / zoom;

                if (isBgEditMode && currentBgElement) {
                  if (currentBgElement.type === 'pen') {
                    setCurrentBgElement({
                      ...currentBgElement,
                      points: [...(currentBgElement.points || []), adjustedX, adjustedY]
                    });
                  } else if (currentBgElement.type === 'rect') {
                    const snappedX = showGrid ? snapToGrid(adjustedX) : adjustedX;
                    const snappedY = showGrid ? snapToGrid(adjustedY) : adjustedY;
                    setCurrentBgElement({
                      ...currentBgElement,
                      width: snappedX - (currentBgElement.x || 0),
                      height: snappedY - (currentBgElement.y || 0)
                    });
                  } else if (currentBgElement.type === 'circle') {
                    const snappedX = showGrid ? snapToGrid(adjustedX) : adjustedX;
                    const snappedY = showGrid ? snapToGrid(adjustedY) : adjustedY;
                    const dx = snappedX - (currentBgElement.x || 0);
                    const dy = snappedY - (currentBgElement.y || 0);
                    setCurrentBgElement({
                      ...currentBgElement,
                      radius: Math.sqrt(dx * dx + dy * dy)
                    });
                  }
                  return;
                }

                if (isDrawingLine && lineStartId) {
                  setMousePos({ x: adjustedX, y: adjustedY });
                }

                if (isSelecting) {
                  setSelectionRect(prev => ({ ...prev, x2: adjustedX, y2: adjustedY }));
                }
              }}
              onMouseDown={(e) => {
                const stage = e.target.getStage();
                const pos = stage?.getPointerPosition();
                if (!pos) return;

                const adjustedX = pos.x / zoom;
                const adjustedY = pos.y / zoom;
                const snappedX = showGrid ? snapToGrid(adjustedX) : adjustedX;
                const snappedY = showGrid ? snapToGrid(adjustedY) : adjustedY;

                if (isBgEditMode) {
                  if (bgDrawTool === 'eraser' || bgDrawTool === 'select') {
                    const clickedOnEmpty = e.target === e.target.getStage();
                    if (clickedOnEmpty && bgDrawTool === 'select') {
                      setSelectedBgElementId(null);
                    }
                    return; // Handled by onClick on the shape
                  }
                  
                  const id = Date.now().toString();
                  if (bgDrawTool === 'pen') {
                    setCurrentBgElement({ id, type: 'pen', points: [adjustedX, adjustedY], stroke: bgDrawColor, strokeWidth: bgDrawWidth });
                  } else if (bgDrawTool === 'rect') {
                    setCurrentBgElement({ id, type: 'rect', x: snappedX, y: snappedY, width: 0, height: 0, stroke: bgDrawColor, strokeWidth: bgDrawWidth });
                  } else if (bgDrawTool === 'circle') {
                    setCurrentBgElement({ id, type: 'circle', x: snappedX, y: snappedY, radius: 0, stroke: bgDrawColor, strokeWidth: bgDrawWidth });
                  } else if (bgDrawTool === 'symbol' && selectedSymbolId) {
                    const symbol = ARCH_SYMBOLS.find(s => s.id === selectedSymbolId);
                    if (symbol) {
                      const newBgElements: BackgroundElement[] = [...(currentLayout.backgroundElements || []), {
                        id: Date.now().toString(),
                        type: 'symbol',
                        symbolType: symbol.id,
                        pathData: symbol.path,
                        x: snappedX - 25,
                        y: snappedY - 25,
                        stroke: bgDrawColor,
                        strokeWidth: bgDrawWidth,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0
                      }];
                      pushToHistory();
                      updateCurrentLayout({ backgroundElements: newBgElements });
                    }
                  } else if (bgDrawTool === 'text') {
                    const text = prompt('입력할 텍스트를 입력하세요:');
                    if (text) {
                      const newBgElements: BackgroundElement[] = [...(currentLayout.backgroundElements || []), {
                        id: Date.now().toString(),
                        type: 'text',
                        text,
                        fontSize: bgFontSize,
                        x: snappedX,
                        y: snappedY,
                        stroke: bgDrawColor,
                        strokeWidth: bgDrawWidth,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0
                      }];
                      pushToHistory();
                      updateCurrentLayout({ backgroundElements: newBgElements });
                    }
                  }
                  return;
                }

                const clickedOnEmpty = e.target === e.target.getStage();
                if (clickedOnEmpty) {
                  setSelectedIds([]);
                  setHighlightedItemType(null);
                  if (isDrawingLine) {
                    setLineStartId(null);
                  } else {
                    setIsSelecting(true);
                    setSelectionRect({ x1: adjustedX, y1: adjustedY, x2: adjustedX, y2: adjustedY, visible: true });
                  }
                }
              }}
              onMouseUp={(e) => {
                if (isBgEditMode && currentBgElement) {
                  pushToHistory();
                  const newBgElements = [...(currentLayout.backgroundElements || []), currentBgElement];
                  updateCurrentLayout({ backgroundElements: newBgElements });
                  setCurrentBgElement(null);
                  return;
                }

                if (isSelecting) {
                  // Calculate selected items
                  const x1 = Math.min(selectionRect.x1, selectionRect.x2);
                  const y1 = Math.min(selectionRect.y1, selectionRect.y2);
                  const x2 = Math.max(selectionRect.x1, selectionRect.x2);
                  const y2 = Math.max(selectionRect.y1, selectionRect.y2);

                  const selected = currentLayout.items.filter(item => {
                    const isHidden = hiddenItemTypes.includes(item.type);
                    if (isHidden) return false;
                    return item.x >= x1 && item.x <= x2 && item.y >= y1 && item.y <= y2;
                  }).map(item => item.id);

                  setSelectedIds(selected);
                  setIsSelecting(false);
                  setSelectionRect({ x1: 0, y1: 0, x2: 0, y2: 0, visible: false });
                }
              }}
              onTouchStart={(e) => {
                const stage = e.target.getStage();
                const pos = stage?.getPointerPosition();
                if (!pos) return;

                const adjustedX = pos.x / zoom;
                const adjustedY = pos.y / zoom;
                const snappedX = showGrid ? snapToGrid(adjustedX) : adjustedX;
                const snappedY = showGrid ? snapToGrid(adjustedY) : adjustedY;

                if (isBgEditMode) {
                  if (bgDrawTool === 'eraser' || bgDrawTool === 'select') {
                    const clickedOnEmpty = e.target === e.target.getStage();
                    if (clickedOnEmpty && bgDrawTool === 'select') {
                      setSelectedBgElementId(null);
                    }
                    return;
                  }
                  
                  const id = Date.now().toString();
                  if (bgDrawTool === 'pen') {
                    setCurrentBgElement({ id, type: 'pen', points: [adjustedX, adjustedY], stroke: bgDrawColor, strokeWidth: bgDrawWidth });
                  } else if (bgDrawTool === 'rect') {
                    setCurrentBgElement({ id, type: 'rect', x: snappedX, y: snappedY, width: 0, height: 0, stroke: bgDrawColor, strokeWidth: bgDrawWidth });
                  } else if (bgDrawTool === 'circle') {
                    setCurrentBgElement({ id, type: 'circle', x: snappedX, y: snappedY, radius: 0, stroke: bgDrawColor, strokeWidth: bgDrawWidth });
                  } else if (bgDrawTool === 'symbol' && selectedSymbolId) {
                    const symbol = ARCH_SYMBOLS.find(s => s.id === selectedSymbolId);
                    if (symbol) {
                      const newBgElements: BackgroundElement[] = [...(currentLayout.backgroundElements || []), {
                        id: Date.now().toString(),
                        type: 'symbol',
                        symbolType: symbol.id,
                        pathData: symbol.path,
                        x: snappedX - 25,
                        y: snappedY - 25,
                        stroke: bgDrawColor,
                        strokeWidth: bgDrawWidth,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0
                      }];
                      pushToHistory();
                      updateCurrentLayout({ backgroundElements: newBgElements });
                    }
                  } else if (bgDrawTool === 'text') {
                    const text = prompt('입력할 텍스트를 입력하세요:');
                    if (text) {
                      const newBgElements: BackgroundElement[] = [...(currentLayout.backgroundElements || []), {
                        id: Date.now().toString(),
                        type: 'text',
                        text,
                        fontSize: bgFontSize,
                        x: snappedX,
                        y: snappedY,
                        stroke: bgDrawColor,
                        strokeWidth: bgDrawWidth,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0
                      }];
                      pushToHistory();
                      updateCurrentLayout({ backgroundElements: newBgElements });
                    }
                  }
                  return;
                }

                const clickedOnEmpty = e.target === e.target.getStage();
                if (clickedOnEmpty) {
                  setSelectedIds([]);
                  setHighlightedItemType(null);
                  if (isDrawingLine) {
                    setLineStartId(null);
                  } else {
                    setIsSelecting(true);
                    setSelectionRect({ x1: adjustedX, y1: adjustedY, x2: adjustedX, y2: adjustedY, visible: true });
                  }
                }
              }}
              onTouchMove={(e) => {
                const stage = e.target.getStage();
                const pos = stage?.getPointerPosition();
                if (!pos) return;
                
                const adjustedX = pos.x / zoom;
                const adjustedY = pos.y / zoom;

                if (isBgEditMode && currentBgElement) {
                  if (currentBgElement.type === 'pen') {
                    setCurrentBgElement({
                      ...currentBgElement,
                      points: [...(currentBgElement.points || []), adjustedX, adjustedY]
                    });
                  } else if (currentBgElement.type === 'rect') {
                    const snappedX = showGrid ? snapToGrid(adjustedX) : adjustedX;
                    const snappedY = showGrid ? snapToGrid(adjustedY) : adjustedY;
                    setCurrentBgElement({
                      ...currentBgElement,
                      width: snappedX - (currentBgElement.x || 0),
                      height: snappedY - (currentBgElement.y || 0)
                    });
                  } else if (currentBgElement.type === 'circle') {
                    const snappedX = showGrid ? snapToGrid(adjustedX) : adjustedX;
                    const snappedY = showGrid ? snapToGrid(adjustedY) : adjustedY;
                    const dx = snappedX - (currentBgElement.x || 0);
                    const dy = snappedY - (currentBgElement.y || 0);
                    setCurrentBgElement({
                      ...currentBgElement,
                      radius: Math.sqrt(dx * dx + dy * dy)
                    });
                  }
                  return;
                }

                if (isDrawingLine && lineStartId) {
                  setMousePos({ x: adjustedX, y: adjustedY });
                }

                if (isSelecting) {
                  setSelectionRect(prev => ({ ...prev, x2: adjustedX, y2: adjustedY }));
                }
              }}
              onTouchEnd={() => {
                if (isBgEditMode && currentBgElement) {
                  pushToHistory();
                  const newBgElements = [...(currentLayout.backgroundElements || []), currentBgElement];
                  updateCurrentLayout({ backgroundElements: newBgElements });
                  setCurrentBgElement(null);
                  return;
                }

                if (isSelecting) {
                  const x1 = Math.min(selectionRect.x1, selectionRect.x2);
                  const y1 = Math.min(selectionRect.y1, selectionRect.y2);
                  const x2 = Math.max(selectionRect.x1, selectionRect.x2);
                  const y2 = Math.max(selectionRect.y1, selectionRect.y2);

                  const selected = currentLayout.items.filter(item => {
                    const isHidden = hiddenItemTypes.includes(item.type);
                    if (isHidden) return false;
                    return item.x >= x1 && item.x <= x2 && item.y >= y1 && item.y <= y2;
                  }).map(item => item.id);

                  setSelectedIds(selected);
                  setIsSelecting(false);
                  setSelectionRect({ x1: 0, y1: 0, x2: 0, y2: 0, visible: false });
                }
              }}
            >
              <Layer>
                {/* Background Image */}
                {bgImage && (
                  <KonvaImage 
                    image={bgImage} 
                    width={currentLayout.canvasSize.width} 
                    height={currentLayout.canvasSize.height}
                    opacity={currentLayout.bgImageOpacity}
                    listening={false}
                  />
                )}
                
                {/* Background Drawn Elements */}
                {(currentLayout.backgroundElements || []).map((el) => {
                  const isEraserMode = isBgEditMode && bgDrawTool === 'eraser';
                  const isSelectMode = isBgEditMode && bgDrawTool === 'select';
                  const isInteractive = isEraserMode || isSelectMode;
                  
                  const handleInteract = (e: any) => {
                    if (isEraserMode) {
                      pushToHistory();
                      updateCurrentLayout({
                        backgroundElements: currentLayout.backgroundElements?.filter(b => b.id !== el.id)
                      });
                    } else if (isSelectMode) {
                      e.cancelBubble = true;
                      setSelectedBgElementId(el.id);
                    }
                  };

                  const handleDragEnd = (e: any) => {
                    if (!isSelectMode) return;
                    pushToHistory();
                    const newX = showGrid ? snapToGrid(e.target.x()) : e.target.x();
                    const newY = showGrid ? snapToGrid(e.target.y()) : e.target.y();
                    updateCurrentLayout({
                      backgroundElements: currentLayout.backgroundElements?.map(b => 
                        b.id === el.id ? { ...b, x: newX, y: newY } : b
                      )
                    });
                  };

                  const handleTransformEnd = (e: any) => {
                    if (!isSelectMode) return;
                    const node = e.target;
                    pushToHistory();
                    
                    const newX = showGrid ? snapToGrid(node.x()) : node.x();
                    const newY = showGrid ? snapToGrid(node.y()) : node.y();
                    
                    updateCurrentLayout({
                      backgroundElements: currentLayout.backgroundElements?.map(b => 
                        b.id === el.id ? { 
                          ...b, 
                          x: newX, 
                          y: newY, 
                          scaleX: node.scaleX(), 
                          scaleY: node.scaleY(),
                          rotation: node.rotation()
                        } : b
                      )
                    });
                  };

                  const handleDragMove = (e: any) => {
                    if (!isSelectMode) return;
                    if (showGrid) {
                      e.target.x(snapToGrid(e.target.x()));
                      e.target.y(snapToGrid(e.target.y()));
                    }
                  };

                  const commonProps = {
                    id: `bg-${el.id}`,
                    listening: isInteractive,
                    onClick: handleInteract,
                    onMouseDown: handleInteract,
                    onTouchStart: handleInteract,
                    onTouchEnd: handleInteract,
                    onMouseEnter: (e: any) => {
                      if (isInteractive) {
                        const stage = e.target.getStage();
                        if (stage) {
                          if (isEraserMode) {
                            // Custom eraser cursor
                            stage.container().style.cursor = 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0ibTcgMjEtNC4zLTQuM2MtMS0xLTEtMi41IDAtMy40bDkuOS05LjljMS0xIDIuNS0xIDMuNCAwbDQuNCA0LjRjMSAxIDEgMi41IDAgMy40TDEwLjUgMjF6Ii8+PHBhdGggZD0ibTE1IDUgNCA0Ii8+PC9zdmc+"), auto';
                          } else {
                            stage.container().style.cursor = 'pointer';
                          }
                        }
                      }
                    },
                    onMouseLeave: (e: any) => {
                      if (isInteractive) {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = bgDrawTool === 'select' ? 'default' : 'crosshair';
                      }
                    },
                    draggable: isSelectMode,
                    onDragMove: handleDragMove,
                    onDragEnd: handleDragEnd,
                    onTransformEnd: handleTransformEnd,
                    x: el.x || 0,
                    y: el.y || 0,
                    scaleX: el.scaleX || 1,
                    scaleY: el.scaleY || 1,
                    rotation: el.rotation || 0,
                  };

                  if (el.type === 'pen') {
                    return <Line key={el.id} points={el.points} stroke={el.stroke} strokeWidth={el.strokeWidth} tension={0.5} lineCap="round" lineJoin="round" strokeScaleEnabled={false} {...commonProps} />;
                  }
                  if (el.type === 'rect') {
                    // Rect uses width/height instead of points, but x/y are already in commonProps
                    // We need to adjust x/y if they were saved differently, but they are saved as x/y
                    return <Rect key={el.id} width={el.width} height={el.height} stroke={el.stroke} strokeWidth={el.strokeWidth} strokeScaleEnabled={false} {...commonProps} />;
                  }
                  if (el.type === 'circle') {
                    return <Circle key={el.id} radius={el.radius} stroke={el.stroke} strokeWidth={el.strokeWidth} strokeScaleEnabled={false} {...commonProps} />;
                  }
                  if (el.type === 'symbol') {
                    const isDoor = el.symbolType === 'door';
                    return (
                      <Group key={el.id} {...commonProps}>
                        {/* Invisible hit area for easier selection */}
                        <Rect
                          x={0}
                          y={0}
                          width={50}
                          height={50}
                          fill="transparent"
                          strokeEnabled={false}
                          listening={true}
                        />
                        {isDoor && (
                          <Rect
                            x={-5}
                            y={0}
                            width={10}
                            height={50}
                            fill="white"
                            strokeEnabled={false}
                            listening={false}
                          />
                        )}
                        <Path 
                          data={el.pathData} 
                          stroke={el.stroke} 
                          strokeWidth={el.strokeWidth} 
                          strokeScaleEnabled={false} 
                        />
                      </Group>
                    );
                  }
                  if (el.type === 'text') {
                    return (
                      <Text
                        key={el.id}
                        text={el.text}
                        fontSize={el.fontSize || 20}
                        fill={el.stroke}
                        {...commonProps}
                      />
                    );
                  }
                  return null;
                })}

                {/* Current Drawing Element */}
                {currentBgElement && (
                  currentBgElement.type === 'pen' ? (
                    <Line points={currentBgElement.points} stroke={currentBgElement.stroke} strokeWidth={currentBgElement.strokeWidth} tension={0.5} lineCap="round" lineJoin="round" listening={false} strokeScaleEnabled={false} />
                  ) : currentBgElement.type === 'rect' ? (
                    <Rect x={currentBgElement.x} y={currentBgElement.y} width={currentBgElement.width} height={currentBgElement.height} stroke={currentBgElement.stroke} strokeWidth={currentBgElement.strokeWidth} listening={false} strokeScaleEnabled={false} />
                  ) : currentBgElement.type === 'circle' ? (
                    <Circle x={currentBgElement.x} y={currentBgElement.y} radius={currentBgElement.radius} stroke={currentBgElement.stroke} strokeWidth={currentBgElement.strokeWidth} listening={false} strokeScaleEnabled={false} />
                  ) : null
                )}

                {isBgEditMode && selectedBgElementId && (
                  <Transformer
                    ref={bgTransformerRef}
                    enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']}
                    rotateEnabled={true}
                    keepRatio={false}
                    boundBoxFunc={(oldBox, newBox) => {
                      if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                        return oldBox;
                      }
                      if (showGrid) {
                        return {
                          ...newBox,
                          x: snapToGrid(newBox.x),
                          y: snapToGrid(newBox.y),
                          width: snapToGrid(newBox.width),
                          height: snapToGrid(newBox.height)
                        };
                      }
                      return newBox;
                    }}
                  />
                )}

                {renderGrid()}

                {/* Selection Rectangle */}
                {selectionRect.visible && (
                  <Rect
                    x={Math.min(selectionRect.x1, selectionRect.x2)}
                    y={Math.min(selectionRect.y1, selectionRect.y2)}
                    width={Math.abs(selectionRect.x2 - selectionRect.x1)}
                    height={Math.abs(selectionRect.y2 - selectionRect.y1)}
                    fill="rgba(59, 130, 246, 0.1)"
                    stroke="#3b82f6"
                    strokeWidth={1}
                    dash={[4, 2]}
                  />
                )}

                {/* Connections */}
                {showConnections && currentLayout.connections?.map((conn, idx) => {
                  const fromItem = currentLayout.items.find(i => i.id === conn.from);
                  const toItem = currentLayout.items.find(i => i.id === conn.to);
                  if (!fromItem || !toItem) return null;
                  if (hiddenItemTypes.includes(fromItem.type) || hiddenItemTypes.includes(toItem.type)) return null;
                  
                  return (
                    <Line
                      key={`conn-${idx}`}
                      points={[fromItem.x, fromItem.y, toItem.x, toItem.y]}
                      stroke="#4b5563"
                      strokeWidth={4}
                      dash={[5, 5]}
                      opacity={0.6}
                      hitStrokeWidth={20}
                      listening={!isBgEditMode}
                      onMouseEnter={(e) => {
                        const stage = e.target.getStage();
                        if (stage && !isDrawingLine) stage.container().style.cursor = 'pointer';
                      }}
                      onMouseLeave={(e) => {
                        const stage = e.target.getStage();
                        if (stage && !isDrawingLine) stage.container().style.cursor = 'default';
                      }}
                      onClick={(e) => {
                        if (isDrawingLine) return;
                        e.cancelBubble = true;
                        updateCurrentLayout({
                          connections: currentLayout.connections?.filter((_, i) => i !== idx)
                        });
                      }}
                      onTap={(e) => {
                        if (isDrawingLine) return;
                        e.cancelBubble = true;
                        updateCurrentLayout({
                          connections: currentLayout.connections?.filter((_, i) => i !== idx)
                        });
                      }}
                    />
                  );
                })}

                {/* Drawing Line */}
                {isDrawingLine && lineStartId && mousePos && (
                  <Line
                    points={[
                      currentLayout.items.find(i => i.id === lineStartId)?.x || 0,
                      currentLayout.items.find(i => i.id === lineStartId)?.y || 0,
                      mousePos.x,
                      mousePos.y
                    ]}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dash={[5, 5]}
                    opacity={0.8}
                  />
                )}
                
                {currentLayout.items.map((item) => {
                const def = ITEM_DEFINITIONS.find(d => d.type === item.type);
                const isSelected = selectedIds.includes(item.id);
                const isHidden = hiddenItemTypes.includes(item.type);
                
                if (isHidden) return null;
                
                const isHighlighted = highlightedItemType 
                  ? (item.type === highlightedItemType || (item.options || []).some(opt => OPTION_TO_TYPE[opt] === highlightedItemType))
                  : false;

                return (
                  <Group
                    key={item.id}
                    id={item.id}
                    x={item.x}
                    y={item.y}
                    draggable={!isDrawingLine && !isBgEditMode}
                    listening={!isBgEditMode}
                    opacity={highlightedItemType && !isHighlighted ? 0.2 : 1}
                    onDragStart={(e) => {
                      if (isDrawingLine) return;
                      if (!selectedIds.includes(item.id)) {
                        setSelectedIds([item.id]);
                      }
                      setDragStartPos({ x: item.x, y: item.y });
                    }}
                    onDragMove={(e) => {
                      if (isDrawingLine) return;
                      
                      if (showGrid) {
                        e.target.x(snapToGrid(e.target.x()));
                        e.target.y(snapToGrid(e.target.y()));
                      }

                      if (selectedIds.length <= 1) return;
                      
                      const dx = e.target.x() - (dragStartPos?.x || item.x);
                      const dy = e.target.y() - (dragStartPos?.y || item.y);
                      
                      // Move all other selected items
                      const stage = e.target.getStage();
                      if (stage) {
                        selectedIds.forEach(id => {
                          if (id === item.id) return;
                          const node = stage.findOne(`#${id}`);
                          if (node) {
                            const originalItem = currentLayout.items.find(i => i.id === id);
                            if (originalItem) {
                              node.x(originalItem.x + dx);
                              node.y(originalItem.y + dy);
                            }
                          }
                        });
                      }
                    }}
                    onDragEnd={(e) => {
                      if (isDrawingLine) return;
                      
                      const finalX = showGrid ? snapToGrid(e.target.x()) : e.target.x();
                      const finalY = showGrid ? snapToGrid(e.target.y()) : e.target.y();
                      
                      const dx = finalX - (dragStartPos?.x || item.x);
                      const dy = finalY - (dragStartPos?.y || item.y);

                      if (selectedIds.length > 1) {
                        const updatedItems = currentLayout.items.map(i => {
                          if (selectedIds.includes(i.id)) {
                            return { ...i, x: i.x + dx, y: i.y + dy };
                          }
                          return i;
                        });
                        updateCurrentLayout({ items: updatedItems });
                      } else {
                        updateItemPosition(item.id, finalX, finalY);
                      }
                      setDragStartPos(null);
                    }}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      if (isDrawingLine) {
                        if (!lineStartId) {
                          setLineStartId(item.id);
                        } else if (lineStartId !== item.id) {
                          updateCurrentLayout({
                            connections: [...(currentLayout.connections || []), { id: `conn-${Date.now()}`, from: lineStartId, to: item.id }]
                          });
                          setLineStartId(null);
                        }
                      } else {
                        const isShift = e.evt.shiftKey;
                        if (isShift) {
                          if (selectedIds.includes(item.id)) {
                            setSelectedIds(selectedIds.filter(id => id !== item.id));
                          } else {
                            setSelectedIds([...selectedIds, item.id]);
                          }
                        } else {
                          setSelectedIds([item.id]);
                        }
                      }
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true;
                      if (isDrawingLine) {
                        if (!lineStartId) {
                          setLineStartId(item.id);
                        } else if (lineStartId !== item.id) {
                          updateCurrentLayout({
                            connections: [...(currentLayout.connections || []), { id: `conn-${Date.now()}`, from: lineStartId, to: item.id }]
                          });
                          setLineStartId(null);
                        }
                      } else {
                        setSelectedIds([item.id]);
                      }
                    }}
                    onDblClick={() => {
                      if (!isDrawingLine) setEditingItem(item);
                    }}
                    onMouseEnter={(e) => {
                      const stage = e.target.getStage();
                      if (stage) stage.container().style.cursor = isDrawingLine ? 'crosshair' : 'pointer';
                      
                      // Only show tooltip if not drawing line
                      if (isDrawingLine) return;

                      const container = stage?.container().getBoundingClientRect();
                      if (container) {
                        const pos = stage?.getPointerPosition();
                        if (pos) {
                          setHoveredItem({ 
                            id: item.id, 
                            x: container.left + pos.x, 
                            y: container.top + pos.y 
                          });
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      const stage = e.target.getStage();
                      if (stage) stage.container().style.cursor = isDrawingLine ? 'crosshair' : 'default';
                      setHoveredItem(null);
                    }}
                  >
                    <EquipmentIcon def={def} isSelected={isSelected} isHighlighted={isHighlighted} opacity={globalIconOpacity} size={globalIconSize} />

                    <Text
                      text={item.name}
                      fontSize={globalIconSize * 0.22}
                      fontStyle="bold"
                      fill={def?.color}
                      align="center"
                      width={globalIconSize * 2}
                      x={-globalIconSize}
                      y={globalIconSize / 2 + 2} // Moved up closer to the box
                    />

                    {/* Options Badges - Now at the very bottom of the box */}
                    {item.options && item.options.length > 0 && (
                      <Group x={-globalIconSize / 2 + (globalIconSize * 0.06)} y={globalIconSize / 2 - (globalIconSize * 0.16)}>
                        {(() => {
                          let currentX = 0;
                          return item.options.map((optId) => {
                            const opt = ITEM_OPTIONS.find(o => o.id === optId);
                            if (!opt) return null;
                            const mappedType = OPTION_TO_TYPE[optId] || optId;
                            if (hiddenItemTypes.includes(mappedType)) return null;
                            
                            const qty = item.optionQuantities?.[optId] || 1;
                            const textStr = qty > 1 ? `${opt.label.charAt(0)}${qty}` : opt.label.charAt(0);
                            const badgeHeight = globalIconSize * 0.32;
                            const badgeWidth = qty > 1 ? badgeHeight * 1.4 : badgeHeight;
                            
                            const badge = (
                              <Group key={optId} x={currentX}>
                                <Rect 
                                  width={badgeWidth} 
                                  height={badgeHeight} 
                                  cornerRadius={badgeHeight * 0.2} 
                                  fill={opt.color} 
                                  y={-badgeHeight / 2}
                                />
                                <Text 
                                  text={textStr} 
                                  fontSize={badgeHeight * 0.65} 
                                  fill="white" 
                                  align="center" 
                                  verticalAlign="middle" 
                                  x={0} 
                                  y={-badgeHeight / 2 + 1} 
                                  width={badgeWidth} 
                                  height={badgeHeight} 
                                  fontStyle="bold" 
                                />
                              </Group>
                            );
                            currentX += badgeWidth + (globalIconSize * 0.03);
                            return badge;
                          });
                        })()}
                      </Group>
                    )}

                    {(item.quantity && item.quantity > 1) ? (
                      <Group x={globalIconSize / 2 - 10} y={-globalIconSize / 2 + 10}>
                        <Circle radius={10} fill={def?.color} />
                        <Text 
                          text={item.quantity.toString()} 
                          fontSize={10} 
                          fill="white" 
                          align="center" 
                          verticalAlign="middle" 
                          x={-10} 
                          y={-5} 
                          width={20} 
                          height={10} 
                          fontStyle="bold" 
                        />
                      </Group>
                    ) : null}

                    {isSelected && (
                      <Group 
                        x={-globalIconSize / 2 + 10} 
                        y={-globalIconSize / 2 + 10} 
                        onClick={(e) => {
                          e.cancelBubble = true;
                          removeItem(item.id);
                        }}
                        onTap={(e) => {
                          e.cancelBubble = true;
                          removeItem(item.id);
                        }}
                      >
                        <Circle radius={10} fill="#ef4444" />
                        <Text text="×" fontSize={14} fill="white" x={-4} y={-7} fontStyle="bold" />
                      </Group>
                    )}
                  </Group>
                );
              })}

              {/* Hidden Legend for Export */}
              <Group 
                ref={legendGroupRef} 
                visible={false} 
                x={currentLayout.canvasSize.width - 200} 
                y={20}
              >
                <Rect
                  width={180}
                  height={legend.length * 30 + 40}
                  fill="rgba(255, 255, 255, 0.95)"
                  cornerRadius={8}
                  shadowColor="black"
                  shadowBlur={10}
                  shadowOpacity={0.1}
                />
                <Text
                  text="배치 현황 (범례)"
                  x={15}
                  y={15}
                  fontSize={14}
                  fontStyle="bold"
                  fill="#444"
                />
                {legend.map((item, index) => {
                  const def = ITEM_DEFINITIONS.find(d => d.type === item.type);
                  return (
                    <Group key={item.type} x={15} y={40 + index * 30}>
                      <Group x={8} y={8}>
                        <EquipmentIcon def={def} isSelected={false} opacity={1} size={16} />
                      </Group>
                      <Text text={item.label} x={25} y={3} fontSize={12} fill="#333" />
                      <Text text={`${item.count} EA`} x={120} y={3} fontSize={12} fontStyle="bold" fill="#2563eb" />
                    </Group>
                  );
                })}
              </Group>
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Floating Selection Info */}
      <AnimatePresence>
        {selectedIds.length > 0 && !editingItem && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white border border-stone-200 shadow-xl rounded-2xl p-4 flex items-center gap-6 z-20"
          >
            {selectedIds.length === 1 ? (
              <>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ 
                      backgroundColor: `${ITEM_DEFINITIONS.find(d => d.type === currentLayout.items.find(i => i.id === selectedIds[0])?.type)?.color}15`,
                      color: ITEM_DEFINITIONS.find(d => d.type === currentLayout.items.find(i => i.id === selectedIds[0])?.type)?.color
                    }}
                  >
                    {ITEM_DEFINITIONS.find(d => d.type === currentLayout.items.find(i => i.id === selectedIds[0])?.type)?.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 leading-tight">
                      {currentLayout.items.find(i => i.id === selectedIds[0])?.name}
                    </h3>
                    <p className="text-xs text-stone-500">
                      {ITEM_DEFINITIONS.find(d => d.type === currentLayout.items.find(i => i.id === selectedIds[0])?.type)?.label}
                    </p>
                  </div>
                </div>

                <div className="h-8 w-px bg-stone-100" />

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => sendToBack(selectedIds[0])}
                    className="p-2 hover:bg-stone-50 rounded-lg text-stone-600 transition-colors"
                    title="맨 뒤로 보내기"
                  >
                    <ArrowDownToLine size={18} />
                  </button>
                  <button 
                    onClick={() => sendBackward(selectedIds[0])}
                    className="p-2 hover:bg-stone-50 rounded-lg text-stone-600 transition-colors"
                    title="뒤로 보내기"
                  >
                    <ArrowDown size={18} />
                  </button>
                  <button 
                    onClick={() => bringForward(selectedIds[0])}
                    className="p-2 hover:bg-stone-50 rounded-lg text-stone-600 transition-colors"
                    title="앞으로 가져오기"
                  >
                    <ArrowUp size={18} />
                  </button>
                  <button 
                    onClick={() => bringToFront(selectedIds[0])}
                    className="p-2 hover:bg-stone-50 rounded-lg text-stone-600 transition-colors"
                    title="맨 앞으로 가져오기"
                  >
                    <ArrowUpToLine size={18} />
                  </button>
                </div>

                <div className="h-8 w-px bg-stone-100" />

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setEditingItem(currentLayout.items.find(i => i.id === selectedIds[0]) || null)}
                    className="p-2 hover:bg-stone-50 rounded-lg text-stone-600 transition-colors"
                    title="상세 정보 수정"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={() => removeItem(selectedIds[0])}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                    title="삭제"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button 
                    onClick={() => setSelectedIds([])}
                    className="p-2 hover:bg-stone-50 rounded-lg text-stone-400 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 leading-tight">
                      {selectedIds.length}개 아이콘 선택됨
                    </h3>
                    <p className="text-xs text-stone-500">
                      일괄 이동 및 삭제 가능
                    </p>
                  </div>
                </div>

                <div className="h-8 w-px bg-stone-100" />

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setItemsToDelete(selectedIds)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-bold transition-all"
                  >
                    <Trash2 size={16} />
                    일괄 삭제
                  </button>
                  <button 
                    onClick={() => setSelectedIds([])}
                    className="p-2 hover:bg-stone-50 rounded-lg text-stone-400 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover Tooltip */}
      <AnimatePresence>
        {hoveredItem && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed pointer-events-none z-50 bg-stone-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl px-2 py-1.5 flex flex-col gap-1 min-w-[140px] h-fit"
            style={{ 
              left: hoveredItem.x + 20,
              top: hoveredItem.y - 20,
            }}
          >
            {(() => {
              const item = currentLayout.items.find(i => i.id === hoveredItem.id);
              return (
                <>
                  <div className="font-bold flex items-center gap-1.5 whitespace-nowrap text-stone-100">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ITEM_DEFINITIONS.find(d => d.type === item?.type)?.color }} />
                    <span className="text-sm">{item?.name}</span>
                    {item?.quantity && item.quantity > 1 && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md ml-1 whitespace-nowrap">{item.quantity}EA</span>}
                  </div>
                  {item?.options && item.options.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 mt-1.5 whitespace-nowrap">
                      {item.options.map(optId => {
                        const opt = ITEM_OPTIONS.find(o => o.id === optId);
                        const qty = item?.optionQuantities?.[optId] || 1;
                        return opt ? (
                          <span key={optId} className="flex items-center gap-1.5 px-2 py-1 bg-stone-800 rounded-md text-[10px] text-stone-300 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                            <span className="truncate">{opt.label}</span>
                            {qty > 1 && <span className="text-white/70 ml-0.5 shrink-0">x{qty}</span>}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  {item?.note && (
                    <div className="text-stone-300 text-xs leading-relaxed border-t border-white/10 pt-1.5 whitespace-pre-wrap">
                      {item.note}
                    </div>
                  )}
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ 
                      backgroundColor: `${ITEM_DEFINITIONS.find(d => d.type === editingItem.type)?.color}15`,
                      color: ITEM_DEFINITIONS.find(d => d.type === editingItem.type)?.color
                    }}
                  >
                    {ITEM_DEFINITIONS.find(d => d.type === editingItem.type)?.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-stone-900">장비 상세 정보</h2>
                    <p className="text-xs text-stone-500">{ITEM_DEFINITIONS.find(d => d.type === editingItem.type)?.label}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingItem(null)}
                  className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">장비명</label>
                  <input 
                    type="text"
                    defaultValue={editingItem.name}
                    id="edit-name"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all"
                    placeholder="장비 이름을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">수량</label>
                  <input 
                    type="number"
                    defaultValue={editingItem.quantity || 1}
                    id="edit-quantity"
                    min="1"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all"
                    placeholder="수량을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">비고 사항</label>
                  <textarea 
                    id="edit-note"
                    defaultValue={editingItem.note || ''}
                    rows={4}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all resize-none"
                    placeholder="장비에 대한 추가 설명이나 비고 사항을 입력하세요..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">상세 설정 옵션</label>
                  <div className="flex flex-col gap-2">
                    {ITEM_OPTIONS.map(opt => {
                      const isSelected = (editingItem.options || []).includes(opt.id);
                      const optQty = editingItem.optionQuantities?.[opt.id] || 1;
                      return (
                        <div key={opt.id} className="flex items-center gap-2">
                          <label 
                            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'}`}
                          >
                            <input 
                              type="checkbox" 
                              name="edit-options"
                              value={opt.id}
                              defaultChecked={isSelected}
                              className="hidden"
                              onChange={(e) => {
                                const label = e.target.closest('label');
                                const qtyInput = document.getElementById(`edit-opt-qty-${opt.id}`) as HTMLInputElement;
                                if (e.target.checked) {
                                  label?.classList.add('bg-blue-50', 'border-blue-200', 'text-blue-700');
                                  label?.classList.remove('bg-stone-50', 'border-stone-200', 'text-stone-600', 'hover:bg-stone-100');
                                  if (qtyInput) {
                                    qtyInput.disabled = false;
                                    qtyInput.classList.remove('opacity-50', 'bg-stone-100');
                                    qtyInput.classList.add('bg-white');
                                  }
                                } else {
                                  label?.classList.remove('bg-blue-50', 'border-blue-200', 'text-blue-700');
                                  label?.classList.add('bg-stone-50', 'border-stone-200', 'text-stone-600', 'hover:bg-stone-100');
                                  if (qtyInput) {
                                    qtyInput.disabled = true;
                                    qtyInput.classList.add('opacity-50', 'bg-stone-100');
                                    qtyInput.classList.remove('bg-white');
                                  }
                                }
                              }}
                            />
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: opt.color }} />
                            <span className="text-sm font-medium">{opt.label}</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-500">수량:</span>
                            <input 
                              type="number" 
                              id={`edit-opt-qty-${opt.id}`}
                              defaultValue={optQty}
                              min="1"
                              disabled={!isSelected}
                              className={`w-16 px-2 py-1.5 border border-stone-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all ${!isSelected ? 'opacity-50 bg-stone-100' : 'bg-white'}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-stone-50/50 flex gap-3">
                <button 
                  onClick={() => setEditingItem(null)}
                  className="flex-1 px-6 py-3 bg-white border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50 transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={() => {
                    const name = (document.getElementById('edit-name') as HTMLInputElement).value;
                    const note = (document.getElementById('edit-note') as HTMLTextAreaElement).value;
                    const quantity = parseInt((document.getElementById('edit-quantity') as HTMLInputElement).value, 10) || 1;
                    const options = Array.from(document.querySelectorAll('input[name="edit-options"]:checked')).map((el: any) => el.value);
                    const optionQuantities: Record<string, number> = {};
                    options.forEach(optId => {
                      const qtyInput = document.getElementById(`edit-opt-qty-${optId}`) as HTMLInputElement;
                      optionQuantities[optId] = parseInt(qtyInput.value, 10) || 1;
                    });
                    updateItemDetails(editingItem.id, name, note, quantity, options, optionQuantities);
                  }}
                  className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 shadow-lg shadow-stone-900/20 transition-all"
                >
                  저장하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Project/Layout Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto text-red-500">
                  <Trash2 size={24} />
                </div>
                <h2 className="text-xl font-bold text-stone-900 text-center mb-2">
                  {deleteConfirm.type === 'project' ? '프로젝트 삭제' : '레이아웃 삭제'}
                </h2>
                <p className="text-stone-500 text-center text-sm">
                  <span className="font-bold text-stone-900">"{deleteConfirm.name}"</span>
                  {deleteConfirm.type === 'project' 
                    ? ' 프로젝트를 삭제하시겠습니까? 관련 모든 레이아웃과 데이터가 삭제됩니다.' 
                    : ' 레이아웃을 삭제하시겠습니까?'}
                </p>
              </div>
              <div className="p-4 bg-stone-50 border-t border-stone-100 flex gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 bg-white border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50 transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-200 transition-all"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Item Delete Confirmation Modal */}
      <AnimatePresence>
        {itemsToDelete && itemsToDelete.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto text-red-500">
                  <Trash2 size={24} />
                </div>
                <h2 className="text-xl font-bold text-stone-900 text-center mb-2">
                  {itemsToDelete.length > 1 ? `${itemsToDelete.length}개 아이콘 삭제` : '아이콘 삭제'}
                </h2>
                <p className="text-stone-500 text-center text-sm">
                  {itemsToDelete.length > 1 ? '선택한 아이콘들을 모두 삭제하시겠습니까?' : '이 아이콘을 삭제하시겠습니까?'} 이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
              <div className="p-4 bg-stone-50 border-t border-stone-100 flex gap-3">
                <button 
                  onClick={() => setItemsToDelete(null)}
                  className="flex-1 px-4 py-2.5 bg-white border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50 transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={confirmRemoveItems}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
                >
                  삭제하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
        )}

      {/* Import Confirmation Modal removed as per user request */}
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[100] px-6 py-3 bg-stone-900 text-white rounded-full shadow-2xl flex items-center gap-3 font-bold text-sm"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check size={12} className="text-white" />
            </div>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      </main>

      {/* Right Sidebar: Legend */}
      {projects.length > 0 && currentProject && currentLayout && (
      <aside 
        className={`bg-white border-l border-stone-200 flex flex-col shadow-sm z-20 transition-all duration-300 relative ${rightSidebarPinned || rightSidebarHovered ? 'w-64' : 'w-12'}`}
        onMouseEnter={() => setRightSidebarHovered(true)}
        onMouseLeave={() => setRightSidebarHovered(false)}
      >
        <button
          onClick={() => setRightSidebarPinned(!rightSidebarPinned)}
          className={`absolute top-6 -left-3 w-6 h-6 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-sm z-30 hover:bg-blue-50 hover:text-blue-600 transition-all ${rightSidebarPinned ? 'text-blue-600' : 'text-stone-400'} ${!rightSidebarPinned && !rightSidebarHovered ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          title={rightSidebarPinned ? "고정 해제" : "사이드바 고정"}
        >
          {rightSidebarPinned ? <Pin size={12} /> : <PinOff size={12} />}
        </button>

        {!rightSidebarPinned && !rightSidebarHovered && (
          <div className="absolute inset-0 flex flex-col items-center py-6 gap-6 pointer-events-none">
            <CheckSquare className="text-stone-400" size={24} />
            <div className="w-px h-full bg-stone-100" />
          </div>
        )}

        <div className={`flex flex-col h-full transition-opacity duration-300 ${!rightSidebarPinned && !rightSidebarHovered ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">배치 현황 (범례)</h2>
              <p className="text-[10px] text-stone-500 mt-1">{currentProject.name} (전체)</p>
            </div>
            <button 
              onClick={() => {
                const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${currentProject.name} - 배치도 뷰어</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: 'Inter', sans-serif; }
    .item-container {
      position: absolute;
      transform: translate(-50%, -50%);
      cursor: pointer;
      transition: all 0.2s;
    }
    .item-bg {
      position: absolute;
      inset: 0;
      border-radius: 20%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .item-highlight {
      position: absolute;
      inset: 0;
      border-radius: 20%;
      border: 4px dashed transparent;
      transition: border-color 0.2s;
    }
    .item-container.highlighted .item-highlight {
      border-color: var(--item-color);
    }
    .item-container.dimmed {
      opacity: 0.2;
    }
    #canvas-container {
      transition: transform 0.2s;
    }
    .item-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .item-label {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-top: 2px;
      font-size: 10px;
      font-weight: bold;
      white-space: nowrap;
      text-align: center;
      text-shadow: 0 1px 2px rgba(255,255,255,0.8);
    }
    .item-quantity {
      position: absolute;
      top: -5px;
      right: -5px;
      background: var(--item-color);
      color: white;
      font-size: 10px;
      font-weight: bold;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .tooltip {
      position: fixed;
      background: rgba(28, 25, 23, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
      padding: 6px 8px;
      border-radius: 8px;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.2s;
      white-space: pre-wrap;
      min-width: 140px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      gap: 3px;
      height: fit-content;
    }
    .tooltip.show {
      opacity: 1;
    }
    aside {
      transition: width 0.3s ease-in-out;
      position: relative;
    }
    aside.collapsed {
      width: 48px !important;
    }
    aside.collapsed .sidebar-content {
      opacity: 0;
      pointer-events: none;
    }
    .sidebar-content {
      transition: opacity 0.3s ease-in-out;
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }
    .pin-btn {
      position: absolute;
      top: 1.5rem;
      width: 1.5rem;
      height: 1.5rem;
      background: white;
      border: 1px solid #e7e5e4;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      z-index: 30;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pin-btn:hover {
      background: #eff6ff;
      color: #2563eb;
    }
    .pin-btn.pinned {
      color: #2563eb;
      background: #eff6ff;
    }
    #left-pin { right: -0.75rem; }
    #right-pin { left: -0.75rem; }
    .collapsed-icon {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 1.5rem;
      gap: 1.5rem;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
    }
    aside.collapsed .collapsed-icon {
      opacity: 1;
    }
    @media (max-width: 768px) {
      body {
        flex-direction: column;
        overflow-y: auto;
        height: auto;
      }
      aside {
        width: 100% !important;
        height: auto !important;
        max-height: 400px;
        position: relative !important;
        border: none !important;
        border-bottom: 1px solid #e7e5e4 !important;
        flex: none !important;
      }
      aside.collapsed {
        height: 48px !important;
        overflow: hidden;
      }
      #main-container {
        width: 100% !important;
        height: 60vh !important;
        min-height: 400px !important;
        order: -1;
        flex: none !important;
      }
      .pin-btn {
        display: none;
      }
      #canvas-wrapper {
        padding: 20px !important;
        min-width: 100% !important;
        min-height: 100% !important;
      }
    }
  </style>
</head>
<body class="bg-stone-100 flex h-screen overflow-hidden text-stone-800">
  <!-- Left Sidebar -->
  <aside id="left-sidebar" class="w-64 bg-white border-r border-stone-200 flex flex-col z-20 shadow-sm">
    <button id="left-pin" class="pin-btn pinned" title="고정 해제">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
    </button>
    <div class="collapsed-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
    </div>
    <div class="sidebar-content">
      <div class="p-6 border-b border-stone-100">
        <h1 class="font-bold text-lg text-stone-800">${currentProject.name}</h1>
        <p class="text-xs text-stone-500 mt-1">프로젝트 뷰어</p>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-2" id="layout-list">
      </div>
      <div class="p-4 border-t border-stone-100 bg-stone-50/50">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" id="toggle-lines" class="w-4 h-4 rounded border-stone-300 text-blue-600 focus:ring-blue-500" />
          <span class="text-sm font-medium text-stone-700">연결선 표시</span>
        </label>
      </div>
    </div>
  </aside>

  <!-- Main Canvas -->
  <main class="flex-1 relative overflow-auto bg-stone-100/50 flex" id="main-container">
    <div id="canvas-wrapper" class="m-auto relative flex items-center justify-center min-w-full min-h-full">
      <div class="absolute bg-white shadow-2xl rounded-sm border border-stone-200 flex-shrink-0" id="canvas-container" style="transform-origin: center; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        <img id="bg-image" class="absolute inset-0 w-full h-full object-fill pointer-events-none" />
        <div id="items-layer" class="absolute inset-0"></div>
      </div>
    </div>
    <div id="tooltip" class="tooltip"></div>
  </main>

  <!-- Right Sidebar -->
  <aside id="right-sidebar" class="w-64 bg-white border-l border-stone-200 flex flex-col z-20 shadow-sm">
    <button id="right-pin" class="pin-btn pinned" title="고정 해제">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
    </button>
    <div class="collapsed-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><polyline points="9 11 12 14 22 4"></polyline><polyline points="21 12 21 20 3 20 3 4 10 4"></polyline></svg>
    </div>
    <div class="sidebar-content">
      <div class="p-6 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold uppercase tracking-wider text-stone-400">배치 현황 (범례)</h2>
          <p class="text-[10px] text-stone-500 mt-1" id="legend-subtitle"></p>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-2" id="legend-list">
      </div>
      <div class="p-4 border-t border-stone-100 bg-stone-50/50" id="totals-container">
      </div>
    </div>
  </aside>

  <script>
    // Sidebar logic
    const leftSidebar = document.getElementById('left-sidebar');
    const rightSidebar = document.getElementById('right-sidebar');
    const leftPin = document.getElementById('left-pin');
    const rightPin = document.getElementById('right-pin');

    let leftPinned = true;
    let rightPinned = true;

    leftPin.addEventListener('click', () => {
      leftPinned = !leftPinned;
      leftPin.classList.toggle('pinned', leftPinned);
      leftPin.title = leftPinned ? '고정 해제' : '고정';
      if (leftPinned) {
        leftSidebar.classList.remove('collapsed');
      }
    });

    rightPin.addEventListener('click', () => {
      rightPinned = !rightPinned;
      rightPin.classList.toggle('pinned', rightPinned);
      rightPin.title = rightPinned ? '고정 해제' : '고정';
      if (rightPinned) {
        rightSidebar.classList.remove('collapsed');
      }
    });

    leftSidebar.addEventListener('mouseenter', () => {
      leftSidebar.classList.remove('collapsed');
    });

    leftSidebar.addEventListener('mouseleave', () => {
      if (!leftPinned) {
        leftSidebar.classList.add('collapsed');
      }
    });

    rightSidebar.addEventListener('mouseenter', () => {
      rightSidebar.classList.remove('collapsed');
    });

    rightSidebar.addEventListener('mouseleave', () => {
      if (!rightPinned) {
        rightSidebar.classList.add('collapsed');
      }
    });

    const project = ${JSON.stringify(currentProject)};
    const itemDefs = ${JSON.stringify(ITEM_DEFINITIONS.map(d => {
      const svgString = renderToStaticMarkup(
        React.cloneElement(d.icon as React.ReactElement<any>, { 
          color: d.color, 
          strokeWidth: 1.6,
          xmlns: "http://www.w3.org/2000/svg"
        })
      );
      
      return {
        type: d.type,
        label: d.label,
        color: d.color,
        svg: svgString
      };
    }))};
    const globalIconOpacity = ${globalIconOpacity};
    const globalIconSize = ${globalIconSize};
    const itemOptions = ${JSON.stringify(ITEM_OPTIONS)};
    const OPTION_TO_TYPE = {
      'scanner': 'Scanner',
      'lan': 'LAN',
      'datalink': 'DataIntegration',
      'plc': 'PLC',
      'sensor': 'Sensor'
    };
    
    let activeLayoutId = project.layouts[0]?.id;
    let highlightedType = null;
    let hiddenItemTypes = [];
    let showLines = false;

    const layoutListEl = document.getElementById('layout-list');
    const legendListEl = document.getElementById('legend-list');
    const canvasContainerEl = document.getElementById('canvas-container');
    const canvasWrapperEl = document.getElementById('canvas-wrapper');
    const mainContainerEl = document.getElementById('main-container');
    const bgImageEl = document.getElementById('bg-image');
    const itemsLayerEl = document.getElementById('items-layer');
    const totalsContainerEl = document.getElementById('totals-container');
    const tooltipEl = document.getElementById('tooltip');
    const legendSubtitleEl = document.getElementById('legend-subtitle');
    const toggleLinesEl = document.getElementById('toggle-lines');

    function getDef(type) {
      return itemDefs.find(d => d.type === type);
    }

    function renderLayoutList() {
      layoutListEl.innerHTML = '';
      project.layouts.forEach(layout => {
        const btn = document.createElement('button');
        const isActive = layout.id === activeLayoutId;
        btn.className = \`w-full text-left p-3 rounded-xl border transition-all \${isActive ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-stone-100 hover:border-stone-200 hover:bg-stone-50'}\`;
        
        const nameEl = document.createElement('div');
        nameEl.className = \`font-medium text-sm \${isActive ? 'text-blue-700' : 'text-stone-700'}\`;
        nameEl.textContent = layout.name;
        
        const countEl = document.createElement('div');
        countEl.className = \`text-xs mt-1 \${isActive ? 'text-blue-500' : 'text-stone-400'}\`;
        const count = layout.items.reduce((acc, item) => acc + (item.quantity || 1), 0);
        countEl.textContent = \`장비 \${count}개\`;

        btn.appendChild(nameEl);
        btn.appendChild(countEl);
        
        btn.onclick = () => {
          activeLayoutId = layout.id;
          highlightedType = null;
          renderAll();
        };
        layoutListEl.appendChild(btn);
      });
    }

    function renderCanvas() {
      const layout = project.layouts.find(l => l.id === activeLayoutId);
      if (!layout) return;

      canvasContainerEl.style.width = layout.canvasSize.width + 'px';
      canvasContainerEl.style.height = layout.canvasSize.height + 'px';

      if (layout.bgImageUrl) {
        bgImageEl.src = layout.bgImageUrl;
        bgImageEl.style.opacity = layout.bgImageOpacity;
        bgImageEl.style.display = 'block';
      } else {
        bgImageEl.style.display = 'none';
      }

      itemsLayerEl.innerHTML = '';
      
      // Render connections
      if (layout.connections && showLines) {
        const svgNS = "http://www.w3.org/2000/svg";
        const svgEl = document.createElementNS(svgNS, "svg");
        svgEl.style.position = "absolute";
        svgEl.style.top = "0";
        svgEl.style.left = "0";
        svgEl.style.width = "100%";
        svgEl.style.height = "100%";
        svgEl.style.pointerEvents = "none";
        svgEl.style.zIndex = "0";

        layout.connections.forEach(conn => {
          const fromItem = layout.items.find(i => i.id === conn.from);
          const toItem = layout.items.find(i => i.id === conn.to);
          if (fromItem && toItem) {
            if (!hiddenItemTypes.includes(fromItem.type) && !hiddenItemTypes.includes(toItem.type)) {
              const line = document.createElementNS(svgNS, "line");
              line.setAttribute("x1", fromItem.x);
              line.setAttribute("y1", fromItem.y);
              line.setAttribute("x2", toItem.x);
              line.setAttribute("y2", toItem.y);
              line.setAttribute("stroke", "#4b5563");
              line.setAttribute("stroke-width", "2");
              line.setAttribute("stroke-dasharray", "5,5");
              line.setAttribute("opacity", "0.6");
              svgEl.appendChild(line);
            }
          }
        });
        itemsLayerEl.appendChild(svgEl);
      }
      
      layout.items.forEach(item => {
        const def = getDef(item.type);
        if (!def) return;
        
        if (hiddenItemTypes.includes(item.type)) return;

        const el = document.createElement('div');
        el.className = 'item-container';
        el.style.left = item.x + 'px';
        el.style.top = item.y + 'px';
        el.style.width = globalIconSize + 'px';
        el.style.height = globalIconSize + 'px';
        el.style.setProperty('--item-color', def.color);

        const isHighlighted = highlightedType 
          ? (item.type === highlightedType || (item.options || []).some(opt => {
              const mappedType = OPTION_TO_TYPE[opt] || opt;
              return mappedType === highlightedType;
            }))
          : false;

        if (highlightedType) {
          if (isHighlighted) {
            el.classList.add('highlighted');
          } else {
            el.classList.add('dimmed');
          }
        }

        const bg = document.createElement('div');
        bg.className = 'item-bg';
        bg.style.backgroundColor = \`rgba(255, 255, 255, \${globalIconOpacity})\`;
        
        const tint = document.createElement('div');
        tint.className = 'item-bg';
        tint.style.backgroundColor = def.color + '15';

        const highlight = document.createElement('div');
        highlight.className = 'item-highlight';

        const iconSize = globalIconSize * (42 / 56);
        const svgContainer = document.createElement('div');
        svgContainer.className = 'item-icon flex items-center justify-center';
        svgContainer.style.width = iconSize + 'px';
        svgContainer.style.height = iconSize + 'px';
        svgContainer.style.marginTop = -(globalIconSize * 0.05) + 'px';
        svgContainer.innerHTML = def.svg;
        
        const svg = svgContainer.querySelector('svg');
        if (svg) {
          svg.setAttribute('width', '100%');
          svg.setAttribute('height', '100%');
        }

        const label = document.createElement('div');
        label.className = 'item-label';
        label.style.color = def.color;
        label.style.fontSize = (globalIconSize * 0.22) + 'px';
        label.style.width = (globalIconSize * 2) + 'px';
        label.style.left = '50%';
        label.style.transform = 'translateX(-50%)';
        label.style.textAlign = 'center';
        label.style.marginTop = '2px';
        label.textContent = item.name;

        // Options Badges - At the very bottom of the box
        const optionsContainer = document.createElement('div');
        optionsContainer.style.position = 'absolute';
        optionsContainer.style.bottom = '0';
        optionsContainer.style.left = (globalIconSize * 0.06) + 'px';
        optionsContainer.style.display = 'flex';
        optionsContainer.style.gap = '1px';
        optionsContainer.style.zIndex = '5';

        if (item.options && item.options.length > 0) {
          item.options.forEach(optId => {
            const opt = itemOptions.find(o => o.id === optId);
            if (opt) {
              const qty = item.optionQuantities?.[optId] || 1;
              const badgeHeight = globalIconSize * 0.32;
              const badgeWidth = qty > 1 ? badgeHeight * 1.4 : badgeHeight;
              
              const badge = document.createElement('div');
              badge.style.width = badgeWidth + 'px';
              badge.style.height = badgeHeight + 'px';
              badge.style.borderRadius = (badgeHeight * 0.2) + 'px';
              badge.style.backgroundColor = opt.color;
              badge.style.display = 'flex';
              badge.style.alignItems = 'center';
              badge.style.justifyContent = 'center';
              badge.style.color = 'white';
              badge.style.fontSize = (badgeHeight * 0.65) + 'px';
              badge.style.fontWeight = 'bold';
              const textStr = qty > 1 ? \`\${opt.label.charAt(0)}\${qty}\` : opt.label.charAt(0);
              badge.textContent = textStr;
              optionsContainer.appendChild(badge);
            }
          });
        }

        el.appendChild(bg);
        el.appendChild(tint);
        el.appendChild(highlight);
        el.appendChild(svgContainer);
        el.appendChild(label);
        el.appendChild(optionsContainer);

        if (item.quantity && item.quantity > 1) {
          const qty = document.createElement('div');
          qty.className = 'item-quantity';
          qty.textContent = item.quantity;
          el.appendChild(qty);
        }

        // Tooltip logic
        el.addEventListener('mouseenter', (e) => {
          const rect = el.getBoundingClientRect();
          
          let optionsHtml = '';
          if (item.options && item.options.length > 0) {
            optionsHtml = '<div class="grid grid-cols-2 gap-1 mt-1.5 whitespace-nowrap">';
            item.options.forEach(optId => {
              const opt = itemOptions.find(o => o.id === optId);
              if (opt) {
                const qty = item.optionQuantities?.[optId] || 1;
                optionsHtml += \`<span class="flex items-center gap-1.5 px-2 py-1 bg-stone-800 rounded-md text-[10px] text-stone-300 whitespace-nowrap">
                  <span style="width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; background-color: \${opt.color}"></span>
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">\${opt.label}</span>
                  \${qty > 1 ? \`<span style="color: rgba(255,255,255,0.7); margin-left: 2px; flex-shrink: 0;">x\${qty}</span>\` : ''}
                </span>\`;
              }
            });
            optionsHtml += '</div>';
          }

          tooltipEl.innerHTML = \`
            <div class="font-bold flex items-center gap-1.5 whitespace-nowrap text-stone-100">
              <span style="width: 8px; height: 8px; border-radius: 50%; background-color: \${def.color}"></span>
              <span style="font-size: 14px;">\${item.name}</span>
              \${item.quantity && item.quantity > 1 ? \`<span style="font-size: 10px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 6px; margin-left: 4px;">\${item.quantity}EA</span>\` : ''}
            </div>
            \${optionsHtml}
            \${item.note ? \`<div style="font-size: 11px; color: #d6d3d1; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px; margin-top: 4px; white-space: pre-wrap;">\${item.note.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>\` : ''}
          \`;
          
          tooltipEl.style.left = (rect.right + 10) + 'px';
          tooltipEl.style.top = (rect.top - 10) + 'px';
          tooltipEl.classList.add('show');
        });

        el.addEventListener('mouseleave', () => {
          tooltipEl.classList.remove('show');
        });

        itemsLayerEl.appendChild(el);
      });
    }

    function renderLegend() {
      const layout = project.layouts.find(l => l.id === activeLayoutId);
      if (!layout) return;

      legendSubtitleEl.textContent = \`\${project.name} (전체)\`;

      // Calculate project-level legend
      const totalCounts = {};
      const currentCounts = {};

      project.layouts.forEach(l => {
        l.items.forEach(item => {
          const qty = item.quantity || 1;
          totalCounts[item.type] = (totalCounts[item.type] || 0) + qty;
          if (l.id === activeLayoutId) {
            currentCounts[item.type] = (currentCounts[item.type] || 0) + qty;
          }

          if (item.options) {
            item.options.forEach(opt => {
              const mappedType = OPTION_TO_TYPE[opt] || opt;
              const optQty = item.optionQuantities?.[opt] || 1;
              totalCounts[mappedType] = (totalCounts[mappedType] || 0) + optQty;
              if (l.id === activeLayoutId) {
                currentCounts[mappedType] = (currentCounts[mappedType] || 0) + optQty;
              }
            });
          }
        });
      });

      const legend = Object.keys(totalCounts).map(type => {
        const def = getDef(type);
        return {
          key: type,
          type: type,
          label: def ? def.label : type,
          color: def ? def.color : '#999',
          totalCount: totalCounts[type],
          currentCount: currentCounts[type] || 0,
          svg: def ? def.svg : ''
        };
      }).sort((a, b) => b.totalCount - a.totalCount);

      legendListEl.innerHTML = '';
      
      if (legend.length === 0) {
        legendListEl.innerHTML = \`
          <div class="flex flex-col items-center justify-center h-full text-stone-400 space-y-2 opacity-50">
            <p class="text-xs italic">장비가 없습니다.</p>
          </div>
        \`;
      } else {
        legend.forEach(item => {
          const el = document.createElement('div');
          const isHighlighted = highlightedType === item.key;
          const isHidden = hiddenItemTypes.includes(item.key);
          el.className = \`flex items-center justify-between p-3 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer \${isHighlighted ? 'bg-blue-50 border-blue-300' : 'bg-stone-50 border-stone-100'} \${isHidden ? 'opacity-50' : ''}\`;
          
          el.innerHTML = \`
            <div class="flex items-center gap-3">
              <button class="toggle-visibility text-stone-400 hover:text-blue-600 transition-colors" data-key="\${item.key}">
                \${isHidden 
                  ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>'
                  : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-square"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
                }
              </button>
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background-color: \${item.color}15; color: \${item.color}">
                <div style="width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;">
                  \${item.svg.replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, 'height="100%"')}
                </div>
              </div>
              <div class="flex flex-col">
                <span class="text-xs font-semibold">\${item.label}</span>
              </div>
            </div>
            <div class="flex flex-col items-end">
              <div class="flex items-baseline gap-1">
                <span class="text-sm font-bold text-blue-600">\${item.currentCount}</span>
                <span class="text-[10px] text-stone-400">/</span>
                <span class="text-xs font-medium text-stone-500">\${item.totalCount}</span>
              </div>
              <span class="text-[8px] text-stone-400 uppercase font-bold">Units</span>
            </div>
          \`;

          el.onclick = (e) => {
            if (e.target.closest('.toggle-visibility')) {
              e.stopPropagation();
              if (isHidden) {
                hiddenItemTypes = hiddenItemTypes.filter(t => t !== item.key);
              } else {
                hiddenItemTypes.push(item.key);
              }
              renderCanvas();
              renderLegend();
              return;
            }
            highlightedType = highlightedType === item.key ? null : item.key;
            renderCanvas();
            renderLegend();
          };

          legendListEl.appendChild(el);
        });
      }

      const currentTotal = Object.keys(currentCounts).filter(key => !hiddenItemTypes.includes(key)).reduce((a, key) => a + currentCounts[key], 0);
      const projectTotal = Object.keys(totalCounts).filter(key => !hiddenItemTypes.includes(key)).reduce((a, key) => a + totalCounts[key], 0);
      
      totalsContainerEl.innerHTML = \`
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] font-bold text-stone-400 uppercase">현재 페이지</span>
          <span class="text-sm font-bold text-stone-700">\${currentTotal} EA</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-stone-400 uppercase">프로젝트 전체</span>
          <span class="text-lg font-bold text-blue-600">\${projectTotal}</span>
        </div>
      \`;
    }

    function renderAll() {
      renderLayoutList();
      renderCanvas();
      renderLegend();
      updateScale();
    }

    function updateScale() {
      const layout = project.layouts.find(l => l.id === activeLayoutId);
      if (!layout || !mainContainerEl) return;

      const padding = 80; // Account for wrapper padding
      const availableWidth = mainContainerEl.clientWidth - padding;
      const availableHeight = mainContainerEl.clientHeight - padding;
      
      if (availableWidth <= 0 || availableHeight <= 0) return;

      const scaleX = availableWidth / layout.canvasSize.width;
      const scaleY = availableHeight / layout.canvasSize.height;
      const scale = Math.min(1, scaleX, scaleY);
      
      canvasContainerEl.style.transform = \`translate(-50%, -50%) scale(\${scale})\`;
      
      // Adjust wrapper to match scaled size for correct centering and scrolling
      canvasWrapperEl.style.width = (layout.canvasSize.width * scale + padding) + 'px';
      canvasWrapperEl.style.height = (layout.canvasSize.height * scale + padding) + 'px';
    }

    const resizeObserver = new ResizeObserver(() => {
      updateScale();
    });
    resizeObserver.observe(mainContainerEl);

    if (toggleLinesEl) {
      toggleLinesEl.checked = showLines;
      toggleLinesEl.addEventListener('change', (e) => {
        showLines = e.target.checked;
        renderAll();
      });
    }

    // Initial render
    renderAll();
  </script>
</body>
</html>`;

              const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${currentProject.name}_뷰어.html`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            className="p-2 hover:bg-stone-100 rounded-xl text-stone-600 transition-colors"
            title="HTML 뷰어 다운로드"
          >
            <Download size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {legend.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-400 space-y-2 opacity-50">
              <Plus size={32} />
              <p className="text-xs italic">장비를 배치하면<br/>여기에 표시됩니다.</p>
            </div>
          ) : (
            legend.map(item => {
              const isHidden = hiddenItemTypes.includes(item.key);
              return (
              <div 
                key={item.key} 
                className={`flex items-center justify-between p-3 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer ${highlightedItemType === item.key ? 'bg-blue-50 border-blue-300' : 'bg-stone-50 border-stone-100'} ${isHidden ? 'opacity-50' : ''}`}
                onClick={() => setHighlightedItemType(highlightedItemType === item.key ? null : item.key)}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isHidden) {
                        setHiddenItemTypes(hiddenItemTypes.filter(t => t !== item.key));
                      } else {
                        setHiddenItemTypes([...hiddenItemTypes, item.key]);
                      }
                    }}
                    className="text-stone-400 hover:text-blue-600 transition-colors"
                  >
                    {isHidden ? <Square size={16} /> : <CheckSquare size={16} />}
                  </button>
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <div 
                      className="flex items-center justify-center"
                      dangerouslySetInnerHTML={{ 
                        __html: renderToStaticMarkup(
                          React.cloneElement(item.icon as React.ReactElement<any>, { 
                            size: 18, 
                            color: item.color, 
                            strokeWidth: 1.6,
                            xmlns: "http://www.w3.org/2000/svg"
                          })
                        )
                      }}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">{item.label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-blue-600">{item.currentCount}</span>
                      <span className="text-[10px] text-stone-400">/</span>
                      <span className="text-xs font-medium text-stone-500">{item.count}</span>
                    </div>
                    <span className="text-[8px] text-stone-400 uppercase font-bold">Units</span>
                  </div>
                </div>
              </div>
            )})
          )}
        </div>

        <div className="p-4 border-t border-stone-100 bg-stone-50/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-400 uppercase">현재 페이지</span>
            <span className="text-sm font-bold text-stone-700">
              {currentTotal} EA
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-400 uppercase">프로젝트 전체</span>
            <span className="text-lg font-bold text-blue-600">
              {projectTotal}
            </span>
          </div>
        </div>
      </div>
    </aside>
    )}

      {/* Global CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
        }
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}} />
    </div>
  );
}
