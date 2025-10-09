<template>
  <div class="package-graph-viewer">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-content">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <p class="text-muted mb-1">正在加载包依赖数据...</p>
        <small class="text-muted">首次加载可能需要几秒钟</small>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <i class="bi bi-exclamation-triangle text-warning mb-3" style="font-size: 3rem;"></i>
      <h6 class="mb-2">加载失败</h6>
      <p class="text-muted small">{{ error }}</p>
    </div>

    <!-- 和弦图容器 -->
    <div v-show="!loading && !error" ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { staticAnalysisAPI } from '../../../config/api'

export default {
  name: 'PackageGraphViewer',
  props: {
    packagesToShow: {
      type: Array,
      default: () => []
    }
  },
  emits: ['package-selected'],
  data() {
    return {
      loading: false,
      error: null,
      chart: null,
      fullData: null, // 存储完整的原始数据
      currentNodes: [], // 当前显示的节点
      currentLinks: [] // 当前显示的边
    }
  },
  watch: {
    packagesToShow: {
      handler(newVal) {
        if (this.fullData) {
          this.updateChartData(newVal)
        }
      },
      deep: true
    }
  },
  mounted() {
    this.initChart()
    this.loadData()
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.dispose()
      window.removeEventListener('resize', this.handleResize)
    }
  },
  methods: {
    initChart() {
      if (!this.$refs.chartContainer) return
      
      this.chart = echarts.init(this.$refs.chartContainer)
      window.addEventListener('resize', this.handleResize)
    },

    handleResize() {
      this.chart?.resize()
    },

    async loadData() {
      this.loading = true
      this.error = null
      
      try {
        const data = await staticAnalysisAPI.getPackageDependencies()
        this.fullData = data
        
        // 初始显示: Top 20 重要包
        this.updateChartData([])
      } catch (err) {
        console.error('Failed to load package dependencies:', err)
        this.error = err.message || '加载失败'
      } finally {
        this.loading = false
      }
    },

    updateChartData(visiblePackages) {
      if (!this.fullData) return

      const { nodes, links } = this.processData(visiblePackages)
      this.currentNodes = nodes
      this.currentLinks = links
      
      this.renderChordGraph()
    },

    processData(visiblePackages) {
      const packages = this.fullData.packages || []
      const dependencies = this.fullData.dependencies || []

      let selectedPackages = []

      if (visiblePackages && visiblePackages.length > 0) {
        // 使用指定的包列表
        selectedPackages = packages.filter(pkg => 
          visiblePackages.includes(pkg.name)
        )
      } else {
        // 计算重要性: 出度 + 入度
        const packageImportance = packages.map(pkg => {
          const outDegree = dependencies.filter(dep => dep.sourcePackage === pkg.name).length
          const inDegree = dependencies.filter(dep => dep.targetPackage === pkg.name).length
          return {
            ...pkg,
            importance: outDegree + inDegree
          }
        })
        
        // 选择 Top 20
        selectedPackages = packageImportance
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 20)
      }

      // 构建节点列表
      const nodes = selectedPackages.map(pkg => ({
        name: pkg.name,
        value: pkg.functionCount || 1,
        itemStyle: {
          color: this.getPackageColor(pkg.complexity || 0)
        }
      }))

      const nodeNames = new Set(nodes.map(n => n.name))

      // 筛选边: 仅包含在节点中的边
      const links = dependencies
        .filter(dep => 
          nodeNames.has(dep.sourcePackage) && 
          nodeNames.has(dep.targetPackage)
        )
        .map(dep => ({
          source: dep.sourcePackage,
          target: dep.targetPackage,
          value: dep.callCount || dep.dependencyStrength || 1
        }))

      return { nodes, links }
    },

    renderChordGraph() {
      if (!this.chart || !this.currentNodes.length) return

      // 构建邻接矩阵
      const matrix = this.buildAdjacencyMatrix()
      
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            if (params.dataType === 'edge') {
              return `${params.data.source} → ${params.data.target}<br/>调用次数: ${params.data.value}`
            } else {
              return `${params.name}<br/>函数数量: ${params.value}`
            }
          }
        },
        series: [{
          type: 'chord',
          radius: ['50%', '60%'],
          center: ['50%', '50%'],
          data: this.currentNodes.map(node => ({
            name: node.name,
            value: node.value,
            itemStyle: node.itemStyle
          })),
          matrix: matrix,
          label: {
            show: true,
            fontSize: 10,
            color: '#333',
            formatter: (params) => {
              const name = params.name
              return name.length > 15 ? name.substring(0, 15) + '...' : name
            }
          },
          emphasis: {
            itemStyle: {
              borderWidth: 2,
              borderColor: '#4785ff'
            },
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold'
            }
          }
        }]
      }

      try {
        this.chart.setOption(option, true)
        this.addChartEventListeners()
      } catch (err) {
        console.error('Error rendering chord graph:', err)
      }
    },

    buildAdjacencyMatrix() {
      const size = this.currentNodes.length
      const matrix = Array(size).fill().map(() => Array(size).fill(0))
      
      const nameToIndex = new Map()
      this.currentNodes.forEach((node, index) => {
        nameToIndex.set(node.name, index)
      })

      this.currentLinks.forEach(link => {
        const sourceIndex = nameToIndex.get(link.source)
        const targetIndex = nameToIndex.get(link.target)
        
        if (sourceIndex !== undefined && targetIndex !== undefined) {
          matrix[sourceIndex][targetIndex] = link.value
        }
      })

      return matrix
    },

    getPackageColor(complexity) {
      // 根据复杂度生成颜色: 绿色(低) -> 黄色(中) -> 红色(高)
      const hue = (1 - complexity) * 120 // 120 = 绿色, 0 = 红色
      return `hsl(${hue}, 70%, 60%)`
    },

    addChartEventListeners() {
      // 点击事件: 选择包
      this.chart.on('click', (params) => {
        if (params.componentType === 'series' && params.name) {
          const packageName = params.name
          const packageData = this.fullData.packages.find(p => p.name === packageName)
          
          if (packageData) {
            this.$emit('package-selected', packageData)
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.package-graph-viewer {
  position: relative;
  width: 100%;
  height: 600px;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 600px;
  background: white;
}

.loading-content {
  text-align: center;
}

.loading-content p {
  margin: 0;
  color: #495057;
}

.loading-content small {
  color: #6c757d;
}

.error-state {
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .package-graph-viewer {
    height: 400px;
  }
  
  .loading-state,
  .error-state {
    height: 400px;
  }
}
</style>
