# Prompt Porter / CodePrompt Desk

> ブラウザ版生成AIに、ソースコードやプロジェクト情報を投げやすくするデスクトップアプリ

## 1. 解決したい課題

ブラウザ版ChatGPT、Claude、Geminiなどしか使えない環境では、IDE拡張やAPI連携型エージェントが使えません。

その結果、開発者は毎回こんな作業を手でやる必要があります。

- 関連ファイルを探す
- コードをコピーする
- ファイル名やディレクトリ構造を説明する
- 長すぎるコードを分割する
- 「このコードをレビューして」「このバグを探して」などの文脈を毎回書く
- 生成AIの回答を見ながら、また別の関連コードを追加する

このアプリは、そのプロンプト投入前の面倒な準備を自動化・半自動化するツールです。

TauriはRustバックエンドとHTML/JS/CSS系フロントエンドを組み合わせてデスクトップアプリを作れるため、この用途に向いています。Tauri v2ではRust関数をフロントエンドから呼ぶcommand機構があり、ファイル読み取りや解析処理をRust側に寄せられます。

## 2. コンセプト
### 一言で言うと

「ブラウザ生成AI用のコード文脈パッカー」

IDEのAI補完ではなく、ブラウザAIに投げるための
コード選択・要約・整形・プロンプト生成・コピー補助ツールです。

## 3. メイン機能
### A. プロジェクト読み込み

ユーザーがローカルのプロジェクトフォルダを選択する。

読み込む対象例：

- .rs
- .ts
- .tsx
- .js
- .jsx
- .py
- .go
- .java
- .md
- Cargo.toml
- package.json
- README.md

除外対象：

- node_modules
- target
- .git
- dist
- build
- .next
- vendor
- ロックファイル
- バイナリファイル

Tauri v2にはファイルシステム操作用プラグインがあり、アプリ側からローカルファイルを扱う設計ができます。ファイル操作では権限設定も重要になります。

### B. ソースコード選択UI

左側にファイルツリー、中央に選択済みファイル、右側に生成プロンプトを表示します。

### 画面イメージ
```text
┌────────────────────┬────────────────────┬────────────────────────┐
│ Project Tree       │ Selected Context    │ Prompt Preview          │
│                    │                    │                        │
│ src/               │ ✅ main.rs          │ あなたはRust/Tauriの... │
│ ├─ main.rs         │ ✅ lib.rs           │                        │
│ ├─ commands.rs     │ ✅ package.json     │ ```rust                │
│ ├─ prompt.rs       │                    │ // src/main.rs          │
│ package.json       │ Token estimate      │ ...                    │
│ Cargo.toml         │ 18,420 chars        │ ```                    │
└────────────────────┴────────────────────┴────────────────────────┘
```
### C. プロンプトテンプレート

目的別にテンプレートを選べるようにします。

#### 例
#### 1. バグ調査
以下のコードで発生している可能性があるバグを調査してください。

観点:
- 実行時エラー
- 型の不整合
- 非同期処理の問題
- Rust/Tauri境界の問題
- セキュリティ上の懸念

回答形式:
1. 問題点
2. 原因
3. 修正案
4. 修正後コード
#### 2. リファクタリング
以下のコードをリファクタリングしてください。

重視する点:
- 可読性
- 責務分離
- Rustらしい設計
- エラーハンドリング
- 将来の機能追加のしやすさ
#### 3. 実装相談
以下の既存コードを前提に、次の機能を実装したいです。

実装したい機能:
{{user_request}}

既存コード:
{{selected_files}}

次の形式で回答してください:
1. 設計方針
2. 変更するファイル
3. 追加するコード
4. 注意点
#### 4. 差分レビュー
以下は変更前と変更後のコードです。
レビューしてください。

観点:
- バグ
- 破壊的変更
- セキュリティ
- パフォーマンス
- 命名
- テスト観点
### D. 生成AIサービス別の最適化

ブラウザAIごとに、投げ方を変えられると便利です。

例：

| 対象 | 最適化 |
|---|---|
| ChatGPT | 長文でも比較的自然に渡す |
| Claude | 大きめのコード文脈を渡す用途向け |
| Gemini | Google系資料や説明文と合わせる用途 |
| Copilot Chat Web | GitHub文脈を意識した説明 |

ただし、API連携はしない設計にします。
制約が「ブラウザ版生成AIしか使えない環境」なので、やることはあくまで：

- プロンプト生成
- クリップボードコピー
- ブラウザを開く
- 手動貼り付け支援

です。

## 4. MVP機能

最初のバージョンはこれで十分です。

