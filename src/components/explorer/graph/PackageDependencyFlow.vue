<template>
  <div class="package-dependency-flow">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner-border text-primary mb-3"></div>
      <p class="text-muted">正在加载包依赖关系...</p>
    </div>

    <!-- 无数据提示 -->
    <div v-else-if="nodes.length === 0" class="no-data-container">
      <div class="card">
        <div class="card-body text-center py-5">
          <i class="bi bi-inbox display-4 text-muted mb-3"></i>
          <h5 class="text-muted">暂无可展示的包依赖数据</h5>
          <p class="text-muted small">请确认存在名为 "main" 的包，或选择其它数据库</p>
        </div>
      </div>
    </div>

    <!-- Vue Flow 图表 -->
    <VueFlow
      ref="flow"
      v-else
      v-model:nodes="nodes"
      v-model:edges="edges"
      :default-zoom="0.8"
      :min-zoom="0.1"
      :max-zoom="4"
      :fit-view-on-init="true"
      class="vue-flow-container"
      @node-click="onNodeClick"
      @edge-click="onEdgeClick"
    >
      <!-- 背景网格 -->
      <Background pattern-color="#aaa" :gap="16" />

      <!-- 控制按钮 -->
      <Controls />

      <!-- 小地图 -->
      <MiniMap />

      <!-- 自定义节点模板：统一使用 NodeCard 卡片，悬停显示完整包名 -->
      <template #node-package="{ id, data }">
        <NodeCard :id="id" :data="{ title: data.label, pkg: data.fullName }" :selected="data.selected" />
      </template>
    </VueFlow>

    <!-- 图例 -->
    <div class="legend-panel">
      <h6 class="legend-title">
        <i class="bi bi-info-circle me-2"></i>图例
      </h6>
      <div class="legend-item">
        <div class="legend-color internal"></div>
        <span>内部包</span>
      </div>
      <div class="legend-item">
        <div class="legend-color external"></div>
        <span>外部包</span>
      </div>
      <div class="legend-item">
        <i class="bi bi-arrow-right text-primary"></i>
        <span>依赖关系</span>
      </div>
    </div>

    <!-- 统计面板 -->
    <div class="stats-panel">
      <div class="stat-item">
        <span class="stat-label">节点数</span>
        <span class="stat-value">{{ nodes.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">边数</span>
        <span class="stat-value">{{ edges.length }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { VueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { staticAnalysisAPI } from '../../../config/api'
import { applyDagreLayout } from './layout/dagreLayout'
import NodeCard from '../function/NodeCard.vue'

export default {
  name: 'PackageDependencyFlow',
  components: {
    VueFlow,
    Background,
    Controls,
    MiniMap,
    NodeCard
  },
  props: {
    // 根包名（严格等于 main），不做回退
    rootPackageName: {
      type: String,
      default: 'main'
    },
    // 初始展示的包数量上限
    initialNodeLimit: {
      type: Number,
      default: 20
    },
    // 每次展开的子依赖数量
    expandBatchSize: {
      type: Number,
      default: 5
    }
  },
  emits: ['package-selected', 'edge-selected'],
  data() {
    return {
      loading: false,
      nodes: [],
      edges: [],
      fullData: null,
      // 当前使用的中心根包名（从 props 初始化，可在运行时检测替换）
      currentRootPackageName: this.rootPackageName,
      // 可视集合与索引
      visibleNodeIds: new Set(),
      visibleEdges: [],
      outAdjMap: new Map(),      // name -> Array<{target, callCount}>
      inAdjMap: new Map(),       // name -> Array<source>
      visibleInDegree: new Map(),
      expandedNodes: new Set(),  // 已展开的节点
      depthMap: new Map()        // name -> depth from root
    }
  },
  watch: {},
  mounted() {
    if (this.currentRootPackageName) {
      this.loadData()
    } else {
      console.warn('Root package name not provided; graph will remain empty until provided')
    }
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        console.log('Loading package dependencies for Vue Flow...')
        const data = await staticAnalysisAPI.getPackageDependencies()
        this.fullData = data
        console.log('Data loaded:', data)

        // 构建邻接表
        this.buildAdjacency()
        // 检测 main 所属包作为中心
        await this.detectMainRoot()
        // 从 root 构建初始可视集合
        this.initializeFromRoot()
      } catch (error) {
        console.error('Failed to load package dependencies:', error)
        alert(`加载失败: ${error.message}`)
      } finally {
        this.loading = false
      }
    },

    // ============ 新增：邻接与初始化 ============
    buildAdjacency() {
      this.outAdjMap.clear()
      this.inAdjMap.clear()

      const dependencies = this.fullData?.dependencies || []
      dependencies.forEach(dep => {
        const source = dep.sourcePackage || dep.source_package
        const target = dep.targetPackage || dep.target_package
        const callCount = dep.callCount ?? dep.call_count ?? 1

        if (!this.outAdjMap.has(source)) this.outAdjMap.set(source, [])
        this.outAdjMap.get(source).push({ target, callCount })

        if (!this.inAdjMap.has(target)) this.inAdjMap.set(target, [])
        this.inAdjMap.get(target).push(source)
      })

      // 子依赖按调用次数降序，便于展开时挑选更“重要”的子包
      for (const list of this.outAdjMap.values()) {
        list.sort((a, b) => (b.callCount - a.callCount))
      }
    },

    initializeFromRoot() {
      const packages = this.fullData?.packages || []
      const hasMain = packages.some(p => p.name === this.currentRootPackageName)
      if (!hasMain) {
        console.warn('Root package not found:', this.currentRootPackageName)
        this.nodes = []
        this.edges = []
        this.visibleNodeIds.clear()
        return
      }

      // BFS 仅出边，限制初始节点数
      this.visibleNodeIds = new Set()
      this.expandedNodes = new Set()
      this.depthMap = new Map()

      const queue = [this.currentRootPackageName]
      this.visibleNodeIds.add(this.currentRootPackageName)
      this.depthMap.set(this.currentRootPackageName, 0)

      while (queue.length > 0 && this.visibleNodeIds.size < this.initialNodeLimit) {
        const current = queue.shift()
        const children = (this.outAdjMap.get(current) || []).map(x => x.target)
        for (const child of children) {
          if (!this.visibleNodeIds.has(child)) {
            this.visibleNodeIds.add(child)
            this.depthMap.set(child, (this.depthMap.get(current) || 0) + 1)
            queue.push(child)
            if (this.visibleNodeIds.size >= this.initialNodeLimit) break
          }
        }
      }

      this.rebuildGraphFromVisible()
    },

    // ============ 图构建与布局 ============
    rebuildGraphFromVisible() {
      const packages = this.fullData?.packages || []
      const dependencies = this.fullData?.dependencies || []
      const nodeIds = new Set(this.visibleNodeIds)

      // 构建节点（先给出占位 position）
      const selectedPackages = packages.filter(p => nodeIds.has(p.name))
      this.nodes = selectedPackages.map((pkg) => {
        const stats = this.getPackageStatsQuick(pkg.name)
        const isExternal = pkg.name.includes('github.com') || pkg.name.includes('golang.org')
        return {
          id: pkg.name,
          type: 'package',
          position: { x: 0, y: 0 },
          data: {
            label: this.formatPackageName(pkg.name),
            fullName: pkg.name,
            external: isExternal,
            inDegree: stats.inDegree,
            outDegree: stats.outDegree,
            selected: pkg.name === this.currentRootPackageName,
            expanded: this.expandedNodes.has(pkg.name)
          }
        }
      })

      // 构建边（仅可见节点之间的边）
      let edgeIdx = 0
      this.edges = dependencies
        .filter(dep => {
          const sourcePkg = dep.sourcePackage || dep.source_package
          const targetPkg = dep.targetPackage || dep.target_package
          return nodeIds.has(sourcePkg) && nodeIds.has(targetPkg)
        })
        .map(dep => {
          const sourcePkg = dep.sourcePackage || dep.source_package
          const targetPkg = dep.targetPackage || dep.target_package
          const callCount = dep.callCount ?? dep.call_count ?? 1
          const strength = dep.dependencyStrength ?? dep.dependency_strength ?? 1
          return {
            id: `e-${edgeIdx++}`,
            source: sourcePkg,
            target: targetPkg,
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: '#b1b1b7',
              strokeWidth: Math.max(1, Math.min(5, callCount / 10))
            },
            markerEnd: MarkerType.ArrowClosed,
            data: { callCount, strength }
          }
        })

      // 更新可见入度计数
      this.visibleInDegree = new Map()
      for (const nodeId of nodeIds) this.visibleInDegree.set(nodeId, 0)
      for (const e of this.edges) {
        this.visibleInDegree.set(e.target, (this.visibleInDegree.get(e.target) || 0) + 1)
      }

      // 应用 dagre 布局（LR）
      const laid = applyDagreLayout(this.nodes, this.edges, 'LR')
      this.nodes = laid.nodes
      this.$nextTick(() => this.$refs.flow?.fitView({ padding: 0.2 }))
      console.log('Graph rebuilt - Nodes:', this.nodes.length, 'Edges:', this.edges.length)
    },

    getPackageStatsQuick(pkgName) {
      const inDegree = (this.inAdjMap.get(pkgName) || []).length
      const outDegree = (this.outAdjMap.get(pkgName) || []).length
      return { inDegree, outDegree }
    },

    // 分层布局：按深度层级水平/同心分布
    calculateLayerPosition(depth, index, total) {
      const layerRadius = 140
      const centerX = 500
      const centerY = 500
      const r = 60 + depth * layerRadius
      const countInLayer = Math.max(6, Math.min(20, total))
      const angle = (index % countInLayer) / countInLayer * 2 * Math.PI
      return { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) }
    },

    formatPackageName(name) {
      const parts = name.split('/')
      if (parts.length > 3) return '...' + parts.slice(-2).join('/')
      return name
    },

    // ============ 交互：点击展开/收起 ============
    onNodeClick(event) {
      const nodeId = event.node.id
      console.log('Node clicked:', nodeId)

      // 高亮选中（main 所属包始终高亮）
      this.nodes = this.nodes.map(node => ({
        ...node,
        data: { ...node.data, selected: node.id === nodeId || node.id === this.currentRootPackageName }
      }))

      // 切换展开/收起
      if (this.expandedNodes.has(nodeId)) {
        this.collapseSubtree(nodeId)
        this.expandedNodes.delete(nodeId)
      } else {
        this.expandNode(nodeId, this.expandBatchSize)
        this.expandedNodes.add(nodeId)
      }

      // 更新节点 expanded 状态并重建可见图
      this.rebuildGraphFromVisible()

      // 向父组件上报
      const stats = this.getPackageStatsQuick(nodeId)
      this.$emit('package-selected', { name: nodeId, inDegree: stats.inDegree, outDegree: stats.outDegree })
    },

    onEdgeClick(event) {
      console.log('Edge clicked:', event.edge)
      this.$emit('edge-selected', event.edge.data)
    },

    expandNode(nodeId, batchSize) {
      const neighbors = (this.outAdjMap.get(nodeId) || []).map(x => x.target)
      let added = 0
      for (const nb of neighbors) {
        if (!this.visibleNodeIds.has(nb)) {
          this.visibleNodeIds.add(nb)
          this.depthMap.set(nb, (this.depthMap.get(nodeId) || 0) + 1)
          added++
          if (added >= batchSize) break
        }
      }
    },

    collapseSubtree(nodeId) {
      // 收起：移除从 nodeId 出发的后代中“未被其他可见父引用”的节点
      const descendants = new Set()
      const stack = [nodeId]
      // 仅沿当前可见边向下遍历
      const outMapVisible = new Map()
      for (const e of this.edges) {
        if (!outMapVisible.has(e.source)) outMapVisible.set(e.source, [])
        outMapVisible.get(e.source).push(e.target)
      }
      while (stack.length) {
        const cur = stack.pop()
        const children = outMapVisible.get(cur) || []
        for (const c of children) {
          if (!descendants.has(c)) {
            descendants.add(c)
            stack.push(c)
          }
        }
      }
      descendants.delete(nodeId)

      // 保护有外部可见父的节点
      const protectedNodes = new Set()
      for (const d of descendants) {
        const incoming = this.edges.filter(e => e.target === d)
        const hasExternalParent = incoming.some(e => !descendants.has(e.source) && e.source !== nodeId)
        if (hasExternalParent) protectedNodes.add(d)
      }

      // 可移除集合 = descendants - protectedNodes
      for (const d of descendants) {
        if (!protectedNodes.has(d)) this.visibleNodeIds.delete(d)
      }
    },

    async detectMainRoot() {
      try {
        const packages = this.fullData?.packages || []
        const pkgSet = new Set(packages.map(p => p.name))
        const res = await staticAnalysisAPI.searchFunctions('main')
        const candidates = (res.functions || []).filter(f => (f.name || '').toLowerCase() === 'main' && f.package)
        let bestPkg = null
        let bestScore = -1
        for (const f of candidates) {
          const pkg = f.package
          if (!pkgSet.has(pkg)) continue
          const out = (this.outAdjMap.get(pkg) || []).length
          const inn = (this.inAdjMap.get(pkg) || []).length
          const score = out * 2 + inn
          if (score > bestScore) { bestScore = score; bestPkg = pkg }
        }
        if (bestPkg) this.currentRootPackageName = bestPkg
      } catch (e) {
        console.warn('detectMainRoot failed:', e)
      }
    }
  }
}
</script>

