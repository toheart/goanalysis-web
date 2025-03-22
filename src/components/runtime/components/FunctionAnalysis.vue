<template>
  <div class="function-analysis">
    <!-- 搜索部分 -->
    <div class="card mb-4 search-section">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0"><i class="bi bi-search me-2"></i>{{ t('runtimeAnalysis.functionAnalysis.title') }}</h5>
      </div>
      <div class="card-body">
        <!-- 搜索框区域 -->
        <div class="d-flex align-items-center mb-3">
          <div class="search-icon me-2">
            <i class="bi bi-code-square"></i>
          </div>
          <div class="flex-grow-1">
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              :placeholder="t('runtimeAnalysis.functionAnalysis.inputFunctionName')"
              class="form-control"
              @input="handleInput"
              @keydown.down="onDown"
              @keydown.up="onUp"
              @keydown.enter="onEnter"
              @keydown.esc="hideDropdown"
              autocomplete="off"
            />
          </div>
          <div class="ms-2">
            <button class="btn btn-primary" @click="search">
              <i class="bi bi-search me-1"></i> {{ t('runtimeAnalysis.functionAnalysis.search') }}
            </button>
          </div>
        </div>
        
        <!-- 搜索建议区域 - 以卡片形式展示 -->
        <div v-if="showDropdown && filteredItems.length > 0" class="search-suggestions-card mt-2">
          <div class="suggestions-header px-3 py-2 bg-light border-bottom">
            <small><i class="bi bi-info-circle me-1"></i>{{ t('runtimeAnalysis.functionAnalysis.foundCount', { count: filteredItems.length }) }}</small>
          </div>
          <div class="suggestions-body" style="max-height: 300px; overflow-y: auto;">
            <div 
              v-for="(item, index) in filteredItems" 
              :key="index"
              class="suggestion-item p-2"
              :class="{'active': index === activeIndex}"
              @click="selectItem(item)"
              @mouseover="activeIndex = index"
            >
              <div class="d-flex align-items-center">
                <div class="function-icon me-2">
                  <i class="bi bi-code-square"></i>
                </div>
                <div>
                  <div v-html="highlightText(item.name, searchQuery)"></div>
                  <small v-if="item.package" class="text-muted">{{ item.package }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 函数信息显示区域 -->
    <div v-if="selectedFunction" class="function-info mb-4">
      
      <!-- 选中函数显示区域 -->
      <div class="selected-function mt-4">
        <div class="card function-card">
          <div class="card-header function-header">
            <i class="bi bi-code-square  me-2"></i>
            <strong class="text-primary">{{ selectedFunction.name }}</strong>
          </div>
          <div class="card-body">
            <div v-if="loading" class="d-flex justify-content-center align-items-center p-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">加载中...</span>
              </div>
            </div>
            <div v-else>
              <!-- 函数信息 -->
              <div class="mb-3">
                <div class="d-flex align-items-center mb-2">
                  <i class="bi bi-archive me-2"></i>
                  <span class="text-muted">{{ $t('runtimeAnalysis.functionAnalysis.packagePath') }}:</span>
                  <span class="ms-2">{{ selectedFunction.package || '无' }}</span>
                </div>
              </div>
              
              <!-- 性能指标卡片 -->
              <div class="row mb-4">
                <div class="col-md-4 mb-4">
                  <div class="card h-100 metric-card">
                    <div class="card-body text-center">
                      <h6 class="card-title d-flex align-items-center justify-content-center">
                        <i class="bi bi-telephone-outbound me-2"></i>
                        <span>{{ $t('runtimeAnalysis.functionAnalysis.callCount') }}</span>
                      </h6>
                      <p class="display-6">{{ functionStats.callCount || 0 }}</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-4 mb-4">
                  <div class="card h-100 metric-card">
                    <div class="card-body text-center">
                      <h6 class="card-title d-flex align-items-center justify-content-center">
                        <i class="bi bi-clock-history me-2"></i>
                        <span>{{ $t('runtimeAnalysis.functionAnalysis.avgTime') }}</span>
                      </h6>
                      <p class="display-6">{{ formatTime(functionStats.avgTime) }} <small>ms</small></p>
                    </div>
                  </div>
                </div>
                <div class="col-md-4 mb-4">
                  <div class="card h-100 metric-card">
                    <div class="card-body text-center">
                      <h6 class="card-title d-flex align-items-center justify-content-center">
                        <i class="bi bi-lightning-charge me-2"></i>
                        <span>{{ $t('runtimeAnalysis.functionAnalysis.maxTime') }}</span>
                      </h6>
                      <p class="display-6">{{ formatTime(functionStats.maxTime) }} <small>ms</small></p>
                    </div>
                  </div>
                </div>
              </div>
            
              <!-- 函数调用分析部分 -->
              <div class="card mb-4">
                <div class="card-header">
                  <ul class="nav nav-tabs card-header-tabs">
                    <li class="nav-item">
                      <a class="nav-link" :class="{ active: activeTab === 'callers' }" href="#" @click.prevent="activeTab = 'callers'">
                        <i class="bi bi-arrow-down-circle me-1"></i>调用者
                      </a>
                    </li>
                    <li class="nav-item">
                      <a class="nav-link" :class="{ active: activeTab === 'callees' }" href="#" @click.prevent="activeTab = 'callees'">
                        <i class="bi bi-arrow-up-circle me-1"></i>被调用者
                      </a>
                    </li>
                    <li class="nav-item">
                      <a class="nav-link" :class="{ active: activeTab === 'tree' }" href="#" @click.prevent="activeTab = 'tree'">
                        <i class="bi bi-diagram-3 me-1"></i>调用树
                      </a>
                    </li>
                  </ul>
                </div>
                <div class="card-body">
                  <!-- 加载状态 -->
                  <div v-if="loading" class="text-center py-3">
                    <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">{{ t('common.loading') }}</span>
                    </div>
                  </div>
                  
                  <!-- 调用者表格 -->
                  <div v-else-if="activeTab === 'callers'" class="table-responsive">
                    <p class="text-muted mb-2">{{ $t('runtimeAnalysis.functionAnalysis.callersList', { name: selectedFunction.name }) }}：</p>
                    <table class="table table-hover" v-if="functionData.callers && functionData.callers.length">
                      <thead>
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col">{{ $t('runtimeAnalysis.functionAnalysis.functionName') }}</th>
                          <th scope="col">{{ $t('runtimeAnalysis.functionAnalysis.packagePath') }}</th>
                          <th scope="col">{{ $t('runtimeAnalysis.functionAnalysis.callCount') }}</th>
                          <th scope="col">{{ $t('runtimeAnalysis.functionAnalysis.avgTime') }}</th>
                          <th scope="col">{{ $t('runtimeAnalysis.functionAnalysis.operations') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(caller, index) in functionData.callers" :key="caller.id || caller.name">
                          <td>{{ index + 1 }}</td>
                          <td>{{ caller.name }}</td>
                          <td><span class="badge bg-light text-dark">{{ caller.package || $t('runtimeAnalysis.functionAnalysis.none') }}</span></td>
                          <td><span class="badge bg-primary">{{ caller.callCount || 0 }}</span></td>
                          <td><span class="badge bg-info">{{ formatTime(caller.avgTime) }} ms</span></td>
                          <td>
                            <button class="btn btn-sm btn-outline-primary" @click="selectItem(caller)">
                              <i class="bi bi-box-arrow-in-right me-1"></i>{{ $t('runtimeAnalysis.functionAnalysis.analyze') }}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div v-else class="alert alert-info">
                      <i class="bi bi-info-circle me-2"></i>{{ $t('runtimeAnalysis.functionAnalysis.noCallers') }}
                    </div>
                  </div>
                  
                  <!-- 被调用者表格 -->
                  <div v-else-if="activeTab === 'callees'" class="table-responsive">
                    <p class="text-muted mb-2">{{ $t('runtimeAnalysis.functionAnalysis.calleesList', { name: selectedFunction.name }) }}：</p>
                    <table class="table table-hover" v-if="functionData.callees && functionData.callees.length">
                      <thead>
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col">{{ $t('runtimeAnalysis.functionAnalysis.functionName') }}</th>
                          <th scope="col">{{ $t('runtimeAnalysis.functionAnalysis.packagePath') }}</th>
                          <th scope="col">{{ $t('runtimeAnalysis.functionAnalysis.callCount') }}</th>
                          <th scope="col">{{ $t('runtimeAnalysis.functionAnalysis.avgTime') }}</th>
                          <th scope="col">{{ $t('runtimeAnalysis.functionAnalysis.operations') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(callee, index) in functionData.callees" :key="callee.id || callee.name">
                          <td>{{ index + 1 }}</td>
                          <td>{{ callee.name }}</td>
                          <td><span class="badge bg-light text-dark">{{ callee.package || $t('runtimeAnalysis.functionAnalysis.none') }}</span></td>
                          <td><span class="badge bg-success">{{ callee.callCount || 0 }}</span></td>
                          <td><span class="badge bg-info">{{ formatTime(callee.avgTime) }} ms</span></td>
                          <td>
                            <button class="btn btn-sm btn-outline-primary" @click="selectItem(callee)">
                              <i class="bi bi-box-arrow-in-right me-1"></i>{{ $t('runtimeAnalysis.functionAnalysis.analyze') }}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div v-else class="alert alert-info">
                      <i class="bi bi-info-circle me-2"></i>{{ $t('runtimeAnalysis.functionAnalysis.noCallees') }}
                    </div>
                  </div>
                  
                  <!-- 树状图展示 -->
                  <div v-else-if="activeTab === 'tree'" class="tree-view">
                    <div class="mb-3">
                      <div class="d-flex align-items-center mb-2">
                        <div class="me-3">
                          <label class="form-label">链类型：</label>
                          <select v-model="chainType" class="form-select form-select-sm" @change="loadTreeGraph">
                            <option value="upstream">上游调用链</option>
                            <option value="downstream">下游调用链</option>
                            <option value="full">完整调用链</option>
                          </select>
                        </div>
                        <div>
                          <label class="form-label">深度：</label>
                          <select v-model="treeDepth" class="form-select form-select-sm" @change="loadTreeGraph">
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div v-if="loadingTree" class="py-5 text-center">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">加载中...</span>
                      </div>
                      <div class="mt-2">加载调用树数据...</div>
                    </div>
                    
                    <div v-else-if="treeData.length === 0" class="alert alert-info">
                      <i class="bi bi-info-circle me-2"></i>没有可用的调用树数据
                    </div>
                    
                    <div v-else class="tree-container">
                      <div class="card">
                        <div class="card-body">
                          <div class="tree-node" v-for="(tree, index) in treeData" :key="index">
                            <div class="tree-root">
                              <i class="bi bi-diagram-3 me-2"></i>
                              <strong>{{ tree.name }}</strong>
                            </div>
                            <div class="tree-children ps-4 mt-2">
                              <template v-if="tree.children && tree.children.length">
                                <div v-for="(child, childIndex) in tree.children" :key="childIndex">
                                  <tree-node :node="child" @select-function="handleTreeNodeClick" />
                                </div>
                              </template>
                              <div v-else class="text-muted">
                                <i class="bi bi-info-circle me-2"></i>没有子节点
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!selectedFunction && !loading" class="empty-state text-center">
      <div class="py-5">
        <i class="bi bi-search display-4 text-muted"></i>
        <h4 class="mt-3">{{ t('runtimeAnalysis.functionAnalysis.searchToAnalyze') }}</h4>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="d-flex justify-content-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('common.loading') }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, nextTick, watch, defineAsyncComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from '../../../axios';
import debounce from 'lodash/debounce';

// 使用defineAsyncComponent异步加载TreeNode组件
const TreeNode = defineAsyncComponent(() => import('./TreeNode.vue'));

export default {
  name: 'FunctionAnalysis',
  
  components: {
    TreeNode // 注册TreeNode组件
  },
  
  setup() {
    const { t } = useI18n();
    // 初始化项目路径
    const currentDbPath = ref(localStorage.getItem('verifiedProjectPath') || '');
    const searchQuery = ref('');
    const showDropdown = ref(false);
    const activeIndex = ref(-1);
    const items = ref([]);
    const loading = ref(false);
    const searchInput = ref(null);
    const selectedFunction = ref(null);
    const activeTab = ref('callers');
    const functionData = ref({
      callers: [],
      callees: []
    });
    const functionStats = ref({
      callCount: 0,
      avgTime: 0,
      maxTime: 0,
      successRate: 0,
      successCount: 0
    });
    
    // 树状图相关
    const chainType = ref('full');
    const treeDepth = ref('3');
    const treeData = ref([]);
    const loadingTree = ref(false);

    // 过滤后的项目
    const filteredItems = computed(() => {
      return items.value;
    });

    // 获取函数列表
    const fetchFunctions = async (query) => {
      if (!currentDbPath.value || !query) {
        items.value = [];
        return;
      }

      loading.value = true;

      try {
        const response = await axios.post('/api/runtime/functions/search', {
          dbpath: currentDbPath.value,
          query: query,
          limit: 10
        });

        items.value = response.data.functions || [];
        
        if (items.value.length > 0) {
          showDropdown.value = true;
          activeIndex.value = -1;
        } else {
          showDropdown.value = false;
        }
      } catch (error) {
        console.error('获取函数列表失败:', error);
        items.value = [];
        showDropdown.value = false;
      } finally {
        loading.value = false;
      }
    };

    // 防抖处理
    const debouncedFetch = debounce(fetchFunctions, 300);

    // 处理输入
    const handleInput = () => {
      if (searchQuery.value.length > 0) {
        debouncedFetch(searchQuery.value);
      } else {
        items.value = [];
        showDropdown.value = false;
      }
    };

    // 键盘导航 - 下
    const onDown = (e) => {
      e.preventDefault();
      if (!showDropdown.value) {
        showDropdown.value = true;
        return;
      }
      
      if (filteredItems.value.length === 0) return;
      
      activeIndex.value = activeIndex.value < filteredItems.value.length - 1 
        ? activeIndex.value + 1 
        : 0;
      
      scrollToActive();
    };

    // 键盘导航 - 上
    const onUp = (e) => {
      e.preventDefault();
      if (!showDropdown.value || filteredItems.value.length === 0) return;
      
      activeIndex.value = activeIndex.value > 0 
        ? activeIndex.value - 1 
        : filteredItems.value.length - 1;
      
      scrollToActive();
    };

    // 确保活动项在视图中
    const scrollToActive = () => {
      nextTick(() => {
        const activeEl = document.querySelector('.suggestion-item.active');
        if (activeEl) {
          activeEl.scrollIntoView({ block: 'nearest' });
        }
      });
    };

    // 处理回车
    const onEnter = () => {
      if (showDropdown.value && activeIndex.value >= 0 && activeIndex.value < filteredItems.value.length) {
        selectItem(filteredItems.value[activeIndex.value]);
      } else {
        search();
      }
    };

    // 隐藏下拉框
    const hideDropdown = () => {
      showDropdown.value = false;
    };

    // 选择项目
    const selectItem = (item) => {
      searchQuery.value = item.name;
      selectedFunction.value = item;
      hideDropdown();
      // 在这里调用函数分析相关API获取更多数据
      analyzeFunctionDetails(item.name);
    };

    // 分析函数详情
    const analyzeFunctionDetails = async (functionName) => {
      if (!currentDbPath.value || !functionName) return;
      
      loading.value = true;
      try {
        // 初始化函数数据结构
        functionData.value = {
          callers: [],
          callees: []
        };
        
        // 获取被调用者（子函数）
        try {
          // 优先使用专门的子函数接口
          const childFunctionsResponse = await axios.post('/api/runtime/functions/children', {
            dbpath: currentDbPath.value,
            parentId: functionName // 使用函数名作为父ID参数
          });
          
          if (childFunctionsResponse.data && childFunctionsResponse.data.functions) {
            functionData.value.callees = childFunctionsResponse.data.functions
              .sort((a, b) => (b.callCount || 0) - (a.callCount || 0));
          } else {
            // 如果专门的接口没有返回数据，回退到函数分析数据
            const functionAnalysisResponse = await axios.post('/api/runtime/function/analysis', {
              dbpath: currentDbPath.value,
              functionName: functionName,
              type: 'full' // 获取完整的调用关系
            });
            
            if (functionAnalysisResponse.data && functionAnalysisResponse.data.callData) {
              // 提取被调用函数（子函数）
              const calleesData = [];
              const processNode = (node) => {
                if (node.children && node.children.length > 0) {
                  node.children.forEach(child => {
                    calleesData.push({
                      name: child.name,
                      package: child.package || '',
                      callCount: child.callCount || 0,
                      avgTime: child.avgTime || '0'
                    });
                    processNode(child);
                  });
                }
              };
              
              // 处理根节点及其子节点
              const rootNodes = functionAnalysisResponse.data.callData;
              rootNodes.forEach(node => processNode(node));
              
              // 去重并排序
              const uniqueCallees = Array.from(
                new Map(calleesData.map(item => [item.name, item])).values()
              ).sort((a, b) => b.callCount - a.callCount);
              
              functionData.value.callees = uniqueCallees;
            }
          }
        } catch (error) {
          console.error('获取函数被调用者数据失败:', error);
          
          // 发生错误时回退到函数分析数据
          try {
            const functionAnalysisResponse = await axios.post('/api/runtime/function/analysis', {
              dbpath: currentDbPath.value,
              functionName: functionName,
              type: 'full'
            });
            
            if (functionAnalysisResponse.data && functionAnalysisResponse.data.callData) {
              // 提取被调用函数（子函数）
              const calleesData = [];
              const processNode = (node) => {
                if (node.children && node.children.length > 0) {
                  node.children.forEach(child => {
                    calleesData.push({
                      name: child.name,
                      package: child.package || '',
                      callCount: child.callCount || 0,
                      avgTime: child.avgTime || '0'
                    });
                    processNode(child);
                  });
                }
              };
              
              // 处理根节点及其子节点
              const rootNodes = functionAnalysisResponse.data.callData;
              rootNodes.forEach(node => processNode(node));
              
              // 去重并排序
              const uniqueCallees = Array.from(
                new Map(calleesData.map(item => [item.name, item])).values()
              ).sort((a, b) => b.callCount - a.callCount);
              
              functionData.value.callees = uniqueCallees;
            }
          } catch (innerError) {
            console.error('回退方法获取被调用者数据也失败:', innerError);
          }
        }
        
        // 获取调用者（父函数）
        try {
          const parentFunctionsResponse = await axios.post('/api/runtime/functions/parents', {
            dbpath: currentDbPath.value,
            functionName: functionName
          });
          
          if (parentFunctionsResponse.data && parentFunctionsResponse.data.functions) {
            functionData.value.callers = parentFunctionsResponse.data.functions
              .sort((a, b) => (b.callCount || 0) - (a.callCount || 0));
          }
        } catch (error) {
          console.error('获取函数调用者数据失败:', error);
        }
        
        // 获取函数性能指标
        try {
          const statsResponse = await axios.post('/api/runtime/function/stats', {
            dbPath: currentDbPath.value,
            functionName: functionName
          });
          
          if (statsResponse.data && statsResponse.data.stats && statsResponse.data.stats.length > 0) {
            // 服务器返回的是数组，取第一个元素
            functionStats.value = statsResponse.data.stats[0] || {};
            
            // 处理时间字符串
            if (typeof functionStats.value.avgTime === 'string') {
              functionStats.value.avgTime = parseFloat(functionStats.value.avgTime);
            }
            if (typeof functionStats.value.maxTime === 'string') {
              functionStats.value.maxTime = parseFloat(functionStats.value.maxTime);
            }
            if (typeof functionStats.value.minTime === 'string') {
              functionStats.value.minTime = parseFloat(functionStats.value.minTime);
            }
            
            // 计算成功率（如果没有提供）
            if (functionStats.value.callCount && !functionStats.value.successRate) {
              // 假设所有调用都是成功的，除非有明确的失败数据
              functionStats.value.successRate = 1.0;
            }
          } else {
            functionStats.value = {};
          }
        } catch (error) {
          console.error('获取函数性能指标失败:', error);
          functionStats.value = {};
        }
        
        // 加载树状图数据
        if (activeTab.value === 'tree') {
          loadTreeGraph();
        }
      } catch (error) {
        console.error('分析函数失败:', error);
        functionData.value = {
          callers: [],
          callees: []
        };
        functionStats.value = {};
      } finally {
        loading.value = false;
      }
    };

    // 加载树状图数据
    const loadTreeGraph = async () => {
      if (!selectedFunction.value || !selectedFunction.value.name) return;
      
      loadingTree.value = true;
      treeData.value = [];
      
      try {
        const response = await axios.post('/api/runtime/tree-graph', {
          dbPath: currentDbPath.value,
          functionName: selectedFunction.value.name,
          chainType: chainType.value,
          depth: parseInt(treeDepth.value)
        });
        
        if (response.data && Array.isArray(response.data.trees)) {
          treeData.value = response.data.trees;
        } else {
          console.warn('树状图数据格式不符合预期', response.data);
          treeData.value = [];
        }
      } catch (error) {
        console.error('获取调用树数据失败:', error);
        treeData.value = [];
      } finally {
        loadingTree.value = false;
      }
    };
    
    // 处理树节点点击事件
    const handleTreeNodeClick = (node) => {
      if (!node) return;
      
      try {
        if (node && node.name) {
          // 查找功能是否在搜索结果中
          const foundFunction = items.value.find(item => item.name === node.name);
          
          if (foundFunction) {
            selectItem(foundFunction);
          } else {
            // 创建一个简单的函数对象
            const simpleFn = {
              name: node.name,
              package: ''
            };
            selectItem(simpleFn);
          }
        }
      } catch (error) {
        console.error('处理树节点点击事件失败:', error);
      }
    };

    // 执行搜索
    const search = () => {
      if (!searchQuery.value) {
        alert(t('runtimeAnalysis.functionAnalysis.pleaseInputFunction'));
        return;
      }
      hideDropdown();
      // 可以在这里直接搜索或调用其他方法
      fetchFunctions(searchQuery.value);
    };

    // 高亮文本
    const highlightText = (text, query) => {
      if (!query) return text;
      try {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
      } catch (e) {
        return text;
      }
    };

    // 点击外部关闭下拉框
    const handleClickOutside = (event) => {
      if (searchInput.value && !searchInput.value.contains(event.target)) {
        hideDropdown();
      }
    };

    // 生命周期钩子
    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
      if (debouncedFetch.cancel) debouncedFetch.cancel();
    });

    // 格式化时间显示
    const formatTime = (time) => {
      if (!time) return '0';
      
      // 如果是字符串并且包含单位，提取数值部分
      if (typeof time === 'string') {
        const match = time.match(/(\d+(\.\d+)?)/);
        if (match) {
          return match[1];
        }
        return '0';
      }
      
      // 如果是数值
      if (isNaN(Number(time))) return '0';
      const timeNum = Number(time);
      if (timeNum < 1) {
        return timeNum.toFixed(2);
      }
      return timeNum.toFixed(1);
    };
    
    // 格式化成功率
    const formatSuccessRate = (rate) => {
      if (!rate || isNaN(Number(rate))) return '0%';
      const rateNum = Number(rate);
      return (rateNum * 100).toFixed(1) + '%';
    };

    // 监听标签切换
    const watchTabChange = () => {
      if (activeTab.value === 'tree' && selectedFunction.value) {
        loadTreeGraph();
      }
    };

    // 监听activeTab变化
    watch(activeTab, watchTabChange);

    return {
      currentDbPath,
      searchQuery,
      showDropdown,
      activeIndex,
      filteredItems,
      loading,
      searchInput,
      selectedFunction,
      activeTab,
      functionData,
      functionStats,
      handleInput,
      onDown,
      onUp,
      onEnter,
      hideDropdown,
      selectItem,
      search,
      highlightText,
      analyzeFunctionDetails,
      formatTime,
      formatSuccessRate,
      t,
      // 树状图相关
      chainType,
      treeDepth,
      treeData,
      loadingTree,
      loadTreeGraph,
      handleTreeNodeClick
    };
  }
};
</script>

<style scoped>
.function-analysis {
  padding: 1rem;
  position: relative;
  isolation: isolate;
}

.search-section {
  position: relative;
}

.search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: rgba(13, 110, 253, 0.1);
  color: #0d6efd;
  border-radius: 8px;
}

.search-suggestions-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: white;
}

.suggestions-header {
  font-size: 0.875rem;
  color: #6c757d;
}

.suggestion-item {
  cursor: pointer;
  border-radius: 4px;
  margin: 4px 8px;
  transition: background-color 0.1s ease-in-out;
}

.suggestion-item:hover {
  background-color: #f8f9fa;
}

.suggestion-item.active {
  background-color: rgba(13, 110, 253, 0.08);
}

.function-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: rgba(13, 110, 253, 0.1);
  color: #0d6efd;
  border-radius: 8px;
}

