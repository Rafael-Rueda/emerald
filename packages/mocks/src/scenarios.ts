/**
 * Scenario types and utilities for MSW handler configuration.
 *
 * Each handler can be configured to return different scenarios:
 * - success: returns valid fixture data
 * - loading: infinite delay (for testing loading states)
 * - error: returns a 500 server error
 * - not-found: returns a 404
 * - malformed: returns data that does not match the Zod schema
 */

export type Scenario =
  | "success"
  | "loading"
  | "error"
  | "not-found"
  | "malformed";

export interface ScenarioConfig {
  /** Default scenario for public document requests. */
  document?: Scenario;
  /** Default scenario for navigation tree requests. */
  navigation?: Scenario;
  /** Default scenario for version list requests. */
  versions?: Scenario;
  /** Default scenario for search requests. */
  search?: Scenario;
  /** Default scenario for AI context requests. */
  aiContext?: Scenario;
  /** Default scenario for workspace document list requests. */
  workspaceDocuments?: Scenario;
  /** Default scenario for workspace navigation list requests. */
  workspaceNavigation?: Scenario;
  /** Default scenario for workspace version list requests. */
  workspaceVersions?: Scenario;
  /** Default scenario for workspace mutation requests. */
  workspaceMutation?: Scenario;
}

export const defaultScenarios: Required<ScenarioConfig> = {
  document: "success",
  navigation: "success",
  versions: "success",
  search: "success",
  aiContext: "success",
  workspaceDocuments: "success",
  workspaceNavigation: "success",
  workspaceVersions: "success",
  workspaceMutation: "success",
};

/**
 * Merge user config with defaults.
 */
export function resolveScenarios(
  config: ScenarioConfig = {},
): Required<ScenarioConfig> {
  return { ...defaultScenarios, ...config };
}
