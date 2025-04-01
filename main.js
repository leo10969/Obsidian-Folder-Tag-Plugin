import { __awaiter } from "tslib";
import { MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFolder, TFile } from 'obsidian';
const DEFAULT_SETTINGS = {
    mySetting: 'default'
};
// i18n helper function
function t(key, params = {}) {
    const i18n = window.i18n;
    if (!i18n)
        return key;
    let text = i18n.t(`folder-tag-plugin:${key}`);
    Object.entries(params).forEach(([key, value]) => {
        text = text.replace(`{${key}}`, value);
    });
    return text;
}
// Tag selection modal
class TagSelectionModal extends Modal {
    constructor(app, onSubmit) {
        super(app);
        this.selectedFolderTag = null;
        this.selectedOtherTags = [];
        this.onSubmit = onSubmit;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        // Get existing tags
        const existingTags = new Set();
        this.app.vault.getAllLoadedFiles().forEach(file => {
            if (file instanceof TFile) {
                const cache = this.app.metadataCache.getFileCache(file);
                if (cache === null || cache === void 0 ? void 0 : cache.tags) {
                    cache.tags.forEach(tag => existingTags.add(tag.tag.slice(1)));
                }
            }
        });
        // Get folder names
        const folderNames = new Set();
        this.app.vault.getAllLoadedFiles().forEach(file => {
            if (file instanceof TFolder) {
                folderNames.add(file.name);
            }
        });
        // Classify tags
        const folderMatchingTags = Array.from(existingTags).filter(tag => folderNames.has(tag));
        const otherTags = Array.from(existingTags).filter(tag => !folderNames.has(tag));
        // Create tag selection container
        const tagContainer = contentEl.createDiv('tag-selection-container');
        // Display folder-matching tags
        const folderTagsContainer = tagContainer.createDiv('folder-tags');
        folderTagsContainer.createEl('h3', { text: t('folderMatchingTags') });
        const folderTagListEl = folderTagsContainer.createDiv('tag-list');
        folderMatchingTags.forEach(tag => {
            const tagEl = folderTagListEl.createDiv('tag-item');
            tagEl.createSpan({ text: `#${tag}` });
            const radio = tagEl.createEl('input', { type: 'radio' });
            radio.setAttribute('name', 'folderTag');
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.selectedFolderTag = tag;
                }
                else {
                    this.selectedFolderTag = null;
                }
            });
        });
        // Display other tags
        const otherTagsContainer = tagContainer.createDiv('other-tags');
        otherTagsContainer.createEl('h3', { text: t('otherTags') });
        const otherTagListEl = otherTagsContainer.createDiv('tag-list');
        otherTags.forEach(tag => {
            const tagEl = otherTagListEl.createDiv('tag-item');
            tagEl.createSpan({ text: `#${tag}` });
            const checkbox = tagEl.createEl('input', { type: 'checkbox' });
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.selectedOtherTags.push(tag);
                }
                else {
                    this.selectedOtherTags = this.selectedOtherTags.filter(t => t !== tag);
                }
            });
        });
        // Create new tag input container
        const newTagContainer = tagContainer.createDiv('new-tag');
        newTagContainer.createEl('h3', { text: t('newTag') });
        const inputContainer = newTagContainer.createDiv('input-container');
        const input = inputContainer.createEl('input', {
            type: 'text',
            attr: { placeholder: t('enterNewTag') }
        });
        const addButton = inputContainer.createEl('button', { text: t('add') });
        // Create folder creation option container
        const createFolderContainer = newTagContainer.createDiv('create-folder-option');
        const createFolderCheckbox = createFolderContainer.createEl('input', { type: 'checkbox' });
        createFolderCheckbox.setAttribute('id', 'createFolderCheckbox');
        createFolderContainer.createEl('label', { text: t('createFolderOption'), attr: { for: 'createFolderCheckbox' } });
        addButton.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            const newTag = input.value.trim().replace(/^#/, ''); // Remove #
            if (newTag && !this.selectedOtherTags.includes(newTag) && !folderMatchingTags.includes(newTag)) {
                // If folder creation option is selected
                if (createFolderCheckbox.checked) {
                    try {
                        // Create folder
                        yield this.app.vault.createFolder(newTag);
                        // Add as folder tag
                        this.selectedFolderTag = newTag;
                        // Update folder tag radio buttons
                        const folderTagListEl = folderTagsContainer.querySelector('.tag-list');
                        if (folderTagListEl) {
                            const tagEl = folderTagListEl.createDiv('tag-item');
                            tagEl.createSpan({ text: `#${newTag}` });
                            const radio = tagEl.createEl('input', { type: 'radio' });
                            radio.setAttribute('name', 'folderTag');
                            radio.checked = true;
                            radio.addEventListener('change', () => {
                                if (radio.checked) {
                                    this.selectedFolderTag = newTag;
                                }
                                else {
                                    this.selectedFolderTag = null;
                                }
                            });
                        }
                        new Notice(t('createdTagAndFolder', { tag: newTag, folder: newTag }));
                    }
                    catch (error) {
                        console.error('Error creating folder:', error);
                        new Notice(t('failedToCreateFolder', { folder: newTag }));
                        return;
                    }
                }
                else {
                    // Add as other tag
                    this.selectedOtherTags.push(newTag);
                    // Update other tags checkboxes
                    const otherTagListEl = otherTagsContainer.querySelector('.tag-list');
                    if (otherTagListEl) {
                        const tagEl = otherTagListEl.createDiv('tag-item');
                        tagEl.createSpan({ text: `#${newTag}` });
                        const checkbox = tagEl.createEl('input', { type: 'checkbox' });
                        checkbox.checked = true;
                        checkbox.addEventListener('change', () => {
                            if (checkbox.checked) {
                                this.selectedOtherTags.push(newTag);
                            }
                            else {
                                this.selectedOtherTags = this.selectedOtherTags.filter(t => t !== newTag);
                            }
                        });
                    }
                    new Notice(t('addedTag', { tag: newTag }));
                }
                input.value = '';
            }
        }));
        // Submit button
        const submitButtonContainer = contentEl.createDiv('modal-button-container');
        const submitButton = submitButtonContainer.createEl('button', { text: t('applyTags') });
        submitButton.addEventListener('click', () => {
            // Combine selected tags
            const selectedTags = [
                ...(this.selectedFolderTag ? [this.selectedFolderTag] : []),
                ...this.selectedOtherTags.filter(tag => tag.trim() !== '')
            ];
            this.onSubmit(selectedTags);
            this.close();
        });
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
export default class FolderTagPlugin extends Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            // Delay plugin initialization
            setTimeout(() => {
                this.initializePlugin();
            }, 2000); // Initialize after 2 seconds
        });
    }
    initializePlugin() {
        return __awaiter(this, void 0, void 0, function* () {
            // Load settings
            yield this.loadSettings();
            // Add commands
            this.addCommand({
                id: 'add-folder-tag',
                name: 'Add Folder Tag',
                callback: () => {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) {
                        if (activeFile.extension === 'pdf') {
                            new Notice(t('pdfNotSupported'));
                            return;
                        }
                        this.addFolderTag(activeFile);
                    }
                }
            });
            // Monitor file creation events
            this.registerEvent(this.app.vault.on('create', (file) => {
                if (file instanceof TFile) {
                    this.handleNewFile(file);
                }
            }));
            // Monitor file move events
            this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
                if (file instanceof TFile) {
                    this.handleFileMove(file, oldPath);
                }
            }));
            // Add settings tab
            this.addSettingTab(new SampleSettingTab(this.app, this));
            // This creates an icon in the left ribbon.
            const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt) => {
                // Called when the user clicks the icon.
                new Notice('This is a notice!');
            });
            // Perform additional things with the ribbon
            ribbonIconEl.addClass('my-plugin-ribbon-class');
            // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
            const statusBarItemEl = this.addStatusBarItem();
            statusBarItemEl.setText('Status Bar Text');
            // This adds a simple command that can be triggered anywhere
            this.addCommand({
                id: 'open-sample-modal-simple',
                name: 'Open sample modal (simple)',
                callback: () => {
                    new SampleModal(this.app).open();
                }
            });
            // This adds an editor command that can perform some operation on the current editor instance
            this.addCommand({
                id: 'sample-editor-command',
                name: 'Sample editor command',
                editorCallback: (editor, view) => {
                    console.log(editor.getSelection());
                    editor.replaceSelection('Sample Editor Command');
                }
            });
            // This adds a complex command that can check whether the current state of the app allows execution of the command
            this.addCommand({
                id: 'open-sample-modal-complex',
                name: 'Open sample modal (complex)',
                checkCallback: (checking) => {
                    // Conditions to check
                    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (markdownView) {
                        // If checking is true, we're simply "checking" if the command can be run.
                        // If checking is false, then we want to actually perform the operation.
                        if (!checking) {
                            new SampleModal(this.app).open();
                        }
                        // This command will only show up in Command Palette when the check function returns true
                        return true;
                    }
                }
            });
            // This adds a command to list all folders in the vault
            this.addCommand({
                id: 'list-vault-folders',
                name: 'List all folders in vault',
                callback: () => {
                    const files = this.app.vault.getAllLoadedFiles();
                    const folders = files.filter((file) => file instanceof TFolder);
                    new Notice(t('foundFolders', {
                        count: folders.length.toString(),
                        folders: folders.map(folder => folder.path).join('\n')
                    }));
                    console.log('Vault folders:', folders);
                }
            });
            // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
            // Using this function will automatically remove the event listener when this plugin is disabled.
            this.registerDomEvent(document, 'click', (evt) => {
                console.log('click', evt);
            });
            // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
            this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
            // File tagging function
            const appendTagsToFile = (file, tags) => __awaiter(this, void 0, void 0, function* () {
                try {
                    // Read file content
                    const content = yield this.app.vault.read(file);
                    // Add new tags (excluding #)
                    const newTags = tags.filter(tag => {
                        // Remove # for comparison
                        const tagWithoutHash = tag.replace(/^#/, '');
                        return !content.match(new RegExp(`#${tagWithoutHash}\\b`));
                    }).map(tag => tag.replace(/^#/, '')); // Remove # from all tags
                    if (newTags.length === 0) {
                        console.log('No new tags to add');
                        return;
                    }
                    // Add tags (prepend to file content)
                    const newContent = `${newTags.map(tag => `#${tag}`).join(' ')}\n\n${content}`;
                    // Update file
                    yield this.app.vault.modify(file, newContent);
                    console.log(`Added tags ${newTags.map(tag => `#${tag}`).join(', ')} to file: ${file.path}`);
                    // Refresh graph view
                    this.app.workspace.trigger('file-change', file);
                    this.app.workspace.trigger('graph:refresh');
                    console.log('Graph view refreshed');
                }
                catch (error) {
                    console.error('Error appending tags to file:', error);
                }
            });
            // Folder tagging function
            const addFolderTagsToAllFiles = (folder) => __awaiter(this, void 0, void 0, function* () {
                const files = folder.children.filter((file) => file instanceof TFile);
                let processedCount = 0;
                let skippedCount = 0;
                for (const file of files) {
                    try {
                        const content = yield this.app.vault.read(file);
                        if (!content.includes(`#${folder.name}`)) {
                            yield appendTagsToFile(file, [folder.name]);
                            processedCount++;
                        }
                        else {
                            skippedCount++;
                        }
                    }
                    catch (error) {
                        console.error(`Error processing file ${file.path}:`, error);
                    }
                }
                return { processedCount, skippedCount };
            });
            // Command to add tag to parent folder of current file
            this.addCommand({
                id: 'add-folder-tag-to-current-file',
                name: 'Add parent folder tag to current file',
                callback: () => {
                    const file = this.app.workspace.getActiveFile();
                    if (file && file.parent) {
                        appendTagsToFile(file, [file.parent.name]);
                        new Notice(`Added tag #${file.parent.name} to current file`);
                    }
                    else {
                        new Notice('No file is currently open');
                    }
                }
            });
            // Command to add tag to all files in current folder
            this.addCommand({
                id: 'add-folder-tags-to-all-files',
                name: 'Add folder tag to all files in current folder',
                callback: () => {
                    const file = this.app.workspace.getActiveFile();
                    if (file && file.parent instanceof TFolder) {
                        addFolderTagsToAllFiles(file.parent).then(({ processedCount, skippedCount }) => {
                            new Notice(`Added folder tags to ${processedCount} files (${skippedCount} files already had the tag)`);
                        });
                    }
                    else {
                        new Notice('No file is currently open in a folder');
                    }
                }
            });
            // File moving function
            const moveFileToTagFolder = (file, tag) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const tagWithoutHash = tag.replace(/^#/, '');
                    const targetFolder = this.app.vault.getAllLoadedFiles().find((f) => f instanceof TFolder && f.name === tagWithoutHash);
                    if (targetFolder) {
                        yield this.app.fileManager.renameFile(file, `${targetFolder.path}/${file.name}`);
                        console.log(`Moved file ${file.path} to folder ${targetFolder.path}`);
                        new Notice(t('movedFileToFolder', { tag: tagWithoutHash }));
                        this.app.workspace.trigger('file-change', file);
                        this.app.workspace.trigger('graph:refresh');
                        console.log('Graph view refreshed after file movement');
                    }
                    else {
                        console.log(`No folder found matching tag: ${tagWithoutHash}`);
                    }
                }
                catch (error) {
                    console.error('Error moving file to tag folder:', error);
                }
            });
            // File creation event handler
            this.registerEvent(this.app.vault.on('create', (file) => {
                console.log('Vault create event triggered:', file.path);
                if (file instanceof TFile) {
                    const folder = file.parent;
                    if (folder) {
                        new Notice(t('newFileCreated', {
                            path: file.path,
                            folder: folder.path
                        }));
                        console.log('New file created (create event):', {
                            fileName: file.name,
                            filePath: file.path,
                            folderName: folder.name,
                            folderPath: folder.path,
                            creationTime: file.stat.ctime,
                            modificationTime: file.stat.mtime
                        });
                        new TagSelectionModal(this.app, (selectedTags) => __awaiter(this, void 0, void 0, function* () {
                            const validTags = [...new Set(selectedTags.filter(tag => tag.trim() !== ''))];
                            if (folder.name.trim() !== '') {
                                validTags.push(folder.name);
                            }
                            if (validTags.length > 0) {
                                yield appendTagsToFile(file, validTags);
                                new Notice(t('addedTags', {
                                    tags: validTags.map(tag => `#${tag}`).join(', ')
                                }));
                                for (const tag of validTags) {
                                    yield moveFileToTagFolder(file, tag);
                                }
                                this.app.workspace.trigger('file-change', file);
                                this.app.workspace.trigger('graph:refresh');
                                console.log('Graph view refreshed after tag operations');
                            }
                        })).open();
                    }
                }
            }));
            // File open event handler
            this.registerEvent(this.app.workspace.on('file-open', (file) => {
                console.log('Workspace file-open event triggered:', file === null || file === void 0 ? void 0 : file.path);
                if (file instanceof TFile) {
                    const folder = file.parent;
                    if (folder) {
                        // Output details to console
                        console.log('File opened:', {
                            fileName: file.name,
                            filePath: file.path,
                            folderName: folder.name,
                            folderPath: folder.path,
                            creationTime: file.stat.ctime,
                            modificationTime: file.stat.mtime
                        });
                    }
                }
            }));
        });
    }
    getFolderTag(filePath) {
        const pathParts = filePath.split('/');
        if (pathParts.length > 1) {
            return pathParts[pathParts.length - 2];
        }
        return null;
    }
    addTagToFile(file, tag) {
        return __awaiter(this, void 0, void 0, function* () {
            const content = yield this.app.vault.read(file);
            const frontmatter = this.getFrontmatter(content);
            const tags = this.getTags(frontmatter);
            if (!tags.includes(tag)) {
                tags.push(tag);
                const newContent = this.updateFrontmatter(content, tags);
                yield this.app.vault.modify(file, newContent);
            }
        });
    }
    removeTagFromFile(file, tag) {
        return __awaiter(this, void 0, void 0, function* () {
            const content = yield this.app.vault.read(file);
            const frontmatter = this.getFrontmatter(content);
            const tags = this.getTags(frontmatter);
            const index = tags.indexOf(tag);
            if (index > -1) {
                tags.splice(index, 1);
                const newContent = this.updateFrontmatter(content, tags);
                yield this.app.vault.modify(file, newContent);
            }
        });
    }
    getFrontmatter(content) {
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        return match ? match[1] : '';
    }
    getTags(frontmatter) {
        const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]/);
        if (!tagsMatch)
            return [];
        return tagsMatch[1].split(',').map(tag => tag.trim());
    }
    updateFrontmatter(content, tags) {
        const frontmatter = this.getFrontmatter(content);
        const tagsLine = `tags: [${tags.join(', ')}]`;
        if (frontmatter) {
            const updatedFrontmatter = frontmatter.replace(/tags:.*/, tagsLine);
            return content.replace(/^---\n[\s\S]*?\n---/, `---\n${updatedFrontmatter}\n---`);
        }
        else {
            return `---\n${tagsLine}\n---\n${content}`;
        }
    }
    addFolderTag(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const folderTag = this.getFolderTag(file.path);
            if (folderTag) {
                yield this.addTagToFile(file, folderTag);
            }
        });
    }
    handleNewFile(file) {
        return __awaiter(this, void 0, void 0, function* () {
            // Skip PDF files
            if (file.extension === 'pdf') {
                return;
            }
            const folderTag = this.getFolderTag(file.path);
            if (folderTag) {
                yield this.addTagToFile(file, folderTag);
            }
        });
    }
    handleFileMove(file, oldPath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Skip PDF files
            if (file.extension === 'pdf') {
                return;
            }
            const oldFolderTag = this.getFolderTag(oldPath);
            const newFolderTag = this.getFolderTag(file.path);
            if (oldFolderTag && oldFolderTag !== newFolderTag) {
                yield this.removeTagFromFile(file, oldFolderTag);
            }
            if (newFolderTag) {
                yield this.addTagToFile(file, newFolderTag);
            }
        });
    }
    onunload() {
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
}
class SampleModal extends Modal {
    constructor(app) {
        super(app);
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.setText('Woah!');
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
class SampleSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        new Setting(containerEl)
            .setName('Setting #1')
            .setDesc('It\'s a secret')
            .addText(text => text
            .setPlaceholder('Enter your secret')
            .setValue(this.plugin.settings.mySetting)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.mySetting = value;
            yield this.plugin.saveSettings();
        })));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBZSxZQUFZLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQWlCLE1BQU0sVUFBVSxDQUFDO0FBUXRJLE1BQU0sZ0JBQWdCLEdBQXFCO0lBQzFDLFNBQVMsRUFBRSxTQUFTO0NBQ3BCLENBQUE7QUFFRCx1QkFBdUI7QUFDdkIsU0FBUyxDQUFDLENBQUMsR0FBVyxFQUFFLFNBQWlDLEVBQUU7SUFDMUQsTUFBTSxJQUFJLEdBQUksTUFBYyxDQUFDLElBQUksQ0FBQztJQUNsQyxJQUFJLENBQUMsSUFBSTtRQUFFLE9BQU8sR0FBRyxDQUFDO0lBRXRCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMscUJBQXFCLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDOUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFO1FBQy9DLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDeEMsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRCxzQkFBc0I7QUFDdEIsTUFBTSxpQkFBa0IsU0FBUSxLQUFLO0lBS3BDLFlBQVksR0FBUSxFQUFFLFFBQWtDO1FBQ3ZELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUxaLHNCQUFpQixHQUFrQixJQUFJLENBQUM7UUFDeEMsc0JBQWlCLEdBQWEsRUFBRSxDQUFDO1FBS2hDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0lBQzFCLENBQUM7SUFFRCxNQUFNO1FBQ0wsTUFBTSxF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ZGl0b3IsIE1hcmtkb3duVmlldywgTW9kYWwsIE5vdGljZSwgUGx1Z2luLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nLCBURm9sZGVyLCBURmlsZSwgV29ya3NwYWNlTGVhZiB9IGZyb20gJ29ic2lkaWFuJztcblxuLy8gUmVtZW1iZXIgdG8gcmVuYW1lIHRoZXNlIGNsYXNzZXMgYW5kIGludGVyZmFjZXMhXG5cbmludGVyZmFjZSBNeVBsdWdpblNldHRpbmdzIHtcblx0bXlTZXR0aW5nOiBzdHJpbmc7XG59XG5cbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IE15UGx1Z2luU2V0dGluZ3MgPSB7XG5cdG15U2V0dGluZzogJ2RlZmF1bHQnXG59XG5cbi8vIGkxOG4gaGVscGVyIGZ1bmN0aW9uXG5mdW5jdGlvbiB0KGtleTogc3RyaW5nLCBwYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fSk6IHN0cmluZyB7XG5cdGNvbnN0IGkxOG4gPSAod2luZG93IGFzIGFueSkuaTE4bjtcblx0aWYgKCFpMThuKSByZXR1cm4ga2V5O1xuXHRcblx0bGV0IHRleHQgPSBpMThuLnQoYGZvbGRlci10YWctcGx1Z2luOiR7a2V5fWApO1xuXHRPYmplY3QuZW50cmllcyhwYXJhbXMpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuXHRcdHRleHQgPSB0ZXh0LnJlcGxhY2UoYHske2tleX19YCwgdmFsdWUpO1xuXHR9KTtcblx0cmV0dXJuIHRleHQ7XG59XG5cbi8vIFRhZyBzZWxlY3Rpb24gbW9kYWxcbmNsYXNzIFRhZ1NlbGVjdGlvbk1vZGFsIGV4dGVuZHMgTW9kYWwge1xuXHRzZWxlY3RlZEZvbGRlclRhZzogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cdHNlbGVjdGVkT3RoZXJUYWdzOiBzdHJpbmdbXSA9IFtdO1xuXHRvblN1Ym1pdDogKHRhZ3M6IHN0cmluZ1tdKSA9PiB2b2lkO1xuXG5cdGNvbnN0cnVjdG9yKGFwcDogQXBwLCBvblN1Ym1pdDogKHRhZ3M6IHN0cmluZ1tdKSA9PiB2b2lkKSB7XG5cdFx0c3VwZXIoYXBwKTtcblx0XHR0aGlzLm9uU3VibWl0ID0gb25TdWJtaXQ7XG5cdH1cblxuXHRvbk9wZW4oKSB7XG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG5cdFx0Y29udGVudEVsLmVtcHR5KCk7XG5cblx0XHQvLyBHZXQgZXhpc3RpbmcgdGFnc1xuXHRcdGNvbnN0IGV4aXN0aW5nVGFncyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXHRcdHRoaXMuYXBwLnZhdWx0LmdldEFsbExvYWRlZEZpbGVzKCkuZm9yRWFjaChmaWxlID0+IHtcblx0XHRcdGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcblx0XHRcdFx0Y29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcblx0XHRcdFx0aWYgKGNhY2hlPy50YWdzKSB7XG5cdFx0XHRcdFx0Y2FjaGUudGFncy5mb3JFYWNoKHRhZyA9PiBleGlzdGluZ1RhZ3MuYWRkKHRhZy50YWcuc2xpY2UoMSkpKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ly8gR2V0IGZvbGRlciBuYW1lc1xuXHRcdGNvbnN0IGZvbGRlck5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cdFx0dGhpcy5hcHAudmF1bHQuZ2V0QWxsTG9hZGVkRmlsZXMoKS5mb3JFYWNoKGZpbGUgPT4ge1xuXHRcdFx0aWYgKGZpbGUgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG5cdFx0XHRcdGZvbGRlck5hbWVzLmFkZChmaWxlLm5hbWUpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ly8gQ2xhc3NpZnkgdGFnc1xuXHRcdGNvbnN0IGZvbGRlck1hdGNoaW5nVGFncyA9IEFycmF5LmZyb20oZXhpc3RpbmdUYWdzKS5maWx0ZXIodGFnID0+IGZvbGRlck5hbWVzLmhhcyh0YWcpKTtcblx0XHRjb25zdCBvdGhlclRhZ3MgPSBBcnJheS5mcm9tKGV4aXN0aW5nVGFncykuZmlsdGVyKHRhZyA9PiAhZm9sZGVyTmFtZXMuaGFzKHRhZykpO1xuXG5cdFx0Ly8gQ3JlYXRlIHRhZyBzZWxlY3Rpb24gY29udGFpbmVyXG5cdFx0Y29uc3QgdGFnQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdigndGFnLXNlbGVjdGlvbi1jb250YWluZXInKTtcblx0XHRcblx0XHQvLyBEaXNwbGF5IGZvbGRlci1tYXRjaGluZyB0YWdzXG5cdFx0Y29uc3QgZm9sZGVyVGFnc0NvbnRhaW5lciA9IHRhZ0NvbnRhaW5lci5jcmVhdGVEaXYoJ2ZvbGRlci10YWdzJyk7XG5cdFx0Zm9sZGVyVGFnc0NvbnRhaW5lci5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6IHQoJ2ZvbGRlck1hdGNoaW5nVGFncycpIH0pO1xuXHRcdFxuXHRcdGNvbnN0IGZvbGRlclRhZ0xpc3RFbCA9IGZvbGRlclRhZ3NDb250YWluZXIuY3JlYXRlRGl2KCd0YWctbGlzdCcpO1xuXHRcdGZvbGRlck1hdGNoaW5nVGFncy5mb3JFYWNoKHRhZyA9PiB7XG5cdFx0XHRjb25zdCB0YWdFbCA9IGZvbGRlclRhZ0xpc3RFbC5jcmVhdGVEaXYoJ3RhZy1pdGVtJyk7XG5cdFx0XHR0YWdFbC5jcmVhdGVTcGFuKHsgdGV4dDogYCMke3RhZ31gIH0pO1xuXHRcdFx0Y29uc3QgcmFkaW8gPSB0YWdFbC5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdyYWRpbycgfSk7XG5cdFx0XHRyYWRpby5zZXRBdHRyaWJ1dGUoJ25hbWUnLCAnZm9sZGVyVGFnJyk7XG5cdFx0XHRyYWRpby5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG5cdFx0XHRcdGlmIChyYWRpby5jaGVja2VkKSB7XG5cdFx0XHRcdFx0dGhpcy5zZWxlY3RlZEZvbGRlclRhZyA9IHRhZztcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnNlbGVjdGVkRm9sZGVyVGFnID0gbnVsbDtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cblx0XHQvLyBEaXNwbGF5IG90aGVyIHRhZ3Ncblx0XHRjb25zdCBvdGhlclRhZ3NDb250YWluZXIgPSB0YWdDb250YWluZXIuY3JlYXRlRGl2KCdvdGhlci10YWdzJyk7XG5cdFx0b3RoZXJUYWdzQ29udGFpbmVyLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogdCgnb3RoZXJUYWdzJykgfSk7XG5cdFx0XG5cdFx0Y29uc3Qgb3RoZXJUYWdMaXN0RWwgPSBvdGhlclRhZ3NDb250YWluZXIuY3JlYXRlRGl2KCd0YWctbGlzdCcpO1xuXHRcdG90aGVyVGFncy5mb3JFYWNoKHRhZyA9PiB7XG5cdFx0XHRjb25zdCB0YWdFbCA9IG90aGVyVGFnTGlzdEVsLmNyZWF0ZURpdigndGFnLWl0ZW0nKTtcblx0XHRcdHRhZ0VsLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgIyR7dGFnfWAgfSk7XG5cdFx0XHRjb25zdCBjaGVja2JveCA9IHRhZ0VsLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ2NoZWNrYm94JyB9KTtcblx0XHRcdGNoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcblx0XHRcdFx0aWYgKGNoZWNrYm94LmNoZWNrZWQpIHtcblx0XHRcdFx0XHR0aGlzLnNlbGVjdGVkT3RoZXJUYWdzLnB1c2godGFnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnNlbGVjdGVkT3RoZXJUYWdzID0gdGhpcy5zZWxlY3RlZE90aGVyVGFncy5maWx0ZXIodCA9PiB0ICE9PSB0YWcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdC8vIENyZWF0ZSBuZXcgdGFnIGlucHV0IGNvbnRhaW5lclxuXHRcdGNvbnN0IG5ld1RhZ0NvbnRhaW5lciA9IHRhZ0NvbnRhaW5lci5jcmVhdGVEaXYoJ25ldy10YWcnKTtcblx0XHRuZXdUYWdDb250YWluZXIuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiB0KCduZXdUYWcnKSB9KTtcblx0XHRcblx0XHRjb25zdCBpbnB1dENvbnRhaW5lciA9IG5ld1RhZ0NvbnRhaW5lci5jcmVhdGVEaXYoJ2lucHV0LWNvbnRhaW5lcicpO1xuXHRcdGNvbnN0IGlucHV0ID0gaW5wdXRDb250YWluZXIuY3JlYXRlRWwoJ2lucHV0JywgeyBcblx0XHRcdHR5cGU6ICd0ZXh0Jyxcblx0XHRcdGF0dHI6IHsgcGxhY2Vob2xkZXI6IHQoJ2VudGVyTmV3VGFnJykgfVxuXHRcdH0pO1xuXHRcdGNvbnN0IGFkZEJ1dHRvbiA9IGlucHV0Q29udGFpbmVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6IHQoJ2FkZCcpIH0pO1xuXG5cdFx0Ly8gQ3JlYXRlIGZvbGRlciBjcmVhdGlvbiBvcHRpb24gY29udGFpbmVyXG5cdFx0Y29uc3QgY3JlYXRlRm9sZGVyQ29udGFpbmVyID0gbmV3VGFnQ29udGFpbmVyLmNyZWF0ZURpdignY3JlYXRlLWZvbGRlci1vcHRpb24nKTtcblx0XHRjb25zdCBjcmVhdGVGb2xkZXJDaGVja2JveCA9IGNyZWF0ZUZvbGRlckNvbnRhaW5lci5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdjaGVja2JveCcgfSk7XG5cdFx0Y3JlYXRlRm9sZGVyQ2hlY2tib3guc2V0QXR0cmlidXRlKCdpZCcsICdjcmVhdGVGb2xkZXJDaGVja2JveCcpO1xuXHRcdGNyZWF0ZUZvbGRlckNvbnRhaW5lci5jcmVhdGVFbCgnbGFiZWwnLCB7IHRleHQ6IHQoJ2NyZWF0ZUZvbGRlck9wdGlvbicpLCBhdHRyOiB7IGZvcjogJ2NyZWF0ZUZvbGRlckNoZWNrYm94JyB9IH0pO1xuXG5cdFx0YWRkQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgYXN5bmMgKCkgPT4ge1xuXHRcdFx0Y29uc3QgbmV3VGFnID0gaW5wdXQudmFsdWUudHJpbSgpLnJlcGxhY2UoL14jLywgJycpOyAvLyBSZW1vdmUgI1xuXHRcdFx0aWYgKG5ld1RhZyAmJiAhdGhpcy5zZWxlY3RlZE90aGVyVGFncy5pbmNsdWRlcyhuZXdUYWcpICYmICFmb2xkZXJNYXRjaGluZ1RhZ3MuaW5jbHVkZXMobmV3VGFnKSkge1xuXHRcdFx0XHQvLyBJZiBmb2xkZXIgY3JlYXRpb24gb3B0aW9uIGlzIHNlbGVjdGVkXG5cdFx0XHRcdGlmIChjcmVhdGVGb2xkZXJDaGVja2JveC5jaGVja2VkKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdC8vIENyZWF0ZSBmb2xkZXJcblx0XHRcdFx0XHRcdGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihuZXdUYWcpO1xuXHRcdFx0XHRcdFx0Ly8gQWRkIGFzIGZvbGRlciB0YWdcblx0XHRcdFx0XHRcdHRoaXMuc2VsZWN0ZWRGb2xkZXJUYWcgPSBuZXdUYWc7XG5cdFx0XHRcdFx0XHQvLyBVcGRhdGUgZm9sZGVyIHRhZyByYWRpbyBidXR0b25zXG5cdFx0XHRcdFx0XHRjb25zdCBmb2xkZXJUYWdMaXN0RWwgPSBmb2xkZXJUYWdzQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy50YWctbGlzdCcpO1xuXHRcdFx0XHRcdFx0aWYgKGZvbGRlclRhZ0xpc3RFbCkge1xuXHRcdFx0XHRcdFx0XHRjb25zdCB0YWdFbCA9IGZvbGRlclRhZ0xpc3RFbC5jcmVhdGVEaXYoJ3RhZy1pdGVtJyk7XG5cdFx0XHRcdFx0XHRcdHRhZ0VsLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgIyR7bmV3VGFnfWAgfSk7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHJhZGlvID0gdGFnRWwuY3JlYXRlRWwoJ2lucHV0JywgeyB0eXBlOiAncmFkaW8nIH0pO1xuXHRcdFx0XHRcdFx0XHRyYWRpby5zZXRBdHRyaWJ1dGUoJ25hbWUnLCAnZm9sZGVyVGFnJyk7XG5cdFx0XHRcdFx0XHRcdHJhZGlvLmNoZWNrZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRyYWRpby5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHJhZGlvLmNoZWNrZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuc2VsZWN0ZWRGb2xkZXJUYWcgPSBuZXdUYWc7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuc2VsZWN0ZWRGb2xkZXJUYWcgPSBudWxsO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoJ2NyZWF0ZWRUYWdBbmRGb2xkZXInLCB7IHRhZzogbmV3VGFnLCBmb2xkZXI6IG5ld1RhZyB9KSk7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNyZWF0aW5nIGZvbGRlcjonLCBlcnJvcik7XG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoJ2ZhaWxlZFRvQ3JlYXRlRm9sZGVyJywgeyBmb2xkZXI6IG5ld1RhZyB9KSk7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIEFkZCBhcyBvdGhlciB0YWdcblx0XHRcdFx0XHR0aGlzLnNlbGVjdGVkT3RoZXJUYWdzLnB1c2gobmV3VGFnKTtcblx0XHRcdFx0XHQvLyBVcGRhdGUgb3RoZXIgdGFncyBjaGVja2JveGVzXG5cdFx0XHRcdFx0Y29uc3Qgb3RoZXJUYWdMaXN0RWwgPSBvdGhlclRhZ3NDb250YWluZXIucXVlcnlTZWxlY3RvcignLnRhZy1saXN0Jyk7XG5cdFx0XHRcdFx0aWYgKG90aGVyVGFnTGlzdEVsKSB7XG5cdFx0XHRcdFx0XHRjb25zdCB0YWdFbCA9IG90aGVyVGFnTGlzdEVsLmNyZWF0ZURpdigndGFnLWl0ZW0nKTtcblx0XHRcdFx0XHRcdHRhZ0VsLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgIyR7bmV3VGFnfWAgfSk7XG5cdFx0XHRcdFx0XHRjb25zdCBjaGVja2JveCA9IHRhZ0VsLmNyZWF0ZUVsKCdpbnB1dCcsIHsgdHlwZTogJ2NoZWNrYm94JyB9KTtcblx0XHRcdFx0XHRcdGNoZWNrYm94LmNoZWNrZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0Y2hlY2tib3guYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRpZiAoY2hlY2tib3guY2hlY2tlZCkge1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuc2VsZWN0ZWRPdGhlclRhZ3MucHVzaChuZXdUYWcpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuc2VsZWN0ZWRPdGhlclRhZ3MgPSB0aGlzLnNlbGVjdGVkT3RoZXJUYWdzLmZpbHRlcih0ID0+IHQgIT09IG5ld1RhZyk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRuZXcgTm90aWNlKHQoJ2FkZGVkVGFnJywgeyB0YWc6IG5ld1RhZyB9KSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aW5wdXQudmFsdWUgPSAnJztcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIFN1Ym1pdCBidXR0b25cblx0XHRjb25zdCBzdWJtaXRCdXR0b25Db250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KCdtb2RhbC1idXR0b24tY29udGFpbmVyJyk7XG5cdFx0Y29uc3Qgc3VibWl0QnV0dG9uID0gc3VibWl0QnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6IHQoJ2FwcGx5VGFncycpIH0pO1xuXHRcdHN1Ym1pdEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdC8vIENvbWJpbmUgc2VsZWN0ZWQgdGFnc1xuXHRcdFx0Y29uc3Qgc2VsZWN0ZWRUYWdzID0gW1xuXHRcdFx0XHQuLi4odGhpcy5zZWxlY3RlZEZvbGRlclRhZyA/IFt0aGlzLnNlbGVjdGVkRm9sZGVyVGFnXSA6IFtdKSxcblx0XHRcdFx0Li4udGhpcy5zZWxlY3RlZE90aGVyVGFncy5maWx0ZXIodGFnID0+IHRhZy50cmltKCkgIT09ICcnKVxuXHRcdFx0XTtcblx0XHRcdFxuXHRcdFx0dGhpcy5vblN1Ym1pdChzZWxlY3RlZFRhZ3MpO1xuXHRcdFx0dGhpcy5jbG9zZSgpO1xuXHRcdH0pO1xuXHR9XG5cblx0b25DbG9zZSgpIHtcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBGb2xkZXJUYWdQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuXHRzZXR0aW5nczogTXlQbHVnaW5TZXR0aW5ncztcblxuXHRhc3luYyBvbmxvYWQoKSB7XG5cdFx0Ly8gRGVsYXkgcGx1Z2luIGluaXRpYWxpemF0aW9uXG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHR0aGlzLmluaXRpYWxpemVQbHVnaW4oKTtcblx0XHR9LCAyMDAwKTsgLy8gSW5pdGlhbGl6ZSBhZnRlciAyIHNlY29uZHNcblx0fVxuXG5cdHByaXZhdGUgYXN5bmMgaW5pdGlhbGl6ZVBsdWdpbigpIHtcblx0XHQvLyBMb2FkIHNldHRpbmdzXG5cdFx0YXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcblxuXHRcdC8vIEFkZCBjb21tYW5kc1xuXHRcdHRoaXMuYWRkQ29tbWFuZCh7XG5cdFx0XHRpZDogJ2FkZC1mb2xkZXItdGFnJyxcblx0XHRcdG5hbWU6ICdBZGQgRm9sZGVyIFRhZycsXG5cdFx0XHRjYWxsYmFjazogKCkgPT4ge1xuXHRcdFx0XHRjb25zdCBhY3RpdmVGaWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcblx0XHRcdFx0aWYgKGFjdGl2ZUZpbGUpIHtcblx0XHRcdFx0XHRpZiAoYWN0aXZlRmlsZS5leHRlbnNpb24gPT09ICdwZGYnKSB7XG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoJ3BkZk5vdFN1cHBvcnRlZCcpKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy5hZGRGb2xkZXJUYWcoYWN0aXZlRmlsZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIE1vbml0b3IgZmlsZSBjcmVhdGlvbiBldmVudHNcblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQoXG5cdFx0XHR0aGlzLmFwcC52YXVsdC5vbignY3JlYXRlJywgKGZpbGU6IFRGaWxlKSA9PiB7XG5cdFx0XHRcdGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcblx0XHRcdFx0XHR0aGlzLmhhbmRsZU5ld0ZpbGUoZmlsZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0KTtcblxuXHRcdC8vIE1vbml0b3IgZmlsZSBtb3ZlIGV2ZW50c1xuXHRcdHRoaXMucmVnaXN0ZXJFdmVudChcblx0XHRcdHRoaXMuYXBwLnZhdWx0Lm9uKCdyZW5hbWUnLCAoZmlsZTogVEZpbGUsIG9sZFBhdGg6IHN0cmluZykgPT4ge1xuXHRcdFx0XHRpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG5cdFx0XHRcdFx0dGhpcy5oYW5kbGVGaWxlTW92ZShmaWxlLCBvbGRQYXRoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHQpO1xuXG5cdFx0Ly8gQWRkIHNldHRpbmdzIHRhYlxuXHRcdHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgU2FtcGxlU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xuXG5cdFx0Ly8gVGhpcyBjcmVhdGVzIGFuIGljb24gaW4gdGhlIGxlZnQgcmliYm9uLlxuXHRcdGNvbnN0IHJpYmJvbkljb25FbCA9IHRoaXMuYWRkUmliYm9uSWNvbignZGljZScsICdTYW1wbGUgUGx1Z2luJywgKGV2dDogTW91c2VFdmVudCkgPT4ge1xuXHRcdFx0Ly8gQ2FsbGVkIHdoZW4gdGhlIHVzZXIgY2xpY2tzIHRoZSBpY29uLlxuXHRcdFx0bmV3IE5vdGljZSgnVGhpcyBpcyBhIG5vdGljZSEnKTtcblx0XHR9KTtcblx0XHQvLyBQZXJmb3JtIGFkZGl0aW9uYWwgdGhpbmdzIHdpdGggdGhlIHJpYmJvblxuXHRcdHJpYmJvbkljb25FbC5hZGRDbGFzcygnbXktcGx1Z2luLXJpYmJvbi1jbGFzcycpO1xuXG5cdFx0Ly8gVGhpcyBhZGRzIGEgc3RhdHVzIGJhciBpdGVtIHRvIHRoZSBib3R0b20gb2YgdGhlIGFwcC4gRG9lcyBub3Qgd29yayBvbiBtb2JpbGUgYXBwcy5cblx0XHRjb25zdCBzdGF0dXNCYXJJdGVtRWwgPSB0aGlzLmFkZFN0YXR1c0Jhckl0ZW0oKTtcblx0XHRzdGF0dXNCYXJJdGVtRWwuc2V0VGV4dCgnU3RhdHVzIEJhciBUZXh0Jyk7XG5cblx0XHQvLyBUaGlzIGFkZHMgYSBzaW1wbGUgY29tbWFuZCB0aGF0IGNhbiBiZSB0cmlnZ2VyZWQgYW55d2hlcmVcblx0XHR0aGlzLmFkZENvbW1hbmQoe1xuXHRcdFx0aWQ6ICdvcGVuLXNhbXBsZS1tb2RhbC1zaW1wbGUnLFxuXHRcdFx0bmFtZTogJ09wZW4gc2FtcGxlIG1vZGFsIChzaW1wbGUpJyxcblx0XHRcdGNhbGxiYWNrOiAoKSA9PiB7XG5cdFx0XHRcdG5ldyBTYW1wbGVNb2RhbCh0aGlzLmFwcCkub3BlbigpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdC8vIFRoaXMgYWRkcyBhbiBlZGl0b3IgY29tbWFuZCB0aGF0IGNhbiBwZXJmb3JtIHNvbWUgb3BlcmF0aW9uIG9uIHRoZSBjdXJyZW50IGVkaXRvciBpbnN0YW5jZVxuXHRcdHRoaXMuYWRkQ29tbWFuZCh7XG5cdFx0XHRpZDogJ3NhbXBsZS1lZGl0b3ItY29tbWFuZCcsXG5cdFx0XHRuYW1lOiAnU2FtcGxlIGVkaXRvciBjb21tYW5kJyxcblx0XHRcdGVkaXRvckNhbGxiYWNrOiAoZWRpdG9yOiBFZGl0b3IsIHZpZXc6IE1hcmtkb3duVmlldykgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhlZGl0b3IuZ2V0U2VsZWN0aW9uKCkpO1xuXHRcdFx0XHRlZGl0b3IucmVwbGFjZVNlbGVjdGlvbignU2FtcGxlIEVkaXRvciBDb21tYW5kJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Ly8gVGhpcyBhZGRzIGEgY29tcGxleCBjb21tYW5kIHRoYXQgY2FuIGNoZWNrIHdoZXRoZXIgdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIGFwcCBhbGxvd3MgZXhlY3V0aW9uIG9mIHRoZSBjb21tYW5kXG5cdFx0dGhpcy5hZGRDb21tYW5kKHtcblx0XHRcdGlkOiAnb3Blbi1zYW1wbGUtbW9kYWwtY29tcGxleCcsXG5cdFx0XHRuYW1lOiAnT3BlbiBzYW1wbGUgbW9kYWwgKGNvbXBsZXgpJyxcblx0XHRcdGNoZWNrQ2FsbGJhY2s6IChjaGVja2luZzogYm9vbGVhbikgPT4ge1xuXHRcdFx0XHQvLyBDb25kaXRpb25zIHRvIGNoZWNrXG5cdFx0XHRcdGNvbnN0IG1hcmtkb3duVmlldyA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVWaWV3T2ZUeXBlKE1hcmtkb3duVmlldyk7XG5cdFx0XHRcdGlmIChtYXJrZG93blZpZXcpIHtcblx0XHRcdFx0XHQvLyBJZiBjaGVja2luZyBpcyB0cnVlLCB3ZSdyZSBzaW1wbHkgXCJjaGVja2luZ1wiIGlmIHRoZSBjb21tYW5kIGNhbiBiZSBydW4uXG5cdFx0XHRcdFx0Ly8gSWYgY2hlY2tpbmcgaXMgZmFsc2UsIHRoZW4gd2Ugd2FudCB0byBhY3R1YWxseSBwZXJmb3JtIHRoZSBvcGVyYXRpb24uXG5cdFx0XHRcdFx0aWYgKCFjaGVja2luZykge1xuXHRcdFx0XHRcdFx0bmV3IFNhbXBsZU1vZGFsKHRoaXMuYXBwKS5vcGVuKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gVGhpcyBjb21tYW5kIHdpbGwgb25seSBzaG93IHVwIGluIENvbW1hbmQgUGFsZXR0ZSB3aGVuIHRoZSBjaGVjayBmdW5jdGlvbiByZXR1cm5zIHRydWVcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ly8gVGhpcyBhZGRzIGEgY29tbWFuZCB0byBsaXN0IGFsbCBmb2xkZXJzIGluIHRoZSB2YXVsdFxuXHRcdHRoaXMuYWRkQ29tbWFuZCh7XG5cdFx0XHRpZDogJ2xpc3QtdmF1bHQtZm9sZGVycycsXG5cdFx0XHRuYW1lOiAnTGlzdCBhbGwgZm9sZGVycyBpbiB2YXVsdCcsXG5cdFx0XHRjYWxsYmFjazogKCkgPT4ge1xuXHRcdFx0XHRjb25zdCBmaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldEFsbExvYWRlZEZpbGVzKCk7XG5cdFx0XHRcdGNvbnN0IGZvbGRlcnMgPSBmaWxlcy5maWx0ZXIoKGZpbGUpOiBmaWxlIGlzIFRGb2xkZXIgPT4gZmlsZSBpbnN0YW5jZW9mIFRGb2xkZXIpO1xuXHRcdFx0XHRcblx0XHRcdFx0bmV3IE5vdGljZSh0KCdmb3VuZEZvbGRlcnMnLCB7IFxuXHRcdFx0XHRcdGNvdW50OiBmb2xkZXJzLmxlbmd0aC50b1N0cmluZygpLFxuXHRcdFx0XHRcdGZvbGRlcnM6IGZvbGRlcnMubWFwKGZvbGRlciA9PiBmb2xkZXIucGF0aCkuam9pbignXFxuJylcblx0XHRcdFx0fSkpO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc29sZS5sb2coJ1ZhdWx0IGZvbGRlcnM6JywgZm9sZGVycyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyBJZiB0aGUgcGx1Z2luIGhvb2tzIHVwIGFueSBnbG9iYWwgRE9NIGV2ZW50cyAob24gcGFydHMgb2YgdGhlIGFwcCB0aGF0IGRvZXNuJ3QgYmVsb25nIHRvIHRoaXMgcGx1Z2luKVxuXHRcdC8vIFVzaW5nIHRoaXMgZnVuY3Rpb24gd2lsbCBhdXRvbWF0aWNhbGx5IHJlbW92ZSB0aGUgZXZlbnQgbGlzdGVuZXIgd2hlbiB0aGlzIHBsdWdpbiBpcyBkaXNhYmxlZC5cblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZG9jdW1lbnQsICdjbGljaycsIChldnQ6IE1vdXNlRXZlbnQpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdjbGljaycsIGV2dCk7XG5cdFx0fSk7XG5cblx0XHQvLyBXaGVuIHJlZ2lzdGVyaW5nIGludGVydmFscywgdGhpcyBmdW5jdGlvbiB3aWxsIGF1dG9tYXRpY2FsbHkgY2xlYXIgdGhlIGludGVydmFsIHdoZW4gdGhlIHBsdWdpbiBpcyBkaXNhYmxlZC5cblx0XHR0aGlzLnJlZ2lzdGVySW50ZXJ2YWwod2luZG93LnNldEludGVydmFsKCgpID0+IGNvbnNvbGUubG9nKCdzZXRJbnRlcnZhbCcpLCA1ICogNjAgKiAxMDAwKSk7XG5cblx0XHQvLyBGaWxlIHRhZ2dpbmcgZnVuY3Rpb25cblx0XHRjb25zdCBhcHBlbmRUYWdzVG9GaWxlID0gYXN5bmMgKGZpbGU6IFRGaWxlLCB0YWdzOiBzdHJpbmdbXSkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Ly8gUmVhZCBmaWxlIGNvbnRlbnRcblx0XHRcdFx0Y29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBBZGQgbmV3IHRhZ3MgKGV4Y2x1ZGluZyAjKVxuXHRcdFx0XHRjb25zdCBuZXdUYWdzID0gdGFncy5maWx0ZXIodGFnID0+IHtcblx0XHRcdFx0XHQvLyBSZW1vdmUgIyBmb3IgY29tcGFyaXNvblxuXHRcdFx0XHRcdGNvbnN0IHRhZ1dpdGhvdXRIYXNoID0gdGFnLnJlcGxhY2UoL14jLywgJycpO1xuXHRcdFx0XHRcdHJldHVybiAhY29udGVudC5tYXRjaChuZXcgUmVnRXhwKGAjJHt0YWdXaXRob3V0SGFzaH1cXFxcYmApKTtcblx0XHRcdFx0fSkubWFwKHRhZyA9PiB0YWcucmVwbGFjZSgvXiMvLCAnJykpOyAvLyBSZW1vdmUgIyBmcm9tIGFsbCB0YWdzXG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAobmV3VGFncy5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnTm8gbmV3IHRhZ3MgdG8gYWRkJyk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQWRkIHRhZ3MgKHByZXBlbmQgdG8gZmlsZSBjb250ZW50KVxuXHRcdFx0XHRjb25zdCBuZXdDb250ZW50ID0gYCR7bmV3VGFncy5tYXAodGFnID0+IGAjJHt0YWd9YCkuam9pbignICcpfVxcblxcbiR7Y29udGVudH1gO1xuXHRcdFx0XHRcblx0XHRcdFx0Ly8gVXBkYXRlIGZpbGVcblx0XHRcdFx0YXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGZpbGUsIG5ld0NvbnRlbnQpO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc29sZS5sb2coYEFkZGVkIHRhZ3MgJHtuZXdUYWdzLm1hcCh0YWcgPT4gYCMke3RhZ31gKS5qb2luKCcsICcpfSB0byBmaWxlOiAke2ZpbGUucGF0aH1gKTtcblxuXHRcdFx0XHQvLyBSZWZyZXNoIGdyYXBoIHZpZXdcblx0XHRcdFx0dGhpcy5hcHAud29ya3NwYWNlLnRyaWdnZXIoJ2ZpbGUtY2hhbmdlJywgZmlsZSk7XG5cdFx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZS50cmlnZ2VyKCdncmFwaDpyZWZyZXNoJyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zb2xlLmxvZygnR3JhcGggdmlldyByZWZyZXNoZWQnKTtcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGFwcGVuZGluZyB0YWdzIHRvIGZpbGU6JywgZXJyb3IpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvLyBGb2xkZXIgdGFnZ2luZyBmdW5jdGlvblxuXHRcdGNvbnN0IGFkZEZvbGRlclRhZ3NUb0FsbEZpbGVzID0gYXN5bmMgKGZvbGRlcjogVEZvbGRlcikgPT4ge1xuXHRcdFx0Y29uc3QgZmlsZXMgPSBmb2xkZXIuY2hpbGRyZW4uZmlsdGVyKChmaWxlKTogZmlsZSBpcyBURmlsZSA9PiBmaWxlIGluc3RhbmNlb2YgVEZpbGUpO1xuXHRcdFx0bGV0IHByb2Nlc3NlZENvdW50ID0gMDtcblx0XHRcdGxldCBza2lwcGVkQ291bnQgPSAwO1xuXG5cdFx0XHRmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKTtcblx0XHRcdFx0XHRpZiAoIWNvbnRlbnQuaW5jbHVkZXMoYCMke2ZvbGRlci5uYW1lfWApKSB7XG5cdFx0XHRcdFx0XHRhd2FpdCBhcHBlbmRUYWdzVG9GaWxlKGZpbGUsIFtmb2xkZXIubmFtZV0pO1xuXHRcdFx0XHRcdFx0cHJvY2Vzc2VkQ291bnQrKztcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0c2tpcHBlZENvdW50Kys7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoYEVycm9yIHByb2Nlc3NpbmcgZmlsZSAke2ZpbGUucGF0aH06YCwgZXJyb3IpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB7IHByb2Nlc3NlZENvdW50LCBza2lwcGVkQ291bnQgfTtcblx0XHR9O1xuXG5cdFx0Ly8gQ29tbWFuZCB0byBhZGQgdGFnIHRvIHBhcmVudCBmb2xkZXIgb2YgY3VycmVudCBmaWxlXG5cdFx0dGhpcy5hZGRDb21tYW5kKHtcblx0XHRcdGlkOiAnYWRkLWZvbGRlci10YWctdG8tY3VycmVudC1maWxlJyxcblx0XHRcdG5hbWU6ICdBZGQgcGFyZW50IGZvbGRlciB0YWcgdG8gY3VycmVudCBmaWxlJyxcblx0XHRcdGNhbGxiYWNrOiAoKSA9PiB7XG5cdFx0XHRcdGNvbnN0IGZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuXHRcdFx0XHRpZiAoZmlsZSAmJiBmaWxlLnBhcmVudCkge1xuXHRcdFx0XHRcdGFwcGVuZFRhZ3NUb0ZpbGUoZmlsZSwgW2ZpbGUucGFyZW50Lm5hbWVdKTtcblx0XHRcdFx0XHRuZXcgTm90aWNlKGBBZGRlZCB0YWcgIyR7ZmlsZS5wYXJlbnQubmFtZX0gdG8gY3VycmVudCBmaWxlYCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0bmV3IE5vdGljZSgnTm8gZmlsZSBpcyBjdXJyZW50bHkgb3BlbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyBDb21tYW5kIHRvIGFkZCB0YWcgdG8gYWxsIGZpbGVzIGluIGN1cnJlbnQgZm9sZGVyXG5cdFx0dGhpcy5hZGRDb21tYW5kKHtcblx0XHRcdGlkOiAnYWRkLWZvbGRlci10YWdzLXRvLWFsbC1maWxlcycsXG5cdFx0XHRuYW1lOiAnQWRkIGZvbGRlciB0YWcgdG8gYWxsIGZpbGVzIGluIGN1cnJlbnQgZm9sZGVyJyxcblx0XHRcdGNhbGxiYWNrOiAoKSA9PiB7XG5cdFx0XHRcdGNvbnN0IGZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuXHRcdFx0XHRpZiAoZmlsZSAmJiBmaWxlLnBhcmVudCBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcblx0XHRcdFx0XHRhZGRGb2xkZXJUYWdzVG9BbGxGaWxlcyhmaWxlLnBhcmVudCkudGhlbigoeyBwcm9jZXNzZWRDb3VudCwgc2tpcHBlZENvdW50IH0pID0+IHtcblx0XHRcdFx0XHRcdG5ldyBOb3RpY2UoYEFkZGVkIGZvbGRlciB0YWdzIHRvICR7cHJvY2Vzc2VkQ291bnR9IGZpbGVzICgke3NraXBwZWRDb3VudH0gZmlsZXMgYWxyZWFkeSBoYWQgdGhlIHRhZylgKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRuZXcgTm90aWNlKCdObyBmaWxlIGlzIGN1cnJlbnRseSBvcGVuIGluIGEgZm9sZGVyJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIEZpbGUgbW92aW5nIGZ1bmN0aW9uXG5cdFx0Y29uc3QgbW92ZUZpbGVUb1RhZ0ZvbGRlciA9IGFzeW5jIChmaWxlOiBURmlsZSwgdGFnOiBzdHJpbmcpID0+IHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGNvbnN0IHRhZ1dpdGhvdXRIYXNoID0gdGFnLnJlcGxhY2UoL14jLywgJycpO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgdGFyZ2V0Rm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWxsTG9hZGVkRmlsZXMoKS5maW5kKFxuXHRcdFx0XHRcdChmKTogZiBpcyBURm9sZGVyID0+IGYgaW5zdGFuY2VvZiBURm9sZGVyICYmIGYubmFtZSA9PT0gdGFnV2l0aG91dEhhc2hcblx0XHRcdFx0KTtcblxuXHRcdFx0XHRpZiAodGFyZ2V0Rm9sZGVyKSB7XG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZShmaWxlLCBgJHt0YXJnZXRGb2xkZXIucGF0aH0vJHtmaWxlLm5hbWV9YCk7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coYE1vdmVkIGZpbGUgJHtmaWxlLnBhdGh9IHRvIGZvbGRlciAke3RhcmdldEZvbGRlci5wYXRofWApO1xuXHRcdFx0XHRcdG5ldyBOb3RpY2UodCgnbW92ZWRGaWxlVG9Gb2xkZXInLCB7IHRhZzogdGFnV2l0aG91dEhhc2ggfSkpO1xuXG5cdFx0XHRcdFx0dGhpcy5hcHAud29ya3NwYWNlLnRyaWdnZXIoJ2ZpbGUtY2hhbmdlJywgZmlsZSk7XG5cdFx0XHRcdFx0dGhpcy5hcHAud29ya3NwYWNlLnRyaWdnZXIoJ2dyYXBoOnJlZnJlc2gnKTtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnR3JhcGggdmlldyByZWZyZXNoZWQgYWZ0ZXIgZmlsZSBtb3ZlbWVudCcpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKGBObyBmb2xkZXIgZm91bmQgbWF0Y2hpbmcgdGFnOiAke3RhZ1dpdGhvdXRIYXNofWApO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKCdFcnJvciBtb3ZpbmcgZmlsZSB0byB0YWcgZm9sZGVyOicsIGVycm9yKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Ly8gRmlsZSBjcmVhdGlvbiBldmVudCBoYW5kbGVyXG5cdFx0dGhpcy5yZWdpc3RlckV2ZW50KFxuXHRcdFx0dGhpcy5hcHAudmF1bHQub24oJ2NyZWF0ZScsIChmaWxlKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdWYXVsdCBjcmVhdGUgZXZlbnQgdHJpZ2dlcmVkOicsIGZpbGUucGF0aCk7XG5cdFx0XHRcdGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcblx0XHRcdFx0XHRjb25zdCBmb2xkZXIgPSBmaWxlLnBhcmVudDtcblx0XHRcdFx0XHRpZiAoZm9sZGVyKSB7XG5cdFx0XHRcdFx0XHRuZXcgTm90aWNlKHQoJ25ld0ZpbGVDcmVhdGVkJywgeyBcblx0XHRcdFx0XHRcdFx0cGF0aDogZmlsZS5wYXRoLFxuXHRcdFx0XHRcdFx0XHRmb2xkZXI6IGZvbGRlci5wYXRoIFxuXHRcdFx0XHRcdFx0fSkpO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnTmV3IGZpbGUgY3JlYXRlZCAoY3JlYXRlIGV2ZW50KTonLCB7XG5cdFx0XHRcdFx0XHRcdGZpbGVOYW1lOiBmaWxlLm5hbWUsXG5cdFx0XHRcdFx0XHRcdGZpbGVQYXRoOiBmaWxlLnBhdGgsXG5cdFx0XHRcdFx0XHRcdGZvbGRlck5hbWU6IGZvbGRlci5uYW1lLFxuXHRcdFx0XHRcdFx0XHRmb2xkZXJQYXRoOiBmb2xkZXIucGF0aCxcblx0XHRcdFx0XHRcdFx0Y3JlYXRpb25UaW1lOiBmaWxlLnN0YXQuY3RpbWUsXG5cdFx0XHRcdFx0XHRcdG1vZGlmaWNhdGlvblRpbWU6IGZpbGUuc3RhdC5tdGltZVxuXHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdG5ldyBUYWdTZWxlY3Rpb25Nb2RhbCh0aGlzLmFwcCwgYXN5bmMgKHNlbGVjdGVkVGFncykgPT4ge1xuXHRcdFx0XHRcdFx0XHRjb25zdCB2YWxpZFRhZ3MgPSBbLi4ubmV3IFNldChzZWxlY3RlZFRhZ3MuZmlsdGVyKHRhZyA9PiB0YWcudHJpbSgpICE9PSAnJykpXTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdGlmIChmb2xkZXIubmFtZS50cmltKCkgIT09ICcnKSB7XG5cdFx0XHRcdFx0XHRcdFx0dmFsaWRUYWdzLnB1c2goZm9sZGVyLm5hbWUpO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0aWYgKHZhbGlkVGFncy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0XHRcdFx0YXdhaXQgYXBwZW5kVGFnc1RvRmlsZShmaWxlLCB2YWxpZFRhZ3MpO1xuXHRcdFx0XHRcdFx0XHRcdG5ldyBOb3RpY2UodCgnYWRkZWRUYWdzJywgeyBcblx0XHRcdFx0XHRcdFx0XHRcdHRhZ3M6IHZhbGlkVGFncy5tYXAodGFnID0+IGAjJHt0YWd9YCkuam9pbignLCAnKSBcblx0XHRcdFx0XHRcdFx0XHR9KSk7XG5cblx0XHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IHRhZyBvZiB2YWxpZFRhZ3MpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGF3YWl0IG1vdmVGaWxlVG9UYWdGb2xkZXIoZmlsZSwgdGFnKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHR0aGlzLmFwcC53b3Jrc3BhY2UudHJpZ2dlcignZmlsZS1jaGFuZ2UnLCBmaWxlKTtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmFwcC53b3Jrc3BhY2UudHJpZ2dlcignZ3JhcGg6cmVmcmVzaCcpO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdHcmFwaCB2aWV3IHJlZnJlc2hlZCBhZnRlciB0YWcgb3BlcmF0aW9ucycpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KS5vcGVuKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdCk7XG5cblx0XHQvLyBGaWxlIG9wZW4gZXZlbnQgaGFuZGxlclxuXHRcdHRoaXMucmVnaXN0ZXJFdmVudChcblx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZS5vbignZmlsZS1vcGVuJywgKGZpbGUpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1dvcmtzcGFjZSBmaWxlLW9wZW4gZXZlbnQgdHJpZ2dlcmVkOicsIGZpbGU/LnBhdGgpO1xuXHRcdFx0XHRpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG5cdFx0XHRcdFx0Y29uc3QgZm9sZGVyID0gZmlsZS5wYXJlbnQ7XG5cdFx0XHRcdFx0aWYgKGZvbGRlcikge1xuXHRcdFx0XHRcdFx0Ly8gT3V0cHV0IGRldGFpbHMgdG8gY29uc29sZVxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ0ZpbGUgb3BlbmVkOicsIHtcblx0XHRcdFx0XHRcdFx0ZmlsZU5hbWU6IGZpbGUubmFtZSxcblx0XHRcdFx0XHRcdFx0ZmlsZVBhdGg6IGZpbGUucGF0aCxcblx0XHRcdFx0XHRcdFx0Zm9sZGVyTmFtZTogZm9sZGVyLm5hbWUsXG5cdFx0XHRcdFx0XHRcdGZvbGRlclBhdGg6IGZvbGRlci5wYXRoLFxuXHRcdFx0XHRcdFx0XHRjcmVhdGlvblRpbWU6IGZpbGUuc3RhdC5jdGltZSxcblx0XHRcdFx0XHRcdFx0bW9kaWZpY2F0aW9uVGltZTogZmlsZS5zdGF0Lm10aW1lXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0KTtcblx0fVxuXG5cdHByaXZhdGUgZ2V0Rm9sZGVyVGFnKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcblx0XHRjb25zdCBwYXRoUGFydHMgPSBmaWxlUGF0aC5zcGxpdCgnLycpO1xuXHRcdGlmIChwYXRoUGFydHMubGVuZ3RoID4gMSkge1xuXHRcdFx0cmV0dXJuIHBhdGhQYXJ0c1twYXRoUGFydHMubGVuZ3RoIC0gMl07XG5cdFx0fVxuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cblx0cHJpdmF0ZSBhc3luYyBhZGRUYWdUb0ZpbGUoZmlsZTogVEZpbGUsIHRhZzogc3RyaW5nKSB7XG5cdFx0Y29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG5cdFx0Y29uc3QgZnJvbnRtYXR0ZXIgPSB0aGlzLmdldEZyb250bWF0dGVyKGNvbnRlbnQpO1xuXHRcdGNvbnN0IHRhZ3MgPSB0aGlzLmdldFRhZ3MoZnJvbnRtYXR0ZXIpO1xuXG5cdFx0aWYgKCF0YWdzLmluY2x1ZGVzKHRhZykpIHtcblx0XHRcdHRhZ3MucHVzaCh0YWcpO1xuXHRcdFx0Y29uc3QgbmV3Q29udGVudCA9IHRoaXMudXBkYXRlRnJvbnRtYXR0ZXIoY29udGVudCwgdGFncyk7XG5cdFx0XHRhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkoZmlsZSwgbmV3Q29udGVudCk7XG5cdFx0fVxuXHR9XG5cblx0cHJpdmF0ZSBhc3luYyByZW1vdmVUYWdGcm9tRmlsZShmaWxlOiBURmlsZSwgdGFnOiBzdHJpbmcpIHtcblx0XHRjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKTtcblx0XHRjb25zdCBmcm9udG1hdHRlciA9IHRoaXMuZ2V0RnJvbnRtYXR0ZXIoY29udGVudCk7XG5cdFx0Y29uc3QgdGFncyA9IHRoaXMuZ2V0VGFncyhmcm9udG1hdHRlcik7XG5cblx0XHRjb25zdCBpbmRleCA9IHRhZ3MuaW5kZXhPZih0YWcpO1xuXHRcdGlmIChpbmRleCA+IC0xKSB7XG5cdFx0XHR0YWdzLnNwbGljZShpbmRleCwgMSk7XG5cdFx0XHRjb25zdCBuZXdDb250ZW50ID0gdGhpcy51cGRhdGVGcm9udG1hdHRlcihjb250ZW50LCB0YWdzKTtcblx0XHRcdGF3YWl0IHRoaXMuYXBwLnZhdWx0Lm1vZGlmeShmaWxlLCBuZXdDb250ZW50KTtcblx0XHR9XG5cdH1cblxuXHRwcml2YXRlIGdldEZyb250bWF0dGVyKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XG5cdFx0Y29uc3QgbWF0Y2ggPSBjb250ZW50Lm1hdGNoKC9eLS0tXFxuKFtcXHNcXFNdKj8pXFxuLS0tLyk7XG5cdFx0cmV0dXJuIG1hdGNoID8gbWF0Y2hbMV0gOiAnJztcblx0fVxuXG5cdHByaXZhdGUgZ2V0VGFncyhmcm9udG1hdHRlcjogc3RyaW5nKTogc3RyaW5nW10ge1xuXHRcdGNvbnN0IHRhZ3NNYXRjaCA9IGZyb250bWF0dGVyLm1hdGNoKC90YWdzOlxccypcXFsoLio/KVxcXS8pO1xuXHRcdGlmICghdGFnc01hdGNoKSByZXR1cm4gW107XG5cdFx0cmV0dXJuIHRhZ3NNYXRjaFsxXS5zcGxpdCgnLCcpLm1hcCh0YWcgPT4gdGFnLnRyaW0oKSk7XG5cdH1cblxuXHRwcml2YXRlIHVwZGF0ZUZyb250bWF0dGVyKGNvbnRlbnQ6IHN0cmluZywgdGFnczogc3RyaW5nW10pOiBzdHJpbmcge1xuXHRcdGNvbnN0IGZyb250bWF0dGVyID0gdGhpcy5nZXRGcm9udG1hdHRlcihjb250ZW50KTtcblx0XHRjb25zdCB0YWdzTGluZSA9IGB0YWdzOiBbJHt0YWdzLmpvaW4oJywgJyl9XWA7XG5cdFx0XG5cdFx0aWYgKGZyb250bWF0dGVyKSB7XG5cdFx0XHRjb25zdCB1cGRhdGVkRnJvbnRtYXR0ZXIgPSBmcm9udG1hdHRlci5yZXBsYWNlKC90YWdzOi4qLywgdGFnc0xpbmUpO1xuXHRcdFx0cmV0dXJuIGNvbnRlbnQucmVwbGFjZSgvXi0tLVxcbltcXHNcXFNdKj9cXG4tLS0vLCBgLS0tXFxuJHt1cGRhdGVkRnJvbnRtYXR0ZXJ9XFxuLS0tYCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBgLS0tXFxuJHt0YWdzTGluZX1cXG4tLS1cXG4ke2NvbnRlbnR9YDtcblx0XHR9XG5cdH1cblxuXHRwcml2YXRlIGFzeW5jIGFkZEZvbGRlclRhZyhmaWxlOiBURmlsZSkge1xuXHRcdGNvbnN0IGZvbGRlclRhZyA9IHRoaXMuZ2V0Rm9sZGVyVGFnKGZpbGUucGF0aCk7XG5cdFx0aWYgKGZvbGRlclRhZykge1xuXHRcdFx0YXdhaXQgdGhpcy5hZGRUYWdUb0ZpbGUoZmlsZSwgZm9sZGVyVGFnKTtcblx0XHR9XG5cdH1cblxuXHRwcml2YXRlIGFzeW5jIGhhbmRsZU5ld0ZpbGUoZmlsZTogVEZpbGUpIHtcblx0XHQvLyBTa2lwIFBERiBmaWxlc1xuXHRcdGlmIChmaWxlLmV4dGVuc2lvbiA9PT0gJ3BkZicpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3QgZm9sZGVyVGFnID0gdGhpcy5nZXRGb2xkZXJUYWcoZmlsZS5wYXRoKTtcblx0XHRpZiAoZm9sZGVyVGFnKSB7XG5cdFx0XHRhd2FpdCB0aGlzLmFkZFRhZ1RvRmlsZShmaWxlLCBmb2xkZXJUYWcpO1xuXHRcdH1cblx0fVxuXG5cdHByaXZhdGUgYXN5bmMgaGFuZGxlRmlsZU1vdmUoZmlsZTogVEZpbGUsIG9sZFBhdGg6IHN0cmluZykge1xuXHRcdC8vIFNraXAgUERGIGZpbGVzXG5cdFx0aWYgKGZpbGUuZXh0ZW5zaW9uID09PSAncGRmJykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRjb25zdCBvbGRGb2xkZXJUYWcgPSB0aGlzLmdldEZvbGRlclRhZyhvbGRQYXRoKTtcblx0XHRjb25zdCBuZXdGb2xkZXJUYWcgPSB0aGlzLmdldEZvbGRlclRhZyhmaWxlLnBhdGgpO1xuXG5cdFx0aWYgKG9sZEZvbGRlclRhZyAmJiBvbGRGb2xkZXJUYWcgIT09IG5ld0ZvbGRlclRhZykge1xuXHRcdFx0YXdhaXQgdGhpcy5yZW1vdmVUYWdGcm9tRmlsZShmaWxlLCBvbGRGb2xkZXJUYWcpO1xuXHRcdH1cblx0XHRpZiAobmV3Rm9sZGVyVGFnKSB7XG5cdFx0XHRhd2FpdCB0aGlzLmFkZFRhZ1RvRmlsZShmaWxlLCBuZXdGb2xkZXJUYWcpO1xuXHRcdH1cblx0fVxuXG5cdG9udW5sb2FkKCkge1xuXG5cdH1cblxuXHRhc3luYyBsb2FkU2V0dGluZ3MoKSB7XG5cdFx0dGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGF3YWl0IHRoaXMubG9hZERhdGEoKSk7XG5cdH1cblxuXHRhc3luYyBzYXZlU2V0dGluZ3MoKSB7XG5cdFx0YXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcblx0fVxufVxuXG5jbGFzcyBTYW1wbGVNb2RhbCBleHRlbmRzIE1vZGFsIHtcblx0Y29uc3RydWN0b3IoYXBwOiBBcHApIHtcblx0XHRzdXBlcihhcHApO1xuXHR9XG5cblx0b25PcGVuKCkge1xuXHRcdGNvbnN0IHtjb250ZW50RWx9ID0gdGhpcztcblx0XHRjb250ZW50RWwuc2V0VGV4dCgnV29haCEnKTtcblx0fVxuXG5cdG9uQ2xvc2UoKSB7XG5cdFx0Y29uc3Qge2NvbnRlbnRFbH0gPSB0aGlzO1xuXHRcdGNvbnRlbnRFbC5lbXB0eSgpO1xuXHR9XG59XG5cbmNsYXNzIFNhbXBsZVNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcblx0cGx1Z2luOiBGb2xkZXJUYWdQbHVnaW47XG5cblx0Y29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogRm9sZGVyVGFnUGx1Z2luKSB7XG5cdFx0c3VwZXIoYXBwLCBwbHVnaW4pO1xuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xuXHR9XG5cblx0ZGlzcGxheSgpOiB2b2lkIHtcblx0XHRjb25zdCB7Y29udGFpbmVyRWx9ID0gdGhpcztcblxuXHRcdGNvbnRhaW5lckVsLmVtcHR5KCk7XG5cblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcblx0XHRcdC5zZXROYW1lKCdTZXR0aW5nICMxJylcblx0XHRcdC5zZXREZXNjKCdJdFxcJ3MgYSBzZWNyZXQnKVxuXHRcdFx0LmFkZFRleHQodGV4dCA9PiB0ZXh0XG5cdFx0XHRcdC5zZXRQbGFjZWhvbGRlcignRW50ZXIgeW91ciBzZWNyZXQnKVxuXHRcdFx0XHQuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubXlTZXR0aW5nKVxuXHRcdFx0XHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MubXlTZXR0aW5nID0gdmFsdWU7XG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG5cdFx0XHRcdH0pKTtcblx0fVxufVxuIl19