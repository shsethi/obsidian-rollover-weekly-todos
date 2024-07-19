# Rollover Weekly Todos


This Obsidian plugin will rollover any incomplete todo items from the previous weekly note to current week's weekly note.

It's heavily inspired from the  [obsidian-rollover-daily-todos](https://github.dev/lumoe/obsidian-rollover-daily-todos/tree/master)

Since the existing plugin only allows rollover of daily notes, but for I prefer working with weekly notes as daily notes is too granular for my workflow.

Also this uses TypeScript instead of plain JS.

## Usage
Open your command palette (CMD+P on macOS) and start typing roll to find this command. No matter where you are in Obsidian, the previous weeks's todos will get rolled forward.

Alternatively, you can use the icon in ribbon bar. 

## Requirements

- [ ] You must have `Periodic Notes` plugin installed AND the **Weekly Notes** setting toggled on
- [ ] A Note folder set in one of these plugins. Inside it you must have:
  1. 2 or more notes
  2. All notes must be named in the format you use for daily notes (for example `2021-08-29` for `YYYY-MM-DD` )


## Settings

### 1. Disable automatic rollover
If you prefer to trigger the rollover of your todos manually, you can use this setting to prevent the plugin from rolling them over when a new note is created.

### 2. Template Heading
If you chose a template file to use for new daily notes in Daily notes > Settings or Periodic Notes > Settings, you will be able to choose a heading for incomplete notes to roll into. Note that incomplete todos are taken from the entire file, regardless of what heading they are under. And they are all rolled into today's daily note, right under the heading of choice.

If you leave this field as blank, or select None, then incomplete todos will be rolled onto the end of today's note (for new notes with no template, the end is the beginning of the note).

### 3. Delete todos from previous week
By default, this plugin will actually make a copy of incomplete todos. So if you forgot to wash your dog yesterday, and didn't check it off, then you will have an incomplete checkmark on yesterday's daily note, and a new incomplete checkmark will be rolled into today's daily note. If you use the Undo last rollover command, deleted todos will be restored (remember, the time limit on this is 2 minutes).

Toggling this setting on will remove incomplete todos from the previous daily note once today's daily note has a copy of them.

### 4. Remove empty todos in rollover
By default, this plugin will roll over anything that has a checkbox, whether it has content or not. Toggling this setting on will ignore empty todos. If you have #2 from above toggled on, it will also delete empty todos.