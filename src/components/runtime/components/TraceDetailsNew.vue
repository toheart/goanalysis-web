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
        <div class="d-flex align-items-center">
          <!-- 帮助按钮 -->
          <button @click="showHelpModal" class="btn btn-outline-info me-2" title="使用说明">
            <i class="bi bi-question-circle me-1"></i>帮助
          </button>
          <button @click="$router.go(-1)" class="btn btn-secondary">
            <i class="bi bi-arrow-left me-1"></i>返回
          </button>
        </div>
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
              <div class="d-flex align-items-center">
                <!-- 调用链模态框按钮 -->
                <button 
                  v-if="hasDeepCallChain"
                  class="btn btn-sm btn-outline-primary me-2"
                  @click="showCallChainModal"
                  title="查看完整调用链"
                >
                  <i class="bi bi-diagram-3 me-1"></i>
                  调用链视图
                </button>
                <small class="text-muted">
                  显示节点: {{ processedTraceData.length }}
                </small>
              </div>
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
                              <div class="function-name" :title="node.name">{{ formatFunctionName(node.name, getCurrentModule()) }}</div>
                              
                              <!-- 参数数量 -->
                              <div class="param-count ms-2" v-if="node.paramCount > 0">
                                <span class="badge rounded-pill bg-light text-dark">{{ node.paramCount }}</span>
                              </div>
                            </div>
                          </td>
                          
                          <!-- 操作列 -->
                          <td class="action-col">
                            <div class="action-buttons">
                              <!-- 查看调用链按钮（对深度超过3层的所有节点显示） -->
                              <button v-if="(node.indent || 0) >= 3" 
                                      class="btn btn-sm btn-outline-success me-1" 
                                      @click="viewCallChain(node)"
                                      title="查看此函数的调用链">
                                <i class="bi bi-diagram-3"></i>
                              </button>
                              <!-- 生成思维导图按钮（只对存在子节点的节点显示） -->
                              <button v-if="node.hasChildren" 
                                      class="btn btn-sm btn-outline-warning me-1" 
                                      @click="generateMindMap(node)"
                                      title="生成思维导图数据">
                                <i class="bi bi-diagram-2"></i>
                              </button>
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
    
    <!-- 调用链模态框 -->
    <CallChainModal
      v-model:visible="callChainModalVisible"
      :gid="gid"
      :initial-func="callChainData.initialFunc"
      :depth="callChainData.depth"
      :execution-time="callChainData.executionTime"
      :is-finished="callChainData.isFinished"
      :call-chain="callChainData.callChain"
      :target-function="callChainData.targetFunction"
      :target-function-id="callChainData.targetFunctionId"
      :db-path="dbPath"
    />
    
    <!-- 帮助模态框 -->
    <div class="modal fade" id="helpModal" tabindex="-1" aria-labelledby="helpModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="helpModalLabel">
              <i class="bi bi-question-circle me-2"></i>调用链详情使用说明
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
          </div>
          <div class="modal-body">
            <div class="accordion" id="helpAccordion">
              <!-- 基本操作说明 -->
              <div class="accordion-item">
                <h2 class="accordion-header" id="basicOperations">
                  <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#basicOperationsContent">
                    <i class="bi bi-list-check me-2"></i>基本操作
                  </button>
                </h2>
                <div id="basicOperationsContent" class="accordion-collapse collapse show" data-bs-parent="#helpAccordion">
                  <div class="accordion-body">
                    <div class="row">
                      <div class="col-md-6">
                        <h6><i class="bi bi-plus-square me-1"></i>展开/折叠节点</h6>
                        <ul class="list-unstyled">
                          <li><i class="bi bi-plus-square text-success"></i> <strong>绿色加号：</strong>点击展开子节点</li>
                          <li><i class="bi bi-dash-square text-warning"></i> <strong>橙色减号：</strong>点击折叠子节点</li>
                          <li><i class="bi bi-plus-square-dotted text-muted"></i> <strong>灰色虚线：</strong>点击加载更多子节点</li>
                        </ul>
                      </div>
                      <div class="col-md-6">
                        <h6><i class="bi bi-arrows-expand me-1"></i>批量操作</h6>
                        <ul class="list-unstyled">
                          <li><i class="bi bi-chevron-down me-1"></i> <strong>展开全部：</strong>展开所有可展开的节点</li>
                          <li><i class="bi bi-chevron-up me-1"></i> <strong>折叠全部：</strong>折叠所有已展开的节点</li>
                          <li><i class="bi bi-arrow-clockwise me-1"></i> <strong>重新加载：</strong>刷新当前数据</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 参数按钮说明 -->
              <div class="accordion-item">
                <h2 class="accordion-header" id="parametersHelp">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#parametersHelpContent">
                    <i class="bi bi-list-ul me-2"></i>参数按钮 <span class="badge bg-info ms-2">📋</span>
                  </button>
                </h2>
                <div id="parametersHelpContent" class="accordion-collapse collapse" data-bs-parent="#helpAccordion">
                  <div class="accordion-body">
                    <div class="alert alert-info">
                      <i class="bi bi-info-circle me-2"></i>
                      <strong>显示条件：</strong>当函数有参数数据时才会显示
                    </div>
                    <div class="row">
                      <div class="col-md-6">
                        <h6><i class="bi bi-check-circle text-success me-1"></i>会显示的情况：</h6>
                        <ul>
                          <li>函数调用时传递了参数</li>
                          <li>参数数据已记录在数据库中</li>
                          <li>参数数量 &gt; 0</li>
                        </ul>
                      </div>
                      <div class="col-md-6">
                        <h6><i class="bi bi-x-circle text-danger me-1"></i>不会显示的情况：</h6>
                        <ul>
                          <li>函数没有参数</li>
                          <li>参数数据未记录</li>
                          <li>参数数量 = 0</li>
                        </ul>
                      </div>
                    </div>
                    <div class="mt-3">
                      <h6><i class="bi bi-lightbulb me-1"></i>功能说明：</h6>
                      <p>点击参数按钮可以查看函数调用时的具体参数值，支持JSON格式的自动解析和格式化显示。</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 思维导图按钮说明 -->
              <div class="accordion-item">
                <h2 class="accordion-header" id="mindMapHelp">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#mindMapHelpContent">
                    <i class="bi bi-diagram-2 me-2"></i>思维导图按钮 <span class="badge bg-warning ms-2">🗺️</span>
                  </button>
                </h2>
                <div id="mindMapHelpContent" class="accordion-collapse collapse" data-bs-parent="#helpAccordion">
                  <div class="accordion-body">
                    <div class="alert alert-warning">
                      <i class="bi bi-info-circle me-2"></i>
                      <strong>显示条件：</strong>当函数有子节点时才会显示
                    </div>
                    <div class="row">
                      <div class="col-md-6">
                        <h6><i class="bi bi-check-circle text-success me-1"></i>会显示的情况：</h6>
                        <ul>
                          <li>函数调用了其他函数（有子节点）</li>
                          <li>子节点已加载或可加载</li>
                          <li>hasChildren = true</li>
                        </ul>
                      </div>
                      <div class="col-md-6">
                        <h6><i class="bi bi-x-circle text-danger me-1"></i>不会显示的情况：</h6>
                        <ul>
                          <li>函数是叶子节点（无子函数）</li>
                          <li>子节点尚未加载</li>
                          <li>hasChildren = false</li>
                        </ul>
                      </div>
                    </div>
                    <div class="mt-3">
                      <h6><i class="bi bi-lightbulb me-1"></i>功能说明：</h6>
                      <p>生成以当前函数为根节点的思维导图数据，支持多种格式导出：</p>
                      <ul>
                        <li><strong>Mermaid：</strong>适用于 Mermaid、Draw.io、Obsidian 等</li>
                        <li><strong>语雀：</strong>适用于语雀、XMind、MindMeister 等</li>
                        <li><strong>JSON：</strong>适用于自定义工具</li>
                        <li><strong>文本：</strong>适用于简单工具</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 调用链详情按钮说明 -->
              <div class="accordion-item">
                <h2 class="accordion-header" id="callChainHelp">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#callChainHelpContent">
                    <i class="bi bi-diagram-3 me-2"></i>调用链详情按钮 <span class="badge bg-success ms-2">🔗</span>
                  </button>
                </h2>
                <div id="callChainHelpContent" class="accordion-collapse collapse" data-bs-parent="#helpAccordion">
                  <div class="accordion-body">
                    <div class="alert alert-success">
                      <i class="bi bi-info-circle me-2"></i>
                      <strong>显示条件：</strong>当函数调用深度超过3层时才会显示
                    </div>
                    <div class="row">
                      <div class="col-md-6">
                        <h6><i class="bi bi-check-circle text-success me-1"></i>会显示的情况：</h6>
                        <ul>
                          <li>函数调用深度 &gt;= 3层</li>
                          <li>存在复杂的调用关系</li>
                          <li>需要查看完整调用路径</li>
                        </ul>
                      </div>
                      <div class="col-md-6">
                        <h6><i class="bi bi-x-circle text-danger me-1"></i>不会显示的情况：</h6>
                        <ul>
                          <li>函数调用深度 &lt; 3层</li>
                          <li>简单的直接调用</li>
                          <li>调用链较浅</li>
                        </ul>
                      </div>
                    </div>
                    <div class="mt-3">
                      <h6><i class="bi bi-lightbulb me-1"></i>功能说明：</h6>
                      <p>查看从根函数到当前函数的完整调用链，包括：</p>
                      <ul>
                        <li><strong>调用路径：</strong>显示完整的函数调用序列</li>
                        <li><strong>执行时间：</strong>显示函数执行耗时</li>
                        <li><strong>调用深度：</strong>显示当前函数的调用层级</li>
                        <li><strong>执行状态：</strong>显示函数是否执行完成</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 高亮功能说明 -->
              <div class="accordion-item">
                <h2 class="accordion-header" id="highlightHelp">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#highlightHelpContent">
                    <i class="bi bi-highlighter me-2"></i>高亮功能 <span class="badge bg-warning ms-2">✨</span>
                  </button>
                </h2>
                <div id="highlightHelpContent" class="accordion-collapse collapse" data-bs-parent="#helpAccordion">
                  <div class="accordion-body">
                    <div class="alert alert-warning">
                      <i class="bi bi-info-circle me-2"></i>
                      <strong>功能说明：</strong>自动定位并高亮显示指定的函数
                    </div>
                    <div class="row">
                      <div class="col-md-6">
                        <h6><i class="bi bi-check-circle text-success me-1"></i>触发方式：</h6>
                        <ul>
                          <li>URL参数包含 highlight 参数</li>
                          <li>从其他页面跳转时指定函数ID</li>
                          <li>自动展开到目标函数</li>
                        </ul>
                      </div>
                      <div class="col-md-6">
                        <h6><i class="bi bi-lightbulb me-1"></i>使用场景：</h6>
                        <ul>
                          <li>从搜索结果直接跳转</li>
                          <li>从错误日志定位函数</li>
                          <li>快速定位特定函数</li>
                        </ul>
                      </div>
                    </div>
                    <div class="mt-3">
                      <h6><i class="bi bi-info-circle me-1"></i>高亮效果：</h6>
                      <ul>
                        <li><strong>视觉标识：</strong>目标函数行会有特殊背景色</li>
                        <li><strong>自动展开：</strong>自动展开到目标函数的路径</li>
                        <li><strong>进度提示：</strong>显示定位进度和处理状态</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">知道了</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { Modal } from 'bootstrap';
