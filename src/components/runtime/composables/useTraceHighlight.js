import { ref } from 'vue';
import axios from '../../../axios';

export function useTraceHighlight(flattenedTraceData, expandNode, buildPathToNode, loadChildren, depth = null, progressCallback = null) {
  // 常量定义
  const MAX_RETRY_ATTEMPTS = 5;
  const RETRY_DELAY_BASE = 500;
  const EXPANSION_DELAY = 500;
  const SCROLL_DELAY = 300;
  
  // 响应式数据
  const highlightedFunctionId = ref(null);
  const hasExpandedForHighlight = ref(false);
  
  // 工具函数：标准化ID比较
  const normalizeId = (id) => String(id);
  const isSameId = (id1, id2) => normalizeId(id1) === normalizeId(id2);
  
  // 判断节点是否高亮
  const isHighlighted = (nodeId) => {
    if (!highlightedFunctionId.value || !nodeId) return false;
    return isSameId(nodeId, highlightedFunctionId.value);
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
    
    // 注意：不在这里立即执行高亮逻辑，等待数据加载完成后再执行
  };
  
  // 展开到高亮函数
  const expandToHighlightedFunction = async () => {
    if (!highlightedFunctionId.value || hasExpandedForHighlight.value) {
      console.log('❌ 高亮函数ID为空或已展开过');
      return;
    }
    
    console.log('🔍 开始查找高亮函数:', highlightedFunctionId.value);
    console.log('📊 当前数据节点数量:', flattenedTraceData.value.length);
    console.log('📋 当前数据节点ID列表:', flattenedTraceData.value.slice(0, 10).map(n => n.id));
    
    progressCallback?.('正在查找高亮函数...');
    
    // 首先直接查找高亮节点
    const highlightNode = flattenedTraceData.value.find(
      node => node.id && isSameId(node.id, highlightedFunctionId.value)
    );
    
    if (highlightNode) {
      console.log('✅ 找到目标节点:', highlightNode);
      progressCallback?.('找到目标函数，正在展开路径...');
      
      // 设置标志，防止重复展开
      hasExpandedForHighlight.value = true;
      
      // 构建到高亮节点的完整路径
      const pathToHighlight = buildPathToNode(highlightNode);
      
      // 展开路径中的所有父节点（除了目标节点本身）
      pathToHighlight.slice(0, -1).forEach(parentNode => {
        expandNode(parentNode.id);
      });
      
            // 滚动到高亮节点
      progressCallback?.('展开完成，正在滚动到目标位置...');
      setTimeout(() => {
        scrollToHighlightedNode();
        progressCallback?.('高亮处理完成');
        // 延迟清除提示
        setTimeout(() => {
          progressCallback?.('');
        }, 2000);
      }, SCROLL_DELAY);
      return;
    }
    
    console.log('❌ 在现有数据中未找到目标节点，尝试通过API查找');
    progressCallback?.('未找到目标函数，正在通过API查找...');
    
    // 如果直接查找失败，使用API接口查找函数信息
    await expandToHighlightedFunctionViaAPI();
  };
  
  // 通过API接口展开到高亮函数
  const expandToHighlightedFunctionViaAPI = async () => {
    try {
      const dbPath = localStorage.getItem('verifiedProjectPath');
      const currentGid = getCurrentGidFromURL();
      
      if (!dbPath || !currentGid) {
        console.error('缺少必要参数:', { dbPath, currentGid });
        return;
      }
      
      
      const response = await axios.post('/api/runtime/function/info', {
        dbpath: dbPath,
        gid: currentGid,
        functionId: normalizeId(highlightedFunctionId.value),
        currentDepth: depth?.value || 3 // 使用传入的深度或默认值3
      });
      
      if (response.data && response.data.functionInfo) {
        const functionInfo = response.data.functionInfo;
        
        // 设置标志，防止重复展开
        hasExpandedForHighlight.value = true;
        
        // 根据新的API结构，functionInfo包含id、name、depth和parentIds
        // 如果有父节点信息，需要展开父节点路径
        if (functionInfo.parentIds && functionInfo.parentIds.length > 0) {
          progressCallback?.(`找到 ${functionInfo.parentIds.length} 个父节点，正在逐级展开...`);
          
          // 按深度从浅到深排序父节点（深度越小越先展开）
          const sortedParents = functionInfo.parentIds
            .sort((a, b) => a.depth - b.depth);
          
          
          // 逐级展开父节点
          for (let i = 0; i < sortedParents.length; i++) {
            const parentInfo = sortedParents[i];
            
            // 检查父节点是否在当前数据中存在
            let parentNode = flattenedTraceData.value.find(
              node => node.id && isSameId(node.id, parentInfo.parentId)
            );
            
            if (parentNode) {
              progressCallback?.(`展开第${i + 1}/${sortedParents.length}个父节点: ${parentNode.name}`);
              
              // 先展开节点
              expandNode(parentInfo.parentId);
              
              // 然后加载子节点数据（懒加载）
              if (loadChildren && typeof loadChildren === 'function') {
                progressCallback?.(`加载 ${parentNode.name} 的子节点数据...`);
                await loadChildren(parentNode);
                
                // 重新获取父节点信息，因为loadChildren可能会更新节点状态
                parentNode = flattenedTraceData.value.find(
                  node => node.id && isSameId(node.id, parentInfo.parentId)
                );
              }
              
              // 给每个展开操作一些时间，让UI有时间响应
              await new Promise(resolve => setTimeout(resolve, EXPANSION_DELAY));
            } else {
              // 尝试通过API直接获取这个父节点的信息
              try {
                const parentResponse = await axios.post('/api/runtime/function/info', {
                  dbpath: dbPath,
                  gid: currentGid,
                  functionId: parentInfo.parentId,
                  currentDepth: 1
                });
                
                if (parentResponse.data && parentResponse.data.functionInfo) {
                  const parentFuncInfo = parentResponse.data.functionInfo;
                  
                  // 创建父节点对象并添加到数据中
                  const newParentNode = {
                    id: normalizeId(parentInfo.parentId),
                    name: parentFuncInfo.name || `父函数${parentInfo.depth}`,
                    indent: parentInfo.depth || 0,
                    timeCost: 'N/A',
                    parentId: null, // 根节点
                    paramCount: 0,
                    gid: currentGid,
                    params: [],
                    seq: '-',
                    hasChildren: true,
                    mayHaveChildren: true,
                    loading: false,
                    children: []
                  };
                  
                  // 检查是否已存在
                  const existingNode = flattenedTraceData.value.find(
                    node => node.id && isSameId(node.id, parentInfo.parentId)
                  );
                  
                  if (!existingNode) {
                    flattenedTraceData.value.push(newParentNode);
                    
                    // 展开新添加的父节点
                    expandNode(parentInfo.parentId);
                    
                    // 加载子节点
                    if (loadChildren && typeof loadChildren === 'function') {
                      await loadChildren(newParentNode);
                    }
                  }
                }
              } catch (parentError) {
                console.error(`❌ 获取父节点信息失败:`, parentError);
              }
            }
          }
          
          // 展开完成后，尝试滚动到目标位置
          progressCallback?.('父节点展开完成，正在查找目标函数...');
          
          // 等待一段时间让展开操作完成，然后多次尝试查找目标节点
          const findTargetNode = async (attempt = 1, maxAttempts = MAX_RETRY_ATTEMPTS) => {
            console.log(`🔍 第${attempt}次查找目标节点，当前数据节点数量:`, flattenedTraceData.value.length);
            
            // 重新尝试查找高亮节点
            const targetNode = flattenedTraceData.value.find(
              node => node.id && isSameId(node.id, highlightedFunctionId.value)
            );
            
            if (targetNode) {
              progressCallback?.('找到目标函数，正在滚动到目标位置...');
              scrollToHighlightedNode();
              progressCallback?.('高亮处理完成');
              // 延迟清除提示
              setTimeout(() => {
                progressCallback?.('');
              }, 2000);
              return true;
            } else {
              // 尝试通过API直接获取目标节点信息
              if (attempt === 1) {
                try {
                  console.log(`🔍 尝试通过API直接获取目标节点信息: ${highlightedFunctionId.value}`);
                  const targetResponse = await axios.post('/api/runtime/function/info', {
                    dbpath: dbPath,
                    gid: currentGid,
                    functionId: normalizeId(highlightedFunctionId.value),
                    currentDepth: 1
                  });
                  
                  if (targetResponse.data && targetResponse.data.functionInfo) {
                    const targetFuncInfo = targetResponse.data.functionInfo;
                    console.log(`📋 通过API获取到目标节点信息:`, targetFuncInfo.name);
                    
                    // 创建目标节点对象并添加到数据中
                    const newTargetNode = {
                      id: normalizeId(highlightedFunctionId.value),
                      name: targetFuncInfo.name || `目标函数`,
                      indent: targetFuncInfo.depth || 0,
                      timeCost: 'N/A',
                      parentId: targetFuncInfo.parentIds && targetFuncInfo.parentIds.length > 0 
                        ? normalizeId(targetFuncInfo.parentIds[targetFuncInfo.parentIds.length - 1].parentId) 
                        : null,
                      paramCount: 0,
                      gid: currentGid,
                      params: [],
                      seq: '-',
                      hasChildren: false,
                      mayHaveChildren: false,
                      loading: false,
                      children: []
                    };
                    
                    // 检查是否已存在
                    const existingNode = flattenedTraceData.value.find(
                      node => node.id && isSameId(node.id, highlightedFunctionId.value)
                    );
                    
                    if (!existingNode) {
                      flattenedTraceData.value.push(newTargetNode);
                      console.log(`✅ 添加目标节点到数据中: ${newTargetNode.name}`);
                      
                      // 滚动到目标节点
                      setTimeout(() => {
                        scrollToHighlightedNode();
                        progressCallback?.('高亮处理完成');
                        setTimeout(() => {
                          progressCallback?.('');
                        }, 2000);
                      }, 500);
                      return true;
                    }
                  }
                } catch (targetError) {
                  console.error(`❌ 获取目标节点信息失败:`, targetError);
                }
              }
              
              // 如果仍然找不到，尝试重新加载数据
              if (attempt === 2) {
                progressCallback?.('重新加载数据以查找目标函数...');
                
                try {
                  // 重新获取追踪详情数据
                  const reloadResponse = await axios.post(`/api/runtime/traces/${currentGid}`, {
                    dbpath: dbPath,
                    depth: depth?.value || 5 // 增加深度
                  });
                  
                  if (reloadResponse.data && reloadResponse.data.traceData && Array.isArray(reloadResponse.data.traceData)) {
                    console.log(`🔄 重新加载了 ${reloadResponse.data.traceData.length} 个节点`);
                    
                    // 合并新数据到现有数据中
                    const existingIds = new Set(flattenedTraceData.value.map(node => normalizeId(node.id)));
                    const newNodes = reloadResponse.data.traceData.filter(item => 
                      item && item.id && !existingIds.has(normalizeId(item.id))
                    );
                    
                    if (newNodes.length > 0) {
                      // 标准化新节点
                      const standardizedNewNodes = newNodes.map(item => ({
                        id: normalizeId(item.id),
                        name: item.name || '未知函数',
                        indent: item.indent || 0,
                        timeCost: item.timeCost || 'N/A',
                        parentId: item.parentId ? normalizeId(item.parentId) : null,
                        paramCount: item.paramCount || 0,
                        gid: currentGid,
                        params: item.params || [],
                        seq: item.seq || '-',
                        hasChildren: false,
                        mayHaveChildren: true,
                        loading: false,
                        children: []
                      }));
                      
                      flattenedTraceData.value.push(...standardizedNewNodes);
                      console.log(`✅ 添加了 ${standardizedNewNodes.length} 个新节点`);
                      
                      // 再次尝试查找目标节点
                      const reloadedTargetNode = flattenedTraceData.value.find(
                        node => node.id && isSameId(node.id, highlightedFunctionId.value)
                      );
                      
                      if (reloadedTargetNode) {
                        progressCallback?.('重新加载后找到目标函数，正在滚动到目标位置...');
                        scrollToHighlightedNode();
                        progressCallback?.('高亮处理完成');
                        setTimeout(() => {
                          progressCallback?.('');
                        }, 2000);
                        return true;
                      }
                    }
                  }
                } catch (reloadError) {
                  console.error('❌ 重新加载数据失败:', reloadError);
                }
              }
              
              if (attempt < maxAttempts) {
                // 继续尝试，每次间隔时间递增
                const delay = RETRY_DELAY_BASE * attempt;
                progressCallback?.(`第${attempt}次查找未找到，${delay}ms后进行第${attempt + 1}次查找...`);
                setTimeout(() => findTargetNode(attempt + 1, maxAttempts), delay);
              } else {
                console.warn('❌ 多次查找仍未找到目标节点，可能需要增加调用深度或检查数据加载状态');
                progressCallback?.('多次查找仍未找到目标函数，可能需要增加调用深度');
                // 延迟清除提示
                setTimeout(() => {
                  progressCallback?.('');
                }, 3000);
              }
              return false;
            }
          };
          
          // 开始查找目标节点
          setTimeout(() => findTargetNode(), 1000);
        } else {
          // 如果没有父节点信息，直接尝试查找目标函数
          progressCallback?.('无需展开父节点，直接查找目标函数...');
          
          setTimeout(() => {
            const targetNode = flattenedTraceData.value.find(
              node => node.id && isSameId(node.id, highlightedFunctionId.value)
            );
            
            if (targetNode) {
              progressCallback?.('找到目标函数，正在滚动到目标位置...');
              scrollToHighlightedNode();
              progressCallback?.('高亮处理完成');
              // 延迟清除提示
              setTimeout(() => {
                progressCallback?.('');
              }, 2000);
            } else {
              console.warn('⚠️ 未找到目标节点，可能需要增加调用深度');
              progressCallback?.('未找到目标函数，尝试延迟查找...');
              // 尝试延迟查找
              setTimeout(() => {
                const delayedTargetNode = flattenedTraceData.value.find(
                  node => node.id && isSameId(node.id, highlightedFunctionId.value)
                );
                if (delayedTargetNode) {
                  progressCallback?.('延迟查找成功，正在滚动到目标位置...');
                  scrollToHighlightedNode();
                  progressCallback?.('高亮处理完成');
                  // 延迟清除提示
                  setTimeout(() => {
                    progressCallback?.('');
                  }, 2000);
                } else {
                  progressCallback?.('延迟查找仍未找到目标函数，可能需要增加调用深度');
                  // 延迟清除提示
                  setTimeout(() => {
                    progressCallback?.('');
                  }, 3000);
                }
              }, 1000);
            }
          }, 200);
        }
      } else {
        console.warn('❌ API返回数据格式错误');
      }
    } catch (error) {
      console.error('❌ 调用API查找函数信息失败:', error);
      
      // 设置标志避免重复尝试
      hasExpandedForHighlight.value = true;
    }
  };
  
  // 从URL获取当前的GID
  const getCurrentGidFromURL = () => {
    try {
      const path = window.location.pathname;
      const matches = path.match(/\/trace\/(\d+)/);
      return matches ? matches[1] : null;
    } catch (error) {
      console.error('获取GID失败:', error);
      return null;
    }
  };
  
  // 滚动到高亮节点
  const scrollToHighlightedNode = () => {
    if (!highlightedFunctionId.value) {
      console.warn('scrollToHighlightedNode: highlightedFunctionId为空');
      return;
    }
    
    try {
      const highlightedElement = document.querySelector(`[data-id="${highlightedFunctionId.value}"]`);
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        console.log('📍 成功滚动到高亮节点，ID:', highlightedFunctionId.value);
      } else {
        console.warn('❌ 未找到高亮节点的DOM元素，ID:', highlightedFunctionId.value);
        console.log('📊 页面上所有具有data-id的元素:', 
          Array.from(document.querySelectorAll('[data-id]')).slice(0, 5).map(el => el.getAttribute('data-id')));
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
    expandToHighlightedFunctionViaAPI,
    scrollToHighlightedNode,
    clearHighlight,
    resetHighlightState,
    debugHighlightState,
    getCurrentGidFromURL
  };
} 