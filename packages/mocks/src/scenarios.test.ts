import { describe, it, expect } from "vitest";
import {
  defaultScenarios,
  resolveScenarios,
  type Scenario,
  type ScenarioConfig,
} from "./scenarios";

describe("Scenarios", () => {
  it("provides defaults for all scenario keys", () => {
    const keys: (keyof ScenarioConfig)[] = [
      "document",
      "navigation",
      "versions",
      "search",
      "aiContext",
      "workspaceDocuments",
      "workspaceNavigation",
      "workspaceVersions",
      "workspaceMutation",
    ];

    for (const key of keys) {
      expect(defaultScenarios[key]).toBeDefined();
      expect(defaultScenarios[key]).toBe("success");
    }
  });

  it("resolveScenarios returns all defaults when called with empty config", () => {
    const resolved = resolveScenarios({});
    expect(resolved).toEqual(defaultScenarios);
  });

  it("resolveScenarios returns all defaults when called with no argument", () => {
    const resolved = resolveScenarios();
    expect(resolved).toEqual(defaultScenarios);
  });

  it("resolveScenarios overrides specified keys", () => {
    const resolved = resolveScenarios({
      document: "error",
      search: "loading",
    });
    expect(resolved.document).toBe("error");
    expect(resolved.search).toBe("loading");
    expect(resolved.navigation).toBe("success");
  });

  it("supports all scenario types", () => {
    const scenarios: Scenario[] = [
      "success",
      "loading",
      "error",
      "not-found",
      "malformed",
    ];
    for (const s of scenarios) {
      const resolved = resolveScenarios({ document: s });
      expect(resolved.document).toBe(s);
    }
  });
});
