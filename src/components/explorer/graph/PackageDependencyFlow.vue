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
          <h5 class="text-muted">暂无包依赖数据</h5>
          <p class="text-muted small">当前数据库中没有包依赖关系数据</p>
        </div>
      </div>
    </div>

    <!-- Vue Flow 图表 -->
    <VueFlow
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

      <!-- 自定义节点模板 -->
      <template #node-package="{ data }">
        <div class="package-node" :class="{ 'selected': data.selected, 'external': data.external }">
          <div class="node-header">
            <i class="bi bi-box-fill me-2"></i>
            <span class="node-title">{{ data.label }}</span>
          </div>
          <div class="node-stats">
            <span class="stat-badge">
              <i class="bi bi-arrow-up-right"></i> {{ data.outDegree }}
            </span>
            <span class="stat-badge">
              <i class="bi bi-arrow-down-left"></i> {{ data.inDegree }}
            </span>
          </div>
        </div>
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
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { staticAnalysisAPI } from '../../../config/api'

export default {
  name: 'PackageDependencyFlow',
  components: {
    VueFlow,
    Background,
    Controls,
    MiniMap
  },
  props: {
    packagesToShow: {
      type: Array,
      default: () => []
    }
  },
  emits: ['package-selected', 'edge-selected'],
  data() {
    return {
      loading: false,
      nodes: [],
      edges: [],
      fullData: null
    }
  },
  watch: {
    packagesToShow: {
      handler(newVal) {
        if (this.fullData) {
          this.buildGraph(newVal)
        }
      },
      deep: true,
      immediate: false
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        console.log('Loading package dependencies for Vue Flow...')
        const data = await staticAnalysisAPI.getPackageDependencies()
        this.fullData = data
        console.log('Data loaded:', data)
        
        // 构建图
        this.buildGraph(this.packagesToShow)
      } catch (error) {
        console.error('Failed to load package dependencies:', error)
        alert(`加载失败: ${error.message}`)
      } finally {
        this.loading = false
      }
    },

    buildGraph(visiblePackages) {
      if (!this.fullData) return

      const { packages = [], dependencies = [] } = this.fullData
      
      console.log('Building graph with packages:', visiblePackages.length)

      // 选择要显示的包
      let selectedPackages = []
      if (visiblePackages && visiblePackages.length > 0) {
        selectedPackages = packages.filter(pkg => 
          visiblePackages.includes(pkg.name)
        )
      } else {
        // 默认显示Top 20
        const packageStats = this.calculatePackageStats(packages, dependencies)
        selectedPackages = packageStats.slice(0, 20)
      }

      console.log('Selected packages:', selectedPackages.length)

      // 构建节点
      this.nodes = selectedPackages.map((pkg, index) => {
        const stats = this.getPackageStats(pkg.name, dependencies)
        const isExternal = pkg.name.includes('github.com') || pkg.name.includes('golang.org')
        
        return {
          id: pkg.name,
          type: 'package',
          position: this.calculateNodePosition(index, selectedPackages.length),
          data: {
            label: this.formatPackageName(pkg.name),
            fullName: pkg.name,
            external: isExternal,
            inDegree: stats.inDegree,
            outDegree: stats.outDegree,
            selected: false
          }
        }
      })

      // 构建边
      const nodeIds = new Set(this.nodes.map(n => n.id))
      this.edges = dependencies
        .filter(dep => {
          // 兼容蛇形和驼峰命名
          const sourcePkg = dep.sourcePackage || dep.source_package
          const targetPkg = dep.targetPackage || dep.target_package
          return nodeIds.has(sourcePkg) && nodeIds.has(targetPkg)
        })
        .map((dep, index) => {
          // 兼容蛇形和驼峰命名
          const sourcePkg = dep.sourcePackage || dep.source_package
          const targetPkg = dep.targetPackage || dep.target_package
          const callCount = dep.callCount ?? dep.call_count ?? 1
          const strength = dep.dependencyStrength ?? dep.dependency_strength ?? 1
          
          return {
            id: `e-${index}`,
            source: sourcePkg,
            target: targetPkg,
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: '#b1b1b7',
              strokeWidth: Math.max(1, Math.min(5, callCount / 10))
            },
            data: {
              callCount,
              strength
            }
          }
        })

      console.log('Graph built - Nodes:', this.nodes.length, 'Edges:', this.edges.length)
    },

    calculatePackageStats(packages, dependencies) {
      return packages.map(pkg => {
        const stats = this.getPackageStats(pkg.name, dependencies)
        return {
          ...pkg,
          importance: stats.inDegree * 0.6 + stats.outDegree * 0.4,
          inDegree: stats.inDegree,
          outDegree: stats.outDegree
        }
      }).sort((a, b) => b.importance - a.importance)
    },

    getPackageStats(packageName, dependencies) {
      // 兼容蛇形和驼峰命名
      const inDegree = dependencies.filter(d => {
        const targetPkg = d.targetPackage || d.target_package
        return targetPkg === packageName
      }).length
      const outDegree = dependencies.filter(d => {
        const sourcePkg = d.sourcePackage || d.source_package
        return sourcePkg === packageName
      }).length
      return { inDegree, outDegree }
    },

    calculateNodePosition(index, total) {
      // 环形布局
      const radius = 300
      const angle = (index / total) * 2 * Math.PI
      return {
        x: 500 + radius * Math.cos(angle),
        y: 500 + radius * Math.sin(angle)
      }
    },

    formatPackageName(name) {
      // 简化包名显示
      const parts = name.split('/')
      if (parts.length > 3) {
        return '...' + parts.slice(-2).join('/')
      }
      return name
    },

    onNodeClick(event) {
      console.log('Node clicked:', event.node)
      
      // 高亮选中的节点
      this.nodes = this.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          selected: node.id === event.node.id
        }
      }))

      // 触发事件
      this.$emit('package-selected', {
        name: event.node.data.fullName,
        inDegree: event.node.data.inDegree,
        outDegree: event.node.data.outDegree
      })
    },

    onEdgeClick(event) {
      console.log('Edge clicked:', event.edge)
      this.$emit('edge-selected', event.edge.data)
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
