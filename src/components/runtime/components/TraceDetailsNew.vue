<template>
  <div class="trace-details container mt-5">
    <!-- 检查是否有已验证的项目路径 -->
    <div v-if="!hasVerifiedPath" class="text-center">
      <div class="alert alert-warning" role="alert">
        <h4 class="alert-heading mb-3">
          <i class="bi bi-exclamation-triangle me-2"></i>未设置项目路径
        </h4>
        <p>请先在主页设置项目路径后再查看追踪详情。</p>
        <hr>
        <p class="mb-0">
          <router-link to="/allgids" class="btn btn-primary">
            <i class="bi bi-arrow-left me-1"></i>返回主页设置项目
          </router-link>
        </p>
      </div>
    </div>

    <!-- 原有内容，当有项目路径时显示 -->
    <div v-else>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="page-title">GID: {{ gid }} 的调用详情</h1>
        <button @click="$router.go(-1)" class="btn btn-secondary">
          <i class="bi bi-arrow-left me-1"></i>返回
        </button>
      </div>
      
      <!-- 高亮处理状态提示 -->
      <div v-if="isHighlighting" class="alert alert-info alert-dismissible fade show mb-3" role="alert">
        <div class="d-flex align-items-center">
          <div class="spinner-border spinner-border-sm me-2" role="status">
            <span class="visually-hidden">处理中...</span>
          </div>
          <span>{{ highlightProgress }}</span>
        </div>
        <button type="button" class="btn-close" @click="stopHighlighting" aria-label="关闭"></button>
      </div>
      
      <!-- 查询控制面板 -->
      <TraceControls
        v-model:depth="depth"
        :loading="loading"
        :is-lazy-loading="isLazyLoading"
        :call-tree-stats="callTreeStats"
        :visible-nodes="processedTraceData.length"
        :expanded-nodes="expandedNodes.size"
        :is-processing="isProcessing"
        @reload-data="reloadData"
        @expand-all="expandAll"
        @collapse-all="collapseAll"
      />
      
      <!-- 主要内容区域 -->
      <div class="row">
        <div class="col-12">
          <div class="card trace-content-card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">
                <i class="bi bi-list-nested me-2"></i>调用链详情
              </h5>
              <small class="text-muted">
                显示节点: {{ processedTraceData.length }}
              </small>
            </div>
            
            <div class="card-body p-0">
              <!-- 加载状态 -->
              <div v-if="loading" class="text-center p-5">
                <div class="d-flex flex-column align-items-center">
                  <div class="spinner-border text-primary mb-3" role="status"></div>
                  <p class="text-muted mb-0">正在加载调用链数据...</p>
                </div>
              </div>
              
              <!-- 无数据状态 -->
              <div v-else-if="!processedTraceData || processedTraceData.length === 0" 
                   class="text-center p-5">
                <div class="d-flex flex-column align-items-center">
                  <i class="bi bi-inbox display-1 text-muted mb-3"></i>
                  <h5 class="text-muted mb-2">无调用链数据</h5>
                  <p class="text-muted mb-3">当前GID没有可用的调用链数据</p>
                  <button class="btn btn-outline-primary" 
                          :disabled="isProcessing" 
                          @click="reloadData">
                    <i class="bi bi-arrow-clockwise me-1"></i>重新加载
                  </button>
                </div>
              </div>
              
              <!-- 表格数据 -->
              <div v-else>
                <div class="table-responsive trace-table-container">
                  <table class="table table-hover trace-table">
                    <thead class="table-light sticky-top">
                      <tr>
                        <th scope="col" class="sequence-col">序号</th>
                        <th scope="col" class="function-col">函数名</th>
                        <th scope="col" class="action-col">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <template v-for="node in processedTraceData" 
                                :key="node.id">
                        <tr :class="{
                          'has-children': node.hasChildren,
                          'is-expanded': expandedNodes.has(node.id),
                          'is-highlighted': isHighlighted(node.id),
                          [`level-${(node.indent || 0) % 9}`]: true
                        }" :style="{ '--debug-indent': node.indent || 0 }" 
                            :data-id="node.id">
                          
                          <!-- 序号列 -->
                          <td class="text-center sequence-col">
                            <div class="d-flex align-items-center justify-content-center">
                              <span class="badge bg-secondary">{{ node.seq || '-' }}</span>
                            </div>
                            <!-- 高亮指示器 -->
                            <div v-if="isHighlighted(node.id)" 
                                 class="highlight-indicator" 
                                 title="当前选中的函数"></div>
                          </td>
                          
                          <!-- 函数名列 -->
                          <td class="function-name-cell function-col">
                            <div class="d-flex align-items-center">
                              <!-- 缩进 -->
                              <div class="function-indent" 
                                   :style="{ width: `${(node.indent || 0) * 24}px` }"></div>
                              
                              <!-- 展开/折叠按钮 -->
                              <div class="node-toggle me-2">
                                <button v-if="node.hasChildren" 
                                        class="btn btn-sm btn-link toggle-btn" 
                                        :disabled="isProcessing"
                                        @click="debouncedToggleNode(node.id)">
                                  <i class="bi" 
                                     :class="expandedNodes.has(node.id) ? 'bi-dash-square' : 'bi-plus-square'"></i>
                                </button>
                                <span v-else-if="node.loading" 
                                      class="spinner-border spinner-border-sm" role="status"></span>
                                <span v-else-if="node.mayHaveChildren" 
                                      class="btn btn-sm btn-link toggle-btn text-muted" 
                                      @click="loadChildren(node)">
                                  <i class="bi bi-plus-square-dotted"></i>
                                </span>
                                <span v-else class="toggle-placeholder"></span>
                              </div>
                              
                              <!-- 函数名 -->
                              <div class="function-name" :title="node.name">{{ node.name }}</div>
                              
                              <!-- 参数数量 -->
                              <div class="param-count ms-2" v-if="node.paramCount > 0">
                                <span class="badge rounded-pill bg-light text-dark">{{ node.paramCount }}</span>
                              </div>
                            </div>
                          </td>
                          
                          <!-- 操作列 -->
                          <td class="action-col">
                            <div class="action-buttons">
                              <button v-if="node.paramCount > 0" 
                                      class="btn btn-sm btn-outline-info" 
                                      @click="viewParameters(node.id)"
                                      title="查看参数">
                                <i class="bi bi-list-ul"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 参数显示模态框 -->
    <ParametersModal 
      ref="parametersModal"
      :parameters="parameters"
      :param-max-length="paramMaxLength"
      :json-viewer-options="jsonViewerOptions"
    />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Modal } from 'bootstrap';
