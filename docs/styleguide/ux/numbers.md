# How to format numbers

[TOC]

## Checklist

### General

Use [Intl.NumberFormat] consistently for all number formatting within Chrome
DevTools' UI, including - but not limited to - formatting bytes and times. This
way we ensure that numbers are formatted the same way throughout the whole UI
and we don't put the burden of ensuring this level of consistency on the
translators for the various languages.

### Text length

Pay attention to text length, because the unit portion can be longer in different
locales, sometimes even longer than 4 characters. Try to alleviate the worse UX
of strings being too long.

Concretely these locales produces the longest unit strings, so make sure to
explicitly test for them:

*  `th` (Thai)
*  `vi` (Vietnamese)
*  `hi` (Hindi)
*  `kn` (Kannada)
*  `ur` (Urdu)

We also suggest to explicitly check `en-US` (English) and `de` (German) locales.

## Examples

### Formatting percentages

Consider the following snippet for formatting percentage values:

```js
const {locale} = i18n.DevToolsLocale.DevToolsLocale.instance();
const formatter = new Intl.NumberFormat(locale, {
  style: 'percent',
  maximumFractionDigits: 1,
});
const formattedValue = formatter.format(percentageValue);
```

Note that this code will only work after the `DevToolsLocale` has been
initialized.

### Formatting bytes

Prefer the helper exported by [ByteUtilities.ts] when formatting byte values.
For example:

```js
// Formatting bytes
i18n.ByteUtilities.bytesToString(99);

// Formatting kilobytes
i18n.ByteUtilities.bytesToString(1234);

// Formatting megabytes
i18n.ByteUtilities.bytesToString(1500 * 1000);
```

### Formatting times

Prefer the helpers exported by [time-utilities.ts] when formatting time values.
For example:

```js
// Formatting precise milliseconds
i18n.TimeUtilities.preciseMillisToString(6.12345);

// Formatting milliseconds (lossy)
i18n.TimeUtilities.millisToString(26500);

// Formatting seconds
i18n.TimeUtilities.secondsToString(7849);
```

## Tips

### Defining formatters upfront

Use `defineFormatter()` from the [NumberFormatter.ts] file in order to define
a formatter upfront. The function has some magic built into such that it defers
the creation of the underlying `Intl.NumberFormat` instance until the first
invocation of `format()` or `formatToParts()` methods, and therefore it's safe
to define the formatters this way without running into the issue that the
`DevToolsLocale` isn't initialized yet:

```js
import * as i18n from 'path/to/i18n/i18n.js';

const percentageFormatter = i18n.NumberFormatter.defineFormatter({
  style: 'percent',
  maximumFractionDigits: 1,
});
```


[Intl.NumberFormat]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
[ByteUtilities.ts]: ../../../front_end/core/i18n/ByteUtilities.ts
[NumberFormatter.ts]: ../../../front_end/core/i18n/NumberFormatter.ts
[time-utilities.ts]: ../../../front_end/core/i18n/time-utilities.ts
