When you introduce a new UI string or modify an existing one that will be displayed to the users, or remove a string that is localized, follow these steps so that it can be localized.

**Table of Contents**
- [Adding a string](#adding-a-string)
- [Modifying a string](#modifying-a-string)
- [Removing a string](#removing-a-string)

## Adding a string
Before proceeding, make sure you know the different [localization APIs](localization_apis_V2.md) and know which one you should use.

Code example:
  ```javascript
  import * as i18n from '../i18n/i18n.js';

  // at the top of example.js file, after import statements
  const UIStrings = {
    /**
      * @description A string that is already added
      */
    alreadyAddedString: 'Someone already created a "UIStrings = {}" and added this string',
    /**
      * @description This is an example description for my new string
      */
    addThisString: 'The new string I want to add',
    /**
      * @description This is an example description for my new string with placeholder
      * @example {example for placeholder} PH1
      */
    addAnotherString: 'Another new string I want to add, with {PH1}',
  };
  const str_ = i18n.i18n.registerUIStrings('example.js', UIStrings);
  ```

  ```javascript
  // in example.js file, where you want to call the string

  const message1 = i18n.i18n.getLocalizedString(str_, UIStrings.addThisString);
  console.log(message1); // The new string I want to add

  const message2 = i18n.i18n.getLocalizedString(str_, UIStrings.addAnotherString, {PH1: 'a placeholder'});
  console.log(message2); // Another new string I want to add, with a placeholder
  ```
1. If there is already `UIStrings = {}` declared in the file, add your string to it.
  If there isn't `UIStrings = {}` in the file, create one and add your string, also add the line `const str_ = i18n.i18n.registerUIStrings({the current fileName.js, relative to front_end}, UIStrings);` so the new UIStrings can be registered into `en-US.json`.


2. Add description and examples for placeholder(if any):
    1. To specify the description, use `@description …`
    `@description This is an example description for my new string`
    2. To specify an example for placeholder, use `@example {…} …`
    `@example {example for placeholder} PH1`

3. Make sure your string is localizable:

   1. Do not assume word order by using concatenation. Use the whole string.
      ❌
      ```javascript
      `Add` + `breakpoint`
      ```
      ✔️
      ```javascript
      `Add breakpoint`
      ```
      or
      ❌
      ```javascript
      let description = `first part`
      if (condition)
        description += ` second part`
      ```
      ✔️
      ```javascript
      let description
      if (condition)
        description = `first part second part`
      else
        description = `first part`
      ```
   2. Use placeholder over concatenation. This is so that the translators can adjust variable order based on what works in another language. For example:
      ❌
      ```javascript
      `Check ` + title + ` for more information.`
      ```
      ✔️
      ```javascript
      `Check {PH1} for more information.`, {PH1: title}
      ```
   3. If your string contains <b>leading or trailing white space</b>, it's usually an indication that it's half of a sentence. This decreases localizability as it's essentially concatenating. Modify it so that it doesn't contain leading or trailing white space anymore if you can.
   4. Check if there are something should not be localized (see [locked_terms](locked_terms_V2.md)) for more details.

      ❌

      - Numbers: 1, 1.23, 1.2e3, etc.
      - Application data: error codes, enums, database names, rgba, urls, etc.

      ✔️

      - Words and sentences
      - Punctuation
      - Units of measurement: kb/s, mph, etc.
4. The following commands would add the new strings to `en-US.json`:
  - `git cl presubmit --upload`, or
  - `node third_party/i18n/collect-strings.js` under the DevTools src folder

## Modifying a string
1. Update the string you want to modify in `UIStrings`
2. Update the description and placeholders of the string if necessary

## Removing a string
1. Remove your string and the metadata from `UIStrings`
