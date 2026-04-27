export type ExportEntryNamesResponse = {
  entries: string[];
  output_path: string;
};

export type ExportDiffResponse = {
  content: string;
  output_path: string;
};

export type ExportSourceResponse = {
  output_paths: string[];
  skipped_paths: string[];
};

export type SourceTextResponse = {
  content: string;
  skipped_paths: string[];
};