.highlight {
  background-color: rgba(255, 193, 7, 0.2);
  padding: 0.1em 0.2em;
  border-radius: 2px;
  font-weight: bold;
  color: #212529;
}

.empty-state {
  padding: 3rem;
  background-color: rgba(248, 249, 250, 0.5);
  border-radius: 12px;
  max-width: 500px;
  margin: 0 auto;
}

.function-info {
  border-radius: 12px;
  overflow: hidden;
}

.nav-tabs .nav-link {
  color: #6c757d;
  border: none;
  padding: 0.5rem 1rem;
  transition: all 0.2s ease;
}

.nav-tabs .nav-link:hover {
  color: #495057;
  background-color: rgba(13, 110, 253, 0.05);
}

.nav-tabs .nav-link.active {
  color: #0d6efd;
  background-color: rgba(13, 110, 253, 0.1);
  border-bottom: 2px solid #0d6efd;
}

.table th {
  background-color: #f8f9fa;
  font-weight: 500;
}

.table-hover tbody tr:hover {
  background-color: rgba(13, 110, 253, 0.05);
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .search-icon {
    background-color: rgba(91, 154, 255, 0.15);
    color: #5b9aff;
  }

  .search-suggestions-card {
    background-color: #2d2d2d;
    border-color: #3d3d3d;
  }
  
  .suggestions-header {
    background-color: #333333 !important;
    color: #a0a0a0;
    border-bottom-color: #3d3d3d !important;
  }

  .suggestion-item:hover {
    background-color: #333333;
  }

  .suggestion-item.active {
    background-color: rgba(91, 154, 255, 0.15);
  }

  .function-icon {
    background-color: rgba(91, 154, 255, 0.15);
    color: #5b9aff;
  }

  .highlight {
    background-color: rgba(255, 193, 7, 0.15);
    color: #e1e1e1;
  }

  .empty-state {
    color: #a0a0a0;
    background-color: rgba(45, 45, 45, 0.5);
  }

  .nav-tabs .nav-link {
    color: #a0a0a0;
  }
  
  .nav-tabs .nav-link:hover {
    color: #e1e1e1;
    background-color: rgba(91, 154, 255, 0.08);
  }
  
  .nav-tabs .nav-link.active {
    color: #5b9aff;
    background-color: rgba(91, 154, 255, 0.15);
    border-bottom-color: #5b9aff;
  }
  
  .table th {
    background-color: #333333;
    color: #e1e1e1;
  }
  
  .table {
    color: #e1e1e1;
  }
  
  .table-hover tbody tr:hover {
    background-color: rgba(91, 154, 255, 0.08);
  }
  
  .badge.bg-light {
    background-color: #444444 !important;
    color: #e1e1e1 !important;
  }
}

