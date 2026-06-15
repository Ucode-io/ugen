import { create } from "zustand";
import {
  normalizeMobileCapabilities,
  type MobileCapability,
} from "./mobile-capabilities";

/**
 * Payload of the `mobile_project` SSE event emitted during a Capacitor mobile
 * generation. A Capacitor app is the web app wrapped in a native shell, so the
 * preview reuses the normal web preview — this record just carries the runtime
 * metadata (Capacitor version, web output dir) and the project files the mobile
 * actions panel needs (Download source, future native build).
 */
export interface MobileProjectData {
  project_name?: string;
  /** Always "mobile" for this event; mirrors mcp_project.project_type. */
  project_type?: "mobile";
  /** "capacitor" — the native runtime wrapping the web build. */
  runtime?: string;
  /** Capacitor major version, e.g. "8". */
  runtime_version?: string;
  /** Web build output directory Capacitor syncs from, e.g. "build". */
  web_dir?: string;
  /** Native/browser capabilities requested by the generated mobile project. */
  capabilities?: MobileCapability[];
  files?: { path: string; content: string }[];
}

interface MobileProjectState {
  /** Set from the `mobile_project` SSE event; null for web/admin/landing projects. */
  mobileProject: MobileProjectData | null;
  /**
   * Project this `mobileProject` belongs to. The store is global, so callers
   * compare this against the active project id before applying it — otherwise a
   * previous mobile generation would mis-flag a different project.
   */
  mobileProjectId: string | null;
  setMobileProject: (
    data: MobileProjectData | null,
    projectId?: string | null,
  ) => void;
  clearMobileProject: () => void;
}

export const useMobileProjectStore = create<MobileProjectState>((set) => ({
  mobileProject: null,
  mobileProjectId: null,
  setMobileProject: (mobileProject, projectId = null) =>
    set({
      mobileProject: mobileProject
        ? {
            ...mobileProject,
            capabilities: normalizeMobileCapabilities(
              mobileProject.capabilities,
            ),
          }
        : null,
      mobileProjectId: projectId,
    }),
  clearMobileProject: () => set({ mobileProject: null, mobileProjectId: null }),
}));
