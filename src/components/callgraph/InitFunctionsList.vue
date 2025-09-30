<template>
  <div class="init-functions-list">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0">
        <i class="bi bi-play-circle me-2"></i>Init 函数分析
      </h4>
      <div class="controls d-flex gap-2">
        <!-- 包过滤 -->
        <div class="input-group input-group-sm" style="width: 250px;">
          <span class="input-group-text">
            <i class="bi bi-funnel"></i>
          </span>
          <input
            type="text"
            v-model="packageFilter"
            @input="applyFilter"
            class="form-control"
            placeholder="过滤包名..."
          />
        </div>
        
        <!-- 数量限制 -->
        <select v-model="limit" @change="loadInitFunctions" class="form-select form-select-sm">
          <option value="50">显示 50 个</option>
          <option value="100">显示 100 个</option>
          <option value="200">显示 200 个</option>
          <option value="0">显示全部</option>
        </select>
        
        <!-- 视图切换 -->
        <div class="btn-group btn-group-sm" role="group">
          <input type="radio" class="btn-check" name="viewMode" id="listView" v-model="viewMode" value="list">
          <label class="btn btn-outline-primary" for="listView">
            <i class="bi bi-list"></i> 列表
          </label>
          
          <input type="radio" class="btn-check" name="viewMode" id="treeView" v-model="viewMode" value="tree">
          <label class="btn btn-outline-primary" for="treeView">
            <i class="bi bi-diagram-2"></i> 依赖树
          </label>
          
          <input type="radio" class="btn-check" name="viewMode" id="chartView" v-model="viewMode" value="chart">
          <label class="btn btn-outline-primary" for="chartView">
            <i class="bi bi-bar-chart"></i> 图表
          </label>
        </div>
        
        <button class="btn btn-sm btn-outline-primary" @click="loadInitFunctions">
          <i class="bi bi-arrow-clockwise me-1"></i>刷新
        </button>
      </div>
    </div>

    <div v-if="loading" class="card">
      <div class="card-body text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-3">正在加载 Init 函数数据...</p>
      </div>
    </div>

    <div v-else-if="error" class="card">
      <div class="card-body text-center py-5">
        <i class="bi bi-exclamation-triangle text-warning display-4"></i>
        <h5 class="mt-3">加载失败</h5>
        <p class="text-muted">{{ error }}</p>
        <button class="btn btn-primary" @click="loadInitFunctions">
          <i class="bi bi-arrow-clockwise me-2"></i>重新加载
        </button>
      </div>
    </div>

    <div v-else class="content-area">
      <!-- 统计信息 -->
      <div class="row mb-4">
        <div class="col-md-3">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="bi bi-play-circle"></i>
            </div>
            <div class="stat-value">{{ initFunctions.length }}</div>
            <div class="stat-label">Init 函数总数</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="bi bi-folder2"></i>
            </div>
            <div class="stat-value">{{ uniquePackages.length }}</div>
            <div class="stat-label">涉及包数</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="bi bi-eye"></i>
            </div>
            <div class="stat-value">{{ filteredFunctions.length }}</div>
            <div class="stat-label">当前显示</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="bi bi-sort-numeric-down"></i>
            </div>
            <div class="stat-value">{{ maxExecutionOrder }}</div>
            <div class="stat-label">最大执行层级</div>
          </div>
        </div>
      </div>

      <!-- 列表视图 -->
      <div v-if="viewMode === 'list'" class="list-view">
        <div class="card">
          <div class="card-header">
            <h6 class="mb-0">
              <i class="bi bi-list me-2"></i>Init 函数列表
              <span class="badge bg-primary ms-2">{{ filteredFunctions.length }} 个函数</span>
            </h6>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>执行顺序</th>
                    <th>函数名</th>
                    <th>包名</th>
                    <th>位置</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="func in filteredFunctions" 
                    :key="func.key"
                    class="function-row"
                    @click="viewFunctionDetail(func)"
                  >
                    <td>
                      <span class="execution-order" :class="getOrderClass(func.executionOrder)">
                        {{ func.executionOrder || '?' }}
                      </span>
                    </td>
                    <td>
                      <div class="function-info">
                        <div class="function-name">{{ func.name }}</div>
                        <div v-if="func.fullName !== func.name" class="function-full-name">
                          {{ func.fullName }}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="package-badge">{{ func.package }}</span>
                    </td>
                    <td>
                      <div v-if="func.position" class="position-info">
                        <div class="file-name">{{ getFileName(func.position.filename) }}</div>
                        <div class="line-numbers">{{ func.position.startLine }}-{{ func.position.endLine }}</div>
                      </div>
                      <span v-else class="text-muted">未知</span>
                    </td>
                    <td>
                      <button 
                        class="btn btn-sm btn-outline-info me-1"
                        @click.stop="viewFunctionDetail(func)"
                      >
                        <i class="bi bi-info-circle me-1"></i>详情
                      </button>
                      <button 
                        class="btn btn-sm btn-outline-primary"
                        @click.stop="showFunctionSource(func)"
                        v-if="func.position"
                      >
                        <i class="bi bi-code me-1"></i>源码
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- 依赖树视图 -->
      <div v-else-if="viewMode === 'tree'" class="tree-view">
        <div class="card">
          <div class="card-header">
            <h6 class="mb-0">
              <i class="bi bi-diagram-2 me-2"></i>Init 函数执行依赖树
            </h6>
          </div>
          <div class="card-body">
            <div ref="dependencyTree" style="width: 100%; height: 500px;"></div>
          </div>
        </div>
      </div>

      <!-- 图表视图 -->
      <div v-else-if="viewMode === 'chart'" class="chart-view">
        <div class="row">
          <div class="col-lg-8">
            <div class="card">
              <div class="card-header">
                <h6 class="mb-0">
                  <i class="bi bi-bar-chart me-2"></i>按包分组统计
                </h6>
              </div>
              <div class="card-body">
                <div ref="packageChart" style="width: 100%; height: 400px;"></div>
              </div>
            </div>
          </div>
          <div class="col-lg-4">
            <div class="card">
              <div class="card-header">
                <h6 class="mb-0">
                  <i class="bi bi-pie-chart me-2"></i>执行层级分布
                </h6>
              </div>
              <div class="card-body">
                <div ref="orderChart" style="width: 100%; height: 400px;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 包分组视图 -->
      <div class="packages-group mt-4">
        <div class="card">
          <div class="card-header">
            <h6 class="mb-0">
              <i class="bi bi-collection me-2"></i>按包分组
            </h6>
          </div>
          <div class="card-body">
            <div class="package-groups">
              <div 
                v-for="(functions, packageName) in groupedByPackage" 
                :key="packageName"
                class="package-group"
              >
                <div class="package-header" @click="togglePackage(packageName)">
                  <i :class="expandedPackages.has(packageName) ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
                  <span class="package-name">{{ packageName }}</span>
                  <span class="badge bg-secondary ms-2">{{ functions.length }}</span>
                </div>
                <div v-show="expandedPackages.has(packageName)" class="package-functions">
                  <div 
                    v-for="func in functions" 
                    :key="func.key"
                    class="function-item"
                    @click="viewFunctionDetail(func)"
                  >
                    <div class="function-details">
                      <span class="function-name">{{ func.name }}</span>
                      <span v-if="func.position" class="function-location">
                        {{ getFileName(func.position.filename) }}:{{ func.position.startLine }}
                      </span>
                    </div>
                    <div class="function-actions">
                      <span class="execution-order" :class="getOrderClass(func.executionOrder)">
                        {{ func.executionOrder || '?' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 函数详情抽屉 -->
    <FunctionDetailDrawer
      :show="showDetailDrawer"
      :function-key="selectedFunctionKey"
      :db-path="dbPath"
      @close="showDetailDrawer = false"
    />

    <!-- 源码查看弹窗 -->
    <div 
      v-if="showSourceModal" 
      class="modal fade show d-block" 
      style="background: rgba(0,0,0,0.5);"
      @click.self="showSourceModal = false"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ modalFunction?.name }} - 源码位置</h5>
            <button class="btn-close" @click="showSourceModal = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="modalFunction?.position" class="source-info">
              <div class="alert alert-info">
                <strong>文件位置：</strong> {{ modalFunction.position.filename }}<br>
                <strong>行号范围：</strong> {{ modalFunction.position.startLine }} - {{ modalFunction.position.endLine }}
              </div>
              <div v-if="modalFunction.signature" class="mb-3">
                <h6>函数签名:</h6>
                <pre class="bg-light p-3 rounded"><code>{{ modalFunction.signature }}</code></pre>
              </div>
              <div v-if="modalFunction.doc" class="mb-3">
                <h6>文档说明:</h6>
                <pre class="bg-light p-3 rounded">{{ modalFunction.doc }}</pre>
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
import FunctionDetailDrawer from './FunctionDetailDrawer.vue'

