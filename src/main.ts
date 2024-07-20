import { App, Notice, Plugin, TFile, moment } from "obsidian";
import {
	getAllWeeklyNotes,
	getWeeklyNote,
} from "obsidian-daily-notes-interface";
// import moment from "moment";
import { getTodos } from "./GetTodos";
import UndoModal from "./UndoModal";
import RolloverSettingTab from "./RolloverSettingTab";

interface RolloverWeeklyTodosSettings {
	templateHeading: string;
	deleteOnComplete: boolean;
	removeEmptyTodos: boolean;
	rolloverChildren: boolean;
	rolloverOnFileCreate: boolean;
}

const DEFAULT_SETTINGS: RolloverWeeklyTodosSettings = {
	templateHeading: "none",
	deleteOnComplete: false,
	removeEmptyTodos: true,
	rolloverChildren: true,
	rolloverOnFileCreate: true,
};

// setup undo history
interface UndoHistory {
	previousDay: {
		file: TFile;
		oldContent: string;
	};
	today: {
		file: TFile;
		oldContent: string;
	};
}

export default class RolloverWeeklyTodosPlugin extends Plugin {
	settings: RolloverWeeklyTodosSettings;
	undoHistoryTime: Date | null = null; // Initialize with null
	undoHistory: UndoHistory[] = []; // Use array of UndoHistory

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async rollover(file?: TFile) {

		if (!this.isWeeklyNotesEnabled()) {
			new Notice(
			  "RolloverTodosPlugin unable to rollover unfinished todos: Please enable Periodic Notes (with weekly notes enabled).",
			  10000
			);
			return;
		}

	
		const { templateHeading, deleteOnComplete, removeEmptyTodos } =
			this.settings;

		// const { moment } = window;
		if (!file) {
			const allWeeklyNotes = getAllWeeklyNotes();
			file = getWeeklyNote(moment(), allWeeklyNotes); // use moment() directly
		}

		const previousWeekNote = this.getPreviousWeekNote(moment());
		if (!previousWeekNote) {
			new Notice("No previous week note found.");
			return;
		}

		// console.log("Current week note:", file.name);
		// console.log("Previous week note:", previousWeekNote.name);

		// TODO: Implement your rollover logic here
		// Read tasks from previousWeekNote and append to file

		// get unfinished todos from yesterday, if exist
		let todos_lastWeek = await this.getAllUnfinishedTodos(previousWeekNote);

		console.log(
			`rollover-daily-todos: ${todos_lastWeek.length} todos found in ${previousWeekNote.basename}.md`
		);

		if (todos_lastWeek.length == 0) {
			return;
		}

		//   -----

		let undoHistoryInstance: UndoHistory = {
			previousDay: { file: previousWeekNote, oldContent: "" },
			today: { file: file, oldContent: "" },
		};

		// Potentially filter todos from yesterday for today
		let todosAdded = 0;
		let emptiesToNotAddToTomorrow = 0;
		let todos_today = !removeEmptyTodos ? todos_lastWeek : [];
		if (removeEmptyTodos) {
			todos_lastWeek.forEach((line, i) => {
				const trimmedLine = (line || "").trim();
				if (trimmedLine != "- [ ]" && trimmedLine != "- [  ]") {
					todos_today.push(line);
					todosAdded++;
				} else {
					emptiesToNotAddToTomorrow++;
				}
			});
		} else {
			todosAdded = todos_lastWeek.length;
		}

		// get today's content and modify it
		let templateHeadingNotFoundMessage = "";
		const templateHeadingSelected = templateHeading !== "none";

		if (todos_today.length > 0) {
			let dailyNoteContent = await this.app.vault.read(file);
			undoHistoryInstance.today.oldContent = dailyNoteContent; // Update oldContent
			const todos_todayString = `\n${todos_today.join("\n")}`;

			// If template heading is selected, try to rollover to template heading
			if (templateHeadingSelected) {
				const contentAddedToHeading = dailyNoteContent.replace(
					templateHeading,
					`${templateHeading}${todos_todayString}`
				);
				if (contentAddedToHeading == dailyNoteContent) {
					templateHeadingNotFoundMessage = `Rollover couldn't find '${templateHeading}' in today's daily not. Rolling todos to end of file.`;
				} else {
					dailyNoteContent = contentAddedToHeading;
				}
			}

			// Rollover to bottom of file if no heading found in file, or no heading selected
			if (
				!templateHeadingSelected ||
				templateHeadingNotFoundMessage.length > 0
			) {
				dailyNoteContent += todos_todayString;
			}

			await this.app.vault.modify(file, dailyNoteContent);
		}

		// if deleteOnComplete, get yesterday's content and modify it
		if (deleteOnComplete) {
			let previousWeekNoteContent = await this.app.vault.read(
				previousWeekNote
			);
			undoHistoryInstance.previousDay = {
				file: previousWeekNote,
				oldContent: `${previousWeekNoteContent}`,
			};
			let lines = previousWeekNoteContent.split("\n");

			for (let i = lines.length; i >= 0; i--) {
				if (todos_lastWeek.includes(lines[i])) {
					lines.splice(i, 1);
				}
			}

			const modifiedContent = lines.join("\n");
			await this.app.vault.modify(previousWeekNote, modifiedContent);
		}

		// Let user know rollover has been successful with X todos
		const todosAddedString =
			todosAdded == 0
				? ""
				: `- ${todosAdded} todo${
						todosAdded > 1 ? "s" : ""
				  } rolled over.`;
		const emptiesToNotAddToTomorrowString =
			emptiesToNotAddToTomorrow == 0
				? ""
				: deleteOnComplete
				? `- ${emptiesToNotAddToTomorrow} empty todo${
						emptiesToNotAddToTomorrow > 1 ? "s" : ""
				  } removed.`
				: "";
		const part1 =
			templateHeadingNotFoundMessage.length > 0
				? `${templateHeadingNotFoundMessage}`
				: "";
		const part2 = `${todosAddedString}${
			todosAddedString.length > 0 ? " " : ""
		}`;
		const part3 = `${emptiesToNotAddToTomorrowString}${
			emptiesToNotAddToTomorrowString.length > 0 ? " " : ""
		}`;

		let allParts = [part1, part2, part3];
		let nonBlankLines: string[] = [];
		allParts.forEach((part) => {
			if (part.length > 0) {
				nonBlankLines.push(part);
			}
		});

		const message = nonBlankLines.join("\n");
		if (message.length > 0) {
			new Notice(message, 4000 + message.length * 3);
		}
		this.undoHistoryTime = new Date();
		this.undoHistory.push(undoHistoryInstance);
	}

