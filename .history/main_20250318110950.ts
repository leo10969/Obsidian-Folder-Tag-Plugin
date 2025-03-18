import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFolder, TFile } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

// タグ選択モーダル
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

		// 既存のタグを取得
		const existingTags = new Set<string>();
		this.app.vault.getAllLoadedFiles().forEach(file => {
			if (file instanceof TFile) {
				const cache = this.app.metadataCache.getFileCache(file);
				if (cache?.tags) {
					cache.tags.forEach(tag => existingTags.add(tag.tag.slice(1)));
				}
			}
		});

		// フォルダ名のリストを取得
		const folderNames = new Set<string>();
		this.app.vault.getAllLoadedFiles().forEach(file => {
			if (file instanceof TFolder) {
				folderNames.add(file.name);
			}
		});

		// タグを分類
		const folderMatchingTags = Array.from(existingTags).filter(tag => folderNames.has(tag));
		const otherTags = Array.from(existingTags).filter(tag => !folderNames.has(tag));

		// タグ選択用のコンテナ
		const tagContainer = contentEl.createDiv('tag-selection-container');
		
		// フォルダと一致するタグを表示
		const folderTagsContainer = tagContainer.createDiv('folder-tags');
		folderTagsContainer.createEl('h3', { text: 'フォルダと一致するタグ（1つまで選択可能）' });
		
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

		// その他のタグを表示
		const otherTagsContainer = tagContainer.createDiv('other-tags');
		otherTagsContainer.createEl('h3', { text: 'その他のタグ（複数選択可能）' });
		
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

		// 新規タグ入力用のコンテナ
		const newTagContainer = tagContainer.createDiv('new-tag');
		newTagContainer.createEl('h3', { text: '新規タグ' });
		
		const inputContainer = newTagContainer.createDiv('input-container');
		const input = inputContainer.createEl('input', { type: 'text', placeholder: '新しいタグを入力' });
		const addButton = inputContainer.createEl('button', { text: '追加' });

		// フォルダ作成オプション用のコンテナ
		const createFolderContainer = newTagContainer.createDiv('create-folder-option');
		const createFolderCheckbox = createFolderContainer.createEl('input', { type: 'checkbox' });
		createFolderCheckbox.setAttribute('id', 'createFolderCheckbox');
		createFolderContainer.createEl('label', { text: 'タグと同じ名前のフォルダを作成する', attr: { for: 'createFolderCheckbox' } });

		addButton.addEventListener('click', async () => {
			const newTag = input.value.trim().replace(/^#/, ''); // #を除去
			if (newTag && !this.selectedOtherTags.includes(newTag) && !folderMatchingTags.includes(newTag)) {
				// フォルダ作成オプションが選択されている場合
				if (createFolderCheckbox.checked) {
					try {
						// フォルダを作成
						await this.app.vault.createFolder(newTag);
						// フォルダタグとして追加
						this.selectedFolderTag = newTag;
						// フォルダタグのラジオボタンを更新
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
						new Notice(`タグ #${newTag} とフォルダ ${newTag} を作成しました`);
					} catch (error) {
						console.error('Error creating folder:', error);
						new Notice(`フォルダ ${newTag} の作成に失敗しました`);
						return;
					}
				} else {
					// その他のタグとして追加
					this.selectedOtherTags.push(newTag);
					// その他のタグのチェックボックスを更新
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
					new Notice(`タグ #${newTag} を追加しました`);
				}
				input.value = '';
			}
		});

		// 送信ボタン
		const submitButton = contentEl.createEl('button', { text: 'タグを適用' });
		submitButton.addEventListener('click', () => {
			// 選択されたタグを結合
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

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

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
				
				// 結果を通知として表示
				new Notice(`Found ${folders.length} folders in vault:\n${
					folders.map(folder => folder.path).join('\n')
				}`);
				
				// コンソールにも詳細を出力
				console.log('Vault folders:', folders);
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		// ファイルにタグを追加する関数
		const appendTagsToFile = async (file: TFile, tags: string[]) => {
			try {
				// ファイルの内容を読み取る
				const content = await this.app.vault.read(file);
				
				// 新しいタグを追加（#を除いて比較）
				const newTags = tags.filter(tag => {
					// タグの#を除去して比較
					const tagWithoutHash = tag.replace(/^#/, '');
					return !content.match(new RegExp(`#${tagWithoutHash}\\b`));
				}).map(tag => tag.replace(/^#/, '')); // すべてのタグから#を除去
				
				if (newTags.length === 0) {
					console.log('No new tags to add');
					return;
				}

				// タグを追加（ファイルの先頭に追加）
				const newContent = `${newTags.map(tag => `#${tag}`).join(' ')}\n\n${content}`;
				
				// ファイルを更新
				await this.app.vault.modify(file, newContent);
				
				console.log(`Added tags ${newTags.map(tag => `#${tag}`).join(', ')} to file: ${file.path}`);

				// グラフビューをリロード
				this.app.workspace.trigger('file-change', file);
				this.app.workspace.trigger('graph:refresh');
				
				console.log('Graph view refreshed');
			} catch (error) {
				console.error('Error appending tags to file:', error);
			}
		};

		// フォルダ内の全ファイルにタグを追加する関数
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

		// 現在のファイルの親フォルダにタグを追加するコマンド
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

		// 現在のフォルダ内の全ファイルにタグを追加するコマンド
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

		// ファイルをタグ名と一致するフォルダに移動する関数
		const moveFileToTagFolder = async (file: TFile, tag: string) => {
			try {
				// タグから#を除去
				const tagWithoutHash = tag.replace(/^#/, '');
				
				// タグ名と一致するフォルダを探す
				const targetFolder = this.app.vault.getAllLoadedFiles().find(
					(f): f is TFolder => f instanceof TFolder && f.name === tagWithoutHash
				);

				if (targetFolder) {
					// ファイルを移動
					await this.app.fileManager.renameFile(file, `${targetFolder.path}/${file.name}`);
					console.log(`Moved file ${file.path} to folder ${targetFolder.path}`);
					new Notice(`ファイルを #${tagWithoutHash} フォルダに移動しました`);
				} else {
					console.log(`No folder found matching tag: ${tagWithoutHash}`);
				}
			} catch (error) {
				console.error('Error moving file to tag folder:', error);
			}
		};

		// ファイル作成イベントのハンドラーを追加
		this.registerEvent(
			this.app.vault.on('create', (file) => {
				console.log('Vault create event triggered:', file.path);
				if (file instanceof TFile) {
					const folder = file.parent;
					if (folder) {
						// 通知として表示
						new Notice(`新規ファイル作成: ${file.path}\nフォルダ: ${folder.path}`);
						
						// コンソールに詳細を出力
						console.log('New file created (create event):', {
							fileName: file.name,
							filePath: file.path,
							folderName: folder.name,
							folderPath: folder.path,
							creationTime: file.stat.ctime,
							modificationTime: file.stat.mtime
						});

						// タグ選択モーダルを表示
						new TagSelectionModal(this.app, async (selectedTags) => {
							// 空のタグを除外し、重複を除去
							const validTags = [...new Set(selectedTags.filter(tag => tag.trim() !== ''))];
							
							// フォルダ名のタグを追加（空でない場合のみ）
							if (folder.name.trim() !== '') {
								validTags.push(folder.name);
							}

							// タグを追加
							if (validTags.length > 0) {
								await appendTagsToFile(file, validTags);
								new Notice(`タグ ${validTags.map(tag => `#${tag}`).join(', ')} を追加しました`);

								// 各タグに対応するフォルダにファイルを移動
								for (const tag of validTags) {
									await moveFileToTagFolder(file, tag);
								}
							}
						}).open();
					}
				}
			})
		);

		// ファイルオープンイベントのハンドラーを追加
		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				console.log('Workspace file-open event triggered:', file?.path);
				if (file instanceof TFile) {
					const folder = file.parent;
					if (folder) {
						// コンソールに詳細を出力
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
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
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
