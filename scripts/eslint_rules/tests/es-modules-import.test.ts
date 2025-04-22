// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/es-modules-import.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('es-modules-import', rule, {
  valid: [
    {
      code: 'import { Exporting } from \'./Exporting.js\';',
      filename: 'front_end/common/Importing.js',
    },
    {
      code: 'import * as Namespace from \'../namespace/namespace.js\';',
      filename: 'front_end/common/Importing.js',
    },
    {
      code: 'import * as Components from \'../ui/components/components.js\';',
      filename: 'front_end/common/Importing.js',
    },
    {
      code: 'import * as EventTarget from \'./EventTarget.js\';',
      filename: 'front_end/common/common.js',
    },
    {
      code: 'import * as ARIAProperties from \'../generated/ARIAProperties.js\';',
      filename: 'front_end/accessibility/ARIAMetadata.js',
    },
    {
      code: 'import \'../../common/common.js\';',
      filename: 'front_end/entrypoints/formatter_worker/formatter_worker.js',
    },
    {
      code: 'import * as ARIAUtils from \'./ARIAUtils.js\';',
      filename: 'front_end/ui/Toolbar.js',
    },
    {
      code: 'import * as Issue from \'./Issue.js\';',
      filename: 'front_end/sdk/IssuesModel.js',
    },
    {
      code: 'import * as UI from \'../../legacy.js\';',
      filename: 'front_end/ui/legacy/components/data_grid/DataGrid.ts',
    },
    // the `lit/lit.js` package is an exception
    {
      code: 'import {html, render} from \'../ui/lit/lit.js\';',
      filename: 'front_end/elements/ElementsBreadcrumbs.ts',
    },
    // the `ls` helper from Platform is an exception
    {
      code: 'import {ls} from \'../platform/platform.js\';',
      filename: 'front_end/elements/ElementsBreadcrumbs.ts',
    },
    // the `assertNotNull` helper from Platform is an exception
    {
      code: 'import {assertNotNullOrUndefined} from \'../platform/platform.js\';',
      filename: 'front_end/elements/ElementsBreadcrumbs.ts',
    },
    // Importing test helpers directly is allowed in the test setup
    {
      code: 'import {resetTestDOM} from \'../testing/DOMHelpers.js\';',
      filename: 'front_end/testing/test_setup.ts',
    },
    // Importing test helpers directly is allowed in test files
    {
      code: 'import {resetTestDOM} from \'../testing/DOMHelpers.js\';',
      filename: 'front_end/elements/ElementsBreadcrumbs.test.ts',
    },
    {
      code: 'import * as Lit from \'../third_party/lit/lit.js\';',
      filename: 'front_end/elements/ElementBreadcrumbs.ts',
    },
    {
      code: 'import * as fs from \'fs\';',
      filename: 'front_end/Unit.test.ts',
    },
    {
      code: 'import {terser} from \'rollup-plugin-terser\';',
      filename: 'front_end/rollup.config.js',
    },
    {
      code: 'export {UIString} from \'../platform/platform.js\';',
      filename: 'front_end/common/common.js',
    },
    {
      code: 'import * as ElementsComponents from \'./components/components.js\';',
      filename: 'front_end/elements/ComputedStyleWidget.js',
    },
    {
      code: 'export async function foo() {};',
      filename: 'front_end/common/common.js',
    },
    {
      code: 'import * as Bindings from \'../../../../front_end/bindings/bindings.js\';',
      filename: 'test/unittests/front_end/bindings/LiveLocation_test.ts',
    },
    {
      code: 'import * as Marked from \'../third_party/marked/marked.js\';',
      filename: 'front_end/common/common.js',
    },
    {
      code: 'import * as ConsoleCounters from \'../console_counters/console_counters.js\';',
      filename: 'front_end/panels/console/ConsoleView.ts',
    },
    {
      code: 'import * as Elements from \'./elements.js\';',
      filename: 'front_end/panels/elements/elements-meta.ts',
    },
    {
      code: 'import * as Elements from \'./elements.js\';',
      filename: 'front_end/panels/elements/elements-entrypoint.ts',
    },
    {
      code: 'import * as Elements from \'./elements.js\';',
      filename: 'front_end/panels/elements/StylesSidebarPane.test.ts',
    },
    // Tests are allowed to import from front_end
    {
      code: 'import * as UI from \'../../../front_end/ui/ui.js\';',
      filename: 'test/unittests/front_end/foo.js',
    },
    // Tests are allowed to import helpers
    {
      code: 'import {createContentProviderUISourceCode} from \'../../testing/UISourceCodeHelpers.js\';',
      filename: 'front_end/models/bindings/IgnoreListManager.test.ts',
    },
    {
      code: 'import {renderElementIntoDOM} from \'./DOMHelpers.js\';',
      filename: 'front_end/testing/MutationHelpers.test.ts',
    },
    // Component doc files can reach into the test directory to use the helpers
    {
      code: 'import * as FrontendHelpers from \'../../testing/EnvironmentHelpers.js\'',
      filename: 'front_end/ui/components/docs/data_grid/basic.ts',
    },
    {
      code: 'import checkboxStyles from \'./checkbox.css.js\';',
      filename: 'front_end/ui/components/input/input.ts',
    },
    {
      // Valid even though it breaks the rules, because it's in front_end/third_party.
      code: 'import { Browser } from "./package/lib/esm/puppeteer/common/Browser.js";',
      filename: 'front_end/third_party/puppeteer/puppeteer.ts',
    },
    // Type imports are unrestricted
    {
      code: 'import type { Exporting } from \'../namespace/Exporting.js\';',
      filename: 'front_end/common/Importing.js',
    },
    {
      code: 'import { type Exporting } from \'../namespace/Exporting.js\';',
      filename: 'front_end/common/Importing.js',
    },
  ],

  invalid: [
    {
      code: 'import {Foo} from \'./app\'',
      filename: 'front_end/common/Importing.ts',
      output: 'import {Foo} from \'./app.js\'',
      errors: [
        {
          messageId: 'missingExtension',
        },
      ],
    },
    {
      code: 'import { Exporting } from \'../namespace/Exporting.js\';',
      filename: 'front_end/common/Importing.js',
      errors: [
        {
          messageId: 'crossNamespaceImport',
        },
      ],
    },
    {
      code: 'import * as TextUtils from \'../text_utils/TextRange.js\';',
      filename: 'front_end/sdk/CSSMedia.js',
      errors: [
        {
          messageId: 'crossNamespaceImport',
        },
      ],
    },
    {
      code: 'import * as Common from \'../common/common.js\';',
      filename: 'front_end/common/Importing.js',
      errors: [
        {
          messageId: 'incorrectSameNamespaceImportStar',
        },
      ],
    },
    {
      code: 'import { Exporting } from \'./Exporting.js\';',
      filename: 'front_end/common/common.js',
      errors: [
        {
          messageId: 'incorrectSameNamespaceImportNamed',
        },
      ],
    },
    {
      code: 'import * as Exporting from \'front_end/exporting/exporting.js\';',
      filename: 'front_end/common/common.js',
      errors: [
        {
          messageId: 'invalidRelativeUrl',
        },
      ],
    },
    {
      code: 'import * as Common from \'../common/common\';',
      filename: 'front_end/elements/ElementsPanel.ts',
      errors: [
        {
          messageId: 'missingExtension',
        },
      ],
      output: 'import * as Common from \'../common/common.js\';',
    },
    {
      code: 'import \'../common/common\';',
      filename: 'front_end/elements/ElementsPanel.ts',
      errors: [
        {
          messageId: 'missingExtension',
        },
      ],
      output: 'import \'../common/common.js\';',
    },
    {
      code: 'import \'../../../../front_end/common/common\';',
      filename: 'test/unittests/front_end/common/Unit_test.ts',
      errors: [
        {
          messageId: 'missingExtension',
        },
      ],
      output: 'import \'../../../../front_end/common/common.js\';',
    },
    {
      code: 'export {UIString} from \'../platform/platform\';',
      filename: 'front_end/common/common.js',
      errors: [
        {
          messageId: 'missingExtension',
        },
      ],
      output: 'export {UIString} from \'../platform/platform.js\';',
    },
    // third-party modules are not exempt by default
    {
      code: 'import {someThing} from \'../third_party/some-module/foo.js\';',
      filename: 'front_end/elements/ElementsPanel.js',
      errors: [
        {
          messageId: 'crossNamespaceImportThirdParty',
        },
      ],
    },
    // Unittests need to import module entrypoints.
    {
      code: 'import { LiveLocationPool } from \'../../../../front_end/bindings/LiveLocation.js\';',
      filename: 'test/unittests/front_end/bindings/LiveLocation.test.ts',
      errors: [
        {
          messageId: 'crossNamespaceImport',
        },
      ],
    },
    {
      code: 'import { LiveLocationPool } from \'./LiveLocation.js\';',
      filename: 'front_end/bindings/LiveLocation.test.ts',
      errors: [
        {
          messageId: 'incorrectSameNamespaceTestImport',
        },
      ],
    },
    {
      code: 'import {appendStyle} from \'./append-style.js\';',
      filename: 'front_end/some_folder/nested_entrypoint/nested_entrypoint.js',
      errors: [
        {
          messageId: 'incorrectSameNamespaceImportNamed',
        },
      ],
    },
    {
      code: 'import {classMap} from \'../third_party/lit/package/directives/class-map.js\';',
      filename: 'front_end/elements/ElementsBreadcrumbs.ts',
      errors: [
        {
          messageId: 'crossNamespaceImportThirdParty',
        },
      ],
    },
    {
      code: 'import Marked from \'../third_party/marked/package/lib/marked.esm.js\';',
      filename: 'front_end/marked/marked.js',
      errors: [
        {
          messageId: 'crossNamespaceImportThirdParty',
        },
      ],

    },
    {
      code: 'import checkboxStyles from \'../../../input/checkbox.css.js\';',
      filename: 'front_end/ui/panels/foo/FooPanel.ts',
      errors: [
        {
          messageId: 'crossNamespaceImport',
        },
      ],

    },
    {
      // Note the double slash between the visual_logging
      // This does not break compilation but does break at runtime.
      code: 'import x from \'../ui/visual_logging//visual_logging.js\';',
      filename: 'front_end/panels/foo/FooPanel.ts',
      errors: [
        {messageId: 'doubleSlashInImportPath'},
      ],
      output: 'import x from \'../ui/visual_logging/visual_logging.js\';',
    },
  ],
});
