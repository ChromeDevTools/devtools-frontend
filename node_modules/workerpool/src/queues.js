/**
 * FIFO Queue implementation
 * @template [T=any]
 * @constructor
 * @implements {import('./types').TaskQueue<T>}
 */
function FIFOQueue() {
  /** @type {import('./types').Task<T>[]} */
  this.tasks = [];
}

/**
 * @param {import('./types').Task<T>} task
 * @returns {void}
 */
FIFOQueue.prototype.push = function (task) {
  this.tasks.push(task);
};

/**
 * @returns {import('./types').Task<T> | undefined}
 */
FIFOQueue.prototype.pop = function () {
  return this.tasks.shift();
};

/**
 * @returns {number}
 */
FIFOQueue.prototype.size = function () {
  return this.tasks.length;
};

/**
 * @param {import('./types').Task<T>} task
 * @returns {boolean}
 */
FIFOQueue.prototype.contains = function (task) {
  return this.tasks.includes(task);
};

/**
 * @returns {void}
 */
FIFOQueue.prototype.clear = function () {
  this.tasks.length = 0;
};

/**
 * LIFO Queue implementation
 * @template [T=any]
 * @constructor
 * @implements {import('./types').TaskQueue<T>}
 */
function LIFOQueue() {
  /** @type {import('./types').Task<T>[]} */
  this.tasks = [];
}

/**
 * @param {import('./types').Task<T>} task
 * @returns {void}
 */
LIFOQueue.prototype.push = function (task) {
  this.tasks.push(task);
};

/**
 * @returns {import('./types').Task<T> | undefined}
 */
LIFOQueue.prototype.pop = function () {
  return this.tasks.pop();
};

/**
 * @returns {number}
 */
LIFOQueue.prototype.size = function () {
  return this.tasks.length;
};

/**
 * @param {import('./types').Task<T>} task
 * @returns {boolean}
 */
LIFOQueue.prototype.contains = function (task) {
  return this.tasks.includes(task);
};

/**
 * @returns {void}
 */
LIFOQueue.prototype.clear = function () {
  this.tasks.length = 0;
};

module.exports = { FIFOQueue, LIFOQueue };
