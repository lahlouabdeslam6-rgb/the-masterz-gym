import createClient from "openapi-fetch";

import type { paths } from "./schema";

export type { components, operations, paths } from "./schema";

export function createMasterzClient(baseUrl: string) {
  return createClient<paths>({ baseUrl });
}
