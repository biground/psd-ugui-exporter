import type { PSDUIProject } from '../schemas/psdui';

const maxProjectHistoryEntries = 100;

export interface ProjectHistory {
  past: PSDUIProject[];
  future: PSDUIProject[];
}

export function createEmptyProjectHistory(): ProjectHistory {
  return {
    past: [],
    future: []
  };
}

export function recordProjectHistory(
  history: ProjectHistory,
  previousProject: PSDUIProject | null,
  nextProject: PSDUIProject | null
): ProjectHistory {
  if (
    previousProject === null
    || nextProject === null
    || areProjectsEqual(previousProject, nextProject)
  ) {
    return history;
  }

  return {
    past: [...history.past, cloneProject(previousProject)].slice(-maxProjectHistoryEntries),
    future: []
  };
}

export function undoProject(
  history: ProjectHistory,
  currentProject: PSDUIProject | null
): { history: ProjectHistory; project: PSDUIProject } | null {
  if (currentProject === null || history.past.length === 0) {
    return null;
  }

  const previousProject = history.past[history.past.length - 1];

  if (previousProject === undefined) {
    return null;
  }

  return {
    history: {
      past: history.past.slice(0, -1),
      future: [cloneProject(currentProject), ...history.future].slice(0, maxProjectHistoryEntries)
    },
    project: cloneProject(previousProject)
  };
}

export function redoProject(
  history: ProjectHistory,
  currentProject: PSDUIProject | null
): { history: ProjectHistory; project: PSDUIProject } | null {
  if (currentProject === null || history.future.length === 0) {
    return null;
  }

  const nextProject = history.future[0];

  if (nextProject === undefined) {
    return null;
  }

  return {
    history: {
      past: [...history.past, cloneProject(currentProject)].slice(-maxProjectHistoryEntries),
      future: history.future.slice(1)
    },
    project: cloneProject(nextProject)
  };
}

function areProjectsEqual(first: PSDUIProject, second: PSDUIProject): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function cloneProject(project: PSDUIProject): PSDUIProject {
  return JSON.parse(JSON.stringify(project)) as PSDUIProject;
}
