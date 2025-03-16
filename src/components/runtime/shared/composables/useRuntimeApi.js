import { ref } from 'vue';
import axios from '../../../../axios';

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

  // 获取函数调用分析
  const getFunctionAnalysis = async (dbPath, functionName) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await axios.post('/api/runtime/function/analysis', {
        functionName,
        type: 'caller',
        path: dbPath
      });
      
      return response.data?.callData || [];
    } catch (err) {
      error.value = err;
      console.error('获取函数调用分析失败:', err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  // 获取热点路径
  const getHotPaths = async (dbPath, functionName, limit = 10) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await axios.post('/api/runtime/hot-paths', {
        dbPath,
        functionName,
        limit
      });
      
      return response.data?.paths || [];
    } catch (err) {
      error.value = err;
      console.error('获取热点路径失败:', err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  // 获取调用统计
  const getCallStats = async (dbPath, functionName) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await axios.post('/api/runtime/call-stats', {
        dbPath,
        functionName
      });
      
      return response.data?.stats || [];
    } catch (err) {
      error.value = err;
      console.error('获取调用统计失败:', err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  // 获取性能异常
  const getPerformanceAnomalies = async (dbPath, functionName, threshold = 2) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await axios.post('/api/runtime/performance-anomalies', {
        dbPath,
        functionName,
        threshold
      });
      
      return response.data?.anomalies || [];
    } catch (err) {
      error.value = err;
      console.error('获取性能异常失败:', err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  // 获取调用链树图
  const getCallTree = async (dbPath, functionName) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await axios.post('/api/runtime/tree-graph', {
        dbPath,
        functionName,
        chainType: 'full'
      });
      
      return response.data?.root || null;
    } catch (err) {
      error.value = err;
      console.error('获取调用链树图失败:', err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    getFunctions,
    getFunctionAnalysis,
    getHotPaths,
    getCallStats,
    getPerformanceAnomalies,
    getCallTree
  };
} 