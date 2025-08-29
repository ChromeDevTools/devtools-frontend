"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hasValueOrExecutorHasNonEmptyResolveValue = exports.hasReturnValue = void 0;
/**
 * @typedef {import('estree').Node|
 *   import('@typescript-eslint/types').TSESTree.Node} ESTreeOrTypeScriptNode
 */

/**
 * Checks if a node is a promise but has no resolve value or an empty value.
 * An `undefined` resolve does not count.
 * @param {ESTreeOrTypeScriptNode|undefined|null} node
 * @returns {boolean|undefined|null}
 */
const isNewPromiseExpression = node => {
  return node && node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'Promise';
};

/**
 * @param {ESTreeOrTypeScriptNode|null|undefined} node
 * @returns {boolean}
 */
const isVoidPromise = node => {
  return /** @type {import('@typescript-eslint/types').TSESTree.TSTypeReference} */node?.typeArguments?.params?.[0]?.type === 'TSVoidKeyword'
  /* c8 ignore next 5 */
  // eslint-disable-next-line @stylistic/operator-linebreak -- c8
  || /** @type {import('@typescript-eslint/types').TSESTree.TSTypeReference} */node
  // @ts-expect-error Ok
  ?.typeParameters?.params?.[0]?.type === 'TSVoidKeyword';
};
const undefinedKeywords = new Set(['TSNeverKeyword', 'TSUndefinedKeyword', 'TSVoidKeyword']);

/**
 * Checks if a node has a return statement. Void return does not count.
 * @param {ESTreeOrTypeScriptNode|undefined|null} node
 * @param {boolean} [throwOnNullReturn]
 * @param {PromiseFilter} [promFilter]
 * @returns {boolean|undefined}
 */
// eslint-disable-next-line complexity
const hasReturnValue = (node, throwOnNullReturn, promFilter) => {
  if (!node) {
    return false;
  }
  switch (node.type) {
    case 'ArrowFunctionExpression':
    case 'FunctionDeclaration':
    case 'FunctionExpression':
      {
        return 'expression' in node && node.expression && (!isNewPromiseExpression(node.body) || !isVoidPromise(node.body)) || hasReturnValue(node.body, throwOnNullReturn, promFilter);
      }
    case 'BlockStatement':
      {
        return node.body.some(bodyNode => {
          return bodyNode.type !== 'FunctionDeclaration' && hasReturnValue(bodyNode, throwOnNullReturn, promFilter);
        });
      }
    case 'DoWhileStatement':
    case 'ForInStatement':
    case 'ForOfStatement':
    case 'ForStatement':
    case 'LabeledStatement':
    case 'WhileStatement':
    case 'WithStatement':
      {
        return hasReturnValue(node.body, throwOnNullReturn, promFilter);
      }
    case 'IfStatement':
      {
        return hasReturnValue(node.consequent, throwOnNullReturn, promFilter) || hasReturnValue(node.alternate, throwOnNullReturn, promFilter);
      }
    case 'MethodDefinition':
      return hasReturnValue(node.value, throwOnNullReturn, promFilter);
    case 'ReturnStatement':
      {
        // void return does not count.
        if (node.argument === null) {
          if (throwOnNullReturn) {
            throw new Error('Null return');
          }
          return false;
        }
        if (promFilter && isNewPromiseExpression(node.argument)) {
          // Let caller decide how to filter, but this is, at the least,
          //   a return of sorts and truthy
          return promFilter(node.argument);
        }
        return true;
      }
    case 'SwitchStatement':
      {
        return node.cases.some(someCase => {
          return someCase.consequent.some(nde => {
            return hasReturnValue(nde, throwOnNullReturn, promFilter);
          });
        });
      }
    case 'TryStatement':
      {
        return hasReturnValue(node.block, throwOnNullReturn, promFilter) || hasReturnValue(node.handler && node.handler.body, throwOnNullReturn, promFilter) || hasReturnValue(node.finalizer, throwOnNullReturn, promFilter);
      }
    case 'TSDeclareFunction':
    case 'TSFunctionType':
    case 'TSMethodSignature':
      {
        const type = node?.returnType?.typeAnnotation?.type;
        return type && !undefinedKeywords.has(type);
      }
    default:
      {
        return false;
      }
  }
};

/**
 * Checks if a node has a return statement. Void return does not count.
 * @param {ESTreeOrTypeScriptNode|null|undefined} node
 * @param {PromiseFilter} promFilter
 * @returns {undefined|boolean|ESTreeOrTypeScriptNode}
 */
