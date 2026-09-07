export interface Dot {
  id: string;
  sequenceIndex: number;
  displayNumber: number;
  displayLabel?: string;
  pathId?: number;
  x: number;
  y: number;
  numberX: number;
  numberY: number;
  source: 'auto' | 'manual';
  visible: boolean;
}

export type StartMarkerStyle = 'star' | 'circle' | 'flag' | 'none';
export type StopMarkerStyle = 'double_circle' | 'badge' | 'circle' | 'none';
export type FaintGuidelineStyle = 'none' | 'dotted' | 'dashed' | 'solid';
export type NumberingMode = 'numbers' | 'letters_upper' | 'letters_lower' | 'skip_2' | 'skip_5' | 'skip_10' | 'roman';
export type DotShape = 'circle' | 'ring' | 'star' | 'diamond' | 'square';
export type NumberPlacement = 'outside' | 'inside' | 'badge';

export type PagePreset = 'letter' | 'a4' | 'square' | 'novel' | 'custom';

export interface PageSetup {
  preset: PagePreset;
  widthPt: number;
  heightPt: number;
  marginPt: number;
  name: string;
}

export const PAGE_PRESETS: Record<PagePreset, PageSetup> = {
  letter: {
    preset: 'letter',
    name: 'US Letter (8.5 × 11 in)',
    widthPt: 612,
    heightPt: 792,
    marginPt: 36, // 0.5 in
  },
  square: {
    preset: 'square',
    name: 'Square KDP (8.5 × 8.5 in)',
    widthPt: 612,
    heightPt: 612,
    marginPt: 36,
  },
  novel: {
    preset: 'novel',
    name: 'Novel KDP (6 × 9 in)',
    widthPt: 432,
    heightPt: 648,
    marginPt: 36,
  },
  a4: {
    preset: 'a4',
    name: 'A4 (210 × 297 mm)',
    widthPt: 595.28,
    heightPt: 841.89,
    marginPt: 36,
  },
  custom: {
    preset: 'custom',
    name: 'Custom Size',
    widthPt: 612,
    heightPt: 792,
    marginPt: 36,
  }
};

export type Tool =
  | 'select'
  | 'moveDot'
  | 'addDot'
  | 'deleteDot'
  | 'eraseLine'
  | 'moveNumber'
  | 'editNumber'
  | 'pan'
  | 'zoom';

export type DifficultyPreset = 'easy' | 'medium' | 'detailed' | 'custom';

export interface QualityIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  dot_ids: string[];
}

export interface ValidationReport {
  is_valid: boolean;
  total_dots: number;
  error_count: number;
  warning_count: number;
  issues: QualityIssue[];
}

export interface PageItem {
  id: string;
  pageNumber: number;
  title: string;
  dots: Dot[];
  initialAutoDots: Dot[];
  referenceImage: string | null;
  editedIllustration: string | null;
  sampleId?: string | null;
  caption?: string;
}

export interface MediaItem {
  id: string;
  filename: string;
  dataUri: string;
  width: number;
  height: number;
  dateAdded: number;
}

export interface ProjectData {
  version: string;
  projectName: string;
  pageSetup: PageSetup;
  dotRadius: number;
  fontSize: number;
  referenceOpacity: number;
  referenceVisible: boolean;
  referenceLocked: boolean;
  showAnswer: boolean;
  snapToGrid: boolean;
  // Pure Dot-to-Dot Puzzle Styling Preferences
  startMarkerStyle?: StartMarkerStyle;
  stopMarkerStyle?: StopMarkerStyle;
  faintGuidelines?: FaintGuidelineStyle;
  faintGuidelineOpacity?: number;
  numberingMode?: NumberingMode;
  dotShape?: DotShape;
  numberPlacement?: NumberPlacement;
  numberOffsetDist?: number;
  // Multi-page book architecture
  pages: PageItem[];
  activePageIndex: number;
  // Media library
  mediaLibrary: MediaItem[];
  // Save location metadata
  saveLocation?: string;
  filePath?: string;
  // Backwards compatibility legacy fields
  referenceImage?: string | null;
  editedIllustration?: string | null;
  dots?: Dot[];
  initialAutoDots?: Dot[];
}

export interface SampleItem {
  id: string;
  title: string;
  filename: string;
}

