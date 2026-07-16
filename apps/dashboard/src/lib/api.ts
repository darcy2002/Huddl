import type {
  Summary,
  CreateSummaryInput,
  UpdateSummaryInput,
  ContextResponse,
  MasterContext,
} from "@huddl/shared";
import { SERVER_URL } from "./auth-client";

/** Thrown for any non-2xx response. `status` lets callers special-case 401. */
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    // Session expired / not logged in — bounce to login.
    if (window.location.pathname !== "/login") window.location.assign("/login");
    throw new ApiError(401, "unauthorized", null);
  }

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${res.statusText}`, body);
  }
  return body as T;
}

export const api = {
  listSummaries: () => request<Summary[]>("/summaries"),
  createSummary: (input: CreateSummaryInput) =>
    request<Summary>("/summaries", { method: "POST", body: JSON.stringify(input) }),
  updateSummary: (id: string, input: UpdateSummaryInput) =>
    request<Summary>(`/summaries/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteSummary: (id: string) =>
    request<{ ok: true }>(`/summaries/${id}`, { method: "DELETE" }),

  getContext: () => request<ContextResponse>("/context"),
  recompile: () =>
    request<MasterContext | { skipped: true; reason: string }>("/compile", { method: "POST" }),
};
