Localizable strings in the DevTools frontend need to be wrapped in localization calls. There are two different calls.

## i18n.i18n.getLocalizedString
The basic API to make a string (with or without placeholder) localizable.
The first argument is the UIString instance function `str_`.
The second argument is the string reference in `UIStrings`
The third argument is an object for placeholders (if any)

```javascript
// at the top of example.js file, after import statements

const UIStrings = {
  /**
    * @description This is an example description for my new string with placeholder
    * @example {example for placeholder} PH1
    * @example {example 2 for placeholder 2} PH2
    */
  addAnotherString: 'Another new string I want to add, with {PH1} and {PH2}',
};

message = i18n.i18n.getLocalizedString(str_, UIStrings.addAnotherString, {PH1: 'a placeholder', PH2: 'another placeholder'});
```

## i18n.i18n.getFormatLocalizedString
This call returns a **span element**, not a string. It is used when you want to construct a DOM element with a localizable string, or localizable content that contains some other DOM element.

```javascript
// Create the string in UIString
/**
*@description Message in Coverage View of the Coverage tab
*@example {reload button icon} PH1
*@example {record button icon} PH2
*/
clickTheRecordButtonSToStart: 'Click the reload button {PH1} to reload or record button {PH2} start capturing coverage.',

// Element with localizable content containing two DOM elements that are buttons
const reloadButton = UI.createInlineButton(UI.Toolbar.createActionButtonForId('coverage.start-with-reload'));
const recordButton = UI.createInlineButton(UI.Toolbar.createActionButton(this._toggleRecordAction));
message = i18n.i18n.getFormatLocalizedString(str_, UIStrings.clickTheReloadButtonSToReloadAnd, {PH1: reloadButton, PH2:recordButton });
```