import axios from 'axios';

// Composables
import { useTraceData } from '../composables/useTraceData';
import { useTraceTree } from '../composables/useTraceTree';
import { useTraceHighlight } from '../composables/useTraceHighlight';

// Components
import TraceControls from './TraceControls.vue';
import ParametersModal from './ParametersModal.vue';

export default {
  name: 'TraceDetails',
  
  components: {
    TraceControls,
    ParametersModal
  },
  
  setup() {
    const route = useRoute();
    const gid = ref(route.params.gid);
    
    // 项目路径验证
    const hasVerifiedPath = ref(false);
    
    // 防抖和状态控制
    const isProcessing = ref(false);
    const isHighlighting = ref(false); // 高亮处理状态
    const highlightProgress = ref(''); // 高亮进度提示
    const debounceMap = new Map();
    
    // 参数相关
    const parameters = ref([]);
    const paramMaxLength = 200;
    const jsonViewerOptions = {
      expanded: 2,
      copyable: true,
      sort: false,
      boxed: true,
      theme: 'jv-light',
      showDoubleQuotes: false,
      showArrayIndex: true
    };
    
    // 使用数据管理composable
    const {
      flattenedTraceData,
      loading,
      depth,
      isLazyLoading,
      callTreeStats,
      fetchTraceDetails,
      reloadData: reloadTraceData
    } = useTraceData(gid, () => {
      // 数据加载完成后的回调，初始化树状态
      console.log('数据加载完成，开始初始化树状态');
      setTimeout(() => {
        initializeNodeStates();
        
        // 如果有高亮需求且高亮函数已设置，尝试展开
        if (highlightedFunctionId.value) {
          console.log('数据加载完成，准备展开到高亮函数');
          setTimeout(async () => {
            await expandToHighlightedFunction();
          }, 100);
        }
      }, 100);
    });
    
    // 使用树形结构composable
    const {
      expandedNodes,
      processedTraceData,
      toggleNode,
      expandNode,
      expandAll,
      collapseAll,
      loadChildren,
      clearState: clearTreeState,
      initializeNodeStates
    } = useTraceTree(flattenedTraceData, gid);
    
    // 高亮处理状态管理
    const startHighlighting = (message = '正在处理高亮...') => {
      isHighlighting.value = true;
      highlightProgress.value = message;
    };
    
    const updateHighlightProgress = (message) => {
      highlightProgress.value = message;
      // 如果收到空消息，自动停止高亮状态
      if (!message || message.trim() === '') {
        isHighlighting.value = false;
      }
    };
    
    const stopHighlighting = () => {
      isHighlighting.value = false;
      highlightProgress.value = '';
    };
    
    // 使用高亮功能composable
    const {
      highlightedFunctionId,
      isHighlighted,
      setHighlightedFunction,
      expandToHighlightedFunction,
      resetHighlightState
    } = useTraceHighlight(flattenedTraceData, expandNode, (targetNode) => {
      // buildPathToNode implementation
      if (!targetNode) return [];
      
      const path = [targetNode];
      let currentNode = targetNode;
      
      while (currentNode.parentId) {
        const parentNode = flattenedTraceData.value.find(
          node => node.id && String(node.id) === String(currentNode.parentId)
        );
        
        if (parentNode) {
          path.unshift(parentNode);
          currentNode = parentNode;
        } else {
          break;
        }
      }
      
      return path;
    }, loadChildren, depth, updateHighlightProgress);
    
    // 检查项目路径
    const checkProjectPath = () => {
      const savedPath = localStorage.getItem('verifiedProjectPath');
      hasVerifiedPath.value = !!savedPath;
      
      if (hasVerifiedPath.value) {
        fetchTraceDetails();
      }
    };
    
    // 防抖的节点切换函数
    const debouncedToggleNode = (nodeId) => {
      if (!nodeId || isProcessing.value) {
        console.log('操作被防抖机制拦截或正在处理中');
        return;
      }
      
      // 检查是否在防抖时间内重复点击
      const now = Date.now();
      const lastClick = debounceMap.get(nodeId) || 0;
      
      if (now - lastClick < 300) { // 300ms防抖
        console.log(`节点 ${nodeId} 防抖拦截，距离上次点击 ${now - lastClick}ms`);
        return;
      }
      
      debounceMap.set(nodeId, now);
      isProcessing.value = true;
      
      console.log(`执行节点 ${nodeId} 的切换操作`);
      
      try {
        toggleNode(nodeId);
      } catch (error) {
        console.error('节点切换操作失败:', error);
      } finally {
        // 确保处理状态能被重置
        setTimeout(() => {
          isProcessing.value = false;
        }, 100);
      }
    };
    
    // 重新加载数据
    const reloadData = () => {
      if (isProcessing.value) {
        console.log('正在处理中，忽略重新加载请求');
        return;
      }
      
      isProcessing.value = true;
      stopHighlighting(); // 停止高亮处理
      
      try {
        clearTreeState();
        resetHighlightState();
        reloadTraceData();
      } finally {
        setTimeout(() => {
          isProcessing.value = false;
        }, 500);
      }
    };
    
    // 查看参数
    const viewParameters = async (id) => {
      try {
        const dbpath = localStorage.getItem('verifiedProjectPath');
        if (!dbpath) {
          console.error('数据库路径为空');
          return;
        }
        
        const response = await axios.post(`/api/runtime/params/${id}`, {
          dbpath: dbpath
        });
        
        parameters.value = (response.data.params || []).map(param => {
          const isLong = param.param && param.param.length > paramMaxLength;
          
          let isJson = false;
          let parsedJson = null;
          
          try {
            if (typeof param.param === 'string' && param.param.trim()) {
              const trimmedParam = param.param.trim();
              if ((trimmedParam.startsWith('{') && trimmedParam.endsWith('}')) || 
                  (trimmedParam.startsWith('[') && trimmedParam.endsWith(']'))) {
                parsedJson = JSON.parse(trimmedParam);
                isJson = true;
              }
            }
          } catch (e) {
            isJson = false;
          }
          
          return {
            ...param,
            isLong,
            isJson,
            parsedJson,
            expanded: false
          };
        });
        
        // 显示模态框
        const modal = new Modal(document.getElementById('paramsModal'));
        modal.show();
      } catch (error) {
        console.error('获取参数失败:', error);
      }
    };
    
    // 生命周期
    onMounted(() => {
      checkProjectPath();
      
      // 只有当URL明确包含highlight参数时才进行高亮处理
      if (route.query.highlight) {
        const highlightId = Number(route.query.highlight);
        console.log('从URL获取高亮函数ID:', highlightId);
        startHighlighting('正在定位高亮函数...');
        // 直接设置高亮函数ID，这会触发高亮逻辑
        setHighlightedFunction(highlightId);
      } else {
        // 如果没有highlight需求，清除可能存在的旧的高亮数据
        console.log('无highlight参数，清除旧的高亮数据');
        resetHighlightState();
        localStorage.removeItem('highlightedFunctionId');
      }
    });
    
    return {
      // 基础数据
      gid,
      hasVerifiedPath,
      
      // 数据状态
      loading,
      depth,
      isLazyLoading,
      callTreeStats,
      processedTraceData,
      expandedNodes,
      isProcessing,
      
      // 高亮状态
      isHighlighting,
      highlightProgress,
      
      // 参数相关
      parameters,
      paramMaxLength,
      jsonViewerOptions,
      
      // 高亮相关
      isHighlighted,
      
      // 方法
      reloadData,
      toggleNode,
      debouncedToggleNode,
      expandAll,
      collapseAll,
      loadChildren,
      viewParameters,
      stopHighlighting
    };
  }
};
</script>

