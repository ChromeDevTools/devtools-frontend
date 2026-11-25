// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/jslog-context-list.ts';

import {RuleTester} from './utils/RuleTester.ts';
process.env.ESLINT_FAIL_ON_UNKNOWN_JSLOG_CONTEXT_VALUE = 'true';
new RuleTester().run('jslog-context-list', rule, {
  invalid: [
    {
      name: 'disallows unknown context value in setAttribute',
      code: `
        menuItemElement.setAttribute('jslog', \`\${VisualLogging.action('uNkNown').track({click: true})}\`);
      `,
      errors: [
        {
          messageId: 'unknownJslogContextValue',
          data: {value: 'uNkNown'},
        },
      ],
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'disallows unknown context value in lit dialog template',
      code: `
        Lit.render(Lit.html\`
          <dialog @click=\${this.#handlePointerEvent} @pointermove=\${this.#handlePointerEvent} @cancel=\${this.#onCancel}
                  jslog=\${VisualLogging.dialog('uNkNown2').track({resize: true, keydown: 'Escape'}).parent('mapped')}>
            <div id="content-wrap">
              <div id="content">
                <slot></slot>
              </div>
            </div>
          </dialog>
        \`, this.#shadow, { host: this });
            `,
      errors: [
        {
          messageId: 'unknownJslogContextValue',
          data: {value: 'uNkNown2'},
        },
      ],
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'disallows unknown actionId in registerActionExtension',
      code: `
        UI.ActionRegistration.registerActionExtension({
          category: UI.ActionRegistration.ActionCategory.RECORDER,
          actionId: 'uNkNown3',
          title: i18nLazyString(UIStrings.createRecording),
          async loadActionDelegate() {
            const Recorder = await loadRecorderModule();
            return new Recorder.RecorderController.ActionDelegate();
          },
        });
            `,
      errors: [
        {
          messageId: 'unknownJslogContextValue',
          data: {value: 'uNkNown3'},
        },
      ],
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'disallows unknown id in registerViewExtension',
      code: `
        UI.ViewManager.registerViewExtension({
          location: UI.ViewManager.ViewLocationValues.PANEL,
          id: 'uNkNown4',
          commandPrompt: i18nLazyString(UIStrings.showSources),
          title: i18nLazyString(UIStrings.sources),
          order: 30,
          async loadView() {
            const Sources = await loadSourcesModule();
            return Sources.SourcesPanel.SourcesPanel.instance();
          },
        });
            `,
      errors: [
        {
          messageId: 'unknownJslogContextValue',
          data: {value: 'uNkNown4'},
        },
      ],
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'disallows unknown setting name in createSetting',
      code: `
    this.disableCaptureJSProfileSetting =
        Common.Settings.Settings.instance().createSetting('uNkNown6', false);
            `,
      errors: [
        {
          messageId: 'unknownJslogContextValue',
          data: {value: 'uNkNown6'},
        },
      ],
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'disallows unknown jslogContext in contextMenu.appendItem',
      code: `
        contextMenu.defaultSection().appendItem(
            i18nString(UIStrings.refresh), this.refreshCallback.bind(this), {jslogContext: 'uNkNown7'});
            `,
      errors: [
        {
          messageId: 'unknownJslogContextValue',
          data: {value: 'uNkNown7'},
        },
      ],
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'disallows unknown setting name in qualified SettingDescriptor',
      code: `
        export const mySetting: Common.Settings.SettingDescriptor<boolean> = {
          name: 'uNkNownSetting1',
          type: Common.Settings.SettingType.BOOLEAN,
          defaultValue: false,
        };
      `,
      errors: [
        {
          messageId: 'unknownJslogContextValue',
          data: {value: 'uNkNownSetting1'},
        },
      ],
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'disallows unknown setting name in unqualified SettingDescriptor',
      code: `
        export const mySetting: SettingDescriptor<boolean> = {
          name: 'uNkNownSetting2',
          type: SettingType.BOOLEAN,
          defaultValue: false,
        };
      `,
      errors: [
        {
          messageId: 'unknownJslogContextValue',
          data: {value: 'uNkNownSetting2'},
        },
      ],
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'disallows unknown setting name in ConditionalSettingDescriptor',
      code: `
        export const mySetting: Common.Settings.ConditionalSettingDescriptor<boolean, string> = {
          name: 'uNkNownSetting3',
          type: Common.Settings.SettingType.BOOLEAN,
          defaultValue: false,
          isAvailable: () => ({available: true}),
        };
      `,
      errors: [
        {
          messageId: 'unknownJslogContextValue',
          data: {value: 'uNkNownSetting3'},
        },
      ],
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'disallows unknown setting name with satisfies SettingDescriptor',
      code: `
        export const mySetting = {
          name: 'uNkNownSetting4',
          type: Common.Settings.SettingType.BOOLEAN,
          defaultValue: false,
        } satisfies Common.Settings.SettingDescriptor<boolean>;
      `,
      errors: [
        {
          messageId: 'unknownJslogContextValue',
          data: {value: 'uNkNownSetting4'},
        },
      ],
      filename: 'front_end/components/test.ts',
    },
  ],
  valid: [
    {
      name: 'allows known action context string in setAttribute',
      code: `
        menuItemElement.setAttribute('jslog', \`\${VisualLogging.action('elements').track({click: true})}\`);
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows empty action context in setAttribute',
      code: `
        menuItemElement.setAttribute('jslog', \`\${VisualLogging.action().track({click: true})}\`);
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows dynamic action context variable in setAttribute',
      code: `
        menuItemElement.setAttribute('jslog', \`\${VisualLogging.action(this.jslogContext).track({click: true})}\`);
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows dynamic dialog context in lit template',
      code: `
        Lit.render(Lit.html\`
          <dialog @click=\${this.#handlePointerEvent} @pointermove=\${this.#handlePointerEvent} @cancel=\${this.#onCancel}
                  jslog=\${VisualLogging.dialog(this.#props.jslogContext).track({resize: true, keydown: 'Escape'}).parent('mapped')}>
            <div id="content-wrap">
              <div id="content">
                <slot></slot>
              </div>
            </div>
          </dialog>
        \`, this.#shadow, { host: this });
            `,
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows enum actionId in registerActionExtension',
      code: `
	UI.ActionRegistration.registerActionExtension({
	  category: UI.ActionRegistration.ActionCategory.RECORDER,
	  actionId: Actions.RecorderActions.CreateRecording,
	  title: i18nLazyString(UIStrings.createRecording),
	  async loadActionDelegate() {
	    const Recorder = await loadRecorderModule();
	    return new Recorder.RecorderController.ActionDelegate();
	  },
	});
            `,
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows enum id in registerViewExtension',
      code: `
	UI.ViewManager.registerViewExtension({
	  location: UI.ViewManager.ViewLocationValues.PANEL,
	  id: PanelCodes.SOURCES,
	  commandPrompt: i18nLazyString(UIStrings.showSources),
	  title: i18nLazyString(UIStrings.sources),
	  order: 30,
	  async loadView() {
	    const Sources = await loadSourcesModule();
	    return Sources.SourcesPanel.SourcesPanel.instance();
	  },
	});
            `,
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows variable setting name in createSetting',
      code: `
    this.disableCaptureJSProfileSetting =
        Common.Settings.Settings.instance().createSetting(name, false);
            `,
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows shorthand jslogContext property in contextMenu.appendItem',
      code: `
        contextMenu.defaultSection().appendItem(
            i18nString(UIStrings.refresh), this.refreshCallback.bind(this), {jslogContext});
            `,
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows known setting name in SettingDescriptor',
      code: `
        export const mySetting: Common.Settings.SettingDescriptor<boolean> = {
          name: 'network-messages',
          type: Common.Settings.SettingType.BOOLEAN,
          defaultValue: true,
        };
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows variable setting name in SettingDescriptor',
      code: `
        export const mySetting: Common.Settings.SettingDescriptor<boolean> = {
          name: settingName,
          type: Common.Settings.SettingType.BOOLEAN,
          defaultValue: false,
        };
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'ignores name property on unrelated typed objects',
      code: `
        export const other: SomeOtherDescriptor = {
          name: 'uNkNownNotASetting',
        };
      `,
      filename: 'front_end/components/test.ts',
    },
  ],
});