export default {
  name: 'InitFunctionsList',
  components: {
    FunctionDetailDrawer
  },
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
      initFunctions: [],
      filteredFunctions: [],
      packageFilter: '',
      limit: 50,
      viewMode: 'list',
      
      // 图表实例
      dependencyChart: null,
      packageChart: null,
      orderChart: null,
      
      // 交互状态
      showDetailDrawer: false,
      selectedFunctionKey: '',
      showSourceModal: false,
      modalFunction: null,
      
      // 包分组状态
      expandedPackages: new Set()
    }
  },
  computed: {
    uniquePackages() {
      return [...new Set(this.initFunctions.map(f => f.package))]
    },
    
    maxExecutionOrder() {
      return Math.max(...this.initFunctions.map(f => f.executionOrder || 0), 0)
    },
    
    groupedByPackage() {
      const groups = {}
      this.filteredFunctions.forEach(func => {
        if (!groups[func.package]) {
          groups[func.package] = []
        }
        groups[func.package].push(func)
      })
      
      // 按执行顺序排序每个包内的函数
      Object.keys(groups).forEach(pkg => {
        groups[pkg].sort((a, b) => (a.executionOrder || 999) - (b.executionOrder || 999))
      })
      
      return groups
    }
  },
  mounted() {
    this.loadInitFunctions()
  },
  beforeUnmount() {
    this.disposeCharts()
  },
  watch: {
    viewMode(newMode) {
      this.$nextTick(() => {
        if (newMode === 'tree') {
          this.initDependencyTree()
        } else if (newMode === 'chart') {
          this.initCharts()
        }
      })
    }
  },
  methods: {
    async loadInitFunctions() {
      this.loading = true
      this.error = null
      
      try {
        const data = await staticAnalysisAPI.getInitFunctions(this.limit || undefined, this.packageFilter)
        
        // 添加执行顺序推测
        this.initFunctions = this.calculateExecutionOrder(data.initFunctions || [])
        this.applyFilter()
        
      } catch (error) {
        console.error('加载 Init 函数失败:', error)
        this.error = error.message || '加载失败'
      } finally {
        this.loading = false
      }
    },
    
    calculateExecutionOrder(functions) {
      // 简单的执行顺序推测：基于包名的字典序和依赖关系
      return functions.map((func, index) => ({
        ...func,
        executionOrder: this.estimateExecutionOrder(func, index)
      })).sort((a, b) => a.executionOrder - b.executionOrder)
    },
    
    estimateExecutionOrder(func, index) {
      // 基于包名推测执行顺序
      // main 包通常最后执行
      if (func.package.includes('main')) return 1000 + index
      
      // 标准库通常最先执行
      if (func.package.startsWith('std') || !func.package.includes('.')) return index
      
      // 第三方库次之
      if (func.package.includes('github.com') || func.package.includes('vendor')) return 100 + index
      
      // 项目内部包
      return 500 + index
    },
    
    applyFilter() {
      this.filteredFunctions = this.initFunctions.filter(func => {
        if (this.packageFilter && !func.package.toLowerCase().includes(this.packageFilter.toLowerCase())) {
          return false
        }
        return true
      })
    },
    
    getOrderClass(order) {
      if (!order) return 'order-unknown'
      if (order < 100) return 'order-early'
      if (order < 500) return 'order-middle'
      return 'order-late'
    },
    
    getFileName(filepath) {
      if (!filepath) return ''
      return filepath.split('/').pop()
    },
    
    viewFunctionDetail(func) {
      this.selectedFunctionKey = func.key
      this.showDetailDrawer = true
    },
    
    showFunctionSource(func) {
      this.modalFunction = func
      this.showSourceModal = true
    },
    
    togglePackage(packageName) {
      if (this.expandedPackages.has(packageName)) {
        this.expandedPackages.delete(packageName)
      } else {
        this.expandedPackages.add(packageName)
      }
    },
    
    initDependencyTree() {
      if (!this.$refs.dependencyTree) return
      
      this.dependencyChart = echarts.init(this.$refs.dependencyTree)
      
      const nodes = this.filteredFunctions.map(func => ({
        id: func.key,
        name: func.name,
        category: this.getCategoryByOrder(func.executionOrder),
        symbolSize: 30,
        label: {
          show: true
        }
      }))
      
      const categories = [
        { name: '早期初始化' },
        { name: '中期初始化' },
        { name: '后期初始化' },
        { name: '未知顺序' }
      ]
      
      const option = {
        title: {
          text: 'Init 函数依赖关系',
          top: 10,
          left: 10
        },
        legend: {
          data: categories.map(c => c.name),
          bottom: 10
        },
        series: [{
          type: 'graph',
          layout: 'force',
          data: nodes,
          categories: categories,
          roam: true,
          force: {
            repulsion: 1000
          }
        }]
      }
      
      this.dependencyChart.setOption(option)
    },
    
    initCharts() {
      this.initPackageChart()
      this.initOrderChart()
    },
    
    initPackageChart() {
      if (!this.$refs.packageChart) return
      
      this.packageChart = echarts.init(this.$refs.packageChart)
      
      const packageCounts = {}
      this.filteredFunctions.forEach(func => {
        packageCounts[func.package] = (packageCounts[func.package] || 0) + 1
      })
      
      const data = Object.entries(packageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
      
      const option = {
        title: {
          text: 'Init 函数包分布',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        xAxis: {
          type: 'category',
          data: data.map(d => d[0]),
          axisLabel: {
            rotate: 45
          }
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          type: 'bar',
          data: data.map(d => d[1]),
          itemStyle: {
            color: '#4785ff'
          }
        }]
      }
      
      this.packageChart.setOption(option)
    },
    
    initOrderChart() {
      if (!this.$refs.orderChart) return
      
      this.orderChart = echarts.init(this.$refs.orderChart)
      
      const orderCounts = {}
      this.filteredFunctions.forEach(func => {
        const category = this.getCategoryByOrder(func.executionOrder)
        orderCounts[category] = (orderCounts[category] || 0) + 1
      })
      
      const data = Object.entries(orderCounts).map(([name, value]) => ({ name, value }))
      
      const option = {
        title: {
          text: '执行层级分布',
          left: 'center'
        },
        tooltip: {
          trigger: 'item'
        },
        series: [{
          type: 'pie',
          radius: '70%',
          data: data,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }]
      }
      
      this.orderChart.setOption(option)
    },
    
    getCategoryByOrder(order) {
      if (!order) return '未知顺序'
      if (order < 100) return '早期初始化'
      if (order < 500) return '中期初始化'
      return '后期初始化'
    },
    
    disposeCharts() {
      if (this.dependencyChart) {
        this.dependencyChart.dispose()
        this.dependencyChart = null
      }
      if (this.packageChart) {
        this.packageChart.dispose()
        this.packageChart = null
      }
      if (this.orderChart) {
        this.orderChart.dispose()
        this.orderChart = null
      }
    }
  }
}
</script>

