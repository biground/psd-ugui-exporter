export interface ProjectSettings {
  projectPath: string;
  layoutPath: string;
}

export function deriveDefaultProjectSettings(sourcePath: string): ProjectSettings {
  const splitAt = Math.max(sourcePath.lastIndexOf('/'), sourcePath.lastIndexOf('\\'));
  const directory = splitAt >= 0 ? sourcePath.slice(0, splitAt + 1) : '';
  const fileName = splitAt >= 0 ? sourcePath.slice(splitAt + 1) : sourcePath;
  const stem = fileName.replace(/\.[^.\\/]+$/, '') || 'project';

  return {
    projectPath: `${directory}${stem}.psdui`,
    layoutPath: `${directory}ui.layout.json`
  };
}
