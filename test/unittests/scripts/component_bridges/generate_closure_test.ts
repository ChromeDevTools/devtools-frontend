// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {generateClosureBridge, generateClosureClass, generateCreatorFunction, generateTypeReferences} from '../../../../scripts/component_bridges/generate_closure.js';
import {WalkerState, walkTree} from '../../../../scripts/component_bridges/walk_tree.js';

import {createTypeScriptSourceFile} from './test_utils.js';


const parseCode = (code: string): WalkerState => {
  const sourceFile = createTypeScriptSourceFile(code);
  const result = walkTree(sourceFile, 'test.ts');
  return result;
};

describe('generateClosure', () => {
  describe('generateClosureBridge', () => {
    it('generates a full bridge with the different parts', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }

      customElements.define('devtools-breadcrumbs', Breadcrumbs)
      `);

      const generatedCode = generateClosureBridge(state);

      assert.include(generatedCode.types.join(''), 'Person');
      assert.include(generatedCode.closureClass.join(''), 'class BreadcrumbsClosureInterface');
      assert.include(generatedCode.creatorFunction.join(''), 'function createBreadcrumbs()');
    });
  });

  describe('generateCreatorFunction', () => {
    it('outputs the JSDoc with the right interface name', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }

      customElements.define('devtools-breadcrumbs', Breadcrumbs)
      `);

      const classOutput = generateCreatorFunction(state);

      assert.include(classOutput.join('\n'), `/**
* @return {!BreadcrumbsClosureInterface}
*/`);
    });

    it('creates the function export', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }

      customElements.define('devtools-breadcrumbs', Breadcrumbs)
      `);

      const classOutput = generateCreatorFunction(state);

      assert.include(classOutput.join('\n'), 'export function createBreadcrumbs() {');
    });

    it('correctly generates the return type', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }

      customElements.define('devtools-breadcrumbs', Breadcrumbs)
      `);

      const classOutput = generateCreatorFunction(state);

      assert.include(
          classOutput.join('\n'),
          'return /** @type {!BreadcrumbsClosureInterface} */ (document.createElement(\'devtools-breadcrumbs\'))');
    });
  });

  describe('generateClosureClass', () => {
    it('outputs the class with a Closure specific name', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        private render() {}

        public update(person: Person): void {}
      }`);

      const classOutput = generateClosureClass(state);

      assert.isTrue(classOutput.includes('export class BreadcrumbsClosureInterface extends HTMLElement {'));
    });

    it('generates the correct JSDoc for the public methods including their return type', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        private render() {}

        public update(person: Person): void {}
      }`);

      const classOutput = generateClosureClass(state);

      assert.include(classOutput.join('\n'), `
  /**
  * @param {!Person} person
  * @return {void}
  */`);
    });

    it('generates the correct JSDoc for the public methods that return interfaces', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        private render() {}

        public update(person: Person): Person {}
      }`);

      const classOutput = generateClosureClass(state);

      assert.include(classOutput.join('\n'), `
  /**
  * @param {!Person} person
  * @return {!Person}
  */`);
    });

    it('adds an error to the function body to prevent TS warning about a function not returning the right value',
       () => {
         const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        private render() {}

        public update(person: Person): Person {}
      }`);

         const classOutput = generateClosureClass(state);

         assert.include(classOutput.join('\n'), `
  update(person) {
    throw new Error('Not implemented in _bridge.js');
  }`);
       });

    it('does not add an error if the function returns void', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        private render() {}

        public update(person: Person): void {}
      }`);

      const classOutput = generateClosureClass(state);

      assert.notInclude(classOutput.join('\n'), `
    throw new Error('Not implemented in _bridge.js');
  `);
    });

    it('generates the correct interface for arrays of interfaces', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        private render() {}

        public update(people: Person[]): void {}
      }`);

      const classOutput = generateClosureClass(state);

      assert.include(classOutput.join('\n'), `
  /**
  * @param {!Array.<!Person>} people
  * @return {void}
  */`);
    });

    it('generates the correct interface for arrays of primitives', () => {
      const state = parseCode(`class Breadcrumbs extends HTMLElement {
        private render() {}

        public update(people: string[]): void {}
      }`);

      const classOutput = generateClosureClass(state);

      assert.include(classOutput.join('\n'), `
  /**
  * @param {!Array.<string>} people
  * @return {void}
  */`);
    });

    it('generates the correct interface for optional arrays of primitives', () => {
      const state = parseCode(`class Breadcrumbs extends HTMLElement {
        private render() {}

        public update(people?: string[]): void {}
      }`);

      const classOutput = generateClosureClass(state);

      assert.include(classOutput.join('\n'), `
  /**
  * @param {(!Array.<string>|undefined)=} people
  * @return {void}
  */`);
    });

    it('generates the correct interface for optional arrays of interfaces', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        private render() {}

        public update(people?: Person[]): void {}
      }`);

      const classOutput = generateClosureClass(state);

      assert.include(classOutput.join('\n'), `
  /**
  * @param {(!Array.<!Person>|undefined)=} people
  * @return {void}
  */`);
    });

    it('correctly marks interface parameters as optional but not null', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        private render() {}

        public update(person?: Person): void {}
      }`);

      const classOutput = generateClosureClass(state);

      assert.include(classOutput.join('\n'), `
  /**
  * @param {!Person=} person
  * @return {void}
  */`);
    });

    it('correctly marks primitive parameters as optional', () => {
      const state = parseCode(`class Breadcrumbs extends HTMLElement {
        private render() {}

        public update(name?: string): void {}
      }`);

      const classOutput = generateClosureClass(state);

      assert.include(classOutput.join('\n'), `
  /**
  * @param {(string|undefined)=} name
  * @return {void}
  */`);
    });

    it('correctly deals with primitives that are not optional', () => {
      const state = parseCode(`class Breadcrumbs extends HTMLElement {
        private render() {}

        public update(name: string): void {}
      }`);

      const classOutput = generateClosureClass(state);

      assert.include(classOutput.join('\n'), `
  /**
  * @param {string} name
  * @return {void}
  */`);
    });

    it('deals with union types in parameters', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        private render() {}

        public update(person: Person | null): void {}
      }`);

      const classOutput = generateClosureClass(state);

      assert.include(classOutput.join('\n'), `
  /**
  * @param {?Person} person
  * @return {void}
  */`);
    });

    it('parses getter functions', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        public get person(): Person {
        }
      }`);

      const classOutput = generateClosureClass(state);

      assert.include(classOutput.join('\n'), `
  /**
  * @return {!Person}
  */`);

      assert.include(classOutput.join('\n'), 'get person() {');
    });

    it('throws on a getter that has no return type', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        public get person() {
        }
      }`);

      assert.throws(() => generateClosureClass(state), 'Found invalid getter with no return type: person');
    });

    it('puts an error throw in the function body to satisfy TypeScript', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        public get person(): Person {
        }
      }`);

      const classOutput = generateClosureClass(state);

      assert.include(classOutput.join('\n'), `
  /**
  * @return {!Person}
  */`);

      assert.include(classOutput.join('\n'), 'throw new Error(\'Not implemented in _bridge.js\')');
    });

    it('handles getter functions with optional return', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        public get person(): Person | null {
        }
      }`);

      const classOutput = generateClosureClass(state);

      assert.include(classOutput.join('\n'), `
  /**
  * @return {?Person}
  */`);

      assert.include(classOutput.join('\n'), 'get person() {');
    });

    it('parses setter functions', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        public set person(person: Person) {
        }
      }`);

      const classOutput = generateClosureClass(state);

      assert.include(classOutput.join('\n'), `
  /**
  * @param {!Person} person
  */`);

      assert.include(classOutput.join('\n'), 'set person(person) {');
    });

    it('throws on a setter that has no parameter', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        public set person() {
        }
      }`);

      assert.throws(() => generateClosureClass(state), 'Found invalid setter with no parameter: person');
    });

    it('throws on a setter that has an untyped parameter', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        public set person(p) {
        }
      }`);

      assert.throws(() => generateClosureClass(state), 'Found invalid setter with no explicit parameter type: person');
    });

    it('handles setter functions with optional parameters', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }
      class Breadcrumbs extends HTMLElement {
        public set person(person?: Person) {
        }
      }`);

      const classOutput = generateClosureClass(state);

      assert.include(classOutput.join('\n'), `
  /**
  * @param {!Person=} person
  */`);

      assert.include(classOutput.join('\n'), 'set person(person) {');
    });
  });

  describe('generateTypeReferences', () => {
    it('only generates interfaces taken by public methods', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }

      interface Dog {
        name: string
        goodDog: boolean
      }

      class Breadcrumbs extends HTMLElement {
        private render(dog: Dog) {}

        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 1);
      assert.isTrue(interfaces[0].join('').includes('export let Person'));
    });

    it('pulls out interfaces when a method takes an array of them', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }

      interface Dog {
        name: string
        goodDog: boolean
      }

      class Breadcrumbs extends HTMLElement {
        private render(dog: Dog) {}

        public update(people: Person[]): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 1);
      assert.isTrue(interfaces[0].join('').includes('export let Person'));
    });

    it('pulls out interfaces from a Readonly helper type', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }

      interface Dog {
        name: string
        goodDog: boolean
      }

      class Breadcrumbs extends HTMLElement {
        public update(people: ReadonlyArray<Person>, dog: Readonly<Dog>): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 2);
      assert.isTrue(interfaces[0].join('').includes('export let Person'));
      assert.isTrue(interfaces[1].join('').includes('export let Dog'));
    });

    it('can convert a basic interface into a Closure one', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* name:string,
* age:number,
* }}`);
    });

    it('supports unions of interfaces', () => {
      const state = parseCode(`type Animal = Dog|Cat;

      interface Dog {
        name: string;
      }

      interface Cat {
        name: string;
      }

      class Breadcrumbs extends HTMLElement {
        public update(animal: Animal): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 3);
      assert.include(interfaces[0].join('\n'), '* @typedef {Dog|Cat}');
      assert.include(interfaces[0].join('\n'), 'export let Animal');

      assert.include(interfaces[1].join('\n'), `* @typedef {{
* name:string,
* }}`);
      assert.include(interfaces[1].join('\n'), 'export let Dog');

      assert.include(interfaces[2].join('\n'), `* @typedef {{
* name:string,
* }}`);
      assert.include(interfaces[2].join('\n'), 'export let Cat');
    });

    it('supports unions of interfaces and types', () => {
      const state = parseCode(`type Animal = Dog|Cat;

      interface Dog {
        name: string;
      }

      type Cat = {
        name: string;
      }

      class Breadcrumbs extends HTMLElement {
        public update(animal: Animal): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 3);
      assert.include(interfaces[0].join('\n'), '* @typedef {Dog|Cat}');
      assert.include(interfaces[0].join('\n'), 'export let Animal');

      assert.include(interfaces[1].join('\n'), `* @typedef {{
* name:string,
* }}`);
      assert.include(interfaces[1].join('\n'), 'export let Dog');

      assert.include(interfaces[2].join('\n'), `* @typedef {{
* name:string,
* }}`);
      assert.include(interfaces[2].join('\n'), 'export let Cat');
    });

    it('supports unions of interfaces and types and primitives', () => {
      const state = parseCode(`type Animal = Dog|Cat|string|number;

      interface Dog {
        name: string;
      }

      type Cat = {
        name: string;
      }

      class Breadcrumbs extends HTMLElement {
        public update(animal: Animal): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 3);
      assert.include(interfaces[0].join('\n'), '* @typedef {Dog|Cat|string|number}');
      assert.include(interfaces[0].join('\n'), 'export let Animal');

      assert.include(interfaces[1].join('\n'), `* @typedef {{
* name:string,
* }}`);
      assert.include(interfaces[1].join('\n'), 'export let Dog');

      assert.include(interfaces[2].join('\n'), `* @typedef {{
* name:string,
* }}`);
      assert.include(interfaces[2].join('\n'), 'export let Cat');
    });

    it('supports unions of interfaces that reference interfaces', () => {
      const state = parseCode(`type Animal = Dog|Cat;

      interface DogFood {
        name: string;
        brand: string;
      }
      interface Dog {
        name: string;
        food: DogFood;
      }

      type Cat = {
        name: string;
      }

      class Breadcrumbs extends HTMLElement {
        public update(animal: Animal): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 4);
      assert.include(interfaces[0].join('\n'), '* @typedef {Dog|Cat}');
      assert.include(interfaces[0].join('\n'), 'export let Animal');

      assert.include(interfaces[1].join('\n'), `* @typedef {{
* name:string,
* food:!DogFood,
* }}`);
      assert.include(interfaces[1].join('\n'), 'export let Dog');

      assert.include(interfaces[2].join('\n'), `* @typedef {{
* name:string,
* }}`);
      assert.include(interfaces[2].join('\n'), 'export let Cat');

      assert.include(interfaces[3].join('\n'), `* @typedef {{
* name:string,
* brand:string,
* }}`);
      assert.include(interfaces[3].join('\n'), 'export let DogFood');
    });

    it('converts optional primitives correctly', () => {
      const state = parseCode(`interface Person {
        name?: string
      }

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* name:(string|undefined),
* }}`);
    });

    it('converts optional non-primitives correctly', () => {
      const state = parseCode(`interface Person {
        pet?: Pet
      }

      interface Pet {}

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 2);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* pet:(!Pet|undefined),
* }}`);
    });

    it('converts nullable non-primitives correctly', () => {
      const state = parseCode(`interface Person {
        pet: Pet|null
      }

      interface Pet {}

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 2);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* pet:?Pet,
* }}`);
    });

    it('includes the export with the @ts-ignore', () => {
      const state = parseCode(`interface Person {
        name: string
        age: number
      }

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `// @ts-ignore we export this for Closure not TS
export let Person`);
    });

    it('converts a TS type into a Closure interface', () => {
      const state = parseCode(`type Person = {
        name: string;
        age: number;
      }

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* name:string,
* age:number,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
    });

    it('supports a type that has a nested interface within', () => {
      const state = parseCode(`type Person = {
        name: Name;
        age: number;
      }

      interface Name {
        firstLetter: string;
        rest: string[];
      }

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 2);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* name:!Name,
* age:number,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
      assert.include(interfaces[1].join('\n'), `* @typedef {{
* firstLetter:string,
* rest:!Array.<string>,
* }}`);
      assert.include(interfaces[1].join('\n'), 'export let Name');
    });

    it('does not prefix a function type with a ! in the typedef', () => {
      const state = parseCode(`interface Person {
        getName: () => string
      }

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* getName:function():string,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
    });

    it('does not prefix an optional primitive type with a ! in the typedef', () => {
      const state = parseCode(`interface Person {
        name?: string;
      }

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* name:(string|undefined),
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
    });

    it('does not prefix a nullable primitive type with a ! in the typedef', () => {
      const state = parseCode(`interface Person {
        name: string|null;
      }

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* name:?string,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
    });

    it('pulls out a type that is nested within an interface', () => {
      const state = parseCode(`interface Person {
        name: Name;
        age: number;
      }

      type Name = {
        firstLetter: string;
        rest: string[];
      }

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 2);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* name:!Name,
* age:number,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
      assert.include(interfaces[1].join('\n'), `* @typedef {{
* firstLetter:string,
* rest:!Array.<string>,
* }}`);
      assert.include(interfaces[1].join('\n'), 'export let Name');
    });

    it('understands types that extend other types and fully defines them', () => {
      const state = parseCode(`type NamedThing = {
        name: string;
      }

      type Person = NamedThing & {
        age: number;
      }

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* name:string,
* age:number,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
    });

    it('understands types that extend other types with no object literals', () => {
      const state = parseCode(`type NamedThing = {
        name: string;
      }

      type AgedThing = {
        age: number;
      }

      type Person = NamedThing & AgedThing;

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* name:string,
* age:number,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
    });


    it('correctly includes interfaces from types that get extended', () => {
      const state = parseCode(`type NamedThing = {
        name: string;
        details: Detail[];
      }

      interface Detail {
        id: number;
      }

      type Person = NamedThing & { otherField: string };

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);
      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 2);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* name:string,
* details:!Array.<!Detail>,
* otherField:string,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
      assert.include(interfaces[1].join('\n'), `* @typedef {{
* id:number,
* }}`);
      assert.include(interfaces[1].join('\n'), 'export let Detail');
    });

    it('correctly includes interfaces from types that get extended with object literals', () => {
      const state = parseCode(`interface Detail {
        id: number;
      }

      type NamedThing = {
        name: string;
      }

      type Person = NamedThing & { details: Detail[] };

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 2);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* name:string,
* details:!Array.<!Detail>,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
      assert.include(interfaces[1].join('\n'), `* @typedef {{
* id:number,
* }}`);
      assert.include(interfaces[1].join('\n'), 'export let Detail');
    });

    it('ignores the Object type', () => {
      const state = parseCode(`interface Data {
        people: Object[]
      }

      class Breadcrumbs extends HTMLElement {
        public set data(data: Data) {
        }
      }`);
      const interfaces = generateTypeReferences(state);
      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* people:!Array.<!Object>,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Data');
    });

    it('can parse and convert basic Map types', () => {
      const state = parseCode(`interface Person {
        foo: Map<string, number>
      }

      interface Data {
        person: Person,
      }

      class Breadcrumbs extends HTMLElement {
        public set data(data: Data) {
        }
      }`);
      const interfaces = generateTypeReferences(state);
      assert.strictEqual(interfaces.length, 2);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* person:!Person,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Data');
      assert.include(interfaces[1].join('\n'), `* @typedef {{
* foo:!Map<string, number>,
* }}`);
      assert.include(interfaces[1].join('\n'), 'export let Person');
    });

    it('can parse and convert Map types with type references within', () => {
      const state = parseCode(`interface Person {
        friends: Map<string, Friend>
      }

      interface Friend {
        name: string;
      }

      interface Data {
        person: Person,
      }

      class Breadcrumbs extends HTMLElement {
        public set data(data: Data) {
        }
      }`);
      const interfaces = generateTypeReferences(state);
      assert.strictEqual(interfaces.length, 3);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* person:!Person,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Data');
      assert.include(interfaces[1].join('\n'), `* @typedef {{
* friends:!Map<string, !Friend>,
* }}`);
      assert.include(interfaces[1].join('\n'), 'export let Person');
      assert.include(interfaces[2].join('\n'), `* @typedef {{
* name:string,
* }}`);
      assert.include(interfaces[2].join('\n'), 'export let Friend');
    });

    it('can parse and convert basic Set types', () => {
      const state = parseCode(`interface Person {
        foo: Set<string>
      }

      interface Data {
        person: Person
      }

      class Breadcrumbs extends HTMLElement {
        public set data(data: Data) {
        }
      }`);
      const interfaces = generateTypeReferences(state);
      assert.strictEqual(interfaces.length, 2);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* person:!Person,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Data');
      assert.include(interfaces[1].join('\n'), `* @typedef {{
* foo:!Set<string>,
* }}`);
      assert.include(interfaces[1].join('\n'), 'export let Person');
    });

    it('can parse and convert Sets of interfaces', () => {
      const state = parseCode(`interface Person {
        foo: Set<Foo>
      }

      interface Foo {
        name: string;
      }

      interface Data {
        person: Person
      }

      class Breadcrumbs extends HTMLElement {
        public set data(data: Data) {
        }
      }`);
      const interfaces = generateTypeReferences(state);
      assert.strictEqual(interfaces.length, 3);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* person:!Person,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Data');
      assert.include(interfaces[1].join('\n'), `* @typedef {{
* foo:!Set<!Foo>,
* }}`);
      assert.include(interfaces[1].join('\n'), 'export let Person');
      assert.include(interfaces[2].join('\n'), `* @typedef {{
* name:string,
* }}`);
      assert.include(interfaces[2].join('\n'), 'export let Foo');
    });

    it('correctly converts HTMLElement types', () => {
      const state = parseCode(`interface Person {
        node: HTMLElement,
      }

      class Breadcrumbs extends HTMLElement {
        public set data(data: Person) {
        }
      }`);
      const interfaces = generateTypeReferences(state);
      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* node:!HTMLElement,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
    });

    it('correctly converts Element types', () => {
      const state = parseCode(`interface Person {
        node: Element,
      }

      class Breadcrumbs extends HTMLElement {
        public set data(data: Person) {
        }
      }`);
      const interfaces = generateTypeReferences(state);
      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* node:!Element,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
    });
    it('correctly converts more specific HTML element types', () => {
      const state = parseCode(`interface Person {
        div: HTMLDivElement,
        textarea: HTMLTextAreaElement,
        input: HTMLInputElement,
        select: HTMLSelectElement,
        option: HTMLOptionElement,
        canvas: HTMLCanvasElement,
      }

      class Breadcrumbs extends HTMLElement {
        public set data(data: Person) {
        }
      }`);
      const interfaces = generateTypeReferences(state);
      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* div:!HTMLDivElement,
* textarea:!HTMLTextAreaElement,
* input:!HTMLInputElement,
* select:!HTMLSelectElement,
* option:!HTMLOptionElement,
* canvas:!HTMLCanvasElement,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
    });

    it('understands interfaces that extend other interfaces and fully defines them', () => {
      const state = parseCode(`interface NamedThing {
        name: string;
      }

      interface Person extends NamedThing {
        age: number;
      }

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* name:string,
* age:number,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
    });

    it('understands interfaces that extend multiple interfaces', () => {
      const state = parseCode(`interface NamedThing {
        name: string;
      }

      interface AgedThing {
        age: number
      }

      interface Person extends NamedThing, AgedThing {
        favouriteColour: string;
      }

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* name:string,
* age:number,
* favouriteColour:string,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
    });

    it('understands interfaces that extend interfaces that extend interfaces', () => {
      const state = parseCode(`interface NamedThing {
        name: string;
      }

      interface AgedThing extends NamedThing {
        age: number
      }

      interface Person extends AgedThing {
        favouriteColour: string;
      }

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 1);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* name:string,
* age:number,
* favouriteColour:string,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
    });

    it('will include nested types from interfaces that get extended', () => {
      const state = parseCode(`interface NamedThing {
        name: Name;
      }

      interface Name {
        first: string;
        last: string;
      }

      interface Person extends NamedThing {
        favouriteColour: string;
      }

      class Breadcrumbs extends HTMLElement {
        public update(person: Person): void {}
      }`);

      const interfaces = generateTypeReferences(state);

      assert.strictEqual(interfaces.length, 2);
      assert.include(interfaces[0].join('\n'), `* @typedef {{
* name:!Name,
* favouriteColour:string,
* }}`);
      assert.include(interfaces[0].join('\n'), 'export let Person');
      assert.include(interfaces[1].join('\n'), `* @typedef {{
* first:string,
* last:string,
* }}`);
      assert.include(interfaces[1].join('\n'), 'export let Name');
    });

    it('can convert a TS enum of strings into Closure', () => {
      const state = parseCode(`export const enum SettingType {
        boolean = 'boolean',
        enum = 'enum'
      }

      class Breadcrumbs extends HTMLElement {
        public update(setting: SettingType): void {}
      }`);

      const enums = generateTypeReferences(state);
      assert.strictEqual(enums.length, 1);
      const enumOutput = enums[0].join('\n');
      assert.include(enumOutput, '* @enum {string}');
      assert.include(enumOutput, '// @ts-ignore we export this for Closure not TS');
      assert.include(enumOutput, 'export let SettingType = {');
      assert.include(enumOutput, 'boolean: \'boolean\',');
      assert.include(enumOutput, 'enum: \'enum\',');
      assert.include(enumOutput, '};');
    });

    it('can convert a TS enum of numbers into Closure', () => {
      const state = parseCode(`export const enum SettingType {
        boolean = 0,
        enum = 1,
      }

      class Breadcrumbs extends HTMLElement {
        public update(setting: SettingType): void {}
      }`);

      const enums = generateTypeReferences(state);
      assert.strictEqual(enums.length, 1);
      const enumOutput = enums[0].join('\n');
      assert.include(enumOutput, '* @enum {number}');
      assert.include(enumOutput, 'export let SettingType = {');
      assert.include(enumOutput, 'boolean: 0,');
      assert.include(enumOutput, 'enum: 1,');
      assert.include(enumOutput, '};');
    });

    it('correctly generates an interface that references an enum', () => {
      const state = parseCode(`export const enum SettingType {
        boolean = 0,
        enum = 1,
      }

      interface Setting {
        settingType: SettingType,
      }

      class Breadcrumbs extends HTMLElement {
        public update(setting: Setting): void {}
      }`);

      const references = generateTypeReferences(state);
      assert.strictEqual(references.length, 2);
      const interfaceOutput = references[0].join('\n');
      assert.include(interfaceOutput, '* @typedef {{');
      assert.include(interfaceOutput, '* settingType:!SettingType');
      assert.include(interfaceOutput, 'export let Setting');

      const enumOutput = references[1].join('\n');
      assert.include(enumOutput, '* @enum {number}');
      assert.include(enumOutput, 'export let SettingType = {');
      assert.include(enumOutput, 'boolean: 0,');
      assert.include(enumOutput, 'enum: 1,');
      assert.include(enumOutput, '};');
    });

    describe('erroring on string literal types', () => {
      it('errors if it finds a union type of string literals', () => {
        const state = parseCode(`type Name = 'a' | 'b';

        class Breadcrumbs extends HTMLElement {
          public update(name: Name): void {}
        }`);
        assert.throws(() => generateTypeReferences(state), 'Error: union type Name has a string literal member: "a"');
      });

      it('errors if it finds a union type with just one string literal', () => {
        const state = parseCode(`type Name = number | 'b';

        class Breadcrumbs extends HTMLElement {
          public update(name: Name): void {}
        }`);
        assert.throws(() => generateTypeReferences(state), 'Error: union type Name has a string literal member: "b"');
      });

      it('errors if it finds a union type of string literals referenced from an interface', () => {
        const state = parseCode(`type Name = 'a' | 'b';

        interface Settings {
          name: Name
        }

        class Breadcrumbs extends HTMLElement {
          public update(settings: Settings): void {}
        }`);
        assert.throws(() => generateTypeReferences(state), 'Error: union type Name has a string literal member: "a"');
      });

      it('errors if it finds a union type defined within an interface', () => {
        const state = parseCode(`interface Settings {
          name: 'a' | 'b'
        }

        class Breadcrumbs extends HTMLElement {
          public update(settings: Settings): void {}
        }`);
        assert.throws(
            () => generateTypeReferences(state), 'Error: union type Settings.name has a string literal member: "a"');
      });

      it('errors if it finds a string literal type in an interface', () => {
        const state = parseCode(`interface Settings {
          name: 'jack'
        }

        class Breadcrumbs extends HTMLElement {
          public update(settings: Settings): void {}
        }`);
        assert.throws(() => generateTypeReferences(state), 'Error: type Settings has string literal key name: "jack"');
      });

      it('errors when a type is extended with a string literal', () => {
        const state = parseCode(`type NamedThing = {
          name: string;
        }

        type AgedThing = {
          age: number;
        }

        type Person = NamedThing & AgedThing & { name: 'jack' };

        class Breadcrumbs extends HTMLElement {
          public update(person: Person): void {}
        }`);

        assert.throws(() => generateTypeReferences(state), 'Error: type Person has string literal key name: "jack"');
      });
    });
  });
});
