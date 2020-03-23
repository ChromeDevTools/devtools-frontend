// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * this script was taken from https://github.com/ChromeDevTools/devtools-protocol/tree/master/scripts
 * and adjusted slightly to fit within devtools-frontend
 */
import * as fs from 'fs';
import * as path from 'path';

import {Protocol} from './protocol_schema';

const PROTOCOL_JSON_PATH = path.resolve(
    __dirname, path.join('..', '..', 'third_party', 'blink', 'public', 'devtools_protocol', 'browser_protocol.json'));

const protocolJson = require(PROTOCOL_JSON_PATH);
const protocolDomains: Protocol.Domain[] = protocolJson.domains;

let numIndents = 0;
let emitStr = '';

const emit = (str: string) => {
  emitStr += str;
};

const getIndent = () => '  '.repeat(numIndents);  // 2 spaced indents

const emitIndent = () => {
  emitStr += getIndent();
};

const emitLine = (str?: string) => {
  if (str) {
    emitIndent();
    emit(`${str}\n`);
  } else {
    emit('\n');
  }
};

const emitOpenBlock = (str: string, openChar = ' {') => {
  emitLine(`${str}${openChar}`);
  numIndents++;
};

const emitCloseBlock = (closeChar = '}') => {
  numIndents--;
  emitLine(closeChar);
};

const emitHeaderComments = () => {
  emitLine('// Copyright (c) 2020 The Chromium Authors. All rights reserved.');
  emitLine('// Use of this source code is governed by a BSD-style license that can be');
  emitLine('// found in the LICENSE file.');
  emitLine();
  emitLine('/**');
  emitLine(' * This file is auto-generated, do not edit manually. *');
  emitLine(' * Re-generate with: npm run generate-protocol-resources.');
  emitLine(' */');
  emitLine();
};

const emitModule = (moduleName: string, domains: Protocol.Domain[]) => {
  moduleName = toTitleCase(moduleName);
  emitHeaderComments();
  emitOpenBlock(`declare namespace ${moduleName}`);
  emitGlobalTypeDefs();
  domains.forEach(emitDomain);
  emitCloseBlock();
  emitLine();
};

const emitGlobalTypeDefs = () => {
  emitLine();
  emitLine('export type integer = number');
  emitLine('export type binary = string');
};

const emitDomain = (domain: Protocol.Domain) => {
  const domainName = toTitleCase(domain.domain);
  emitLine();
  emitDescription(domain.description);
  emitOpenBlock(`export namespace ${domainName}`);
  if (domain.types) {
    domain.types.forEach(emitDomainType);
  }
  if (domain.commands) {
    domain.commands.forEach(emitCommand);
  }
  if (domain.events) {
    domain.events.forEach(emitEvent);
  }
  emitCloseBlock();
};

const getCommentLines = (description: string) => {
  const lines = description.split(/\r?\n/g).map(line => line && ` * ${line}` || ' *');
  return ['/**', ...lines, ' */'];
};

const emitDescription = (description?: string) => {
  if (description) {
    getCommentLines(description).map(l => emitLine(l));
  }
};

const isPropertyInlineEnum = (prop: Protocol.ProtocolType): boolean => {
  if ('$ref' in prop) {
    return false;
  }
  return prop.type === 'string' && prop.enum !== null && prop.enum !== undefined;
};

const getPropertyDef = (interfaceName: string, prop: Protocol.PropertyType): string => {
  // Quote key if it has a . in it.
  const propName = prop.name.includes('.') ? `'${prop.name}'` : prop.name;
  let type: string;
  if (isPropertyInlineEnum(prop)) {
    type = interfaceName + toTitleCase(prop.name);
  } else {
    type = getPropertyType(interfaceName, prop);
  }
  return `${propName}${prop.optional ? '?' : ''}: ${type}`;
};

const getPropertyType = (interfaceName: string, prop: Protocol.ProtocolType): string => {
  if ('$ref' in prop) {
    return prop.$ref;
  }
  if (prop.type === 'array') {
    return `${getPropertyType(interfaceName, prop.items)}[]`;
  }
  if (prop.type === 'object') {
    if (!prop.properties) {
      // TODO: actually 'any'? or can use generic '[key: string]: string'?
      return 'any';
    }
    // hack: access indent, \n directly
    let objStr = '{\n';
    numIndents++;
    objStr += prop.properties.map(p => `${getIndent()}${getPropertyDef(interfaceName, p)};\n`).join('');
    numIndents--;
    objStr += `${getIndent()}}`;
    return objStr;
  }
  return prop.type;
};

const emitProperty = (interfaceName: string, prop: Protocol.PropertyType) => {
  emitDescription(prop.description);
  emitLine(`${getPropertyDef(interfaceName, prop)};`);
};

