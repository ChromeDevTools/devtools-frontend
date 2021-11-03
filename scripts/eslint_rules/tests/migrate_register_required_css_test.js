// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';
process.env.ESLINT_SKIP_GRD_UPDATE = 1;

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
    'Please manually migrate components/test.css as it has edge cases not covered by this script. Got error: Cannot read properties of undefined (reading \'range\').';

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
      // Test where registerRequiredCSS is not called on this object.
      code: `
      import componentStyles from './componentStyles.css.js';
      export class Component extends UI.Widget.Widget {
        createTreeOutline(): UI.TreeOutline.TreeOutline {
          const treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
          treeOutline.registerRequiredCSS('panels/accessibility/accessibilityNode.css');
        }

      }
      `,
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      // Add wasShown method containing import
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
this.registerRequiredCSS('components/test.css')
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
      // Add wasShown method containing import and resolves path correctly
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
this.registerRequiredCSS('ui/test.css')
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: ADD_WAS_SHOW_EXPECTED_ERROR_MESSAGE}],
      output: `import testStyles from '../ui/test.css.js';
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
      // Adds wasShown method as last method in class
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
this.registerRequiredCSS('components/test.css')
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
      // Adds this.registerRequiredCSS to already existing wasShown method
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
this.registerRequiredCSS('components/test.css')
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
      // Adds this.registerRequiredCSS to already existing wasShown method in the 2nd line
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
this.registerRequiredCSS('components/test.css')
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
      // Tests this works on UI.Widget.VBox as well
      code: `export class Component extends UI.Widget.VBox {
  constructor(){
this.registerRequiredCSS('components/test.css')
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
      // First pass of two calls to registerRequiredCSS in same file
      code: `export class Component extends UI.Widget.VBox {
  constructor(){
this.registerRequiredCSS('components/test.css')
this.registerRequiredCSS('components/styles.css')
  }
  wasShown(): void {
    super.wasShown();
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: EDIT_WAS_SHOW_EXPECTED_ERROR_MESSAGE}, {message: EDIT_WAS_SHOW_EXPECTED_ERROR_MESSAGE}],
      output: `import testStyles from './test.css.js';
export class Component extends UI.Widget.VBox {
  constructor(){

this.registerRequiredCSS('components/styles.css')
  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([testStyles]);
  }
}`
    },
    {
      // Second pass of two calls to registerRequiredCSS
      code: `import testStyles from './test.css.js';
export class Component extends UI.Widget.VBox {
  constructor(){

this.registerRequiredCSS('components/styles.css')
  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([testStyles]);
    console.log('hello world');
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: EDIT_WAS_SHOW_EXPECTED_ERROR_MESSAGE}],
      output: `import stylesStyles from './styles.css.js';
import testStyles from './test.css.js';
export class Component extends UI.Widget.VBox {
  constructor(){


  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([stylesStyles, testStyles]);
    console.log('hello world');
  }
}`
    },
    {
      // Errors on empty wasShown and tells you to migrate manually.
      code: `export class Component extends UI.Widget.VBox {
  constructor(){
this.registerRequiredCSS('components/test.css')
  }
  willHide() : void {

  }
  wasShown(): void {
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: MANUALLY_MIGRATE_ERROR_ESSAGE}],
    },
    // Tests for this._privateProperty.registerRequiredCSS('front_end/components/test.css');
    {
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
this._widget.registerRequiredCSS('components/test.css')
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
    this._widget.registerCSSFiles([testStyles]);
  }
}`
    },
    {
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
this._tree.registerRequiredCSS('components/test.css')
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
    this._tree.registerCSSFiles([testStyles]);
  }
}`
    },
    {
      // First migration of two different registerRequiredCSS to same private field
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
this._tree.registerRequiredCSS('components/test.css')
this._tree.registerRequiredCSS('components/styles.css')
  }
  wasShown(): void {
    super.wasShown();
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: EDIT_WAS_SHOW_EXPECTED_ERROR_MESSAGE}, {message: EDIT_WAS_SHOW_EXPECTED_ERROR_MESSAGE}],
      output: `import testStyles from './test.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){

this._tree.registerRequiredCSS('components/styles.css')
  }
  wasShown(): void {
    super.wasShown();
    this._tree.registerCSSFiles([testStyles]);
  }
}`
    },
    {
      // Second migration of two different registerRequiredCSS to same private field
      code: `import testStyles from './test.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){

this._tree.registerRequiredCSS('components/styles.css')
  }
  wasShown(): void {
    super.wasShown();
    this._tree.registerCSSFiles([testStyles]);
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: EDIT_WAS_SHOW_EXPECTED_ERROR_MESSAGE}],
      output: `import stylesStyles from './styles.css.js';
import testStyles from './test.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){


  }
  wasShown(): void {
    super.wasShown();
    this._tree.registerCSSFiles([stylesStyles, testStyles]);
  }
}`
    },
    {
      // First pass of two different registerRequiredCSS to different fields
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
this.registerRequiredCSS('components/test.css')
this._tree.registerRequiredCSS('components/styles.css')
  }
  wasShown(): void {
    super.wasShown();
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: EDIT_WAS_SHOW_EXPECTED_ERROR_MESSAGE}, {message: EDIT_WAS_SHOW_EXPECTED_ERROR_MESSAGE}],
      output: `import testStyles from './test.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){

this._tree.registerRequiredCSS('components/styles.css')
  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([testStyles]);
  }
}`
    },
    {
      // Second pass of two different registerRequiredCSS to different fields
      code: `import testStyles from './test.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){

this._tree.registerRequiredCSS('components/styles.css')
  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([testStyles]);
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: EDIT_WAS_SHOW_EXPECTED_ERROR_MESSAGE}],
      output: `import stylesStyles from './styles.css.js';
import testStyles from './test.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){


  }
  wasShown(): void {
    super.wasShown();
    this._tree.registerCSSFiles([stylesStyles]);
    this.registerCSSFiles([testStyles]);
  }
}`
    },
    {
      // Second pass of two different registerRequiredCSS to different fields but for same file
      code: `import testStyles from './test.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){

this._tree.registerRequiredCSS('components/test.css')
  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([testStyles]);
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: EDIT_WAS_SHOW_EXPECTED_ERROR_MESSAGE}],
      output: `import testStyles from './test.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){


  }
  wasShown(): void {
    super.wasShown();
    this._tree.registerCSSFiles([testStyles]);
    this.registerCSSFiles([testStyles]);
  }
}`
    },
  ]
});
