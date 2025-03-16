<template>
  <div class="call-chain-analysis">
    <!-- 分析功能按钮组 -->
    <div class="mb-3 d-flex justify-content-between align-items-center">
      <div class="btn-group">
        <button class="btn" :class="{'btn-primary': viewMode === 'table', 'btn-outline-primary': viewMode !== 'table'}" @click="viewMode = 'table'">
          <i class="bi bi-table me-1"></i> 表格视图
        </button>
        <button class="btn" :class="{'btn-primary': viewMode === 'tree', 'btn-outline-primary': viewMode !== 'tree'}" @click="viewMode = 'tree'">
          <i class="bi bi-diagram-3 me-1"></i> 树状图
        </button>
      </div>
    </div>

    <!-- 表格视图 -->
    <div v-if="viewMode === 'table'" class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="bi bi-arrow-down-square"></i>
          调用链分析: <code>{{ functionName }}</code>
        </h5>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-primary" @click="exportToCSV">
            <i class="bi bi-download me-1"></i> 导出数据
          </button>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover table-striped mb-0">
            <thead class="table-light">
              <tr>
                <th>函数名称</th>
                <th>包路径</th>
                <th class="text-center">调用层级</th>
                <th class="text-center">调用次数</th>
                <th class="text-center">平均耗时</th>
                <th class="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in flattenedCallData" :key="item.id" :class="{'table-primary': item.name === functionName}">
                <td>
                  <div class="d-flex align-items-center">
                    <span v-if="item.level > 0" :style="{ marginLeft: (item.level * 20) + 'px' }">
                      <i class="bi bi-arrow-return-right me-2 text-muted"></i>
                    </span>
                    <code class="function-name">{{ item.name }}</code>
                  </div>
                </td>
                <td><small class="text-muted">{{ item.package }}</small></td>
                <td class="text-center">{{ item.level }}</td>
                <td class="text-center">
                  <span class="badge bg-primary">{{ item.callCount || 0 }}</span>
                </td>
                <td class="text-center">{{ item.avgTime || 'N/A' }}</td>
                <td class="text-center">
                  <button v-if="item.name !== functionName" 
                          class="btn btn-sm btn-outline-info"
                          @click="$emit('search', item.name)">
                    <i class="bi bi-search me-1"></i> 搜索
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 树状图 -->
    <div v-else class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="bi bi-diagram-3"></i>
          函数调用链树状图: <code>{{ functionName }}</code>
        </h5>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-primary" @click="refreshTreeChart">
            <i class="bi bi-arrow-clockwise me-1"></i> 刷新图表
          </button>
        </div>
      </div>
      <div class="card-body">
        <div ref="treeChartRef" class="tree-chart-container"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useCallChainAnalysis } from '../composables/useCallChainAnalysis';

export default {
  name: 'CallChainAnalysis',
  props: {
    functionName: {
      type: String,
      required: true
    },
    callData: {
      type: Array,
      required: true
    }
  },
  emits: ['search'],
  setup(props) {
    const viewMode = ref('table');
    const treeChartRef = ref(null);
    const treeChart = ref(null);
    
    const {
      flattenedCallData,
      exportToCSV,
      initTreeChart,
      refreshTreeChart
    } = useCallChainAnalysis(props.functionName, props.callData);

    // 监听视图模式变化
    watch(viewMode, (newMode) => {
      if (newMode === 'tree') {
        initTreeChart(treeChartRef.value, treeChart);
      }
    });

    // 监听窗口大小变化
    const handleResize = () => {
      if (treeChart.value) {
        treeChart.value.resize();
      }
    };

    onMounted(() => {
      window.addEventListener('resize', handleResize);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
      if (treeChart.value) {
        treeChart.value.dispose();
      }
    });

    return {
      viewMode,
      treeChartRef,
      flattenedCallData,
      exportToCSV,
      refreshTreeChart
    };
  }
};
</script>

<style scoped>
.tree-chart-container {
  width: 100%;
  height: 600px;
  margin: 0 auto;
}

.function-name {
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: 500;
}

.table td {
  vertical-align: middle;
}

.table-primary {
  --bs-table-bg: rgba(13, 110, 253, 0.1);
}
</style> 