<style scoped>
/* 保持原有的样式 */
.trace-details {
  min-height: 100vh;
}

.page-title {
  color: #2c3e50;
  font-weight: 600;
  margin: 0;
}

.trace-content-card {
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  border: 1px solid rgba(0, 0, 0, 0.125);
}

.trace-table-container {
  max-height: 70vh;
  overflow-y: auto;
}

.trace-table {
  margin-bottom: 0;
  table-layout: fixed;
}

.trace-table th {
  position: sticky;
  top: 0;
  background-color: #f8f9fa;
  z-index: 10;
  border-bottom: 2px solid #dee2e6;
}

.sequence-col {
  width: 120px;
  text-align: center;
  position: relative;
}

.function-col {
  min-width: 400px;
}

.action-col {
  width: 100px;
  text-align: center;
}

.function-indent {
  flex-shrink: 0;
  height: 1px;
  border-left: 1px solid #dee2e6;
}

.node-toggle {
  width: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.toggle-btn {
  padding: 0.125rem 0.25rem;
  border: none;
  background: none;
  color: #6c757d;
  transition: color 0.15s ease-in-out;
}

.toggle-btn:hover:not(:disabled) {
  color: #0d6efd;
}

.toggle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  color: #6c757d !important;
}

.toggle-placeholder {
  width: 24px;
  height: 24px;
}

