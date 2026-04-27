export function toEntryErrorMessage(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes("path is not a directory")) {
    return "フォルダが見つからないか、指定されたパスがフォルダではありません。";
  }
  if (lower.includes("not a git repository")) {
    return "Gitリポジトリとして読み取れません。Git管理下のフォルダを選んでください。";
  }
  if (lower.includes("source is too large to copy safely")) {
    return "ソースが大きいため安全にコピーできません。Export source を使ってファイルに保存してください。";
  }
  if (lower.includes("no readable source files")) {
    return "読み取れるソースファイルが見つかりませんでした。";
  }
  if (lower.includes("failed to read directory")) {
    return "フォルダを読み取れませんでした。パスとアクセス権限を確認してください。";
  }
  if (lower.includes("failed to read an entry")) {
    return "一部のファイルを読み取れませんでした。ファイル名やアクセス権限を確認してください。";
  }
  if (lower.includes("path must stay inside")) {
    return "選択したフォルダの外にあるパスは読み取れません。";
  }
  if (lower.includes("git command failed")) {
    return `Gitコマンドでエラーが発生しました。詳細: ${message.replace(/^git command failed:\s*/i, "")}`;
  }

  return message;
}
