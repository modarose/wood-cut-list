import { parseBenchMateProject } from './benchmateAdapter.js';

export const PROJECT_STORAGE_KEY = 'benchmate.projects.v1';

function getDefaultStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function createProjectId() {
  if (globalThis.crypto?.randomUUID) {
    return `project_${globalThis.crypto.randomUUID()}`;
  }

  return `project_${Date.now()}`;
}

export function loadStoredProjects(storage = getDefaultStorage()) {
  if (!storage) return [];

  try {
    const serialized = storage.getItem(PROJECT_STORAGE_KEY);
    if (!serialized) return [];

    const records = JSON.parse(serialized);
    if (!Array.isArray(records)) return [];

    return records.flatMap(record => {
      try {
        return [parseBenchMateProject(record)];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

export function saveStoredProjects(projects, storage = getDefaultStorage()) {
  if (!storage) return false;

  try {
    storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
    return true;
  } catch {
    return false;
  }
}

export function upsertStoredProject(project, projects, storage = getDefaultStorage()) {
  const nextProjects = [
    ...projects.filter(candidate => candidate.project.id !== project.project.id),
    project,
  ];

  return {
    projects: nextProjects,
    saved: saveStoredProjects(nextProjects, storage),
  };
}