// eslint-disable-next-line complexity
exports.hasReturnValue = hasReturnValue;
const allBrancheshaveReturnValues = (node, promFilter) => {
  if (!node) {
    return false;
  }
  switch (node.type) {
    // case 'MethodDefinition':
    //   return allBrancheshaveReturnValues(node.value, promFilter);
    case 'ArrowFunctionExpression':
    case 'FunctionDeclaration':
    case 'FunctionExpression':
      {
        return 'expression' in node && node.expression && (!isNewPromiseExpression(node.body) || !isVoidPromise(node.body)) || allBrancheshaveReturnValues(node.body, promFilter) || /** @type {import('@typescript-eslint/types').TSESTree.BlockStatement} */
        node.body.body.some(nde => {
          return nde.type === 'ReturnStatement';
        });
      }
    case 'BlockStatement':
      {
        const lastBodyNode = node.body.slice(-1)[0];
        return allBrancheshaveReturnValues(lastBodyNode, promFilter);
      }
    case 'DoWhileStatement':
    case 'WhileStatement':
      if (
      /**
       * @type {import('@typescript-eslint/types').TSESTree.Literal}
       */
      node.test.value === true) {
        // If this is an infinite loop, we assume only one branch
        //   is needed to provide a return
        return hasReturnValue(node.body, false, promFilter);
      }

    // Fallthrough
    case 'ForStatement':
      if (node.test === null) {
        // If this is an infinite loop, we assume only one branch
        //   is needed to provide a return
        return hasReturnValue(node.body, false, promFilter);
      }
    case 'ForInStatement':
    case 'ForOfStatement':
    case 'LabeledStatement':
    case 'WithStatement':
      {
        return allBrancheshaveReturnValues(node.body, promFilter);
      }
    case 'IfStatement':
      {
        return allBrancheshaveReturnValues(node.consequent, promFilter) && allBrancheshaveReturnValues(node.alternate, promFilter);
      }
    case 'ReturnStatement':
      {
        // void return does not count.
        if (node.argument === null) {
          return false;
        }
        if (promFilter && isNewPromiseExpression(node.argument)) {
          // Let caller decide how to filter, but this is, at the least,
          //   a return of sorts and truthy
          return promFilter(node.argument);
        }
        return true;
      }
    case 'SwitchStatement':
      {
        return /** @type {import('@typescript-eslint/types').TSESTree.SwitchStatement} */node.cases.every(someCase => {
          return !someCase.consequent.some(consNode => {
            return consNode.type === 'BreakStatement' || consNode.type === 'ReturnStatement' && consNode.argument === null;
          });
        });
      }
    case 'ThrowStatement':
      {
        return true;
      }
    case 'TryStatement':
      {
        // If `finally` returns, all return
        return node.finalizer && allBrancheshaveReturnValues(node.finalizer, promFilter) ||
        // Return in `try`/`catch` may still occur despite `finally`
        allBrancheshaveReturnValues(node.block, promFilter) && (!node.handler || allBrancheshaveReturnValues(node.handler && node.handler.body, promFilter)) && (!node.finalizer || (() => {
          try {
            hasReturnValue(node.finalizer, true, promFilter);
          } catch (error) {
            if (/** @type {Error} */error.message === 'Null return') {
              return false;
            }
            /* c8 ignore next 3 */
            // eslint-disable-next-line @stylistic/padding-line-between-statements -- c8
            throw error;
          }

          // As long as not an explicit empty return, then return true
          return true;
        })());
      }
    case 'TSDeclareFunction':
    case 'TSFunctionType':
    case 'TSMethodSignature':
      {
        const type = node?.returnType?.typeAnnotation?.type;
        return type && !undefinedKeywords.has(type);
      }
    default:
      {
        return false;
      }
  }
};

/**
 * @callback PromiseFilter
 * @param {ESTreeOrTypeScriptNode|undefined} node
 * @returns {boolean}
 */

/**
 * Avoids further checking child nodes if a nested function shadows the
 * resolver, but otherwise, if name is used (by call or passed in as an
 * argument to another function), will be considered as non-empty.
 *
 * This could check for redeclaration of the resolver, but as such is
 * unlikely, we avoid the performance cost of checking everywhere for
 * (re)declarations or assignments.
 * @param {import('@typescript-eslint/types').TSESTree.Node|null|undefined} node
 * @param {string} resolverName
 * @returns {boolean}
 */
