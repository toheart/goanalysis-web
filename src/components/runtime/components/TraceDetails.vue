<!-- Start of Selection -->
<template>
  <div class="trace-details container mt-5">
    <!-- 检查是否有已验证的项目路径 -->
    <div v-if="!hasVerifiedPath" class="text-center">
      <div class="alert alert-warning" role="alert">
        <h4 class="alert-heading mb-3"><i class="bi bi-exclamation-triangle me-2"></i>未设置项目路径</h4>
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
      
      <!-- 查询控制面板 -->
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="bi bi-sliders me-2"></i>查询控制</h5>
          <div class="controls">
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-secondary" @click="collapseAll">
                <i class="bi bi-arrows-collapse me-1"></i>折叠全部
            </button>
              <button class="btn btn-sm btn-outline-secondary" @click="expandAll">
                <i class="bi bi-arrows-expand me-1"></i>展开全部
              </button>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-md-4">
              <label class="form-label">调用深度</label>
              <div class="d-flex align-items-center">
                <input 
                  type="number" 
                  class="form-control me-2" 
                  v-model.number="depth" 
                  min="1"
                  max="50"
                >
              </div>
              <small class="text-muted">设置调用链的初始深度 (推荐值: 3-10)</small>
            </div>
            
            <!-- 增加统计信息 -->
            <div class="col-md-4" v-if="flattenedTraceData && flattenedTraceData.length > 0">
              <div class="stats-container">
                <div class="stat-item">
                  <div class="stat-label"><i class="bi bi-diagram-3 me-1"></i>调用深度</div>
                  <div class="stat-value">{{ maxDepth }}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label"><i class="bi bi-code-square me-1"></i>函数调用数</div>
                  <div class="stat-value">{{ functionCount }}</div>
                </div>
                <div class="stat-item" v-if="expandedNodes.size > 0">
                  <div class="stat-label"><i class="bi bi-arrow-down-up me-1"></i>展开节点</div>
                  <div class="stat-value">{{ expandedNodes.size }}</div>
                </div>
              </div>
            </div>
            
            <div class="col-md-4 text-end">
              <button class="btn btn-primary" @click="reloadData">
                <i class="bi bi-search me-1"></i>查询
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 添加调试信息 -->
      <div v-if="false" class="alert alert-info mb-4">
        <h5>调试信息</h5>
        <p>traceData长度: {{ traceData ? traceData.length : 0 }}</p>
        <p>flattenedTraceData长度: {{ flattenedTraceData ? flattenedTraceData.length : 0 }}</p>
        <p>processedTraceData长度: {{ processedTraceData ? processedTraceData.length : 0 }}</p>
        <pre>{{ JSON.stringify(flattenedTraceData, null, 2) }}</pre>
      </div>
      
      <!-- 调用链信息卡片 - 使用表格进行优化显示 -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0"><i class="bi bi-list-check me-2"></i>调用链</h5>
        </div>
        <div class="card-body p-0">
          <div v-if="loading" class="p-5 text-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">加载中...</span>
            </div>
            <p class="mt-3">正在加载调用链数据...</p>
          </div>
          
          <div v-else-if="isLazyLoading" class="p-3 text-center lazy-load-indicator">
            <div class="progress mb-2">
              <div class="progress-bar progress-bar-striped progress-bar-animated" 
                  :style="{ width: `${(flattenedTraceData.length / traceData.length * 100).toFixed(1)}%` }">
                {{ flattenedTraceData.length }} / {{ traceData.length }}
              </div>
            </div>
            <small class="text-muted">正在分批加载大型调用链 ({{ flattenedTraceData.length }} / {{ traceData.length }})...</small>
          </div>
          
          <div v-else-if="!processedTraceData || processedTraceData.length === 0" class="p-5 text-center">
            <div class="alert alert-info" role="alert">
              <i class="bi bi-info-circle me-2"></i>
              没有可用的调用链数据
            </div>
          </div>
          
          <div v-else>
            <!-- 表格模式 - 标准滚动 -->
            <div class="table-responsive trace-table-container">
              <table class="table table-hover trace-table">
                <thead class="table-light sticky-top">
                  <tr>
                    <th scope="col" style="min-width: 600px">函数名</th>
                    <th scope="col" style="width: 150px">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="(node, index) in processedTraceData" :key="node.id || index">
                    <tr :class="{
                      'has-children': node.hasChildren,
                      'is-expanded': expandedNodes.has(node.id),
                      'is-highlighted': isHighlighted(node.id)
                    }">
                      <td class="function-name-cell">
                      <div class="d-flex align-items-center">
                          <div class="function-indent" :style="{ width: `${(node.indent || 0) * 20}px` }"></div>
                          <div class="node-toggle me-2">
                            <button v-if="node.hasChildren" 
                                  class="btn btn-sm btn-link toggle-btn" 
                                  @click="toggleNode(node)">
                              <i class="bi" :class="expandedNodes.has(node.id) ? 'bi-dash-square' : 'bi-plus-square'"></i>
                        </button>
                            <span v-else-if="node.loading" class="spinner-border spinner-border-sm" role="status"></span>
                            <span v-else-if="node.mayHaveChildren" 
                                  class="btn btn-sm btn-link toggle-btn text-muted" 
                                  @click="loadChildren(node)">
                              <i class="bi bi-plus-square-dotted"></i>
                            </span>
                            <span v-else class="toggle-placeholder"></span>
                        </div>
                          <div class="function-name">{{ node.name }}</div>
                          <div class="param-count ms-2" v-if="node.paramCount > 0">
                            <span class="badge rounded-pill bg-light text-dark">{{ node.paramCount }}</span>
                      </div>
                    </div>
                      </td>
                      <td>
                        <div class="action-buttons">
                          <button v-if="node.paramCount > 0" 
                              class="btn btn-sm btn-outline-info" 
                                  @click="() => viewParameters(node.id)"
                                  title="查看参数">
                            <i class="bi bi-list-ul"></i>
                        </button>
                        <button v-if="node.hasChildren" 
                                class="btn btn-sm btn-outline-primary ms-1" 
                                @click="() => generateTreeChart(node.id)"
                                title="树形图">
                            <i class="bi bi-diagram-3"></i>
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

    <!-- 参数详情模态框 -->
    <div class="modal fade" id="paramsModal" tabindex="-1" aria-labelledby="paramsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="paramsModalLabel">
              <i class="bi bi-braces me-2"></i>参数详情
            </h5>
            <button type="button" class="btn-close" @click="closeModal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="table-responsive">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th scope="col" class="text-center" width="15%">位置</th>
                    <th scope="col">参数值</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(param, index) in parameters" :key="index">
                    <td class="text-center"><span class="badge bg-secondary">{{ param.pos }}</span></td>
                    <td class="param-value">
                      <div class="param-content-wrapper">
                        <div v-if="param.isLong && !param.expanded" class="truncated-param">
                          {{ truncateParam(param.param) }}
                        </div>
                        <div v-else class="full-param">
                          {{ param.param }}
                        </div>
                        <button v-if="param.isLong" 
                                class="btn btn-sm toggle-param-btn" 
                                @click="toggleParamExpand(index)">
                          <i class="bi" :class="param.expanded ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
                          {{ param.expanded ? '收起' : '展开' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">关闭</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 树形图模态框 -->
    <div class="modal fade" id="treeChartModal" tabindex="-1" aria-labelledby="treeChartModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-fullscreen">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="treeChartModalLabel">
              <i class="bi bi-diagram-3 me-2"></i>函数调用树形图
            </h5>
            <div class="btn-group me-2">
              <button class="btn btn-outline-secondary btn-sm" @click="zoomIn" title="放大">
                <i class="bi bi-zoom-in"></i>
              </button>
              <button class="btn btn-outline-secondary btn-sm" @click="zoomOut" title="缩小">
                <i class="bi bi-zoom-out"></i>
              </button>
              <button class="btn btn-outline-secondary btn-sm" @click="resetZoom" title="重置缩放">
                <i class="bi bi-arrows-angle-contract"></i>
              </button>
            </div>
            <button type="button" class="btn-close" @click="closeTreeChartModal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-0">
            <!-- 加载状态 -->
            <div v-if="treeChartLoading" class="tree-loading-overlay">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">加载中...</span>
              </div>
              <p class="mt-3">正在生成调用树形图...</p>
            </div>
            
            <!-- 图表区域 -->
            <div ref="treeChartContainer" class="tree-chart-container"></div>
            
            <!-- 错误提示 -->
            <div v-if="treeChartError" class="tree-error-message">
              <i class="bi bi-exclamation-triangle me-2"></i>
              {{ treeChartError }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
import axios from '../../../axios';
import { Modal } from 'bootstrap';
import { initChart, handleChartResize, disposeChart, createTreeChartOption } from '../utils/chartUtils';

export default {
  data() {
    return {
      gid: this.$route.params.gid,
      traceData: [],
      flattenedTraceData: [], // 打平后的调用链数据
      parameters: [],
      modal: null,
      hasVerifiedPath: false,
      loading: true,
      maxDepth: 0,
      totalTime: '0ms',
      functionCount: 0,
      dbpath: '', // 当前使用的数据库路径
      highlightedFunctionId: null, // 高亮显示的函数ID
      expandedNodes: new Set(), // 存储展开的节点ID
      nodeChildrenMap: new Map(), // 存储节点的子节点
      
      // 新增查询控制参数
      depth: 3, // 默认深度为3
      
      // 优化滚动性能的防抖延迟
      scrollDebounceTimer: null,
      scrollDebounceDelay: 50, // 毫秒
      
      // 懒加载相关
      lazyLoadThreshold: 20, // 节点数量达到阈值时启用懒加载
      lazyLoadBatchSize: 100, // 每批加载的节点数
      isLazyLoading: false, // 是否正在懒加载
      
      // 节点状态缓存
      nodeStates: new Map(), // id -> {hasChildren, expanded, loading, loaded}
      
      // 树形图相关
      treeChartVisible: false, // 控制树形图模态框的显示
      treeChartLoading: false, // 树形图加载状态
      treeChartData: [], // 树形图数据
      currentNodeId: null, // 当前选中的节点ID
      treeChartError: null, // 树形图错误信息
      chartInstance: null, // ECharts实例
      
      // 参数显示相关
      paramMaxLength: 200, // 参数最大显示长度，超过则截断
    };
  },
  
  computed: {
    // 处理后的追踪数据，考虑展开/折叠状态
    processedTraceData() {
      if (!this.traceData || !this.flattenedTraceData || this.flattenedTraceData.length === 0) return [];
      
      try {
        // 根据展开状态构建显示的节点列表
        return this.buildVisibleNodeList();
      } catch (error) {
        console.error("Error processing trace data:", error);
        return [];
      }
    },
    
    // 添加计算属性：统计总体调用数据
    callTreeStats() {
      return {
        totalNodes: this.flattenedTraceData.length,
        visibleNodes: this.processedTraceData.length,
        expandedNodes: this.expandedNodes.size,
        maxDepth: this.maxDepth
      };
    }
  },
  
  created() {
    // 从URL查询参数中获取highlight值
    if (this.$route.query.highlight) {
      this.highlightedFunctionId = Number(this.$route.query.highlight);
      console.log('从URL获取高亮函数ID:', this.highlightedFunctionId);
    }
  },
  
  mounted() {
    this.checkProjectPath();
    this.modal = new Modal(document.getElementById('paramsModal'));
    
    // 从本地存储中获取高亮函数ID
    this.getHighlightedFunctionId();
    
    // 添加窗口大小变化的事件监听
    window.addEventListener('resize', this.handleWindowResize);
  },
  
  beforeUnmount() {
    window.removeEventListener('resize', this.handleWindowResize);
    
    // 销毁图表实例
    if (this.chartInstance) {
      disposeChart(this.chartInstance);
      this.chartInstance = null;
    }
  },
  
  methods: {
    // 重新加载数据
    reloadData() {
      this.expandedNodes.clear();
      this.nodeChildrenMap.clear();
      this.nodeStates.clear();
      this.flattenedTraceData = [];
      this.fetchTraceDetails();
    },
    
    // 检查是否有已验证的项目路径
    checkProjectPath() {
      const savedPath = localStorage.getItem('verifiedProjectPath');
      this.hasVerifiedPath = !!savedPath;
      
      // 如果有已验证的路径，则获取追踪详情
      if (this.hasVerifiedPath) {
        this.fetchTraceDetails();
      } else {
        this.loading = false;
      }
    },
    
    // 获取当前数据库路径
    getCurrentDbPath() {
      // 如果已经设置了数据库路径，直接返回
      if (this.dbpath) {
        return this.dbpath;
      }
      
      // 否则使用本地存储的已验证路径
      const savedPath = localStorage.getItem('verifiedProjectPath');
      if (savedPath) {
        this.dbpath = savedPath;
        return this.dbpath;
      }
      
      // 如果都没有，返回空字符串
      return '';
    },
    
    // 构建可见节点列表（考虑展开/折叠状态）
    buildVisibleNodeList() {
      if (!this.flattenedTraceData || this.flattenedTraceData.length === 0) {
        console.warn('flattenedTraceData 为空，无法构建可见节点列表');
        return [];
      }
      
      console.log('构建可见节点列表, 总节点数:', this.flattenedTraceData.length);
      
      const result = [];
      
      // 递归处理节点及其子节点
      const processNode = (node, isVisible = true) => {
        if (!node) return;
        
        // 如果节点可见，添加到结果中
        if (isVisible) {
          result.push(node);
        }
        
        // 如果节点有子节点并且是展开的，处理其子节点
        const childNodes = this.nodeChildrenMap.get(node.id) || [];
        const isExpanded = this.expandedNodes.has(node.id);
        
        if (childNodes.length > 0 && isExpanded && isVisible) {
          childNodes.forEach(childNode => {
            processNode(childNode, true);
          });
        }
      };
      
      try {
        // 处理所有顶级节点，确保有根节点
        const rootNodes = this.flattenedTraceData.filter(node => 
          !node.parentId || node.parentId === '0' || node.parentId === 0
        );
        
        if (rootNodes.length === 0) {
          console.warn('没有找到根节点，使用所有节点作为根节点');
          this.flattenedTraceData.forEach(node => processNode(node));
        } else {
          rootNodes.forEach(node => processNode(node));
        }
        
        // 更新虚拟滚动的总高度
        this.totalVirtualHeight = result.length * this.itemHeight;
        
        return result;
      } catch (error) {
        console.error('构建可见节点列表出错:', error);
        return this.flattenedTraceData; // 出错时返回所有节点
      }
    },
    
    async fetchTraceDetails() {
      this.loading = true;
      try {
        const dbpath = this.getCurrentDbPath();
        if (!dbpath) {
          console.error('数据库路径为空');
          this.loading = false;
          return;
        }
        
        // 构建请求参数，包括深度
        const requestData = {
          dbpath: dbpath,
          depth: this.depth // 使用设置的深度限制
        };
        
        console.log('API请求参数:', requestData);
        
        const response = await axios.post(`/api/runtime/traces/${this.gid}`, requestData);
        
        // 添加详细日志
        console.log('API响应:', response);
        console.log('响应数据类型:', typeof response.data);
        console.log('完整响应数据:', JSON.stringify(response.data));
        
        // 强制将响应数据转换为正确的格式
        if (response.data) {
          // 确保 traceData 是数组
          if (response.data.traceData) {
            if (Array.isArray(response.data.traceData)) {
              this.traceData = response.data.traceData;
              console.log('获取到调用链数组数据:', this.traceData);
            } else if (typeof response.data.traceData === 'object') {
              // 如果是对象，转换为数组
              this.traceData = [response.data.traceData]; // 直接包装为数组
              console.log('对象转换为数组:', this.traceData);
            } else {
              console.error('无效的 traceData 格式:', response.data.traceData);
              this.traceData = [];
            }
          } else {
            console.error('响应中没有 traceData 字段:', response.data);
            this.traceData = [];
          }
        } else {
          console.error('API返回无效数据:', response);
          this.traceData = [];
        }
        
        // 强制确保 traceData 是数组
        if (!Array.isArray(this.traceData)) {
          console.warn('traceData 不是数组，进行强制转换');
          this.traceData = this.traceData ? [this.traceData] : [];
        }
        
        // 确保清空初始状态
        this.flattenedTraceData = [];
        this.expandedNodes.clear();
        this.nodeChildrenMap.clear();
        this.nodeStates.clear();
        
        // 处理数据，即使为空也要调用
        console.log('处理前的数据:', this.traceData);
        this.processTreeData();
        console.log('处理后的数据:', this.flattenedTraceData);
        
        // 更新统计信息
        this.updateStatistics();
        
        // 检查高亮函数并展开到该函数
        if (this.highlightedFunctionId) {
          this.$nextTick(() => {
            this.expandToHighlightedFunction();
          });
        }
      } catch (error) {
        console.error("Error fetching trace details:", error);
        this.traceData = [];
        this.flattenedTraceData = [];
      } finally {
        this.loading = false;
      }
    },
    
    // 处理树形数据，建立父子关系
    processTreeData() {
      // 无论是否有数据，先清空现有映射
      this.nodeChildrenMap.clear();
      this.nodeStates.clear();
      this.flattenedTraceData = [];
      
      if (!this.traceData || !Array.isArray(this.traceData) || this.traceData.length === 0) {
        console.warn('traceData 为空或不是数组，无法处理');
        return;
      }
      
      console.log('开始处理树形数据, 节点数量:', this.traceData.length);
      
      // 检查节点数量是否超过阈值
      const useLazyLoad = this.traceData.length > this.lazyLoadThreshold;
      
      if (useLazyLoad) {
        console.log(`节点数量(${this.traceData.length})超过阈值(${this.lazyLoadThreshold})，将使用懒加载`);
        this.isLazyLoading = true;
        // 先处理第一批数据
        this.lazyLoadTreeData(0);
      } else {
        // 一次性处理所有数据
        this.processTreeDataBatch(this.traceData);
        this.isLazyLoading = false;
      }
    },
    
    // 懒加载处理树形数据
    lazyLoadTreeData(startIndex) {
      const endIndex = Math.min(startIndex + this.lazyLoadBatchSize, this.traceData.length);
      const batch = this.traceData.slice(startIndex, endIndex);
      
      console.log(`懒加载数据批次 ${startIndex}-${endIndex}，共${batch.length}个节点, 总进度: ${((endIndex / this.traceData.length) * 100).toFixed(1)}%`);
      
      // 处理当前批次
      this.processTreeDataBatch(batch);
      
      // 如果还有未处理的数据，安排下一批处理
      if (endIndex < this.traceData.length) {
        setTimeout(() => {
          this.lazyLoadTreeData(endIndex);
        }, 10); // 减少等待时间以加快加载
      } else {
        // 所有批次处理完成
        console.log('所有节点加载完毕，总节点数:', this.flattenedTraceData.length);
        this.isLazyLoading = false;
        
        // 更新统计信息
        this.updateStatistics();
        
        // 检查高亮函数并展开到该函数
        if (this.highlightedFunctionId) {
          this.$nextTick(() => {
            this.expandToHighlightedFunction();
          });
        }
      }
      
      // 强制更新渲染进度条
      this.$forceUpdate();
    },
    
    // 处理一批树形数据
    processTreeDataBatch(batch) {
      // 添加附加属性到每个节点
      const enhancedNodes = batch.map(node => {
        // 确保节点是对象
        if (!node || typeof node !== 'object') {
          console.warn('节点不是对象类型:', node);
          return null;
        }
        
        // 确保对象字段存在
        const safeNode = {
          id: node.id || Math.floor(Math.random() * 10000),  // 随机ID防止undefined
          name: node.name || '未知函数',
          indent: typeof node.indent === 'number' ? node.indent : 0,
          timeCost: node.timeCost || 'N/A',
          parentId: node.parentId || '0',
          paramCount: typeof node.paramCount === 'number' ? node.paramCount : 0,
          gid: node.gid || this.gid,
          params: Array.isArray(node.params) ? node.params : []
        };
        
        // 检查节点是否可能有子节点
        const mayHaveChildren = safeNode.indent < 10; // 假设深度小于10的节点可能有子节点
        
        return {
          ...safeNode,
          hasChildren: false,  // 初始没有已知子节点
          mayHaveChildren,
          loading: false,
          children: []
        };
      }).filter(node => node !== null); // 过滤掉无效节点
      
      // 将处理后的节点加入平铺数组
      this.flattenedTraceData.push(...enhancedNodes);
      
      // 缓存节点状态
      enhancedNodes.forEach(node => {
        this.nodeStates.set(node.id, {
          hasChildren: false,
          mayHaveChildren: node.mayHaveChildren,
          expanded: false,
          loading: false,
          loaded: false // 需要动态加载
        });
      });
    },
    
    // 异步加载节点的子节点
    async loadChildren(node) {
      if (!node || !node.id) return;
      
      // 标记为加载中
      node.loading = true;
      
      // 更新状态缓存
      let nodeState = this.nodeStates.get(node.id) || { 
        hasChildren: false, 
        mayHaveChildren: true,
        expanded: false,
        loading: true,
        loaded: false
      };
      
      nodeState.loading = true;
      this.nodeStates.set(node.id, nodeState);
      
      try {
        const dbpath = this.getCurrentDbPath();
        if (!dbpath) {
          throw new Error('数据库路径为空');
        }
        
        // 调用API获取子节点
        const response = await axios.post('/api/runtime/functions/children', {
          parentId: node.id,
          dbpath: dbpath
        });
        
        console.log('子函数数据响应:', response.data);
        
        // 处理子节点数据
        if (response.data && response.data.functions && response.data.functions.length > 0) {
          const childNodes = response.data.functions.map(func => {
            // 创建子节点对象，包含参数个数信息
            return {
              id: func.id || `${node.id}_child_${Math.random().toString(36).substr(2, 9)}`,
              name: func.name,
              package: func.package || '',
              indent: node.indent + 1,
              timeCost: func.avgTime || 'N/A',
              parentId: node.id,
              paramCount: func.paramCount || 0, // 使用API返回的参数个数
              hasChildren: false, // 初始假设没有子节点
              mayHaveChildren: true, // 但它可能有子节点
              loading: false
            };
          });
          
          // 将子节点加入到flattenedTraceData
          childNodes.forEach(childNode => {
            this.flattenedTraceData.push(childNode);
            
            // 缓存子节点状态
            this.nodeStates.set(childNode.id, {
              hasChildren: false,
              mayHaveChildren: true,
              expanded: false,
              loading: false,
              loaded: false
            });
          });
          
          // 更新节点子节点映射
          this.nodeChildrenMap.set(node.id, childNodes);
          
          // 更新节点状态
          node.hasChildren = true;
          node.mayHaveChildren = false;
          
          // 更新状态缓存
          nodeState.hasChildren = true;
          nodeState.mayHaveChildren = false;
          nodeState.loaded = true;
          
          // 自动展开节点
          this.expandNode(node.id);
          
          // 更新统计信息
          this.updateStatistics();
          console.log(`子节点加载完成: ${node.name}, 子节点数: ${childNodes.length}, 当前总函数数: ${this.functionCount}`);
        } else {
          // 没有子节点
          node.hasChildren = false;
          node.mayHaveChildren = false;
          
          // 更新状态缓存
          nodeState.hasChildren = false;
          nodeState.mayHaveChildren = false;
          nodeState.loaded = true;
        }
      } catch (error) {
        console.error("加载子节点失败:", error);
        // 出错时，标记节点为可能有子节点但加载失败
        node.mayHaveChildren = true;
        nodeState.mayHaveChildren = true;
      } finally {
        // 更新加载状态
        node.loading = false;
        nodeState.loading = false;
        this.nodeStates.set(node.id, nodeState);
        
        // 强制更新视图
        this.$forceUpdate();
      }
    },
    
    // 切换节点的展开/折叠状态
    toggleNode(node) {
      if (!node || !node.id) return;
      
      if (this.expandedNodes.has(node.id)) {
        this.collapseNode(node.id);
      } else {
        this.expandNode(node.id);
      }
    },
    
    // 展开节点
    expandNode(nodeId) {
      if (!nodeId) return;
      
      // 获取节点状态
      const nodeState = this.nodeStates.get(nodeId);
      
      // 如果节点未加载子节点，先加载
      if (nodeState && nodeState.mayHaveChildren && !nodeState.loaded && !nodeState.loading) {
        // 查找节点对象
        const node = this.flattenedTraceData.find(n => n.id && String(n.id) === String(nodeId));
        if (node) {
          this.loadChildren(node);
        }
      }
      
      // 添加到展开集合
      this.expandedNodes.add(nodeId);
      
      // 更新状态缓存
      if (nodeState) {
        nodeState.expanded = true;
        this.nodeStates.set(nodeId, nodeState);
      }
      
      // 更新视图
      this.$forceUpdate();
    },
    
    // 折叠节点
    collapseNode(nodeId) {
      if (!nodeId) return;
      
      // 从展开集合中移除
      this.expandedNodes.delete(nodeId);
      
      // 更新状态缓存
      const nodeState = this.nodeStates.get(nodeId);
      if (nodeState) {
        nodeState.expanded = false;
        this.nodeStates.set(nodeId, nodeState);
      }
      
      // 更新视图
      this.$forceUpdate();
    },
    
    // 展开所有节点
    expandAll() {
      // 仅展开已知有子节点的节点
      this.flattenedTraceData.forEach(node => {
        if (node.hasChildren) {
          this.expandNode(node.id);
        }
      });
    },
    
    // 折叠所有节点
    collapseAll() {
      this.expandedNodes.clear();
      
      // 更新所有节点的状态缓存
      this.nodeStates.forEach((state, nodeId) => {
        state.expanded = false;
        this.nodeStates.set(nodeId, state);
      });
      
      // 更新视图
      this.$forceUpdate();
    },
    
    async viewParameters(id) {
      try {
        const dbpath = this.getCurrentDbPath();
        if (!dbpath) {
          console.error('数据库路径为空');
          return;
        }
        
        const response = await axios.post(`/api/runtime/params/${id}`, {
          dbpath: dbpath
        });
        
        // 处理参数，添加展开状态标记
        this.parameters = (response.data.params || []).map(param => {
          const isLong = param.param && param.param.length > this.paramMaxLength;
          return {
            ...param,
            isLong,
            expanded: false // 默认折叠
          };
        });
        
        this.showModal(); // 显示模态框
      } catch (error) {
        console.error("Error fetching parameters:", error);
      }
    },
    
    showModal() {
      const modalElement = document.getElementById('paramsModal');
      if (modalElement) {
        const modal = Modal.getOrCreateInstance(modalElement);
        modal.show();
      } else {
        console.error("Modal element not found.");
      }
    },
    
    closeModal() {
      const modalElement = document.getElementById('paramsModal');
      if (modalElement) {
        const modal = Modal.getInstance(modalElement);
        modal.hide();
      } else {
        console.error("Modal element not found.");
      }
    },
    
    // 截断参数文本
    truncateParam(text) {
      if (!text) return '';
      if (text.length <= this.paramMaxLength) return text;
      return text.substring(0, this.paramMaxLength) + '...';
    },
    
    // 切换参数展开/折叠状态
    toggleParamExpand(index) {
      if (this.parameters[index]) {
        this.parameters[index].expanded = !this.parameters[index].expanded;
      }
    },
    
    // 计算统计信息
    calculateStats() {
      console.log('重新计算统计信息，节点数量:', this.flattenedTraceData.length);
      
      if (!this.flattenedTraceData || this.flattenedTraceData.length === 0) {
        this.maxDepth = 0;
        this.totalTime = '0ms';
        this.functionCount = 0;
        return;
      }
      
      try {
        // 计算最大深度
        // 注意：不能简单地使用 indent 的最大值，因为有些子节点可能直接深入到很深的层级
        // 使用实际的最大嵌套深度
        const nodeIndents = this.flattenedTraceData.map(item => item.indent || 0);
        this.maxDepth = Math.max(...nodeIndents) + 1;
        console.log('最大深度计算结果:', this.maxDepth, '基于最大缩进值:', Math.max(...nodeIndents));
      
        // 计算总耗时（取第一个函数的耗时）
        const rootNode = this.flattenedTraceData.find(node => !node.parentId || node.parentId === '0' || node.parentId === 0);
        if (rootNode) {
          this.totalTime = rootNode.timeCost || '未知';
        } else if (this.flattenedTraceData.length > 0) {
          // 如果没有找到根节点，就使用第一个节点的耗时
          this.totalTime = this.flattenedTraceData[0].timeCost || '未知';
        }
      
        // 函数调用数量
        this.functionCount = this.flattenedTraceData.length;
        console.log('统计信息更新完成：深度=', this.maxDepth, '函数数量=', this.functionCount);
      } catch (error) {
        console.error('计算统计信息失败:', error);
        this.maxDepth = 1;
        this.totalTime = '未知';
        this.functionCount = this.flattenedTraceData.length;
      }
    },
    
    // 更新统计信息（可在多处调用）
    updateStatistics() {
      // 函数调用数量
      this.functionCount = this.flattenedTraceData.length;
      
      // 计算最大深度
      if (this.flattenedTraceData && this.flattenedTraceData.length > 0) {
        const nodeIndents = this.flattenedTraceData.map(item => item.indent || 0);
        this.maxDepth = Math.max(...nodeIndents) + 1;
      }
      
      console.log('统计信息更新：深度=', this.maxDepth, '函数数量=', this.functionCount);
    },
    
    // 获取高亮函数ID
    getHighlightedFunctionId() {
      // 优先使用URL查询参数中的highlight值
      if (this.$route.query.highlight) {
        this.highlightedFunctionId = Number(this.$route.query.highlight);
        console.log('从URL获取高亮函数ID:', this.highlightedFunctionId);
        return;
      }
      
      // 如果URL中没有，则尝试从localStorage获取
      const highlightedId = localStorage.getItem('highlightedFunctionId');
      if (highlightedId) {
        this.highlightedFunctionId = Number(highlightedId);
        
        // 清除本地存储中的高亮函数ID，避免影响其他页面
        localStorage.removeItem('highlightedFunctionId');
      }
    },
    
    // 检查函数是否被高亮
    isHighlighted(id) {
      return this.highlightedFunctionId && Number(id) === Number(this.highlightedFunctionId);
    },
    
    // 展开到高亮函数所在的路径
    expandToHighlightedFunction() {
      if (!this.highlightedFunctionId || !this.flattenedTraceData || this.flattenedTraceData.length === 0) return;
      
      // 查找高亮函数节点
      const highlightNode = this.flattenedTraceData.find(
        node => node.id && Number(node.id) === Number(this.highlightedFunctionId)
      );
      
      if (!highlightNode) return;
      
      // 查找该节点所有的父节点
      let currentNode = highlightNode;
      const parentIds = [];
      
      while (currentNode && currentNode.parentId) {
        parentIds.push(currentNode.parentId);
        currentNode = this.flattenedTraceData.find(
          node => node.id && String(node.id) === String(currentNode.parentId)
        );
      }
      
      // 从根节点开始展开路径
      parentIds.reverse().forEach(parentId => {
        this.expandNode(parentId);
      });
      
      // 滚动到高亮函数
        this.$nextTick(() => {
            this.scrollToHighlightedFunction();
        });
    },
    
    // 滚动到高亮函数
    scrollToHighlightedFunction() {
      if (!this.highlightedFunctionId) return;
      
      const highlightedElement = document.querySelector('.is-highlighted');
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    
    // 生成树形图
    async generateTreeChart(nodeId) {
      if (!nodeId) return;
      
      this.currentNodeId = nodeId;
      this.treeChartLoading = true;
      this.treeChartError = null;
      this.treeChartData = [];
      
      // 记录生成树形图前的调用数
      const initialFunctionCount = this.functionCount;
      
      try {
        // 打开模态框
        const modalElement = document.getElementById('treeChartModal');
        if (modalElement) {
          const treeModal = new Modal(modalElement);
          treeModal.show();
          
          // 查找当前节点信息
          const currentNode = this.flattenedTraceData.find(node => node.id === nodeId);
          if (!currentNode) {
            throw new Error('找不到节点信息');
          }
          
          // 构建根节点数据
          const rootNode = {
            name: currentNode.name,
            value: currentNode.id,
            executionTime: currentNode.timeCost || '未知',
            children: []
          };
          
          // 获取数据库路径
          const dbpath = this.getCurrentDbPath();
          if (!dbpath) {
            throw new Error('数据库路径为空');
          }
          
          // 递归构建树结构
          await this.buildTreeData(rootNode, 0, 3); // 默认加载3层深度
          
          // 设置图表数据
          this.treeChartData = [rootNode];
          
          // 计算并更新树形图深度
          let maxTreeDepth = 0;
          const calculateDepth = (node, currentDepth) => {
      if (!node) return;
            maxTreeDepth = Math.max(maxTreeDepth, currentDepth);
            
            if (node.children && node.children.length > 0) {
              node.children.forEach(child => calculateDepth(child, currentDepth + 1));
            }
          };
          
          // 从根节点开始计算深度
          calculateDepth(rootNode, 1);
          
          // 更新最大深度，取当前深度和树形图深度的最大值
          this.maxDepth = Math.max(this.maxDepth, maxTreeDepth);
          console.log('树形图构建完成，最大深度:', maxTreeDepth, '函数数量增加:', this.functionCount - initialFunctionCount);
          
          // 等待DOM更新后初始化图表
          this.$nextTick(() => {
            setTimeout(() => {
              this.initTreeChart();
            }, 300);
          });
        }
      } catch (error) {
        console.error("生成树形图失败:", error);
        this.treeChartError = `生成树形图失败: ${error.message}`;
        this.treeChartLoading = false;
      }
    },
    
    // 递归构建树形图数据
    async buildTreeData(node, currentDepth, maxDepth) {
      if (!node || !node.value || currentDepth >= maxDepth) return;
      
      try {
        const dbpath = this.getCurrentDbPath();
        
        // 调用API获取子节点
        const response = await axios.post('/api/runtime/functions/children', {
          parentId: node.value,
          dbpath: dbpath
        });
        
        if (response.data && response.data.functions && response.data.functions.length > 0) {
          // 构建子节点
          const childNodes = response.data.functions.map(func => {
            return {
              name: func.name || '未知函数',
              value: func.id,
              executionTime: func.avgTime || '未知',
              package: func.package || '',
              paramCount: func.paramCount || 0,
              children: [] // 初始为空数组
            };
          });
          
          // 添加到父节点
          node.children = childNodes;
          
          // 更新统计信息 - 增加函数数量计数
          this.functionCount += childNodes.length;
          
          // 如果未达到最大深度，继续递归构建
          if (currentDepth + 1 < maxDepth) {
            for (const childNode of childNodes) {
              await this.buildTreeData(childNode, currentDepth + 1, maxDepth);
            }
          }
        }
      } catch (error) {
        console.error(`获取节点 ${node.value} 的子节点失败:`, error);
        // 不抛出错误，允许部分加载
      }
    },
    
    // 初始化树形图
    initTreeChart() {
      // 确保有容器和数据
      if (!this.$refs.treeChartContainer || !this.treeChartData || this.treeChartData.length === 0) {
        this.treeChartError = '无法初始化图表: 容器或数据无效';
        this.treeChartLoading = false;
        return;
      }
      
      try {
        // 销毁旧的图表实例
        if (this.chartInstance) {
          disposeChart(this.chartInstance);
          this.chartInstance = null;
        }
        
        // 创建图表选项
        const option = createTreeChartOption(this.treeChartData);
        
        // 初始化图表
        this.chartInstance = initChart(this.$refs.treeChartContainer, option);
        
        // 添加点击事件处理
        if (this.chartInstance) {
          this.chartInstance.on('click', (params) => {
            if (params.data && params.data.children && params.data.children.length > 0) {
              // 切换节点展开/折叠状态
              const isCurrentlyExpanded = !params.data.collapsed;
              
              // 设置节点的展开/折叠状态
              this.chartInstance.setOption({
                series: [{
                  data: this.treeChartData.map(tree => {
                    this.toggleTreeNode(tree, params.data.value, isCurrentlyExpanded);
                    return tree;
                  })
                }]
              });
            }
          });
        }
        
        this.treeChartLoading = false;
      } catch (error) {
        console.error('初始化树形图失败:', error);
        this.treeChartError = `初始化图表失败: ${error.message}`;
        this.treeChartLoading = false;
      }
    },
    
    // 递归切换节点状态
    toggleTreeNode(node, targetNodeId, shouldCollapse) {
      if (!node) return false;
      
      if (node.value === targetNodeId) {
        // 找到目标节点，设置折叠状态
        node.collapsed = shouldCollapse;
        return true;
      } else if (node.children && node.children.length > 0) {
        // 在子节点中继续查找
        for (const child of node.children) {
          if (this.toggleTreeNode(child, targetNodeId, shouldCollapse)) {
            return true;
          }
        }
      }
      
      return false;
    },
    
    // 关闭树形图模态框
    closeTreeChartModal() {
      const modalElement = document.getElementById('treeChartModal');
      if (modalElement) {
        const modal = Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
          
          // 清理资源
          if (this.chartInstance) {
            disposeChart(this.chartInstance);
            this.chartInstance = null;
          }
        }
      }
    },
    
    // 缩放控制
    zoomIn() {
      if (this.chartInstance) {
        const option = this.chartInstance.getOption();
        const zoom = option.series[0].zoom || 1;
        this.chartInstance.setOption({
          series: [{
            zoom: zoom * 1.2
          }]
        });
      }
    },
    
    zoomOut() {
      if (this.chartInstance) {
        const option = this.chartInstance.getOption();
        const zoom = option.series[0].zoom || 1;
        this.chartInstance.setOption({
          series: [{
            zoom: zoom / 1.2
          }]
        });
      }
    },
    
    resetZoom() {
      if (this.chartInstance) {
        this.chartInstance.setOption({
          series: [{
            zoom: 1
          }]
        });
      }
    },
    
    // 处理窗口大小变化
    handleWindowResize() {
      if (this.chartInstance) {
        handleChartResize(this.chartInstance);
      }
    },
  },
  
  watch: {
    // 监听 flattenedTraceData 的变化，自动更新统计信息
    flattenedTraceData: {
      handler() {
        // 更新函数调用数
        this.updateStatistics();
      },
      deep: false
    }
  }
};
</script>

<style scoped>
/* 通用样式 */
.trace-details {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 卡片样式 */
.card {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: none;
  transition: all 0.3s ease;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #eef2f7;
  padding: 1rem 1.5rem;
}

/* 表格容器 */
.trace-table-container {
  max-height: 70vh; /* 增加表格高度利用更多屏幕空间 */
  overflow-y: auto;
  position: relative;
  border-radius: 0 0 8px 8px;
}

/* 表格样式 */
.trace-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed; /* 固定表格布局提高渲染性能 */
}

.trace-table thead.sticky-top {
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.trace-table th {
  font-weight: 600;
  color: #495057;
  padding: 0.75rem 1rem;
  background-color: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
  text-align: left;
  white-space: nowrap;
}

.trace-table td {
  padding: 0.6rem 1rem; /* 减小垂直间距 */
  vertical-align: middle;
  border-bottom: 1px solid #e9ecef;
  transition: background-color 0.15s ease;
}

/* 行状态样式 */
.trace-table tr {
  transition: all 0.2s ease;
  height: 45px; /* 固定行高 */
}

.trace-table tr:hover {
  background-color: rgba(0, 123, 255, 0.05);
}

.trace-table tr.has-children {
  border-left: 3px solid #3498db;
}

.trace-table tr.is-expanded {
  background-color: rgba(52, 152, 219, 0.05);
}

.trace-table tr.is-highlighted {
  background-color: #fff8e1;
  border-left: 3px solid #ffc107;
}

.trace-table tr.is-highlighted:hover {
  background-color: #fff3cd;
}

/* 树形结构相关样式 */
.function-indent {
  position: relative;
  display: inline-block;
  height: 100%;
}

.function-indent::before {
  content: '';
  position: absolute;
  top: -21px; /* 调整连接线的顶部位置 */
  bottom: 0;
  left: 10px;
  width: 1px;
  border-left: 1px dashed #ccc;
  height: calc(100% + 21px); /* 调整连接线的总高度 */
}

.node-toggle {
  margin-right: 0.5rem;
  display: inline-flex;
}

.toggle-btn {
  padding: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #3498db;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toggle-btn:hover {
  background-color: rgba(52, 152, 219, 0.1);
  border-radius: 4px;
}

.toggle-placeholder {
  width: 22px;
  height: 22px;
  display: inline-block;
}

.function-name {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-weight: 600;
  color: #2c3e50;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  flex-grow: 1;
}

.function-name-cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.param-count .badge {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  background-color: #f0f0f0;
  color: #555;
  border: 1px solid #ddd;
}

/* 单元格样式 */
.time-cost-cell {
  white-space: nowrap;
  color: #6c757d;
  font-weight: 500;
}

.trace-id-cell {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 0.9rem;
  color: #adb5bd;
}

/* 按钮样式 */
.btn-outline-info {
  border: 2px solid #17a2b8;
  color: #17a2b8;
  background-color: transparent;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-outline-info:hover {
  background-color: #17a2b8;
  color: #fff;
}

/* 参数模态框样式 */
.param-value {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  word-break: break-all;
  white-space: pre-wrap;
  background-color: #f8f9fa;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border-left: 3px solid #17a2b8;
  font-size: 0.9rem;
  line-height: 1.5;
}

.param-content-wrapper {
  position: relative;
}

.truncated-param, .full-param {
  transition: all 0.3s ease;
}

.toggle-param-btn {
  margin-top: 8px;
  color: #17a2b8;
  background-color: transparent;
  border: 1px solid #17a2b8;
  border-radius: 4px;
  font-size: 0.8rem;
  padding: 2px 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.toggle-param-btn:hover {
  background-color: rgba(23, 162, 184, 0.1);
}

/* 统计卡片样式 */
.display-4 {
  font-weight: 600;
  color: #2c3e50;
  font-size: 2.5rem;
}

/* 内嵌统计信息样式 */
.stats-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.stat-item {
  flex: 1;
  min-width: 80px;
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 8px 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.stat-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #6c757d;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.2;
}

/* 处理暗黑模式下的统计样式 */
@media (prefers-color-scheme: dark) {
  .stat-item {
    background-color: #333333;
  }
  
  .stat-label {
    color: #a8b1bb;
  }
  
  .stat-value {
    color: #e1e1e1;
  }
}

/* 查询控制面板样式 */
.form-control {
  border-radius: 6px;
  border: 1px solid #dee2e6;
  padding: 0.5rem;
  font-size: 0.95rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.action-buttons .btn {
  padding: 0.25rem 0.5rem;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .function-name {
    max-width: 200px;
  }
  
  .display-4 {
    font-size: 2rem;
  }
  
  .trace-table-container {
    max-height: 50vh;
  }
  
  .card-body {
    padding: 1rem;
  }
}
  
/* 暗黑模式适配 */
@media (prefers-color-scheme: dark) {
  .card {
    background-color: #2d2d2d;
  }
  
  .card-header {
    background-color: #333333;
    border-color: #3d3d3d;
  }
  
  .trace-table th {
    background-color: #333333;
    color: #e1e1e1;
    border-color: #3d3d3d;
  }
  
  .trace-table td {
    border-color: #3d3d3d;
  }
  
  .trace-table tr:hover {
    background-color: rgba(52, 152, 219, 0.1);
  }
  
  .trace-table tr.is-expanded {
    background-color: rgba(52, 152, 219, 0.15);
  }
  
  .trace-table tr.is-highlighted {
    background-color: rgba(255, 193, 7, 0.15);
  }
  
  .trace-table tr.is-highlighted:hover {
    background-color: rgba(255, 193, 7, 0.25);
  }
  
  .function-name {
    color: #e1e1e1;
  }
  
  .function-indent::before {
    border-left: 1px dashed #555;
  }
  
  .param-count .badge {
    background-color: #444;
    color: #ddd;
    border-color: #555;
  }
  
  .param-value {
    background-color: #333333;
    color: #e1e1e1;
  }
  
  .display-4 {
    color: #e1e1e1;
  }
  
  .toggle-btn:hover {
    background-color: rgba(52, 152, 219, 0.25);
  }
  
  .form-control {
    background-color: #333333;
    border-color: #444444;
    color: #e1e1e1;
  }
  
  .form-control:focus {
    background-color: #3a3a3a;
    border-color: #4d7cc9;
    box-shadow: 0 0 0 0.25rem rgba(66, 133, 244, 0.25);
  }
  
  .form-label {
    color: #e1e1e1;
  }
}

/* 项目为空时的树形图标位置调整 */
.trace-table tr:not(.has-children) .node-toggle {
  opacity: 0.5;
}

/* 强调当前项的连接线 */
.trace-table tr.is-highlighted .function-indent::before {
  border-left: 1px solid #ffc107;
}

/* 展开状态的项目连接线样式 */
.trace-table tr.is-expanded .function-indent::before {
  border-left: 1px solid #3498db;
}

/* 树形图相关样式 */
.tree-chart-container {
  width: 100%;
  height: calc(100vh - 60px);
  background-color: #fff;
  position: relative;
  overflow: hidden;
}

.tree-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 1000;
}

.tree-error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 1rem;
  background-color: #fff3f3;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  color: #ff4d4f;
}

/* 暗黑模式下的树形图样式 */
@media (prefers-color-scheme: dark) {
  .tree-chart-container {
    background-color: #2d2d2d;
  }
  
  .tree-loading-overlay {
    background-color: rgba(45, 45, 45, 0.9);
    color: #e1e1e1;
  }
  
  .tree-error-message {
    background-color: rgba(255, 77, 79, 0.1);
    border-color: rgba(255, 77, 79, 0.3);
    color: #ff7875;
  }
}

/* 懒加载指示器样式 */
.lazy-load-indicator {
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  padding: 0.5rem 1rem;
}

.progress {
  height: 20px;
  border-radius: 4px;
  background-color: #e9ecef;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
}

.progress-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  transition: width 0.3s ease;
  background-color: #0d6efd;
}

/* 暗黑模式下的进度条样式 */
@media (prefers-color-scheme: dark) {
  .lazy-load-indicator {
    background-color: #333333;
    border-color: #3d3d3d;
  }
  
  .progress {
    background-color: #444444;
  }
}
</style> 