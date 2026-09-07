import type { ProjectData } from '../types';

const API_BASE = 'http://127.0.0.1:8000';

export interface LocalProjectMeta {
  filename: string;
  filePath: string;
  updatedAt: string;
  timestamp: number;
  sizeBytes: number;
  projectName: string;
  pageCount: number;
  dotsCount: number;
}

export async function getDefaultProjectLocation(): Promise<{ defaultLocation: string; folderName: string }> {
  const res = await fetch(`${API_BASE}/api/projects/default-location`);
  if (!res.ok) {
    throw new Error('Failed to retrieve default projects location');
  }
  return res.json();
}

export async function listLocalProjects(folder?: string): Promise<LocalProjectMeta[]> {
  const url = folder ? `${API_BASE}/api/projects?folder=${encodeURIComponent(folder)}` : `${API_BASE}/api/projects`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to retrieve saved projects');
  }
  const data = await res.json();
  return data.projects || [];
}

export async function saveProjectToDisk(
  project: ProjectData,
  saveLocation?: string,
  filename?: string
): Promise<{ success: boolean; filePath: string; filename: string; saveLocation: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/projects/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project,
      saveLocation: saveLocation || undefined,
      filename: filename || undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to save project to disk');
  }
  return res.json();
}

export async function loadProjectFromDisk(filePath: string): Promise<ProjectData> {
  const res = await fetch(`${API_BASE}/api/projects/load`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to load project from disk');
  }
  const data = await res.json();
  const proj = data.project as ProjectData;
  if (!proj.pages && (!proj.dots || !Array.isArray(proj.dots))) {
    throw new Error('Invalid project file format: missing pages or dots array.');
  }
  if (!proj.pages || !Array.isArray(proj.pages)) {
    proj.pages = [{
      id: 'page-1',
      pageNumber: 1,
      title: 'Page 1',
      dots: proj.dots || [],
      initialAutoDots: proj.initialAutoDots || proj.dots || [],
      referenceImage: proj.referenceImage || null,
      editedIllustration: proj.editedIllustration || proj.referenceImage || null,
    }];
    proj.activePageIndex = 0;
  }
  if (!proj.mediaLibrary) {
    proj.mediaLibrary = [];
  }
  proj.filePath = data.filePath;
  return proj;
}

export function exportProjectToFile(project: ProjectData, filename?: string) {
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (filename || project.projectName || 'my-puzzle')
    .replace(/[^a-z0-9_-]/gi, '_')
    .toLowerCase();
  a.download = `${safeName}.dotproj`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importProjectFromFile(file: File): Promise<ProjectData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as ProjectData;
        if (!data.pages && (!data.dots || !Array.isArray(data.dots))) {
          throw new Error('Invalid project file format: missing pages or dots array.');
        }
        // Normalize if legacy single-page project
        if (!data.pages || !Array.isArray(data.pages)) {
          data.pages = [{
            id: 'page-1',
            pageNumber: 1,
            title: 'Page 1',
            dots: data.dots || [],
            initialAutoDots: data.initialAutoDots || data.dots || [],
            referenceImage: data.referenceImage || null,
            editedIllustration: data.editedIllustration || data.referenceImage || null,
          }];
          data.activePageIndex = 0;
        }
        if (!data.mediaLibrary) {
          data.mediaLibrary = [];
        }
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
