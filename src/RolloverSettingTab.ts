import { App, Setting, PluginSettingTab, TAbstractFile, TFile } from "obsidian"; // Updated import
import { getDailyNoteSettings } from "obsidian-daily-notes-interface";
import RolloverWeeklyTodosPlugin from "./main";

export default class RolloverSettingTab extends PluginSettingTab {
    plugin: RolloverWeeklyTodosPlugin;

    constructor(app: App, plugin: RolloverWeeklyTodosPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async getTemplateHeadings(): Promise<string[]> {
        const { template } = getDailyNoteSettings();
        if (!template) return [];

        let file = this.app.vault.getAbstractFileByPath(template);

        if (!file && template.endsWith(".md")) { 
            file = this.app.vault.getAbstractFileByPath(template.slice(0, -3)); // Try without ".md"
        }

        if (!(file instanceof TFile)) { // Check if it's a valid file
            return [];
        }

        const templateContents = await this.app.vault.read(file);
        const allHeadings = Array.from(
            templateContents.matchAll(/#{1,6} .*/g)  // Match any level heading
        ).map(([heading]) => heading);
        return allHeadings;
    }

    display(): void { // No need for Promise here
        this.getTemplateHeadings().then(templateHeadings => {
            this.containerEl.empty();

            // ... (settings remain largely unchanged, using templateHeadings) ...

            new Setting(this.containerEl)
                .setName("Automatic rollover on Weekly note open")
                .setDesc("If enabled, the plugin will automatically rollover todos when you open a Weekly note.")
                .addToggle((toggle) => {
                    toggle
                        .setValue(this.plugin.settings.rolloverOnFileCreate ?? true) // Use nullish coalescing (??)
                        .onChange(async (value) => {
                            this.plugin.settings.rolloverOnFileCreate = value;
                            await this.plugin.saveSettings();
                            console.log(await this.plugin.loadData()); // Log after saving
                        });
                });
        });
    }
}
