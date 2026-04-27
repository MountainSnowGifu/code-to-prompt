import { useRef, useState } from "react";
import {
  exportDiff,
  exportFilteredTree,
  exportSource,
  getDiff,
  getFileTree,
  revealEntryNamesFile,
} from "../api/entryApi";
import { toEntryErrorMessage } from "../lib/errorMessage";

export function useEntryNames() {
  const [path, setPath] = useState("");
  const [scannedPath, setScannedPath] = useState("");
  const [entries, setEntries] = useState<string[]>([]);
  const [diffContent, setDiffContent] = useState("");
  const [savedFilePaths, setSavedFilePaths] = useState<string[]>([]);
  const [skippedSourcePaths, setSkippedSourcePaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDiffLoading, setIsDiffLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const requestIdRef = useRef(0);

  function updatePath(nextPath: string) {
    requestIdRef.current += 1;
    setPath(nextPath);
    setScannedPath("");
    setEntries([]);
    setDiffContent("");
    setSavedFilePaths([]);
    setSkippedSourcePaths([]);
    setIsLoading(false);
    setIsDiffLoading(false);
    setIsExporting(false);
    setErrorMessage("");
  }

  async function scanEntries(nextPath?: string) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const requestedPath = nextPath ?? path;
    setIsLoading(true);
    setErrorMessage("");
    setSavedFilePaths([]);
    setSkippedSourcePaths([]);

    try {
      const tree = await getFileTree(requestedPath);
      if (requestIdRef.current !== requestId) return;
      setEntries(tree);
      setScannedPath(requestedPath);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setErrorMessage(toEntryErrorMessage(err));
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }

  async function fetchDiff() {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const requestedPath = path;
    setIsDiffLoading(true);
    setErrorMessage("");
    setSavedFilePaths([]);
    setSkippedSourcePaths([]);

    try {
      const diff = await getDiff(requestedPath);
      if (requestIdRef.current !== requestId) return;
      setDiffContent(diff);
      setScannedPath(requestedPath);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setErrorMessage(toEntryErrorMessage(err));
    } finally {
      if (requestIdRef.current === requestId) setIsDiffLoading(false);
    }
  }

  async function downloadEntries(paths: string[]) {
    const requestId = requestIdRef.current;
    setIsExporting(true);
    setErrorMessage("");
    setSavedFilePaths([]);
    setSkippedSourcePaths([]);

    try {
      const outputPath = await exportFilteredTree(scannedPath, paths);
      if (requestIdRef.current !== requestId) return;
      setSavedFilePaths([outputPath]);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setErrorMessage(toEntryErrorMessage(err));
    } finally {
      if (requestIdRef.current === requestId) setIsExporting(false);
    }
  }

  async function downloadSource(paths: string[]) {
    const requestId = requestIdRef.current;
    setIsExporting(true);
    setErrorMessage("");
    setSavedFilePaths([]);
    setSkippedSourcePaths([]);

    try {
      const result = await exportSource(scannedPath, paths);
      if (requestIdRef.current !== requestId) return;
      setSavedFilePaths(result.output_paths);
      setSkippedSourcePaths(result.skipped_paths);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setErrorMessage(toEntryErrorMessage(err));
    } finally {
      if (requestIdRef.current === requestId) setIsExporting(false);
    }
  }

  async function downloadDiff() {
    const requestId = requestIdRef.current;
    setIsExporting(true);
    setErrorMessage("");
    setSavedFilePaths([]);
    setSkippedSourcePaths([]);

    try {
      const result = await exportDiff(scannedPath);
      if (requestIdRef.current !== requestId) return;
      setDiffContent(result.content);
      setSavedFilePaths([result.output_path]);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setErrorMessage(toEntryErrorMessage(err));
    } finally {
      if (requestIdRef.current === requestId) setIsExporting(false);
    }
  }

  async function openSavedFileFolder() {
    if (savedFilePaths.length === 0) return;
    try {
      await revealEntryNamesFile(savedFilePaths[0]);
    } catch (err) {
      setErrorMessage(toEntryErrorMessage(err));
    }
  }

  function clearErrorMessage() {
    setErrorMessage("");
  }

  function showErrorMessage(message: string) {
    setErrorMessage(message);
  }

  return {
    path,
    setPath: updatePath,
    scannedPath,
    entries,
    diffContent,
    savedFilePaths,
    skippedSourcePaths,
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
    showErrorMessage,
  };
}
