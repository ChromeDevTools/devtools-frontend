## How to prevent a term being localized?
If a string contains some terms that should not be localized, they should be wrapped inside placeholder tags `<ph name="LOCKED_[1-9]"></ph>` in the .grdp file. The number after `LOCKED_` starts from 1, and increments when a single string has more then 1 terms that should not be localized.

### Examples
Frontend javascript file:
```javascript
ls`You can log your messages using console.log() in the DevTools console.`
```

Frontend .grdp file:

(`console.log()` and `DevTools` should not be translated)
```html
  <message name="IDS_DEVTOOLS_d59048f21fd887ad520398ce677be586" desc="Text show up in the information bar in the DevTools">
    You can log your messages using <ph name="LOCKED_1">console.log()</ph> in the <ph name="LOCKED_2">DevTools</ph> console.
  </message>
```

## What should not be localized?
In general, branding related terms and code snippets are the ones to look for.

Some examples:
- **Brandings:**
Lighthouse, GitHub, DevTools, Chrome Data Saver, Safari, BlackBerry Z30, Kindle Fire HDX, Pixel 2, Microsoft Lumia 550
- **Code snippets:**
localhost:9229, console.clear(), --memlog=all, url:a.com