<style scoped>
.controls .form-select,
.controls .form-control {
  min-width: 120px;
}

.stat-card {
  text-align: center;
  padding: 1.5rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  height: 100%;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 2.5rem;
  color: #4785ff;
  margin-bottom: 0.75rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #212529;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6c757d;
  font-weight: 500;
}

.function-row {
  cursor: pointer;
  transition: all 0.2s ease;
}

.function-row:hover {
  background-color: rgba(71, 133, 255, 0.05);
  transform: translateX(2px);
}

.execution-order {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.8rem;
}

.order-early {
  background: #d4edda;
  color: #155724;
}

.order-middle {
  background: #fff3cd;
  color: #856404;
}

.order-late {
  background: #f8d7da;
  color: #721c24;
}

.order-unknown {
  background: #e2e3e5;
  color: #6c757d;
}

.function-name {
  font-weight: 600;
  color: #212529;
  font-size: 0.9rem;
}

.function-full-name {
  font-size: 0.75rem;
  color: #6c757d;
  font-family: 'Courier New', monospace;
}

.package-badge {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #1565c0;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.position-info .file-name {
  font-weight: 600;
  color: #212529;
  font-size: 0.8rem;
}

.position-info .line-numbers {
  font-size: 0.75rem;
  color: #4785ff;
  font-family: 'Courier New', monospace;
}

