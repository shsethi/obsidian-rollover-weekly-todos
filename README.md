# Rollover Weekly Todos


This Obsidian plugin will rollover any incomplete todo items from the previous weekly note to current week's weekly note.

It's heavily inspired from the  [obsidian-rollover-daily-todos](https://github.com/lumoe/obsidian-rollover-daily-todos/tree/master)

Since the existing plugin only allows rollover of daily notes, but for I prefer working with weekly notes as daily notes is too granular for my workflow.

Also this uses TypeScript instead of plain JS.

## Usage
Open your command palette (CMD+P on macOS) and start typing roll to find this command. No matter where you are in Obsidian, the previous weeks's todos will get rolled forward.

Alternatively, you can use the icon in ribbon bar. 

## Requirements

- You must have `Periodic Notes` plugin installed AND the **Weekly Notes** setting toggled on


## Use the plugin before the release?

- Open Obsidian and go to the community plugins tab.

- Search for BRAT and install it.

- Click on the Add Beta Plugin button.

- Paste the plugin link: https://github.com/shsethi/obsidian-rollover-weekly-todos

- Click Add Plugin.


## Settings

### 1. Disable automatic rollover
If you prefer to trigger the rollover of your todos manually, you can use this setting to prevent the plugin from rolling them over when a new note is created.

### 2. Template Heading
If you chose a template file to use for new daily notes in Daily notes > Settings or Periodic Notes > Settings, you will be able to choose a heading for incomplete notes to roll into. Note that incomplete todos are taken from the entire file, regardless of what heading they are under. And they are all rolled into current note, right under the heading of choice.

If you leave this field as blank, or select None, then incomplete todos will be rolled onto the end of current weekly note (for new notes with no template, the end is the beginning of the note).

### 3. Delete todos from previous week
By default, this plugin will actually make a copy of incomplete todos. If you use the Undo last rollover command, deleted todos will be restored (remember, the time limit on this is 2 minutes).

Toggling this setting on will remove incomplete todos from the previous weekly note once current weekly note has a copy of them.

### 4. Remove empty todos in rollover
By default, this plugin will roll over anything that has a checkbox, whether it has content or not. Toggling this setting on will ignore empty todos. If you have #2 from above toggled on, it will also delete empty todos.