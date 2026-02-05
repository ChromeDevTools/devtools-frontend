# Requirements Specification: Elements Panel Tree Selection and Hover

## 1. Overview
The Elements panel DOM tree visualizes the structure of the inspected page. As users navigate this tree—either by clicking or hovering—the panel provides visual feedback to indicate the currently active node and offers contextual actions like a console hint and an AI assistance button.

## 2. Functional Requirements

### 2.1 Selection State
*   **Visual Indicator**: When a tree node is selected, its entire row must be highlighted visually. This is achieved by rendering a background spanning the full width of the tree, visually anchoring the node.
*   **Full Row Coverage**: The selection highlight must extend to the left edge of the panel, accounting for the dynamic indentation of the DOM tree structure.
*   **Behavior on Deselection**: When a node loses selection focus, the visual highlight must be removed immediately.

### 2.2 Console Hint (`== $0`)
*   **Visibility**: The `$0` hint must only appear on the currently selected tree node.
*   **Placement**: It must be positioned to the right of the closing tag or the node's text content.
*   **Tooltip**: Hovering over the hint must display a tooltip explaining its purpose: `Use $0 in the console to refer to this element.`
*   **Accessibility**: The hint itself should be marked hidden from screen readers (`aria-hidden="true"`) to prevent redundancy, as the selection state inherently implies `$0` context to power users.

### 2.3 Floating AI Assistance Button
*   **Eligibility**: The AI button must only appear for valid `Element` nodes (e.g., `<button>`, `<div>`). It must not appear on text nodes, comments, but does appear for closing tags.
*   **Visibility Conditions**:
    *   The button must be visible when the node is actively hovered by the user's cursor.
    *   The button must also be visible when the node currently holds the selection state (even if not hovered).
*   **Action**: Clicking the button must:
    *   Select the node (if it wasn't already selected).
    *   Open the AI assistance panel with the context of the selected node.
    *   Not propagate the click event to the underlying row (which might otherwise cause tree expansion/collapse).
*   **Visual Design**: It should render as a floating button using the standard DevTools AI icon, with the tooltip matching the registered AI action title.

## 3. Implementation Details (Declarative UI)
The selection background, `$0` hint, and AI floating button are integrated into the primary Lit-html render cycle (`DEFAULT_VIEW`) for the tree element. This replaces previous imperative DOM creation strategies, routing all visibility and styling updates through a unified state object passed to the view.
