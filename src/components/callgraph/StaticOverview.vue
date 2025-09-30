<template>
  <div class="static-overview">
    <!-- 全局统计卡片 -->
    <div class="row mb-4">
      <div class="col-md-3 col-6">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="bi bi-code-square"></i>
          </div>
          <div class="stat-value">{{ stats.totalFunctions || 0 }}</div>
          <div class="stat-label">总函数数</div>
        </div>
      </div>
      <div class="col-md-3 col-6">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="bi bi-folder2"></i>
          </div>
          <div class="stat-value">{{ stats.totalPackages || 0 }}</div>
          <div class="stat-label">包数量</div>
        </div>
      </div>
      <div class="col-md-3 col-6">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="bi bi-arrow-left-right"></i>
          </div>
          <div class="stat-value">{{ stats.totalEdges || 0 }}</div>
          <div class="stat-label">调用关系</div>
        </div>
      </div>
      <div class="col-md-3 col-6">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="bi bi-layers"></i>
          </div>
          <div class="stat-value">{{ stats.maxCallDepth || 0 }}</div>
          <div class="stat-label">最大调用深度</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="row">
      <!-- 包统计图表 -->
      <div class="col-lg-6 mb-4">
        <div class="card">
          <div class="card-header">
            <h6 class="mb-0"><i class="bi bi-bar-chart me-2"></i>包统计分布</h6>
          </div>
          <div class="card-body">
            <div ref="packageChart" style="width: 100%; height: 300px;"></div>
          </div>
        </div>
      </div>

      <!-- 热点函数概览 -->
      <div class="col-lg-6 mb-4">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0"><i class="bi bi-fire me-2"></i>热点函数 Top 10</h6>
            <button class="btn btn-sm btn-outline-primary" @click="$emit('view-hot-functions')">
              查看全部
            </button>
          </div>
          <div class="card-body">
            <div v-if="loading" class="text-center py-3">
              <div class="spinner-border spinner-border-sm" role="status"></div>
              <span class="ms-2">加载中...</span>
            </div>
            <div v-else-if="hotFunctions.length" class="hot-functions-list">
              <div 
                v-for="func in hotFunctions.slice(0, 10)" 
                :key="func.key" 
                class="function-item d-flex justify-content-between align-items-center"
                @click="$emit('view-function-detail', func)"
              >
                <div class="function-info">
                  <div class="function-name">{{ func.name }}</div>
                  <div class="function-package">{{ func.package }}</div>
                </div>
                <div class="function-stats">
                  <span class="badge bg-primary me-1">{{ func.callerCount }}</span>
                  <span class="badge bg-secondary">{{ func.calleeCount }}</span>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-muted py-3">
              暂无热点函数数据
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
  name: 'StaticOverview',
  props: {
    dbPath: {
      type: String,
      required: true
    }
  },
  emits: ['view-hot-functions', 'view-function-detail', 'database-setup-needed'],
  data() {
    return {
      loading: false,
      stats: {},
      hotFunctions: [],
      packageChart: null
    }
  },
  mounted() {
    this.loadOverviewData()
  },
  beforeUnmount() {
    if (this.packageChart) {
      this.packageChart.dispose()
    }
  },
  methods: {
    async loadOverviewData() {
      this.loading = true
      try {
        // 并行获取统计信息和热点函数
        const [stats, hotFunctionsData] = await Promise.all([
          staticAnalysisAPI.getGlobalStatistics(),
          staticAnalysisAPI.getHotFunctions(10, 'importance')
        ])

        this.stats = stats
        this.hotFunctions = hotFunctionsData.functions || []
        
        // 调试：打印统计数据结构
        console.log('Statistics data:', stats)
        console.log('Hot functions data:', hotFunctionsData)
        
        this.$nextTick(() => {
          this.initPackageChart()
        })
      } catch (error) {
        console.error('加载概览数据失败:', error)
        // 如果是因为没有设置数据库导致的错误，尝试重新设置数据库
        if (error.response && (error.response.status === 404 || error.response.status === 500)) {
          console.warn('可能需要先设置分析数据库，尝试重新设置...')
          await this.retryWithDatabaseSetup()
        }
      } finally {
        this.loading = false
      }
    },

    initPackageChart() {
      if (!this.$refs.packageChart) return

      // 检查数据是否存在且为数组
      if (!this.stats.packageStats || !Array.isArray(this.stats.packageStats) || this.stats.packageStats.length === 0) {
        console.warn('Package stats data is not available or empty')
        return
      }

      this.packageChart = echarts.init(this.$refs.packageChart)
      
      // 安全地处理数据，确保每个包统计对象都有必要的属性
      const validPackageStats = this.stats.packageStats
        .filter(p => p && p.packageName && typeof p.functionCount === 'number')
        .slice(0, 10)

      if (validPackageStats.length === 0) {
        console.warn('No valid package stats data found')
        return
      }

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: validPackageStats.map(p => p.packageName),
          axisLabel: {
            rotate: 45,
            fontSize: 10
          }
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '函数数量',
            type: 'bar',
            data: validPackageStats.map(p => p.functionCount),
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#4785ff' },
                { offset: 1, color: '#2684ff' }
              ])
            }
          }
        ]
      }

      try {
        this.packageChart.setOption(option)
        
        // 响应式调整
        window.addEventListener('resize', () => {
          this.packageChart?.resize()
        })
      } catch (error) {
        console.error('Error setting chart option:', error)
        console.error('Chart data:', validPackageStats)
        
        // 如果图表初始化失败，销毁图表实例
        if (this.packageChart) {
          this.packageChart.dispose()
          this.packageChart = null
        }
      }
    },

    async retryWithDatabaseSetup() {
      try {
        // 通知父组件重新设置数据库
        this.$emit('database-setup-needed')
        
        // 等待一小段时间后重试
        setTimeout(() => {
          this.loadOverviewData()
        }, 1000)
      } catch (error) {
        console.error('重试设置数据库失败:', error)
      }
    }
  }
}
</script>

<style scoped>
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

.hot-functions-list {
  max-height: 300px;
  overflow-y: auto;
}

.function-item {
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s ease;
}

.function-item:hover {
  background: rgba(71, 133, 255, 0.1);
  transform: translateX(4px);
}

.function-name {
  font-weight: 600;
  color: #212529;
  font-size: 0.875rem;
}

.function-package {
  font-size: 0.75rem;
  color: #6c757d;
  margin-top: 0.25rem;
}

.function-stats {
  display: flex;
  gap: 0.25rem;
}

.badge {
  font-size: 0.7rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stat-card {
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  .stat-icon {
    font-size: 2rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
  
  .function-name {
    font-size: 0.8rem;
  }
  
  .function-package {
    font-size: 0.7rem;
  }
}

/* 滚动条美化 */
.hot-functions-list::-webkit-scrollbar {
  width: 4px;
}

.hot-functions-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.hot-functions-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.hot-functions-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