	async getAllUnfinishedTodos(file: TFile) {
		const dn = await this.app.vault.read(file);
		const dnLines = dn.split(/\r?\n|\r|\n/g);

		return getTodos({
			lines: dnLines,
			withChildren: this.settings.rolloverChildren,
		});
	}

	getPreviousWeekNote(date: moment.Moment) {
		const previousWeekStart = date
			.clone()
			.subtract(1, "weeks")
			.startOf("week");
		return getWeeklyNote(previousWeekStart, getAllWeeklyNotes());
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	isWeeklyNotesEnabled() {

		// https://forum.obsidian.md/t/error-property-commands-does-not-exist-on-type-app/66924
		//@ts-ignore
		const periodicNotesPlugin = this.app.plugins.getPlugin("periodic-notes");

		const periodicNotesEnabled =
			periodicNotesPlugin && periodicNotesPlugin.settings?.weekly?.enabled;

		return  periodicNotesEnabled;
	}

	async onload() {
		console.log("Plugin loaded");
		await this.loadSettings();

		this.addSettingTab(new RolloverSettingTab(this.app, this));

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"reset",
			"RollOver Weekly Todos",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				this.rollover();
			}
		);

		this.addCommand({
			id: "obsidian-rollover-weekly-todos-rollover",
			name: "Rollover Now",
			callback: () => this.rollover(),
		});

		this.addCommand({
			id: "obsidian-rollover-daily-todos-undo",
			name: "Undo last rollover",
			checkCallback: (checking) => {
			  // no history, don't allow undo
			  if (this.undoHistory.length > 0) {
				const now = window.moment();
				const lastUse = window.moment(this.undoHistoryTime);
				const diff = now.diff(lastUse, "seconds");
				// 2+ mins since use: don't allow undo
				if (diff > 2 * 60) {
				  return false;
				}
				if (!checking) {
				  new UndoModal(this).open();
				}
				return true;
			  }
			  return false;
			},
		  });
	}
}
