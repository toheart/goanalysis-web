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
      
      <!-- 调用链信息卡片 -->
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="bi bi-list-check me-2"></i>调用链</h5>
          <div class="controls">
            <button class="btn btn-sm btn-outline-primary me-2" @click="expandAll">
              <i class="bi bi-arrows-expand"></i> 展开全部
            </button>
            <button class="btn btn-sm btn-outline-primary" @click="collapseAll">
              <i class="bi bi-arrows-collapse"></i> 折叠全部
            </button>
          </div>
        </div>
        <div class="card-body p-0">
          <div v-if="traceData" class="trace-container p-3">
            <template v-for="(value, key) in processedTraceData" :key="key">
              <div class="stack-item" :style="{ marginLeft: value.indent*20 + 'px' }">
                <div class="trace-row" :class="{
                  'has-children': hasChildren(value), 
                  'is-collapsed': isCollapsed(value.originalIndex),
                  'is-highlighted': isHighlighted(value.id)
                }">
                  <div class="row align-items-center">
                    <div class="col-md-9 trace-info">
                      <div class="d-flex align-items-center">
                        <button v-if="hasChildren(value)" 
                                class="btn btn-sm btn-link toggle-btn me-2" 
                                @click="toggleNode(value.originalIndex)">
                          <i class="bi" :class="isCollapsed(value.originalIndex) ? 'bi-plus-circle-fill' : 'bi-dash-circle-fill'"></i>
                        </button>
                        <span v-else class="me-4 ms-1"><i class="bi bi-circle-fill function-dot"></i></span>
                        <div>
                          <p class="mb-1 function-name">{{ value.name }}</p>
                          <small class="text-muted d-block">耗时: {{ value.timeCost }}</small>
                          <small v-if="value.id" class="text-muted d-block">id: {{ value.id }}</small>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-3 text-end">
                      <button v-if="value.paramCount > 0" 
                              class="btn btn-sm btn-outline-info" 
                              @click="() => viewParameters(value.id)">
                        <i class="bi bi-list-ul me-1"></i>查看参数 ({{ value.paramCount }})
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
          <div v-else class="p-5 text-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">加载中...</span>
            </div>
            <p class="mt-3">正在加载调用链数据...</p>
          </div>
        </div>
      </div>
      
      <!-- 调用链统计信息 -->
      <div class="row mb-4" v-if="traceData">
        <div class="col-md-4">
          <div class="card h-100">
            <div class="card-body text-center">
              <h5 class="card-title"><i class="bi bi-diagram-3 me-2"></i>调用深度</h5>
              <p class="display-4">{{ maxDepth }}</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card h-100">
            <div class="card-body text-center">
              <h5 class="card-title"><i class="bi bi-clock-history me-2"></i>总耗时</h5>
              <p class="display-4">{{ totalTime }}</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card h-100">
            <div class="card-body text-center">
              <h5 class="card-title"><i class="bi bi-code-square me-2"></i>函数调用数</h5>
              <p class="display-4">{{ functionCount }}</p>
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
                    <td class="param-value">{{ param.param }}</td>
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
  </div>
</template>


<script>
import axios from '../../../axios';
import { Modal } from 'bootstrap';

