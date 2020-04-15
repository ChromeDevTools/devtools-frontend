// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import * as path from 'path';
import * as ts from 'typescript';

import {walkTree} from '../../../../scripts/component_bridges/walk_tree.js';

import {createTypeScriptSourceFile, createTypeScriptSourceFromFilePath} from './test_utils.js';

const fixturesPath = path.join(process.cwd(), 'test', 'unittests', 'scripts', 'component_bridges', 'fixtures');


describe('walkTree', () => {
  it('understands interfaces that are imported and can find them', () => {
    const filePath = path.resolve(path.join(fixturesPath, 'component-with-external-interface.ts'));

    const source = createTypeScriptSourceFromFilePath(filePath);
    const result = walkTree(source, filePath);

    const foundInterfaceNames = Array.from(result.foundInterfaces, x => {
      return x.name.escapedText.toString();
    });

    assert.deepEqual(foundInterfaceNames, ['Dog', 'Person']);
  });

  it('errors loudly if it cannot find an interface', () => {
    const code = `class Breadcrumbs extends HTMLElement {
      private render() {
        console.log('render')
      }

      public update(foo: MissingInterface) {
        console.log('update')
      }
    }

    customElements.define('devtools-breadcrumbs', Breadcrumbs)`;

    const source = createTypeScriptSourceFile(code);
    assert.throws(
        () => walkTree(source, 'test.ts'),
        'Could not find definition for interface MissingInterface in the source file or any of its imports.');
  });

  it('adds any interfaces it finds to state.foundInterfaces', () => {
    const code = `interface Person {
      name: string;
      age: number;
    }

    const notAnInterface = () => {};

    interface Dog {
      name: string;
      goodDog: boolean;
    }`;

    const source = createTypeScriptSourceFile(code);
    const result = walkTree(source, 'test.ts');

    const foundInterfaceNames = Array.from(result.foundInterfaces, x => {
      return x.name.escapedText.toString();
    });

    assert.deepEqual(foundInterfaceNames, ['Person', 'Dog']);
  });

  describe('finding the custom element class', () => {
    it('picks out the class that extends HTMLElement', () => {
      const code = `class Foo {
        blah() {}
      }

      class Bah extends SomethingElse {}

      class Breadcrumbs extends HTMLElement {}
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      if (!result.componentClass || !result.componentClass.name) {
        assert.fail('No component class was found');
        return;
      }

      assert.equal(result.componentClass.name.escapedText.toString(), 'Breadcrumbs');
    });

    it('finds any public functions on the class', () => {
      const code = `class Breadcrumbs extends HTMLElement {

        private render() {
          console.log('render')
        }

        public update() {
          console.log('update')
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      if (!result.componentClass) {
        assert.fail('No component class was found');
      }

      const publicMethodNames = Array.from(result.publicMethods, method => {
        return (method.name as ts.Identifier).escapedText as string;
      });

      assert.deepEqual(publicMethodNames, ['update']);
    });

    it('finds the custom elements define call', () => {
      const code = `class Breadcrumbs extends HTMLElement {

        private render() {
          console.log('render')
        }

        public update() {
          console.log('update')
        }
      }

      customElements.define('devtools-breadcrumbs', Breadcrumbs)`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      assert.isDefined(result.customElementsDefineCall);
    });
  });
});
