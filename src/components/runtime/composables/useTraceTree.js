import { ref, computed } from 'vue';
import axios from 'axios';

export function useTraceTree(flattenedTraceData, gid) {
  // 常量定义
  const MAX_AUTO_EXPAND_CHILDREN = 3;
  const MAX_LAZY_LOAD_DEPTH = 8;
  
  // 树状态管理
  const expandedNodes = ref(new Set());
  
  // 工具函数：标准化ID
  const normalizeId = (id) => String(id);
  const isSameId = (id1, id2) => normalizeId(id1) === normalizeId(id2);
  
  // 获取当前数据库路径
  const getCurrentDbPath = () => {
    return localStorage.getItem('verifiedProjectPath') || '';
  };
  
  // 计算属性：处理后的追踪数据（简化版本）
  const processedTraceData = computed(() => {
    return buildVisibleNodes();
  });
  
  // 构建可见节点列表（重写版本）
  const buildVisibleNodes = () => {
    if (!flattenedTraceData.value || flattenedTraceData.value.length === 0) {
      return [];
    }
    
    // 严格去重：使用Map确保每个ID只出现一次
    const uniqueNodeMap = new Map();
    flattenedTraceData.value.forEach(node => {
      if (node?.id) {
        const nodeId = normalizeId(node.id);
        if (!uniqueNodeMap.has(nodeId)) {
          uniqueNodeMap.set(nodeId, {
            ...node,
            id: nodeId,
            parentId: node.parentId ? normalizeId(node.parentId) : null,
            indent: node.indent || 0,
            hasChildren: false // 重置，稍后计算
          });
        }
      }
    });
    
    const allNodes = Array.from(uniqueNodeMap.values());
    
    // 计算每个节点是否有子节点
    allNodes.forEach(node => {
      const directChildren = allNodes.filter(child => 
        isSameId(child.parentId, node.id)
      );
      
      // 如果已经有直接子节点，设置 hasChildren 为 true
      if (directChildren.length > 0) {
        node.hasChildren = true;
        node.mayHaveChildren = false;
      } 
      // 如果没有直接子节点但可能有（基于缩进级别），保持 mayHaveChildren 为 true
      else if (node.mayHaveChildren !== false) {
        node.hasChildren = false;
        node.mayHaveChildren = (node.indent || 0) < MAX_LAZY_LOAD_DEPTH;
      } 
      // 否则没有子节点
      else {
        node.hasChildren = false;
        node.mayHaveChildren = false;
      }
    });
    
    // 构建正确的树形结构顺序
    const visibleNodes = [];
    
    // 获取所有根节点 - 修复根节点识别逻辑
    const rootNodes = allNodes.filter(node => {
      // 检查是否为根节点：parentId为空、'0'、或找不到对应的父节点
      const isRoot = !node.parentId || 
                     node.parentId === '0' || 
                     !allNodes.some(parent => parent.id === node.parentId);
      return isRoot;
    });
    
    console.log(`📊 节点统计: 总数=${allNodes.length}, 根节点=${rootNodes.length}`);
    
    // 递归添加节点及其可见的子节点
    const addNodeAndVisibleChildren = (node) => {
      visibleNodes.push(node);
      
      // 如果节点已展开，添加其直接子节点
      if (expandedNodes.value.has(node.id)) {
        const children = allNodes.filter(child => 
          isSameId(child.parentId, node.id)
        );
        
        // 按seq排序子节点，保持时间顺序
        children.sort((a, b) => {
          const seqA = parseFloat(a.seq) || 0;
          const seqB = parseFloat(b.seq) || 0;
          return seqA - seqB;
        });
        
        children.forEach(child => {
          addNodeAndVisibleChildren(child);
        });
      }
    };
    
    // 从根节点开始构建可见节点列表
    rootNodes.sort((a, b) => {
      const seqA = parseFloat(a.seq) || 0;
      const seqB = parseFloat(b.seq) || 0;
      return seqA - seqB;
    });
    
    rootNodes.forEach(rootNode => {
      addNodeAndVisibleChildren(rootNode);
    });
    
    console.log(`📋 可见节点: ${visibleNodes.length} 个`);
    
    return visibleNodes;
  };
  
  // 切换节点展开/折叠状态
  const toggleNode = async (nodeId) => {
    if (!nodeId) {
      console.warn('toggleNode: nodeId为空');
      return;
    }
    
    const normalizedNodeId = normalizeId(nodeId);
    const isExpanded = expandedNodes.value.has(normalizedNodeId);
    
    if (isExpanded) {
      // 折叠：移除节点和所有子孙节点
      collapseNodeAndDescendants(normalizedNodeId);
    } else {
      // 查找节点
      const node = flattenedTraceData.value.find(n => n && isSameId(n.id, normalizedNodeId));
      
      if (node) {
        // 如果节点可能有子节点但还没有加载，先加载
        if (node.mayHaveChildren && !node.hasChildren) {
          await loadChildren(node);
        } else {
          // 直接展开节点
          expandedNodes.value.add(normalizedNodeId);
        }
      }
    }
  };
  
  // 折叠节点及其所有子孙节点
  const collapseNodeAndDescendants = (nodeId) => {
    // 移除当前节点
    expandedNodes.value.delete(nodeId);
    
    // 查找并递归折叠所有子节点
    if (flattenedTraceData.value) {
      const children = flattenedTraceData.value.filter(node => 
        node?.parentId && isSameId(node.parentId, nodeId)
      );
      
      children.forEach(child => {
        if (child.id) {
          collapseNodeAndDescendants(normalizeId(child.id));
        }
      });
    }
  };
  
  // 展开节点（为兼容性保留）
  const expandNode = (nodeId) => {
    if (!nodeId) return;
    const normalizedNodeId = normalizeId(nodeId);
    expandedNodes.value.add(normalizedNodeId);
  };
  
  // 折叠节点（为兼容性保留）
  const collapseNode = (nodeId) => {
    if (!nodeId) return;
    collapseNodeAndDescendants(normalizeId(nodeId));
  };
  
  // 展开所有节点
  const expandAll = () => {
    if (flattenedTraceData.value) {
      flattenedTraceData.value.forEach(node => {
        if (node?.id && node.hasChildren) {
          expandedNodes.value.add(normalizeId(node.id));
        }
      });
    }
  };
  
  // 折叠所有节点
  const collapseAll = () => {
    expandedNodes.value.clear();
  };
  
  // 清空状态
  const clearState = () => {
    expandedNodes.value.clear();
  };
  
  // 初始化节点状态（智能自动展开版本）
  const initializeNodeStates = () => {
    console.log('🚀 初始化节点状态（智能自动展开模式）');
    
    // 清空状态
    clearState();
    
    if (!flattenedTraceData.value || flattenedTraceData.value.length === 0) {
      console.log('📋 无数据，初始化完成');
      return;
    }
    
    // 自动展开前几层节点，让用户看到基本的调用层次
    const rootNodes = flattenedTraceData.value.filter(node => {
      const isRoot = !node.parentId || 
                     node.parentId === '0' || 
                     !flattenedTraceData.value.some(parent => parent.id === node.parentId);
      return isRoot;
    });
    
    // 自动展开根节点和第一层子节点
    rootNodes.forEach(rootNode => {
      if (rootNode.hasChildren) {
        expandedNodes.value.add(rootNode.id);
        console.log(`🔓 自动展开根节点: ${rootNode.name}`);
        
        // 找到第一层子节点并展开
        const firstLevelChildren = flattenedTraceData.value.filter(node => 
          node.parentId === rootNode.id && node.hasChildren
        );
        
        firstLevelChildren.slice(0, MAX_AUTO_EXPAND_CHILDREN).forEach(child => {
          expandedNodes.value.add(child.id);
          console.log(`🔓 自动展开第一层子节点: ${child.name}`);
        });
      }
    });
    
  };
  
  // 构建路径（简化版本）
  const buildPathToNode = (targetNode) => {
    if (!targetNode) return [];
    
    const path = [targetNode];
    let currentNode = targetNode;
    
    while (currentNode.parentId && currentNode.parentId !== '0') {
      const parentNode = flattenedTraceData.value?.find(
        node => node && isSameId(node.id, currentNode.parentId)
      );
      
      if (parentNode) {
        path.unshift(parentNode);
        currentNode = parentNode;
      } else {
        break;
      }
    }
    
    return path;
  };
  
  // 加载子节点（实现真正的懒加载）
  const loadChildren = async (parentNode) => {
    if (!parentNode || !parentNode.id) {
      console.warn('loadChildren: 无效的父节点');
      return;
    }
    
    const dbPath = getCurrentDbPath();
    if (!dbPath) {
      console.error('数据库路径未设置');
      return;
    }
    
    try {
      // 设置加载状态
      parentNode.loading = true;
      
      console.log(`🔄 加载 ${parentNode.name} 的子节点...`);
      
      // 调用API获取子节点数据
      const response = await axios.post('/api/runtime/functions/children', {
        parentId: parseInt(parentNode.id),
        dbpath: dbPath
      });
      
      if (response.data && response.data.functions && Array.isArray(response.data.functions)) {
        const childrenData = response.data.functions;
        console.log(`📦 获取到 ${childrenData.length} 个子节点`);
        
        // 标准化子节点数据
        const standardizedChildren = childrenData.map(child => ({
          id: normalizeId(child.id),
          name: child.name || '未知函数',
          indent: child.depth || ((parentNode.indent || 0) + 1),
          timeCost: child.timeCost || child.avgTime || 'N/A',
          parentId: normalizeId(parentNode.id),
          paramCount: child.paramCount || 0,
          gid: gid.value,
          params: [],
          seq: child.seq || '-',
          hasChildren: false, // 会在buildVisibleNodes中重新计算
          mayHaveChildren: true,
          loading: false,
          children: []
        }));
        
        // 合并到现有数据中，避免重复
        const existingIds = new Set(flattenedTraceData.value.map(node => normalizeId(node.id)));
        const newChildren = standardizedChildren.filter(child => !existingIds.has(normalizeId(child.id)));
        
        if (newChildren.length > 0) {
          flattenedTraceData.value.push(...newChildren);
          console.log(`✅ 添加 ${newChildren.length} 个新节点到 flattenedTraceData`);
          
          // 更新父节点的子节点状态
          parentNode.hasChildren = true;
          parentNode.mayHaveChildren = false;
        } else {
          console.log(`📋 所有子节点已存在，无需添加新节点`);
        }
        
        // 展开当前节点
        expandedNodes.value.add(normalizeId(parentNode.id));
        
        // 如果子节点数量为0，更新父节点状态
        if (childrenData.length === 0) {
          parentNode.hasChildren = false;
          parentNode.mayHaveChildren = false;
          console.log(`📋 父节点 ${parentNode.name} 没有子节点`);
        }
        
      } else {
        console.warn('API返回的数据格式不正确');
        console.log('实际返回数据:', response.data);
        parentNode.hasChildren = false;
        parentNode.mayHaveChildren = false;
      }
      
    } catch (error) {
      console.error('加载子节点失败:', error);
      console.error('错误详情:', error.response?.data || error.message);
      parentNode.hasChildren = false;
      parentNode.mayHaveChildren = false;
    } finally {
      // 清除加载状态
      parentNode.loading = false;
    }
  };
  
  return {
    // 状态
    expandedNodes,
    processedTraceData,
    
    // 方法
    toggleNode,
    expandNode,
    collapseNode,
    expandAll,
    collapseAll,
    clearState,
    initializeNodeStates,
    buildPathToNode,
    loadChildren,
    buildVisibleNodeList: buildVisibleNodes, // 兼容性别名
    
    // 空的状态（为兼容性保留）
    nodeChildrenMap: ref(new Map()),
    nodeStates: ref(new Map())
  };
} 