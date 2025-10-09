<template>
  <div class="static-overview">
    <div class="debug-info mb-3 p-2 bg-light border">
      <small>调试信息: dbPath={{ dbPath }}, loading={{ loading }}, topPackages={{ topPackages.length }}, hotFunctions={{ hotFunctions.length }}</small>
    </div>
    
    <!-- 全局统计卡片 -->
    <div class="row mb-4">
      <div class="col-md-3 col-6">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="bi bi-code-square"></i>
          </div>
          <div class="stat-value">{{ stats.totalFunctions || stats.total_functions || 0 }}</div>
          <div class="stat-label">总函数数</div>
        </div>
      </div>
      <div class="col-md-3 col-6">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="bi bi-folder2"></i>
          </div>
          <div class="stat-value">{{ stats.totalPackages || stats.total_packages || 0 }}</div>
          <div class="stat-label">包数量</div>
        </div>
      </div>
      <div class="col-md-3 col-6">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="bi bi-arrow-left-right"></i>
          </div>
          <div class="stat-value">{{ stats.totalEdges || stats.total_edges || 0 }}</div>
          <div class="stat-label">调用关系</div>
        </div>
      </div>
      <div class="col-md-3 col-6">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="bi bi-layers"></i>
          </div>
          <div class="stat-value">{{ stats.maxCallDepth || stats.max_call_depth || 0 }}</div>
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
            <h6 class="mb-0"><i class="bi bi-bar-chart me-2"></i>包统计分布 (Top 10)</h6>
          </div>
          <div class="card-body">
            <div v-if="loading" class="text-center py-3">
              <div class="spinner-border spinner-border-sm" role="status"></div>
              <span class="ms-2">加载中...</span>
            </div>
            <div v-else-if="topPackages.length" class="package-chart">
              <div 
                v-for="pkg in topPackages" 
                :key="pkg.packageName" 
                class="chart-bar-item"
              >
                <div class="bar-label">{{ formatPackageName(pkg.packageName) }}</div>
                <div class="bar-container">
                  <div 
                    class="bar-fill" 
                    :style="{ width: calculateBarWidth(pkg.functionCount) + '%' }"
                    :title="`${pkg.functionCount} 个函数`"
                  >
                    <span class="bar-value">{{ pkg.functionCount }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-muted py-3">
              暂无包统计数据
            </div>
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
            <div v-else-if="normalizedHotFunctions.length" class="hot-functions-list">
              <div 
                v-for="func in normalizedHotFunctions.slice(0, 10)" 
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
import { staticAnalysisAPI } from '../../config/api'

export default {
  name: 'GlobalStatsWidget',
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
      hotFunctions: []
    }
  },
  computed: {
    // 计算 Top 10 包
    topPackages() {
      console.log('Computing topPackages, stats:', this.stats)
      // 兼容蛇形命名和驼峰命名
      const packageStats = this.stats.packageStats || this.stats.package_stats
      console.log('packageStats:', packageStats)
      
      if (!packageStats || !Array.isArray(packageStats)) {
        console.warn('No package stats data available', {
          hasStats: !!this.stats,
          hasPackageStats: !!this.stats.packageStats,
          hasPackage_stats: !!this.stats.package_stats,
          statsKeys: this.stats ? Object.keys(this.stats) : []
        })
        return []
      }
      
      const filtered = packageStats
        .filter(p => {
          // 兼容不同的字段命名
          const pkgName = p.packageName || p.package_name
          const funcCount = p.functionCount ?? p.function_count
          return p && pkgName && typeof funcCount === 'number'
        })
        .map(p => ({
          packageName: p.packageName || p.package_name,
          functionCount: p.functionCount ?? p.function_count
        }))
        .slice(0, 10)
      
      console.log('Filtered top packages:', filtered.length, filtered)
      return filtered
    },
    // 获取最大函数数量用于计算柱状图宽度
    maxFunctionCount() {
      if (this.topPackages.length === 0) return 0
      return Math.max(...this.topPackages.map(p => p.functionCount))
    },
    // 规范化热点函数，兼容蛇形和驼峰命名
    normalizedHotFunctions() {
      return this.hotFunctions.map(func => ({
        key: func.key,
        name: func.name,
        package: func.package,
        callerCount: func.callerCount ?? func.caller_count ?? 0,
        calleeCount: func.calleeCount ?? func.callee_count ?? 0
      }))
    }
  },
  watch: {
    // 监听 dbPath 变化，自动重新加载数据
    dbPath(newPath, oldPath) {
      console.log('GlobalStatsWidget: dbPath changed from', oldPath, 'to', newPath)
      if (newPath && newPath !== oldPath) {
        this.loadOverviewData()
      }
    }
  },
  mounted() {
    console.log('GlobalStatsWidget mounted, dbPath:', this.dbPath)
    if (this.dbPath) {
      this.loadOverviewData()
    } else {
      console.warn('GlobalStatsWidget mounted but no dbPath provided')
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
        
        // 调试日志: 打印统计数据结构
        console.log('Statistics data:', stats)
        console.log('Hot functions data:', hotFunctionsData)
        console.log('Package stats array:', this.stats.packageStats)
        console.log('Top packages computed:', this.topPackages)
        console.log('Max function count:', this.maxFunctionCount)
      } catch (error) {
        console.error('Failed to load overview data:', error)
        // 如果是因为没有设置数据库导致的错误，尝试重新设置数据库
        if (error.response && (error.response.status === 404 || error.response.status === 500)) {
          console.warn('Database may need setup, retrying...')
          await this.retryWithDatabaseSetup()
        }
      } finally {
        this.loading = false
      }
    },

    // 格式化包名（缩短长包名）
    formatPackageName(pkgName) {
      if (!pkgName) return ''
      const parts = pkgName.split('/')
      if (parts.length > 3) {
        return '...' + parts.slice(-2).join('/')
      }
      return pkgName
    },

    // 计算柱状图宽度百分比
    calculateBarWidth(count) {
      if (this.maxFunctionCount === 0) return 0
      return (count / this.maxFunctionCount) * 100
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
        console.error('Failed to retry database setup:', error)
      }
    }
  }
}
</script>

<style scoped>
.static-overview {
  width: 100%;
  min-height: 400px;
}

.debug-info {
  border-radius: 8px;
  font-family: monospace;
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

/* 纯CSS柱状图样式 */
.package-chart {
  max-height: 300px;
  overflow-y: auto;
}

.chart-bar-item {
  margin-bottom: 0.75rem;
}

.bar-label {
  font-size: 0.75rem;
  color: #495057;
  margin-bottom: 0.25rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-container {
  background: #e9ecef;
  border-radius: 6px;
  height: 28px;
  position: relative;
  overflow: hidden;
}

.bar-fill {
  background: linear-gradient(90deg, #4785ff 0%, #2684ff 100%);
  height: 100%;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  transition: width 0.5s ease;
  min-width: 30px;
}

.bar-value {
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.package-chart::-webkit-scrollbar {
  width: 4px;
}

.package-chart::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.package-chart::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.package-chart::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
