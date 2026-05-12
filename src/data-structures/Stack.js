/**
 * Pila (LIFO) — historial de acciones del carrito (undo).
 * Uso: puede integrarse en el frontend o en un endpoint de historial.
 */
class Stack {
  constructor() {
    this.items = [];
  }

  push(value) {
    this.items.push(value);
  }

  pop() {
    if (this.isEmpty()) return null;
    return this.items.pop();
  }

  peek() {
    return this.items[this.items.length - 1] ?? null;
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  toArray() {
    return [...this.items].reverse();
  }
}

module.exports = Stack;
