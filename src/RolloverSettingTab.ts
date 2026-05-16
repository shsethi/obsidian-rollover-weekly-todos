import { App, normalizePath, Setting, PluginSettingTab, TFile } from "obsidian";
import { getWeeklyNoteSettings } from "obsidian-daily-notes-interface";
import RolloverWeeklyTodosPlugin from "./main";

export default class RolloverSettingTab extends PluginSettingTab {
	plugin: RolloverWeeklyTodosPlugin;

	constructor(app: App, plugin: RolloverWeeklyTodosPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async getTemplateHeadings(): Promise<string[]> {
		const { folder, template } = getWeeklyNoteSettings();
		if (!template) return [];

		const candidatePaths = new Set<string>();
		const addCandidate = (path: string) => {
			const normalizedPath = normalizePath(path.trim());
			if (normalizedPath) {
				candidatePaths.add(normalizedPath);
			}
		};

		addCandidate(template);
		if (template.endsWith(".md")) {
			addCandidate(template.slice(0, -3)); // Try without ".md"
		}

		if (folder) {
			addCandidate(`${folder}/${template}`);
			if (template.endsWith(".md")) {
				addCandidate(`${folder}/${template.slice(0, -3)}`);
			}
		}

		let file: TFile | null = null;
		for (const path of candidatePaths) {
			const maybeFile = this.app.vault.getAbstractFileByPath(path);
			if (maybeFile instanceof TFile) {
				file = maybeFile;
				break;
			}
		}

		if (!(file instanceof TFile)) {
			// Check if it's a valid file
			return [];
		}

		const templateContents = await this.app.vault.read(file);
		const allHeadings = Array.from(
			templateContents.matchAll(/#{1,6} .*/g) // Match any level heading
		).map(([heading]) => heading);
		return allHeadings;
	}

	async display(): Promise<void> {
		const templateHeadings: string[] = await this.getTemplateHeadings();


		this.containerEl.empty();
		new Setting(this.containerEl)
			.setName("Template heading")
			.setDesc(
				"Which heading from your template should the todos go under"
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						...templateHeadings.reduce((acc, heading) => {
              // @ts-ignore
							acc[heading] = heading;
							return acc;
						}, {}),
						none: "None",
					})
					.setValue(this.plugin?.settings.templateHeading)
					.onChange((value) => {
						this.plugin.settings.templateHeading = value;
						this.plugin.saveSettings();
					})
			);

		new Setting(this.containerEl)
			.setName("Preserve section structure")
			.setDesc(
				"Roll over the content under the template heading by section, instead of appending todos as a flat list. Standalone bold labels such as **Work** are treated as sections."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.preserveSectionStructure || false)
					.onChange((value) => {
						this.plugin.settings.preserveSectionStructure = value;
						this.plugin.saveSettings();
					})
			);

		new Setting(this.containerEl)
			.setName("Stop preserving before heading")
			.setDesc(
				"Optional. When preserving section structure, stop before this heading instead of including everything under the template heading."
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						none: "None",
						...templateHeadings.reduce((acc, heading) => {
              // @ts-ignore
							acc[heading] = heading;
							return acc;
						}, {}),
					})
					.setValue(this.plugin.settings.sectionEndHeading || "none")
					.onChange((value) => {
						this.plugin.settings.sectionEndHeading = value;
						this.plugin.saveSettings();
					})
			);

		new Setting(this.containerEl)
			.setName("Delete todos from previous week")
			.setDesc(
				`Once todos are found, they are added to Current Weekly Note. If successful, they are deleted from Previous Weekly note. Enabling this is destructive and may result in lost data. Keeping this disabled will simply duplicate them from yesterday's note and place them in the appropriate section. Note that currently, duplicate todos will be deleted regardless of what heading they are in, and which heading you choose from above.`
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.deleteOnComplete || false)
					.onChange((value) => {
						this.plugin.settings.deleteOnComplete = value;
						this.plugin.saveSettings();
					})
			);

		new Setting(this.containerEl)
			.setName("Remove empty todos in rollover")
			.setDesc(
				`If you have empty todos, they will not be rolled over to the next week.`
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.removeEmptyTodos || false)
					.onChange((value) => {
						this.plugin.settings.removeEmptyTodos = value;
						this.plugin.saveSettings();
					})
			);

		new Setting(this.containerEl)
			.setName("Roll over children of todos")
			.setDesc(
				`By default, only the actual todos are rolled over. If you add nested Markdown-elements beneath your todos, these are not rolled over but stay in place, possibly altering the logic of your previous note. This setting allows for also migrating the nested elements.`
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.rolloverChildren || false)
					.onChange((value) => {
						this.plugin.settings.rolloverChildren = value;
						this.plugin.saveSettings();
					})
			);
		// new Setting(this.containerEl)
		// 	.setName("Automatic rollover on Weekly note open")
		// 	.setDesc(
		// 		"If enabled, the plugin will automatically rollover todos when you open a Weekly note."
		// 	)
		// 	.addToggle((toggle) => {
		// 		toggle
		// 			.setValue(this.plugin.settings.rolloverOnFileCreate ?? true) // Use nullish coalescing (??)
		// 			.onChange(async (value) => {
		// 				this.plugin.settings.rolloverOnFileCreate = value;
		// 				await this.plugin.saveSettings();
		// 				console.log(await this.plugin.loadData()); // Log after saving
		// 			});
		// 	});
	}
}
