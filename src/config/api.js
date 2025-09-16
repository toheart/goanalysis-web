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