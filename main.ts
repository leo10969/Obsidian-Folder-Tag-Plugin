import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFolder, TFile, WorkspaceLeaf } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

// i18n helper function
function t(key: string, params: Record<string, string> = {}): string {
	const i18n = (window as any).i18n;
	if (!i18n) return key;
	
	let text = i18n.t(`folder-tag-plugin:${key}`);
	Object.entries(params).forEach(([key, value]) => {
		text = text.replace(`{${key}}`, value);
	});
	return text;
}

// Tag selection modal
class TagSelectionModal extends Modal {
	selectedFolderTag: string | null = null;
	selectedOtherTags: string[] = [];
	onSubmit: (tags: string[]) => void;

	constructor(app: App, onSubmit: (tags: string[]) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Get existing tags
		const existingTags = new Set<string>();
		this.app.vault.getAllLoadedFiles().forEach(file => {
			if (file instanceof TFile) {
				const cache = this.app.metadataCache.getFileCache(file);
				if (cache?.tags) {
					cache.tags.forEach(tag => existingTags.add(tag.tag.slice(1)));
				}
			}
		});

		// Get folder names
		const folderNames = new Set<string>();
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
				} else {
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
				} else {
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

		addButton.addEventListener('click', async () => {
			const newTag = input.value.trim().replace(/^#/, ''); // Remove #
			if (newTag && !this.selectedOtherTags.includes(newTag) && !folderMatchingTags.includes(newTag)) {
				// If folder creation option is selected
				if (createFolderCheckbox.checked) {
					try {
						// Create folder
						await this.app.vault.createFolder(newTag);
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
								} else {
									this.selectedFolderTag = null;
								}
							});
						}
						new Notice(t('createdTagAndFolder', { tag: newTag, folder: newTag }));
					} catch (error) {
						console.error('Error creating folder:', error);
						new Notice(t('failedToCreateFolder', { folder: newTag }));
						return;
					}
				} else {
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
							} else {
								this.selectedOtherTags = this.selectedOtherTags.filter(t => t !== newTag);
							}
						});
					}
					new Notice(t('addedTag', { tag: newTag }));
				}
				input.value = '';
			}
		});

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
	settings: MyPluginSettings;

	async onload() {
		// Delay plugin initialization
		setTimeout(() => {
			this.initializePlugin();
		}, 2000); // Initialize after 2 seconds
	}

	private async initializePlugin() {
		// Load settings
		await this.loadSettings();

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
		this.registerEvent(
			this.app.vault.on('create', (file: TFile) => {
				if (file instanceof TFile) {
					this.handleNewFile(file);
				}
			})
		);

		// Monitor file move events
		this.registerEvent(
			this.app.vault.on('rename', (file: TFile, oldPath: string) => {
				if (file instanceof TFile) {
					this.handleFileMove(file, oldPath);
				}
			})
		);

		// Add settings tab
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
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
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
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
				const folders = files.filter((file): file is TFolder => file instanceof TFolder);
				
				new Notice(t('foundFolders', { 
					count: folders.length.toString(),
					folders: folders.map(folder => folder.path).join('\n')
				}));
				
				console.log('Vault folders:', folders);
			}
		});

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		// File tagging function
		const appendTagsToFile = async (file: TFile, tags: string[]) => {
			try {
				// Read file content
				const content = await this.app.vault.read(file);
				
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
				await this.app.vault.modify(file, newContent);
				
				console.log(`Added tags ${newTags.map(tag => `#${tag}`).join(', ')} to file: ${file.path}`);

				// Refresh graph view
				this.app.workspace.trigger('file-change', file);
				this.app.workspace.trigger('graph:refresh');
				
				console.log('Graph view refreshed');
			} catch (error) {
				console.error('Error appending tags to file:', error);
			}
		};

		// Folder tagging function
		const addFolderTagsToAllFiles = async (folder: TFolder) => {
			const files = folder.children.filter((file): file is TFile => file instanceof TFile);
			let processedCount = 0;
			let skippedCount = 0;

			for (const file of files) {
				try {
					const content = await this.app.vault.read(file);
					if (!content.includes(`#${folder.name}`)) {
						await appendTagsToFile(file, [folder.name]);
						processedCount++;
					} else {
						skippedCount++;
					}
				} catch (error) {
					console.error(`Error processing file ${file.path}:`, error);
				}
			}

			return { processedCount, skippedCount };
		};

		// Command to add tag to parent folder of current file
		this.addCommand({
			id: 'add-folder-tag-to-current-file',
			name: 'Add parent folder tag to current file',
			callback: () => {
				const file = this.app.workspace.getActiveFile();
				if (file && file.parent) {
					appendTagsToFile(file, [file.parent.name]);
					new Notice(`Added tag #${file.parent.name} to current file`);
				} else {
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
				} else {
					new Notice('No file is currently open in a folder');
				}
			}
		});

		// File moving function
		const moveFileToTagFolder = async (file: TFile, tag: string) => {
			try {
				const tagWithoutHash = tag.replace(/^#/, '');
				
				const targetFolder = this.app.vault.getAllLoadedFiles().find(
					(f): f is TFolder => f instanceof TFolder && f.name === tagWithoutHash
				);

				if (targetFolder) {
					await this.app.fileManager.renameFile(file, `${targetFolder.path}/${file.name}`);
					console.log(`Moved file ${file.path} to folder ${targetFolder.path}`);
					new Notice(t('movedFileToFolder', { tag: tagWithoutHash }));

					this.app.workspace.trigger('file-change', file);
					this.app.workspace.trigger('graph:refresh');
					console.log('Graph view refreshed after file movement');
				} else {
					console.log(`No folder found matching tag: ${tagWithoutHash}`);
				}
			} catch (error) {
				console.error('Error moving file to tag folder:', error);
			}
		};

		// File creation event handler
		this.registerEvent(
			this.app.vault.on('create', (file) => {
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

						new TagSelectionModal(this.app, async (selectedTags) => {
							const validTags = [...new Set(selectedTags.filter(tag => tag.trim() !== ''))];
							
							if (folder.name.trim() !== '') {
								validTags.push(folder.name);
							}

							if (validTags.length > 0) {
								await appendTagsToFile(file, validTags);
								new Notice(t('addedTags', { 
									tags: validTags.map(tag => `#${tag}`).join(', ') 
								}));

								for (const tag of validTags) {
									await moveFileToTagFolder(file, tag);
								}

								this.app.workspace.trigger('file-change', file);
								this.app.workspace.trigger('graph:refresh');
								console.log('Graph view refreshed after tag operations');
							}
						}).open();
					}
				}
			})
		);

		// File open event handler
		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				console.log('Workspace file-open event triggered:', file?.path);
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
			})
		);
	}

	private getFolderTag(filePath: string): string | null {
		const pathParts = filePath.split('/');
		if (pathParts.length > 1) {
			return pathParts[pathParts.length - 2];
		}
		return null;
	}

	private async addTagToFile(file: TFile, tag: string) {
		const content = await this.app.vault.read(file);
		const frontmatter = this.getFrontmatter(content);
		const tags = this.getTags(frontmatter);

		if (!tags.includes(tag)) {
			tags.push(tag);
			const newContent = this.updateFrontmatter(content, tags);
			await this.app.vault.modify(file, newContent);
		}
	}

	private async removeTagFromFile(file: TFile, tag: string) {
		const content = await this.app.vault.read(file);
		const frontmatter = this.getFrontmatter(content);
		const tags = this.getTags(frontmatter);

		const index = tags.indexOf(tag);
		if (index > -1) {
			tags.splice(index, 1);
			const newContent = this.updateFrontmatter(content, tags);
			await this.app.vault.modify(file, newContent);
		}
	}

	private getFrontmatter(content: string): string {
		const match = content.match(/^---\n([\s\S]*?)\n---/);
		return match ? match[1] : '';
	}

	private getTags(frontmatter: string): string[] {
		const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]/);
		if (!tagsMatch) return [];
		return tagsMatch[1].split(',').map(tag => tag.trim());
	}

	private updateFrontmatter(content: string, tags: string[]): string {
		const frontmatter = this.getFrontmatter(content);
		const tagsLine = `tags: [${tags.join(', ')}]`;
		
		if (frontmatter) {
			const updatedFrontmatter = frontmatter.replace(/tags:.*/, tagsLine);
			return content.replace(/^---\n[\s\S]*?\n---/, `---\n${updatedFrontmatter}\n---`);
		} else {
			return `---\n${tagsLine}\n---\n${content}`;
		}
	}

	private async addFolderTag(file: TFile) {
		const folderTag = this.getFolderTag(file.path);
		if (folderTag) {
			await this.addTagToFile(file, folderTag);
		}
	}

	private async handleNewFile(file: TFile) {
		// Skip PDF files
		if (file.extension === 'pdf') {
			return;
		}
		const folderTag = this.getFolderTag(file.path);
		if (folderTag) {
			await this.addTagToFile(file, folderTag);
		}
	}

	private async handleFileMove(file: TFile, oldPath: string) {
		// Skip PDF files
		if (file.extension === 'pdf') {
			return;
		}
		const oldFolderTag = this.getFolderTag(oldPath);
		const newFolderTag = this.getFolderTag(file.path);

		if (oldFolderTag && oldFolderTag !== newFolderTag) {
			await this.removeTagFromFile(file, oldFolderTag);
		}
		if (newFolderTag) {
			await this.addTagToFile(file, newFolderTag);
		}
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: FolderTagPlugin;

	constructor(app: App, plugin: FolderTagPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
