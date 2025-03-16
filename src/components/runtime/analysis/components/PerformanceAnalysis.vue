<template>
  <div class="performance-analysis">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">性能异常分析</h5>
        <div class="controls">
          <div class="input-group input-group-sm">
            <span class="input-group-text">异常阈值</span>
            <input 
              type="number" 
              class="form-control" 
              v-model.number="threshold"
              min="1.1"
              max="10"
              step="0.1"
              @change="onThresholdChange"
            >
            <span class="input-group-text">倍标准差</span>
          </div>
        </div>
      </div>
      
      <div class="card-body">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">加载中...</span>
          </div>
        </div>
        
        <div v-else-if="error" class="alert alert-danger">
          加载性能异常数据失败: {{ error.message }}
        </div>
        
        <template v-else>
          <!-- 性能统计信息 -->
          <div class="row g-3 mb-4" v-if="stats">
            <div class="col-md-4">
              <div class="card h-100 bg-light">
                <div class="card-body">
                  <h6 class="card-subtitle mb-2 text-muted">调用次数</h6>
                  <p class="card-text h4">{{ stats.totalCalls }}</p>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card h-100 bg-light">
                <div class="card-body">
                  <h6 class="card-subtitle mb-2 text-muted">平均执行时间</h6>
                  <p class="card-text h4">{{ stats.avgTime }}ms</p>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card h-100 bg-light">
                <div class="card-body">
                  <h6 class="card-subtitle mb-2 text-muted">标准差</h6>
                  <p class="card-text h4">{{ stats.standardDeviation }}ms</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!anomalies.length" class="text-center py-5 text-muted">
            暂无性能异常数据
          </div>
          
          <template v-else>
            <!-- 异常分布图表 -->
            <div class="row mb-4">
              <div class="col-md-6">
                <div ref="chartRef" class="chart-container"></div>
              </div>
              <div class="col-md-6 d-flex align-items-center">
                <div class="w-100">
                  <div class="alert" :class="anomalyRatio > 20 ? 'alert-danger' : 'alert-warning'">
                    <h4 class="alert-heading">异常比例: {{ anomalyRatio }}%</h4>
                    <p class="mb-0">
                      {{ anomalyRatio > 20 ? '性能异常比例过高，建议进行优化' : '性能异常比例在可接受范围内' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 异常详情表格 -->
            <div class="table-responsive">
              <table class="table table-sm table-hover">
                <thead>
                  <tr>
                    <th>时间戳</th>
                    <th class="text-end">执行时间(ms)</th>
                    <th class="text-end">偏差倍数</th>
                    <th class="text-center">状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="item in anomalies" 
                    :key="item.timestamp"
                    :class="{ 'table-danger': item.isAnomaly }"
                  >
                    <td>
                      <small>{{ new Date(item.timestamp).toLocaleString() }}</small>
                    </td>
                    <td class="text-end">{{ item.executionTime }}</td>
                    <td class="text-end">{{ item.deviationMultiple?.toFixed(1) }}</td>
                    <td class="text-center">
                      <span 
                        class="badge"
                        :class="item.isAnomaly ? 'bg-danger' : 'bg-success'"
                      >
                        {{ item.isAnomaly ? '异常' : '正常' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { usePerformanceAnalysis } from '../composables/usePerformanceAnalysis';
import { initChart, handleChartResize, disposeChart } from '../../shared/utils/chartUtils';

export default {
  name: 'PerformanceAnalysis',
  
  props: {
    dbPath: {
      type: String,
      required: true
    },
    functionName: {
      type: String,
      required: true
    }
  },
  
  setup(props) {
    const chartRef = ref(null);
    const chart = ref(null);
    
    const {
      anomalies,
      stats,
      threshold,
      distributionChartOption,
      anomalyRatio,
      loading,
      error,
      loadPerformanceData,
      updateThreshold
    } = usePerformanceAnalysis();

    // 监听属性变化
    watch(
      [() => props.dbPath, () => props.functionName],
      async ([newDbPath, newFunctionName]) => {
        if (newDbPath && newFunctionName) {
          await loadPerformanceData(newDbPath, newFunctionName);
        }
      },
      { immediate: true }
    );

    // 监听图表配置变化
    watch(distributionChartOption, () => {
      if (chart.value && distributionChartOption.value) {
        chart.value.setOption(distributionChartOption.value);
      }
    });

    // 初始化图表
    onMounted(() => {
      if (distributionChartOption.value) {
        chart.value = initChart(chartRef.value, distributionChartOption.value);
        window.addEventListener('resize', onResize);
      }
    });

    // 清理图表
    onUnmounted(() => {
      window.removeEventListener('resize', onResize);
      disposeChart(chart.value);
    });

    // 处理窗口大小变化
    const onResize = () => {
      handleChartResize(chart.value);
    };

    // 处理阈值变化
    const onThresholdChange = async () => {
      await updateThreshold(threshold.value, props.dbPath, props.functionName);
    };

    return {
      chartRef,
      anomalies,
      stats,
      threshold,
      anomalyRatio,
      loading,
      error,
      onThresholdChange
    };
  }
};
</script>

<style scoped>
.performance-analysis .chart-container {
  height: 300px;
  width: 100%;
}

.performance-analysis .form-control {
  width: 80px;
}

.performance-analysis .controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
</style> 