# Folder Tag Plugin for Obsidian

A powerful Obsidian plugin that automatically manages tags based on folder structure and provides intuitive tag management features.

## Features

### Automatic Tag Management
- Automatically adds folder names as tags to files
- Creates a seamless connection between folder structure and tags
- Supports multiple tag selection for better organization

### Tag Selection Modal
- **Folder-Matching Tags Section**
  - Displays tags that match existing folder names
  - Single selection mode (radio buttons)
  - Automatically moves files to selected tag's folder

- **Other Tags Section**
  - Shows all other existing tags
  - Multiple selection mode (checkboxes)
  - Flexible tag management

- **New Tag Creation**
  - Add new tags with a simple interface
  - Option to create a folder with the same name as the new tag
  - Automatic categorization of new tags based on folder creation

### File Management
- Automatic file movement to tag-matching folders
- Maintains file organization based on tag selection
- Updates graph view after file operations

### Commands
- `Add parent folder tag to current file`: Adds the current folder name as a tag to the active file
- `Add folder tag to all files in current folder`: Adds the folder name as a tag to all files in the current folder
- `List all folders in vault`: Shows a list of all folders in your vault

## Installation

1. Open Obsidian Settings
2. Go to Community Plugins
3. Disable Safe Mode
4. Click Browse and search for "Folder Tag Plugin"
5. Click Install

## Usage

### Creating New Files
1. Create a new file in any folder
2. The tag selection modal will automatically appear
3. Select or create tags as needed
4. Click "Apply Tags" to save your selection

### Adding Tags to Existing Files
1. Use the command palette (Ctrl/Cmd + P)
2. Select "Add parent folder tag to current file"
3. The current folder name will be added as a tag

### Managing Multiple Files
1. Use the command palette
2. Select "Add folder tag to all files in current folder"
3. All files in the current folder will receive the folder name as a tag

## Settings

The plugin currently uses default settings. Future versions will include customizable options for:
- Tag format preferences
- Automatic tag behavior
- File movement rules
- UI customization

## Requirements

- Obsidian v0.15.0 or higher
- Safe Mode disabled in Obsidian settings

## Development

### Building the Plugin
```bash
npm install
npm run dev
```

### File Structure
```
.
├── main.ts              # Main plugin code
├── styles.css           # Plugin styles
├── manifest.json        # Plugin manifest
└── package.json         # Dependencies and scripts
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

If you encounter any issues or have suggestions, please create an issue in the GitHub repository.

## Acknowledgments

- Thanks to the Obsidian team for their excellent plugin API
- Inspired by the need for better tag management in Obsidian
