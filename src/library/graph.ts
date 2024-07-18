import { GUID } from "./types";

export type Node = {
    id: GUID;
    type: string;
    name: string;
    metadata: Record<string, any>;
}
export type Edge = Node & {
    from: Node;
    to: Node;
}

export class Graph {
    name: string;
    nodes: Node[];
    edges: Edge[];
    constructor() {
        this.name = "";
        this.nodes = [];
        this.edges = [];
    }
    getNode(id: GUID) {
        return this.nodes.find(x=> x.id == id);
    }
    getNodesFrom(id: GUID, type: string) {
        const edges = this.edges.filter(x => x.type == type && x.from.id == id);
        const nodes = edges.map(x => x.to);
        return nodes;
    }
    serialize() {
        return {
            name: this.name,
            nodes: this.nodes.map(x => x),
            edges: this.edges.map(x => ({ ...x, from: x.from.id, to: x.to.id }))
        }
    }
}

/**
 * id: "567",
 * name: "Test Graph",
 * nodes: [
 *      { id: "123", name: "Florence" },
 *      { id: "234", name: "Tuscany" },
 * ],
 * edges: [
 *  { from: "123", to: "234", type: "is-inside" },
 *  { from: "123", to: "234", type: "capitol-of" }
 * ]
 * 
 */