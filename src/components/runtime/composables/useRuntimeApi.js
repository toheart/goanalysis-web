import { ref } from 'vue';
import axios from '../../../axios';

export function useRuntimeApi() {
  const loading = ref(false);
  const error = ref(null);

  // 获取函数列表
  const getFunctions = async (dbPath) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await axios.post('/api/runtime/functions', {
        dbpath: dbPath,
        includePackage: true
      });
      
      if (response.data?.functions) {
        return response.data.functions;
      } else if (response.data?.functionNames) {
        return response.data.functionNames.map(name => ({
          name,
          package: ''
        }));
      }
      return [];
    } catch (err) {
      error.value = err;
      console.error('获取函数列表失败:', err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  // 获取module列表
  const getModuleNames = async (dbPath, maxSamples = 100) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await axios.post('/api/runtime/modules', {
        dbpath: dbPath,
        maxSamples: maxSamples
      });
      
      return response.data?.moduleNames || [];
    } catch (err) {
      error.value = err;
      console.error('获取module列表失败:', err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  // 获取调用统计数据
  const getCallStats = async (dbPath, functionName) => {
    try {
      loading.value = true;
      error.value = null;
      const response = await axios.post('/api/runtime/function/stats', {
        dbPath: dbPath,
        functionName: functionName
      });
      return response.data.stats || null;
    } catch (err) {
      error.value = err;
      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    getFunctions,
    getModuleNames,
    getCallStats
  };
} 