import { createMasterzClient } from "@masterz/api-client";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export const api = createMasterzClient(baseUrl);
