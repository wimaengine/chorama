import { Graph, kahnTopologySort } from "vifaa"
import { assert } from "../../utils/index.js"

/**
 * @typedef RenderGraphNode
 * @property {(context: RenderGraphContext) => void} execute
 * @property {() => RenderGraph | undefined} subgraph
 */

/**
 * @typedef RenderGraphContext
 * @property {import("../renderer.js").WebGLRenderer} renderer
 * @property {import("../../objects/index.js").ObjectBase[]} objects
 * @property {import("../../core/index.js").WebGLRenderDevice} renderDevice
 */

export class RenderGraph {
  /**
   * @private
   * @type {Graph<RenderGraphNode, undefined>}
   */
  graph = new Graph(true)

  /**
   * @private
   * @type {Map<string, number>}
   */
  nodes = new Map()

  /**
   * @type {[string,string][]}
   */
  queuedEdges = []

  /**
   * @param {string} name
   * @param {RenderGraphNode} node
   * @returns {RenderGraph}
   */
  addNode(name, node) {
    const current = this.nodes.get(name)

    if (current !== undefined) {
      throw new Error(`Render graph node "${name}" already exists`)
    }

    const id = this.graph.addNode(node)

    this.nodes.set(name, id)
    return this
  }

  /**
   * @private
   */
  addDependencies() {
    for (let i = this.queuedEdges.length - 1; i >= 0; i--) {
      const [from, to] = /** @type {[string, string]} */ (this.queuedEdges[i])

      const fromId = this.nodes.get(from)
      const toId = this.nodes.get(to)

      assert(fromId, `Render graph node "${from}" is missing`)
      assert(toId, `Render graph node "${to}" is missing`)

      this.graph.addEdge(fromId, toId, undefined)
    }
    this.queuedEdges = []
  }

  /**
   * @param {string} from
   * @param {string} to
   * @returns {RenderGraph}
   */
  addDependency(from, to) {
    this.queuedEdges.push([from, to])
    return this
  }

  /**
   * @param {RenderGraphContext} context
   */
  execute(context) {
    this.addDependencies()
    /** @type {number[] | undefined} */
    const order = kahnTopologySort(this.graph)

    assert(order, "Cycle detected in render graph")

    for (let i = 0; i < order.length; i++) {
      const nodeId = /** @type {number | undefined} */ (order[i])
      assert(nodeId, "Invalid render graph topology output")
      const node = this.graph.getNodeWeight(nodeId)

      assert(node, `Render graph node with id "${nodeId}" is missing`)
      node.execute(context)
    }
  }

  /**
   * Returns a serializable snapshot of the render graph for tooling/debug UIs.
   */
  inspect() {
    this.addDependencies()

    const typedGraph = /** @type {{ getNodes: () => any[]; getEdges: () => any[] }} */ (
      /** @type {unknown} */ (this.graph)
    )
    const nodes = typedGraph.getNodes()
    const edges = typedGraph.getEdges()
    const namesById = new Map()

    for (const [name, id] of this.nodes.entries()) {
      namesById.set(id, name)
    }

    /** @type {{ id: number; name: string; node: RenderGraphNode; subgraph: RenderGraph | undefined; incoming: number[]; outgoing: number[] }[]} */
    const resultNodes = []

    for (let id = 0; id < nodes.length; id++) {
      const node = nodes[id]
      if (!node) continue

      /** @type {number[]} */
      const incoming = []
      /** @type {number[]} */
      const outgoing = []

      for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
        const edge = edges[edgeIndex]
        if (!edge) continue

        if (edge.to === id) incoming.push(edge.from)
        if (edge.from === id) outgoing.push(edge.to)
      }

      const subgraph = typeof node.weight.subgraph === "function" ?
        node.weight.subgraph() :
        undefined

      resultNodes.push({
        id,
        name: namesById.get(id) ?? `Node_${id}`,
        node: node.weight,
        subgraph,
        incoming,
        outgoing
      })
    }

    /** @type {{ from: number; to: number }[]} */
    const resultEdges = []
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i]
      if (!edge) continue
      resultEdges.push({
        from: edge.from,
        to: edge.to
      })
    }

    /** @type {number[]} */
    const executionOrderIds = []
    /** @type {string[]} */
    const executionOrder = []
    const sorted = kahnTopologySort(this.graph)
    if (sorted) {
      for (let i = 0; i < sorted.length; i++) {
        const id = sorted[i]
        if (id === undefined) continue
        executionOrderIds.push(id)
        executionOrder.push(namesById.get(id) ?? `Node_${id}`)
      }
    }

    return {
      nodes: resultNodes,
      edges: resultEdges,
      executionOrderIds,
      executionOrder
    }
  }
}
