// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/es-modules-import.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('es-modules-import', rule, {
  valid: [
    {
      name: 'allows importing named export from local file',
      code: 'import { Exporting } from \'./Exporting.js\';',
      filename: 'front_end/common/Importing.js',
    },
    {
      name: 'allows namespace import from sibling module entrypoint',
      code: 'import * as Namespace from \'../namespace/namespace.js\';',
      filename: 'front_end/common/Importing.js',
    },
    {
      name: 'allows namespace import from nested module entrypoint',
      code: 'import * as Components from \'../ui/components/components.js\';',
      filename: 'front_end/common/Importing.js',
    },
    {
      name: 'allows namespace import of file within same module',
      code: 'import * as EventTarget from \'./EventTarget.js\';',
      filename: 'front_end/common/common.js',
    },
    {
      name: 'allows namespace import from generated module',
      code: 'import * as ARIAProperties from \'../generated/ARIAProperties.js\';',
      filename: 'front_end/accessibility/ARIAMetadata.js',
    },
    {
      name: 'allows bare import of module in worker entrypoint',
      code: 'import \'../../common/common.js\';',
      filename: 'front_end/entrypoints/formatter_worker/formatter_worker.js',
    },
    {
      name: 'allows namespace import of sibling file',
      code: 'import * as ARIAUtils from \'./ARIAUtils.js\';',
      filename: 'front_end/ui/Toolbar.js',
    },
    {
      name: 'allows namespace import in model file',
      code: 'import * as Issue from \'./Issue.js\';',
      filename: 'front_end/sdk/IssuesModel.js',
    },
    {
      name: 'allows namespace import from legacy module',
      code: 'import * as UI from \'../../legacy.js\';',
      filename: 'front_end/ui/legacy/components/data_grid/DataGrid.ts',
    },
    // the `lit/lit.js` package is an exception
    {
      name: 'allows importing html and render from lit.js exception',
      code: 'import {html, render} from \'../ui/lit/lit.js\';',
      filename: 'front_end/elements/ElementsBreadcrumbs.ts',
    },
    // the `ls` helper from Platform is an exception
    {
      name: 'allows importing ls from platform.js exception',
      code: 'import {ls} from \'../platform/platform.js\';',
      filename: 'front_end/elements/ElementsBreadcrumbs.ts',
    },
    // the `assertNotNull` helper from Platform is an exception
    {
      name: 'allows importing assertNotNullOrUndefined from platform.js exception',
      code: 'import {assertNotNullOrUndefined} from \'../platform/platform.js\';',
      filename: 'front_end/elements/ElementsBreadcrumbs.ts',
    },
    // Importing test helpers directly is allowed in the test setup
    {
      name: 'allows importing test helper in test setup',
      code: 'import {resetTestDOM} from \'../testing/DOMHelpers.js\';',
      filename: 'front_end/testing/test_setup.ts',
    },
    // Importing test helpers directly is allowed in the test files
    {
      name: 'allows namespace import from test helper in test setup',
      code: 'import * as DOMHelpers from \'../testing/DOMHelpers.js\';',
      filename: 'front_end/testing/test_setup.ts',
    },
    // Importing test helpers directly is allowed in test files
    {
      name: 'allows importing test helper in test files',
      code: 'import {resetTestDOM} from \'../testing/DOMHelpers.js\';',
      filename: 'front_end/elements/ElementsBreadcrumbs.test.ts',
    },
    {
      name: 'allows importing built-in node module in test file',
      code: 'import * as fs from \'fs\';',
      filename: 'front_end/Unit.test.ts',
    },
    {
      name: 'allows importing rollup plugin in rollup config',
      code: 'import {terser} from \'rollup-plugin-terser\';',
      filename: 'front_end/rollup.config.js',
    },
    {
      name: 'allows exporting re-exported symbol from module entrypoint',
      code: 'export {UIString} from \'../platform/platform.js\';',
      filename: 'front_end/common/common.js',
    },
    {
      name: 'allows namespace import from local components entrypoint',
      code: 'import * as ElementsComponents from \'./components/components.js\';',
      filename: 'front_end/elements/ComputedStyleWidget.js',
    },
    {
      name: 'allows exporting function in module entrypoint',
      code: 'export async function foo() {};',
      filename: 'front_end/common/common.js',
    },
    {
      name: 'allows unit test importing module entrypoint',
      code: 'import * as Bindings from \'../../../../front_end/bindings/bindings.js\';',
      filename: 'test/unittests/front_end/bindings/LiveLocation.test.ts',
    },
    {
      name: 'allows namespace import from third_party marked',
      code: 'import * as Marked from \'../third_party/marked/marked.js\';',
      filename: 'front_end/common/common.js',
    },
    {
      name: 'allows namespace import from console_counters',
      code: 'import * as ConsoleCounters from \'../console_counters/console_counters.js\';',
      filename: 'front_end/panels/console/ConsoleView.ts',
    },
    {
      name: 'allows importing elements.js in -meta.ts',
      code: 'import * as Elements from \'./elements.js\';',
      filename: 'front_end/panels/elements/elements-meta.ts',
    },
    {
      name: 'allows importing elements.js in -entrypoint.ts',
      code: 'import * as Elements from \'./elements.js\';',
      filename: 'front_end/panels/elements/elements-entrypoint.ts',
    },
    {
      name: 'allows importing elements.js in test files',
      code: 'import * as Elements from \'./elements.js\';',
      filename: 'front_end/panels/elements/StylesSidebarPane.test.ts',
    },
    // Tests are allowed to import from front_end
    {
      name: 'allows test file importing from front_end ui',
      code: 'import * as UI from \'../../../front_end/ui/ui.js\';',
      filename: 'test/unittests/front_end/foo.js',
    },
    // Tests are allowed to import helpers
    {
      name: 'allows test file importing UISourceCodeHelpers',
      code: 'import {createContentProviderUISourceCode} from \'../../testing/UISourceCodeHelpers.js\';',
      filename: 'front_end/models/bindings/IgnoreListManager.test.ts',
    },
    {
      name: 'allows test file importing renderElementIntoDOM from DOMHelpers',
      code: 'import {renderElementIntoDOM} from \'./DOMHelpers.js\';',
      filename: 'front_end/testing/MutationHelpers.test.ts',
    },
    // Component doc files can reach into the test directory to use the helpers
    {
      name: 'allows component doc importing EnvironmentHelpers',
      code: 'import * as FrontendHelpers from \'../../testing/EnvironmentHelpers.js\'',
      filename: 'front_end/ui/components/docs/data_grid/basic.ts',
    },
    {
      name: 'allows default import of css.js style',
      code: 'import checkboxStyles from \'./checkbox.css.js\';',
      filename: 'front_end/ui/components/input/input.ts',
    },
    {
      // Valid even though it breaks the rules, because it's in front_end/third_party.
      name: 'allows import in front_end third_party puppeteer',
      code: 'import { Browser } from "./package/lib/puppeteer/common/Browser.js";',
      filename: 'front_end/third_party/puppeteer/puppeteer.ts',
    },
    // Type imports follow the same cross-namespace and entrypoint rules as value imports
    {
      name: 'allows named type import of component from another module',
      code: 'import {BaseInsightComponent} from \'../../timeline/components/insights/BaseInsightComponent.js\';',
      filename: 'front_end/panels/ai_assistance/components/ChatMessage.ts',
    },
    {
      name: 'allows import type star from namespace',
      code: 'import type * as Namespace from \'../namespace/namespace.js\';',
      filename: 'front_end/common/Importing.js',
    },
    {
      name: 'allows import type named from local file',
      code: 'import type { Exporting } from \'./Exporting.js\';',
      filename: 'front_end/common/Importing.js',
    },
    // Allow ui kit module named imports
    {
      name: 'allows named import from ui kit',
      code: 'import { Icon } from \'../ui/kit/kit.js\';',
      filename: 'front_end/common/Importing.js',
    },
    {
      name: 'allows import type ProtocolMapping from generated',
      code: 'import type {ProtocolMapping} from \'../../generated/protocol-mapping.js\';',
      filename: 'front_end/core/protocol_client/NodeURL.ts',
    },
    {
      name: 'allows import type modifier ProtocolMapping from generated',
      code: 'import { type ProtocolMapping } from \'../../generated/protocol-mapping.js\';',
      filename: 'front_end/core/protocol_client/NodeURL.ts',
    },
    {
      name: 'allows import ProtocolMapping from generated',
      code: 'import {ProtocolMapping} from \'../../generated/protocol-mapping.js\';',
      filename: 'front_end/core/protocol_client/NodeURL.ts',
    },
    {
      name: 'allows Lit namespace import in ui/lit',
      code: 'import * as Lit from \'../third_party/lit/lit.js\';',
      filename: 'front_end/ui/lit/anyName.ts',
    },

    {
      name: 'allows named import from legacy.js in test file',
      code: 'import {ListModel} from \'../../legacy.js\';',
      filename: 'front_end/ui/legacy/components/quick_open/FilteredListWidget.test.ts',
    },
  ],

  invalid: [
    {
      name: 'flags missing extension on relative import',
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
      name: 'flags named cross-namespace import',
      code: 'import { Exporting } from \'../namespace/Exporting.js\';',
      filename: 'front_end/common/Importing.js',
      errors: [
        {
          messageId: 'crossNamespaceImport',
        },
      ],
    },
    {
      name: 'flags star cross-namespace import of non-entrypoint file',
      code: 'import * as TextUtils from \'../text_utils/TextRange.js\';',
      filename: 'front_end/sdk/CSSMedia.js',
      errors: [
        {
          messageId: 'crossNamespaceImport',
        },
      ],
    },
    {
      name: 'flags star import of same module entrypoint',
      code: 'import * as Common from \'../common/common.js\';',
      filename: 'front_end/common/Importing.js',
      errors: [
        {
          messageId: 'incorrectSameNamespaceImportStar',
        },
      ],
    },
    {
      name: 'flags named import of internal file in module entrypoint',
      code: 'import { Exporting } from \'./Exporting.js\';',
      filename: 'front_end/common/common.js',
      errors: [
        {
          messageId: 'incorrectSameNamespaceImportNamed',
        },
      ],
    },
    {
      name: 'flags non-relative import path using front_end prefix',
      code: 'import * as Exporting from \'front_end/exporting/exporting.js\';',
      filename: 'front_end/common/common.js',
      errors: [
        {
          messageId: 'invalidRelativeUrl',
        },
      ],
    },
    {
      name: 'flags missing extension on namespace import from another module',
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
      name: 'flags missing extension on bare module import',
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
      name: 'flags missing extension on deep relative import in test file',
      code: 'import \'../../../../front_end/common/common\';',
      filename: 'test/unittests/front_end/common/Unit.test.ts',
      errors: [
        {
          messageId: 'missingExtension',
        },
      ],
      output: 'import \'../../../../front_end/common/common.js\';',
    },
    {
      name: 'flags missing extension on export re-export statement',
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
      name: 'flags importing from non-exempt third_party module',
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
      name: 'flags test importing non-entrypoint file from another module',
      code: 'import { LiveLocationPool } from \'../../../../front_end/bindings/LiveLocation.js\';',
      filename: 'test/unittests/front_end/bindings/LiveLocation.test.ts',
      errors: [
        {
          messageId: 'crossNamespaceImport',
        },
      ],
    },
    {
      name: 'flags test importing non-entrypoint file from same module',
      code: 'import { LiveLocationPool } from \'./LiveLocation.js\';',
      filename: 'front_end/bindings/LiveLocation.test.ts',
      errors: [
        {
          messageId: 'incorrectSameNamespaceTestImport',
        },
      ],
    },
    {
      name: 'flags named import in nested entrypoint',
      code: 'import {appendStyle} from \'./append-style.js\';',
      filename: 'front_end/some_folder/nested_entrypoint/nested_entrypoint.js',
      errors: [
        {
          messageId: 'incorrectSameNamespaceImportNamed',
        },
      ],
    },
    {
      name: 'flags star import of third_party lit from non-ui/lit folder',
      code: 'import * as Lit from \'../third_party/lit/lit.js\';',
      filename: 'front_end/elements/ElementBreadcrumbs.ts',
      errors: [
        {
          messageId: 'crossNamespaceImportThirdParty',
        },
      ],
    },
    {
      name: 'flags importing deep internal lit directive from non-ui/lit folder',
      code: 'import {classMap} from \'../third_party/lit/package/directives/class-map.js\';',
      filename: 'front_end/elements/ElementsBreadcrumbs.ts',
      errors: [
        {
          messageId: 'crossNamespaceImportThirdParty',
        },
      ],
    },
    {
      name: 'flags default import of marked from third_party in non-third_party file',
      code: 'import Marked from \'../third_party/marked/package/lib/marked.esm.js\';',
      filename: 'front_end/marked/marked.js',
      errors: [
        {
          messageId: 'crossNamespaceImportThirdParty',
        },
      ],
    },
    {
      name: 'flags cross-namespace import of css.js style',
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
      name: 'flags double slash in import path',
      code: 'import x from \'./visual_logging//visual_logging.js\';',
      filename: 'front_end/ui/visual_logging/Foo.ts',
      errors: [{messageId: 'doubleSlashInImportPath'}],
      output: 'import x from \'./visual_logging/visual_logging.js\';',
    },
    {
      name: 'flags star import of non-entrypoint file in same module test',
      code: 'import * as BadgeNotification from \'./BadgeNotification.js\';',
      filename: 'front_end/panels/common/BadgeNotification.test.ts',
      errors: [
        {
          messageId: 'incorrectSameNamespaceTestImport',
        },
      ],
    },
    {
      name: 'flags import type from non-entrypoint cross-namespace file',
      code: 'import type { Exporting } from \'../namespace/Exporting.js\';',
      filename: 'front_end/common/Importing.js',
      errors: [
        {
          messageId: 'crossNamespaceImport',
        },
      ],
    },
    {
      name: 'flags inline type import from non-entrypoint cross-namespace file',
      code: 'import { type Exporting } from \'../namespace/Exporting.js\';',
      filename: 'front_end/common/Importing.js',
      errors: [
        {
          messageId: 'crossNamespaceImport',
        },
      ],
    },
  ],
});
