export interface SectionRolloverOptions {
	removeEmptyTodos: boolean;
	withChildren: boolean;
	rootHeading: string;
	endHeading: string;
}

export interface RolloverPayload {
	lines: string[];
	todoCount: number;
	emptyCount: number;
	foundRoot: boolean;
}

export interface ApplyRolloverResult {
	content: string;
	message: string;
}

const NO_HEADING = "none";
const PREAMBLE_SECTION_KEY = "__preamble__";

interface MarkdownHeading {
	level: number;
	text: string;
	key: string;
}

interface PriorityBounds {
	start: number;
	bodyStart: number;
	end: number;
}

interface ParsedTask {
	indent: number;
	status: string;
	rest: string;
	closed: boolean;
	empty: boolean;
}

interface FilterResult {
	lines: string[];
	todoCount: number;
	emptyCount: number;
}

interface DeleteResult {
	lines: string[];
	removedTasks: number;
	emptyCount: number;
}

interface SplitSection {
	key: string;
	lines: string[];
}

const isBlankLine = (line: string): boolean => line.trim().length === 0;

export const hasMeaningfulLine = (lines: string[]): boolean =>
	lines.some((line) => !isBlankLine(line));

const splitMarkdownLines = (content: string): string[] => content.split(/\r?\n/);

const trimLeadingBlankLines = (lines: string[]): string[] => {
	const trimmed = [...lines];
	while (trimmed.length > 0 && isBlankLine(trimmed[0])) {
		trimmed.shift();
	}
	return trimmed;
};

const trimTrailingBlankLines = (lines: string[]): string[] => {
	const trimmed = [...lines];
	while (trimmed.length > 0 && isBlankLine(trimmed[trimmed.length - 1])) {
		trimmed.pop();
	}
	return trimmed;
};

const compactSectionLines = (lines: string[]): string[] => {
	const compacted: string[] = [];
	for (const line of lines) {
		if (
			isBlankLine(line) &&
			(compacted.length === 0 || isBlankLine(compacted[compacted.length - 1]))
		) {
			continue;
		}
		compacted.push(line);
	}
	return trimTrailingBlankLines(compacted);
};

const getMarkdownHeading = (line: string): MarkdownHeading | null => {
	const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);
	if (!match) {
		return null;
	}
	const text = match[2].replace(/\s+#+\s*$/, "").trim();
	return {
		level: match[1].length,
		text,
		key: text.toLowerCase(),
	};
};

const headingsMatch = (line: string, configuredHeading: string): boolean => {
	if (!configuredHeading || configuredHeading === NO_HEADING) {
		return false;
	}
	const heading = getMarkdownHeading(line);
	const configured = getMarkdownHeading(configuredHeading);
	return Boolean(
		heading &&
			configured &&
			heading.level === configured.level &&
			heading.key === configured.key
	);
};

const findSectionBounds = (
	lines: string[],
	rootHeading: string,
	endHeading: string
): PriorityBounds | null => {
	const root = getMarkdownHeading(rootHeading);
	if (!root) {
		return null;
	}

	let start = -1;
	for (let i = 0; i < lines.length; i++) {
		if (headingsMatch(lines[i], rootHeading)) {
			start = i;
			break;
		}
	}
	if (start === -1) {
		return null;
	}

	let bodyStart = start + 1;
	let duplicateHeadingIndex = bodyStart;
	while (
		duplicateHeadingIndex < lines.length &&
		isBlankLine(lines[duplicateHeadingIndex])
	) {
		duplicateHeadingIndex++;
	}
	const duplicateHeading = getMarkdownHeading(
		lines[duplicateHeadingIndex] || ""
	);
	if (
		duplicateHeading &&
		duplicateHeading.level > root.level &&
		duplicateHeading.key === root.key
	) {
		bodyStart = duplicateHeadingIndex + 1;
	}

	let end = lines.length;
	for (let i = bodyStart; i < lines.length; i++) {
		const heading = getMarkdownHeading(lines[i]);
		if (!heading) {
			continue;
		}
		if (headingsMatch(lines[i], endHeading) || heading.level <= root.level) {
			end = i;
			break;
		}
	}

	return { start, bodyStart, end };
};

const getIndentationWidth = (line: string): number => {
	const indent = (line.match(/^[\t ]*/) || [""])[0];
	return indent.replace(/\t/g, "    ").length;
};

const parseTaskLine = (line: string): ParsedTask | null => {
	const match = line.match(/^([\t ]*)([-*+]) \[([^\]]*)\](.*)$/);
	if (!match) {
		return null;
	}
	const status = match[3].trim();
	const rest = match[4] || "";
	return {
		indent: getIndentationWidth(line),
		status,
		rest,
		closed: /^[xX-]$/.test(status),
		empty: rest.trim().length === 0,
	};
};

const taskLineToPlainListItem = (line: string): string =>
	line
		.replace(/^([\t ]*[-*+]) \[[^\]]*\]\s*/, "$1 ")
		.replace(/\s*\u2705\s*\d{4}-\d{2}-\d{2}\s*$/, "")
		.replace(/[\t ]+$/, "");

