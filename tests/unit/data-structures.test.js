const Stack = require('../../src/data-structures/Stack');
const Queue = require('../../src/data-structures/Queue');
const MinHeap = require('../../src/data-structures/MinHeap');
const BST = require('../../src/data-structures/BST');
const Graph = require('../../src/data-structures/Graph');

describe('Unit - Data Structures', () => {
  test('Stack follows LIFO order', () => {
    const stack = new Stack();

    stack.push('A');
    stack.push('B');
    stack.push('C');

    expect(stack.peek()).toBe('C');
    expect(stack.pop()).toBe('C');
    expect(stack.pop()).toBe('B');
    expect(stack.pop()).toBe('A');
    expect(stack.pop()).toBeNull();
    expect(stack.isEmpty()).toBe(true);
  });

  test('Queue follows FIFO order', () => {
    const queue = new Queue();

    queue.enqueue(10);
    queue.enqueue(20);
    queue.enqueue(30);

    expect(queue.peek()).toBe(10);
    expect(queue.dequeue()).toBe(10);
    expect(queue.dequeue()).toBe(20);
    expect(queue.dequeue()).toBe(30);
    expect(queue.dequeue()).toBeNull();
    expect(queue.isEmpty()).toBe(true);
  });

  test('MinHeap extracts values in ascending order', () => {
    const heap = new MinHeap();
    [8, 3, 11, 1, 7].forEach((value) => heap.insert(value));

    expect(heap.extractMin()).toBe(1);
    expect(heap.extractMin()).toBe(3);
    expect(heap.extractMin()).toBe(7);
    expect(heap.toSortedArray()).toEqual([8, 11]);
  });

  test('BST finds exact key and prefix matches', () => {
    const bst = new BST();

    bst.insert('j balvin', { id: 1 });
    bst.insert('karol g', { id: 2 });
    bst.insert('kali uchis', { id: 3 });

    expect(bst.search('karol g')).toEqual({ id: 2 });

    const prefixIds = bst.searchPrefix('ka').map((item) => item.id).sort((a, b) => a - b);
    expect(prefixIds).toEqual([2, 3]);
  });

  test('Graph BFS returns connected vertices by level', () => {
    const graph = new Graph();

    graph.addEdge('A', 'B');
    graph.addEdge('A', 'C');
    graph.addEdge('B', 'D');

    expect(graph.bfs('A', 2)).toEqual(['B', 'C', 'D']);
    expect(graph.hasVertex('A')).toBe(true);
  });
});