.function-name {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  flex-grow: 1;
  min-width: 0;
  word-break: break-all;
}

.highlight-indicator {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  background: #ff6b35;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 2px #ff6b35;
}

/* 层级背景色 */
.level-0 { background-color: rgba(255, 107, 53, 0.03); border-left: 3px solid rgba(255, 107, 53, 0.3); }
.level-1 { background-color: rgba(52, 152, 219, 0.03); border-left: 3px solid rgba(52, 152, 219, 0.3); }
.level-2 { background-color: rgba(46, 204, 113, 0.03); border-left: 3px solid rgba(46, 204, 113, 0.3); }
.level-3 { background-color: rgba(155, 89, 182, 0.03); border-left: 3px solid rgba(155, 89, 182, 0.3); }
.level-4 { background-color: rgba(241, 196, 15, 0.03); border-left: 3px solid rgba(241, 196, 15, 0.3); }
.level-5 { background-color: rgba(230, 126, 34, 0.03); border-left: 3px solid rgba(230, 126, 34, 0.3); }
.level-6 { background-color: rgba(231, 76, 60, 0.03); border-left: 3px solid rgba(231, 76, 60, 0.3); }
.level-7 { background-color: rgba(52, 73, 94, 0.03); border-left: 3px solid rgba(52, 73, 94, 0.3); }
.level-8 { background-color: rgba(149, 165, 166, 0.03); border-left: 3px solid rgba(149, 165, 166, 0.3); }

/* 高亮行样式 */
.is-highlighted {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%) !important;
  box-shadow: inset 4px 0 0 #ff6b35, 0 2px 8px rgba(255, 107, 53, 0.15) !important;
}

/* 暗色模式适配 */
@media (prefers-color-scheme: dark) {
  .level-0 { background-color: rgba(255, 107, 53, 0.1); border-left: 3px solid rgba(255, 107, 53, 0.5); }
  .level-1 { background-color: rgba(52, 152, 219, 0.1); border-left: 3px solid rgba(52, 152, 219, 0.5); }
  .level-2 { background-color: rgba(46, 204, 113, 0.1); border-left: 3px solid rgba(46, 204, 113, 0.5); }
  .level-3 { background-color: rgba(155, 89, 182, 0.1); border-left: 3px solid rgba(155, 89, 182, 0.5); }
  .level-4 { background-color: rgba(241, 196, 15, 0.1); border-left: 3px solid rgba(241, 196, 15, 0.5); }
  .level-5 { background-color: rgba(230, 126, 34, 0.1); border-left: 3px solid rgba(230, 126, 34, 0.5); }
  .level-6 { background-color: rgba(231, 76, 60, 0.1); border-left: 3px solid rgba(231, 76, 60, 0.5); }
  .level-7 { background-color: rgba(52, 73, 94, 0.1); border-left: 3px solid rgba(52, 73, 94, 0.5); }
  .level-8 { background-color: rgba(149, 165, 166, 0.1); border-left: 3px solid rgba(149, 165, 166, 0.5); }
  
  .is-highlighted {
    background: linear-gradient(135deg, rgba(255, 243, 205, 0.2) 0%, rgba(255, 234, 167, 0.2) 100%) !important;
    box-shadow: inset 4px 0 0 #ff6b35, 0 2px 8px rgba(255, 107, 53, 0.25) !important;
  }
}
</style> 