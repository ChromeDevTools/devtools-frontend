#!/usr/bin/env node

// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs');
const path = require('path');

/**
 * Converts a string to camelCase.
 * e.g., "my-component-name" -> "myComponentName"
 * e.g., "MyComponentName" -> "myComponentName"
 * @param str
 * @returns
 */
function toCamelCase(str) {
  if (!str) {
    return '';
  }
  // Normalize to handle various inputs (kebab, snake, space, Pascal)
  const s = str.replace(/[-_.\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^(.)/, m => m.toLowerCase());
  return s.charAt(0).toLowerCase() + s.substring(1);
}

/**
 * Converts a string to PascalCase.
 * e.g., "my-component-name" -> "MyComponentName"
 * e.g., "myComponentName" -> "MyComponentName"
 * @param str
 * @returns
 */
function toPascalCase(str) {
  if (!str) {
    return '';
  }
  // Normalize to handle various inputs (kebab, snake, space, camel)
  const s = str.replace(/[-_.\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^(.)/, m => m.toUpperCase());
  return s.charAt(0).toUpperCase() + s.substring(1);
}

/**
 * Converts a string to kebab-case.
 * e.g., "MyComponentName" -> "my-component-name"
 * e.g., "myComponentName" -> "my-component-name"
 * @param str
 * @returns
 */
function toKebabCase(str) {
  if (!str) {
    return '';
  }
  return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')  // Add hyphen before capital in camelCase or PascalCase
      .replace(/[\s_]+/g, '-')                 // Replace spaces and underscores with hyphens
      .toLowerCase();
}

// --- Main Script Logic ---

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error('Usage: node scaffold-widget.js <path-to-create-component> <ComponentName>');
    console.error('Example: node scaffold-widget.js front_end/panels/ai_assistance ChatInputWidget');
    process.exit(1);
  }

  const componentDestPath = args[0];
  const componentBaseName = args[1];

  // --- Derive Name Variations ---
  const pascalCaseName = toPascalCase(componentBaseName);  // e.g., MyNewWidget
  const camelCaseName = toCamelCase(componentBaseName);    // e.g., myNewWidget
  const kebabCaseName = toKebabCase(componentBaseName);    // e.g., my-new-widget

  // --- Define Replacements ---
  const currentYear = new Date().getFullYear().toString();
  const componentPathAbsolute = path.resolve(componentDestPath);
  const frontEndPathAbsolute = path.resolve(process.cwd(), 'front_end');
  const frontEndPathForImports =
      path.relative(componentPathAbsolute, frontEndPathAbsolute).replace(/\\/g, '/');  // Normalize to forward slashes

  const tsReplacements = {
    '{{DATE}}': currentYear,
    '{{FRONT_END_PATH_PREFIX}}': frontEndPathForImports,
    '{{COMPONENT_PATH_PREFIX}}': componentDestPath.replace(/\\/g, '/'),  // Use forward slashes for paths in code
    '{{COMPONENT_NAME_PASCAL_CASE}}': pascalCaseName,
    '{{COMPONENT_NAME_CAMEL_CASE}}': camelCaseName,  // Used for style var and import path
    '{{COMPONENT_NAME_KEBAP_CASE}}': kebabCaseName,
  };

  const cssReplacements = {
    '{{DATE}}': currentYear,
    '{{COMPONENT_NAME_KEBAP_CASE}}': kebabCaseName,
  };

  // --- Read Template Files ---
  let tsTemplateContent;
  let cssTemplateContent;

  try {
    tsTemplateContent = fs.readFileSync(path.resolve(__dirname, 'templates', 'WidgetTemplate.ts.txt'), 'utf8');
    cssTemplateContent = fs.readFileSync(path.resolve(__dirname, 'templates', 'WidgetTemplate.css.txt'), 'utf8');
  } catch (error) {
    console.error('Error reading template files (WidgetTemplate.ts.txt or WidgetTemplate.css.txt):', error.message);
    console.error('Make sure these files are in a "templates" subdirectory where the script is run.');
    process.exit(1);
  }

  // --- Process Templates ---
  let processedTsContent = tsTemplateContent;
  for (const placeholder in tsReplacements) {
    processedTsContent = processedTsContent.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), tsReplacements[placeholder]);
  }

  let processedCssContent = cssTemplateContent;
  for (const placeholder in cssReplacements) {
    processedCssContent = processedCssContent.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), cssReplacements[placeholder]);
  }

  // --- Write Output Files ---
  const outputTsFilename = `${pascalCaseName}.ts`;
  const outputCssFilename = `${camelCaseName}.css`;

  const outputTsFilePath = path.join(componentDestPath, outputTsFilename);
  const outputCssFilePath = path.join(componentDestPath, outputCssFilename);

  try {
    // Ensure the destination directory exists
    fs.mkdirSync(componentDestPath, {recursive: true});

    // Write the processed TypeScript file
    fs.writeFileSync(outputTsFilePath, processedTsContent);
    console.log(`Successfully created: ${outputTsFilePath}`);

    // Write the processed CSS file
    fs.writeFileSync(outputCssFilePath, processedCssContent);
    console.log(`Successfully created: ${outputCssFilePath}\n`);

    // --- Post-creation instructions ---
    // Paths for build system (relative, forward slashes)
    const grdTsPath = path.join(componentDestPath, `${pascalCaseName}.js`).replace(/\\/g, '/');
    const grdCssPath = path.join(componentDestPath, `${camelCaseName}.css.js`).replace(/\\/g, '/');
    console.log('1. Update \'grd_files_unbundled_sources\' in \'devtools_grd_files.gni\':');
    console.log('   Add the following generated JavaScript files:');
    console.log(`     "${grdTsPath}",`);
    console.log(`     "${grdCssPath}",`);
    console.log('   (Note: The .ts file becomes .js, and .css becomes .css.js in GRD entries)');

    console.log('\n2. Update \'devtools_module("<module-name>")\' in the relevant \'BUILD.gn\' file:');
    console.log('   Add the source TypeScript file to the \'sources\' list:');
    console.log(`     "${outputTsFilename}",`);

    console.log('\n3. Update \'generate_css("css_files")\' in the relevant \'BUILD.gn\' file:');
    console.log('   Add the source CSS file to the \'sources\' list:');
    console.log(`     "${outputCssFilename}",`);

  } catch (error) {
    console.error(`Error writing output files to ${componentDestPath}:`, error.message);
    process.exit(1);
  }
}

main();
