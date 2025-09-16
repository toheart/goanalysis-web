import { ref, computed } from 'vue';
import axios from 'axios';
import { ensureAnalysisPath } from '../../../config/api.js';

export function useTraceData(gid, onDataProcessed = null) {
  // 响应式数据
  const traceData = ref([]);
  const flattenedTraceData = ref([]);
  const loading = ref(true);
  const isFetching = ref(false);
  const depth = ref(3);
  
  // 统计数据
  const maxDepth = ref(0);
  const totalTime = ref('0ms');
  const functionCount = ref(0);
  
  // 懒加载相关
  const isLazyLoading = ref(false);
  
  // 计算属性
  const callTreeStats = computed(() => ({
    totalNodes: flattenedTraceData.value.length,
    maxDepth: maxDepth.value,
    functionCount: functionCount.value
  }));
  

  
  // 严格去重数据的方法
  const deduplicateTraceData = () => {
    const originalLength = flattenedTraceData.value.length;
    const uniqueDataMap = new Map();
    
    console.log(`开始数据去重，原始节点数: ${originalLength}`);
    
    for (const node of flattenedTraceData.value) {
      if (!node || !node.id) {
        console.warn('发现无效节点（缺少ID），跳过:', node);
        continue;
      }
      
      // 使用Map确保每个ID只保留一个节点
      if (!uniqueDataMap.has(node.id)) {
        uniqueDataMap.set(node.id, node);
      } else {
        console.warn(`发现重复节点 ${node.id} (${node.name})，已忽略`);
      }
    }
    
    // 将Map转换回数组
    const uniqueData = Array.from(uniqueDataMap.values());
    flattenedTraceData.value = uniqueData;
    
    const duplicateCount = originalLength - uniqueData.length;
    if (duplicateCount > 0) {
      console.log(`去重完成：从 ${originalLength} 个节点减少到 ${uniqueData.length} 个节点，去除了 ${duplicateCount} 个重复节点`);
    } else {
      console.log(`数据检查完成：${uniqueData.length} 个节点，无重复数据`);
    }
  };
  
  // 处理树形数据（重写版本）
  const processTreeData = () => {
    console.log('开始处理树形数据');
    
    // 清空现有数据
    flattenedTraceData.value = [];
    
    if (!traceData.value || !Array.isArray(traceData.value) || traceData.value.length === 0) {
      console.warn('traceData 为空或不是数组，无法处理');
      return;
    }
    
    console.log(`开始处理 ${traceData.value.length} 个原始节点`);
    
    // 使用Map确保数据唯一性
    const nodeMap = new Map();
    let processedCount = 0;
    
    // 第一遍处理：构建唯一节点集合
    for (const rawNode of traceData.value) {
      if (!rawNode || typeof rawNode !== 'object') {
        console.warn('跳过无效节点:', rawNode);
        continue;
      }
      
      // 确保节点有有效的ID并规范化
      const rawNodeId = rawNode.id || `generated_${processedCount}`;
      const nodeId = String(rawNodeId);
      
      // 如果ID已存在，跳过（保留第一个）
      if (nodeMap.has(nodeId)) {
        console.warn(`跳过重复ID节点: ${nodeId}，函数名: ${rawNode.name || '未知'}`);
        continue;
      }
      
      // 创建标准化节点
      const standardNode = {
        id: nodeId,
        name: rawNode.name || '未知函数',
        indent: typeof rawNode.indent === 'number' ? rawNode.indent : 0,
        timeCost: rawNode.timeCost || 'N/A',
        parentId: rawNode.parentId ? String(rawNode.parentId) : '0',
        paramCount: typeof rawNode.paramCount === 'number' ? rawNode.paramCount : 0,
        gid: rawNode.gid || gid.value,
        params: Array.isArray(rawNode.params) ? rawNode.params : [],
        seq: rawNode.seq || '-',
        hasChildren: false,
        mayHaveChildren: (rawNode.indent || 0) < 10,
        loading: false,
        children: []
      };
      
      nodeMap.set(nodeId, standardNode);
      processedCount++;
    }
    
    // 转换为数组
    flattenedTraceData.value = Array.from(nodeMap.values());
    
    console.log(`数据处理完成：处理了 ${processedCount} 个唯一节点，最终数组长度: ${flattenedTraceData.value.length}`);
    
    // 更新统计信息
    updateStatistics();
  };

  
  // 更新统计信息
  const updateStatistics = () => {
    if (!flattenedTraceData.value.length) return;
    
    maxDepth.value = Math.max(...flattenedTraceData.value.map(node => node.indent || 0));
    functionCount.value = flattenedTraceData.value.length;
    
    // 计算总时间（简化版本）
    const times = flattenedTraceData.value
      .map(node => node.timeCost)
      .filter(time => time && time !== 'N/A')
      .map(time => parseFloat(time.replace(/[^\d.]/g, '')))
      .filter(time => !isNaN(time));
    
    if (times.length > 0) {
      totalTime.value = `${Math.max(...times).toFixed(2)}ms`;
    }
  };
  
  // 获取追踪详情数据
  const fetchTraceDetails = async () => {
    if (isFetching.value) {
      console.log('正在获取数据，跳过重复请求');
      return;
    }
    
    try {
      // 确保session中有分析路径
      await ensureAnalysisPath();
      
      isFetching.value = true;
      loading.value = true;
      
      // 清空所有现有数据
      traceData.value = [];
      flattenedTraceData.value = [];
      
      console.log(`开始获取追踪详情，gid: ${gid.value}, depth: ${depth.value}`);
      
      const response = await axios.post(`/api/runtime/traces/${gid.value}`, {
        depth: depth.value
      });
      
      console.log('API响应接收完成');
      
      // 检查响应数据结构（应该包含traceData字段）
      if (response.data && response.data.traceData && Array.isArray(response.data.traceData)) {
        console.log(`API返回 ${response.data.traceData.length} 个原始节点`);
        
        // 对API返回的原始数据进行严格去重
        const uniqueRawDataMap = new Map();
        let rawDuplicateCount = 0;
        
        for (const item of response.data.traceData) {
          if (item && item.id) {
            const normalizedId = String(item.id);
            if (!uniqueRawDataMap.has(normalizedId)) {
              uniqueRawDataMap.set(normalizedId, item);
            } else {
              rawDuplicateCount++;
              console.warn(`API数据中发现重复ID: ${normalizedId}，函数名: ${item.name || '未知'}`);
            }
          } else {
            console.warn('跳过无效或无ID的数据项:', item);
          }
        }
        
        if (rawDuplicateCount > 0) {
          console.warn(`API原始数据去重：去除了 ${rawDuplicateCount} 个重复项`);
        }
        
        const uniqueRawData = Array.from(uniqueRawDataMap.values());
        traceData.value = uniqueRawData;
        console.log(`设置traceData，去重后长度: ${traceData.value.length}`);
        
        // 处理数据
        processTreeData();
        
        console.log(`数据处理完成，flattenedTraceData长度: ${flattenedTraceData.value.length}`);
        
        // 数据处理完成后的回调通知
        if (onDataProcessed && typeof onDataProcessed === 'function') {
          onDataProcessed();
        }
      } else {
        console.warn('API返回的数据格式不正确，期望response.data.traceData是数组');
        console.log('实际响应数据:', response.data);
        traceData.value = [];
      }
    } catch (error) {
      console.error('获取追踪详情失败:', error);
      traceData.value = [];
      flattenedTraceData.value = [];
    } finally {
      loading.value = false;
      isFetching.value = false;
    }
  };
  
  // 重新加载数据
  const reloadData = async () => {
    console.log('重新加载数据');
    await fetchTraceDetails();
  };
  
  return {
    // 数据
    traceData,
    flattenedTraceData,
    loading,
    depth,
    isLazyLoading,
    
    // 统计
    maxDepth,
    totalTime,
    functionCount,
    callTreeStats,
    
    // 方法
    fetchTraceDetails,
    reloadData,
    deduplicateTraceData,
    processTreeData,
    updateStatistics
  };
} 