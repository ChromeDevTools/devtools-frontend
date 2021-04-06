# Settings

Settings can alter the functionality of DevTools.
Some of the settings default values can be changed with the command menu or in the settings tab.
A settings registration is represented by the `SettingRegistration` interface, declared in [common/SettingRegistration.ts](./SettingRegistration.ts).

All settings have to be registered using the function `Common.Settings.registerSettingExtension` which expects an object of type `SettingRegistration` as parameter.

As an example, take the registration of the `showHTMLComments` settting,  which allows users to determine if HTML comments are shown in the Elements tree:
```js
Common.Settings.registerSettingExtension({
  category:  Common.Settings.SettingCategory.ELEMENTS,
  order:  3,
  title:  ls`Show HTML comments`,
  settingName:  'showHTMLComments',
  settingType:  Common.Settings.SettingType.BOOLEAN,
  defaultValue:  true,
  options: [
    {
      value:  true,
      title:  ls`Show HTML comments`,
    },
    {
      value:  false,
      title:  ls`Hide HTML comments`,
    },
  ],
});
```

A controller for the each setting is added to the 'preferences' tab if they are visible, that is, they have a `title` and a `category`.
They can also be set with the command menu if they have `options` and a `category` (options’ names are added as commands).
