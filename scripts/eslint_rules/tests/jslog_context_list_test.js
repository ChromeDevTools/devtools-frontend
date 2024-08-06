// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';
process.env.ESLINT_FAIL_ON_UNKNOWN_JSLOG_CONTEXT_VALUE = 1;

const rule = require('../lib/jslog_context_list.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('jslog_context_list', rule, {
  invalid: [
    {
      code: `
        menuItemElement.setAttribute('jslog', \`\${VisualLogging.action('uNkNown').track({click: true})}\`);
      `,
      errors: [{
        message:
            'Found jslog context value \'uNkNown\' that is not listed in front_end/ui/visual_logging/KnownContextValues.ts'
      }],
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
        LitHtml.render(LitHtml.html\`
          <dialog @click=\${this.#handlePointerEvent} @pointermove=\${this.#handlePointerEvent} @cancel=\${this.#onCancel}
                  jslog=\${VisualLogging.dialog('uNkNown').track({resize: true, keydown: 'Escape'}).parent('mapped')}>
            <div id="content-wrap">
              <div id="content">
                <slot></slot>
              </div>
            </div>
          </dialog>
        \`, this.#shadow, { host: this });
            `,
      errors: [{
        message:
            'Found jslog context value \'uNkNown\' that is not listed in front_end/ui/visual_logging/KnownContextValues.ts'
      }],
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
        UI.ActionRegistration.registerActionExtension({
          category: UI.ActionRegistration.ActionCategory.RECORDER,
          actionId: 'uNkNown',
          title: i18nLazyString(UIStrings.createRecording),
          async loadActionDelegate() {
            const Recorder = await loadRecorderModule();
            return new Recorder.RecorderPanel.ActionDelegate();
          },
        });
            `,
      errors: [{
        message:
            'Found jslog context value \'uNkNown\' that is not listed in front_end/ui/visual_logging/KnownContextValues.ts'
      }],
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
        UI.ViewManager.registerViewExtension({
          location: UI.ViewManager.ViewLocationValues.PANEL,
          id: 'uNkNown',
          commandPrompt: i18nLazyString(UIStrings.showSources),
          title: i18nLazyString(UIStrings.sources),
          order: 30,
          async loadView() {
            const Sources = await loadSourcesModule();
            return Sources.SourcesPanel.SourcesPanel.instance();
          },
        });
            `,
      errors: [{
        message:
            'Found jslog context value \'uNkNown\' that is not listed in front_end/ui/visual_logging/KnownContextValues.ts'
      }],
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
        Common.Settings.registerSettingExtension({
          storageType: Common.Settings.SettingStorageType.Synced,
          settingName: 'uNkNown',
          settingType: Common.Settings.SettingType.REGEX,
          defaultValue: '/node_modules/|/bower_components/',
        });
            `,
      errors: [{
        message:
            'Found jslog context value \'uNkNown\' that is not listed in front_end/ui/visual_logging/KnownContextValues.ts'
      }],
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
    this.disableCaptureJSProfileSetting =
        Common.Settings.Settings.instance().createSetting('uNkNown', false);
            `,
      errors: [{
        message:
            'Found jslog context value \'uNkNown\' that is not listed in front_end/ui/visual_logging/KnownContextValues.ts'
      }],
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
        contextMenu.defaultSection().appendItem(
            i18nString(UIStrings.refresh), this.refreshCallback.bind(this), {jslogContext: 'uNkNown'});
            `,
      errors: [{
        message:
            'Found jslog context value \'uNkNown\' that is not listed in front_end/ui/visual_logging/KnownContextValues.ts'
      }],
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
        LitHtml.render(LitHtml.html\`
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
