import { api } from "@/shared/api";
import { useAuthStore } from "@/entities/session";

export interface MetaAdsStatus {
  connected: boolean;
  active: boolean;
  expires_at: number;
  reason: string;
}

export interface MetaAdsPage {
  id: string;
  name: string;
}

export interface MetaAdsIntegrationFieldMapping {
  lead_field: string;
  table_field: string;
  required?: boolean;
}

export interface MetaAdsIntegrationFormMapping {
  form_id: string;
  form_name?: string;
  table_slug: string;
  fields: MetaAdsIntegrationFieldMapping[];
}

export interface MetaAdsIntegration {
  connected: boolean;
  resource_id: string;
  page_id: string;
  page_name: string;
  status: "active" | "revoked" | "error" | string;
  connected_at: string;
  forms: MetaAdsIntegrationFormMapping[];
}

export interface MetaAdsLeadForm {
  id: string;
  name: string;
  status?: string;
  locale?: string;
}

export interface MetaAdsLeadQuestionOption {
  key: string;
  value: string;
}

export interface MetaAdsLeadQuestion {
  key: string;
  label: string;
  type: string;
  options?: MetaAdsLeadQuestionOption[];
}

export interface MetaAdsLeadFormQuestions extends MetaAdsLeadForm {
  questions: MetaAdsLeadQuestion[];
}

export interface MetaAdsIntegrationList {
  connected: boolean;
  integrations: MetaAdsIntegration[];
}

export interface MetaAdsMappingPayload {
  page_id: string;
  forms: MetaAdsIntegrationFormMapping[];
}

type GatewayEnvelope<T> = {
  status?: string;
  description?: string;
  data?: T | string;
  custom_message?: string | null;
};

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

const getMetaHeaders = () => {
  const { accessToken, projectEnvId, project, resourceEnvId } =
    useAuthStore.getState();
  const headers: Record<string, string> = {};

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const environmentId = projectEnvId ?? project?.environment_id ?? "";
  if (environmentId) headers["Environment-Id"] = environmentId;
  if (resourceEnvId) headers["Resource-Id"] = resourceEnvId;

  return headers;
};

const unwrapGatewayData = <T>(payload: unknown, fallbackMessage: string): T => {
  if (payload && typeof payload === "object" && "status" in payload) {
    const envelope = payload as GatewayEnvelope<T>;
    if (envelope.status && envelope.status !== "OK") {
      throw new Error(
        (typeof envelope.data === "string" && envelope.data) ||
          envelope.custom_message ||
          envelope.description ||
          fallbackMessage,
      );
    }
    return envelope.data as T;
  }

  return payload as T;
};

export const metaAdsIntegrationApi = {
  getConnectUrl: async (redirectUri?: string): Promise<string> => {
    const { data } = await api.get("/v1/facebook/connect", {
      params: redirectUri ? { redirect_uri: redirectUri } : undefined,
      headers: getMetaHeaders(),
    });

    const payload = unwrapGatewayData<unknown>(
      data,
      "Meta Ads connect endpoint failed",
    );
    const url = readConnectUrl(payload);
    if (!url) {
      throw new Error("Meta Ads connect endpoint returned no OAuth URL");
    }
    return url;
  },

  getStatus: async (): Promise<MetaAdsStatus> => {
    const { data } = await api.get("/v1/facebook/status", {
      headers: getMetaHeaders(),
    });
    return unwrapGatewayData<MetaAdsStatus>(
      data,
      "Failed to load Meta Ads status",
    );
  },

  getPages: async (): Promise<MetaAdsPage[]> => {
    const { data } = await api.get("/v1/facebook/pages", {
      headers: getMetaHeaders(),
    });
    const payload = unwrapGatewayData<unknown>(
      data,
      "Failed to load Meta pages",
    );
    if (Array.isArray(payload)) return payload as MetaAdsPage[];
    if (!payload || typeof payload !== "object") return [];

    const body = payload as Record<string, unknown>;
    if (Array.isArray(body.pages)) return body.pages as MetaAdsPage[];
    if (Array.isArray(body.data)) return body.data as MetaAdsPage[];
    return [];
  },

  subscribePage: async (page: {
    page_id: string;
    page_name?: string;
  }): Promise<{ resource_id: string; page_id: string }> => {
    const { data } = await api.post("/v1/facebook/subscribe", page, {
      headers: getMetaHeaders(),
    });
    return unwrapGatewayData<{ resource_id: string; page_id: string }>(
      data,
      "Failed to subscribe Meta page",
    );
  },

  getIntegration: async (): Promise<MetaAdsIntegrationList> => {
    const { data } = await api.get("/v1/facebook/integration", {
      headers: getMetaHeaders(),
    });
    const payload = unwrapGatewayData<Partial<MetaAdsIntegrationList>>(
      data,
      "Failed to load Meta Ads integrations",
    );
    return {
      connected: payload?.connected ?? false,
      integrations: payload?.integrations ?? [],
    };
  },

  getPageForms: async (pageId: string): Promise<MetaAdsLeadForm[]> => {
    const { data } = await api.get(`/v1/facebook/pages/${pageId}/forms`, {
      headers: getMetaHeaders(),
    });
    const payload = unwrapGatewayData<unknown>(
      data,
      "Failed to load Meta lead forms",
    );
    if (Array.isArray(payload)) return payload as MetaAdsLeadForm[];
    if (!payload || typeof payload !== "object") return [];

    const body = payload as Record<string, unknown>;
    if (Array.isArray(body.forms)) return body.forms as MetaAdsLeadForm[];
    if (Array.isArray(body.lead_forms))
      return body.lead_forms as MetaAdsLeadForm[];
    if (Array.isArray(body.data)) return body.data as MetaAdsLeadForm[];
    return [];
  },

  getFormQuestions: async (
    pageId: string,
    formId: string,
  ): Promise<MetaAdsLeadFormQuestions> => {
    const { data } = await api.get(`/v1/facebook/forms/${formId}/questions`, {
      params: { page_id: pageId },
      headers: getMetaHeaders(),
    });
    const payload = unwrapGatewayData<unknown>(
      data,
      "Failed to load Meta lead form fields",
    );
    if (Array.isArray(payload)) {
      return {
        id: formId,
        name: formId,
        questions: payload as MetaAdsLeadQuestion[],
      };
    }
    if (!payload || typeof payload !== "object") {
      return { id: formId, name: formId, questions: [] };
    }

    const body = payload as Record<string, unknown>;
    if (Array.isArray(body.questions)) {
      return body as unknown as MetaAdsLeadFormQuestions;
    }
    if (body.data && typeof body.data === "object") {
      const nested = body.data as Record<string, unknown>;
      if (Array.isArray(nested.questions)) {
        return nested as unknown as MetaAdsLeadFormQuestions;
      }
    }
    return { id: formId, name: String(body.name ?? formId), questions: [] };
  },

  saveMapping: async (
    payload: MetaAdsMappingPayload,
  ): Promise<{ resource_id: string }> => {
    const { data } = await api.put("/v1/facebook/mapping", payload, {
      headers: getMetaHeaders(),
    });
    return unwrapGatewayData<{ resource_id: string }>(
      data,
      "Failed to save Meta Ads mapping",
    );
  },

  disconnect: async (resourceId: string): Promise<{ resource_id: string }> => {
    const { data } = await api.delete(
      `/v1/facebook/integration/${resourceId}`,
      {
        headers: getMetaHeaders(),
      },
    );
    return unwrapGatewayData<{ resource_id: string }>(
      data,
      "Failed to disconnect Meta Ads page",
    );
  },
};