const emitInterface = (interfaceName: string, props?: Protocol.PropertyType[]) => {
  emitOpenBlock(`export interface ${interfaceName}`);
  props ? props.forEach(prop => emitProperty(interfaceName, prop)) : emitLine('[key: string]: string;');
  emitCloseBlock();
};

const emitEnum = (enumName: string, enumValues: string[]) => {
  emitOpenBlock(`export enum ${enumName}`);
  enumValues.forEach(value => {
    emitLine(`${fixCamelCase(value)} = '${value}',`);
  });
  emitCloseBlock();
};

// This is straight-up adopted from fix_camel_case in code_generator_frontend.py.
const fixCamelCase = (name: string): string => {
  let prefix = '';
  let result = name;
  if (name[0] === '-') {
    prefix = 'Negative';
    result = name.substring(1);
  }
  const refined = result.split('-').map(toTitleCase).join('');
  return prefix + refined.replace(/HTML|XML|WML|API/i, match => match.toUpperCase());
};

const emitInlineEnumForDomainType = (type: Protocol.DomainType) => {
  if (type.type === 'object') {
    emitInlineEnums(type.id, type.properties);
  }
};

const emitInlineEnumsForCommands = (command: Protocol.Command) => {
  emitInlineEnums(toCmdRequestName(command.name), command.parameters);
  emitInlineEnums(toCmdResponseName(command.name), command.returns);
};

const emitInlineEnumsForEvents = (event: Protocol.Event) => {
  emitInlineEnums(toEventPayloadName(event.name), event.parameters);
};

const emitInlineEnums = (prefix: string, propertyTypes?: Protocol.PropertyType[]) => {
  if (!propertyTypes) {
    return;
  }
  for (const type of propertyTypes) {
    if (isPropertyInlineEnum(type)) {
      emitLine();
      const enumName = prefix + toTitleCase(type.name);
      emitEnum(enumName, (type as Protocol.StringType).enum);
    }
  }
};

const emitDomainType = (type: Protocol.DomainType) => {
  // Check if this type is an object that declares inline enum types for some of its properties.
  // These inline enums must be emitted first.
  emitInlineEnumForDomainType(type);

  emitLine();
  emitDescription(type.description);

  if (type.type === 'object') {
    emitInterface(type.id, type.properties);
  } else if (type.type === 'string' && type.enum) {
    // Explicit enums declared as separate types that inherit from 'string'.
    emitEnum(type.id, type.enum);
  } else {
    emitLine(`export type ${type.id} = ${getPropertyType(type.id, type)};`);
  }
};

const toTitleCase = (str: string) => str[0].toUpperCase() + str.substr(1);

const toCmdRequestName = (commandName: string) => `${toTitleCase(commandName)}Request`;

const toCmdResponseName = (commandName: string) => `${toTitleCase(commandName)}Response`;

const emitCommand = (command: Protocol.Command) => {
  emitInlineEnumsForCommands(command);

  // TODO(bckenny): should description be emitted for params and return types?
  if (command.parameters) {
    emitLine();
    emitInterface(toCmdRequestName(command.name), command.parameters);
  }

  if (command.returns) {
    emitLine();
    emitInterface(toCmdResponseName(command.name), command.returns);
  }
};

const toEventPayloadName = (eventName: string) => `${toTitleCase(eventName)}Event`;

const emitEvent = (event: Protocol.Event) => {
  if (!event.parameters) {
    return;
  }

  emitInlineEnumsForEvents(event);

  emitLine();
  emitDescription(event.description);
  emitInterface(toEventPayloadName(event.name), event.parameters);
};

const getEventMapping =
    (event: Protocol.Event, domainName: string, modulePrefix: string): Protocol.RefType&Protocol.PropertyBaseType => {
      // Use TS3.0+ tuples
      const payloadType = event.parameters ? `[${modulePrefix}.${domainName}.${toEventPayloadName(event.name)}]` : '[]';

      return {
        // domain-prefixed name since it will be used outside of the module.
        name: `${domainName}.${event.name}`,
        description: event.description,
        $ref: payloadType,
      };
    };

const isWeakInterface = (params: Protocol.PropertyType[]): boolean => {
  return params.every(p => !!p.optional);
};

const getCommandMapping = (command: Protocol.Command, domainName: string,
                           modulePrefix: string): Protocol.ObjectType&Protocol.PropertyBaseType => {
  const prefix = `${modulePrefix}.${domainName}.`;
  // Use TS3.0+ tuples for paramsType
  let requestType = '[]';
  if (command.parameters) {
    const optional = isWeakInterface(command.parameters) ? '?' : '';
    requestType = '[' + prefix + toCmdRequestName(command.name) + optional + ']';
  }
  const responseType = command.returns ? prefix + toCmdResponseName(command.name) : 'void';

  return {
    type: 'object',
    name: `${domainName}.${command.name}`,
    description: command.description,
    properties: [
      {
        name: 'paramsType',
        $ref: requestType,
      },
      {
        name: 'returnType',
        $ref: responseType,
      },
    ],
  };
};

