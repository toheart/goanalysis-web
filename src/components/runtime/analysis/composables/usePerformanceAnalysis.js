import { ref, computed } from 'vue';
import { useRuntimeApi } from '../../shared/composables/useRuntimeApi';
import { createPieChartOption } from '../../shared/utils/chartUtils';

export function usePerformanceAnalysis() {
  const runtimeApi = useRuntimeApi();
  const anomalies = ref([]);
  const threshold = ref(2);
  const stats = ref(null);
  
  // 处理性能统计数据
  const processStats = (rawStats) => {
    if (!rawStats) return null;
    return {
      avgTime: Number(rawStats.avgTime?.toFixed(2)) || 0,
      maxTime: Number(rawStats.maxTime?.toFixed(2)) || 0,
      minTime: Number(rawStats.minTime?.toFixed(2)) || 0,
      totalCalls: rawStats.totalCalls || 0,
      standardDeviation: Number(rawStats.standardDeviation?.toFixed(2)) || 0
    };
  };

  // 计算异常分布图表配置
  const distributionChartOption = computed(() => {
    if (!anomalies.value.length) return null;
    
    const normal = anomalies.value.filter(a => !a.isAnomaly).length;
    const abnormal = anomalies.value.filter(a => a.isAnomaly).length;
    
    const data = [
      { name: '正常调用', value: normal },
      { name: '异常调用', value: abnormal }
    ];
    
    return createPieChartOption(data, '性能异常分布');
  });

  // 加载性能异常数据
  const loadPerformanceData = async (dbPath, functionName) => {
    const [anomalyData, statsData] = await Promise.all([
      runtimeApi.getPerformanceAnomalies(dbPath, functionName, threshold.value),
      runtimeApi.getCallStats(dbPath, functionName)
    ]);
    
    anomalies.value = anomalyData;
    stats.value = processStats(statsData);
  };

  // 更新阈值
  const updateThreshold = async (newThreshold, dbPath, functionName) => {
    threshold.value = newThreshold;
    await loadPerformanceData(dbPath, functionName);
  };

  // 计算异常比例
  const anomalyRatio = computed(() => {
    if (!anomalies.value.length) return 0;
    const abnormal = anomalies.value.filter(a => a.isAnomaly).length;
    return Number((abnormal / anomalies.value.length * 100).toFixed(1));
  });

  return {
    anomalies,
    stats,
    threshold,
    distributionChartOption,
    anomalyRatio,
    loading: runtimeApi.loading,
    error: runtimeApi.error,
    loadPerformanceData,
    updateThreshold
  };
} 