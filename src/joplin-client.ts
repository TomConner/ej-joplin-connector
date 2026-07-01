import axios, { AxiosError, AxiosInstance } from "axios";
import { JOPLIN_PORT_RANGE, REQUEST_TIMEOUT } from "./constants.js";
import { clearCachedToken, loadCachedToken, saveToken } from "./token-store.js";

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class JoplinClient {
  private axiosInstance: AxiosInstance | null = null;
  private connectedUrl: string | null = null;
  private token: string | null;
  private readonly isOverrideToken: boolean;
  private authPromise: Promise<void> | null = null;

  constructor(overrideToken?: string) {
    if (overrideToken) {
      this.token = overrideToken;
      this.isOverrideToken = true;
    } else {
      this.token = loadCachedToken();
      this.isOverrideToken = false;
    }
  }

  private async connect(): Promise<AxiosInstance> {
    for (const port of JOPLIN_PORT_RANGE) {
      const url = `http://localhost:${port}`;
      try {
        const instance = axios.create({
          baseURL: url,
          timeout: REQUEST_TIMEOUT,
          headers: { "Content-Type": "application/json", "Accept": "application/json" }
        });
        await instance.get("/ping");
        this.axiosInstance = instance;
        this.connectedUrl = url;
        return instance;
      } catch {
        // try next port
      }
    }
    throw new Error(
      `Cannot find Joplin on ports ${JOPLIN_PORT_RANGE[0]}–${JOPLIN_PORT_RANGE[JOPLIN_PORT_RANGE.length - 1]}. ` +
      `Make sure Joplin is running with Web Clipper enabled (Tools > Options > Web Clipper).`
    );
  }

  private async getClient(): Promise<AxiosInstance> {
    if (this.axiosInstance) return this.axiosInstance;
    return this.connect();
  }

  private resetConnection(): void {
    this.axiosInstance = null;
    this.connectedUrl = null;
  }

  private isConnectionError(error: unknown): boolean {
    return (
      error instanceof AxiosError &&
      (error.code === "ECONNREFUSED" || error.code === "ECONNABORTED" || error.code === "ENOTFOUND")
    );
  }

  private isAuthError(error: unknown): boolean {
    return error instanceof AxiosError && (error.response?.status === 401 || error.response?.status === 403);
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.authPromise) {
      this.authPromise = this.authenticate().finally(() => {
        this.authPromise = null;
      });
    }
    return this.authPromise;
  }

  private async authenticate(): Promise<void> {
    const client = await this.getClient();
    process.stderr.write(
      "Joplin authorization required.\n" +
      "Open Joplin — a permission prompt will appear. Click \"Grant authorization\" to continue.\n"
    );

    const authResponse = await client.post<{ auth_token: string }>("/auth");
    const authToken = authResponse.data.auth_token;

    const POLL_INTERVAL_MS = 2000;
    const TIMEOUT_MS = 5 * 60 * 1000;
    const deadline = Date.now() + TIMEOUT_MS;

    while (true) {
      if (Date.now() > deadline) {
        throw new Error(
          "Timed out waiting for Joplin authorization (5 minutes). " +
          "Open Joplin, make sure it's running, and try the tool again."
        );
      }
      await sleep(POLL_INTERVAL_MS);

      let check;
      try {
        check = await client.get<{ status: string; token?: string }>("/auth/check", {
          params: { auth_token: authToken }
        });
      } catch (error) {
        if (this.isConnectionError(error)) {
          this.resetConnection();
          throw new Error(
            "Lost connection to Joplin while waiting for authorization. " +
            "Make sure Joplin stays open and try again."
          );
        }
        throw error;
      }

      if (check.data.status === "accepted") {
        if (!check.data.token) throw new Error("Joplin accepted the authorization request but returned no token.");
        this.token = check.data.token;
        saveToken(this.token);
        process.stderr.write("Joplin authorization granted.\n");
        return;
      }
      if (check.data.status === "rejected") {
        throw new Error("Joplin authorization was rejected. Run the tool again to retry.");
      }
      // status === "waiting" → keep polling
    }
  }

  private async request<T>(
    method: "get" | "post" | "put" | "delete",
    endpoint: string,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    const client = await this.getClient();

    if (this.token === null) {
      await this.ensureAuthenticated();
    }

    try {
      const response = await client.request<T>({
        method,
        url: endpoint,
        data,
        params: { token: this.token, ...params }
      });
      return response.data;
    } catch (error) {
      if (this.isConnectionError(error)) this.resetConnection();

      if (this.isAuthError(error)) {
        if (this.isOverrideToken) {
          throw new Error(
            "Your JOPLIN_API_TOKEN is invalid or expired. " +
            "Unset JOPLIN_API_TOKEN to use automatic authorization instead."
          );
        }
        clearCachedToken();
        this.token = null;
        await this.ensureAuthenticated();
        const retryClient = await this.getClient();
        const retryResponse = await retryClient.request<T>({
          method,
          url: endpoint,
          data,
          params: { token: this.token, ...params }
        });
        return retryResponse.data;
      }
      throw this.handleError(error);
    }
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>("get", endpoint, undefined, params);
  }

  async post<T>(endpoint: string, data?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>("post", endpoint, data, params);
  }

  async put<T>(endpoint: string, data?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>("put", endpoint, data, params);
  }

  async delete<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>("delete", endpoint, undefined, params);
  }

  private handleError(error: unknown): Error {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data as Record<string, unknown> | undefined;
        const errorMsg = (data?.error as string) || (data?.message as string) || error.message;
        switch (status) {
          case 400: return new Error(`Bad request: ${errorMsg}`);
          case 401:
          case 403: return new Error(`Authentication failed (${errorMsg})`);
          case 404: return new Error(`Resource not found: ${errorMsg}`);
          case 429: return new Error(`Rate limit exceeded. Wait a moment before retrying.`);
          case 500: return new Error(`Joplin server error: ${errorMsg}`);
          default: return new Error(`API error (${status}): ${errorMsg}`);
        }
      }
      if (error.code === "ECONNREFUSED") {
        const at = this.connectedUrl ? ` at ${this.connectedUrl}` : "";
        return new Error(`Cannot connect to Joplin${at}. Is Joplin running with Web Clipper enabled?`);
      }
      if (error.code === "ECONNABORTED") {
        return new Error(`Request timed out. Joplin may be unresponsive.`);
      }
    }
    if (error instanceof Error) return error;
    return new Error(`Unexpected error: ${String(error)}`);
  }
}