// eslint-disable-next-line complexity
const hasNonEmptyResolverCall = (node, resolverName) => {
  if (!node) {
    return false;
  }

  // Arrow function without block
  switch (node.type) {
    case 'ArrayExpression':
    case 'ArrayPattern':
      return node.elements.some(element => {
        return hasNonEmptyResolverCall(element, resolverName);
      });
    case 'ArrowFunctionExpression':
    case 'FunctionDeclaration':
    case 'FunctionExpression':
      {
        // Shadowing
        if (/** @type {import('@typescript-eslint/types').TSESTree.Identifier} */node.params[0]?.name === resolverName) {
          return false;
        }
        return hasNonEmptyResolverCall(node.body, resolverName);
      }
    case 'AssignmentExpression':
    case 'BinaryExpression':
    case 'LogicalExpression':
      {
        return hasNonEmptyResolverCall(node.left, resolverName) || hasNonEmptyResolverCall(node.right, resolverName);
      }
    case 'AssignmentPattern':
      return hasNonEmptyResolverCall(node.right, resolverName);
    case 'AwaitExpression':
    case 'SpreadElement':
    case 'UnaryExpression':
    case 'YieldExpression':
      return hasNonEmptyResolverCall(node.argument, resolverName);
    case 'BlockStatement':
    case 'ClassBody':
      return node.body.some(bodyNode => {
        return hasNonEmptyResolverCall(bodyNode, resolverName);
      });
    /* c8 ignore next 2 -- In Babel? */
    case 'CallExpression':
    // @ts-expect-error Babel?
    case 'OptionalCallExpression':
      return /** @type {import('@typescript-eslint/types').TSESTree.Identifier} */node.callee.name === resolverName && (
      // Implicit or explicit undefined
      node.arguments.length > 1 || node.arguments[0] !== undefined) || node.arguments.some(nde => {
        // Being passed in to another function (which might invoke it)
        return nde.type === 'Identifier' && nde.name === resolverName ||
        // Handle nested items
        hasNonEmptyResolverCall(nde, resolverName);
      });
    case 'ChainExpression':
    case 'Decorator':
    case 'ExpressionStatement':
      return hasNonEmptyResolverCall(node.expression, resolverName);
    case 'ClassDeclaration':
    case 'ClassExpression':
      return hasNonEmptyResolverCall(node.body, resolverName);
    /* c8 ignore next 2 -- In Babel? */
    // @ts-expect-error Babel?
    case 'ClassMethod':
    case 'MethodDefinition':
      return node.decorators && node.decorators.some(decorator => {
        return hasNonEmptyResolverCall(decorator, resolverName);
      }) || node.computed && hasNonEmptyResolverCall(node.key, resolverName) || hasNonEmptyResolverCall(node.value, resolverName);

    /* c8 ignore next 2 -- In Babel? */
    // @ts-expect-error Babel?
    case 'ClassProperty':
    /* c8 ignore next 2 -- In Babel? */
    // @ts-expect-error Babel?
    case 'ObjectProperty':
    case 'Property':
    case 'PropertyDefinition':
      return node.computed && hasNonEmptyResolverCall(node.key, resolverName) || hasNonEmptyResolverCall(node.value, resolverName);
    case 'ConditionalExpression':
    case 'IfStatement':
      {
        return hasNonEmptyResolverCall(node.test, resolverName) || hasNonEmptyResolverCall(node.consequent, resolverName) || hasNonEmptyResolverCall(node.alternate, resolverName);
      }
    case 'DoWhileStatement':
    case 'ForInStatement':
    case 'ForOfStatement':
    case 'ForStatement':
    case 'LabeledStatement':
    case 'WhileStatement':
    case 'WithStatement':
      {
        return hasNonEmptyResolverCall(node.body, resolverName);
      }

    /* c8 ignore next 2 -- In Babel? */
    // @ts-expect-error Babel?
    case 'Import':
    case 'ImportExpression':
      return hasNonEmptyResolverCall(node.source, resolverName);
    // ?.
    /* c8 ignore next 2 -- In Babel? */
    case 'MemberExpression':

    // @ts-expect-error Babel?
    case 'OptionalMemberExpression':
      return hasNonEmptyResolverCall(node.object, resolverName) || hasNonEmptyResolverCall(node.property, resolverName);
    case 'ObjectExpression':
    case 'ObjectPattern':
      return node.properties.some(property => {
        return hasNonEmptyResolverCall(property, resolverName);
      });
    /* c8 ignore next 2 -- In Babel? */
    // @ts-expect-error Babel?
    case 'ObjectMethod':
      /* c8 ignore next 6 -- In Babel? */
      // @ts-expect-error
      return node.computed && hasNonEmptyResolverCall(node.key, resolverName) ||
      // @ts-expect-error
      node.arguments.some(nde => {
        return hasNonEmptyResolverCall(nde, resolverName);
      });
    case 'ReturnStatement':
      {
        if (node.argument === null) {
          return false;
        }
        return hasNonEmptyResolverCall(node.argument, resolverName);
      }

    // Comma
    case 'SequenceExpression':
    case 'TemplateLiteral':
      return node.expressions.some(subExpression => {
        return hasNonEmptyResolverCall(subExpression, resolverName);
      });
    case 'SwitchStatement':
      {
        return node.cases.some(someCase => {
          return someCase.consequent.some(nde => {
            return hasNonEmptyResolverCall(nde, resolverName);
          });
        });
      }
    case 'TaggedTemplateExpression':
      return hasNonEmptyResolverCall(node.quasi, resolverName);
    case 'TryStatement':
      {
        return hasNonEmptyResolverCall(node.block, resolverName) || hasNonEmptyResolverCall(node.handler && node.handler.body, resolverName) || hasNonEmptyResolverCall(node.finalizer, resolverName);
      }
    case 'VariableDeclaration':
      {
        return node.declarations.some(nde => {
          return hasNonEmptyResolverCall(nde, resolverName);
        });
      }
    case 'VariableDeclarator':
      {
        return hasNonEmptyResolverCall(node.id, resolverName) || hasNonEmptyResolverCall(node.init, resolverName);
      }

    /*
    // Shouldn't need to parse literals/literal components, etc.
    case 'Identifier':
    case 'TemplateElement':
    case 'Super':
    // Exports not relevant in this context
    */
    default:
      return false;
  }
};