<style scoped>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';

.package-dependency-flow {
  position: relative;
  width: 100%;
  height: 700px;
  background: #fafafa;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  z-index: 100;
}

.vue-flow-container {
  width: 100%;
  height: 100%;
}

/* 自定义节点样式 */
.package-node {
  padding: 12px 16px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  min-width: 180px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.package-node:hover {
  border-color: #4785ff;
  box-shadow: 0 4px 12px rgba(71, 133, 255, 0.3);
  transform: translateY(-2px);
}

.package-node.selected {
  border-color: #4785ff;
  background: rgba(71, 133, 255, 0.05);
  box-shadow: 0 4px 16px rgba(71, 133, 255, 0.4);
}

.package-node.external {
  border-color: #ffc107;
  background: rgba(255, 193, 7, 0.05);
}

.node-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.node-title {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-stats {
  display: flex;
  gap: 8px;
  font-size: 11px;
}

.stat-badge {
  padding: 2px 8px;
  background: #f0f0f0;
  border-radius: 4px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 图例面板 */
.legend-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
  min-width: 150px;
}

.legend-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid;
}

.legend-color.internal {
  background: rgba(71, 133, 255, 0.1);
  border-color: #e0e0e0;
}

.legend-color.external {
  background: rgba(255, 193, 7, 0.1);
  border-color: #ffc107;
}

/* 统计面板 */
.no-data-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-data-container .card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  max-width: 400px;
}

.stats-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #4785ff;
}
</style>
