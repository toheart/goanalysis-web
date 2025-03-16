<template>
  <div class="hot-path-analysis">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">热点路径分析</h5>
        <div class="controls">
          <div class="btn-group me-2">
            <button 
              class="btn" 
              :class="analysisMode === 'time' ? 'btn-primary' : 'btn-outline-primary'"
              @click="toggleAnalysisMode"
            >
              执行时间
            </button>
            <button 
              class="btn" 
              :class="analysisMode === 'count' ? 'btn-primary' : 'btn-outline-primary'"
              @click="toggleAnalysisMode"
            >
              调用次数
            </button>
          </div>
          <select 
            class="form-select form-select-sm" 
            v-model="pathLimit"
            @change="onLimitChange"
          >
            <option value="5">Top 5</option>
            <option value="10">Top 10</option>
            <option value="20">Top 20</option>
            <option value="50">Top 50</option>
          </select>
        </div>
      </div>
      
      <div class="card-body">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">加载中...</span>
          </div>
        </div>
        
        <div v-else-if="error" class="alert alert-danger">
          加载热点路径数据失败: {{ error.message }}
        </div>
        
        <div v-else-if="!hotPaths.length" class="text-center py-5 text-muted">
          暂无热点路径数据
        </div>
        
        <div v-else>
          <div ref="chartRef" class="chart-container"></div>
          
          <div class="table-responsive mt-4">
            <table class="table table-sm table-hover">
              <thead>
                <tr>
                  <th>调用路径</th>
                  <th class="text-end">{{ analysisMode === 'time' ? '平均执行时间(ms)' : '调用次数' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="path in hotPaths" :key="path.path.join('')">
                  <td>
                    <small class="text-muted">{{ path.path.join(' -> ') }}</small>
                  </td>
                  <td class="text-end">
                    {{ analysisMode === 'time' ? path.avgTime : path.callCount }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useHotPathAnalysis } from '../composables/useHotPathAnalysis';
import { initChart, handleChartResize, disposeChart } from '../../shared/utils/chartUtils';

export default {
  name: 'HotPathAnalysis',
  
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
      hotPaths,
      analysisMode,
      pathLimit,
      chartOption,
      loading,
      error,
      loadHotPaths,
      toggleAnalysisMode
    } = useHotPathAnalysis();

    // 监听属性变化
    watch(
      [() => props.dbPath, () => props.functionName],
      async ([newDbPath, newFunctionName]) => {
        if (newDbPath && newFunctionName) {
          await loadHotPaths(newDbPath, newFunctionName);
        }
      },
      { immediate: true }
    );

    // 监听图表配置变化
    watch(chartOption, () => {
      if (chart.value) {
        chart.value.setOption(chartOption.value);
      }
    });

    // 初始化图表
    onMounted(() => {
      chart.value = initChart(chartRef.value, chartOption.value);
      window.addEventListener('resize', onResize);
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

    // 处理路径数量限制变化
    const onLimitChange = async () => {
      await loadHotPaths(props.dbPath, props.functionName);
    };

    return {
      chartRef,
      hotPaths,
      analysisMode,
      pathLimit,
      loading,
      error,
      toggleAnalysisMode,
      onLimitChange
    };
  }
};
</script>

<style scoped>
.hot-path-analysis .chart-container {
  height: 400px;
  width: 100%;
}

.hot-path-analysis .form-select {
  width: auto;
}

.hot-path-analysis .controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
</style> 