import axios from '../axios.js';

/**
 * Session管理API
 */
export const sessionAPI = {
  // 清除session
  async clearSession() {
    const response = await axios.delete('/api/session');
    return response.data;
  }
};

/**
 * 静态分析API
 * 注意：根据OpenAPI规范，这些API不需要dbPath参数，
 * 应该是基于session中已设置的分析路径进行操作
 * 
 * 在调用这些API之前，需要确保已经通过 analyzeDbFile 设置了当前的分析数据库
 */
export const staticAnalysisAPI = {
  // 获取全局统计信息
  async getGlobalStatistics() {
    const response = await axios.get('/api/static/viz/statistics');
    return response.data;
  },

  // 获取热点函数
  async getHotFunctions(limit = 50, sortBy = 'importance') {
    const response = await axios.get('/api/static/viz/hotfunctions', {
      params: { limit, sortBy }
    });
    return response.data;
  },

  // 搜索函数
  async searchFunctions(query) {
    const response = await axios.post('/api/static/search-functions', {
      query
    });
    return response.data;
  },

  // 获取函数详情
  async getFunctionDetails(functionKey) {
    const response = await axios.get(`/api/static/viz/function/${encodeURIComponent(functionKey)}`);
    return response.data;
  },

  // 获取调用图
  async getCallGraph(rootFunction, maxDepth = 5, includeExternal = false) {
    const response = await axios.post('/api/static/viz/callgraph', {
      rootFunction,
      maxDepth,
      includeExternal
    });
    return response.data;
  },

  // 获取函数调用路径
  async getFunctionCallPaths(fromFunction, toFunction, maxPaths = 10, maxDepth = 10) {
    const response = await axios.post('/api/static/viz/callpaths', {
      fromFunction,
      toFunction,
      maxPaths,
      maxDepth
    });
    return response.data;
  },

  // 获取包依赖关系
  async getPackageDependencies() {
    const response = await axios.get('/api/static/viz/packages');
    return response.data;
  },

  // 分析数据库文件 (现有API) - 设置当前分析数据库
  async analyzeDbFile(dbPath) {
    const response = await axios.post('/api/static/analyze', {
      dbPath
    });
    return response.data;
  },

  // 检查当前session是否有有效的数据库设置
  async checkSession() {
    try {
      // 尝试获取统计信息来验证session是否有效
      await this.getGlobalStatistics();
      return true;
    } catch (error) {
      console.warn('Session invalid or no database set:', error);
      return false;
    }
  },

  // 获取静态分析数据库文件列表
  async getStaticDbFiles() {
    const response = await axios.get('/api/static/dbfiles');
    return response.data;
  },

  // 获取 Init 函数列表
  async getInitFunctions(limit, packageFilter) {
    const params = {};
    if (limit) params.limit = limit;
    // 符合后端 proto 定义的蛇形参数名
    if (packageFilter) params.package_filter = packageFilter;
    
    const response = await axios.get('/api/static/viz/initfunctions', { params });
    return response.data;
  },

  // 分析项目路径 - 启动静态分析任务
  async analyzeProjectPath(projectPath, algo = 'cha', ignoreMethod = false) {
    const response = await axios.post('/api/static/analyze/path', {
      path: projectPath,           // 字段名必须是 path
      algo: algo,
      ignore_method: ignoreMethod ? 'true' : ''  // 使用蛇形命名，类型是字符串
    });
    return response.data;
  },

  // 获取分析任务状态
  async getAnalysisTaskStatus(taskId) {
    const response = await axios.get(`/api/static/task/${taskId}/status`);
    return response.data;
  },

  // 创建SSE连接获取实时分析进度
  createAnalysisEventSource(taskId) {
    const baseURL = axios.defaults.baseURL || '';
    const url = `${baseURL}/api/static/analysis/${taskId}`;
    console.log('Creating EventSource for:', url);
    return new EventSource(url);
  }
};

// 缓存分析路径状态，避免重复调用
let sessionPathCache = null;
let sessionCheckPromise = null;
let isInitialized = false;

/**
 * 确保有分析路径
 * 从localStorage获取路径，session由后端的verify/path接口管理
 */
export async function ensureAnalysisPath() {
  // 如果已经初始化过且有缓存的路径，直接返回
  if (isInitialized && sessionPathCache) {
    console.log('💾 使用缓存的分析路径:', sessionPathCache);
    return sessionPathCache;
  }

  // 如果正在检查路径，等待结果
  if (sessionCheckPromise) {
    console.log('⏳ 等待现有的路径检查完成...');
    return await sessionCheckPromise;
  }

  // 开始检查路径（全局只执行一次）
  console.log('🚀 开始初始化分析路径...');
  sessionCheckPromise = (async () => {
    // 从localStorage获取路径
    const localPath = localStorage.getItem('verifiedProjectPath');
    if (localPath) {
      console.log('✅ 从localStorage获取到路径:', localPath);
      sessionPathCache = localPath;
      isInitialized = true;
      return sessionPathCache;
    }

    throw new Error('未找到有效的分析路径');
  })();

  try {
    const result = await sessionCheckPromise;
    console.log('🎉 分析路径初始化完成:', result);
    return result;
  } catch (error) {
    // 如果失败，重置状态允许重试
    isInitialized = false;
    sessionPathCache = null;
    throw error;
  } finally {
    // 清除promise，但保留缓存和初始化状态
    sessionCheckPromise = null;
  }
}

/**
 * 清除分析路径缓存
 * 在路径变更时调用
 */
export function clearSessionPathCache() {
  console.log('🗑️ 清除分析路径缓存');
  sessionPathCache = null;
  sessionCheckPromise = null;
  isInitialized = false;
}

/**
 * 手动更新分析路径缓存
 * 在已知路径变更时调用，避免重复检查
 */
export function updateSessionCache(path) {
  console.log('💾 手动更新分析路径缓存:', path);
  sessionPathCache = path;
  isInitialized = true;
  sessionCheckPromise = null;
}