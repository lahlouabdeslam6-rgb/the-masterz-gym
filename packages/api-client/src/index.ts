import createClient, { type ClientOptions } from "openapi-fetch";

import type { paths } from "./schema";

export type { components, operations, paths } from "./schema";

export function createMasterzClient(
  baseUrl: string,
  options: Omit<ClientOptions, "baseUrl"> = {},
) {
  return createClient<paths>({ ...options, baseUrl });
}
