// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/migrate_register_required_css.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

const ADD_WAS_SHOW_EXPECTED_ERROR_MESSAGE =
    'Import CSS file instead of using registerRequiredCSS and add wasShown method';
const EDIT_WAS_SHOW_EXPECTED_ERROR_MESSAGE =
    'Import CSS file instead of using registerRequiredCSS and edit wasShown method';
const MANUALLY_MIGRATE_ERROR_ESSAGE =
    'Please manually migrate front_end/components/test.css as it has edge cases not covered by this script.';

ruleTester.run('check_migrate_RegisterRequiredCSS', rule, {
  valid: [
    {
      code: `
      export class Component extends UI.Widget.Widget {
        constructor(){

        }
      }
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
      import componentStyles from './componentStyles.css.js';
      export class Component extends UI.Widget.Widget {
        constructor(){
        }

        wasShown() : void {
          this.registerCSSFiles([componentStyles]);
        }
      }
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
      import componentStyles from './componentStyles.css.js';
      export class Component extends UI.Widget.Widget {
        constructor(){
          this.treeOutline.registerRequiredCSS('front_end/test/test.css');
        }
      }
      `,
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
this.registerRequiredCSS('front_end/components/test.css')
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: ADD_WAS_SHOW_EXPECTED_ERROR_MESSAGE}],
      output: `import testStyles from './test.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){

  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([testStyles]);
  }
}`
    },
    {
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
this.registerRequiredCSS('front_end/components/test.css')
  }
  willHide() : void {

  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: ADD_WAS_SHOW_EXPECTED_ERROR_MESSAGE}],
      output: `import testStyles from './test.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){

  }
  willHide() : void {

  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([testStyles]);
  }
}`
    },
    {
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
this.registerRequiredCSS('front_end/components/test.css')
  }
  willHide() : void {

  }
  wasShown(): void {
    super.wasShown();
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: EDIT_WAS_SHOW_EXPECTED_ERROR_MESSAGE}],
      output: `import testStyles from './test.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){

  }
  willHide() : void {

  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([testStyles]);
  }
}`
    },
    {
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
this.registerRequiredCSS('front_end/components/test.css')
  }
  willHide() : void {

  }
  wasShown(): void {
    super.wasShown();
    console.log('hello world');
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: EDIT_WAS_SHOW_EXPECTED_ERROR_MESSAGE}],
      output: `import testStyles from './test.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){

  }
  willHide() : void {

  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([testStyles]);
    console.log('hello world');
  }
}`
    },
    {
      code: `export class Component extends UI.Widget.VBox {
  constructor(){
this.registerRequiredCSS('front_end/components/test.css')
  }
  willHide() : void {

  }
  wasShown(): void {
    super.wasShown();
    console.log('hello world');
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: EDIT_WAS_SHOW_EXPECTED_ERROR_MESSAGE}],
      output: `import testStyles from './test.css.js';
export class Component extends UI.Widget.VBox {
  constructor(){

  }
  willHide() : void {

  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([testStyles]);
    console.log('hello world');
  }
}`
    },
    {
      code: `export class Component extends UI.Widget.VBox {
  constructor(){
this.registerRequiredCSS('front_end/components/test.css')
  }
  willHide() : void {

  }
  wasShown(): void {
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: MANUALLY_MIGRATE_ERROR_ESSAGE}],
    },
  ]
});