.selected-function {
  margin-top: 2rem;
}

.function-header {
  background-color: var(--bs-primary-bg-subtle);
  border-bottom: 1px solid var(--bs-border-color);
}

.function-card {
  box-shadow: 0 .125rem .25rem rgba(0, 0, 0, .075);
  transition: box-shadow .3s;
}

.function-card:hover {
  box-shadow: 0 .5rem 1rem rgba(0, 0, 0, .15);
}

.metric-card {
  border-radius: 0.5rem;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid var(--bs-border-color);
}

.metric-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 .5rem 1rem rgba(0, 0, 0, .15);
}

.metric-card .card-title {
  font-size: 1rem;
  margin-bottom: 1rem;
  color: var(--bs-secondary);
}

.metric-card .display-6 {
  font-weight: 600;
  color: var(--bs-primary);
}

/* 深色模式支持 */
[data-bs-theme="dark"] .metric-card {
  background-color: var(--bs-dark-bg-subtle);
}

[data-bs-theme="dark"] .metric-card .display-6 {
  color: var(--bs-info);
}

[data-bs-theme="dark"] .function-header {
  background-color: var(--bs-dark-bg-subtle);
}

/* 树形结构样式 */
.tree-container {
  max-height: 500px;
  overflow-y: auto;
}

.tree-node {
  padding: 4px 0;
}

.tree-node-simple {
  padding: 4px 0;
  margin-bottom: 8px;
}

.tree-root {
  font-weight: 500;
  padding: 6px;
  background-color: var(--hover-color);
  border-radius: 4px;
}

.toggle-icon {
  cursor: pointer;
  color: var(--primary-color);
}

.node-content {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
}

.node-content:hover {
  background-color: var(--hover-color);
}
</style> 