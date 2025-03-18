import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFolder, TFile } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
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
		const appendTagToFile = async (file: TFile, tag: string) => {
			try {
				// ファイルの内容を読み取る
				const content = await this.app.vault.read(file);
				
				// タグが既に存在するかチェック
				if (content.includes(`#${tag}`)) {
					console.log(`Tag #${tag} already exists in file: ${file.path}`);
					return;
				}

				// タグを追加（ファイルの先頭に追加）
				const newContent = `#${tag}\n\n${content}`;
				
				// ファイルを更新
				await this.app.vault.modify(file, newContent);
				
				console.log(`Added tag #${tag} to file: ${file.path}`);
			} catch (error) {
				console.error('Error appending tag to file:', error);
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

						// 親フォルダの名前をタグとして追加
						appendTagToFile(file, folder.name);
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
