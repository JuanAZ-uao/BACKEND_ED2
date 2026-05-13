class BSTNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

class BST {
  constructor() {
    this.root = null;
  }

  insert(key, value) {
    this.root = this._insert(this.root, key, value);
  }

  _insert(node, key, value) {
    if (!node) return new BSTNode(key, value);
    if (key < node.key) node.left = this._insert(node.left, key, value);
    else if (key > node.key) node.right = this._insert(node.right, key, value);
    else node.value = value;
    return node;
  }

  search(key) {
    let current = this.root;
    while (current) {
      if (key === current.key) return current.value;
      current = key < current.key ? current.left : current.right;
    }
    return null;
  }

  // busca todos los nodos cuya clave empiece con el prefijo
  searchPrefix(prefix) {
    const results = [];
    this._traversePrefix(this.root, prefix, results);
    return results;
  }

  _traversePrefix(node, prefix, results) {
    if (!node) return;
    if (node.key.startsWith(prefix)) results.push(node.value);
    this._traversePrefix(node.left, prefix, results);
    this._traversePrefix(node.right, prefix, results);
  }

  inOrder() {
    const result = [];
    this._inOrder(this.root, result);
    return result;
  }

  _inOrder(node, result) {
    if (!node) return;
    this._inOrder(node.left, result);
    result.push({ key: node.key, value: node.value });
    this._inOrder(node.right, result);
  }
}

module.exports = BST;
