import { ref } from 'vue';

export function useTraceHighlight(flattenedTraceData, expandNode, buildPathToNode) {
  // 响应式数据
  const highlightedFunctionId = ref(null);
  const hasExpandedForHighlight = ref(false);
  
  // 判断节点是否高亮
  const isHighlighted = (nodeId) => {
    if (!highlightedFunctionId.value || !nodeId) return false;
    return String(nodeId) === String(highlightedFunctionId.value);
  };
  
  // 从本地存储获取高亮函数ID
  const getHighlightedFunctionId = () => {
    try {
      const storedId = localStorage.getItem('highlightedFunctionId');
      if (storedId && storedId !== 'null' && storedId !== 'undefined') {
        highlightedFunctionId.value = Number(storedId);
        console.log('从本地存储获取高亮函数ID:', highlightedFunctionId.value);
      }
    } catch (error) {
      console.error('获取高亮函数ID失败:', error);
    }
  };
  
  // 设置高亮函数
  const setHighlightedFunction = (functionId) => {
    highlightedFunctionId.value = functionId;
    
    // 保存到本地存储
    if (functionId) {
      localStorage.setItem('highlightedFunctionId', String(functionId));
      console.log('设置高亮函数ID:', functionId);
    } else {
      localStorage.removeItem('highlightedFunctionId');
      console.log('清除高亮函数ID');
    }
    
    // 重置展开标志
    hasExpandedForHighlight.value = false;
    
    // 如果设置了新的高亮函数，尝试展开到该函数
    if (functionId) {
      setTimeout(() => {
        expandToHighlightedFunction();
      }, 100);
    }
  };
  
  // 展开到高亮函数
  const expandToHighlightedFunction = () => {
    if (!highlightedFunctionId.value || hasExpandedForHighlight.value) {
      return;
    }
    
    console.log('🎯 尝试展开到高亮函数:', highlightedFunctionId.value);
    
    // 查找高亮节点
    const highlightNode = flattenedTraceData.value.find(
      node => node.id && String(node.id) === String(highlightedFunctionId.value)
    );
    
    if (!highlightNode) {
      console.warn('❌ 未找到高亮节点:', highlightedFunctionId.value);
      return;
    }
    
    console.log('✅ 找到高亮节点:', highlightNode.name, 'ID:', highlightNode.id);
    
    // 设置标志，防止重复展开
    hasExpandedForHighlight.value = true;
    
    // 构建到高亮节点的完整路径
    const pathToHighlight = buildPathToNode(highlightNode);
    console.log('📍 到高亮节点的路径:', pathToHighlight.map(n => ({ id: n.id, name: n.name })));
    
    // 展开路径中的所有父节点（除了目标节点本身）
    pathToHighlight.slice(0, -1).forEach(parentNode => {
      console.log('🔄 自动展开父节点:', parentNode.name, 'ID:', parentNode.id);
      expandNode(parentNode.id);
    });
    
    // 滚动到高亮节点
    setTimeout(() => {
      scrollToHighlightedNode();
    }, 300);
  };
  
  // 滚动到高亮节点
  const scrollToHighlightedNode = () => {
    if (!highlightedFunctionId.value) return;
    
    try {
      const highlightedElement = document.querySelector(`[data-id="${highlightedFunctionId.value}"]`);
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        console.log('📍 滚动到高亮节点');
      } else {
        console.warn('未找到高亮节点的DOM元素');
      }
    } catch (error) {
      console.error('滚动到高亮节点失败:', error);
    }
  };
  
  // 清除高亮
  const clearHighlight = () => {
    setHighlightedFunction(null);
  };
  
  // 重置高亮状态
  const resetHighlightState = () => {
    console.log('重置高亮状态');
    highlightedFunctionId.value = null;
    hasExpandedForHighlight.value = false;
  };
  
  // 调试高亮状态
  const debugHighlightState = () => {
    if (!highlightedFunctionId.value) {
      console.log('📍 当前没有高亮函数');
      return;
    }
    
    const highlightNode = flattenedTraceData.value.find(
      node => node.id && String(node.id) === String(highlightedFunctionId.value)
    );
    
    console.log('📍 高亮函数ID:', highlightedFunctionId.value);
    console.log('📍 是否找到高亮节点:', !!highlightNode);
    
    if (highlightNode) {
      console.log('📍 高亮节点详情:', {
        id: highlightNode.id,
        name: highlightNode.name,
        indent: highlightNode.indent,
        parentId: highlightNode.parentId
      });
      
      // 检查高亮节点的父节点路径
      const pathToHighlight = buildPathToNode(highlightNode);
      console.log('📍 到高亮节点的路径:', pathToHighlight.map(n => ({ id: n.id, name: n.name })));
    }
    
    console.log('📍 已展开状态:', hasExpandedForHighlight.value);
  };
  
  return {
    // 状态
    highlightedFunctionId,
    hasExpandedForHighlight,
    
    // 方法
    isHighlighted,
    getHighlightedFunctionId,
    setHighlightedFunction,
    expandToHighlightedFunction,
    scrollToHighlightedNode,
    clearHighlight,
    resetHighlightState,
    debugHighlightState
  };
} 