# How to write UI text

[TOC]

## Checklist

For every CL that adds or changes UI texts in the Chrome DevTools front-end, use
this checklist to make sure that the new or changed strings meet the basic
requirements for good UX writing.

### General

*   Give the right info at the right time and place
*   Don't write more than 1 sentence but if you do, break up text into sections, lists, tooltips, and <u>Learn more</u> links
*   Be friendly but not ridiculous
    *   ✔️ `This API lets you collect data about what your users like.`
    *   ❌ `Dude! This API is totally awesome!`
    *   ❌ `This API may enable the acquisition of information pertaining to user preferences.`

### Patterns

*   Follow the
    [F pattern](https://m3.material.io/foundations/content-design/style-guide/ux-writing-best-practices#3a833840-43db-4f6e-8133-c4665c17d176)
*   One sentence, one idea
*   "To get what you want, do this"
    *   ✔️ `To save changes, drop a folder here`
    *   ❌ `Drop in a folder to add to Workspace (what's a Workspace?)`
* "Do this to recover"
    *   ✔️ `Shorten filename to 64 characters or less`
    *   ❌ `Invalid filename`

### Mechanics

*   Say “you”
*   [Look up](https://translate.google.com) short synonyms
    *   ✔️ `Keep, more, stop, get, send, add, fit, …`
    *   ❌ `Preserve, additional, prevent, receive, submit, create, …`
*   Cut, cut, cut
    *   ❌ `Please, sorry, very, strongly, seamless, awesome, there is, there are, fast, quick, …`
*   Use active voice
    *   ✔️ `DevTools loaded source maps`
    *   ❌ `Source maps were loaded by DevTools`
*   Use [contractions](https://developers.google.com/style/contractions) but avoid [Latin abbreviations](https://m3.material.io/foundations/content-design/style-guide/ux-writing-best-practices#98d02949-1933-49df-b136-f7b72620b950)
    *   ✔️ `Can’t, don’t, isn’t, for example, that is, and more`
    *   ❌ `Cannot, do not, is not, e.g., i.e., etc.`
*   Use simple and common terms
    *   ✔️ `Website, page, extension, function`
    *   ❌ `Debug target, debuggee, content script, call frame`

### Cosmetics

*   Use sentence-case, not Title-Case (see [Capitalization guidelines](#capitalization-guidelines) below).
    *   ✔️ `Periodic background sync`
    *   ❌ `Periodic Background Sync`
*   Punctuate consistently
    *   Use serial comma: A, B, and C
    *   Skip periods in case of a single sentence
*   Don't spell out numbers
    *   ✔️ `1, 2, 3, …`
    *   ❌ `One, two, three, …`
*   Use just 2 types of links: <u>Learn more</u> and the
    [GM3 `Help` icon](https://fonts.corp.google.com/icons?selected=Google+Symbols:help).


## Capitalization guidelines

### Capitalize product names

Capitalize [product names](https://developers.google.com/style/product-names#capitalize),
web API names, but not [feature names](https://developers.google.com/style/product-names#feature-names).

*   ✔️ `Chrome DevTools (product) lets you debug Background Fetch API (web API) by logging background fetch (feature) events.`
*   ❌ `Chrome devtools lets you debug background fetch API by logging Background Fetch events.`

### Use sentence case

Use sentence case in [UI element names](https://m3.material.io/foundations/content-design/style-guide/ux-writing-best-practices#fc5c2a78-f4bf-4d42-bdac-42ff80391129) as well as [titles and headings in text](https://developers.google.com/style/capitalization#capitalization-in-titles-and-headings).

That is, capitalize only the first word in the title, the first word in a
subheading after a colon, and any proper nouns or other terms that are
always capitalized a certain way.

*** aside
Examples: **Network request blocking**, **Blocked response cookies**
***

### Spell UI elements in text

When mentioning [UI elements in text](https://developers.google.com/style/ui-elements#formatting),
spell their names in bold and exactly as they are spelled, including
capitalization, which should be in sentence case.

*** aside
Example: Open the **Network request blocking** panel.
***

If an element doesn't have a
name however, <em>don't</em> capitalize its term and <em>don't</em> spell it in
bold.

*** aside
Example: A filter bar at the top of the **Network** panel, not ~~the **Filter** bar~~.
***

*** note
**Tip:** You can "stack" navigation paths in text regardless of element type.
For example:

In **Settings** > **Preferences** > **Appearance** > **Panel layout**,
select `auto`.

That was [Panel] > [Tab] > [Section] > [Drop-down menu].
***

## Resources

1.  How to write UI texts
    ([slides](https://docs.google.com/presentation/d/1AfsX0JaMd1iBNH1WL2dMswXLuhGSU5j2cyAEHkJpoNA?resourcekey=0-cfKK72Q_tV8-uakhzuVx-g),
    [recording](https://drive.google.com/file/d/19wOnbZHvXhH-tQLuE0M2B9fQMjosLC9O?resourcekey=0-FBrvUvnWMq0Wa98vkea9-A))

