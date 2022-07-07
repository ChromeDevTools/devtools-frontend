// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/es_modules_import.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
});

ruleTester.run('es_modules_import', rule, {
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
      code: 'import * as CommonModule from \'./common.js\';',
      filename: 'front_end/common/common-legacy.js',
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
      code: 'import {resetTestDOM} from \'../helpers/DOMHelpers.js\';',
      filename: 'test/unittests/front_end/test_setup/test_setup.ts',
    },
    // Importing test helpers directly is allowed in test files
    {
      code: 'import {resetTestDOM} from \'../helpers/DOMHelpers.js\';',
      filename: 'test/unittests/front_end/elements/ElementsBreadcrumbs_test.ts',
    },
    {
      code: 'import * as LitHtml from \'../third_party/lit-html/lit-html.js\';',
      filename: 'front_end/elements/ElementBreadcrumbs.ts',
    },
    {
      code: 'import * as fs from \'fs\';',
      filename: 'test/unittests/front_end/Unit_test.ts',
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
    // Tests are allowed to import from front_end
    {
      code: 'import * as UI from \'../../../front_end/ui/ui.js\';',
      filename: 'test/unittests/front_end/foo.js',
    },
    // Component doc files can reach into the test directory to use the helpers
    {
      code: 'import * as FrontendHelpers from \'../../../test/unittests/front_end/helpers/EnvironmentHelpers.js\'',
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
    }
  ],

  invalid: [
    {
      code: 'import {Foo} from \'./app\'',
      filename: 'front_end/common/Importing.ts',
      output: 'import {Foo} from \'./app.js\'',
      errors: [{
        message: 'Missing file extension for import "./app"',
      }],
    },
    {
      code: 'import { Exporting } from \'../namespace/Exporting.js\';',
      filename: 'front_end/common/Importing.js',
      errors: [{
        message:
            'Incorrect cross-namespace import: "../namespace/Exporting.js". Use "import * as Namespace from \'../namespace/namespace.js\';" instead.'
      }],
    },
    {
      code: 'import * as TextUtils from \'../text_utils/TextRange.js\';',
      filename: 'front_end/sdk/CSSMedia.js',
      errors: [{
        message:
            'Incorrect cross-namespace import: "../text_utils/TextRange.js". Use "import * as Namespace from \'../namespace/namespace.js\';" instead.'
      }],
    },
    {
      code: 'import * as Common from \'../common/common.js\';',
      filename: 'front_end/common/Importing.js',
      errors: [{
        message:
            'Incorrect same-namespace import: "../common/common.js". Use "import { Symbol } from \'./relative-file.js\';" instead.'
      }],
    },
    {
      code: 'import { Exporting } from \'./Exporting.js\';',
      filename: 'front_end/common/common.js',
      errors: [{
        message:
            'Incorrect same-namespace import: "./Exporting.js". Use "import * as File from \'./File.js\';" instead.'
      }],
    },
    {
      code: 'import * as Exporting from \'front_end/exporting/exporting.js\';',
      filename: 'front_end/common/common.js',
      errors: [{message: 'Invalid relative URL import. An import should start with either "../" or "./".'}],
    },
    {
      code: 'import * as Common from \'../common/common\';',
      filename: 'front_end/elements/ElementsPanel.ts',
      errors: [{
        message: 'Missing file extension for import "../common/common"',
      }],
      output: 'import * as Common from \'../common/common.js\';'
    },
    {
      code: 'import \'../common/common\';',
      filename: 'front_end/elements/ElementsPanel.ts',
      errors: [{
        message: 'Missing file extension for import "../common/common"',
      }],
      output: 'import \'../common/common.js\';'
    },
    {
      code: 'import \'../../../../front_end/common/common\';',
      filename: 'test/unittests/front_end/common/Unit_test.ts',
      errors: [{
        message: 'Missing file extension for import "../../../../front_end/common/common"',
      }],
      output: 'import \'../../../../front_end/common/common.js\';'
    },
    {
      code: 'export {UIString} from \'../platform/platform\';',
      filename: 'front_end/common/common.js',
      errors: [{
        message: 'Missing file extension for import "../platform/platform"',
      }],
      output: 'export {UIString} from \'../platform/platform.js\';'
    },
    // third-party modules are not exempt by default
    {
      code: 'import {someThing} from \'../third_party/some-module/foo.js\';',
      filename: 'front_end/elements/ElementsPanel.js',
      errors: [{
        message:
            'Incorrect cross-namespace import: "../third_party/some-module/foo.js". Use "import * as Namespace from \'../namespace/namespace.js\';" instead. If the third_party dependency does not expose a single entrypoint, update es_modules_import.js to make it exempt.'
      }],
    },
    // Unittests need to import module entrypoints.
    {
      code: 'import { LiveLocationPool } from \'../../../../front_end/bindings/LiveLocation.js\';',
      filename: 'test/unittests/front_end/bindings/LiveLocation_test.ts',
      errors: [
        {
          message:
              'Incorrect cross-namespace import: "../../../../front_end/bindings/LiveLocation.js". Use "import * as Namespace from \'../namespace/namespace.js\';" instead.'
        },
      ],
    },
    {
      code: 'import {appendStyle} from \'./append-style.js\';',
      filename: 'front_end/some_folder/nested_entrypoint/nested_entrypoint.js',
      errors: [{
        message:
            'Incorrect same-namespace import: "./append-style.js". Use "import * as File from \'./File.js\';" instead.'
      }]
    },
    {
      code: 'import {classMap} from \'../third_party/lit-html/package/directives/class-map.js\';',
      filename: 'front_end/elements/ElementsBreadcrumbs.ts',
      errors: [{
        message:
            'Incorrect cross-namespace import: "../third_party/lit-html/package/directives/class-map.js". Use "import * as Namespace from \'../namespace/namespace.js\';" instead. If the third_party dependency does not expose a single entrypoint, update es_modules_import.js to make it exempt.'
      }],
    },
    {
      code: 'import Marked from \'../third_party/marked/package/lib/marked.esm.js\';',
      filename: 'front_end/marked/marked.js',
      errors: [{
        message:
            'Incorrect cross-namespace import: "../third_party/marked/package/lib/marked.esm.js". Use "import * as Namespace from \'../namespace/namespace.js\';" instead. If the third_party dependency does not expose a single entrypoint, update es_modules_import.js to make it exempt.'
      }],
    },
    {
      code: 'import checkboxStyles from \'../../../input/checkbox.css.js\';',
      filename: 'front_end/ui/panels/foo/FooPanel.ts',
      errors: [{
        message:
            'Incorrect cross-namespace import: "../../../input/checkbox.css.js". Use "import * as Namespace from \'../namespace/namespace.js\';" instead.'
      }],
    }
  ]
});
