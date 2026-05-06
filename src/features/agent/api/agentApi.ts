import { invokeCommand } from "../../../shared/lib/tauri";
import type { ActionResult } from "../types/agent";

export function initAgentWorkspace() {
  return invokeCommand<string>("init_agent_workspace");
}

export function executeJson(json: string, baseDir?: string) {
  return invokeCommand<ActionResult[]>("execute_json_command", {
    json,
    baseDir: baseDir || null,
  });
}
