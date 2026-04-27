import { invokeCommand, revealPathInFileManager } from "../../../shared/lib/tauri";
import type {
  ExportDiffResponse,
  ExportEntryNamesResponse,
  ExportSourceResponse,
  SourceTextResponse,
} from "../types/entry";

const GET_ENTRY_NAMES_COMMAND = "get_entry_names_command";
const EXPORT_ENTRY_NAMES_COMMAND = "export_entry_names_command";
const GET_FILE_TREE_COMMAND = "get_file_tree_command";
const EXPORT_FILE_TREE_COMMAND = "export_file_tree_command";

export function getEntryNames(path: string) {
  return invokeCommand<string[]>(GET_ENTRY_NAMES_COMMAND, { path });
}

export function exportEntryNames(path: string) {
  return invokeCommand<ExportEntryNamesResponse>(EXPORT_ENTRY_NAMES_COMMAND, {
    path,
  });
}

export function getFileTree(path: string) {
  return invokeCommand<string[]>(GET_FILE_TREE_COMMAND, { path });
}

export function exportFileTree(path: string) {
  return invokeCommand<ExportEntryNamesResponse>(EXPORT_FILE_TREE_COMMAND, { path });
}

export function getDiff(path: string) {
  return invokeCommand<string>("get_diff_command", { path });
}

export function exportDiff(path: string) {
  return invokeCommand<ExportDiffResponse>("export_diff_command", { path });
}

export function exportFilteredTree(path: string, paths: string[]) {
  return invokeCommand<string>("export_filtered_tree_command", { path, paths });
}

export function exportSource(path: string, paths: string[]) {
  return invokeCommand<ExportSourceResponse>("export_source_command", { path, paths });
}

export function getSourceText(path: string, paths: string[]) {
  return invokeCommand<SourceTextResponse>("get_source_text_command", { path, paths });
}

export function countSourceChars(path: string, paths: string[]) {
  return invokeCommand<number>("count_source_chars_command", { path, paths });
}

export function revealEntryNamesFile(path: string) {
  return revealPathInFileManager(path);
}