import axios from 'axios';

// Composables
import { useTraceData } from '../composables/useTraceData';
import { useTraceTree } from '../composables/useTraceTree';
import { useTraceHighlight } from '../composables/useTraceHighlight';
import { formatFunctionName } from '../utils/functionNameUtils.js';

// Components
import TraceControls from './TraceControls.vue';
import ParametersModal from './ParametersModal.vue';
import CallChainModal from './CallChainModal.vue';

export default {
  name: 'TraceDetails',
  
  components: {
    TraceControls,
    ParametersModal,
    CallChainModal
  },
  
  setup() {
    const route = useRoute();
    const gid = ref(route.params.gid);
    
    // 项目路径验证
    const hasVerifiedPath = ref(false);
    const dbPath = ref('');
    
    // 从localStorage获取当前数据库的module设置
    const getCurrentModule = () => {
      const currentDbPath = dbPath.value;
      if (currentDbPath) {
        const storageKey = `runtime_analysis_module_${currentDbPath}`;
        return localStorage.getItem(storageKey) || '';
      }
      return '';
    };
    
    // 防抖和状态控制
    const isProcessing = ref(false);
    const isHighlighting = ref(false); // 高亮处理状态
    const highlightProgress = ref(''); // 高亮进度提示
    const debounceMap = new Map();
    
    // 调用链模态框相关
    const callChainModalVisible = ref(false);
    const callChainData = ref({
      initialFunc: '',
      depth: 0,
      executionTime: '',
      isFinished: false,
      callChain: [],
      targetFunction: '',
      targetFunctionId: null
    });
    
    // 帮助模态框相关
    const helpModalVisible = ref(false);
    
    // 显示帮助模态框
    const showHelpModal = () => {
      const modal = new Modal(document.getElementById('helpModal'));
      modal.show();
    };
    
    // 性能优化：缓存调用链数据
    const callChainCache = new Map();
    const nodeInfoCache = new Map();
    
    // 参数相关
    const parameters = ref([]);
    const paramMaxLength = 200;
    const jsonViewerOptions = {
      expanded: 1,
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
      console.log('📊 加载的节点数量:', flattenedTraceData.value.length);
      console.log('📋 节点ID范围:', {
        min: Math.min(...flattenedTraceData.value.map(n => Number(n.id) || 0)),
        max: Math.max(...flattenedTraceData.value.map(n => Number(n.id) || 0))
      });
      
      setTimeout(() => {
        initializeNodeStates();
        
        // 如果有高亮需求且高亮函数已设置，尝试展开
        if (highlightedFunctionId.value) {
          console.log('🎯 数据加载完成，准备展开到高亮函数:', highlightedFunctionId.value);
          console.log('🔍 检查高亮函数是否在数据中:', 
            flattenedTraceData.value.find(n => n.id == highlightedFunctionId.value));
          
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
    
    // 计算属性：检查是否有深度调用链（性能优化）
    const hasDeepCallChain = computed(() => {
      // 使用更高效的检查方式
      for (const node of processedTraceData.value) {
        if ((node.indent || 0) >= 3) {
          return true;
        }
      }
      return false;
    });
    
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
      dbPath.value = savedPath || '';
      
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
        // 清理缓存
        callChainCache.clear();
        nodeInfoCache.clear();
        
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
    
    // 查看调用链
    const viewCallChain = async (node) => {
      try {
        console.log('查看调用链，节点:', node);
        
        // 构建从根节点到当前节点的调用链
        const callChain = buildCallChainToNode(node);
        
        // 异步获取节点详细信息，不阻塞UI
        const nodeInfoPromise = getNodeInfo(node.id);
        
        // 立即设置基本数据，提升响应速度
        callChainData.value = {
          initialFunc: callChain[0]?.name || '未知',
          depth: node.indent || 0,
          executionTime: '加载中...',
          isFinished: false,
          callChain: callChain.map(n => n.name),
          targetFunction: node.name,
          targetFunctionId: node.id
        };
        
        // 显示模态框
        callChainModalVisible.value = true;
        
        // 异步更新详细信息
        try {
          const nodeInfo = await nodeInfoPromise;
          callChainData.value = {
            ...callChainData.value,
            executionTime: nodeInfo?.executionTime || 'N/A',
            isFinished: nodeInfo?.isFinished || false
          };
        } catch (infoError) {
          console.warn('获取节点详细信息失败，使用默认值:', infoError);
          callChainData.value = {
            ...callChainData.value,
            executionTime: 'N/A',
            isFinished: false
          };
        }
      } catch (error) {
        console.error('获取调用链失败:', error);
      }
    };
    
    // 显示整体调用链模态框
    const showCallChainModal = async () => {
      try {
        // 获取根节点
        const rootNode = processedTraceData.value.find(node => !node.parentId || node.parentId === '0');
        if (!rootNode) {
          console.error('未找到根节点');
          return;
        }
        
        // 构建完整调用链
        const fullCallChain = buildFullCallChain();
        
        callChainData.value = {
          initialFunc: rootNode.name,
          depth: Math.max(...processedTraceData.value.map(n => n.indent || 0)),
          executionTime: 'N/A', // 可以从API获取
          isFinished: false, // 可以从API获取
          callChain: fullCallChain,
          targetFunction: '', // 不指定特定目标
          targetFunctionId: null
        };
        
        callChainModalVisible.value = true;
      } catch (error) {
        console.error('获取完整调用链失败:', error);
      }
    };
    
    // 构建到指定节点的调用链（带缓存优化）
    const buildCallChainToNode = (targetNode) => {
      const nodeId = String(targetNode.id);
      
      // 检查缓存
      if (callChainCache.has(nodeId)) {
        return callChainCache.get(nodeId);
      }
      
      const chain = [targetNode];
      let currentNode = targetNode;
      
      while (currentNode.parentId) {
        const parentNode = processedTraceData.value.find(
          node => node.id && String(node.id) === String(currentNode.parentId)
        );
        
        if (parentNode) {
          chain.unshift(parentNode);
          currentNode = parentNode;
        } else {
          break;
        }
      }
      
      // 缓存结果
      callChainCache.set(nodeId, chain);
      return chain;
    };
    
    // 构建完整调用链
    const buildFullCallChain = () => {
      const chain = [];
      const visited = new Set();
      
      const addToChain = (node) => {
        if (!node || visited.has(node.id)) return;
        
        visited.add(node.id);
        chain.push(node.name);
        
        // 添加子节点
        const children = processedTraceData.value.filter(
          child => child.parentId && String(child.parentId) === String(node.id)
        );
        
        children.forEach(child => addToChain(child));
      };
      
      // 从根节点开始
      const rootNode = processedTraceData.value.find(node => !node.parentId || node.parentId === '0');
      if (rootNode) {
        addToChain(rootNode);
      }
      
      return chain;
    };
    
    // 获取节点信息（带缓存优化）
    const getNodeInfo = async (nodeId) => {
      const nodeIdStr = String(nodeId);
      
      // 检查缓存
      if (nodeInfoCache.has(nodeIdStr)) {
        return nodeInfoCache.get(nodeIdStr);
      }
      
      try {
        const response = await axios.post('/api/runtime/function/info', {
          dbpath: dbPath.value,
          gid: gid.value,
          functionId: nodeId
        });
        
        const nodeInfo = response.data?.functionInfo || {};
        
        // 缓存结果
        nodeInfoCache.set(nodeIdStr, nodeInfo);
        return nodeInfo;
      } catch (error) {
        console.error('获取节点信息失败:', error);
        const emptyInfo = {};
        nodeInfoCache.set(nodeIdStr, emptyInfo);
        return emptyInfo;
      }
    };
    
    // 生成思维导图数据
    const generateMindMap = (targetNode) => {
      try {
        console.log('生成思维导图，目标节点:', targetNode);
        targetNode.name = formatFunctionName(targetNode.name, getCurrentModule());
        // 构建从根节点到目标节点的完整调用树
        const mindMapData = buildMindMapData(targetNode);
        
        // 生成多种格式的思维导图数据
        const mindMapFormats = {
          // Mermaid 格式（适用于 Mermaid、Draw.io、Obsidian 等）
          mermaid: generateMermaidFormat(mindMapData),
          // Markdown 格式（适用于 XMind、MindMeister 等）
          markdown: generateMarkdownFormat(mindMapData),
          // JSON 格式（适用于自定义工具）
          json: JSON.stringify(mindMapData, null, 2),
          // 纯文本格式（适用于简单工具）
          text: generateTextFormat(mindMapData)
        };
        
        // 显示思维导图模态框
        showMindMapModal(mindMapData, mindMapFormats, targetNode);
        
      } catch (error) {
        console.error('生成思维导图失败:', error);
        alert('生成思维导图失败: ' + error.message);
      }
    };
    
    // 构建思维导图数据结构
    const buildMindMapData = (targetNode) => {
      const mindMapData = {
        id: targetNode.id,
        name: targetNode.name,
        level: targetNode.indent || 0,
        children: [],
        metadata: {
          gid: gid.value,
          nodeId: targetNode.id,
          paramCount: targetNode.paramCount || 0,
          hasChildren: targetNode.hasChildren || false,
          timestamp: new Date().toISOString()
        }
      };
      
      // 递归构建子节点
      const buildChildren = (parentNode, parentData) => {
        const children = processedTraceData.value.filter(
          child => child.parentId && String(child.parentId) === String(parentNode.id)
        );
        
        children.forEach(child => {
          const childData = {
            id: child.id,
            name: child.name,
            level: child.indent || 0,
            children: [],
            metadata: {
              paramCount: child.paramCount || 0,
              hasChildren: child.hasChildren || false
            }
          };
          
          // 递归处理子节点
          buildChildren(child, childData);
          parentData.children.push(childData);
        });
      };
      
      buildChildren(targetNode, mindMapData);
      return mindMapData;
    };
    
    // 生成 Mermaid 格式
    const generateMermaidFormat = (mindMapData) => {
      let mermaidCode = 'mindmap\n';
      
      const addNode = (node, level = 0) => {
        const indent = '  '.repeat(level);
        
        // 处理函数名，转义特殊字符并限制长度
        const processNodeName = (name) => {
          // 如果是Go函数名，提取关键部分
          if (name.includes('.')) {
            // 提取包路径的最后部分和函数名
            const parts = name.split('.');
            const lastPart = parts[parts.length - 1];
            
            // 处理最后的函数名部分，移除指针符号等
            let functionName = lastPart
              .replace(/\(\*/g, '')        // 移除 (*
              .replace(/\)/g, '')          // 移除 )
              .replace(/\./g, '_')         // 点号替换为下划线
              .replace(/[^\w\s_-]/g, '_')  // 其他特殊字符替换为下划线
              .replace(/\s+/g, '_')        // 空格替换为下划线
              .replace(/_+/g, '_');        // 多个连续下划线替换为单个
            
            // 如果包路径很长，只保留最后几个部分
            if (parts.length > 3) {
              const packageParts = parts.slice(-3, -1); // 取倒数第2和第3个部分
              const packageName = packageParts.join('_');
              return `${packageName}_${functionName}`.substring(0, 80);
            } else {
              return functionName.substring(0, 80);
            }
          } else {
            // 非Go函数名，简单处理
            return name
              .replace(/[^\w\s_-]/g, '_')  // 特殊字符替换为下划线
              .replace(/\s+/g, '_')        // 空格替换为下划线
              .replace(/_+/g, '_')         // 多个连续下划线替换为单个
              .substring(0, 80);           // 限制长度
          }
        };
        
        const nodeLabel = processNodeName(node.name);
        
        if (level === 0) {
          mermaidCode += `  ${nodeLabel}\n`;
        } else {
          mermaidCode += `${indent}${nodeLabel}\n`;
        }
        
        node.children.forEach(child => {
          addNode(child, level + 1);
        });
      };
      
      addNode(mindMapData);
      return mermaidCode;
    };
    
    // 生成语雀格式
    const generateMarkdownFormat = (mindMapData) => {
      let yuqueFormat = '';
      
      const addNode = (node, level = 0) => {
        if (level === 0) {
          // 根节点
          yuqueFormat += ` ${node.name}\n`;
          // 递归处理子节点
          node.children.forEach(child => {
            addNode(child, level + 1);
          });
        } else {
          // 子节点
          const indent = '  '.repeat(level);
          yuqueFormat += `${indent} ${node.name}\n`;
          
          // 递归处理子节点
          if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
              addNode(child, level + 1);
            });
          }
        }
      };
      
      addNode(mindMapData);
      return yuqueFormat;
    };
    
    // 生成纯文本格式
    const generateTextFormat = (mindMapData) => {
      let text = `${mindMapData.name}\n`;
      text += `GID: ${mindMapData.metadata.gid}\n`;
      text += `节点ID: ${mindMapData.metadata.nodeId}\n`;
      text += `生成时间: ${new Date(mindMapData.metadata.timestamp).toLocaleString()}\n\n`;
      
      const addNode = (node, level = 0) => {
        const indent = '  '.repeat(level);
        text += `${indent}${node.name}\n`;
        
        node.children.forEach(child => {
          addNode(child, level + 1);
        });
      };
      
      addNode(mindMapData);
      return text;
    };
    
    // 显示思维导图模态框
    const showMindMapModal = (mindMapData, mindMapFormats, targetNode) => {
      // 移除已存在的模态框
      const existingModal = document.getElementById('mindMapModal');
      if (existingModal) {
        existingModal.remove();
      }
      
      // 创建模态框内容
      const modalContent = `
        <div class="modal fade" id="mindMapModal" tabindex="-1" aria-labelledby="mindMapModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-xl">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="mindMapModalLabel">
                  <i class="bi bi-diagram-2 me-2"></i>思维导图数据 - ${targetNode.name}
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
              </div>
              <div class="modal-body">
                <div class="row">
                  <div class="col-12 mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                      <h6>选择格式并复制到剪贴板：</h6>
                      <div class="btn-group" role="group">
                        <button type="button" class="btn btn-outline-primary btn-sm copy-btn" data-format="mermaid">
                          <i class="bi bi-clipboard me-1"></i>Mermaid
                        </button>
                        <button type="button" class="btn btn-outline-success btn-sm copy-btn" data-format="markdown">
                          <i class="bi bi-clipboard me-1"></i>语雀
                        </button>
                        <button type="button" class="btn btn-outline-info btn-sm copy-btn" data-format="json">
                          <i class="bi bi-clipboard me-1"></i>JSON
                        </button>
                        <button type="button" class="btn btn-outline-secondary btn-sm copy-btn" data-format="text">
                          <i class="bi bi-clipboard me-1"></i>文本
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="nav nav-tabs" id="mindMapTabs" role="tablist">
                      <button class="nav-link active" id="mermaid-tab" data-bs-toggle="tab" data-bs-target="#mermaid-content" type="button" role="tab">
                        Mermaid
                      </button>
                      <button class="nav-link" id="markdown-tab" data-bs-toggle="tab" data-bs-target="#markdown-content" type="button" role="tab">
                        语雀
                      </button>
                      <button class="nav-link" id="json-tab" data-bs-toggle="tab" data-bs-target="#json-content" type="button" role="tab">
                        JSON
                      </button>
                      <button class="nav-link" id="text-tab" data-bs-toggle="tab" data-bs-target="#text-content" type="button" role="tab">
                        文本
                      </button>
                    </div>
                    <div class="tab-content mt-3" id="mindMapTabContent">
                      <div class="tab-pane fade show active" id="mermaid-content" role="tabpanel">
                        <pre class="bg-light p-3 rounded" style="max-height: 400px; overflow-y: auto;"><code>${mindMapFormats.mermaid}</code></pre>
                      </div>
                      <div class="tab-pane fade" id="markdown-content" role="tabpanel">
                        <pre class="bg-light p-3 rounded" style="max-height: 400px; overflow-y: auto;"><code>${mindMapFormats.markdown}</code></pre>
                      </div>
                      <div class="tab-pane fade" id="json-content" role="tabpanel">
                        <pre class="bg-light p-3 rounded" style="max-height: 400px; overflow-y: auto;"><code>${mindMapFormats.json}</code></pre>
                      </div>
                      <div class="tab-pane fade" id="text-content" role="tabpanel">
                        <pre class="bg-light p-3 rounded" style="max-height: 400px; overflow-y: auto;"><code>${mindMapFormats.text}</code></pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                <button type="button" class="btn btn-primary download-btn">
                  <i class="bi bi-download me-1"></i>下载所有格式
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // 添加模态框到页面
      document.body.insertAdjacentHTML('beforeend', modalContent);
      
      // 获取模态框元素
      const modalElement = document.getElementById('mindMapModal');
      
      // 添加复制功能事件监听器
      const copyButtons = modalElement.querySelectorAll('.copy-btn');
      copyButtons.forEach(button => {
        button.addEventListener('click', () => {
          const format = button.getAttribute('data-format');
          const text = mindMapFormats[format];
          
          navigator.clipboard.writeText(text).then(() => {
            // 显示复制成功提示
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="bi bi-check me-1"></i>已复制';
            button.classList.remove('btn-outline-primary', 'btn-outline-success', 'btn-outline-info', 'btn-outline-secondary');
            button.classList.add('btn-success');
            
            setTimeout(() => {
              button.innerHTML = originalText;
              button.classList.remove('btn-success');
              if (format === 'mermaid') button.classList.add('btn-outline-primary');
              else if (format === 'markdown') button.classList.add('btn-outline-success');
              else if (format === 'json') button.classList.add('btn-outline-info');
              else button.classList.add('btn-outline-secondary');
            }, 2000);
          }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制');
          });
        });
      });
      
      // 添加下载功能事件监听器
      const downloadButton = modalElement.querySelector('.download-btn');
      downloadButton.addEventListener('click', () => {
        const data = {
          mermaid: mindMapFormats.mermaid,
          markdown: mindMapFormats.markdown,
          json: mindMapFormats.json,
          text: mindMapFormats.text,
          metadata: mindMapData.metadata
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mindmap_${mindMapData.metadata.gid}_${mindMapData.metadata.nodeId}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
      
      // 显示模态框
      const modal = new Modal(modalElement);
      modal.show();
    };
    
    // 生命周期
    onMounted(() => {
      checkProjectPath();
      
      // 只有当URL明确包含highlight参数时才进行高亮处理
      if (route.query.highlight) {
        const highlightId = Number(route.query.highlight);
        console.log('从URL获取高亮函数ID:', highlightId);
        // 先设置高亮函数ID，但不立即执行高亮逻辑
        // 等待数据加载完成后再执行
        setHighlightedFunction(highlightId);
        startHighlighting('正在等待数据加载完成...');
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
      dbPath,
      
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
      
      // 调用链模态框相关
      callChainModalVisible,
      callChainData,
      hasDeepCallChain,
      
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
      viewCallChain,
      showCallChainModal,
      generateMindMap,
      stopHighlighting,
      
      // Module相关
      formatFunctionName,
      getCurrentModule,

      // 帮助模态框相关
      helpModalVisible,
      showHelpModal
    };
  }
};
</script>

<style>
@import url("../../../assets/styles/components/runtime/trace-details.css");
</style> 