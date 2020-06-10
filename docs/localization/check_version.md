Localization V1 and V2 would both exist in the DevTools during the migration. To check whether the file you are touching is migrated or not:
1. Is there a `const UIStrings = ` declare at the top of the file after import statements?
✔️: V2
2. Is there `i18n` referenced in the file?
✔️: V2
3. Is there `ls`` `, `Common.UISting()`, or `UI.formatLocalized()` in the file?
✔️: V1

Presubmit step would also inform you if there are V1 APIs used in a migrated file.
