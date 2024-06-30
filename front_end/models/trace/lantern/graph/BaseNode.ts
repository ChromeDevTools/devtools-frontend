// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Core from '../core/core.js';
import type * as Lantern from '../types/types.js';

import {type CPUNode} from './CPUNode.js';
import {type NetworkNode} from './NetworkNode.js';

/**
 * A union of all types derived from BaseNode, allowing type check discrimination
 * based on `node.type`. If a new node type is created, it should be added here.
 */
export type Node<T = Lantern.AnyNetworkObject> = CPUNode<T>|NetworkNode<T>;

/**
 * @fileoverview This class encapsulates logic for handling resources and tasks used to model the
 * execution dependency graph of the page. A node has a unique identifier and can depend on other
 * nodes/be depended on. The construction of the graph maintains some important invariants that are
 * inherent to the model:
 *
 *    1. The graph is a DAG, there are no cycles.
 *    2. There is always a root node upon which all other nodes eventually depend.
 *
 * This allows particular optimizations in this class so that we do no need to check for cycles as
 * these methods are called and we can always start traversal at the root node.
 */

class BaseNode<T = Lantern.AnyNetworkObject> {
  static types = {
    NETWORK: 'network',
    CPU: 'cpu',
  } as const;

  _id: string;
  _isMainDocument: boolean;
  dependents: Node[];
  dependencies: Node[];

  constructor(id: string) {
    this._id = id;
    this._isMainDocument = false;
    this.dependents = [];
    this.dependencies = [];
  }

  get id(): string {
    return this._id;
  }

  get type(): 'network'|'cpu' {
    throw new Core.LanternError('Unimplemented');
  }

  /**
   * In microseconds
   */
  get startTime(): number {
    throw new Core.LanternError('Unimplemented');
  }

  /**
   * In microseconds
   */
  get endTime(): number {
    throw new Core.LanternError('Unimplemented');
  }

  setIsMainDocument(value: boolean): void {
    this._isMainDocument = value;
  }

  isMainDocument(): boolean {
    return this._isMainDocument;
  }

  getDependents(): Node[] {
    return this.dependents.slice();
  }

  getNumberOfDependents(): number {
    return this.dependents.length;
  }

  getDependencies(): Node[] {
    return this.dependencies.slice();
  }

  getNumberOfDependencies(): number {
    return this.dependencies.length;
  }

  getRootNode(): Node<T> {
    let rootNode = this as BaseNode as Node;
    while (rootNode.dependencies.length) {
      rootNode = rootNode.dependencies[0];
    }

    return rootNode;
  }

  addDependent(node: Node): void {
    node.addDependency(this as BaseNode as Node);
  }

  addDependency(node: Node): void {
    // @ts-expect-error - in checkJs, ts doesn't know that CPUNode and NetworkNode *are* BaseNodes.
    if (node === this) {
      throw new Core.LanternError('Cannot add dependency on itself');
    }

    if (this.dependencies.includes(node)) {
      return;
    }

    node.dependents.push(this as BaseNode as Node);
    this.dependencies.push(node);
  }

  removeDependent(node: Node): void {
    node.removeDependency(this as BaseNode as Node);
  }

  removeDependency(node: Node): void {
    if (!this.dependencies.includes(node)) {
      return;
    }

    const thisIndex = node.dependents.indexOf(this as BaseNode as Node);
    node.dependents.splice(thisIndex, 1);
    this.dependencies.splice(this.dependencies.indexOf(node), 1);
  }

  removeAllDependencies(): void {
    for (const node of this.dependencies.slice()) {
      this.removeDependency(node);
    }
  }

  /**
   * Computes whether the given node is anywhere in the dependency graph of this node.
   * While this method can prevent cycles, it walks the graph and should be used sparingly.
   * Nodes are always considered dependent on themselves for the purposes of cycle detection.
   */
  isDependentOn(node: BaseNode<T>): boolean {
    let isDependentOnNode = false;
    this.traverse(
        currentNode => {
          if (isDependentOnNode) {
            return;
          }
          isDependentOnNode = currentNode === node;
        },
        currentNode => {
          // If we've already found the dependency, don't traverse further.
          if (isDependentOnNode) {
            return [];
          }
          // Otherwise, traverse the dependencies.
          return currentNode.getDependencies();
        });

    return isDependentOnNode;
  }

  /**
   * Clones the node's information without adding any dependencies/dependents.
   */
  cloneWithoutRelationships(): Node<T> {
    const node = new BaseNode(this.id) as Node<T>;
    node.setIsMainDocument(this._isMainDocument);
    return node;
  }

