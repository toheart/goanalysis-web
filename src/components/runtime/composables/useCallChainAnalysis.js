import { ref, computed } from 'vue';
import { useRuntimeApi } from './useRuntimeApi';
import { createTreeChartOption } from '../utils/chartUtils';

export function useCallChainAnalysis() {
  const runtimeApi = useRuntimeApi();
  const callData = ref([]);
  const treeData = ref(null);
  const viewMode = ref('tree'); // 'tree' | 'table'
  const expandedNodes = ref(new Set());
  
  // 处理调用链数据
  const processCallData = (data) => {
    return data.map(item => ({
      ...item,
      id: `${item.caller}-${item.callee}-${item.level}`,
      isExpanded: expandedNodes.value.has(`${item.caller}-${item.callee}-${item.level}`)
    }));
  };

  // 计算表格数据
  const tableData = computed(() => {
    return processCallData(callData.value);
  });

  // 计算树图配置
  const treeChartOption = computed(() => {
    if (!treeData.value) return null;
    return createTreeChartOption(treeData.value);
  });

  // 加载调用链数据
  const loadCallChainData = async (dbPath, functionName) => {
    const [chainData, tree] = await Promise.all([
      runtimeApi.getFunctionAnalysis(dbPath, functionName),
      runtimeApi.getCallTree(dbPath, functionName)
    ]);
    
    callData.value = chainData;
    treeData.value = tree;
  };

  // 切换视图模式
  const toggleViewMode = () => {
    viewMode.value = viewMode.value === 'tree' ? 'table' : 'tree';
  };

  // 切换节点展开状态
  const toggleNodeExpand = (nodeId) => {
    if (expandedNodes.value.has(nodeId)) {
      expandedNodes.value.delete(nodeId);
    } else {
      expandedNodes.value.add(nodeId);
    }
  };

  // 导出为CSV
  const exportToCSV = () => {
    if (!callData.value.length) return;
    
    const headers = ['调用者', '被调用者', '调用层级', '调用次数', '平均耗时(ms)'];
    const rows = callData.value.map(item => [
      item.caller,
      item.callee,
      item.level,
      item.callCount,
      item.avgTime
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `call_chain_${new Date().getTime()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return {
    callData: tableData,
    treeData,
    viewMode,
    treeChartOption,
    loading: runtimeApi.loading,
    error: runtimeApi.error,
    loadCallChainData,
    toggleViewMode,
    toggleNodeExpand,
    exportToCSV
  };
} 