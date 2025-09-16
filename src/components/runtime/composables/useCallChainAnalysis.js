import { ref } from 'vue';
import { ensureAnalysisPath } from '../../../config/api.js';
import axios from '../../../axios';

export function useCallChainAnalysis() {
  // 响应式数据
  const callData = ref([]);
  const treeData = ref([]);
  const viewMode = ref('list');
  const treeChartOption = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // 加载调用链数据
  const loadCallChainData = async (dbPath, functionName) => {
    if (!functionName) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      // 确保session中有分析路径
      await ensureAnalysisPath();

      // 获取父函数调用链
      const response = await axios.post('/api/runtime/functions/parents', {
        functionName: functionName
      });

      if (response.data && response.data.functions) {
        callData.value = response.data.functions;
        // 简单的树形数据转换
        treeData.value = buildTreeData(response.data.functions);
        updateChartOption();
      }
    } catch (err) {
      error.value = err.message || '加载调用链数据失败';
      console.error('加载调用链数据失败:', err);
    } finally {
      loading.value = false;
    }
  };

  // 构建树形数据
  const buildTreeData = (functions) => {
    return functions.map(func => ({
      name: func.name,
      value: func.callCount || 0,
      children: []
    }));
  };

  // 更新图表配置
  const updateChartOption = () => {
    if (treeData.value.length === 0) {
      treeChartOption.value = null;
      return;
    }

    treeChartOption.value = {
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove'
      },
      series: [
        {
          type: 'tree',
          data: treeData.value,
          top: '1%',
          left: '7%',
          bottom: '1%',
          right: '20%',
          symbolSize: 7,
          label: {
            position: 'left',
            verticalAlign: 'middle',
            align: 'right',
            fontSize: 9
          },
          leaves: {
            label: {
              position: 'right',
              verticalAlign: 'middle',
              align: 'left'
            }
          },
          emphasis: {
            focus: 'descendant'
          },
          expandAndCollapse: true,
          animationDuration: 550,
          animationDurationUpdate: 750
        }
      ]
    };
  };

  // 切换视图模式
  const toggleViewMode = () => {
    viewMode.value = viewMode.value === 'list' ? 'tree' : 'list';
  };

  // 切换节点展开状态
  const toggleNodeExpand = (nodeId) => {
    // 简单实现，实际可能需要更复杂的逻辑
    console.log('Toggle node:', nodeId);
  };

  // 导出CSV
  const exportToCSV = () => {
    if (callData.value.length === 0) {
      return;
    }

    const csvContent = [
      ['函数名', '包名', '调用次数', '平均时间'],
      ...callData.value.map(item => [
        item.name || '',
        item.package || '',
        item.callCount || 0,
        item.avgTime || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'call_chain_analysis.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
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
  };
}