  /**
   * Clones the entire graph connected to this node filtered by the optional predicate. If a node is
   * included by the predicate, all nodes along the paths between the node and the root will be included. If the
   * node this was called on is not included in the resulting filtered graph, the method will throw.
   *
   * This does not clone NetworkNode's `record` or `rawRecord` fields. It may be reasonable to clone the former,
   * to assist in graph construction, but the latter should never be cloned as one contraint of Lantern is that
   * the underlying data records are accessible for plain object reference equality checks.
   */
  cloneWithRelationships(predicate?: (arg0: Node) => boolean): Node {
    const rootNode = this.getRootNode();

    const idsToIncludedClones = new Map<string, Node>();

    // Walk down dependents.
    rootNode.traverse(node => {
      if (idsToIncludedClones.has(node.id)) {
        return;
      }

      if (predicate === undefined) {
        // No condition for entry, so clone every node.
        idsToIncludedClones.set(node.id, node.cloneWithoutRelationships());
        return;
      }

      if (predicate(node)) {
        // Node included, so walk back up dependencies, cloning nodes from here back to the root.
        node.traverse(
            node => idsToIncludedClones.set(node.id, node.cloneWithoutRelationships()),
            // Dependencies already cloned have already cloned ancestors, so no need to visit again.
            node => node.dependencies.filter(parent => !idsToIncludedClones.has(parent.id)),
        );
      }
    });

    // Copy dependencies between nodes.
    rootNode.traverse(originalNode => {
      const clonedNode = idsToIncludedClones.get(originalNode.id);
      if (!clonedNode) {
        return;
      }

      for (const dependency of originalNode.dependencies) {
        const clonedDependency = idsToIncludedClones.get(dependency.id);
        if (!clonedDependency) {
          throw new Core.LanternError('Dependency somehow not cloned');
        }
        clonedNode.addDependency(clonedDependency);
      }
    });

    const clonedThisNode = idsToIncludedClones.get(this.id);
    if (!clonedThisNode) {
      throw new Core.LanternError('Cloned graph missing node');
    }
    return clonedThisNode;
  }

  /**
   * Traverses all connected nodes in BFS order, calling `callback` exactly once
   * on each. `traversalPath` is the shortest (though not necessarily unique)
   * path from `node` to the root of the iteration.
   *
   * The `getNextNodes` function takes a visited node and returns which nodes to
   * visit next. It defaults to returning the node's dependents.
   */
  traverse(callback: (node: Node<T>, traversalPath: Node<T>[]) => void, getNextNodes?: (arg0: Node<T>) => Node<T>[]):
      void {
    for (const {node, traversalPath} of this.traverseGenerator(getNextNodes)) {
      callback(node, traversalPath);
    }
  }

  /**
   * @see BaseNode.traverse
   */
  // clang-format off
  *traverseGenerator(getNextNodes?: (arg0: Node) => Node[]):
      Generator<{node: Node, traversalPath: Node[]}, void, unknown> {
    // clang-format on
    if (!getNextNodes) {
      getNextNodes = node => node.getDependents();
    }

    // @ts-expect-error - only traverses graphs of Node, so force tsc to treat `this` as one
    const queue: Node[][] = [[this]];
    const visited = new Set([this.id]);

    while (queue.length) {
      // @ts-expect-error - queue has length so it's guaranteed to have an item
      const traversalPath: Node[] = queue.shift();
      const node = traversalPath[0];
      yield {node, traversalPath};

      for (const nextNode of getNextNodes(node)) {
        if (visited.has(nextNode.id)) {
          continue;
        }
        visited.add(nextNode.id);

        queue.push([nextNode, ...traversalPath]);
      }
    }
  }

  /**
   * Returns whether the given node has a cycle in its dependent graph by performing a DFS.
   */
  static hasCycle(node: Node, direction: 'dependents'|'dependencies'|'both' = 'both'): boolean {
    // Checking 'both' is the default entrypoint to recursively check both directions
    if (direction === 'both') {
      return BaseNode.hasCycle(node, 'dependents') || BaseNode.hasCycle(node, 'dependencies');
    }

    const visited = new Set();
    const currentPath: BaseNode[] = [];
    const toVisit = [node];
    const depthAdded = new Map([[node, 0]]);

    // Keep going while we have nodes to visit in the stack
    while (toVisit.length) {
      // Get the last node in the stack (DFS uses stack, not queue)
      // @ts-expect-error - toVisit has length so it's guaranteed to have an item
      const currentNode: BaseNode = toVisit.pop();

      // We've hit a cycle if the node we're visiting is in our current dependency path
      if (currentPath.includes(currentNode)) {
        return true;
      }
      // If we've already visited the node, no need to revisit it
      if (visited.has(currentNode)) {
        continue;
      }

      // Since we're visiting this node, clear out any nodes in our path that we had to backtrack
      // @ts-expect-error
      while (currentPath.length > depthAdded.get(currentNode)) {
        currentPath.pop();
      }

      // Update our data structures to reflect that we're adding this node to our path
      visited.add(currentNode);
      currentPath.push(currentNode);

      // Add all of its dependents to our toVisit stack
      const nodesToExplore = direction === 'dependents' ? currentNode.dependents : currentNode.dependencies;
      for (const nextNode of nodesToExplore) {
        if (toVisit.includes(nextNode)) {
          continue;
        }
        toVisit.push(nextNode);
        depthAdded.set(nextNode, currentPath.length);
      }
    }

    return false;
  }

  canDependOn(node: Node): boolean {
    return node.startTime <= this.startTime;
  }
}

export {BaseNode};
