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
};
