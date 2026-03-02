# Settings

Settings can alter the functionality of DevTools.
Some of the settings default values can be changed with the command menu or in the settings tab.
A settings registration is represented by the `SettingRegistration` interface, declared in [common/SettingRegistration.ts](./SettingRegistration.ts).

All settings have to be registered using the function `Common.Settings.registerSettingExtension` which expects an object of type `SettingRegistration` as parameter.

As an example, take the registration of the `showHTMLComments` setting, which allows users to determine if HTML comments are shown in the Elements tree:

```ts
Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.ELEMENTS,
  order: 3,
  title: ls`Show HTML comments`,
  settingName: 'showHTMLComments',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: ls`Show HTML comments`,
    },
    {
      value: false,
      title: ls`Hide HTML comments`,
    },
  ],
});
```

A controller for the each setting is added to the 'preferences' tab if they are visible, that is, they have a `title` and a `category`.
They can also be set with the command menu if they have `options` and a `category` (options’ names are added as commands).

---

# The DevTools Revealer System

The `Revealer.ts` module provides a centralized system that allows different parts of the DevTools UI to "reveal" or display various types of objects without being tightly coupled to one another. It's a powerful decoupling mechanism that makes the codebase more modular, extensible, and performant.

For example, if you click on a CSS file link in the **Console**, this system is responsible for telling the **Sources** panel to open and display that file, without the Console needing a direct reference to the Sources panel.

## Core Concepts

1.  **`Revealer<T>` Interface**: This is the fundamental contract. A "Revealer" is any object (typically a UI panel or view) that knows how to display a specific type of data (`T`). It must implement a single method: `reveal(revealable: T): Promise<void>`.

2.  **"Revealable" Object**: This is any object you want to show to the user. It can be a source code file (`SDK.SourceCode.UISourceCode`), a network request (`SDK.NetworkRequest.NetworkRequest`), a DOM node (`SDK.DOMModel.DOMNode`), or any other custom data type.

3.  **`RevealerRegistry`**: This is a singleton class that acts as a central directory. It holds a list of all available `Revealer`s and maps them to the data types they can handle.

4.  **`RevealerRegistration<T>`**: This is a configuration object used to register a `Revealer` with the `RevealerRegistry`. It contains three key pieces of information:
    *   `contextTypes`: A function that returns an array of classes (constructors) that the `Revealer` can handle.
    *   `loadRevealer`: An asynchronous function that returns a promise, which resolves to an instance of the `Revealer`. This allows for the lazy-loading of UI panels, improving initial application performance.
    *   `destination` (optional): A user-friendly, localized string that describes where the object will be revealed (e.g., "Network panel", "Elements panel"). This is used for UI text, such as in context menus ("Reveal in...").

---

## How to Create a New Revealer

Here are the steps to implement a new revealer that can take the user to a specific place in the DevTools UI.

### Step 1: Define the Object to be Revealed

First, ensure you have a class or data type that you want to make "revealable."

```ts
// front_end/models/my_app/MyApp.ts
export class MyDataObject {
  id: string;
  constructor(id: string) {
    this.id = id;
  }
}
```

### Step 2: Implement the `Revealer` Interface in Your UI Panel

The UI component that will display the object (e.g., your panel or widget) must implement the `Common.Revealer.Revealer<T>` interface for your specific data type.

```ts
// front_end/panels/my_panel/MyPanel.ts
import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as MyApp from '../../models/my_app/my_app.js';

// 1. Implement the interface for your specific data type.
export class MyPanel extends UI.Panel.Panel implements Common.Revealer.Revealer<MyApp.MyDataObject> {
  // ... other panel implementation ...

  // 2. This is the required method from the interface.
  async reveal(dataObject: MyApp.MyDataObject): Promise<void> {
    // This is where you put your panel's custom logic to show the object.

    // First, ensure this panel is visible to the user.
    await UI.ViewManager.ViewManager.instance().showView('my-panel-view-id');

    // Now, highlight the specific item within your panel.
    console.log(`Revealing data object with ID: ${dataObject.id}`);
    // e.g., this.selectItemInUI(dataObject.id);
  }
}
```

### Step 3: Register Your Panel as a `Revealer`

This is the most important step. You must tell the central `RevealerRegistry` that `MyPanel` knows how to handle `MyDataObject`. This registration is typically done in a module's `-meta.ts` or `-legacy.ts` configuration file, which is executed at startup.

```ts
// front_end/panels/my_panel/my_panel-meta.ts
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';

const UIStrings = {
  /**
  * @description The name of the panel that reveals our custom data objects.
  */
  myPanel: 'My Awesome Panel',
};
const str_ = i18n.i18n.registerUIStrings('panels/my_panel/my_panel-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

Common.Revealer.registerRevealer({
  // 1. Specify the data type(s) this revealer can handle.
  contextTypes() {
    // Use a dynamic import to avoid circular dependencies at module load time.
    const {MyApp} = await import('../../models/my_app/my_app.js');
    return [
      MyApp.MyDataObject,
    ];
  },

  // 2. Provide a function to load and return an instance of your panel.
  //    This is what makes lazy loading possible.
  async loadRevealer() {
    const {MyPanel} = await import('./MyPanel.js');
    // If your panel is a singleton, return its instance, otherwise create a new one.
    return MyPanel.instance();
  },

  // 3. (Optional) Provide a user-facing destination name for context menus.
  destination: i18nLazyString(UIStrings.myPanel),
});
```

### Step 4: Trigger the Reveal from Anywhere

Now that your revealer is registered, any other part of the DevTools codebase can ask to reveal an instance of `MyDataObject` without needing to know anything about `MyPanel`.

```ts
// In some other file, e.g., a context menu action.
import * as Common from '../../core/common/common.js';
import * as MyApp from '../../models/my_app/my_app.js';

// Create an instance of the object you want to reveal.
const myObject = new MyApp.MyDataObject('abc-123');

// Call the global reveal function.
await Common.Revealer.reveal(myObject);
```
