import type { PSDUIProject } from '../schemas/psdui';

export interface ProjectAutoSaveRequest {
  projectPath: string;
  project: PSDUIProject;
}

interface ProjectAutoSaveTimers<TTimer> {
  setTimeout(callback: () => void, delayMs: number): TTimer;
  clearTimeout(timer: TTimer): void;
}

interface ProjectAutoSaveSchedulerOptions<TTimer> {
  delayMs: number;
  saveProject: (request: ProjectAutoSaveRequest) => Promise<void>;
  timers?: ProjectAutoSaveTimers<TTimer>;
  onSaved?: (request: ProjectAutoSaveRequest) => void;
  onError?: (error: unknown) => void;
}

export interface ProjectAutoSaveScheduler {
  schedule(request: ProjectAutoSaveRequest): void;
  cancel(): void;
}

export function createProjectAutoSaveScheduler<TTimer = ReturnType<typeof setTimeout>>({
  delayMs,
  saveProject,
  timers = globalThis as unknown as ProjectAutoSaveTimers<TTimer>,
  onSaved,
  onError
}: ProjectAutoSaveSchedulerOptions<TTimer>): ProjectAutoSaveScheduler {
  let timer: TTimer | null = null;

  function cancel() {
    if (timer !== null) {
      timers.clearTimeout(timer);
      timer = null;
    }
  }

  return {
    schedule(request) {
      cancel();
      timer = timers.setTimeout(() => {
        timer = null;
        void saveProject(request)
          .then(() => onSaved?.(request))
          .catch((error: unknown) => onError?.(error));
      }, delayMs);
    },
    cancel
  };
}