### MVP v0.1
#### 必須
- プロジェクトフォルダを開く
- ファイルツリー表示
- ファイルを複数選択
- 選択ファイルをMarkdownコードブロック化
- プロンプトテンプレート選択
- クリップボードへコピー
- 文字数・概算トークン数表示
- 除外パターン設定
#### あると良い
- README / package.json / Cargo.toml を自動で先頭に含める
- ファイル名付きコードブロック
- 長すぎる場合の警告
- プロンプト履歴保存
- よく使うテンプレート保存

Tauri v2では設定保存にStoreプラグインを使えるため、テンプレート、履歴、除外設定、最近開いたプロジェクトなどを保存できます。

## 5. 差別化ポイント
### 既存のAIエディタと違う点

CursorやWindsurfのような「AIが直接コードを書く」ツールではありません。

このアプリは、

会社や学校の制約でブラウザ生成AIしか使えない人のための、手動AI開発支援ツール

です。

### 強み
- APIキー不要
- 社内ネットワーク制約に強い
- ブラウザ版AIだけで使える
- ローカルコードを勝手に外部送信しない
- ユーザーが貼る内容を確認できる
- IDEに依存しない
- Rust/Tauriで軽量なデスクトップアプリにできる
## 6. 主要ユースケース
### ユースケース1：バグを生成AIに相談する
- プロジェクトを開く
- 関連ファイルを選ぶ
- 「バグ調査」テンプレートを選ぶ
- エラーメッセージを入力する
- プロンプト生成
- コピー
- ブラウザ版ChatGPTに貼る
### ユースケース2：Rust/Tauriの実装方針を相談する
- src-tauri/src/lib.rs
- src-tauri/Cargo.toml
- src/App.tsx
- package.json

を選択して、

この構成で、選択したファイル群からプロンプトを生成する機能を追加したい

と入力。

アプリが、生成AIに投げやすい形に整形します。

### ユースケース3：コードレビュー依頼

選択したファイルを以下のように整形。

以下のコードをレビューしてください。

特に見てほしい点:
- Tauri commandの設計
- Rust側のエラーハンドリング
- フロントエンドとの型整合性
- ファイルアクセス権限
## 7. 画面構成
### 画面1：プロジェクト選択
- 最近開いたプロジェクト
- フォルダを開く
- 除外設定
- 言語フィルター
### 画面2：コンテキスト作成
- ファイルツリー
- 検索
- 拡張子フィルター
- 選択ファイル一覧
- 文字数表示
- プレビュー
### 画面3：プロンプト生成
- テンプレート選択
- 追加指示入力
- 出力形式指定
- コピー
- ブラウザを開く
### 画面4：テンプレート管理
- テンプレート作成
- 編集
- 複製
- 削除
- 変数挿入
## 8. 便利な独自機能案
### 1. Context Budget Meter

生成AIに投げる量を可視化します。

現在の文脈量: 32,000文字
目安: 中規模
警告: ファイル数が多いため、要約モード推奨
### 2. Smart Context Picker

ファイル名やimport関係から関連ファイルを推測します。

例：

src-tauri/src/commands/prompt.rs を選ぶと、

- `src-tauri/src/lib.rs`
- `Cargo.toml`
- `src/types.ts`
- `src/api/prompt.ts`

も候補に出す。

### 3. Prompt Splitter

長すぎるプロンプトを分割します。

- `Part 1: プロジェクト概要`
- `Part 2: Rustバックエンド`
- `Part 3: フロントエンド`
- `Part 4: 質問内容`

ブラウザ版AIに順番に貼りやすくなります。

### 4. AI Reply Import

生成AIの回答を貼り付ける欄を作り、そこから以下を抽出します。

- 変更対象ファイル
- コードブロック
- TODO
- 注意点

ただし、自動適用はMVPではやらない方が安全です。
最初は「回答整理」までに留めるのがよいです。

### 5. Redaction Mode

社外秘情報を送らないように置換します。

例：

- `API_KEY=xxxx`
- `DATABASE_URL=xxxx`
- `PRIVATE_TOKEN=xxxx`

これを自動検出して、

- `API_KEY=<REDACTED>`
- `DATABASE_URL=<REDACTED>`
- `PRIVATE_TOKEN=<REDACTED>`

に変換します。

これはかなり重要です。

## 9. 技術構成案
### フロントエンド

#### おすすめ：

- React
- TypeScript
- Vite
- Zustand または Jotai
- Monaco Editor または CodeMirror
- Tailwind CSS
### バックエンド
- Rust
- Tauri v2
- walkdir：ディレクトリ走査
- ignore：.gitignore風の除外
- serde：データ構造のシリアライズ
- regex：秘密情報検出
- tauri-plugin-store：設定保存
- tauri-plugin-fs：ファイル操作
- tauri-plugin-clipboard-manager：コピー支援
- tauri-plugin-opener：ブラウザ起動

