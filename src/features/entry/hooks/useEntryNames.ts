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
  const [savedFilePath, setSavedFilePath] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDiffLoading, setIsDiffLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function scanEntries() {
    setIsLoading(true);
    setErrorMessage("");
    setSavedFilePath("");

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
    setSavedFilePath("");

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
    setSavedFilePath("");

    try {
      const outputPath = await exportFilteredTree(scannedPath, paths);
      setSavedFilePath(outputPath);
    } catch (err) {
      setErrorMessage(toErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  }

  async function downloadSource(paths: string[]) {
    setIsExporting(true);
    setErrorMessage("");
    setSavedFilePath("");

    try {
      const outputPath = await exportSource(scannedPath, paths);
      setSavedFilePath(outputPath);
    } catch (err) {
      setErrorMessage(toErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  }

  async function downloadDiff() {
    setIsExporting(true);
    setErrorMessage("");
    setSavedFilePath("");

    try {
      const result = await exportDiff(scannedPath);
      setDiffContent(result.content);
      setSavedFilePath(result.output_path);
    } catch (err) {
      setErrorMessage(toErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  }

  async function openSavedFileFolder() {
    try {
      await revealEntryNamesFile(savedFilePath);
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
    savedFilePath,
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
