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
