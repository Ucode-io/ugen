import { api } from "@/shared/api";

const readConnectUrl = (payload: unknown): string | null => {
  if (typeof payload === "string") {
    try {
      const url = new URL(payload);
      return url.protocol === "https:" || url.protocol === "http:"
        ? url.toString()
        : null;
    } catch {
      return null;
    }
  }
  if (!payload || typeof payload !== "object") return null;

  const data = payload as Record<string, unknown>;
  return (
    readConnectUrl(data.data) ??
    readConnectUrl(data.url) ??
    readConnectUrl(data.auth_url) ??
    readConnectUrl(data.authorization_url) ??
    readConnectUrl(data.authorizationUrl)
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Field mapping (Google Calendar ⇄ uCode table)
//
// Persisted via PUT /v1/google-calendar/mapping. The `api` instance's request
// interceptor attaches the project-scoped API-KEY (Authorization: API-KEY +
// x-api-key) automatically on a project page, so no explicit auth header is
// needed here — same as every other resource call in this app.
//
// The save also caches the binding in localStorage so the modal can re-seed the
// UI on reopen (there is no GET endpoint for a saved mapping yet).
// ─────────────────────────────────────────────────────────────────────────────

/** A Google Calendar event property a table column can be bound to. */
export type GoogleCalendarEventField =
  | "summary"
  | "description"
  | "start"
  | "end"
  | "location"
  | "status";

export interface GoogleCalendarFieldBinding {
  /** UUID of the uCode table — sent to the API as `table_id`. */
  tableId: string;
  /** Slug of the uCode table — used for UI keying + the localStorage cache. */
  tableSlug: string;
  /** Google Calendar event property → table column slug. */
  mapping: Partial<Record<GoogleCalendarEventField, string>>;
}

// Internal event-property key → API request field name.
const FIELD_TO_API_KEY: Record<GoogleCalendarEventField, string> = {
  summary: "title_field",
  start: "start_field",
  end: "end_field",
  description: "description_field",
  location: "location_field",
  status: "status_field",
};

const fieldBindingStorageKey = (projectId: string, tableSlug: string) =>
  `gcal:field-binding:${projectId}:${tableSlug}`;

export const googleCalendarIntegrationApi = {
  getConnectUrl: async (
    apiKey: string,
    mcpProjectId: string,
  ): Promise<string> => {
    const { data } = await api.get("/v1/google-calendar/connect", {
      params: {
        mcp_project_id: mcpProjectId,
      },
      headers: {
        Authorization: "API-KEY",
        "x-api-key": apiKey,
      },
    });

    const url = readConnectUrl(data);
    if (!url) {
      throw new Error("Google Calendar connect endpoint returned no OAuth URL");
    }
    return url;
  },

  /**
   * Read a previously saved field binding for a table from the local cache.
   * There is no GET endpoint yet, so this only reflects bindings saved in this
   * browser; used to seed the modal on reopen.
   */
  getFieldBinding: (
    projectId: string,
    tableSlug: string,
  ): GoogleCalendarFieldBinding | null => {
    if (typeof window === "undefined" || !projectId || !tableSlug) return null;
    try {
      const raw = window.localStorage.getItem(
        fieldBindingStorageKey(projectId, tableSlug),
      );
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GoogleCalendarFieldBinding;
      return parsed?.mapping ? parsed : null;
    } catch {
      return null;
    }
  },

  /**
   * Persist a field binding via PUT /v1/google-calendar/mapping, then cache it
   * locally so getFieldBinding can re-seed the modal on reopen.
   */
  saveFieldBinding: async (
    projectId: string,
    binding: GoogleCalendarFieldBinding,
  ): Promise<GoogleCalendarFieldBinding> => {
    if (!binding.tableId) {
      throw new Error("A table must be selected before saving the mapping");
    }

    const payload: Record<string, string> = { table_id: binding.tableId };
    for (const [field, apiKey] of Object.entries(FIELD_TO_API_KEY)) {
      payload[apiKey] = binding.mapping[field as GoogleCalendarEventField] ?? "";
    }

    await api.put("/v1/google-calendar/mapping", payload);

    if (typeof window !== "undefined" && projectId && binding.tableSlug) {
      window.localStorage.setItem(
        fieldBindingStorageKey(projectId, binding.tableSlug),
        JSON.stringify(binding),
      );
    }
    return binding;
  },
};
