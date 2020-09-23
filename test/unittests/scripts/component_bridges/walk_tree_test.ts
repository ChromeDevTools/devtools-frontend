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
  it('understands interfaces that are imported as named imports and can find them', () => {
    const filePath = path.resolve(path.join(fixturesPath, 'component-with-external-interface.ts'));

    const source = createTypeScriptSourceFromFilePath(filePath);
    const result = walkTree(source, filePath);

    const foundInterfaceNames = Array.from(result.foundInterfaces, x => {
      return x.name.escapedText.toString();
    });

    assert.deepEqual(foundInterfaceNames, ['Dog', 'Person', 'DogOwner']);
  });

  it('finds nested imports to convert from another file', () => {
    const filePath = path.resolve(path.join(fixturesPath, 'component-with-external-interface.ts'));

    const source = createTypeScriptSourceFromFilePath(filePath);
    const result = walkTree(source, filePath);

    assert.deepEqual(Array.from(result.typeReferencesToConvert), ['Person', 'Dog', 'DogOwner']);
  });

  it('errors loudly if it cannot find an interface', () => {
    const code = `class Breadcrumbs extends HTMLElement {
      private render() {
        console.log('render')
      }

      public update(foo: MissingInterface): void {
        console.log('update')
      }
    }

    customElements.define('devtools-breadcrumbs', Breadcrumbs)`;

    const source = createTypeScriptSourceFile(code);
    assert.throws(
        () => walkTree(source, 'test.ts'),
        'Could not find definition for type reference MissingInterface in the source file or any of its imports.');
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

  describe('it enforces the .data as X pattern in lit-html html calls', () => {
    it('errors with LitHtml.html`` if the .data object has no "as X" declared', () => {
      const code = 'LitHtml.html\`<node-text .data=${{title: \'Jack\'}}></node-text>\`';

      const source = createTypeScriptSourceFile(code);
      assert.throws(() => {
        walkTree(source, 'test.ts');
      }, 'Error: found a lit-html .data= without an `as X` typecast.');
    });

    it('errors with just html`` if the .data object has no "as X" declared', () => {
      const code = 'html\`<node-text .data=${{title: \'Jack\'}}></node-text>\`';

      const source = createTypeScriptSourceFile(code);
      assert.throws(() => {
        walkTree(source, 'test.ts');
      }, 'Error: found a lit-html .data= without an `as X` typecast.');
    });

    it('errors if the data is type cast to an object literal', () => {
      const code = 'html\`<node-text .data=${{title: \'Jack\'} as { title: string }}}></node-text>\`';

      const source = createTypeScriptSourceFile(code);
      assert.throws(() => {
        walkTree(source, 'test.ts');
      }, 'Error: found a lit-html .data= with an object literal typecast.');
    });


    it('finds the error in a larger template', () => {
      const code = 'html\`<p>${foo}</p><node-text .data=${{title: \'Jack\'}}></node-text><p>${foo}</p>\`';

      const source = createTypeScriptSourceFile(code);
      assert.throws(() => {
        walkTree(source, 'test.ts');
      }, 'Error: found a lit-html .data= without an `as X` typecast.');
    });

    it('checks all .data calls and finds errors correctly', () => {
      const code =
          'html\`<p>${foo}</p><node-text .data=${{title: \'Jack\'} as X}></node-text><p>${foo}</p><node-text .data=${{title: \'Jack\'}}></node-text>\`';

      const source = createTypeScriptSourceFile(code);
      assert.throws(() => {
        walkTree(source, 'test.ts');
      }, 'Error: found a lit-html .data= without an `as X` typecast.');
    });

    it('does not error if the .data= is properly type cast', () => {
      const code = 'LitHtml.html\`<node-text .data=${{title: \'Jack\'} as Data}></node-text>\`';

      const source = createTypeScriptSourceFile(code);
      assert.doesNotThrow(() => {
        walkTree(source, 'test.ts');
      });
    });

    it('ignores any tagged templates that are not html or LitHtml.html', () => {
      const code = 'SomeOtherHtmlThing.foo\`<node-text .data=${{title: \'Jack\'}}></node-text>\`';

      const source = createTypeScriptSourceFile(code);
      assert.doesNotThrow(() => {
        walkTree(source, 'test.ts');
      });
    });
  });


  describe('nested interfaces', () => {
    it('correctly identifies interfaces that reference other interfaces', () => {
      const code = `interface WebVitalsTimelineTask {
        start: number;
        duration: number;
      }

      interface WebVitalsTimelineData {
        layoutshifts: number;
        longTasks: WebVitalsTimelineTask;
      }

      interface Data {
        timeline: WebVitalsTimelineData
      }

      class WebVitals extends HTMLElement {
        set data(data: Data) {}
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      assert.deepEqual(
          Array.from(result.typeReferencesToConvert), ['Data', 'WebVitalsTimelineData', 'WebVitalsTimelineTask']);
    });

    it('correctly identifies interfaces that reference arrays of other interfaces', () => {
      const code = `interface WebVitalsTimelineTask {
        start: number;
        duration: number;
      }

      interface WebVitalsTimelineData {
        layoutshifts: number[];
        longTasks: WebVitalsTimelineTask[];
      }

      interface Data {
        timeline: WebVitalsTimelineData
      }

      class WebVitals extends HTMLElement {
        set data(data: Data) {}
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      assert.deepEqual(
          Array.from(result.typeReferencesToConvert), ['Data', 'WebVitalsTimelineData', 'WebVitalsTimelineTask']);
    });

    it('correctly identifies interfaces that reference interfaces in nested object literals', () => {
      const code = `interface WebVitalsTimelineTask {
        start: number;
        duration: number;
      }

      interface WebVitalsTimelineData {
        longTask: {
          name: string;
          task: WebVitalsTimelineTask
        }
      }

      interface Data {
        timeline: WebVitalsTimelineData
      }

      class WebVitals extends HTMLElement {
        set data(data: Data) {}
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      assert.deepEqual(
          Array.from(result.typeReferencesToConvert), ['Data', 'WebVitalsTimelineData', 'WebVitalsTimelineTask']);
    });

    it('correctly identifies interfaces that are deeply nested', () => {
      const code = `interface Timing {
        start: number;
        end: number;
      }

      interface LongTask {
        id: number;
        timings: Timing[]
      }

      interface WebVitalsTimelineData {
        longTasks: LongTask[]
      }

      interface Data {
        timeline: WebVitalsTimelineData
      }

      class WebVitals extends HTMLElement {
        set data(data: Data) {}
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      assert.deepEqual(
          Array.from(result.typeReferencesToConvert), ['Data', 'WebVitalsTimelineData', 'LongTask', 'Timing']);
    });
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

      assert.strictEqual(result.componentClass.name.escapedText.toString(), 'Breadcrumbs');
    });

    it('errors if a public method does not have an explicit type annotation', () => {
      const code = `class Breadcrumbs extends HTMLElement {

        private render() {
          console.log('render')
        }

        public update() {
          console.log('update')
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      assert.throws(
          () => walkTree(source, 'test.ts'), 'Public method update needs an explicit return type annotation.');
    });

    it('finds any public functions on the class', () => {
      const code = `class Breadcrumbs extends HTMLElement {

        private render() {
          console.log('render')
        }

        public update(): void {
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

    it('adds any return types to the list of type references to convert', () => {
      const code = `interface Foo {
        name: string;
      }

      class Breadcrumbs extends HTMLElement {
        private render() {
          console.log('render')
        }

        public update(): Foo {
          return {
            name: 'jack',
          }
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      const publicMethodNames = Array.from(result.publicMethods, method => {
        return (method.name as ts.Identifier).escapedText as string;
      });

      assert.deepEqual(publicMethodNames, ['update']);
      assert.deepEqual(Array.from(result.typeReferencesToConvert), ['Foo']);
    });

    it('ignores any component lifecycle methods in the class', () => {
      const code = `class Breadcrumbs extends HTMLElement {
        connectedCallback() {
        }
        disconnectedCallback() {
        }
        attributeChangedCallback() {
        }
        adoptedCallback() {
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      if (!result.componentClass) {
        assert.fail('No component class was found');
      }

      assert.strictEqual(result.publicMethods.size, 0);
    });

    it('finds any public getter functions on the class and notes its return interface', () => {
      const code = `interface Person {}

      class Breadcrumbs extends HTMLElement {

        private render() {
          console.log('render')
        }

        public get person(): Person {
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      if (!result.componentClass) {
        assert.fail('No component class was found');
      }

      const getterNames = Array.from(result.getters, method => {
        return (method.name as ts.Identifier).escapedText as string;
      });

      assert.deepEqual(getterNames, ['person']);
      assert.deepEqual(Array.from(result.typeReferencesToConvert), ['Person']);
    });

    it('finds any public setters and the interfaces they take', () => {
      const code = `interface Person{}

      class Breadcrumbs extends HTMLElement {

        private render() {
          console.log('render')
        }

        public set foo(x: Person) {
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      if (!result.componentClass) {
        assert.fail('No component class was found');
      }

      const setterNames = Array.from(result.setters, method => {
        return (method.name as ts.Identifier).escapedText as string;
      });

      assert.deepEqual(setterNames, ['foo']);
      assert.deepEqual(Array.from(result.typeReferencesToConvert), ['Person']);
    });

    it('can parse interfaces out of the Readonly helper type', () => {
      const code = `interface Person{}

      class Breadcrumbs extends HTMLElement {

        private render() {
          console.log('render')
        }

        public set foo(x: Readonly<Person>) {
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      if (!result.componentClass) {
        assert.fail('No component class was found');
      }

      assert.deepEqual(Array.from(result.typeReferencesToConvert), ['Person']);
    });

    it('can parse interfaces out of the ReadonlyArray helper type', () => {
      const code = `interface Person{}

      class Breadcrumbs extends HTMLElement {

        private render() {
          console.log('render')
        }

        public set foo(x: ReadonlyArray<Person>) {
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      if (!result.componentClass) {
        assert.fail('No component class was found');
      }

      assert.deepEqual(Array.from(result.typeReferencesToConvert), ['Person']);
    });

    it('finds interfaces nested within a Map generic type', () => {
      const code = `interface Person {
        friends: Map<string, Friend>
      }

      interface Friend {
        name: string;
      }

      interface Data {
        person: Person
      }

      class Breadcrumbs extends HTMLElement {
        public set data(data: Data) {
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      assert.deepEqual(Array.from(result.typeReferencesToConvert), ['Data', 'Person', 'Friend']);
    });

    it('finds interfaces nested within a Set generic type', () => {
      const code = `interface Person {
        friends: Set<Friend>,
      }

      interface Friend {
        name: string;
      }

      interface Data {
        person: Person;
      }

      class Breadcrumbs extends HTMLElement {
        public set data(data: Data) {
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      assert.deepEqual(Array.from(result.typeReferencesToConvert), ['Data', 'Person', 'Friend']);
    });


    it('errors when it finds a setter whose argument is not a type reference', () => {
      const code = `interface Person { name: string }

      interface Dog {
        name: string
      }

      class Breadcrumbs extends HTMLElement {

        private render() {
          console.log('render')
        }

        public set data(data: {x: Person, y: Dog}) {
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      assert.throws(() => {
        walkTree(source, 'test.ts');
      }, 'Setter data has an argument whose type is not a direct type reference.');
    });

    it('can deal with setters taking optional arguments', () => {
      const code = `interface Person { name: string }

      interface Dog {
        name: string
      }

      interface Data {
        x: Person|null,
        y: Dog,
      }

      class Breadcrumbs extends HTMLElement {

        private render() {
          console.log('render')
        }

        public set data(data: Data) {
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      if (!result.componentClass) {
        assert.fail('No component class was found');
      }

      const setterNames = Array.from(result.setters, method => {
        return (method.name as ts.Identifier).escapedText as string;
      });

      assert.deepEqual(setterNames, ['data']);
      assert.deepEqual(Array.from(result.typeReferencesToConvert), ['Data', 'Person', 'Dog']);
    });

    it('finds the custom elements define call', () => {
      const code = `class Breadcrumbs extends HTMLElement {

        private render() {
          console.log('render')
        }

        public update(): void {
          console.log('update')
        }
      }

      customElements.define('devtools-breadcrumbs', Breadcrumbs)`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');

      assert.isDefined(result.customElementsDefineCall);
    });
  });

  describe('enums', () => {
    it('adds all const enums to the list of found enums', () => {
      const code = `export const enum SettingType {
         boolean = 'boolean',
         enum = 'enum'
        }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');
      assert.strictEqual(result.foundEnums.size, 1);
    });

    it('correctly identifies which enums need to be included in the Closure bridge', () => {
      const code = `const enum Name {
        alice = 'alice',
        bob = 'bob'
      }

      const enum NotUsedEnum {
        x = 'x',
        y = 'y'
      }

      interface Data {
        x: Name
      }

      class Breadcrumbs extends HTMLElement {
        public set data(data: Data) {
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');
      assert.deepEqual(Array.from(result.typeReferencesToConvert), ['Data', 'Name']);
    });

    it('correctly finds enums within an interface', () => {
      const code = `const enum Name {
        alice = 'alice',
        bob = 'bob'
      }

      interface Person {
        name: Name;
      }

      class Breadcrumbs extends HTMLElement {
        public set data(data: Person) {
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');
      assert.deepEqual(Array.from(result.typeReferencesToConvert), ['Person', 'Name']);
    });

    it('correctly finds enums deeply nested within types and interfaces', () => {
      const code = `const enum Name {
        alice = 'alice',
        bob = 'bob'
      }

      type Human = {
        name: Name
      }

      interface Person {
        human: Human
      }

      class Breadcrumbs extends HTMLElement {
        public set data(data: Person) {
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');
      assert.deepEqual(Array.from(result.typeReferencesToConvert), ['Person', 'Human', 'Name']);
    });

    it('correctly finds enums when an interface is extended', () => {
      const code = `const enum Name {
        alice = 'alice',
        bob = 'bob'
      }

      interface Human {
        name: Name
      }

      interface Person extends Human {
        age: number;
      }

      class Breadcrumbs extends HTMLElement {
        public set data(data: Person) {
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');
      assert.deepEqual(Array.from(result.typeReferencesToConvert), ['Person', 'Name']);
    });

    it('correctly finds enums when a type is extended', () => {
      const code = `const enum Name {
        alice = 'alice',
        bob = 'bob'
      }

      type Human = {
        name: Name
      }

      type Person = Human & {
        age: number;
      }

      class Breadcrumbs extends HTMLElement {
        public set data(data: Person) {
        }
      }`;

      const source = createTypeScriptSourceFile(code);
      const result = walkTree(source, 'test.ts');
      assert.deepEqual(Array.from(result.typeReferencesToConvert), ['Person', 'Name']);
    });

    it('errors if the enum is not declared as a const enum', () => {
      const code = `enum SettingType {
         boolean = 'boolean',
         enum = 'enum'
        }`;

      const source = createTypeScriptSourceFile(code);
      assert.throws(() => {
        walkTree(source, 'test.ts');
      }, 'Found enum SettingType that is not a const enum.');
    });

    it('errors if the enum is not declared with explicit member values', () => {
      const code = `const enum SettingType {
         boolean,
         enum,
        }`;

      const source = createTypeScriptSourceFile(code);
      assert.throws(() => {
        walkTree(source, 'test.ts');
      }, 'Found enum SettingType whose members do not have manually defined values.');
    });
  });

  it('warns if it encounters an interface definition for a built-in type', () => {
    const code = `interface Element {
        name: string;
      }`;

    const source = createTypeScriptSourceFile(code);
    assert.throws(() => {
      walkTree(source, 'test.ts');
    }, 'Found interface Element that conflicts with TypeScript\'s built-in type. Please choose a different name!');
  });

  it('warns if it encounters a type definition for a built-in type', () => {
    const code = `type Element = {
        name: string;
      }`;

    const source = createTypeScriptSourceFile(code);
    assert.throws(() => {
      walkTree(source, 'test.ts');
    }, 'Found type Element that conflicts with TypeScript\'s built-in type. Please choose a different name!');
  });
});