.package-group {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow: hidden;
}

.package-header {
  padding: 1rem;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.package-header:hover {
  background: #e9ecef;
}

.package-name {
  font-weight: 600;
  color: #212529;
  flex: 1;
}

.package-functions {
  padding: 0.5rem;
}

.function-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.function-item:hover {
  background: rgba(71, 133, 255, 0.05);
  border-color: #4785ff;
}

.function-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.function-details .function-name {
  font-size: 0.875rem;
}

.function-location {
  font-size: 0.75rem;
  color: #6c757d;
  font-family: 'Courier New', monospace;
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

.table thead th {
  background: linear-gradient(135deg, #4785ff 0%, #2684ff 100%);
  color: white;
  border: none;
  font-weight: 600;
  padding: 1rem;
  font-size: 0.875rem;
}

.table tbody td {
  padding: 1rem;
  vertical-align: middle;
  border-bottom: 1px solid #f1f3f4;
}

.btn {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    gap: 0.5rem !important;
  }
  
  .controls .form-select,
  .controls .form-control {
    width: 100%;
  }
  
  .function-full-name {
    display: none;
  }
  
  .btn-group-sm .btn {
    padding: 0.375rem 0.5rem;
    font-size: 0.775rem;
  }
}

/* 表格响应式 */
.table-responsive {
  border-radius: 8px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-responsive::-webkit-scrollbar {
  height: 6px;
}

.table-responsive::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.table-responsive::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.table-responsive::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
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

.content-area {
  animation: fadeInUp 0.5s ease-out;
}
</style>
