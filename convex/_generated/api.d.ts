/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as budgets from "../budgets.js";
import type * as clients from "../clients.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as demo from "../demo.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as lib from "../lib.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  ai: typeof ai;
  auth: typeof auth;
  budgets: typeof budgets;
  clients: typeof clients;
  constants: typeof constants;
  crons: typeof crons;
  demo: typeof demo;
  goals: typeof goals;
  http: typeof http;
  lib: typeof lib;
  transactions: typeof transactions;
  users: typeof users;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
