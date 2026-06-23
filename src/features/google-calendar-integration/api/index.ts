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
// Read with GET /v1/google-calendar/mapping, written with PUT. The `api`
// instance's request interceptor attaches the project-scoped API-KEY
// (Authorization: API-KEY + x-api-key) automatically on a project page, so no
// explicit auth header is needed here — same as every other resource call.
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
  /** Slug of the uCode table — used for UI keying. */
  tableSlug: string;
  /** Google Calendar event property → table column slug. */
  mapping: Partial<Record<GoogleCalendarEventField, string>>;
}

/** The mapping currently saved on the server (the API returns a slug, no id). */
export interface GoogleCalendarSavedMapping {
  tableSlug: string;
  mapping: Partial<Record<GoogleCalendarEventField, string>>;
}

// Internal event-property key ⇄ API request/response field name.
const FIELD_TO_API_KEY: Record<GoogleCalendarEventField, string> = {
  summary: "title_field",
  start: "start_field",
  end: "end_field",
  description: "description_field",
  location: "location_field",
  status: "status_field",
};

// Server mapping object (title_field, start_field, …) → internal mapping.
const apiMappingToInternal = (
  m: Record<string, unknown>,
): Partial<Record<GoogleCalendarEventField, string>> => {
  const mapping: Partial<Record<GoogleCalendarEventField, string>> = {};
  (Object.keys(FIELD_TO_API_KEY) as GoogleCalendarEventField[]).forEach(
    (field) => {
      const value = m[FIELD_TO_API_KEY[field]];
      if (typeof value === "string" && value) mapping[field] = value;
    },
  );
  return mapping;
};

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
   * The table currently linked to Google Calendar for this project, or null if
   * none is configured yet. GET /v1/google-calendar/mapping.
   */
  getMapping: async (): Promise<GoogleCalendarSavedMapping | null> => {
    try {
      const { data } = await api.get("/v1/google-calendar/mapping");
      const m = data?.data?.settings?.google_calendar?.mapping;
      if (!m || typeof m.table_slug !== "string" || !m.table_slug) return null;
      return { tableSlug: m.table_slug, mapping: apiMappingToInternal(m) };
    } catch {
      // No mapping yet (or not connected) — treat as "nothing linked".
      return null;
    }
  },

  /** Persist a field binding via PUT /v1/google-calendar/mapping. */
  saveFieldBinding: async (
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
    return binding;
  },
};
