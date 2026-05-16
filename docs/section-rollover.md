# Preserving Weekly Sections

The section-preserving rollover mode keeps unfinished tasks grouped under the same headings or standalone bold labels from the previous weekly note.

Enable it with:

- `Template heading`: the heading that contains weekly tasks, for example `# Tasks`
- `Preserve section structure`: on
- `Stop preserving before heading`: optional boundary, for example `## Reference`

## Before

Previous week:

```md
# Tasks

**Section A**
- [x] #alpha Completed task
- [ ] #alpha Open task
    - [ ] Nested open subtask

*Context note*
Keep this non-todo note with Section A.
- [ ] #alpha Draft follow-up

**Section B**
This is a plain note under Section B.
- [x] #beta Completed task

## Reference
```

Next week:

```md
# Tasks

**Section A**
- [ ] Existing next-week task

**Section C**
- [ ] Existing task in another section

## Reference
```

## After

Next week:

```md
# Tasks

**Section A**
- [ ] Existing next-week task

- [ ] #alpha Open task
    - [ ] Nested open subtask
*Context note*
Keep this non-todo note with Section A.
- [ ] #alpha Draft follow-up

**Section C**
- [ ] Existing task in another section

**Section B**
This is a plain note under Section B.

## Reference
```

Previous week, when `Delete todos from previous week` is enabled:

```md
# Tasks

**Section A**
- [x] #alpha Completed task
*Context note*
Keep this non-todo note with Section A.

**Section B**
This is a plain note under Section B.
- [x] #beta Completed task

## Reference
```
