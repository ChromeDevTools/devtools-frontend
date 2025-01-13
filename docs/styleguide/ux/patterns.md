# How to (re)use common UX patterns

There are some common UX patterns in DevTools, such as linking from one place to another, loading states, or dialogs. Please refer to this guide if the pattern you intend to use can be found here.

Please also note that while some patterns can be summarized into a [component](components.md), this guide focuses more on the end-user experience than the actual implementation.

## Overlays

Overlays are visual aids that are superimposed on the webpage you're inspecting. These overlays provide extra information or highlight specific aspects of the page to help you with debugging and development.

### What can they do?
Draws non-interactive overlays on inspected page directly.

### When should you use them?
When you want to visually annotate DOM elements, for example, for measurements, guides, column, anchors, etc. This has the benefit of almost no context switch since the debugging information is right next to the debugged target.

### Examples

Complicated layout concepts such as Flexbox and Grid can use overlays to help developers understand these layout intricacies better by showing their alignment, order, and sizing.

### Things to consider

Overlays are not interactive yet, and is a bit tricky to implement.

## Linkability

### What can they do?

A linkable text or visual element can bring developers to another place when interacted.

### When should you use them?

Linkability can be added to visual elements when you want to help developers understand the relationship between multiple pieces of information in DevTools, or provide a quick way to jump from a

### Common patterns and their implementations

- Hyperlink, underlined: jump to another panel, or open a tab with a URL
- Anchorlink, underlined: jump to another element (CSS variables, popover)
- Button, not underlined: for example the node in the Animations panel. They just "highlight" something in the Elements panel, but you don't jump around.

On hover, linkable texts should show a pointer cursor.

### Examples

Certain CSS and DOM features that span across different elements or style rules have links between them, such as "popovertarget" attributes in the DOM tree, and CSS variables.

### Things to consider

Underlines can be visually distracting when used heavily, and we advise that when there tends to be a lot linkable elements, you _only_ show the underline on hover. A canonical example is CSS variable linking in the Styles tab.

## Visual hints for non-default states

### What can they do?

Visual hints signify to users that something is not in its default state with some visual hints, such as greyed-out texts, yellow warning icons, or crossed-out texts. They do not necessarily mean something is not correct: think about the text style for comments in IDEs.

### When should you use them?

You can use them when you want to help developers realize something is not in the default state, and optionally guide them how to fix it. Some states are called “default” for a reason: you write `color: red` and will expect your element’s text to turn red. If it does not turn red, it is in a non-default state. Anything that is acting abnormal is something we should flag to the users with visual hints so that they know what went wrong more easily.

Currently, these visual hints for non-default states usually exist in the Elements panel and the Sources panel, where developers often iteratively modify their page's code to debug.

### Common patterns and their implementations

#### Pale Text

We show pale texts for:
- selectors: the Styles tab shows matched selectors in regular text and unmatched ones in pale text.
- non-inherited properties that are shown because they exist within the same CSS style rule that happens to contain an inherited property for an element.

#### Crossed-out text
- We strike out the entire declaration when
it's commented-out, e.g. toggled inactive,
superseded by another declaration (with a higher specificity, etc.).
- We strike out inactive values, such as inactive custom variable fallbacks, inactive min()/max() values, and inactive position-try fallbacks.

#### Italic text

We show italic texts for style texts that cannot be edited. For example, UA stylesheets cannot be edited, and they are shown in italic texts.

### Examples

The Styles tab's [public documentation](https://developer.chrome.com/docs/devtools/css/issues) contains illustrative examples of how visual hints are used here.

### Things to consider

Visual hints, when used heavily, will create visual noises and become less effective for warning people. Please consider how common the non-default state is before using visual hints on them.
