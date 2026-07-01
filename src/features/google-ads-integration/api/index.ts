import { api } from "@/shared/api";

// ─────────────────────────────────────────────────────────────────────────────
// Google Lead Form Ads integration
//
// Unlike Meta there is NO OAuth and NO login popup: Google itself POSTs each
// lead to our public webhook. The UI only has to (1) let the user build a field
// mapping + pick a target table, (2) hand them a `google_key` + `webhook_url` to
// paste into Google Ads, and (3) help them verify a test lead landed.
//
// All endpoints live on the gateway under `/v1/google-leads`. On a project page
// the shared `api` request interceptor authenticates them with the project-scoped
// API-KEY (Authorization: API-KEY + x-api-key) automatically — same as every
// other project resource call — so the project / environment / resource are
// derived from the key and we don't send them ourselves.
// ─────────────────────────────────────────────────────────────────────────────

/** A standard Google lead-form field (left side of the mapping). */
export interface GoogleAdsColumn {
  /** Google `column_id`, e.g. "FULL_NAME", "EMAIL", "PHONE_NUMBER". */
  column_id: string;
  /** Human-readable label for the dropdown. */
  label: string;
}

/** One row of the field mapping: Google form field → project table column. */
export interface GoogleAdsFieldMapping {
  /** Google `column_id` (standard from /columns or a custom question). */
  lead_column: string;
  /** Column slug in the target project table. */
  table_field: string;
  /** If true and the lead value is empty, the lead is not written. */
  required: boolean;
}

/** A saved Google Lead Ads connection (one per integrations[] entry). */
export interface GoogleAdsIntegration {
  connected: boolean;
  /** Connection id — used for PUT /mapping/:id and DELETE /integration/:id. */
  resource_id: string;
  /** The secret the user pastes into Google Ads (regenerated only on create). */
  google_key: string;
  /** Public webhook URL the user pastes into Google Ads. */
  webhook_url: string;
  /** Restrict to a single Google lead form, or empty for "any form". */
  form_id: string;
  /** Display name of the connection. */
  form_name: string;
  /** Target project table the leads are written to. */
  table_slug: string;
  /** e.g. "active". */
  status: string;
  /** RFC3339 timestamp. */
  connected_at: string;
  fields: GoogleAdsFieldMapping[];
}

export interface GoogleAdsIntegrationList {
  connected: boolean;
  integrations: GoogleAdsIntegration[];
}

export interface GoogleAdsConnectionPayload {
  form_id?: string;
  form_name?: string;
  table_slug: string;
  fields: GoogleAdsFieldMapping[];
}

/** Returned by POST /v1/google-leads — the two strings shown to the user. */
export interface GoogleAdsCreateResult {
  resource_id: string;
  google_key: string;
  webhook_url: string;
}

// Standard column_ids per the integration spec. Used as a resilient fallback so
// the mapping UI still works if GET /columns is unavailable (the list is static).
export const GOOGLE_ADS_FALLBACK_COLUMNS: GoogleAdsColumn[] = [
  { column_id: "FULL_NAME", label: "Full name" },
  { column_id: "FIRST_NAME", label: "First name" },
  { column_id: "LAST_NAME", label: "Last name" },
  { column_id: "EMAIL", label: "Email" },
  { column_id: "PHONE_NUMBER", label: "Phone number" },
  { column_id: "WORK_EMAIL", label: "Work email" },
  { column_id: "WORK_PHONE", label: "Work phone" },
  { column_id: "COMPANY_NAME", label: "Company name" },
  { column_id: "JOB_TITLE", label: "Job title" },
  { column_id: "STREET_ADDRESS", label: "Street address" },
  { column_id: "CITY", label: "City" },
  { column_id: "REGION", label: "Region" },
  { column_id: "POSTAL_CODE", label: "Postal code" },
  { column_id: "COUNTRY", label: "Country" },
];

/**
 * Pull a human-readable error out of the gateway envelope. On failure the
 * envelope's `data` is a plain string, so prefer that, then custom_message.
 */
export const getGoogleAdsErrorMessage = (err: unknown, fallback: string): string => {
  const envelope = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (envelope) {
    if (typeof envelope.data === "string" && envelope.data) return envelope.data;
    if (typeof envelope.custom_message === "string" && envelope.custom_message)
      return envelope.custom_message;
  }
  const message = (err as { message?: string })?.message;
  return message || fallback;
};

export const googleAdsIntegrationApi = {
  /** Standard column_ids for the mapping dropdown. Falls back to the static list. */
  getColumns: async (): Promise<GoogleAdsColumn[]> => {
    try {
      const { data } = await api.get("/v1/google-leads/columns");
      const columns = data?.data?.columns;
      return Array.isArray(columns) && columns.length > 0
        ? columns
        : GOOGLE_ADS_FALLBACK_COLUMNS;
    } catch {
      return GOOGLE_ADS_FALLBACK_COLUMNS;
    }
  },

  /** All Google Lead Ads connections for the current project/environment. */
  getIntegration: async (): Promise<GoogleAdsIntegrationList> => {
    const { data } = await api.get("/v1/google-leads/integration");
    const payload = data?.data ?? {};
    const integrations = Array.isArray(payload.integrations) ? payload.integrations : [];
    return { connected: !!payload.connected, integrations };
  },

  /** Create a connection — returns google_key + webhook_url to paste into Google Ads. */
  createConnection: async (
    payload: GoogleAdsConnectionPayload,
  ): Promise<GoogleAdsCreateResult> => {
    const { data } = await api.post("/v1/google-leads", payload);
    return data?.data as GoogleAdsCreateResult;
  },

  /** Update an existing connection's table/mapping. The key/webhook are unchanged. */
  updateMapping: async (
    id: string,
    payload: GoogleAdsConnectionPayload,
  ): Promise<{ resource_id: string }> => {
    const { data } = await api.put(`/v1/google-leads/mapping/${id}`, payload);
    return data?.data;
  },

  /** Remove a connection. Leads stop being routed to the project. */
  disconnect: async (id: string): Promise<{ resource_id: string }> => {
    const { data } = await api.delete(`/v1/google-leads/integration/${id}`);
    return data?.data;
  },
};
