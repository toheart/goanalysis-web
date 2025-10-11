// 简单的 dagre 布局工具，方向从左到右（LR）
import dagre from 'dagre'

export function applyDagreLayout(nodes, edges, direction = 'LR') {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100 })
  g.setDefaultEdgeLabel(() => ({}))

  // 提升节点尺寸以匹配 NodeCard 实际渲染尺寸
  const NODE_WIDTH = 260
  const NODE_HEIGHT = 110

  nodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })
  edges.forEach((e) => {
    g.setEdge(e.source, e.target)
  })

  dagre.layout(g)

  const idToPos = {}
  g.nodes().forEach((id) => {
    const { x, y } = g.node(id)
    idToPos[id] = { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 }
  })

  const laidOutNodes = nodes.map((n) => ({
    ...n,
    position: idToPos[n.id] || n.position,
    sourcePosition: 'right',
    targetPosition: 'left',
  }))

  return { nodes: laidOutNodes, edges }
}


