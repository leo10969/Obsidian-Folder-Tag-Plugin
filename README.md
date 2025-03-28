# Folder Tag Plugin

フォルダ構造に基づいてタグを自動管理し、直感的なタグ管理機能を提供するObsidianプラグインです。

## 機能

- フォルダ名を自動的にタグとして追加
- タグに基づいてファイルを対応するフォルダに移動
- 新規ファイル作成時のタグ選択モーダル
- フォルダ内の全ファイルへのタグ追加
- 多言語対応（日本語・英語）

## インストール方法

1. Obsidianの設定を開く
2. 「コミュニティプラグイン」を選択
3. 「安全モード」をオフにする
4. 「参照」をクリック
5. 検索バーに「Folder Tag Plugin」と入力
6. インストールボタンをクリック

## 使い方

### 新規ファイル作成時

1. 新規ファイルを作成すると、自動的にタグ選択モーダルが表示されます
2. フォルダと一致するタグ（1つまで選択可能）とその他のタグ（複数選択可能）から選択
3. 新しいタグを追加する場合は、入力フィールドに入力して「追加」をクリック
4. タグと同じ名前のフォルダを作成する場合は、チェックボックスをオンに
5. 「タグを適用」をクリックして確定

### コマンド

- **Add parent folder tag to current file**: 現在のファイルに親フォルダのタグを追加
- **Add folder tag to all files in current folder**: 現在のフォルダ内の全ファイルにフォルダタグを追加
- **List all folders in vault**: ボルト内の全フォルダを表示

## 開発者向け情報

### ビルド方法

```bash
npm install
npm run dev
```

### ファイル構成

- `main.ts`: プラグインのメインコード
- `styles.css`: スタイルシート
- `manifest.json`: プラグインの設定ファイル
- `i18n/`: 多言語対応ファイル
  - `en.json`: 英語の翻訳
  - `ja.json`: 日本語の翻訳

## ライセンス

MIT License

## Note for GitHub Actions

This line is added to trigger GitHub Actions for re-validation.

---

# Folder Tag Plugin (English)

An Obsidian plugin that automatically manages tags based on folder structure and provides intuitive tag management features.

## Features

- Automatically adds folder names as tags
- Moves files to corresponding folders based on tags
- Tag selection modal when creating new files
- Add tags to all files in a folder
- Multi-language support (English/Japanese)

## Installation

1. Open Obsidian Settings
2. Select "Community Plugins"
3. Turn off "Safe Mode"
4. Click "Browse"
5. Search for "Folder Tag Plugin"
6. Click Install

## Usage

### When Creating New Files

1. When creating a new file, the tag selection modal appears automatically
2. Select from folder-matching tags (single selection) and other tags (multiple selection)
3. To add a new tag, enter it in the input field and click "Add"
4. To create a folder with the same name as the tag, check the checkbox
5. Click "Apply Tags" to confirm

### Commands

- **Add parent folder tag to current file**: Adds the parent folder's tag to the current file
- **Add folder tag to all files in current folder**: Adds folder tags to all files in the current folder
- **List all folders in vault**: Displays all folders in the vault

## Developer Information

### Build Instructions

```bash
npm install
npm run dev
```

### File Structure

- `main.ts`: Main plugin code
- `styles.css`: Stylesheet
- `manifest.json`: Plugin configuration
- `i18n/`: Multi-language files
  - `en.json`: English translations
  - `ja.json`: Japanese translations

## License

MIT License

## Support

If you encounter any issues or have suggestions, please create an issue in the GitHub repository.

## Acknowledgments

- Thanks to the Obsidian team for their excellent plugin API
- Inspired by the need for better tag management in Obsidian
