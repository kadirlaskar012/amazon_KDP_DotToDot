import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PAGE_PRESETS } from './types';
import type {
  Dot,
  PageSetup,
  Tool,
  DifficultyPreset,
  ValidationReport,
  SampleItem,
  ProjectData,
  PageItem,
  MediaItem,
} from './types';
import { TopToolbar } from './components/TopToolbar';
import { LeftToolbar } from './components/LeftToolbar';
import { Canvas } from './components/Canvas';
import { RightSidebar } from './components/RightSidebar';
import { StatusBar } from './components/StatusBar';
import { ExportModal, type FrontMatterOptions } from './components/ExportModal';
import { SamplePickerModal } from './components/SamplePickerModal';
import { NewProjectModal } from './components/NewProjectModal';
import { PageTimeline } from './components/PageTimeline';
import { MediaLibraryModal } from './components/MediaLibraryModal';
import { exportProjectToFile, importProjectFromFile } from './utils/projectIO';

const API_BASE = 'http://127.0.0.1:8000';
const MAX_DOTS_HARD_CAP = 120;

function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(dataUri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = (err) => reject(err);
    img.src = dataUri;
  });
}

async function mediaItemToFile(mediaItem: MediaItem): Promise<File> {
  if (mediaItem.dataUri.startsWith('http://') || mediaItem.dataUri.startsWith('https://')) {
    const res = await fetch(mediaItem.dataUri);
    const blob = await res.blob();
    return new File([blob], mediaItem.filename, { type: blob.type || 'image/png' });
  }
  const arr = mediaItem.dataUri.split(',');
  const mime = arr[0]?.match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1] || '');
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], mediaItem.filename, { type: mime });
}

