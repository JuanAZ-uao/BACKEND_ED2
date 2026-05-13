class Graph {
  constructor() {
    this.adjacencyList = new Map();
  }

  addVertex(vertex) {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, []);
    }
  }

  addEdge(vertex1, vertex2, weight = 1) {
    this.addVertex(vertex1);
    this.addVertex(vertex2);
    this.adjacencyList.get(vertex1).push({ node: vertex2, weight });
    this.adjacencyList.get(vertex2).push({ node: vertex1, weight });
  }

  getNeighbors(vertex) {
    return this.adjacencyList.get(vertex) || [];
  }

  // recorre por niveles hasta maxDepth y devuelve los nodos visitados
  bfs(start, maxDepth = 2) {
    const visited = new Set();
    const result = [];
    const queue = [{ node: start, depth: 0 }];
    visited.add(start);

    while (queue.length > 0) {
      const { node, depth } = queue.shift();
      if (depth > 0) result.push(node);

      if (depth < maxDepth) {
        for (const neighbor of this.getNeighbors(node)) {
          if (!visited.has(neighbor.node)) {
            visited.add(neighbor.node);
            queue.push({ node: neighbor.node, depth: depth + 1 });
          }
        }
      }
    }

    return result;
  }

  // recorrido en profundidad
  dfs(start) {
    const visited = new Set();
    const result = [];

    const explore = (node) => {
      visited.add(node);
      result.push(node);
      for (const neighbor of this.getNeighbors(node)) {
        if (!visited.has(neighbor.node)) explore(neighbor.node);
      }
    };

    explore(start);
    return result;
  }

  hasVertex(vertex) {
    return this.adjacencyList.has(vertex);
  }
}

module.exports = Graph;