/**
 * Checks if a Promise executor has no resolve value or an empty value.
 * An `undefined` resolve does not count.
 * @param {ESTreeOrTypeScriptNode} node
 * @param {boolean} anyPromiseAsReturn
 * @param {boolean} [allBranches]
 * @returns {boolean}
 */
const hasValueOrExecutorHasNonEmptyResolveValue = (node, anyPromiseAsReturn, allBranches) => {
  const hasReturnMethod = allBranches ?
  /**
   * @param {ESTreeOrTypeScriptNode} nde
   * @param {PromiseFilter} promiseFilter
   * @returns {boolean}
   */
  (nde, promiseFilter) => {
    let hasReturn;
    try {
      hasReturn = hasReturnValue(nde, true, promiseFilter);
    } catch (error) {
      // c8 ignore else
      if (/** @type {Error} */error.message === 'Null return') {
        return false;
      }
      /* c8 ignore next 3 */
      // eslint-disable-next-line @stylistic/padding-line-between-statements -- c8
      throw error;
    }

    // `hasReturn` check needed since `throw` treated as valid return by
    //   `allBrancheshaveReturnValues`
    return Boolean(hasReturn && allBrancheshaveReturnValues(nde, promiseFilter));
  } :
  /**
   * @param {ESTreeOrTypeScriptNode} nde
   * @param {PromiseFilter} promiseFilter
   * @returns {boolean}
   */
  (nde, promiseFilter) => {
    return Boolean(hasReturnValue(nde, false, promiseFilter));
  };
  return hasReturnMethod(node, prom => {
    if (anyPromiseAsReturn) {
      return true;
    }
    if (isVoidPromise(prom)) {
      return false;
    }
    const {
      body,
      params
    } =
    /**
     * @type {import('@typescript-eslint/types').TSESTree.FunctionExpression|
     * import('@typescript-eslint/types').TSESTree.ArrowFunctionExpression}
     */
    (/** @type {import('@typescript-eslint/types').TSESTree.NewExpression} */prom.arguments[0]) || {};
    if (!params?.length) {
      return false;
    }
    const {
      name: resolverName
    } = /** @type {import('@typescript-eslint/types').TSESTree.Identifier} */
    params[0];
    return hasNonEmptyResolverCall(body, resolverName);
  });
};
exports.hasValueOrExecutorHasNonEmptyResolveValue = hasValueOrExecutorHasNonEmptyResolveValue;
//# sourceMappingURL=hasReturnValue.cjs.map