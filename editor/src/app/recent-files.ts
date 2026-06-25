const recentFilesStorageKey = 'psdui-editor.recentFiles.v1';

export interface RecentFiles {
  projectPath: string | null;
  sourcePath: string | null;
}

export type RecentOpenCandidate =
  | { kind: 'project'; path: string }
  | { kind: 'source'; path: string };

export interface RecentFilesStore {
  load: () => RecentFiles;
  save: (recentFiles: RecentFiles) => void;
}

export function createRecentFilesStore(storage: Pick<Storage, 'getItem' | 'setItem'>): RecentFilesStore {
  return {
    load: () => parseRecentFiles(storage.getItem(recentFilesStorageKey)),
    save: (recentFiles) => storage.setItem(recentFilesStorageKey, JSON.stringify(recentFiles))
  };
}

export function getRecentOpenCandidates(recentFiles: RecentFiles): RecentOpenCandidate[] {
  const candidates: RecentOpenCandidate[] = [];

  if (recentFiles.projectPath !== null) {
    candidates.push({ kind: 'project', path: recentFiles.projectPath });
  }

  if (recentFiles.sourcePath !== null) {
    candidates.push({ kind: 'source', path: recentFiles.sourcePath });
  }

  return candidates;
}

export function recordRecentProject(
  store: RecentFilesStore,
  projectPath: string,
  sourcePath?: string
): RecentFiles {
  const current = store.load();
  const recentFiles = {
    projectPath,
    sourcePath: sourcePath ?? current.sourcePath
  };

  store.save(recentFiles);
  return recentFiles;
}

export function recordRecentSource(store: RecentFilesStore, sourcePath: string): RecentFiles {
  const recentFiles = {
    projectPath: null,
    sourcePath
  };

  store.save(recentFiles);
  return recentFiles;
}

export function forgetRecentProject(store: RecentFilesStore): RecentFiles {
  const current = store.load();
  const recentFiles = {
    ...current,
    projectPath: null
  };

  store.save(recentFiles);
  return recentFiles;
}

function parseRecentFiles(value: string | null): RecentFiles {
  if (value === null) {
    return emptyRecentFiles();
  }

  try {
    const parsed = JSON.parse(value) as Partial<RecentFiles>;

    return {
      projectPath: normalizePath(parsed.projectPath),
      sourcePath: normalizePath(parsed.sourcePath)
    };
  } catch {
    return emptyRecentFiles();
  }
}

function normalizePath(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function emptyRecentFiles(): RecentFiles {
  return {
    projectPath: null,
    sourcePath: null
  };
}
