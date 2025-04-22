// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/jslog-context-list.ts';

import {RuleTester} from './utils/RuleTester.ts';
process.env.ESLINT_FAIL_ON_UNKNOWN_JSLOG_CONTEXT_VALUE = 'true';
new RuleTester().run('jslog-context-list', rule, {
  invalid: [
    {
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
      code: `
        UI.ActionRegistration.registerActionExtension({
          category: UI.ActionRegistration.ActionCategory.RECORDER,
          actionId: 'uNkNown3',
          title: i18nLazyString(UIStrings.createRecording),
          async loadActionDelegate() {
            const Recorder = await loadRecorderModule();
            return new Recorder.RecorderPanel.ActionDelegate();
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
      code: `
        Common.Settings.registerSettingExtension({
          storageType: Common.Settings.SettingStorageType.Synced,
          settingName: 'uNkNown5',
          settingType: Common.Settings.SettingType.REGEX,
          defaultValue: '/node_modules/|/bower_components/',
        });
            `,
      errors: [
        {
          messageId: 'unknownJslogContextValue',
          data: {value: 'uNkNown5'},
        },
      ],
      filename: 'front_end/components/test.ts',
    },
    {
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
  ],
  valid: [
    {
      code: `
        menuItemElement.setAttribute('jslog', \`\${VisualLogging.action('elements').track({click: true})}\`);
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
        menuItemElement.setAttribute('jslog', \`\${VisualLogging.action().track({click: true})}\`);
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
        menuItemElement.setAttribute('jslog', \`\${VisualLogging.action(this.jslogContext).track({click: true})}\`);
      `,
      filename: 'front_end/components/test.ts',
    },
    {
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
      code: `
	UI.ActionRegistration.registerActionExtension({
	  category: UI.ActionRegistration.ActionCategory.RECORDER,
	  actionId: Actions.RecorderActions.CreateRecording,
	  title: i18nLazyString(UIStrings.createRecording),
	  async loadActionDelegate() {
	    const Recorder = await loadRecorderModule();
	    return new Recorder.RecorderPanel.ActionDelegate();
	  },
	});
            `,
      filename: 'front_end/components/test.ts',
    },
    {
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
      code: `
	Common.Settings.registerSettingExtension({
	  storageType: Common.Settings.SettingStorageType.Synced,
	  settingType: Common.Settings.SettingType.REGEX,
	  defaultValue: '/node_modules/|/bower_components/',
	});
            `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
    this.disableCaptureJSProfileSetting =
        Common.Settings.Settings.instance().createSetting(name, false);
            `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
        contextMenu.defaultSection().appendItem(
            i18nString(UIStrings.refresh), this.refreshCallback.bind(this), {jslogContext});
            `,
      filename: 'front_end/components/test.ts',
    },
  ],
});
