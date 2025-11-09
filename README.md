# マルチプロジェクト構成の GAS リポジトリ

このリポジトリでは、複数の Google Apps Script (GAS) プロジェクトを共通テスト基盤の下で管理します。プロジェクトごとにディレクトリを分け、テストコードは `tests/` に集約する構成です。

## ディレクトリ構成

```
/
├─ README.md
├─ scripts/
│  └─ README.md
├─ gas-projects/
│  ├─ youtube-caption-uploader/
│  │  ├─ src/
│  │  │  └─ YouTubeUploader.gs
│  │  ├─ appsscript.json
│  │  └─ clasp.json
│  ├─ project-b/
│  │  ├─ src/
│  │  │  └─ main.gs
│  │  ├─ appsscript.json
│  │  └─ clasp.json
└─ tests/
   ├─ unit/
   │  ├─ youtube-caption-uploader.test.ts
   │  ├─ project-b.test.ts
   │  └─ sharedHelpers.ts
   └─ integration/
      └─ README.md
```

## プロジェクトの追加手順

1. `gas-projects/` 配下に新しいディレクトリを作成します。
2. `src/` に `.gs` ファイルを追加し、`appsscript.json` や `clasp.json` を配置します。
3. 対応するテストを `tests/` 配下に作成します。

## テストの配置

- 単体テスト: `tests/unit/`
- 統合テスト: `tests/integration/`
- 共通ヘルパー: `tests/unit/sharedHelpers.ts`

必要に応じて CI/CD 用スクリプトを `scripts/` 配下に配置してください。