const flatten = <T>(arr: T[][]) => ([] as T[]).concat(...arr);

const emitMapping = (moduleName: string, protocolModuleName: string, domains: Protocol.Domain[]) => {
  moduleName = toTitleCase(moduleName);
  emitHeaderComments();
  emitDescription('Mappings from protocol event and command names to the types required for them.');
  emitOpenBlock(`export namespace ${moduleName}`);

  const protocolModulePrefix = toTitleCase(protocolModuleName);
  const eventDefs = flatten(domains.map(d => {
    const domainName = toTitleCase(d.domain);
    return (d.events || []).map(e => getEventMapping(e, domainName, protocolModulePrefix));
  }));
  emitInterface('Events', eventDefs);

  emitLine();

  const commandDefs = flatten(domains.map(d => {
    const domainName = toTitleCase(d.domain);
    return (d.commands || []).map(c => getCommandMapping(c, domainName, protocolModulePrefix));
  }));
  emitInterface('Commands', commandDefs);

  emitCloseBlock();
  emitLine();
  emitLine(`export default ${moduleName};`);
};

const emitApiCommand = (command: Protocol.Command, domainName: string, modulePrefix: string) => {
  const prefix = `${modulePrefix}.${domainName}.`;
  emitDescription(command.description);
  const params = command.parameters ? `params: ${prefix}${toCmdRequestName(command.name)}` : '';
  const response = command.returns ? `${prefix}${toCmdResponseName(command.name)}` : 'void';
  emitLine(`${command.name}(${params}): Promise<${response}>;`);
  emitLine();
};

const emitApiEvent = (event: Protocol.Event, domainName: string, modulePrefix: string) => {
  const prefix = `${modulePrefix}.${domainName}.`;
  emitDescription(event.description);
  const params = event.parameters ? `params: ${prefix}${toEventPayloadName(event.name)}` : '';
  emitLine(`on(event: '${event.name}', listener: (${params}) => void): void;`);
  emitLine();
};

const emitDomainApi = (domain: Protocol.Domain, modulePrefix: string) => {
  emitLine();
  const domainName = toTitleCase(domain.domain);
  if (domainName.startsWith('I')) {
    emitLine('// eslint thinks this is us prefixing our interfaces but it\'s not!');
    emitLine('// eslint-disable-next-line @typescript-eslint/interface-name-prefix');
  }
  emitOpenBlock(`export interface ${domainName}Api`);
  if (domain.commands) {
    domain.commands.forEach(c => emitApiCommand(c, domainName, modulePrefix));
  }
  if (domain.events) {
    domain.events.forEach(e => emitApiEvent(e, domainName, modulePrefix));
  }
  emitCloseBlock();
};

const emitApi = (moduleName: string, protocolModuleName: string, domains: Protocol.Domain[]) => {
  moduleName = toTitleCase(moduleName);
  emitHeaderComments();
  emitLine();
  emitDescription('API generated from Protocol commands and events.');
  emitOpenBlock(`declare namespace ${moduleName}`);

  emitLine();
  emitOpenBlock('declare interface ProtocolApi');
  domains.forEach(d => {
    emitLine(`${d.domain}: ${d.domain}Api;`);
    emitLine();
  });
  emitCloseBlock();
  emitLine();

  const protocolModulePrefix = toTitleCase(protocolModuleName);
  domains.forEach(d => emitDomainApi(d, protocolModulePrefix));
  emitCloseBlock();
  emitLine();
};

const flushEmitToFile = (path: string) => {
  console.log(`Wrote file: ${path}`);
  fs.writeFileSync(path, emitStr, {encoding: 'utf-8'});
  numIndents = 0;
  emitStr = '';
};

const main = () => {
  const FRONTEND_GENERATED_DIR = path.resolve(__dirname, path.join('../../front_end/generated'));

  const destProtocolFilePath = path.join(FRONTEND_GENERATED_DIR, 'protocol.d.ts');
  const protocolModuleName = path.basename(destProtocolFilePath, '.d.ts');
  emitModule(protocolModuleName, protocolDomains);
  flushEmitToFile(destProtocolFilePath);

  const destMappingFilePath = path.join(FRONTEND_GENERATED_DIR, 'protocol-mapping.d.ts');
  const mappingModuleName = 'ProtocolMapping';
  emitMapping(mappingModuleName, protocolModuleName, protocolDomains);
  flushEmitToFile(destMappingFilePath);

  const destApiFilePath = path.join(FRONTEND_GENERATED_DIR, 'protocol-proxy-api.d.ts');
  const apiModuleName = 'ProtocolProxyApi';
  emitApi(apiModuleName, protocolModuleName, protocolDomains);
  flushEmitToFile(destApiFilePath);
};

main();
