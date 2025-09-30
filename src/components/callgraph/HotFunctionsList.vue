<template>
  <div class="hot-functions-list">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0">
        <i class="bi bi-fire me-2"></i>热点函数分析
      </h4>
      <div class="controls d-flex gap-2">
        <!-- 排序选择 -->
        <select v-model="sortBy" @change="loadHotFunctions" class="form-select form-select-sm">
          <option value="importance">重要性</option>
          <option value="callerCount">调用者数量</option>
          <option value="calleeCount">被调用者数量</option>
        </select>
        <!-- 数量限制 -->
        <select v-model="limit" @change="loadHotFunctions" class="form-select form-select-sm">
          <option value="20">Top 20</option>
          <option value="50">Top 50</option>
          <option value="100">Top 100</option>
        </select>
        <button class="btn btn-sm btn-outline-primary" @click="loadHotFunctions">
          <i class="bi bi-arrow-clockwise me-1"></i>刷新
        </button>
      </div>
    </div>

    <div v-if="loading" class="card">
      <div class="card-body text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-3">加载热点函数数据中...</p>
      </div>
    </div>

    <div v-else-if="functions.length" class="functions-container">
      <!-- 图表视图 -->
      <div class="card mb-4">
        <div class="card-header">
          <h6 class="mb-0"><i class="bi bi-bar-chart me-2"></i>热点函数分布图</h6>
        </div>
        <div class="card-body">
          <div ref="hotFunctionsChart" style="width: 100%; height: 400px;"></div>
        </div>
      </div>

      <!-- 表格视图 -->
      <div class="card">
        <div class="card-header">
          <h6 class="mb-0"><i class="bi bi-table me-2"></i>详细列表</h6>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>函数名</th>
                  <th>包名</th>
                  <th>调用者数量</th>
                  <th>被调用者数量</th>
                  <th>重要性评分</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(func, index) in functions" 
                  :key="func.key"
                  class="function-row"
                  @click="viewFunctionDetail(func)"
                >
                  <td>{{ index + 1 }}</td>
                  <td>
                    <div class="function-name">{{ func.name }}</div>
                    <div class="function-signature">{{ func.signature }}</div>
                  </td>
                  <td>
                    <span class="package-badge">{{ func.package }}</span>
                  </td>
                  <td>
                    <span class="badge bg-primary">{{ func.callerCount }}</span>
                  </td>
                  <td>
                    <span class="badge bg-secondary">{{ func.calleeCount }}</span>
                  </td>
                  <td>
                    <div class="importance-score">
                      <div class="score-bar">
                        <div 
                          class="score-fill" 
                          :style="{ width: (func.importanceScore * 100) + '%' }"
                        ></div>
                      </div>
                      <span class="score-text">{{ func.importanceScore.toFixed(2) }}</span>
                    </div>
                  </td>
                  <td>
                    <button 
                      class="btn btn-sm btn-outline-info"
                      @click.stop="viewFunctionDetail(func)"
                    >
                      <i class="bi bi-info-circle me-1"></i>详情
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card">
      <div class="card-body text-center py-5">
        <i class="bi bi-exclamation-circle text-warning display-4"></i>
        <h5 class="mt-3">暂无热点函数数据</h5>
        <p class="text-muted">当前数据库中没有找到热点函数信息</p>
      </div>
    </div>

    <!-- 函数详情抽屉 -->
    <FunctionDetailDrawer
      :show="showDetailDrawer"
      :function-key="selectedFunctionKey"
      :db-path="dbPath"
      @close="showDetailDrawer = false"
    />
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { staticAnalysisAPI } from '../../config/api'
import FunctionDetailDrawer from './FunctionDetailDrawer.vue'

export default {
  name: 'HotFunctionsList',
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
      functions: [],
      sortBy: 'importance',
      limit: 20,
      chart: null,
      showDetailDrawer: false,
      selectedFunctionKey: ''
    }
  },
  mounted() {
    this.loadHotFunctions()
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.dispose()
    }
  },
  methods: {
    async loadHotFunctions() {
      this.loading = true
      try {
        const data = await staticAnalysisAPI.getHotFunctions(this.limit, this.sortBy)
        this.functions = data.functions || []
        
        this.$nextTick(() => {
          this.initChart()
        })
      } catch (error) {
        console.error('加载热点函数失败:', error)
      } finally {
        this.loading = false
      }
    },

    initChart() {
      if (!this.$refs.hotFunctionsChart || !this.functions.length) return

      if (this.chart) {
        this.chart.dispose()
      }

      this.chart = echarts.init(this.$refs.hotFunctionsChart)
      
      // 取前20个函数用于图表显示，并验证数据完整性
      const chartData = this.functions
        .filter(f => f && f.name && typeof f.importanceScore === 'number')
        .slice(0, 20)

      if (chartData.length === 0) {
        console.warn('No valid function data for chart')
        return
      }
      
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: function(params) {
            const data = params[0]
            return `${data.name}<br/>重要性评分: ${data.value}`
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: chartData.map(f => f.name.length > 20 ? f.name.substring(0, 20) + '...' : f.name),
          axisLabel: {
            rotate: 45,
            fontSize: 10
          }
        },
        yAxis: {
          type: 'value',
          name: '重要性评分'
        },
        series: [
          {
            name: '重要性评分',
            type: 'bar',
            data: chartData.map(f => f.importanceScore),
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#ff6b6b' },
                { offset: 1, color: '#ee5a24' }
              ])
            },
            emphasis: {
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#ff5252' },
                  { offset: 1, color: '#d63031' }
                ])
              }
            }
          }
        ]
      }

      try {
        this.chart.setOption(option)
        
        // 点击图表跳转到详情
        this.chart.on('click', (params) => {
          const func = chartData[params.dataIndex]
          if (func) {
            this.viewFunctionDetail(func)
          }
        })
        
        // 响应式调整
        window.addEventListener('resize', () => {
          this.chart?.resize()
        })
      } catch (error) {
        console.error('Error setting hot functions chart option:', error)
        console.error('Chart data:', chartData)
        
        // 如果图表初始化失败，销毁图表实例
        if (this.chart) {
          this.chart.dispose()
          this.chart = null
        }
      }
    },

    viewFunctionDetail(func) {
      this.selectedFunctionKey = func.key
      this.showDetailDrawer = true
    }
  }
}
</script>

<style scoped>
.controls .form-select {
  width: auto;
  min-width: 120px;
}

.functions-container {
  animation: fadeInUp 0.5s ease-out;
}

.function-row {
  cursor: pointer;
  transition: all 0.2s ease;
}

.function-row:hover {
  background-color: rgba(71, 133, 255, 0.05);
  transform: translateX(2px);
}

.function-name {
  font-weight: 600;
  color: #212529;
  font-size: 0.9rem;
}

.function-signature {
  font-size: 0.75rem;
  color: #6c757d;
  margin-top: 0.25rem;
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

.importance-score {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.score-bar {
  width: 60px;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745 0%, #20c997 50%, #fd7e14 100%);
  transition: width 0.3s ease;
}

.score-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: #495057;
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

.badge {
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
}

.btn {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-outline-info {
  border-color: #17a2b8;
  color: #17a2b8;
}

.btn-outline-info:hover {
  background: #17a2b8;
  border-color: #17a2b8;
  color: white;
  transform: translateY(-1px);
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
  
  .function-signature {
    display: none;
  }
  
  .importance-score {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .score-bar {
    width: 40px;
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
</style>