export default {
  data() {
    return {
      gid: this.$route.params.gid,
      traceData: null,
      traceDataProcessed: [],
      parameters: [],
      modal: null,
      hasVerifiedPath: false,
      collapsedNodes: new Set(),
      maxDepth: 0,
      totalTime: '0ms',
      functionCount: 0,
      childrenMap: new Map(), // 存储函数的子函数
      parentMap: new Map(), // 存储函数的父函数
      expandedNodes: new Set(), // 存储展开的节点
      dbpath: '', // 当前使用的数据库路径
      highlightedFunctionId: null, // 高亮显示的函数ID
    };
  },
  computed: {
    // 处理后的追踪数据，考虑折叠状态
    processedTraceData() {
      if (!this.traceData || typeof this.traceData !== 'object') return [];
      
      try {
        const result = [];
        const traceArray = Object.values(this.traceData);
        
        // 创建一个新数组，用于存储处理后的数据
        for (let i = 0; i < traceArray.length; i++) {
          const node = traceArray[i];
          if (!node) continue;
          
          // 检查该节点是否应该显示
          let shouldShow = true;
          
          // 检查节点是否应该被隐藏（如果其父节点被折叠）
          if (node.parentId) {
            // 获取所有祖先节点
            const ancestors = this.getAncestors(node);
            
            // 检查任何祖先是否被折叠
            for (const ancestorIndex of ancestors) {
              if (this.collapsedNodes.has(ancestorIndex)) {
                shouldShow = false;
                break;
              }
            }
          }
          
          if (shouldShow) {
            // 确保节点有所有必要的属性
            const processedNode = {...node};
            processedNode.originalIndex = i;
            result.push(processedNode);
          }
        }
        
        return result;
      } catch (error) {
        console.error("Error processing trace data:", error);
        return [];
      }
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
  },
  methods: {
    // 检查是否有已验证的项目路径
    checkProjectPath() {
      const savedPath = localStorage.getItem('verifiedProjectPath');
      this.hasVerifiedPath = !!savedPath;
      
      // 如果有已验证的路径，则获取追踪详情
      if (this.hasVerifiedPath) {
        this.fetchTraceDetails();
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
    
    async fetchTraceDetails() {
      try {
        const dbpath = this.getCurrentDbPath();
        if (!dbpath) {
          console.error('数据库路径为空');
          return;
        }
        
        const response = await axios.post(`/api/runtime/traces/${this.gid}`, {
          dbpath: dbpath
        });
        this.traceData = response.data.traceData || 'No trace data available.';
        
        // 构建函数调用关系映射
        this.buildFunctionRelationships();
      } catch (error) {
        console.error("Error fetching trace details:", error);
      }
    },
    
    // 获取节点的所有祖先节点索引
    getAncestors(node) {
      if (!node || !node.parentId) return [];
      
      const ancestors = [];
      let currentParentId = Number(node.parentId);
      
      while (currentParentId) {
        const parentIndex = this.findNodeIndexByParentId(currentParentId);
        if (parentIndex === -1) break;
        
        ancestors.push(parentIndex);
        
        // 获取父节点，继续向上查找
        const parentNode = Object.values(this.traceData)[parentIndex];
        if (!parentNode || !parentNode.parentId) break;
        
        currentParentId = Number(parentNode.parentId);
      }
      
      return ancestors;
    },
    
    // 构建函数调用关系映射
    buildFunctionRelationships() {
      if (!this.traceData) return;
      
      const traceArray = Object.values(this.traceData);
      console.log('构建函数调用关系，总节点数:', traceArray.length);
      
      // 清空映射
      this.childrenMap.clear();
      this.parentMap.clear();
      
      // 检查数据结构
      const sampleNode = traceArray[0];
      console.log('节点数据结构示例:', sampleNode);
      
      // 构建直接子节点映射
      const directChildrenMap = new Map(); // id -> [childIndices]
      
      // 第一遍：建立父子关系
      let parentChildCount = 0;
      for (let i = 0; i < traceArray.length; i++) {
        const node = traceArray[i];
        if (!node) continue;
        
        if (node.parentId) {
          // 记录直接子节点关系
          if (!directChildrenMap.has(node.parentId)) {
            directChildrenMap.set(node.parentId, []);
          }
          directChildrenMap.get(node.parentId).push(i);
          parentChildCount++;
          
          // 记录父节点关系
          this.parentMap.set(i, this.findNodeIndexByParentId(node.parentId));
        }
      }
      console.log(`找到 ${parentChildCount} 个父子关系`);
      
      // 第二遍：建立函数名到子节点的映射
      let functionChildCount = 0;
      for (let i = 0; i < traceArray.length; i++) {
        const node = traceArray[i];
        if (!node) continue;
        
        // 查找该节点的所有子节点
        const childIndices = directChildrenMap.get(node.id) || [];
        
        if (childIndices.length > 0) {
          if (!this.childrenMap.has(node.name)) {
            this.childrenMap.set(node.name, []);
          }
          
          // 添加所有子节点
          for (const childIndex of childIndices) {
            this.childrenMap.get(node.name).push(childIndex);
            functionChildCount++;
          }
        }
      }
      console.log(`映射了 ${functionChildCount} 个函数子节点关系`);
      console.log('函数子节点映射:', this.childrenMap);
    },
    
    // 根据函数名查找节点索引
    findNodeIndexByName(funcName) {
      if (!funcName || !this.traceData) return -1;
      
      const traceArray = Object.values(this.traceData);
      for (let i = 0; i < traceArray.length; i++) {
        if (traceArray[i] && traceArray[i].name === funcName) {
          return i;
        }
      }
      return -1;
    },
    
    // 根据父函数ID查找节点索引
    findNodeIndexByParentId(parentId) {
      if (!parentId || !this.traceData) return -1;
      
      const traceArray = Object.values(this.traceData);
      for (let i = 0; i < traceArray.length; i++) {
        if (traceArray[i] && Number(traceArray[i].id) === Number(parentId)) {
          return i;
        }
      }
      return -1;
    },
    
    // 根据节点ID查找节点索引
    findNodeIndexById(id) {
      if (!id || !this.traceData) return -1;
      
      const traceArray = Object.values(this.traceData);
      for (let i = 0; i < traceArray.length; i++) {
        if (traceArray[i] && Number(traceArray[i].id) === Number(id)) {
          return i;
        }
      }
      return -1;
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
        this.parameters = response.data.params || []; // 修改为返回的参数格式
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
    // 检查节点是否有子节点（基于 parentId）
    hasChildren(node) {
      if (!this.traceData || !node || !node.id) return false;
      
      // 直接检查是否有以当前节点ID为父ID的节点
      const traceArray = Object.values(this.traceData);
      return traceArray.some(item => item && Number(item.parentId) === Number(node.id));
    },
    
    // 切换节点的折叠状态
    toggleNode(index) {
      const traceArray = Object.values(this.traceData);
      const node = traceArray[index];
      
      if (!node) return;
      
      console.log(`切换节点折叠状态: ${node.name} (索引: ${index}, ID: ${node.id})`);
      
      if (this.collapsedNodes.has(index)) {
        console.log(`展开节点: ${node.name}`);
        this.collapsedNodes.delete(index);
      } else {
        console.log(`折叠节点: ${node.name}`);
        this.collapsedNodes.add(index);
      }
      
      // 强制更新视图
      this.$forceUpdate();
    },
    
    // 检查节点是否已折叠
    isCollapsed(index) {
      return this.collapsedNodes.has(index);
    },
    
    // 展开所有节点
    expandAll() {
      console.log('展开所有节点');
      this.collapsedNodes.clear();
      
      // 强制更新视图
      this.$forceUpdate();
    },
    
    // 折叠所有节点
    collapseAll() {
      console.log('折叠所有节点');
      // 找出所有有子节点的节点索引
      if (this.traceData) {
        const traceArray = Object.values(this.traceData);
        this.collapsedNodes.clear();
        
        let collapsedCount = 0;
        for (let i = 0; i < traceArray.length; i++) {
          const node = traceArray[i];
          if (!node) continue;
          
          // 检查节点是否有子节点
          if (this.hasChildren(node)) {
            this.collapsedNodes.add(i);
            collapsedCount++;
          }
        }
        console.log(`折叠了 ${collapsedCount} 个节点`);
        
        // 强制更新视图
        this.$forceUpdate();
      }
    },
    
    // 计算统计信息
    calculateStats() {
      if (!this.traceData) return;
      
      // 计算最大深度
      this.maxDepth = Math.max(...this.processedTraceData.map(item => item.indent));
      
      // 计算总耗时（取第一个函数的耗时）
      if (this.traceData.length > 0) {
        this.totalTime = this.traceData[0].timeCost || '未知';
      }
      
      // 函数调用数量
      this.functionCount = this.traceData.length;
    },
    
    // 根据父函数ID获取父函数名称
    getParentFunctionName(parentId) {
      if (!parentId || !this.traceData) return '无';
      
      const traceArray = Object.values(this.traceData);
      for (let i = 0; i < traceArray.length; i++) {
        if (traceArray[i] && traceArray[i].id === parentId) {
          return traceArray[i].name;
        }
      }
      return `ID: ${parentId}`;
    },
    
    // 获取高亮函数ID
    getHighlightedFunctionId() {
      // 优先使用URL查询参数中的highlight值
      if (this.$route.query.highlight) {
        this.highlightedFunctionId = Number(this.$route.query.highlight);
        console.log('从URL获取高亮函数ID:', this.highlightedFunctionId);
        
        // 数据加载完成后滚动到高亮函数
        this.$nextTick(() => {
          setTimeout(() => {
            this.scrollToHighlightedFunction();
            this.expandToHighlightedFunction();
          }, 500);
        });
        return;
      }
      
      // 如果URL中没有，则尝试从localStorage获取
      const highlightedId = localStorage.getItem('highlightedFunctionId');
      if (highlightedId) {
        this.highlightedFunctionId = Number(highlightedId);
        
        // 清除本地存储中的高亮函数ID，避免影响其他页面
        localStorage.removeItem('highlightedFunctionId');
        
        // 在数据加载完成后滚动到高亮函数
        this.$nextTick(() => {
          setTimeout(() => {
            this.scrollToHighlightedFunction();
            this.expandToHighlightedFunction();
          }, 500);
        });
      }
    },
    
    // 滚动到高亮函数
    scrollToHighlightedFunction() {
      if (!this.highlightedFunctionId) return;
      
      const highlightedElement = document.querySelector('.trace-row.is-highlighted');
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    
    // 检查函数是否被高亮
    isHighlighted(id) {
      return this.highlightedFunctionId && Number(id) === Number(this.highlightedFunctionId);
    },
    
    // 展开到高亮函数所在的路径
    expandToHighlightedFunction() {
      if (!this.highlightedFunctionId || !this.traceData) return;
      
      // 查找高亮函数的索引
      const highlightIndex = this.findNodeIndexById(this.highlightedFunctionId);
      if (highlightIndex === -1) return;
      
      // 获取该函数的所有祖先节点，并确保它们都展开
      const node = Object.values(this.traceData)[highlightIndex];
      if (!node) return;
      
      const ancestors = this.getAncestors(node);
      
      // 确保所有祖先节点都展开
      ancestors.forEach(ancestorIndex => {
        this.collapsedNodes.delete(ancestorIndex);
      });
      
      // 强制更新视图
      this.$forceUpdate();
    },
  },
  watch: {
    processedTraceData() {
      this.calculateStats();
    }
  }
};
</script>

<style scoped>
.trace-container {
  max-height: 75vh;
  overflow-y: auto;
  padding: 1rem;
  background: #fafafa;
  border-radius: 12px;
}

.stack-item {
  position: relative;
  padding-left: 2rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.stack-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-left: 2px dashed rgba(52, 152, 219, 0.3);
  transition: opacity 0.3s ease;
}

.stack-item:last-child::before {
  height: 50%;
}

.trace-row {
  padding: 1rem;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 1rem;
  position: relative;
  border: 1px solid #eef2f7;
  transform-origin: top;
}

.trace-row:hover {
  background-color: #f8f9fa;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.trace-row.has-children {
  border-left: 4px solid #3498db;
}

.trace-row.is-collapsed {
  border-left: 4px solid #e74c3c;
}

.trace-row.is-collapsed + .stack-item {
  max-height: 0;
  margin: 0;
  opacity: 0;
  transform: translateX(-10px);
}

.stack-item {
  max-height: 1000px; /* 设置一个足够大的值 */
  opacity: 1;
  transform: translateX(0);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.trace-row.is-highlighted {
  background-color: #fff8e1;
  border-left: 4px solid #ffc107;
  box-shadow: 0 0 15px rgba(255, 193, 7, 0.3);
}

.trace-row.is-highlighted:hover {
  background-color: #fff3cd;
}

.function-name {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.toggle-btn {
  padding: 0.25rem;
  color: #3498db;
  background: transparent;
  border: none;
  font-size: 1.25rem;
  transition: all 0.3s ease;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  z-index: 1;
}

.toggle-btn::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(52, 152, 219, 0.1);
  border-radius: 50%;
  transform: scale(0);
  transition: transform 0.3s ease;
  z-index: -1;
}

.toggle-btn:hover::before {
  transform: scale(1);
}

.toggle-btn i {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.is-collapsed .toggle-btn i {
  transform: rotate(-90deg);
}

.is-collapsed .toggle-btn {
  color: #e74c3c;
}

.is-collapsed .toggle-btn:hover::before {
  background: rgba(231, 76, 60, 0.1);
}

.function-dot {
  font-size: 0.6rem;
  color: #95a5a6;
  margin-right: 0.5rem;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.trace-row:hover .function-dot {
  opacity: 1;
}

.param-value {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  word-break: break-all;
  white-space: pre-wrap;
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #3498db;
  font-size: 0.9rem;
  line-height: 1.5;
  transition: all 0.3s ease;
}

.btn-outline-info {
  border: 2px solid #3498db;
  color: #3498db;
  font-weight: 500;
  padding: 0.375rem 1rem;
  border-radius: 6px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.btn-outline-info::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(52, 152, 219, 0.1);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.3s ease, height 0.3s ease;
}

.btn-outline-info:hover::before {
  width: 200%;
  height: 200%;
}

.btn-outline-info:hover {
  background-color: #3498db;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(52, 152, 219, 0.2);
}

.card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: none;
  transition: all 0.3s ease;
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

.display-4 {
  font-weight: 600;
  color: #2c3e50;
  font-size: 2.5rem;
}

.text-muted {
  color: #6c757d !important;
  font-size: 0.9rem;
  transition: opacity 0.3s ease;
}

.trace-row:hover .text-muted {
  opacity: 0.9;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 添加折叠动画 */
@keyframes collapseOut {
  from {
    max-height: 1000px;
    opacity: 1;
    transform: translateX(0);
  }
  to {
    max-height: 0;
    opacity: 0;
    transform: translateX(-10px);
  }
}

@keyframes expandIn {
  from {
    max-height: 0;
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    max-height: 1000px;
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 768px) {
  .trace-row {
    padding: 0.75rem;
  }
  
  .trace-row .row {
    flex-direction: column;
  }
  
  .trace-row .col-md-3 {
    margin-top: 1rem;
    text-align: left !important;
  }
  
  .stack-item {
    padding-left: 1rem;
  }
  
  .function-name {
    font-size: 1rem;
  }
  
  .display-4 {
    font-size: 2rem;
  }
  
  .card {
    margin-bottom: 1rem;
  }
}

@media (prefers-color-scheme: dark) {
  .trace-container {
    background: #1a1a1a;
  }
  
  .trace-row {
    background-color: #2d2d2d;
    border-color: #3d3d3d;
  }
  
  .trace-row:hover {
    background-color: #333333;
  }
  
  .function-name {
    color: #e1e1e1;
  }
  
  .param-value {
    background-color: #333333;
    color: #e1e1e1;
  }
  
  .card {
    background-color: #2d2d2d;
  }
  
  .card-header {
    background-color: #333333;
    border-color: #3d3d3d;
  }
  
  .text-muted {
    color: #a0a0a0 !important;
  }
  
  .display-4 {
    color: #e1e1e1;
  }
  
  .toggle-btn::before {
    background: rgba(52, 152, 219, 0.05);
  }
  
  .is-collapsed .toggle-btn:hover::before {
    background: rgba(231, 76, 60, 0.05);
  }
}
</style> 