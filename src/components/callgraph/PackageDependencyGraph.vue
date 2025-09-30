<template>
  <div class="package-dependency-graph">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0">
        <i class="bi bi-diagram-3 me-2"></i>包依赖关系图
      </h4>
      <div class="controls d-flex gap-2">
        <!-- 图表类型选择 -->
        <select v-model="chartType" @change="renderGraph" class="form-select form-select-sm">
          <option value="force">力导向图</option>
          <option value="circular">环形布局</option>
          <option value="hierarchical">层次布局</option>
          <option value="chord">和弦图</option>
          <option value="sankey">桑基图</option>
        </select>
        
        <!-- 筛选选项 -->
        <select v-model="filterMode" @change="applyFilter" class="form-select form-select-sm">
          <option value="all">显示所有</option>
          <option value="strong">强依赖 (>5调用)</option>
          <option value="weak">弱依赖 (≤5调用)</option>
          <option value="internal">内部包</option>
          <option value="external">外部包</option>
        </select>
        
        <!-- 复杂度阈值 -->
        <div class="input-group input-group-sm" style="width: 200px;">
          <span class="input-group-text">复杂度</span>
          <input 
            type="range" 
            v-model="complexityThreshold" 
            @input="applyFilter"
            min="0" 
            max="1" 
            step="0.1" 
            class="form-range"
          />
          <span class="input-group-text">{{ complexityThreshold }}</span>
        </div>
        
        <button class="btn btn-sm btn-outline-primary" @click="refreshData">
          <i class="bi bi-arrow-clockwise me-1"></i>刷新
        </button>
      </div>
    </div>

    <div v-if="loading" class="card">
      <div class="card-body text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-3">正在加载包依赖数据...</p>
      </div>
    </div>

    <div v-else-if="error" class="card">
      <div class="card-body text-center py-5">
        <i class="bi bi-exclamation-triangle text-warning display-4"></i>
        <h5 class="mt-3">加载失败</h5>
        <p class="text-muted">{{ error }}</p>
        <button class="btn btn-primary" @click="refreshData">
          <i class="bi bi-arrow-clockwise me-2"></i>重新加载
        </button>
      </div>
    </div>

    <div v-else class="graph-container">
      <!-- 图表区域 -->
      <div class="row">
        <div class="col-lg-9">
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">
                <i class="bi bi-graph-up me-2"></i>
                {{ chartTypeNames[chartType] }}
                <span class="badge bg-primary ms-2">{{ filteredNodes.length }} 个包</span>
                <span class="badge bg-secondary ms-1">{{ filteredDependencies.length }} 个依赖</span>
              </h6>
            </div>
            <div class="card-body p-0">
              <div ref="graphChart" style="width: 100%; height: 600px;"></div>
            </div>
          </div>
        </div>
        
        <!-- 侧边栏信息 -->
        <div class="col-lg-3">
          <!-- 选中包的详细信息 -->
          <div v-if="selectedPackage" class="card mb-3">
            <div class="card-header">
              <h6 class="mb-0">
                <i class="bi bi-info-circle me-2"></i>包详情
              </h6>
            </div>
            <div class="card-body">
              <div class="package-info">
                <div class="info-item">
                  <label>包名:</label>
                  <span class="package-name">{{ selectedPackage.name }}</span>
                </div>
                <div class="info-item">
                  <label>函数数量:</label>
                  <span class="metric-value">{{ selectedPackage.functionCount }}</span>
                </div>
                <div class="info-item">
                  <label>内部调用:</label>
                  <span class="metric-value">{{ selectedPackage.internalCallCount }}</span>
                </div>
                <div class="info-item">
                  <label>外部调用:</label>
                  <span class="metric-value">{{ selectedPackage.externalCallCount }}</span>
                </div>
                <div class="info-item">
                  <label>复杂度:</label>
                  <div class="complexity-bar">
                    <div 
                      class="complexity-fill" 
                      :style="{ width: (selectedPackage.complexity * 100) + '%' }"
                    ></div>
                    <span class="complexity-text">{{ selectedPackage.complexity?.toFixed(2) || 0 }}</span>
                  </div>
                </div>
                <div v-if="selectedPackage.subPackages?.length" class="info-item">
                  <label>子包:</label>
                  <div class="sub-packages">
                    <span 
                      v-for="subPkg in selectedPackage.subPackages" 
                      :key="subPkg"
                      class="badge bg-light text-dark me-1 mb-1"
                    >
                      {{ subPkg }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 统计信息 -->
          <div class="card mb-3">
            <div class="card-header">
              <h6 class="mb-0">
                <i class="bi bi-bar-chart me-2"></i>统计信息
              </h6>
            </div>
            <div class="card-body">
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">{{ packageNodes.length }}</div>
                  <div class="stat-label">总包数</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ dependencies.length }}</div>
                  <div class="stat-label">依赖关系</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ strongDependencies }}</div>
                  <div class="stat-label">强依赖</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ avgComplexity.toFixed(2) }}</div>
                  <div class="stat-label">平均复杂度</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 热点包 -->
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">
                <i class="bi bi-fire me-2"></i>热点包 Top 5
              </h6>
            </div>
            <div class="card-body">
              <div class="hot-packages">
                <div 
                  v-for="(pkg, index) in topComplexPackages" 
                  :key="pkg.name"
                  class="hot-package-item"
                  @click="selectPackage(pkg)"
                >
                  <div class="package-rank">{{ index + 1 }}</div>
                  <div class="package-info">
                    <div class="package-name">{{ pkg.name }}</div>
                    <div class="package-metrics">
                      <span class="badge bg-primary">{{ pkg.functionCount }}</span>
                      <span class="complexity-indicator" :style="{ width: (pkg.complexity * 50) + 'px' }"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 包详情弹窗 -->
    <div 
      v-if="showPackageModal" 
      class="modal fade show d-block" 
      style="background: rgba(0,0,0,0.5);"
      @click.self="showPackageModal = false"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ modalPackage?.name }} - 详细信息</h5>
            <button class="btn-close" @click="showPackageModal = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="modalPackage" class="package-details">
              <!-- 依赖关系 -->
              <div class="mb-4">
                <h6>依赖的包 ({{ packageDependsOn.length }})</h6>
                <div class="dependency-list">
                  <span 
                    v-for="dep in packageDependsOn" 
                    :key="dep.targetPackage"
                    class="badge bg-info me-1 mb-1"
                  >
                    {{ dep.targetPackage }} ({{ dep.callCount }})
                  </span>
                </div>
              </div>
              
              <div class="mb-4">
                <h6>被依赖的包 ({{ packageDependedBy.length }})</h6>
                <div class="dependency-list">
                  <span 
                    v-for="dep in packageDependedBy" 
                    :key="dep.sourcePackage"
                    class="badge bg-warning me-1 mb-1"
                  >
                    {{ dep.sourcePackage }} ({{ dep.callCount }})
                  </span>
                </div>
              </div>
              
              <!-- 调用函数 -->
              <div v-if="strongestDependency" class="mb-4">
                <h6>最强依赖: {{ strongestDependency.targetPackage }}</h6>
                <div class="function-list">
                  <span 
                    v-for="func in strongestDependency.callFunctions?.slice(0, 10)" 
                    :key="func"
                    class="badge bg-light text-dark me-1 mb-1"
                  >
                    {{ func }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { staticAnalysisAPI } from '../../config/api'

export default {
  name: 'PackageDependencyGraph',
  props: {
    dbPath: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      loading: false,
      error: null,
      chart: null,
      
      // 数据
      packageNodes: [],
      dependencies: [],
      
      // 控制选项
      chartType: 'force',
      filterMode: 'all',
      complexityThreshold: 0.0,
      
      // 筛选后的数据
      filteredNodes: [],
      filteredDependencies: [],
      
      // 交互状态
      selectedPackage: null,
      showPackageModal: false,
      modalPackage: null,
      
      // UI配置
      chartTypeNames: {
        force: '力导向图',
        circular: '环形布局',
        hierarchical: '层次布局',
        chord: '和弦图',
        sankey: '桑基图'
      }
    }
  },
  computed: {
    strongDependencies() {
      return this.dependencies.filter(dep => dep.callCount > 5).length
    },
    
    avgComplexity() {
      if (!this.packageNodes.length) return 0
      const total = this.packageNodes.reduce((sum, pkg) => sum + (pkg.complexity || 0), 0)
      return total / this.packageNodes.length
    },
    
    topComplexPackages() {
      return [...this.packageNodes]
        .sort((a, b) => (b.complexity || 0) - (a.complexity || 0))
        .slice(0, 5)
    },
    
    packageDependsOn() {
      if (!this.selectedPackage) return []
      return this.dependencies.filter(dep => dep.sourcePackage === this.selectedPackage.name)
    },
    
    packageDependedBy() {
      if (!this.selectedPackage) return []
      return this.dependencies.filter(dep => dep.targetPackage === this.selectedPackage.name)
    },
    
    strongestDependency() {
      if (!this.packageDependsOn.length) return null
      return this.packageDependsOn.reduce((strongest, current) => 
        current.callCount > strongest.callCount ? current : strongest
      )
    }
  },
  mounted() {
    this.loadPackageDependencies()
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.dispose()
    }
  },
  methods: {
    async loadPackageDependencies() {
      this.loading = true
      this.error = null
      
      try {
        const data = await staticAnalysisAPI.getPackageDependencies()
        
        this.packageNodes = data.packages || []
        this.dependencies = data.dependencies || []
        
        this.applyFilter()
        this.renderGraph()
        
      } catch (error) {
        console.error('加载包依赖数据失败:', error)
        this.error = error.message || '加载失败'
      } finally {
        this.loading = false
      }
    },
    
    applyFilter() {
      // 筛选包节点
      this.filteredNodes = this.packageNodes.filter(pkg => {
        // 复杂度筛选
        if ((pkg.complexity || 0) < this.complexityThreshold) return false
        
        // 模式筛选
        switch (this.filterMode) {
          case 'internal':
            return !pkg.name.includes('external') && !pkg.name.includes('vendor')
          case 'external':
            return pkg.name.includes('external') || pkg.name.includes('vendor')
          default:
            return true
        }
      })
      
      // 筛选依赖关系
      this.filteredDependencies = this.dependencies.filter(dep => {
        // 确保源和目标包都在筛选后的节点中
        const hasSourceNode = this.filteredNodes.some(n => n.name === dep.sourcePackage)
        const hasTargetNode = this.filteredNodes.some(n => n.name === dep.targetPackage)
        
        if (!hasSourceNode || !hasTargetNode) return false
        
        // 强度筛选
        switch (this.filterMode) {
          case 'strong':
            return dep.callCount > 5
          case 'weak':
            return dep.callCount <= 5
          default:
            return true
        }
      })
      
      // 如果图表已经渲染，重新渲染
      if (this.chart) {
        this.renderGraph()
      }
    },
    
    renderGraph() {
      if (!this.$refs.graphChart || !this.filteredNodes.length) return
      
      if (this.chart) {
        this.chart.dispose()
      }
      
      this.chart = echarts.init(this.$refs.graphChart)
      
      switch (this.chartType) {
        case 'force':
          this.renderForceGraph()
          break
        case 'circular':
          this.renderCircularGraph()
          break
        case 'chord':
          this.renderChordGraph()
          break
        case 'sankey':
          this.renderSankeyGraph()
          break
        default:
          this.renderForceGraph()
      }
      
      // 响应式调整
      window.addEventListener('resize', () => {
        this.chart?.resize()
      })
    },
    
    renderForceGraph() {
      const nodes = this.filteredNodes.map(pkg => ({
        id: pkg.name,
        name: pkg.name,
        symbolSize: Math.max(20, Math.min(80, pkg.functionCount * 2)),
        itemStyle: {
          color: this.getPackageColor(pkg)
        },
        label: {
          show: true,
          fontSize: 10
        },
        tooltip: {
          formatter: `${pkg.name}<br/>函数: ${pkg.functionCount}<br/>复杂度: ${pkg.complexity?.toFixed(2) || 0}`
        }
      }))
      
      const links = this.filteredDependencies.map(dep => ({
        source: dep.sourcePackage,
        target: dep.targetPackage,
        value: dep.callCount,
        lineStyle: {
          width: Math.max(1, Math.min(8, dep.callCount / 2)),
          opacity: dep.dependencyStrength || 0.6
        }
      }))
      
      const option = {
        title: {
          text: '包依赖关系图',
          top: 10,
          left: 10
        },
        tooltip: {},
        legend: {
          data: ['包节点'],
          bottom: 10
        },
        series: [{
          type: 'graph',
          layout: 'force',
          data: nodes,
          links: links,
          roam: true,
          force: {
            repulsion: 1000,
            edgeLength: 100
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 5
            }
          }
        }]
      }
      
      this.chart.setOption(option)
      this.addChartEventListeners()
    },
    
    renderCircularGraph() {
      // 环形布局实现
      const nodes = this.filteredNodes.map((pkg, index) => {
        const angle = (index / this.filteredNodes.length) * 2 * Math.PI
        const radius = 200
        return {
          id: pkg.name,
          name: pkg.name,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          symbolSize: Math.max(15, Math.min(50, pkg.functionCount)),
          itemStyle: {
            color: this.getPackageColor(pkg)
          },
          label: {
            show: true,
            position: 'right'
          }
        }
      })
      
      const links = this.filteredDependencies.map(dep => ({
        source: dep.sourcePackage,
        target: dep.targetPackage,
        lineStyle: {
          curveness: 0.2,
          width: Math.max(1, dep.callCount / 3)
        }
      }))
      
      const option = {
        series: [{
          type: 'graph',
          layout: 'none',
          data: nodes,
          links: links,
          roam: true,
          emphasis: {
            focus: 'adjacency'
          }
        }]
      }
      
      this.chart.setOption(option)
      this.addChartEventListeners()
    },
    
    renderChordGraph() {
      // 和弦图实现
      const matrix = this.buildAdjacencyMatrix()
      const packageNames = this.filteredNodes.map(pkg => pkg.name)
      
      const option = {
        series: [{
          type: 'chord',
          radius: '60%',
          center: ['50%', '50%'],
          data: packageNames.map((name, index) => ({
            name,
            value: this.filteredNodes[index].functionCount
          })),
          matrix: matrix,
          emphasis: {
            itemStyle: {
              borderWidth: 2
            }
          }
        }]
      }
      
      this.chart.setOption(option)
    },
    
    renderSankeyGraph() {
      // 桑基图实现
      const nodes = this.filteredNodes.map(pkg => ({
        name: pkg.name,
        value: pkg.functionCount
      }))
      
      const links = this.filteredDependencies.map(dep => ({
        source: dep.sourcePackage,
        target: dep.targetPackage,
        value: dep.callCount
      }))
      
      const option = {
        series: [{
          type: 'sankey',
          layout: 'none',
          emphasis: {
            focus: 'adjacency'
          },
          data: nodes,
          links: links,
          lineStyle: {
            color: 'gradient',
            curveness: 0.5
          }
        }]
      }
      
      this.chart.setOption(option)
    },
    
    buildAdjacencyMatrix() {
      const size = this.filteredNodes.length
      const matrix = Array(size).fill().map(() => Array(size).fill(0))
      
      this.filteredDependencies.forEach(dep => {
        const sourceIndex = this.filteredNodes.findIndex(n => n.name === dep.sourcePackage)
        const targetIndex = this.filteredNodes.findIndex(n => n.name === dep.targetPackage)
        
        if (sourceIndex !== -1 && targetIndex !== -1) {
          matrix[sourceIndex][targetIndex] = dep.callCount
        }
      })
      
      return matrix
    },
    
    getPackageColor(pkg) {
      // 根据复杂度生成颜色
      const complexity = pkg.complexity || 0
      const hue = (1 - complexity) * 120 // 从绿色(120)到红色(0)
      return `hsl(${hue}, 70%, 60%)`
    },
    
    addChartEventListeners() {
      this.chart.on('click', (params) => {
        if (params.data && params.data.id) {
          const pkg = this.packageNodes.find(p => p.name === params.data.id)
          if (pkg) {
            this.selectPackage(pkg)
          }
        }
      })
      
      this.chart.on('dblclick', (params) => {
        if (params.data && params.data.id) {
          const pkg = this.packageNodes.find(p => p.name === params.data.id)
          if (pkg) {
            this.showPackageDetails(pkg)
          }
        }
      })
    },
    
    selectPackage(pkg) {
      this.selectedPackage = pkg
    },
    
    showPackageDetails(pkg) {
      this.modalPackage = pkg
      this.selectedPackage = pkg
      this.showPackageModal = true
    },
    
    refreshData() {
      this.loadPackageDependencies()
    }
  }
}
</script>

