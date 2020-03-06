When you introduce a new UI string or modify an existing one that will be displayed to the users, or remove a string that is localized, follow these steps so that it can be localized.

**Table of Contents**
- [Adding a string](#adding-a-string)
  - [Frontend source code](#frontend-source-code)
  - [Frontend GRDP file](#frontend-grdp-file)
- [Modifying a string](#modifying-a-string)
- [Removing a string](#removing-a-string)
- [Adding a new GRD file](#adding-a-new-grd-file)

## Adding a string
Before proceeding, make sure you know the different [localization APIs](localization_apis.md) and know which one you should use.

### Frontend source code

1. Wrap your string with the appropriate localization API for your use case, for example, `` ls`Add breakpoint` ``.

2. If your string contains variables, consider the following cases:
   1. Directly substitute variables, as how you would normally inject variables into a template literal with `${}`, **only if** your variable satisfies one of the following

      1. If the variable is a number, e.g. `` ls`${renderedWidth} × ${renderedHeight} pixels` ``
      2. or if your variable is a string that likely doesn't need to be localized (for example, DOM, or a url),

      3. or if it's a string that is already localized somewhere (for example, Console and other tool titles)

   2. Localize your variable with `ls`, then do variable substitution in your template literal, for example

      ```javascript
      const title = ls`New Tool`
      const message = ls`Click ${title} for more details`
      ```

3. Make sure your string is localizable:

   1. Do not assume word order by using concatenation. Use the whole string.

      ❌
      ```javascript
      ls`Add`  + ls`breakpoint`
      ```

      ✔️
      ```javascript
      ls`Add breakpoint`
      ```
   2. Variable substitution over concatenation. This is so that the translators can adjust variable order based on what works in another language. For example:

      ❌
      ```javascript
      ls`Check ` + title + ls` for more information.`
      ```

      ✔️
      ```javascript
      ls`Check ${title} for more information.`
      ```
   3. Only inject variables when necessary, i.e., do not extract common substrings from similar messages.
      - Example: <https://developer.mozilla.org/en-US/docs/Mozilla/Localization/Localization_content_best_practices#Idiom>
   4. Prefer simple strings whenever possible. Try to move conditionals out of the string. For example:

      ❌
      ```javascript
      ls`Reveal${destination ? ls` in ${destination}` : ``}`
      ```
      ✔️
      ```javascript
      destination ? ls`Reveal in ${destination}` : ls`Reveal`
      ```
   5. When your string contains plurals, make sure you pluralize by pulling conditionals outside of the string. This is because in other languages, plurals can be different from English ones. For example:

      ❌
      ```javascript
      ls`${count} insertion${count !== 1 ? `s` : ``}`
      ```

      ✔️
      ```javascript
      if (count === 0)
        ls`No insertion`
      else if (count === 1)
        ls`1 insertion`
      else
        ls`${count} insertions`
      ```
   6. In general, a complete sentence is preferred. This usually increases the localizability of a string, as the translators have the context of the string. For example:

      ❌
      ```javascript
      let description = ls`first part`
      if (condition)
        description += ls` second part`
      ```

      ✔️
      ```javascript
      let description
      if (condition)
        description = ls`first part second part`
      else
        description = ls`first part`
      ```
   7. If your string contains leading or trailing white space, it's usually an indication that it's half of a sentence. This decreases localizability as it's essentially concatenating. Modify it so that it doesn't contain leading or trailing white space anymore if you can.
   8. Do not use nested template literals. This is due to a limitation of the release minifier. For more info see https://crbug.com/973285.

      ❌
      ```javascript
      UI.Fragment.build`<a>${ls`Learn more`}</a>`
      ```

      ✔️
      ```javascript
      const link = ls`Learn more`
      UI.Fragment.build`<a>${link}</a>`
      ```
   9. What kinds of terms should be localized?

      ❌

      - Numbers: 1, 1.23, 1.2e3, etc.
      - Application data: error codes, enums, database names, rgba, urls, etc.

      ✔️

      - Words and sentences
      - Punctuation
      - Units of measurement: kb/s, mph, etc.

### Frontend GRDP file
1. Run any of the following commands to have new strings automatically added to the corresponding grdp file:
  - `git cl presubmit --upload`, or
  - `node scripts/check_localizable_resources.js --autofix` under the devtools folder
2. Manually add information to the new grdp message. See [Adding Descriptive Information to GRDP Messages](grdp_files.md)

## Modifying a string
Follow the above steps.

## Removing a string
Just remove the string from the frontend and it will be automatically removed by the presubmit script.

## Adding a new GRD file
This is a rare case, but if a new GRD file is introduced, please read the guidance here:
* https://www.chromium.org/developers/tools-we-use-in-chromium/grit/grit-users-guide
* https://cs.chromium.org/chromium/src/tools/gritsettings/README.md.
  * Note that you need to add the grd file to translation_expecations.pyl. If you don't an error will occur when Google's translation pipeline runs.
