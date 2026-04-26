import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

export function invokeCommand<TResponse>(
  command: string,
  args?: Record<string, unknown>,
) {
  return invoke<TResponse>(command, args);
}

export function revealPathInFileManager(path: string) {
  return revealItemInDir(path);
}

export async function pickFolder(): Promise<string | null> {
  const result = await open({ directory: true, multiple: false });
  if (!result) return null;
  return typeof result === "string" ? result : result[0] ?? null;
}
