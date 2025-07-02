<template>
  <div class="function-call-tree">
    <div class="card mb-4">
      <div class="card-header">
        <h5 class="mb-0"><i class="bi bi-diagram-3 me-2"></i>函数调用关系树形表格</h5>
      </div>
      <div class="card-body">
        <!-- 函数搜索输入 -->
        <div class="row mb-4">
          <div class="col-md-8">
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input 
                type="text" 
                class="form-control" 
                placeholder="输入函数名称进行搜索" 
                v-model="searchQuery"
                @input="debouncedSearch"
                :disabled="searching"
                ref="searchInput"
              >
              <button 
                class="btn btn-primary" 
                @click="searchAndAnalyze" 
                :disabled="!searchQuery || searching"
              >
                <span v-if="searching" class="spinner-border spinner-border-sm me-2" role="status"></span>
                分析调用关系
              </button>
            </div>
            
            <!-- 搜索结果下拉框 -->
            <div v-if="searchResults.length > 0" class="search-results mt-2 position-relative">
              <div class="list-group dropdown-menu-custom show">
                <div class="dropdown-header d-flex justify-content-between align-items-center">
                  <small class="text-muted">找到 {{ searchResults.length }} 个匹配的函数</small>
                  <button type="button" class="btn-close btn-sm" @click="clearSearchResults" aria-label="关闭"></button>
                </div>
                <button 
                  v-for="(func, index) in searchResults" 
                  :key="func.key || index" 
                  class="list-group-item list-group-item-action function-item"
                  @click="selectFunction(func, !!selectedFunction)"
                  :class="{ 'active': selectedIndex === index }"
                >
                  <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                      <div class="function-name fw-bold text-primary">
                        <i class="bi bi-code-square me-1"></i>
                        {{ func.name }}
                      </div>
                      <div class="function-details mt-1">
                        <small class="text-muted d-block">
                          <i class="bi bi-box me-1"></i>
                          包名: {{ func.package || '未知' }}
                        </small>
                        <small class="text-muted d-block" v-if="func.key">
                          <i class="bi bi-key me-1"></i>
                          键值: <code class="small">{{ func.key }}</code>
                        </small>
                      </div>
                    </div>
                    <div class="function-stats ms-3">
                      <div v-if="func.callCount" class="text-center">
                        <span class="badge bg-primary rounded-pill">{{ func.callCount }}</span>
                        <small class="d-block text-muted mt-1">调用次数</small>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="alert alert-info mb-0">
              <h6><i class="bi bi-info-circle me-2"></i>使用说明</h6>
              <p class="mb-0 small">搜索函数后将以树形表格展示其调用关系，点击展开按钮可查看更多层级。</p>
            </div>
          </div>
        </div>
        
        <!-- 导航面包屑 -->
        <div v-if="navigationHistory.length > 0" class="navigation-breadcrumb mb-3">
          <nav aria-label="函数分析导航">
            <ol class="breadcrumb mb-0">
              <li class="breadcrumb-item">
                <button class="btn btn-link p-0 text-decoration-none" @click="goBackToFirst">
                  <i class="bi bi-house me-1"></i>首次分析
                </button>
              </li>
              <li 
                v-for="(item, index) in navigationHistory.slice(0, -1)" 
                :key="index"
                class="breadcrumb-item"
              >
                <button 
                  class="btn btn-link p-0 text-decoration-none" 
                  @click="goBackToLevel(index)"
                >
                  {{ item.function.name }}
                </button>
              </li>
              <li class="breadcrumb-item active" aria-current="page">
                {{ selectedFunction?.name }}
                <button 
                  v-if="navigationHistory.length > 1"
                  class="btn btn-sm btn-outline-secondary ms-2" 
                  @click="goBackToPrevious"
                  title="返回上一层"
                >
                  <i class="bi bi-arrow-left me-1"></i>返回
                </button>
              </li>
            </ol>
          </nav>
        </div>

        <!-- 当前分析函数信息 -->
        <div v-if="selectedFunction" class="controls-panel mb-3">
          <div class="card bg-light">
            <div class="card-body py-3">
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <h6 class="mb-2"><i class="bi bi-gear me-2"></i>当前分析函数</h6>
                  <div class="function-info">
                    <div class="row">
                      <div class="col-md-6">
                        <div class="info-item">
                          <label class="info-label">函数名:</label>
                          <span class="info-value text-primary fw-bold">{{ selectedFunction.name }}</span>
                        </div>
                        <div class="info-item">
                          <label class="info-label">包名:</label>
                          <span class="info-value text-muted">{{ selectedFunction.package || '未知' }}</span>
                        </div>
                      </div>
                      <div class="col-md-6">
                        <div class="info-item" v-if="selectedFunction.key">
                          <label class="info-label">函数键:</label>
                          <span class="info-value text-secondary small font-monospace">{{ selectedFunction.key }}</span>
                        </div>
                        <div class="info-item" v-if="selectedFunction.callCount">
                          <label class="info-label">调用次数:</label>
                          <span class="badge bg-primary rounded-pill">{{ selectedFunction.callCount }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="navigationHistory.length > 0" class="ms-3">
                  <button 
                    class="btn btn-outline-primary btn-sm" 
                    @click="clearNavigationHistory"
                    title="清除导航历史"
                  >
                    <i class="bi bi-arrow-counterclockwise me-1"></i>重置
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 树形表格容器 -->
        <div class="tree-table-container">
          <!-- 加载状态 -->
          <div v-if="loading" class="loading-overlay">
            <div class="text-center">
              <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">加载中...</span>
              </div>
              <div>正在加载调用关系数据...</div>
            </div>
          </div>
          
          <!-- 树形表格 -->
          <div v-else-if="treeData.length > 0" class="tree-table">
            <div class="table-responsive">
              <table class="table table-hover">
                <thead class="table-light">
                  <tr>
                    <th style="width: 50%">
                      <i class="bi bi-diagram-3 me-2"></i>函数调用关系
                    </th>
                    <th style="width: 20%">
                      <i class="bi bi-box me-1"></i>包名
                    </th>
                    <th style="width: 15%">
                      <i class="bi bi-arrow-repeat me-1"></i>调用次数
                    </th>
                    <th style="width: 15%">
                      <i class="bi bi-gear me-1"></i>操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tree-node
                    v-for="node in treeData"
                    :key="node.id"
                    :node="node"
                    :level="0"
                    @expand="handleExpand"
                    @collapse="handleCollapse"
                    @analyze-function="handleAnalyzeFunction"
                  />
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-else-if="!selectedFunction" class="empty-state">
            <div class="text-center py-5">
              <i class="bi bi-diagram-3 display-4 text-muted"></i>
              <h4 class="mt-3">请搜索并选择函数</h4>
              <p class="text-muted">输入函数名称搜索后，将展示其调用关系树形表格</p>
            </div>
          </div>

          <!-- 无数据状态 -->
          <div v-else class="no-data-state">
            <div class="text-center py-5">
              <i class="bi bi-exclamation-circle display-4 text-warning"></i>
              <h4 class="mt-3">暂无调用关系数据</h4>
              <p class="text-muted">该函数暂无上游或下游调用关系</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from '../../axios';
import debounce from 'lodash/debounce';
import TreeNode from './TreeNode.vue';

export default {
  name: 'FunctionCallTree',
  components: {
    TreeNode
  },
  props: {
    dbFilePath: {
      type: String,
      required: true
    },
    initialFunction: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      searchQuery: '',
      searching: false,
      searchResults: [],
      selectedFunction: null,
      selectedIndex: -1,
      loading: false,
      treeData: [],
      expandedNodes: new Set(),
      navigationHistory: [] // 导航历史栈
    };
  },
  created() {
    this.debouncedSearch = debounce(this.searchFunctions, 300);
  },
  watch: {
    initialFunction: {
      handler(newFunc) {
        if (newFunc && newFunc.name) {
          this.selectedFunction = newFunc;
          this.searchQuery = newFunc.name;
          this.loadFunctionCallTree(newFunc);
        }
      },
      immediate: true
    }
  },
  methods: {
    // 搜索函数
    async searchFunctions() {
      if (!this.searchQuery || this.searchQuery.length < 2) {
        this.searchResults = [];
        this.selectedIndex = -1;
        return;
      }

      if (this.searching) return;
      
      this.searching = true;
      this.selectedIndex = -1;
      
      try {
        const decodedPath = decodeURIComponent(this.dbFilePath);
        const response = await axios.post('/api/static/search-functions', {
          dbPath: decodedPath,
          query: this.searchQuery.trim()
        }, {
          timeout: 10000
        });

        this.searchResults = response.data?.functions?.slice(0, 50) || [];
      } catch (error) {
        this.searchResults = [];
        if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
          this.$message?.warning('搜索请求超时，请重试');
        } else {
          this.$message?.error('搜索函数失败: ' + (error.response?.data?.message || error.message));
        }
      } finally {
        this.searching = false;
      }
    },
    
    // 搜索并分析
    searchAndAnalyze() {
      if (this.searchResults.length > 0) {
        // 第一次搜索不添加到历史记录
        this.selectFunction(this.searchResults[0], false);
      } else {
        this.searchFunctions();
      }
    },
    
    // 选择函数
    selectFunction(func, addToHistory = true) {
      if (!func || !func.name) {
        return;
      }

      // 如果需要添加到历史记录，且当前有选中的函数，则保存当前状态
      if (addToHistory && this.selectedFunction) {
        this.addToNavigationHistory(this.selectedFunction, this.treeData);
      }

      this.selectedFunction = func;
      this.searchResults = [];
      this.selectedIndex = -1;
      this.searchQuery = func.name;
      this.expandedNodes.clear();
      this.treeData = [];
      
      this.loadFunctionCallTree(func);
    },

    // 加载函数调用关系树
    async loadFunctionCallTree(func) {
      if (!func || !func.name || this.loading) return;

      this.loading = true;
      
      try {
        const decodedPath = decodeURIComponent(this.dbFilePath);
        
        // 并行获取上游和下游数据
        const [upstreamResponse, downstreamResponse] = await Promise.allSettled([
          axios.post('/api/static/function-upstream', {
            dbPath: decodedPath,
            functionKey: func.key || func.id,
            functionPackage: func.package,
            depth: 2
          }),
          axios.post('/api/static/function-downstream', {
            dbPath: decodedPath,
            functionKey: func.key || func.id,
            functionPackage: func.package,
            depth: 2
          })
        ]);

        // 创建根节点
        const rootNode = {
          key: func.key || func.id,
          name: func.name,
          package: func.package,
          fullName: `${func.package}.${func.name}`,
          type: 'root',
          callCount: func.callCount || 0,
          isExpanded: true,
          isExpandable: false,
          children: [],
          level: 0
        };

        // 处理上游数据
        if (upstreamResponse.status === 'fulfilled' && upstreamResponse.value?.data?.nodes) {
          const upstreamNodes = this.processUpstreamNodes(upstreamResponse.value.data.nodes, func.key || func.id);
          if (upstreamNodes.length > 0) {
            rootNode.children.push({
              key: `${rootNode.key}_upstream`,
              name: '📞 调用者',
              package: '',
              type: 'upstream_group',
              callCount: upstreamNodes.length,
              isExpanded: false,
              isExpandable: upstreamNodes.length > 0,
              children: upstreamNodes,
              level: 1
            });
            rootNode.isExpandable = true;
          }
        }

        // 处理下游数据
        if (downstreamResponse.status === 'fulfilled' && downstreamResponse.value?.data?.nodes) {
          const downstreamNodes = this.processDownstreamNodes(downstreamResponse.value.data.nodes, func.key || func.id);
          if (downstreamNodes.length > 0) {
            rootNode.children.push({
              key: `${rootNode.key}_downstream`,
              name: '📱 被调用者',
              package: '',
              type: 'downstream_group',
              callCount: downstreamNodes.length,
              isExpanded: false,
              isExpandable: downstreamNodes.length > 0,
              children: downstreamNodes,
              level: 1
            });
            rootNode.isExpandable = true;
          }
        }

        this.treeData = [rootNode];
        
      } catch (error) {
        console.error('加载函数调用关系失败:', error);
        this.$message?.error('分析调用关系失败: ' + (error.response?.data?.message || error.message));
        this.treeData = [];
      } finally {
        this.loading = false;
      }
    },

    // 处理上游节点数据
    processUpstreamNodes(nodes, rootNodeKey) {
      return nodes
        .filter(node => node.key !== rootNodeKey)
        .map(node => ({
          key: node.key,
          name: node.name,
          package: node.package,
          fullName: `${node.package}.${node.name}`,
          type: 'upstream',
          callCount: node.callCount || 0,
          isExpanded: false,
          isExpandable: true, // 可以进一步展开
          children: [],
          level: 2
        }));
    },

    // 处理下游节点数据
    processDownstreamNodes(nodes, rootNodeKey) {
      return nodes
        .filter(node => node.key !== rootNodeKey)
        .map(node => ({
          key: node.key,
          name: node.name,
          package: node.package,
          fullName: `${node.package}.${node.name}`,
          type: 'downstream',
          callCount: node.callCount || 0,
          isExpanded: false,
          isExpandable: true, // 可以进一步展开
          children: [],
          level: 2
        }));
    },

    // 处理节点展开
    async handleExpand(node) {
      if (!node.isExpandable || node.children.length > 0) {
        node.isExpanded = true;
        this.expandedNodes.add(node.key);
        return;
      }

      // 懒加载子节点
      if (node.type === 'upstream' || node.type === 'downstream') {
        await this.loadNodeChildren(node);
      }

      node.isExpanded = true;
      this.expandedNodes.add(node.key);
    },

    // 处理节点收起
    handleCollapse(node) {
      node.isExpanded = false;
      this.expandedNodes.delete(node.key);
    },

    // 懒加载节点的子节点
    async loadNodeChildren(node) {
      try {
        const decodedPath = decodeURIComponent(this.dbFilePath);
        
        let response;
        if (node.type === 'upstream') {
          // 获取该节点的上游调用者
          response = await axios.post('/api/static/function-upstream', {
            dbPath: decodedPath,
            functionKey: node.key,
            functionPackage: node.package,
            depth: 1
          });
        } else if (node.type === 'downstream') {
          // 获取该节点的下游被调用者
          response = await axios.post('/api/static/function-downstream', {
            dbPath: decodedPath,
            functionKey: node.key,
            functionPackage: node.package,
            depth: 1
          });
        }

        if (response?.data?.nodes) {
          const childNodes = response.data.nodes
            .filter(childNode => childNode.key !== node.key)
            .map(childNode => ({
              key: childNode.key,
              name: childNode.name,
              package: childNode.package,
              fullName: `${childNode.package}.${childNode.name}`,
              type: node.type,
              callCount: childNode.callCount || 0,
              isExpanded: false,
              isExpandable: true,
              children: [],
              level: node.level + 1
            }));

          node.children = childNodes;
          node.isExpandable = childNodes.length > 0;
        }
      } catch (error) {
        console.error('加载子节点失败:', error);
        this.$message?.error('加载子节点失败');
      }
    },

    // 清除搜索结果
    clearSearchResults() {
      this.searchResults = [];
      this.selectedIndex = -1;
    },

    // 处理分析函数事件
    handleAnalyzeFunction(functionData) {
      if (functionData && (functionData.key || functionData.name)) {
        // 重新分析选中的函数（添加到历史记录）
        this.selectFunction({
          key: functionData.key,
          name: functionData.name,
          package: functionData.package,
          callCount: functionData.callCount
        }, true);
      }
    },

    // 添加到导航历史
    addToNavigationHistory(func, treeData) {
      const historyItem = {
        function: { ...func },
        treeData: JSON.parse(JSON.stringify(treeData)),
        timestamp: Date.now()
      };
      this.navigationHistory.push(historyItem);
      
      // 限制历史记录数量，避免内存过大
      if (this.navigationHistory.length > 10) {
        this.navigationHistory.shift();
      }
    },

    // 返回上一层
    goBackToPrevious() {
      if (this.navigationHistory.length === 0) return;
      
      const previousState = this.navigationHistory.pop();
      this.restoreNavigationState(previousState);
    },

    // 返回到指定层级
    goBackToLevel(targetIndex) {
      if (targetIndex < 0 || targetIndex >= this.navigationHistory.length) return;
      
      // 获取目标状态
      const targetState = this.navigationHistory[targetIndex];
      
      // 移除目标索引之后的所有历史记录
      this.navigationHistory = this.navigationHistory.slice(0, targetIndex);
      
      this.restoreNavigationState(targetState);
    },

    // 返回到首次分析
    goBackToFirst() {
      if (this.navigationHistory.length === 0) return;
      
      const firstState = this.navigationHistory[0];
      this.navigationHistory = [];
      this.restoreNavigationState(firstState);
    },

    // 恢复导航状态
    restoreNavigationState(state) {
      this.selectedFunction = { ...state.function };
      this.treeData = JSON.parse(JSON.stringify(state.treeData));
      this.searchQuery = state.function.name;
      this.expandedNodes.clear();
      this.loading = false;
    },

    // 清除导航历史
    clearNavigationHistory() {
      this.navigationHistory = [];
    }
  }
};
</script>