export const App: React.FC = () => {
  // Project State
  const [projectName, setProjectName] = useState('Dinosaur Dot-to-Dot');
  const [pageSetup, setPageSetup] = useState<PageSetup>(PAGE_PRESETS.letter);
  const [dots, setDots] = useState<Dot[]>([]);
  const [initialAutoDots, setInitialAutoDots] = useState<Dot[]>([]);
  const [selectedDotId, setSelectedDotId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');

  // Amazon KDP Print-Safe Margins & Bottom-Middle Page Caption
  const [safeMarginsVisible, setSafeMarginsVisible] = useState(true);
  const [pageCaption, setPageCaption] = useState<string>('BABY DINOSAUR');

  // Multi-Page Book State
  const [pages, setPages] = useState<PageItem[]>([
    {
      id: 'page-1',
      pageNumber: 1,
      title: 'Baby Dinosaur',
      caption: 'BABY DINOSAUR',
      dots: [],
      initialAutoDots: [],
      referenceImage: null,
      editedIllustration: null,
      sampleId: 'dinosaur',
    },
  ]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Media Library State
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isMediaLibraryModalOpen, setIsMediaLibraryModalOpen] = useState(false);
  const [isBatchPlotting, setIsBatchPlotting] = useState(false);
  const [batchPlotProgress, setBatchPlotProgress] = useState<{ current: number; total: number } | null>(null);

  // Sizing & Geometry
  const [dotRadius, setDotRadius] = useState(3.5);
  const [fontSize, setFontSize] = useState(9.0);

  // Reference Layer & Erased Line-Art
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [editedIllustration, setEditedIllustration] = useState<string | null>(null);
  const [eraserSize, setEraserSize] = useState(20);
  const [referenceOpacity, setReferenceOpacity] = useState(0.45);
  const [referenceVisible, setReferenceVisible] = useState(true);
  const [referenceLocked, setReferenceLocked] = useState(true);

  // View & Modes
  const [showAnswer, setShowAnswer] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [crosshairEnabled, setCrosshairEnabled] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Generator Configuration
  const [difficultyPreset, setDifficultyPreset] = useState<DifficultyPreset>('detailed');
  const [customMaxDots, setCustomMaxDots] = useState(105);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>('dinosaur');

  // Diagnostics & Modals
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- History Stack for Undo/Redo ---
  const [history, setHistory] = useState<Dot[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  const pushHistory = useCallback((newDots: Dot[]) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newDots];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const updateDotsWithHistory = useCallback((newDots: Dot[]) => {
    // Enforce 120 cap
    if (newDots.length > MAX_DOTS_HARD_CAP) {
      newDots = newDots.slice(0, MAX_DOTS_HARD_CAP);
      showToast('Maximum 120 dots limit reached.');
    }
    setDots(newDots);
    pushHistory(newDots);
    setPages((prev) => {
      const next = [...prev];
      if (next[activePageIndex]) {
        next[activePageIndex] = {
          ...next[activePageIndex],
          dots: newDots,
        };
      }
      return next;
    });
  }, [pushHistory, activePageIndex]);

  const handleUpdateIllustration = useCallback((newIllus: string | null) => {
    setEditedIllustration(newIllus);
    setPages((prev) => {
      const next = [...prev];
      if (next[activePageIndex]) {
        next[activePageIndex] = {
          ...next[activePageIndex],
          editedIllustration: newIllus,
        };
      }
      return next;
    });
  }, [activePageIndex]);

  const handleUpdatePageCaption = useCallback((newCaption: string) => {
    setPageCaption(newCaption);
    setPages((prev) => {
      const next = [...prev];
      if (next[activePageIndex]) {
        next[activePageIndex] = {
          ...next[activePageIndex],
          caption: newCaption,
        };
      }
      return next;
    });
  }, [activePageIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const targetIndex = historyIndex - 1;
      setHistoryIndex(targetIndex);
      const targetDots = history[targetIndex];
      setDots(targetDots);
      setPages((prev) => {
        const next = [...prev];
        if (next[activePageIndex]) {
          next[activePageIndex] = { ...next[activePageIndex], dots: targetDots };
        }
        return next;
      });
    }
  }, [history, historyIndex, activePageIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const targetIndex = historyIndex + 1;
      setHistoryIndex(targetIndex);
      const targetDots = history[targetIndex];
      setDots(targetDots);
      setPages((prev) => {
        const next = [...prev];
        if (next[activePageIndex]) {
          next[activePageIndex] = { ...next[activePageIndex], dots: targetDots };
        }
        return next;
      });
    }
  }, [history, historyIndex, activePageIndex]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Keyboard Shortcuts (Undo, Redo, Tools, Save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProject();
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.toLowerCase() === 'v') setActiveTool('select');
        else if (e.key.toLowerCase() === 'm') setActiveTool('moveDot');
        else if (e.key.toLowerCase() === 'a') {
          if (dots.length >= MAX_DOTS_HARD_CAP) showToast('Maximum 120 dots reached.');
          else setActiveTool('addDot');
        } else if (e.key.toLowerCase() === 'd') setActiveTool('deleteDot');
        else if (e.key.toLowerCase() === 'n') setActiveTool('moveNumber');
        else if (e.key.toLowerCase() === 'e') setActiveTool('editNumber');
        else if (e.key.toLowerCase() === 'x') setActiveTool('eraseLine');
        else if (e.key.toLowerCase() === 'h') setActiveTool('pan');
        else if (e.key.toLowerCase() === 'z') setActiveTool('zoom');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, dots.length]);

  // Load initial samples and generate default dinosaur puzzle
  useEffect(() => {
    fetch(`${API_BASE}/api/samples`)
      .then((res) => res.json())
      .then((data: SampleItem[]) => {
        setSamples(data);
        // Trigger initial trace on dinosaur
        loadSampleAndGenerate('dinosaur');
      })
      .catch((err) => {
        console.warn('Backend not yet ready or offline:', err);
      });
  }, []);

  // Fetch / Generate from Sample
  const loadSampleAndGenerate = async (sampleId: string) => {
    setIsGenerating(true);
    setSelectedSampleId(sampleId);
    try {
      const formData = new FormData();
      formData.append('sample_id', sampleId);
      formData.append('preset', difficultyPreset);
      if (difficultyPreset === 'custom') {
        formData.append('custom_max_dots', String(customMaxDots));
      }
      formData.append('canvas_width', String(pageSetup.widthPt));
      formData.append('canvas_height', String(pageSetup.heightPt));
      formData.append('page_margin', String(pageSetup.marginPt));
      formData.append('dot_radius', String(dotRadius));
      formData.append('font_size', String(fontSize));

      const res = await fetch(`${API_BASE}/api/analyze-and-generate`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setDots(data.dots);
        setInitialAutoDots(data.dots);
        setReferenceImage(data.reference_image);
        setEditedIllustration(data.reference_image);
        setHistory([data.dots]);
        setHistoryIndex(0);

        const sampleCaptions: Record<string, string> = {
          dinosaur: 'BABY DINOSAUR',
          rocket: 'SPACE ROCKET',
          cat: 'CARTOON CAT',
          teddy_bear: 'TEDDY BEAR',
          car: 'CARTOON CAR',
          flower: 'SUNFLOWER',
        };
        const sampleCap = sampleCaptions[sampleId] || sampleId.replace(/[_-]/g, ' ').toUpperCase();
        setPageCaption(sampleCap);

        setPages((prev) => {
          const next = [...prev];
          if (next[activePageIndex]) {
            next[activePageIndex] = {
              ...next[activePageIndex],
              dots: data.dots,
              initialAutoDots: data.dots,
              referenceImage: data.reference_image,
              editedIllustration: data.reference_image,
              sampleId,
              caption: sampleCap,
            };
          }
          return next;
        });

        showToast(`Traced ${data.dots.length} dots from ${sampleId}!`);
        // Run initial validation
        runValidation(data.dots);
      }
    } catch (err) {
      console.error(err);
      showToast('Error generating dots from backend.');
    } finally {
      setIsGenerating(false);
      setIsSampleModalOpen(false);
    }
  };

  // Process and Upload Custom Local Image File
  const processImageFile = async (file: File) => {
    if (!file) return;

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('preset', difficultyPreset);
      if (difficultyPreset === 'custom') {
        formData.append('custom_max_dots', String(customMaxDots));
      }
      formData.append('canvas_width', String(pageSetup.widthPt));
      formData.append('canvas_height', String(pageSetup.heightPt));
      formData.append('page_margin', String(pageSetup.marginPt));
      formData.append('dot_radius', String(dotRadius));
      formData.append('font_size', String(fontSize));

      const res = await fetch(`${API_BASE}/api/analyze-and-generate`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setDots(data.dots);
        setInitialAutoDots(data.dots);
        setReferenceImage(data.reference_image);
        setEditedIllustration(data.reference_image);
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').toUpperCase();
        setProjectName(cleanTitle);
        setPageCaption(cleanTitle);
        setSelectedSampleId(null);
        setHistory([data.dots]);
        setHistoryIndex(0);

        setPages((prev) => {
          const next = [...prev];
          if (next[activePageIndex]) {
            next[activePageIndex] = {
              ...next[activePageIndex],
              title: cleanTitle,
              caption: cleanTitle,
              dots: data.dots,
              initialAutoDots: data.dots,
              referenceImage: data.reference_image,
              editedIllustration: data.reference_image,
              sampleId: null,
            };
          }
          return next;
        });

        showToast(`Analyzed line-art: placed ${data.dots.length} dots!`);
        runValidation(data.dots);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to process image upload.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Restore illustration lines that were erased
  const handleRestoreIllustration = () => {
    if (referenceImage) {
      handleUpdateIllustration(referenceImage);
      showToast('Restored original illustration lines.');
    }
  };

  // Upload Custom Local Image from Input
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Also add to media library
      handleBatchUploadMedia([file]);
      await processImageFile(file);
    }
  };

  // Batch Media Upload to Library
  const handleBatchUploadMedia = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newItems: MediaItem[] = [];

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const dataUri = await readFileAsDataUri(file);
        const dims = await getImageDimensions(dataUri);
        newItems.push({
          id: 'media-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          filename: file.name,
          dataUri,
          width: dims.width,
          height: dims.height,
          dateAdded: Date.now(),
        });
      } catch (err) {
        console.error('Error reading media item:', err);
      }
    }

    if (newItems.length > 0) {
      setMediaLibrary((prev) => [...prev, ...newItems]);
      showToast(`Added ${newItems.length} images to Media Library.`);
    }
  };

  // Apply Media Item from Library to Active Canvas
  const handleApplyMediaToPage = async (mediaItem: MediaItem) => {
    try {
      const file = await mediaItemToFile(mediaItem);
      await processImageFile(file);
      setIsMediaLibraryModalOpen(false);
    } catch (err) {
      console.error('Error applying media item:', err);
      showToast('Failed to apply image from media library.');
    }
  };

  // Delete Media Item from Library
  const handleDeleteMedia = (id: string) => {
    setMediaLibrary((prev) => prev.filter((m) => m.id !== id));
    showToast('Image removed from Media Library.');
  };

  // Batch Auto Plot Media Library Images to Canvas / Pages
  const handleBatchAutoPlot = async (expandBook: boolean) => {
    if (mediaLibrary.length === 0) {
      showToast('No images in Media Library to plot.');
      return;
    }

    setIsBatchPlotting(true);
    const totalImages = mediaLibrary.length;
    const targetCount = expandBook ? totalImages : Math.min(totalImages, pages.length);
    setBatchPlotProgress({ current: 0, total: targetCount });

    try {
      // 1. Prepare base pages array (expand if requested and needed)
      let workingPages = [...pages];
      // Snapshot current canvas state into active page first
      workingPages[activePageIndex] = {
        ...workingPages[activePageIndex],
        dots,
        initialAutoDots,
        referenceImage,
        editedIllustration,
        sampleId: selectedSampleId,
        caption: pageCaption,
      };

      if (expandBook && totalImages > workingPages.length) {
        const needed = totalImages - workingPages.length;
        for (let k = 0; k < needed; k++) {
          const pageNum = workingPages.length + 1;
          workingPages.push({
            id: 'page-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            pageNumber: pageNum,
            title: `Page ${pageNum}`,
            dots: [],
            initialAutoDots: [],
            referenceImage: null,
            editedIllustration: null,
            sampleId: null,
            caption: `Page ${pageNum}`,
          });
        }
      }

      // 2. Loop through each media item and analyze
      for (let i = 0; i < targetCount; i++) {
        const mediaItem = mediaLibrary[i];
        const file = await mediaItemToFile(mediaItem);
        const cleanName = mediaItem.filename
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]/g, ' ')
          .trim()
          .toUpperCase();

        const formData = new FormData();
        formData.append('file', file);
        formData.append('preset', difficultyPreset);
        if (difficultyPreset === 'custom') {
          formData.append('custom_max_dots', String(customMaxDots));
        }
        formData.append('canvas_width', String(pageSetup.widthPt));
        formData.append('canvas_height', String(pageSetup.heightPt));
        formData.append('page_margin', String(pageSetup.marginPt));
        formData.append('dot_radius', String(dotRadius));
        formData.append('font_size', String(fontSize));

        const res = await fetch(`${API_BASE}/api/analyze-and-generate`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (data.success) {
          workingPages[i] = {
            ...workingPages[i],
            title: cleanName,
            caption: cleanName,
            dots: data.dots,
            initialAutoDots: data.dots,
            referenceImage: data.reference_image,
            editedIllustration: data.reference_image,
            sampleId: null,
          };
        }

        setBatchPlotProgress({ current: i + 1, total: targetCount });
      }

      // 3. Commit updated pages
      setPages(workingPages);

      // 4. Sync current active page to the newly plotted content
      const currentActive = workingPages[activePageIndex] || workingPages[0];
      setDots(currentActive.dots || []);
      setInitialAutoDots(currentActive.initialAutoDots || currentActive.dots || []);
      setReferenceImage(currentActive.referenceImage || null);
      setEditedIllustration(currentActive.editedIllustration || currentActive.referenceImage || null);
      setSelectedSampleId(currentActive.sampleId || null);
      setPageCaption(currentActive.caption || currentActive.title || '');
      setHistory([currentActive.dots || []]);
      setHistoryIndex(0);

      showToast(`Successfully auto-plotted ${targetCount} images across book pages!`);
      setIsMediaLibraryModalOpen(false);
    } catch (err) {
      console.error('Batch auto-plot error:', err);
      showToast('Error during batch auto-plot process.');
    } finally {
      setIsBatchPlotting(false);
      setBatchPlotProgress(null);
    }
  };

  // Drag & Drop Image Handler
  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (files.length > 0) {
        handleBatchUploadMedia(files);
        await processImageFile(files[0]);
      } else {
        showToast('Please drop PNG or JPG image files.');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Auto Generate Dots with current settings
  const handleGenerateDots = () => {
    if (selectedSampleId) {
      loadSampleAndGenerate(selectedSampleId);
    } else if (referenceImage) {
      showToast('Select a sample or re-upload image to trace.');
    }
  };

  // Reset Auto
  const handleResetAuto = () => {
    if (initialAutoDots.length === 0) return;
    if (window.confirm('Reset to the initial auto-generated dot positions? All manual edits will be reverted.')) {
      updateDotsWithHistory(initialAutoDots);
      showToast('Reset to initial auto-generated layout.');
    }
  };

  // Renumber All
  const handleRenumberAll = () => {
    const sorted = [...dots].sort((a, b) => a.sequenceIndex - b.sequenceIndex);
    const renumbered = sorted.map((d, idx) => ({
      ...d,
      sequenceIndex: idx + 1,
      displayNumber: idx + 1,
    }));
    updateDotsWithHistory(renumbered);
    showToast(`Renumbered ${renumbered.length} dots sequentially.`);
    runValidation(renumbered);
  };

  // Auto Position Numbers
  const handleAutoPositionNumbers = async () => {
    if (dots.length === 0) return;
    try {
      const res = await fetch(`${API_BASE}/api/reposition-numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dots,
          canvasWidth: pageSetup.widthPt,
          canvasHeight: pageSetup.heightPt,
          pageMargin: pageSetup.marginPt,
          dotRadius,
          fontSize,
        }),
      });
      const data = await res.json();
      if (data.success) {
        updateDotsWithHistory(data.dots);
        showToast('Auto-positioned numbers to prevent collisions.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error repositioning numbers.');
    }
  };

  // Run Validation ("CHECK PUZZLE")
  const runValidation = async (dotsToValidate: Dot[] = dots) => {
    try {
      const res = await fetch(`${API_BASE}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dots: dotsToValidate,
          canvasWidth: pageSetup.widthPt,
          canvasHeight: pageSetup.heightPt,
          pageMargin: pageSetup.marginPt,
          dotRadius,
          fontSize,
        }),
      });
      const report: ValidationReport = await res.json();
      setValidationReport(report);
      return report;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleOpenQualityCheck = async () => {
    const report = await runValidation();
    if (report) {
      if (report.is_valid && report.issues.length === 0) {
        showToast('✓ Puzzle check passed: no issues found!');
      } else {
        showToast(`Puzzle check: ${report.error_count} errors, ${report.warning_count} warnings.`);
      }
    }
  };

  // Fit to screen
  const handleFitToScreen = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoom(100);
  };

  // Single dot update from inspector
  const handleUpdateSingleDot = (updated: Dot) => {
    const nextDots = dots.map((d) => (d.id === updated.id ? updated : d));
    updateDotsWithHistory(nextDots);
  };

  // Delete dot
  const handleDeleteDot = (id: string) => {
    const nextDots = dots.filter((d) => d.id !== id);
    updateDotsWithHistory(nextDots);
    if (selectedDotId === id) setSelectedDotId(null);
    showToast('Dot deleted. Click "Renumber All" if sequence update is desired.');
  };

  // --- Multi-Page Management Functions ---

  // Select Page from Timeline
  const handleSelectPage = (newIndex: number) => {
    if (newIndex === activePageIndex || newIndex < 0 || newIndex >= pages.length) return;

    // 1. Sync current canvas state to active page
    const updatedPages = [...pages];
    updatedPages[activePageIndex] = {
      ...updatedPages[activePageIndex],
      dots,
      initialAutoDots,
      referenceImage,
      editedIllustration,
      sampleId: selectedSampleId,
      caption: pageCaption,
    };
    setPages(updatedPages);

    // 2. Load target page state
    const target = updatedPages[newIndex];
    setActivePageIndex(newIndex);
    setSelectedDotId(null);
    setDots(target.dots || []);
    setInitialAutoDots(target.initialAutoDots || target.dots || []);
    setReferenceImage(target.referenceImage || null);
    setEditedIllustration(target.editedIllustration || target.referenceImage || null);
    setSelectedSampleId(target.sampleId || null);
    setPageCaption(target.caption || target.title || '');
    setHistory([target.dots || []]);
    setHistoryIndex(0);

    // If target page has a sampleId but empty dots, load and generate dots
    if (target.sampleId && (!target.dots || target.dots.length === 0)) {
      loadSampleAndGenerate(target.sampleId);
    } else if (target.dots && target.dots.length > 0) {
      runValidation(target.dots);
    }
  };

  // Add a Blank Page
  const handleAddPage = () => {
    const updatedPages = [...pages];
    updatedPages[activePageIndex] = {
      ...updatedPages[activePageIndex],
      dots,
      initialAutoDots,
      referenceImage,
      editedIllustration,
      sampleId: selectedSampleId,
      caption: pageCaption,
    };

    const newPageNum = updatedPages.length + 1;
    const newPage: PageItem = {
      id: 'page-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      pageNumber: newPageNum,
      title: `Page ${newPageNum}`,
      caption: `Page ${newPageNum}`,
      dots: [],
      initialAutoDots: [],
      referenceImage: null,
      editedIllustration: null,
      sampleId: null,
    };

    const newPages = [...updatedPages, newPage];
    setPages(newPages);
    setActivePageIndex(newPages.length - 1);
    setSelectedDotId(null);
    setDots([]);
    setInitialAutoDots([]);
    setReferenceImage(null);
    setEditedIllustration(null);
    setSelectedSampleId(null);
    setPageCaption(`Page ${newPageNum}`);
    setHistory([[]]);
    setHistoryIndex(0);
    showToast(`Added Page ${newPageNum}.`);
  };

  // Duplicate Page
  const handleDuplicatePage = (index: number) => {
    const sourcePage =
      index === activePageIndex
        ? {
            id: pages[index].id,
            pageNumber: index + 1,
            title: pages[index].title,
            caption: pageCaption,
            dots,
            initialAutoDots,
            referenceImage,
            editedIllustration,
            sampleId: selectedSampleId,
          }
        : pages[index];

    const duplicated: PageItem = {
      ...sourcePage,
      id: 'page-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      title: `${sourcePage.title} (Copy)`,
      caption: sourcePage.caption || sourcePage.title,
      dots: JSON.parse(JSON.stringify(sourcePage.dots || [])),
      initialAutoDots: JSON.parse(JSON.stringify(sourcePage.initialAutoDots || [])),
    };

    const updatedPages = [...pages];
    updatedPages.splice(index + 1, 0, duplicated);
    const renumbered = updatedPages.map((p, idx) => ({
      ...p,
      pageNumber: idx + 1,
    }));
    setPages(renumbered);
    showToast(`Duplicated Page ${index + 1}.`);
  };

  // Delete Page
  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) {
      showToast('Cannot delete the only page in the book.');
      return;
    }
    const updatedPages = pages.filter((_, idx) => idx !== index);
    const renumbered = updatedPages.map((p, idx) => ({
      ...p,
      pageNumber: idx + 1,
    }));
    setPages(renumbered);

    let newActiveIdx = activePageIndex;
    if (index === activePageIndex) {
      newActiveIdx = Math.min(index, renumbered.length - 1);
      const target = renumbered[newActiveIdx];
      setSelectedDotId(null);
      setDots(target.dots || []);
      setInitialAutoDots(target.initialAutoDots || target.dots || []);
      setReferenceImage(target.referenceImage || null);
      setEditedIllustration(target.editedIllustration || target.referenceImage || null);
      setSelectedSampleId(target.sampleId || null);
      setPageCaption(target.caption || target.title || '');
      setHistory([target.dots || []]);
      setHistoryIndex(0);
    } else if (index < activePageIndex) {
      newActiveIdx = activePageIndex - 1;
    }
    setActivePageIndex(newActiveIdx);
    showToast(`Deleted Page ${index + 1}.`);
  };

  // Create New Project with specified N pages
  const handleCreateProject = (
    name: string,
    setup: PageSetup,
    pageCount: number,
    populateSamples: boolean
  ) => {
    setProjectName(name);
    setPageSetup(setup);

    const sampleIds = ['dinosaur', 'rocket', 'cat', 'teddy_bear', 'car', 'flower'];
    const sampleNames: Record<string, string> = {
      dinosaur: 'BABY DINOSAUR',
      rocket: 'SPACE ROCKET',
      cat: 'CARTOON CAT',
      teddy_bear: 'TEDDY BEAR',
      car: 'CARTOON CAR',
      flower: 'SUNFLOWER',
    };
    const newPages: PageItem[] = [];

    for (let i = 0; i < pageCount; i++) {
      const sId = populateSamples ? sampleIds[i % sampleIds.length] : null;
      const initialCap = sId ? sampleNames[sId] : `Page ${i + 1}`;
      newPages.push({
        id: 'page-' + (i + 1) + '-' + Date.now(),
        pageNumber: i + 1,
        title: sId ? sampleNames[sId] : `Page ${i + 1}`,
        caption: initialCap,
        dots: [],
        initialAutoDots: [],
        referenceImage: null,
        editedIllustration: null,
        sampleId: sId,
      });
    }

    setPages(newPages);
    setActivePageIndex(0);
    setSelectedDotId(null);
    setDots([]);
    setInitialAutoDots([]);
    setReferenceImage(null);
    setEditedIllustration(null);
    setPageCaption(newPages[0]?.caption || 'Page 1');
    setHistory([[]]);
    setHistoryIndex(0);

    if (populateSamples && samples.length > 0) {
      setMediaLibrary(
        samples.map((s) => ({
          id: `media-${s.id}`,
          filename: s.filename,
          dataUri: `${API_BASE}/api/samples/${s.filename}`,
          width: 1200,
          height: 1550,
          dateAdded: Date.now(),
        }))
      );
    }

    // If first page has a sample, immediately load and trace it
    if (populateSamples && newPages[0].sampleId) {
      loadSampleAndGenerate(newPages[0].sampleId);
    }

    showToast(`Created project "${name}" with ${pageCount} pages!`);
  };

  // Export Single Page Vector PDF
  const handleExportPdf = async (includeAnswerKey: boolean, includeIllustration: boolean = false) => {
    setIsExporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dots,
          widthPt: pageSetup.widthPt,
          heightPt: pageSetup.heightPt,
          dotRadiusPt: dotRadius,
          fontSizePt: fontSize,
          includeAnswerKey,
          pageMargin: pageSetup.marginPt,
          includeIllustration,
          illustrationImageBase64: includeIllustration ? (editedIllustration || referenceImage) : null,
          caption: pageCaption,
        }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (projectName || 'dot_to_dot_puzzle').replace(/[^a-z0-9_-]/gi, '_');
      a.download = `${safeName}_page_${activePageIndex + 1}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Vector PDF for Page ${activePageIndex + 1} downloaded successfully!`);
      setIsExportModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to export PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export Combined Entire Multi-Page Book PDF
  const handleExportBookPdf = async (
    includeAnswerKey: boolean,
    includeIllustration: boolean = true,
    frontMatter: FrontMatterOptions = { belongsTo: true, toc: true, copyright: true, instructions: true }
  ) => {
    setIsExporting(true);
    try {
      // Snapshot active page state
      const pagesSnapshot = pages.map((p, idx) => {
        if (idx === activePageIndex) {
          return {
            ...p,
            dots,
            referenceImage,
            editedIllustration,
            caption: pageCaption,
          };
        }
        return p;
      });

      const exportPages = pagesSnapshot.map((p) => ({
        dots: p.dots || [],
        includeIllustration,
        illustrationImageBase64: includeIllustration ? (p.editedIllustration || p.referenceImage) : null,
        caption: p.caption || p.title || '',
      }));

      const res = await fetch(`${API_BASE}/api/export-book-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: exportPages,
          widthPt: pageSetup.widthPt,
          heightPt: pageSetup.heightPt,
          pageMargin: pageSetup.marginPt,
          dotRadiusPt: dotRadius,
          fontSizePt: fontSize,
          includeAnswerKey,
          bookTitle: projectName || 'Dot-to-Dot Puzzle Book',
          includeBelongsTo: frontMatter.belongsTo,
          includeToc: frontMatter.toc,
          includeCopyright: frontMatter.copyright,
          includeInstructions: frontMatter.instructions,
        }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (projectName || 'dot_to_dot_book').replace(/[^a-z0-9_-]/gi, '_');
      a.download = `${safeName}_${pagesSnapshot.length}pages_book.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded entire ${pagesSnapshot.length}-page PDF book!`);
      setIsExportModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to export book PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export High-Res PNG
  const handleExportPng = async (dpi: number, includeAnswerKey: boolean, includeIllustration: boolean = false) => {
    setIsExporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/export-png`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dots,
          widthPt: pageSetup.widthPt,
          heightPt: pageSetup.heightPt,
          dotRadiusPt: dotRadius,
          fontSizePt: fontSize,
          dpi,
          includeAnswerKey,
          pageMargin: pageSetup.marginPt,
          includeIllustration,
          illustrationImageBase64: includeIllustration ? (editedIllustration || referenceImage) : null,
          caption: pageCaption,
        }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (projectName || 'dot_to_dot_puzzle').replace(/[^a-z0-9_-]/gi, '_');
      a.download = `${safeName}_page_${activePageIndex + 1}_${dpi}dpi.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported Page ${activePageIndex + 1} (${dpi} DPI PNG) successfully!`);
    } catch (err) {
      console.error(err);
      showToast('Failed to export PNG.');
    } finally {
      setIsExporting(false);
    }
  };

  // Project Save (.dotproj)
  const handleSaveProject = () => {
    const pagesSnapshot = pages.map((p, idx) => {
      if (idx === activePageIndex) {
        return {
          ...p,
          dots,
          initialAutoDots,
          referenceImage,
          editedIllustration,
          sampleId: selectedSampleId,
          caption: pageCaption,
        };
      }
      return p;
    });

    const projectData: ProjectData = {
      version: '2.0',
      projectName,
      pageSetup,
      dotRadius,
      fontSize,
      referenceOpacity,
      referenceVisible,
      referenceLocked,
      showAnswer,
      snapToGrid: snapEnabled,
      pages: pagesSnapshot,
      activePageIndex,
      mediaLibrary,
      // Backwards compat
      dots,
      initialAutoDots,
      referenceImage,
      editedIllustration,
    };
    exportProjectToFile(projectData, projectName);
    showToast(`Saved project file (.dotproj) with ${pages.length} pages.`);
  };

  // Project Load (.dotproj)
  const handleLoadProject = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleProjectFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const loaded = await importProjectFromFile(file);
      setProjectName(loaded.projectName || 'Loaded Puzzle');
      if (loaded.pageSetup) setPageSetup(loaded.pageSetup);
      if (loaded.dotRadius) setDotRadius(loaded.dotRadius);
      if (loaded.fontSize) setFontSize(loaded.fontSize);
      if (loaded.referenceOpacity !== undefined) setReferenceOpacity(loaded.referenceOpacity);
      if (loaded.referenceVisible !== undefined) setReferenceVisible(loaded.referenceVisible);
      if (loaded.referenceLocked !== undefined) setReferenceLocked(loaded.referenceLocked);
      if (loaded.showAnswer !== undefined) setShowAnswer(loaded.showAnswer);
      if (loaded.snapToGrid !== undefined) setSnapEnabled(loaded.snapToGrid);

      if (loaded.pages && loaded.pages.length > 0) {
        setPages(loaded.pages);
        const activeIdx = Math.min(loaded.activePageIndex || 0, loaded.pages.length - 1);
        setActivePageIndex(activeIdx);
        const activePg = loaded.pages[activeIdx];
        setDots(activePg.dots || []);
        setInitialAutoDots(activePg.initialAutoDots || activePg.dots || []);
        setReferenceImage(activePg.referenceImage || null);
        setEditedIllustration(activePg.editedIllustration || activePg.referenceImage || null);
        setSelectedSampleId(activePg.sampleId || null);
        setHistory([activePg.dots || []]);
        setHistoryIndex(0);
        showToast(`Loaded book with ${loaded.pages.length} pages!`);
        runValidation(activePg.dots || []);
      } else {
        setDots(loaded.dots || []);
        setInitialAutoDots(loaded.initialAutoDots || loaded.dots || []);
        setReferenceImage(loaded.referenceImage || null);
        setEditedIllustration(loaded.editedIllustration || loaded.referenceImage || null);
        setHistory([loaded.dots || []]);
        setHistoryIndex(0);
        showToast(`Loaded project!`);
        runValidation(loaded.dots || []);
      }

      if (loaded.mediaLibrary) {
        setMediaLibrary(loaded.mediaLibrary);
      }
    } catch (err) {
      console.error(err);
      showToast('Error importing .dotproj file.');
    } finally {
      e.target.value = '';
    }
  };

  const selectedDot = dots.find((d) => d.id === selectedDotId) || null;

  return (
    <div className="app-shell">
      {/* Hidden File Input for .dotproj import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".dotproj,application/json"
        style={{ display: 'none' }}
        onChange={handleProjectFileChange}
      />

      {/* Top Application Bar */}
      <TopToolbar
        projectName={projectName}
        setProjectName={setProjectName}
        onUploadImage={handleUploadImage}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={zoom}
        onZoomChange={setZoom}
        onFitToScreen={handleFitToScreen}
        onAutoDots={() => setIsSampleModalOpen(true)}
        onResetAuto={handleResetAuto}
        onRenumberAll={handleRenumberAll}
        onAutoPositionNumbers={handleAutoPositionNumbers}
        showAnswer={showAnswer}
        onToggleShowAnswer={() => setShowAnswer(!showAnswer)}
        referenceVisible={referenceVisible}
        onToggleReference={() => setReferenceVisible(!referenceVisible)}
        onOpenQualityCheck={handleOpenQualityCheck}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenSamples={() => setIsSampleModalOpen(true)}
        onOpenNewProject={() => setIsNewProjectModalOpen(true)}
        onOpenMediaLibrary={() => setIsMediaLibraryModalOpen(true)}
        mediaCount={mediaLibrary.length}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        dotsCount={dots.length}
        totalPages={pages.length}
        activePageNumber={activePageIndex + 1}
      />

      {/* Main Workspace Layout (Supports Drag & Drop of Image Files) */}
      <div
        className="workspace-layout"
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
      >
        {/* Left Vertical Tool Palette */}
        <LeftToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          dotsCount={dots.length}
          maxDots={MAX_DOTS_HARD_CAP}
          snapEnabled={snapEnabled}
          onToggleSnap={() => setSnapEnabled(!snapEnabled)}
          crosshairEnabled={crosshairEnabled}
          onToggleCrosshair={() => setCrosshairEnabled(!crosshairEnabled)}
          safeMarginsVisible={safeMarginsVisible}
          onToggleSafeMargins={() => setSafeMarginsVisible(!safeMarginsVisible)}
          eraserSize={eraserSize}
          setEraserSize={setEraserSize}
          onRestoreIllustration={handleRestoreIllustration}
        />

        {/* Center SVG Interactive Canvas */}
        <Canvas
          pageSetup={pageSetup}
          dots={dots}
          onUpdateDots={updateDotsWithHistory}
          selectedDotId={selectedDotId}
          onSelectDot={setSelectedDotId}
          activeTool={activeTool}
          dotRadius={dotRadius}
          fontSize={fontSize}
          referenceImage={referenceImage}
          editedIllustration={editedIllustration}
          onUpdateIllustration={handleUpdateIllustration}
          eraserSize={eraserSize}
          referenceOpacity={referenceOpacity}
          referenceVisible={referenceVisible}
          referenceLocked={referenceLocked}
          showAnswer={showAnswer}
          snapEnabled={snapEnabled}
          crosshairEnabled={crosshairEnabled}
          safeMarginsVisible={safeMarginsVisible}
          pageCaption={pageCaption}
          zoom={zoom}
          onZoomChange={setZoom}
          panOffset={panOffset}
          setPanOffset={setPanOffset}
          onNotifyMaxDots={() => showToast('Maximum 120 dots reached.')}
        />

        {/* Right Inspector & Settings Sidebar */}
        <RightSidebar
          selectedDot={selectedDot}
          onUpdateDot={handleUpdateSingleDot}
          onDeleteDot={handleDeleteDot}
          dotRadius={dotRadius}
          setDotRadius={setDotRadius}
          fontSize={fontSize}
          setFontSize={setFontSize}
          pageSetup={pageSetup}
          setPageSetup={setPageSetup}
          referenceOpacity={referenceOpacity}
          setReferenceOpacity={setReferenceOpacity}
          referenceVisible={referenceVisible}
          setReferenceVisible={setReferenceVisible}
          referenceLocked={referenceLocked}
          setReferenceLocked={setReferenceLocked}
          onUploadImage={handleUploadImage}
          difficultyPreset={difficultyPreset}
          setDifficultyPreset={setDifficultyPreset}
          customMaxDots={customMaxDots}
          setCustomMaxDots={setCustomMaxDots}
          onGenerateDots={handleGenerateDots}
          isGenerating={isGenerating}
          validationReport={validationReport}
          onSelectDotById={(id) => {
            setSelectedDotId(id);
            setActiveTool('select');
          }}
          mediaLibrary={mediaLibrary}
          onOpenMediaLibrary={() => setIsMediaLibraryModalOpen(true)}
          onApplyMedia={handleApplyMediaToPage}
          activePageNumber={activePageIndex + 1}
          pageCaption={pageCaption}
          onUpdatePageCaption={handleUpdatePageCaption}
        />
      </div>

      {/* Page Timeline Filmstrip (Multi-Page Book Navigation) */}
      <PageTimeline
        pages={pages.map((p, idx) =>
          idx === activePageIndex
            ? {
                ...p,
                dots,
                editedIllustration: editedIllustration || referenceImage,
                referenceImage,
                caption: pageCaption,
              }
            : p
        )}
        activePageIndex={activePageIndex}
        onSelectPage={handleSelectPage}
        onAddPage={handleAddPage}
        onDuplicatePage={handleDuplicatePage}
        onDeletePage={handleDeletePage}
      />

      {/* Bottom Status Bar */}
      <StatusBar
        dotsCount={dots.length}
        maxDots={MAX_DOTS_HARD_CAP}
        selectedDot={selectedDot}
        referenceVisible={referenceVisible}
        referenceOpacity={referenceOpacity}
        zoom={zoom}
        activeTool={activeTool}
      />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Export Preview Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        dots={dots}
        pageSetup={pageSetup}
        dotRadius={dotRadius}
        fontSize={fontSize}
        editedIllustration={editedIllustration || referenceImage}
        caption={pageCaption}
        onExportPdf={handleExportPdf}
        onExportPng={handleExportPng}
        onExportBookPdf={handleExportBookPdf}
        isExporting={isExporting}
        totalPages={pages.length}
        activePageNumber={activePageIndex + 1}
      />

      {/* Sample Gallery Modal */}
      <SamplePickerModal
        isOpen={isSampleModalOpen}
        onClose={() => setIsSampleModalOpen(false)}
        samples={samples}
        selectedSampleId={selectedSampleId}
        onSelectSample={loadSampleAndGenerate}
        onUploadImage={handleUploadImage}
        isLoading={isGenerating}
      />

      {/* New Project Creation Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />

      {/* Media Library Modal */}
      <MediaLibraryModal
        isOpen={isMediaLibraryModalOpen}
        onClose={() => setIsMediaLibraryModalOpen(false)}
        mediaLibrary={mediaLibrary}
        onUploadMedia={handleBatchUploadMedia}
        onApplyImageToPage={handleApplyMediaToPage}
        onDeleteMedia={handleDeleteMedia}
        activePageNumber={activePageIndex + 1}
        totalPages={pages.length}
        onBatchAutoPlot={handleBatchAutoPlot}
        isBatchPlotting={isBatchPlotting}
        batchPlotProgress={batchPlotProgress}
        isGenerating={isGenerating}
      />
    </div>
  );
};
export default App;