const findIndentedBlockEnd = (
	lines: string[],
	startIndex: number,
	parentIndent: number
): number => {
	let i = startIndex + 1;
	for (; i < lines.length; i++) {
		if (isBlankLine(lines[i])) {
			continue;
		}
		if (getIndentationWidth(lines[i]) <= parentIndent) {
			break;
		}
	}
	return i;
};

const filterLinesForRollover = (
	lines: string[],
	removeEmptyTodos: boolean,
	withChildren: boolean
): FilterResult => {
	const totals = {
		openTasks: 0,
		emptyTasks: 0,
	};

	const processRange = (start: number, end: number): FilterResult => {
		const out: string[] = [];
		let openTasks = 0;

		for (let i = start; i < end; ) {
			const line = lines[i];
			const task = parseTaskLine(line);
			if (!task) {
				out.push(line);
				i++;
				continue;
			}

			const blockEnd = findIndentedBlockEnd(lines, i, task.indent);
			const child = withChildren
				? processRange(i + 1, blockEnd)
				: { lines: [], todoCount: 0, emptyCount: 0 };

			if (task.closed) {
				if (child.todoCount > 0) {
					out.push(taskLineToPlainListItem(line));
					out.push(...child.lines);
					openTasks += child.todoCount;
				}
			} else {
				const shouldDropEmpty =
					removeEmptyTodos &&
					task.empty &&
					child.todoCount === 0 &&
					!hasMeaningfulLine(child.lines);
				if (shouldDropEmpty) {
					totals.emptyTasks++;
				} else {
					out.push(line);
					out.push(...child.lines);
					openTasks += 1 + child.todoCount;
					totals.openTasks++;
				}
			}

			i = blockEnd;
		}

		return {
			lines: compactSectionLines(out),
			todoCount: openTasks,
			emptyCount: totals.emptyTasks,
		};
	};

	const filtered = processRange(0, lines.length);
	return {
		lines: compactSectionLines(filtered.lines),
		todoCount: totals.openTasks,
		emptyCount: totals.emptyTasks,
	};
};

const filterLinesAfterDeletion = (
	lines: string[],
	withChildren: boolean
): DeleteResult => {
	const totals = {
		removedTasks: 0,
		emptyTasks: 0,
	};

	const processRange = (start: number, end: number): string[] => {
		const out: string[] = [];

		for (let i = start; i < end; ) {
			const line = lines[i];
			const task = parseTaskLine(line);
			if (!task) {
				out.push(line);
				i++;
				continue;
			}

			const blockEnd = findIndentedBlockEnd(lines, i, task.indent);
			if (task.closed) {
				out.push(line);
				out.push(...processRange(i + 1, blockEnd));
			} else {
				totals.removedTasks++;
				if (task.empty) {
					totals.emptyTasks++;
				}
				if (!withChildren) {
					out.push(...lines.slice(i + 1, blockEnd));
				}
			}

			i = blockEnd;
		}

		return compactSectionLines(out);
	};

	return {
		lines: compactSectionLines(processRange(0, lines.length)),
		removedTasks: totals.removedTasks,
		emptyCount: totals.emptyTasks,
	};
};

const getPrimarySectionKey = (line: string): string | null => {
	const heading = getMarkdownHeading(line);
	if (heading) {
		return heading.key;
	}
	const boldOnly = line.match(/^\s*\*\*(.+?)\*\*\s*$/);
	if (boldOnly) {
		return boldOnly[1].trim().toLowerCase();
	}
	return null;
};

const splitSections = (lines: string[]): SplitSection[] => {
	const sections: SplitSection[] = [];
	let current: SplitSection = {
		key: PREAMBLE_SECTION_KEY,
		lines: [],
	};

	const pushCurrent = (): void => {
		if (hasMeaningfulLine(current.lines)) {
			sections.push({
				key: current.key,
				lines: compactSectionLines(current.lines),
			});
		}
	};

	for (const line of lines) {
		const key = getPrimarySectionKey(line);
		if (key) {
			pushCurrent();
			current = {
				key,
				lines: [line],
			};
		} else {
			current.lines.push(line);
		}
	}

	pushCurrent();
	return sections;
};

const appendUniqueLines = (
	targetLines: string[],
	incomingLines: string[]
): void => {
	const seen = new Set(
		targetLines.map((line) => line.trim()).filter((line) => line.length > 0)
	);
	const toAdd: string[] = [];
	for (const line of incomingLines) {
		const trimmed = line.trim();
		if (trimmed.length > 0 && seen.has(trimmed)) {
			continue;
		}
		toAdd.push(line);
		if (trimmed.length > 0) {
			seen.add(trimmed);
		}
	}

	if (!hasMeaningfulLine(toAdd)) {
		return;
	}
	if (
		targetLines.length > 0 &&
		!isBlankLine(targetLines[targetLines.length - 1]) &&
		!isBlankLine(toAdd[0])
	) {
		targetLines.push("");
	}
	targetLines.push(...toAdd);
};

