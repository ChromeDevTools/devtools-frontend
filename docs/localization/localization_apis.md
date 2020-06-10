Localizable strings in the DevTools frontend need to be wrapped in localization calls. This guide walks you through a few choices.

## ls tagged template literal [preferred]
Template literal prefixed with `ls` that returns a translation string. Use on string with or without substitution and return a translation string. To substitute variable, wrap it with `${}`, e.g. ``` ls`Hi ${name}` ```.

`ls` is generally preferred as it's more readable. The only thing to pay attention to is that all the variables will be converted to string, so if you want to format the variable in a specific way, you have to manually do it. Example:

```javascript
const progress = 0.734156;
ls`${Number.parseFloat(progress).toPrecision(2)}% done`;
```

## Common.UIString(string, variable1, variable2, ...) [deprecated]
Functionally equivalent to `ls` as it also returns a translation string. To substitute variables, use formatters (%s, %d, %.1f, %.2f, and so on) inside the string as the first argument, and use variables as the rest of the call arguments. Example: `Common.UIString('Hi %s, you have %d unread messages', name, count)`.

If you want to format a float with a specific precision, use a float formatter with precision (e.g. %.1f, %.2f), e.g. `Common.UIString('Default: %.1f', defaultValue)`. This is the only case where `Common.UIString` may be more preferable, but of course you can write/use a precision conversion function and call it in `ls`.

## UI.formatLocalized(string, [...])
This call returns a **span element**, not a string. It is used when you want to construct a DOM element with a localizable string, or localizable content that contains some other DOM element. Use the %s formatter inside the localizable string, which is the first argument, and use a list of strings or DOM elements as the second argument. When %s is replaced by a string, it's added as text to the DOM element. For example:

```javascript
// Create a span element with localizable string
reasonElement = UI.formatLocalized('Element has empty alt text.', []);

// Element with localizable content containing two DOM elements that are buttons
const recordButton = UI.createInlineButton(UI.Toolbar.createActionButton(this._toggleRecordAction));
const reloadButton = UI.createInlineButton(UI.Toolbar.createActionButtonForId('coverage.start-with-reload'));
message = UI.formatLocalized(
  'Click the record button %s to start capturing coverage.\nClick the reload button %s to reload and start capturing coverage.',
  [recordButton, reloadButton]);

// Element with error message text and a link
UI.formatLocalized('%s. Read % for more.', [errorMessage, link])
```

## Common.UIStringFormat(string)
This call creates a **formatter** that takes a set number of variables and substitute them in. Call `format(var1, var2, ...)` on the formatter. If you need to use the same format for different variables repeatedly, use this function to save redundant code.

```javascript
// Format minute to 1 decimal place
const minutesFormat = new Common.UIStringFormat('%.1f min');

minutesFormat.format(1.256); // --> '1.2 min'
```