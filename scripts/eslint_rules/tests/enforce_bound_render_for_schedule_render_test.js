// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/enforce_bound_render_for_schedule_render.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('enforce_bound_render_for_schedule_render', rule, {
  valid: [
    {
      code: `
      class Component extends HTMLElement {
        #boundRender = this.#render.bind(this);
        get data(data) {
          this.data = data;
          void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
        }

        #render() {}
      }
      `,
      filename: 'front_end/ui/components/foo/Foo.ts',
    },
    {
      code: `
      class Component extends HTMLElement {
        get data(data) {
          this.data = data;
          void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
        }

        #render = () => {};
      }
      `,
      filename: 'front_end/ui/components/foo/Foo.ts',
    },
    {
      code: `
      class Renderer {
        render() {
        }
      }

      class Component extends HTMLElement {
        #renderer = new Renderer();
        #boundRender = this.#renderer.render.bind(this);
        get data(data) {
          this.data = data;
          void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
        }
      }
      `,
      filename: 'front_end/ui/components/foo/Foo.ts',
    },
  ],
  invalid: [
    {
      code: `class Component extends HTMLElement {
        get data(data) {
          this.data = data;
          void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
        }

        #render() {}
      }`,
      filename: 'front_end/components/test.ts',
      errors: [{message: 'Bind `render` method of `scheduleRender` to `this` in components'}],
    },
  ]
});
