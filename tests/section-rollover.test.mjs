import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const repoRoot = process.cwd();
const outputFile = path.join(
	os.tmpdir(),
	`section-rollover-test-${Date.now()}.cjs`
);

await esbuild.build({
	entryPoints: [path.join(repoRoot, "src/SectionRollover.ts")],
	bundle: true,
	platform: "node",
	format: "cjs",
	outfile: outputFile,
	logLevel: "silent",
});

const {
	applySectionRollover,
	buildSectionRolloverPayload,
	removeRolledTasksFromSection,
} = await import(pathToFileURL(outputFile));

const normalize = (value) => value.replace(/\r\n/g, "\n").trim();

const options = {
	rootHeading: "# Tasks",
	endHeading: "## Reference",
	removeEmptyTodos: true,
	withChildren: true,
};

const previousWeek = `# Tasks

**Section A**
- [x] #alpha Completed task
- [ ] #alpha Open task
    - [ ] Nested open subtask
    - [x] Nested done subtask

*Context note*
Keep this non-todo note with Section A.
- [ ] #alpha Draft follow-up

**Section B**
This is a plain note under Section B.
- [x] #beta Completed task

**Section D**
- [ ] #delta Open task
- [ ]
- [x] #delta Parent finished but child remains
    - [ ] Child should stay nested under a plain parent line

## Reference
\`\`\`text
Generated content stays out of rollover.
\`\`\`

# Notes
Existing notes stay out of rollover.
`;

const nextWeek = `# Tasks

**Section A**
- [ ] Existing next-week task

**Section C**
Non-overlapping section should stay where it is.
- [ ] Existing task in another section

## Reference
\`\`\`text
Generated content is untouched.
\`\`\`

# Notes
Existing next-week notes.
`;

const payload = buildSectionRolloverPayload(previousWeek, options);
const missingRootPayload = buildSectionRolloverPayload("# Other\n- [ ] Task", options);

assert.equal(payload.foundRoot, true);
assert.equal(missingRootPayload.foundRoot, false);
assert.deepEqual(missingRootPayload.lines, []);
assert.equal(payload.todoCount, 5);
assert.equal(payload.emptyCount, 1);
assert.deepEqual(payload.lines, [
	"**Section A**",
	"- [ ] #alpha Open task",
	"    - [ ] Nested open subtask",
	"*Context note*",
	"Keep this non-todo note with Section A.",
	"- [ ] #alpha Draft follow-up",
	"",
	"**Section B**",
	"This is a plain note under Section B.",
	"",
	"**Section D**",
	"- [ ] #delta Open task",
	"- #delta Parent finished but child remains",
	"    - [ ] Child should stay nested under a plain parent line",
]);

const nextAfter = applySectionRollover(nextWeek, payload.lines, options).content;
assert.equal(
	normalize(nextAfter),
	normalize(`# Tasks

**Section A**
- [ ] Existing next-week task

- [ ] #alpha Open task
    - [ ] Nested open subtask
*Context note*
Keep this non-todo note with Section A.
- [ ] #alpha Draft follow-up

**Section C**
Non-overlapping section should stay where it is.
- [ ] Existing task in another section

**Section B**
This is a plain note under Section B.

**Section D**
- [ ] #delta Open task
- #delta Parent finished but child remains
    - [ ] Child should stay nested under a plain parent line

## Reference
\`\`\`text
Generated content is untouched.
\`\`\`

# Notes
Existing next-week notes.`)
);

const previousAfter = removeRolledTasksFromSection(previousWeek, options).content;
assert.equal(
	normalize(previousAfter),
	normalize(`# Tasks

**Section A**
- [x] #alpha Completed task
*Context note*
Keep this non-todo note with Section A.

**Section B**
This is a plain note under Section B.
- [x] #beta Completed task

**Section D**
- [x] #delta Parent finished but child remains

## Reference
\`\`\`text
Generated content stays out of rollover.
\`\`\`

# Notes
Existing notes stay out of rollover.`)
);

await fs.unlink(outputFile);
