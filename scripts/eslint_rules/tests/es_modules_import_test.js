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
      code: 'import * as EventTarget from \'./EventTarget.js\';',
      filename: 'front_end/common/common.js',
    },
    {
      code: 'import { Exporting } from \'../../../front_end/common/EventTarget.js\';',
      filename: 'test/common/common.js',
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
      filename: 'front_end/formatter_worker/formatter_worker.js',
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
      code: 'import {appendStyle} from \'./append-style.js\';',
      filename: 'front_end/ui/utils/utils.js',
    },
    // the `ls` helper from Platform is an exception
    {
      code: 'import {ls} from \'../platform/platform.js\';',
      filename: 'front_end/elements/ElementsBreadcrumbs.ts',
    },
    // lit-html is exempt from any rules
    {
      code: 'import {classMap} from \'../third_party/lit-html/package/directives/class-map.js\';',
      filename: 'front_end/elements/ElementsBreadcrumbs.ts',
    },
    {
      code: 'import {classMap} from \'../third_party/lit-html/package/directives/class-map.js\';',
      filename: 'front_end/elements/LayoutPane.ts',
    },
    {
      code: 'import * as WasmDis from \'../third_party/wasmparser/WasmDis.js\';',
      filename: 'front_end/wasmparser_worker/WasmParserWorker.js',
    },
    {
      code: 'import * as Acorn from \'../third_party/acorn/package/dist/acorn.mjs\';',
      filename: 'front_end/formatter_worker/JavascriptOutline.js',
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
      code: 'export async function foo() {};',
      filename: 'front_end/common/common.js',
    },
    {
      code: 'import Marked from \'../third_party/marked/package/lib/marked.esm.js\';',
      filename: 'front_end/marked/marked.js',
    }
  ],

  invalid: [
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
        message: 'Incorrect same-namespace import: "Exporting.js". Use "import * as File from \'./File.js\';" instead.'
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
  ]
});
