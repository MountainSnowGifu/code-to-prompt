import { useState } from "react";
import {
  exportDiff,
  exportFilteredTree,
  exportSource,
  getDiff,
  getFileTree,
  revealEntryNamesFile,
} from "../api/entryApi";

function toErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

export function useEntryNames() {
  const [path, setPath] = useState("");
  const [scannedPath, setScannedPath] = useState("");
  const [entries, setEntries] = useState<string[]>([]);
  const [diffContent, setDiffContent] = useState("");
  const [savedFilePaths, setSavedFilePaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDiffLoading, setIsDiffLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function scanEntries() {
    setIsLoading(true);
    setErrorMessage("");
    setSavedFilePaths([]);

    try {
      const tree = await getFileTree(path);
      setEntries(tree);
      setScannedPath(path);
    } catch (err) {
      setErrorMessage(toErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchDiff() {
    setIsDiffLoading(true);
    setErrorMessage("");
    setSavedFilePaths([]);

    try {
      const diff = await getDiff(path);
      setDiffContent(diff);
      setScannedPath(path);
    } catch (err) {
      setErrorMessage(toErrorMessage(err));
    } finally {
      setIsDiffLoading(false);
    }
  }

  async function downloadEntries(paths: string[]) {
    setIsExporting(true);
    setErrorMessage("");
    setSavedFilePaths([]);

    try {
      const outputPath = await exportFilteredTree(scannedPath, paths);
      setSavedFilePaths([outputPath]);
    } catch (err) {
      setErrorMessage(toErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  }

  async function downloadSource(paths: string[]) {
    setIsExporting(true);
    setErrorMessage("");
    setSavedFilePaths([]);

    try {
      const outputPaths = await exportSource(scannedPath, paths);
      setSavedFilePaths(outputPaths);
    } catch (err) {
      setErrorMessage(toErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  }

  async function downloadDiff() {
    setIsExporting(true);
    setErrorMessage("");
    setSavedFilePaths([]);

    try {
      const result = await exportDiff(scannedPath);
      setDiffContent(result.content);
      setSavedFilePaths([result.output_path]);
    } catch (err) {
      setErrorMessage(toErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  }

  async function openSavedFileFolder() {
    if (savedFilePaths.length === 0) return;
    try {
      await revealEntryNamesFile(savedFilePaths[0]);
    } catch (err) {
      setErrorMessage(toErrorMessage(err));
    }
  }

  function clearErrorMessage() {
    setErrorMessage("");
  }

  return {
    path,
    setPath,
    scannedPath,
    entries,
    diffContent,
    savedFilePaths,
    isLoading,
    isDiffLoading,
    isExporting,
    errorMessage,
    scanEntries,
    fetchDiff,
    downloadEntries,
    downloadSource,
    downloadDiff,
    openSavedFileFolder,
    clearErrorMessage,
  };
}