<style scoped>
.function-call-tree {
  max-width: 100%;
}

.tree-table-container {
  position: relative;
  min-height: 400px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: #fafafa;
}

.tree-table {
  background: white;
  border-radius: 8px;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  z-index: 10;
}

.empty-state,
.no-data-state {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-results {
  max-height: 400px;
  overflow-y: auto;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  z-index: 1050;
}

.dropdown-menu-custom {
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 0;
  background: white;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.dropdown-header {
  padding: 0.75rem 1rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  border-radius: 12px 12px 0 0;
}

.function-item {
  border: none;
  padding: 1rem;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
}

.function-item:hover,
.function-item.active {
  background-color: #e7f3ff;
  border-color: #0d6efd;
  transform: translateX(2px);
}

.function-item:not(:last-child) {
  border-bottom: 1px solid #f1f3f4;
}

.function-name {
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
}

.function-details {
  line-height: 1.3;
}

.function-stats {
  min-width: 80px;
}

.function-info .info-item {
  margin-bottom: 0.5rem;
}

.function-info .info-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6c757d;
  margin-right: 0.5rem;
  min-width: 60px;
  display: inline-block;
}

.function-info .info-value {
  font-size: 0.9rem;
}

.controls-panel .card {
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-radius: 12px;
}

.table {
  margin-bottom: 0;
}

.table th {
  font-weight: 600;
  font-size: 0.9rem;
  border-bottom: 2px solid #dee2e6;
  background-color: #f8f9fa;
}

/* 导航面包屑样式 */
.navigation-breadcrumb {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.navigation-breadcrumb .breadcrumb {
  background: transparent;
  padding: 0;
  margin: 0;
}

.navigation-breadcrumb .breadcrumb-item {
  font-size: 0.9rem;
}

.navigation-breadcrumb .breadcrumb-item + .breadcrumb-item::before {
  content: "›";
  color: #6c757d;
  font-weight: bold;
}

.navigation-breadcrumb .btn-link {
  color: #0d6efd;
  text-decoration: none;
  font-size: 0.9rem;
  padding: 0;
  border: none;
  background: none;
}

.navigation-breadcrumb .btn-link:hover {
  color: #0b5ed7;
  text-decoration: underline;
}

.navigation-breadcrumb .breadcrumb-item.active {
  color: #6c757d;
  font-weight: 600;
}

.navigation-breadcrumb .breadcrumb-item.active .btn {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  line-height: 1.2;
}

@media (max-width: 768px) {
  .tree-table-container {
    min-height: 300px;
  }
  
  .controls-panel .row {
    flex-direction: column;
  }
  
  .controls-panel .col-md-6:last-child {
    margin-top: 1rem;
  }

  .navigation-breadcrumb {
    padding: 0.5rem;
  }

  .navigation-breadcrumb .breadcrumb-item {
    font-size: 0.8rem;
  }

  .navigation-breadcrumb .btn-link {
    font-size: 0.8rem;
  }
}
</style> 