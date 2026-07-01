import axios, { AxiosError, AxiosInstance } from "axios";
import { JOPLIN_PORT_RANGE, REQUEST_TIMEOUT } from "./constants.js";

export class JoplinClient {
  private axiosInstance: AxiosInstance | null = null;
  private connectedUrl: string | null = null;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
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
        await instance.get("/ping", { params: { token: this.token } });
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

  async ping(): Promise<string> {
    const client = await this.getClient();
    const response = await client.get("/ping", { params: { token: this.token } });
    return response.data as string;
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    try {
      const client = await this.getClient();
      const response = await client.get<T>(endpoint, { params: { token: this.token, ...params } });
      return response.data;
    } catch (error) {
      if (this.isConnectionError(error)) this.resetConnection();
      throw this.handleError(error);
    }
  }

  async post<T>(endpoint: string, data?: unknown, params?: Record<string, unknown>): Promise<T> {
    try {
      const client = await this.getClient();
      const response = await client.post<T>(endpoint, data, { params: { token: this.token, ...params } });
      return response.data;
    } catch (error) {
      if (this.isConnectionError(error)) this.resetConnection();
      throw this.handleError(error);
    }
  }

  async put<T>(endpoint: string, data?: unknown, params?: Record<string, unknown>): Promise<T> {
    try {
      const client = await this.getClient();
      const response = await client.put<T>(endpoint, data, { params: { token: this.token, ...params } });
      return response.data;
    } catch (error) {
      if (this.isConnectionError(error)) this.resetConnection();
      throw this.handleError(error);
    }
  }

  async delete<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    try {
      const client = await this.getClient();
      const response = await client.delete<T>(endpoint, { params: { token: this.token, ...params } });
      return response.data;
    } catch (error) {
      if (this.isConnectionError(error)) this.resetConnection();
      throw this.handleError(error);
    }
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
          case 403: return new Error(`Authentication failed. Check your Joplin API token. (${errorMsg})`);
          case 404: return new Error(`Resource not found: ${errorMsg}`);
          case 429: return new Error(`Rate limit exceeded. Wait a moment before retrying.`);
          case 500: return new Error(`Joplin server error: ${errorMsg}`);
          default:  return new Error(`API error (${status}): ${errorMsg}`);
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
