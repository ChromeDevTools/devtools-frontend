# DevTools Component Documentation

This document explains how to add documentation pages for DevTools UI components. These pages provide a live, viewable showcase of component states and features, aiding development and review.

## What to Document

This documentation system is primarily intended for **reusable UI components** that are utilized across different parts of DevTools. When deciding whether to document a component, consider if it's a generic building block that other panels or features might consume.

## 1. Creating a Documentation File

Each component's documentation resides in a dedicated TypeScript file (`*.docs.ts`) co-located with the component itself.

*   **File Naming and Location**: Create a file named `[ComponentName].docs.ts` within the component's directory.
    *   **Example**: For `front_end/ui/components/icon_button/Icon.ts`, the documentation file would be `front_end/ui/components/icon_button/Icon.docs.ts`.

*   **File Structure**: The `*.docs.ts` file must export a `render` function that takes an `HTMLElement` container as an argument. This function is responsible for rendering various examples of the component into the provided container.

    ```typescript
    // front_end/ui/components/my_component/MyComponent.docs.ts

    import * as Lit from '../../lit/lit.js';
    import {MyComponent} from './mycomponent.js'; // Import the component to document

    const {html, render} = Lit;

    export function render(container: HTMLElement): void {
      // Render different states or examples of MyComponent into the container.
      render(html`
        <h2>Basic Usage</h2>
        <my-component .someProperty=${"Hello"}></my-component>

        <h2>With Different State</h2>
        <my-component .someProperty=${"World"}></my-component>
      `, container);
    }
    ```

## 2. Updating Build Configuration (`BUILD.gn`)

To ensure your documentation file is included in the build, you need to update two `BUILD.gn` files.

*   **Component-Level `BUILD.gn`**:
    Add a `component_doc("docs")` target to the component's `BUILD.gn` file. This target specifies the documentation file(s) and their dependencies.

    *   **Example**: For `front_end/ui/components/icon_button/BUILD.gn`:

        ```gn
        # front_end/ui/components/icon_button/BUILD.gn
        import("../../../../scripts/build/ninja/component_doc.gni")

        component_doc("docs") {
          sources = [ "Icon.docs.ts" ] # List your documentation files here
          deps = [
            ":bundle", # Dependency on the component's bundle
            "../../lit:bundle", # Dependency on lit-html
          ]
        }
        ```

*   **Top-Level `front_end/BUILD.gn`**:
    Add the newly created `:docs` target to the `docs` group in `front_end/BUILD.gn`. This makes your component's documentation discoverable by the overall documentation build system.

    *   **Example**: For `front_end/BUILD.gn`:

        ```gn
        # front_end/BUILD.gn
        group("docs") {
          deps = [
            # ... existing component docs ...
            "ui/components/icon_button:docs", # Add your component's docs target
          ]
        }
        ```

## 3. Viewing the Documentation Locally

To view your component documentation locally:

1.  **Build the documentation**:
    ```bash
    autoninja -C out/Default scripts/component_docs
    ```
    This will create an `index.html` file in `out/Default/gen` that you can server.
2.  **Start a local server, e.g. using python, at `out/Default/gen`**:
    ```bash
    python3  -m http.server 8000
    ```
    This will start a server on `localhost:8000`. You can then navigate to the URL to see your component's documentation.

## 4. Publishing Documentation

The component documentation is automatically built and published via a GitHub Action.

*   **Workflow File**: The GitHub Actions workflow responsible for this is located at `.github/workflows/publish-component-docs.yml`.
*   **Hosted Documentation**: The live documentation is hosted on GitHub Pages at: [https://chromedevtools.github.io/devtools-frontend/](https://chromedevtools.github.io/devtools-frontend/)