const flattenSections = (sections: SplitSection[]): string[] => {
	const flattened: string[] = [];
	for (const section of sections) {
		const lines = compactSectionLines(section.lines);
		if (!hasMeaningfulLine(lines)) {
			continue;
		}
		if (
			flattened.length > 0 &&
			!isBlankLine(flattened[flattened.length - 1]) &&
			!isBlankLine(lines[0])
		) {
			flattened.push("");
		}
		flattened.push(...lines);
	}
	return compactSectionLines(flattened);
};

const mergeSectionLines = (
	existingLines: string[],
	incomingLines: string[]
): string[] => {
	const existing = compactSectionLines(existingLines);
	const incoming = flattenSections(splitSections(compactSectionLines(incomingLines)));

	if (!hasMeaningfulLine(incoming)) {
		return existing;
	}
	if (!hasMeaningfulLine(existing)) {
		return incoming;
	}

	const resultSections = splitSections(existing).map((section) => ({
		key: section.key,
		lines: [...section.lines],
	}));
	const indexByKey = new Map<string, number>();
	resultSections.forEach((section, index) => {
		if (section.key !== PREAMBLE_SECTION_KEY && !indexByKey.has(section.key)) {
			indexByKey.set(section.key, index);
		}
	});

	for (const incomingSection of splitSections(incoming)) {
		if (
			incomingSection.key !== PREAMBLE_SECTION_KEY &&
			indexByKey.has(incomingSection.key)
		) {
			const index = indexByKey.get(incomingSection.key);
			if (typeof index === "number") {
				appendUniqueLines(
					resultSections[index].lines,
					incomingSection.lines.slice(1)
				);
			}
		} else {
			indexByKey.set(incomingSection.key, resultSections.length);
			resultSections.push({
				key: incomingSection.key,
				lines: [...incomingSection.lines],
			});
		}
	}

	return flattenSections(resultSections);
};

const buildContentFromSectionLines = (
	lines: string[],
	bounds: PriorityBounds,
	sectionLines: string[]
): string => {
	const before = trimTrailingBlankLines(lines.slice(0, bounds.bodyStart));
	const after = trimLeadingBlankLines(lines.slice(bounds.end));
	const next = [...before];

	if (hasMeaningfulLine(sectionLines)) {
		if (next.length > 0 && !isBlankLine(next[next.length - 1])) {
			next.push("");
		}
		next.push(...sectionLines);
	}

	if (after.length > 0) {
		if (next.length > 0 && !isBlankLine(next[next.length - 1])) {
			next.push("");
		}
		next.push(...after);
	}

	return next.join("\n");
};

export const buildSectionRolloverPayload = (
	content: string,
	options: SectionRolloverOptions
): RolloverPayload => {
	const lines = splitMarkdownLines(content);
	const bounds = findSectionBounds(lines, options.rootHeading, options.endHeading);
	if (!bounds) {
		return {
			lines: [],
			todoCount: 0,
			emptyCount: 0,
			foundRoot: false,
		};
	}
	const sectionLines = lines.slice(bounds.bodyStart, bounds.end);
	const filtered = filterLinesForRollover(
		sectionLines,
		options.removeEmptyTodos,
		options.withChildren
	);

	return {
		...filtered,
		lines: flattenSections(splitSections(filtered.lines)),
		foundRoot: true,
	};
};

export const applySectionRollover = (
	content: string,
	incomingLines: string[],
	options: Pick<SectionRolloverOptions, "rootHeading" | "endHeading">
): ApplyRolloverResult => {
	const lines = splitMarkdownLines(content);
	const bounds = findSectionBounds(lines, options.rootHeading, options.endHeading);

	if (bounds) {
		const existingSectionLines = lines.slice(bounds.bodyStart, bounds.end);
		const merged = mergeSectionLines(existingSectionLines, incomingLines);
		return {
			content: buildContentFromSectionLines(lines, bounds, merged),
			message: "",
		};
	}

	const incomingString = `\n${incomingLines.join("\n")}`;
	const contentAddedToHeading = content.replace(
		options.rootHeading,
		`${options.rootHeading}${incomingString}`
	);
	if (contentAddedToHeading !== content) {
		return { content: contentAddedToHeading, message: "" };
	}

	return {
		content: `${trimTrailingBlankLines(splitMarkdownLines(content)).join(
			"\n"
		)}\n\n${incomingLines.join("\n")}`,
		message: `Rollover couldn't find '${options.rootHeading}' in today's weekly note. Rolling todos to end of file.`,
	};
};

export const removeRolledTasksFromSection = (
	content: string,
	options: Pick<SectionRolloverOptions, "rootHeading" | "endHeading" | "withChildren">
): ApplyRolloverResult => {
	const lines = splitMarkdownLines(content);
	const bounds = findSectionBounds(lines, options.rootHeading, options.endHeading);
	if (!bounds) {
		return {
			content,
			message: "",
		};
	}

	const existingSectionLines = lines.slice(bounds.bodyStart, bounds.end);
	const filtered = filterLinesAfterDeletion(
		existingSectionLines,
		options.withChildren
	);
	const remainingSectionLines = flattenSections(splitSections(filtered.lines));

	return {
		content: buildContentFromSectionLines(
			lines,
			bounds,
			remainingSectionLines
		),
		message: "",
	};
};
