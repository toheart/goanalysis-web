import { ref, computed } from 'vue';
import { useRuntimeApi } from '../../shared/composables/useRuntimeApi';

export function useFunctionAnalysis() {
  const runtimeApi = useRuntimeApi();
  const dbPath = ref('');
  const functionName = ref('');
  const activeTab = ref('call-chain'); // 'call-chain' | 'hot-path' | 'performance'
  const functions = ref([]);
  
  // 加载函数列表
  const loadFunctions = async (path) => {
    dbPath.value = path;
    functions.value = await runtimeApi.getFunctions(path);
  };

  // 选择函数
  const selectFunction = (name) => {
    functionName.value = name;
  };

  // 切换活动标签
  const switchTab = (tab) => {
    activeTab.value = tab;
  };

  // 计算当前函数的包路径
  const currentPackage = computed(() => {
    const func = functions.value.find(f => f.name === functionName.value);
    return func?.package || '';
  });

  // 计算函数建议列表
  const functionSuggestions = computed(() => {
    return functions.value.map(f => ({
      name: f.name,
      package: f.package
    }));
  });

  // 重置状态
  const reset = () => {
    functionName.value = '';
    activeTab.value = 'call-chain';
  };

  return {
    dbPath,
    functionName,
    activeTab,
    functions: functionSuggestions,
    currentPackage,
    loading: runtimeApi.loading,
    error: runtimeApi.error,
    loadFunctions,
    selectFunction,
    switchTab,
    reset
  };
} 