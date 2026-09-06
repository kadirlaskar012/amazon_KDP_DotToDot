import type { ProjectData } from '../types';

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
