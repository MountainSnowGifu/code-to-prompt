import { invoke } from "@tauri-apps/api/core";
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
