import { ref, computed } from 'vue';
import { useRuntimeApi } from '../../shared/composables/useRuntimeApi';
import { createHotPathChartOption } from '../../shared/utils/chartUtils';

export function useHotPathAnalysis() {
  const runtimeApi = useRuntimeApi();
  const hotPaths = ref([]);
  const analysisMode = ref('time'); // 'time' | 'count'
  const pathLimit = ref(10);
  
  // 处理热点路径数据
  const processHotPaths = (paths) => {
    return paths.map(path => ({
      name: path.path.join(' -> '),
      value: analysisMode.value === 'time' ? path.avgTime : path.callCount
    }));
  };

  // 计算图表配置
  const chartOption = computed(() => {
    const processedData = processHotPaths(hotPaths.value);
    return createHotPathChartOption(processedData, analysisMode.value);
  });

  // 加载热点路径数据
  const loadHotPaths = async (dbPath, functionName) => {
    const paths = await runtimeApi.getHotPaths(dbPath, functionName, pathLimit.value);
    hotPaths.value = paths;
  };

  // 切换分析模式
  const toggleAnalysisMode = () => {
    analysisMode.value = analysisMode.value === 'time' ? 'count' : 'time';
  };

  // 更新路径数量限制
  const updatePathLimit = (limit) => {
    pathLimit.value = limit;
  };

  return {
    hotPaths,
    analysisMode,
    pathLimit,
    chartOption,
    loading: runtimeApi.loading,
    error: runtimeApi.error,
    loadHotPaths,
    toggleAnalysisMode,
    updatePathLimit
  };
} 