<style scoped>
.controls .form-select {
  width: auto;
  min-width: 140px;
}

.graph-container {
  animation: fadeInUp 0.5s ease-out;
}

.package-info .info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f1f3f4;
}

.package-info .info-item label {
  font-weight: 600;
  color: #6c757d;
  font-size: 0.875rem;
}

.package-name {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #212529;
  background: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-value {
  font-weight: 600;
  color: #4785ff;
}

.complexity-bar {
  display: flex;
  align-items: center;
  background: #e9ecef;
  border-radius: 10px;
  height: 20px;
  overflow: hidden;
  position: relative;
  min-width: 100px;
}

.complexity-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745 0%, #ffc107 50%, #dc3545 100%);
  transition: width 0.3s ease;
}

.complexity-text {
  position: absolute;
  right: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #495057;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #4785ff;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.8rem;
  color: #6c757d;
  font-weight: 500;
}

.hot-packages {
  max-height: 300px;
  overflow-y: auto;
}

.hot-package-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hot-package-item:hover {
  background: rgba(71, 133, 255, 0.1);
  border-color: #4785ff;
  transform: translateX(4px);
}

.package-rank {
  width: 30px;
  height: 30px;
  background: #4785ff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 0.75rem;
}

.hot-package-item .package-info {
  flex: 1;
}

.hot-package-item .package-name {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  background: transparent;
  padding: 0;
}

.package-metrics {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.complexity-indicator {
  height: 4px;
  background: linear-gradient(90deg, #28a745 0%, #ffc107 50%, #dc3545 100%);
  border-radius: 2px;
  min-width: 20px;
}

.sub-packages {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.dependency-list,
.function-list {
  max-height: 150px;
  overflow-y: auto;
}

.card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.card-header {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 1rem 1.25rem;
}

.card-header h6 {
  color: #495057;
  font-weight: 600;
}

/* 动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    gap: 0.5rem !important;
  }
  
  .controls .form-select {
    width: 100%;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

/* 滚动条美化 */
.hot-packages::-webkit-scrollbar,
.dependency-list::-webkit-scrollbar,
.function-list::-webkit-scrollbar {
  width: 4px;
}

.hot-packages::-webkit-scrollbar-track,
.dependency-list::-webkit-scrollbar-track,
.function-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.hot-packages::-webkit-scrollbar-thumb,
.dependency-list::-webkit-scrollbar-thumb,
.function-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.hot-packages::-webkit-scrollbar-thumb:hover,
.dependency-list::-webkit-scrollbar-thumb:hover,
.function-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
