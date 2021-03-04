## How to prevent a term being localized?

Any text within the backticks will not be translated.
For example, if the 'robots.txt' in string 'Requesting for robots.txt ...' should not be translated:

```javascript
// in example.js file

import * as i18n from '../i18n/i18n.js';
const UIStrings = {
  /**
   * @description Example description. Note: "robots.txt" is a canonical filename and should not be translated.
   */
  requestMessage: 'Requesting for `robots.txt` ...',
};
const str_ = i18n.i18n.registerUIStrings('example.js', UIStrings);

const message = i18nString(UIStrings.requestMessage);
```
The string will rendered with robots.txt not translated and without the backticks around it
```javascript
  'Requesting for robots.txt ...'
```

### Phrases that are fully locked
Any text that is fully locked should not go into the UIStrings object. To make your intention clear
or to make TypeScript happy, there are two methods `i18n.i18n.lockedString` and `i18n.i18n.lockedLazyString`
that can be used instead of having fully locked phrases via `i18nString`.

## What should not be localized?
In general, branding related terms and code snippets are the ones to look for, and Sometimes some technical terms. Some examples:

**Brandings:**
Lighthouse, GitHub, DevTools, Chrome Data Saver, Safari, BlackBerry Z30, Kindle Fire HDX, Pixel 2, Microsoft Lumia 550
**Code snippets:**
localhost:9229, console.clear(), --memlog=all, url:a.com
**Technical terms:**
DOM, DIV, aria...
