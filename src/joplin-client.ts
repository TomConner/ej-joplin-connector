/**
 * Joplin API client with authentication and error handling
 */

import axios, { AxiosError, AxiosInstance } from "axios";
import { DEFAULT_JOPLIN_PORT, JOPLIN_PORT_RANGE, REQUEST_TIMEOUT } from "./constants.js";

export class JoplinClient {
  private client: AxiosInstance;
  private token: string;
  private baseUrl: string;

  constructor(token: string, port?: number, baseUrl?: string) {
    this.token = token;

    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else if (port) {
      this.baseUrl = `http://localhost:${port}`;
    } else {
      this.baseUrl = `http://localhost:${DEFAULT_JOPLIN_PORT}`;
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: REQUEST_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
  }

  /**
   * Find the Joplin service by testing ports
   */
  static async findJoplinService(token: string): Promise<JoplinClient> {
    for (const port of JOPLIN_PORT_RANGE) {
      try {
        const client = new JoplinClient(token, port);
        await client.ping();
        return client;
      } catch {
        // Try next port
      }
    }
    throw new Error(`Could not find Joplin service on ports ${JOPLIN_PORT_RANGE.join(', ')}. Is Joplin running with Web Clipper enabled?`);
  }

  /**
   * Check if the service is available
   */
  async ping(): Promise<string> {
    try {
      const response = await this.client.get('/ping', {
        params: { token: this.token }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * GET request with token
   */
  async get<T>(endpoint: string, params?: any): Promise<T> {
    try {
      const response = await this.client.get<T>(endpoint, {
        params: {
          token: this.token,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * POST request with token
   */
  async post<T>(endpoint: string, data?: any, params?: any): Promise<T> {
    try {
      const response = await this.client.post<T>(endpoint, data, {
        params: {
          token: this.token,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * PUT request with token
   */
  async put<T>(endpoint: string, data?: any, params?: any): Promise<T> {
    try {
      const response = await this.client.put<T>(endpoint, data, {
        params: {
          token: this.token,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * DELETE request with token
   */
  async delete<T>(endpoint: string, params?: any): Promise<T> {
    try {
      const response = await this.client.delete<T>(endpoint, {
        params: {
          token: this.token,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors with user-friendly messages
   */
  private handleError(error: unknown): Error {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data as any;
        const errorMsg = data?.error || data?.message || error.message;

        switch (status) {
          case 400:
            return new Error(`Bad request: ${errorMsg}`);
          case 401:
          case 403:
            return new Error(`Authentication failed. Please check your Joplin API token. Error: ${errorMsg}`);
          case 404:
            return new Error(`Resource not found: ${errorMsg}`);
          case 429:
            return new Error(`Rate limit exceeded. Please wait before retrying.`);
          case 500:
            return new Error(`Joplin server error: ${errorMsg}`);
          default:
            return new Error(`API error (${status}): ${errorMsg}`);
        }
      } else if (error.code === "ECONNREFUSED") {
        return new Error(`Cannot connect to Joplin service at ${this.baseUrl}. Is Joplin running with Web Clipper enabled?`);
      } else if (error.code === "ECONNABORTED") {
        return new Error(`Request timed out. Joplin service may be unresponsive.`);
      }
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(`Unexpected error: ${String(error)}`);
  }
}