Tauriはcreate-tauri-appでReact、Svelte、Vueなどのテンプレートから開始できます。公式テンプレートにはReactも含まれています。

## 10. Rust側の主な責務

Rust側では以下を担当させるとよいです。

```text
src-tauri/src/
├─ lib.rs
├─ commands/
│  ├─ mod.rs
│  ├─ project.rs
│  ├─ files.rs
│  ├─ prompt.rs
│  └─ redact.rs
├─ domain/
│  ├─ project_tree.rs
│  ├─ prompt_template.rs
│  └─ context_pack.rs
└─ infra/
   ├─ fs_scan.rs
   └─ settings_store.rs
```
### Rust command例
```rust
#[tauri::command]
async fn scan_project(path: String) -> Result<ProjectTree, String> {
    // ディレクトリ走査
    // 除外パターン適用
    // ファイルメタデータ取得
    // ツリー構造で返す
    todo!()
}

#[tauri::command]
async fn read_selected_files(paths: Vec<String>) -> Result<Vec<SourceFile>, String> {
    // 選択ファイルを読み込む
    todo!()
}

#[tauri::command]
async fn build_prompt(input: BuildPromptInput) -> Result<String, String> {
    // テンプレート + 選択コード + 追加指示を結合
    todo!()
}
```

TauriではこのようなRust関数を#[tauri::command]として定義し、フロントエンドから呼び出せます。

## 11. データモデル案
```ts
type SourceFile = {
  path: string;
  language: string;
  content: string;
  size: number;
  selected: boolean;
};

type PromptTemplate = {
  id: string;
  name: string;
  description: string;
  body: string;
  variables: string[];
};

type BuildPromptInput = {
  templateId: string;
  userInstruction: string;
  files: SourceFile[];
  options: {
    includeTree: boolean;
    includeFileStats: boolean;
    redactSecrets: boolean;
    splitLongPrompt: boolean;
  };
};
```
## 12. 出力プロンプト形式

おすすめはこの形式です。

````markdown
あなたは熟練したRust/Tauriエンジニアです。
以下のプロジェクトコードを前提に回答してください。

## 依頼内容

{{user_instruction}}

## プロジェクト構成

```text
src-tauri/
  src/
    lib.rs
    commands.rs
src/
  App.tsx
  main.tsx
package.json
Cargo.toml
```

## 関連ファイル

### file: src-tauri/src/lib.rs

```rust
...
```

### file: src/App.tsx

```tsx
...
```

## 回答形式

1. 原因または設計方針
2. 変更するファイル
3. 修正コード
4. 注意点
````
## 13. 開発ロードマップ
### Phase 1：MVP
- プロジェクトを開く
- ファイルツリー表示
- ファイル選択
- テンプレート選択
- プロンプト生成
- コピー
### Phase 2：実用化
- 除外ルール
- トークン/文字数目安
- テンプレート保存
- 履歴
- Redaction
- ブラウザ起動
### Phase 3：賢い補助
- import解析
- 関連ファイル推薦
- プロンプト分割
- 回答貼り付け欄
- コードブロック抽出
### Phase 4：チーム利用
- テンプレート共有
- プロジェクト別設定
- セキュリティルール
- 禁止ファイル検出
- 社内利用向けプリセット
## 14. 最初に作るべき具体的な機能

最初の実装対象はこれがよいです。

### v0.1機能セット
1. フォルダ選択
2. ファイルツリー表示
3. ファイル複数選択
4. 選択ファイルの内容読み込み
5. Markdownコードブロック化
6. プロンプトテンプレート結合
7. クリップボードコピー

この7つだけで、すでに実用価値があります。

## 15. アプリ名候補
- Prompt Porter
- CodePrompt Desk
- Context Packer
- Browser AI Bridge
- Prompt Shuttle
- Code-to-Prompt
- AI Clipboard Studio
- Context Courier
- DevPrompt Studio
- PromptDock

個人的には Context Packer か Prompt Porter が分かりやすいです。

## 16. 企画の核

このアプリの本質は、生成AIそのものを作ることではありません。

生成AIに渡す前の「文脈づくり」を高速化するアプリです。

ブラウザ版生成AIしか使えない環境では、コード支援のボトルネックは「AIの性能」よりも「正しいコード文脈を貼る手間」になります。

そこをTauri/Rustのローカルファイル処理で補助する、という企画です。
