<template>
  <div class="call-chain-analysis">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">调用链分析</h5>
        <div class="controls">
          <div class="btn-group me-2">
            <button 
              class="btn" 
              :class="viewMode === 'tree' ? 'btn-primary' : 'btn-outline-primary'"
              @click="toggleViewMode"
            >
              树状图
            </button>
            <button 
              class="btn" 
              :class="viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'"
              @click="toggleViewMode"
            >
              表格
            </button>
          </div>
          <button 
            class="btn btn-outline-secondary btn-sm"
            @click="exportToCSV"
            :disabled="!callData.length"
          >
            导出CSV
          </button>
        </div>
      </div>
      
      <div class="card-body">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">加载中...</span>
          </div>
        </div>
        
        <div v-else-if="error" class="alert alert-danger">
          加载调用链数据失败: {{ error.message }}
        </div>
        
        <div v-else-if="!callData.length && !treeData" class="text-center py-5 text-muted">
          暂无调用链数据
        </div>
        
        <template v-else>
          <!-- 树状图视图 -->
          <div v-show="viewMode === 'tree'" class="tree-view">
            <div ref="chartRef" class="chart-container"></div>
          </div>

          <!-- 表格视图 -->
          <div v-show="viewMode === 'table'" class="table-view">
            <div class="table-responsive">
              <table class="table table-sm table-hover">
                <thead>
                  <tr>
                    <th style="width: 30px"></th>
                    <th>调用者</th>
                    <th>被调用者</th>
                    <th class="text-center">调用层级</th>
                    <th class="text-end">调用次数</th>
                    <th class="text-end">平均耗时(ms)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in callData" :key="item.id">
                    <td>
                      <button 
                        v-if="item.children?.length"
                        class="btn btn-link btn-sm p-0"
                        @click="toggleNodeExpand(item.id)"
                      >
                        <i 
                          class="bi" 
                          :class="item.isExpanded ? 'bi-dash-square' : 'bi-plus-square'"
                        ></i>
                      </button>
                    </td>
                    <td>
                      <div class="text-truncate" style="max-width: 300px;" :title="item.caller">
                        {{ item.caller }}
                      </div>
                    </td>
                    <td>
                      <div class="text-truncate" style="max-width: 300px;" :title="item.callee">
                        {{ item.callee }}
                      </div>
                    </td>
                    <td class="text-center">{{ item.level }}</td>
                    <td class="text-end">{{ item.callCount }}</td>
                    <td class="text-end">{{ item.avgTime }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useCallChainAnalysis } from '../composables/useCallChainAnalysis';
import { initChart, handleChartResize, disposeChart } from '../../shared/utils/chartUtils';

export default {
  name: 'CallChainAnalysis',
  
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
      callData,
      treeData,
      viewMode,
      treeChartOption,
      loading,
      error,
      loadCallChainData,
      toggleViewMode,
      toggleNodeExpand,
      exportToCSV
    } = useCallChainAnalysis();

    // 监听属性变化
    watch(
      [() => props.dbPath, () => props.functionName],
      async ([newDbPath, newFunctionName]) => {
        if (newDbPath && newFunctionName) {
          await loadCallChainData(newDbPath, newFunctionName);
        }
      },
      { immediate: true }
    );

    // 监听图表配置变化
    watch(treeChartOption, () => {
      if (chart.value && treeChartOption.value) {
        chart.value.setOption(treeChartOption.value);
      }
    });

    // 监听视图模式变化
    watch(viewMode, () => {
      if (viewMode.value === 'tree' && treeChartOption.value) {
        // 延迟初始化图表，确保容器可见
        setTimeout(() => {
          if (!chart.value) {
            chart.value = initChart(chartRef.value, treeChartOption.value);
          } else {
            handleChartResize(chart.value);
          }
        }, 0);
      }
    });

    // 初始化图表
    onMounted(() => {
      if (viewMode.value === 'tree' && treeChartOption.value) {
        chart.value = initChart(chartRef.value, treeChartOption.value);
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

    return {
      chartRef,
      callData,
      treeData,
      viewMode,
      loading,
      error,
      toggleViewMode,
      toggleNodeExpand,
      exportToCSV
    };
  }
};
</script>

<style scoped>
.call-chain-analysis .chart-container {
  height: 600px;
  width: 100%;
}

.call-chain-analysis .controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.call-chain-analysis .text-truncate {
  display: inline-block;
}
</style> 