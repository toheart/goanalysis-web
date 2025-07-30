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
            
              <!-- 函数在Goroutine中的分布 -->
              <div class="card mb-4">
                <div class="card-header">
                  <h5 class="mb-0"><i class="bi bi-diagram-3 me-2"></i>函数在Goroutine中的分布</h5>
                </div>
                <div class="card-body">
                  <div v-if="loading" class="text-center py-3">
                    <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">{{ t('common.loading') }}</span>
                    </div>
                  </div>
                  
                  <div v-else-if="goroutineData.length > 0" class="table-responsive">
                    <p class="text-muted mb-2">函数 <strong>{{ selectedFunction.name }}</strong> 在以下 {{ goroutineData.length }} 个Goroutine中存在：</p>
                    <div class="alert alert-info mb-3">
                      <i class="bi bi-info-circle me-2"></i>
                      <small>
                        调用链路显示从初始函数到当前函数的完整调用路径。"..."表示中间可能存在其他调用，但详细信息不可用。
                        点击"查看详情"可以跳转到对应的Goroutine调用链，并自动定位到当前函数位置。
                      </small>
                    </div>
                    <table class="table table-hover">
                      <thead>
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col">Goroutine ID</th>
                          <th scope="col">初始函数</th>
                          <th scope="col">调用链路</th>
                          <th scope="col">调用深度</th>
                          <th scope="col">执行时间</th>
                          <th scope="col">状态</th>
                          <th scope="col">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(goroutine, index) in goroutineData" :key="goroutine.gid">
                          <td>{{ index + 1 }}</td>
                          <td><span class="badge bg-primary">{{ goroutine.gid }}</span></td>
                          <td><code>{{ goroutine.initialFunc }}</code></td>
                          <td>
                            <div v-if="goroutine.callChain" class="call-chain">
                              <span v-for="(func, chainIndex) in goroutine.callChain" :key="chainIndex">
                                <span class="function-link">{{ func }}</span>
                                <i v-if="chainIndex < goroutine.callChain.length - 1" class="bi bi-arrow-right mx-1 text-muted"></i>
                              </span>
                            </div>
                            <div v-else-if="callChainLoading" class="text-muted">
                              <div class="d-flex align-items-center">
                                <div class="spinner-border spinner-border-sm me-2" role="status">
                                  <span class="visually-hidden">加载中...</span>
                                </div>
                                <small>获取调用链路...</small>
                              </div>
                            </div>
                            <div v-else class="text-muted">
                              <small>暂无调用链路信息</small>
                            </div>
                          </td>
                          <td><span class="badge bg-info">{{ goroutine.depth || '-' }}</span></td>
                          <td><span class="badge bg-secondary">{{ goroutine.executionTime || '-' }}</span></td>
                          <td>
                            <span v-if="goroutine.isFinished" class="badge bg-success">已完成</span>
                            <span v-else class="badge bg-warning">运行中</span>
                          </td>
                          <td>
                            <div class="btn-group">
                              <router-link 
                                :to="{ 
                                  name: 'TraceDetails', 
                                  params: { gid: goroutine.gid },
                                  query: { highlight: selectedFunction.id }
                                }" 
                                class="btn btn-sm btn-primary"
                                title="查看详情并定位到函数"
                              >
                                <i class="bi bi-eye"></i> 查看详情
                              </router-link>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div v-else class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>该函数未在任何Goroutine中找到
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
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from '../../../axios';
import debounce from 'lodash/debounce';

export default {
  name: 'FunctionAnalysis',
  
  setup() {
    const { t } = useI18n();
    const currentDbPath = ref(localStorage.getItem('verifiedProjectPath') || '');
    
    const searchQuery = ref('');
    const showDropdown = ref(false);
    const activeIndex = ref(-1);
    const items = ref([]);
    const loading = ref(false);
    const searchInput = ref(null);
    const selectedFunction = ref(null);
    const goroutineData = ref([]);
    const functionStats = ref({
      callCount: 0,
      avgTime: 0,
      maxTime: 0
    });
    const callChainLoading = ref(false);

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

    const debouncedFetch = debounce(fetchFunctions, 300);

    const handleInput = () => {
      if (searchQuery.value.length > 0) {
        debouncedFetch(searchQuery.value);
      } else {
        items.value = [];
        showDropdown.value = false;
      }
    };

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

    const onUp = (e) => {
      e.preventDefault();
      if (!showDropdown.value || filteredItems.value.length === 0) return;
      
      activeIndex.value = activeIndex.value > 0 
        ? activeIndex.value - 1 
        : filteredItems.value.length - 1;
      
      scrollToActive();
    };

    const scrollToActive = () => {
      nextTick(() => {
        const activeEl = document.querySelector('.suggestion-item.active');
        if (activeEl) {
          activeEl.scrollIntoView({ block: 'nearest' });
        }
      });
    };

    const onEnter = () => {
      if (showDropdown.value && activeIndex.value >= 0 && activeIndex.value < filteredItems.value.length) {
        selectItem(filteredItems.value[activeIndex.value]);
      } else {
        search();
      }
    };

    const hideDropdown = () => {
      showDropdown.value = false;
    };

    const selectItem = (item) => {
      searchQuery.value = item.name;
      selectedFunction.value = {
        id: item.id,
        name: item.name,
        package: item.package
      };
      hideDropdown();
      analyzeFunctionDetails(item.name);
    };

    const analyzeFunctionDetails = async (functionName) => {
      if (!currentDbPath.value || !functionName) {
        console.log('缺少必要参数:', { currentDbPath: currentDbPath.value, functionName });
        return;
      }
      
      loading.value = true;
      try {
        goroutineData.value = [];
        
        try {
          const goroutineResponse = await axios.post('/api/runtime/gids/function', {
            path: currentDbPath.value,
            functionName: functionName,
            includeMetrics: true
          });
          
          if (goroutineResponse.data && goroutineResponse.data.body) {
            goroutineData.value = goroutineResponse.data.body;
            
            // 如果没有函数ID，尝试获取
            if (!selectedFunction.value.id && goroutineData.value.length > 0) {
              try {
                const searchResponse = await axios.post('/api/runtime/functions/search', {
                  dbpath: currentDbPath.value,
                  query: functionName,
                  limit: 1
                });
                
                if (searchResponse.data && searchResponse.data.functions && searchResponse.data.functions.length > 0) {
                  const functionId = searchResponse.data.functions[0].id;
                  selectedFunction.value.id = functionId;
                }
              } catch (error) {
                console.error('获取函数ID失败:', error);
              }
            }
            
            // 为每个Goroutine获取调用链路信息
            if (selectedFunction.value.id && goroutineData.value.length > 0) {
              callChainLoading.value = true;
              
              // 为每个Goroutine获取调用链路信息
              await Promise.all(goroutineData.value.map(async (goroutine) => {
                try {
                  const functionInfoResponse = await axios.post('/api/runtime/function/info', {
                    dbpath: currentDbPath.value,
                    gid: goroutine.gid,
                    functionId: selectedFunction.value.id,
                    currentDepth: goroutine.depth || 3
                  });
                  
                  if (functionInfoResponse.data && functionInfoResponse.data.functionInfo) {
                    const functionInfo = functionInfoResponse.data.functionInfo;
                    
                    // 构建调用链路：从初始函数到当前函数
                    const callChain = [];
                    
                    // 添加初始函数
                    if (goroutine.initialFunc) {
                      callChain.push(goroutine.initialFunc);
                    }
                    
                    // 添加父函数（按深度排序）
                    if (functionInfo.parentIds && functionInfo.parentIds.length > 0) {
                      const sortedParents = functionInfo.parentIds
                        .sort((a, b) => a.depth - b.depth);
                      
                      // 直接使用API返回的父函数名称
                      sortedParents.forEach((parent) => {
                        if (parent.name) {
                          callChain.push(parent.name);
                        } else {
                          // 如果父函数没有名称，使用占位符
                          callChain.push(`父函数${parent.depth}`);
                        }
                      });
                    } else {
                      // 如果没有父函数信息，添加说明
                      if (callChain.length > 0) {
                        callChain.push('...');
                      }
                    }
                    
                    // 添加当前函数
                    callChain.push(selectedFunction.value.name);
                    
                    goroutine.callChain = callChain;
                  }
                } catch (error) {
                  console.error(`获取Goroutine ${goroutine.gid} 的调用链路失败:`, error);
                  goroutine.callChain = [goroutine.initialFunc, selectedFunction.value.name];
                }
              }));
              
              callChainLoading.value = false;
            }
          }
        } catch (error) {
          console.error('获取函数在Goroutine中的分布失败:', error);
        }
        
        try {
          const statsResponse = await axios.post('/api/runtime/function/stats', {
            dbPath: currentDbPath.value,
            functionName: functionName
          });
          
          if (statsResponse.data && statsResponse.data.stats && statsResponse.data.stats.length > 0) {
            functionStats.value = statsResponse.data.stats[0] || {};
            
            if (typeof functionStats.value.avgTime === 'string') {
              functionStats.value.avgTime = parseFloat(functionStats.value.avgTime);
            }
            if (typeof functionStats.value.maxTime === 'string') {
              functionStats.value.maxTime = parseFloat(functionStats.value.maxTime);
            }
            if (typeof functionStats.value.minTime === 'string') {
              functionStats.value.minTime = parseFloat(functionStats.value.minTime);
            }
          } else {
            functionStats.value = {};
          }
        } catch (error) {
          console.error('获取函数性能指标失败:', error);
          functionStats.value = {};
        }
      } catch (error) {
        console.error('分析函数失败:', error);
        goroutineData.value = [];
        functionStats.value = {};
      } finally {
        loading.value = false;
      }
    };

    const search = async () => {
      if (!searchQuery.value) {
        alert(t('runtimeAnalysis.functionAnalysis.pleaseInputFunction'));
        return;
      }
      hideDropdown();
      
      selectedFunction.value = {
        id: null,
        name: searchQuery.value,
        package: ''
      };
      
      // 先尝试获取函数ID
      try {
        const searchResponse = await axios.post('/api/runtime/functions/search', {
          dbpath: currentDbPath.value,
          query: searchQuery.value,
          limit: 1
        });
        
        if (searchResponse.data && searchResponse.data.functions && searchResponse.data.functions.length > 0) {
          const functionId = searchResponse.data.functions[0].id;
          selectedFunction.value.id = functionId;
        }
      } catch (error) {
        console.error('获取函数ID失败:', error);
      }
      
      analyzeFunctionDetails(searchQuery.value);
    };

    const highlightText = (text, query) => {
      if (!query) return text;
      try {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
      } catch (e) {
        return text;
      }
    };

    const handleClickOutside = (event) => {
      if (searchInput.value && !searchInput.value.contains(event.target)) {
        hideDropdown();
      }
    };

    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
      if (debouncedFetch.cancel) debouncedFetch.cancel();
    });

    const formatTime = (time) => {
      if (!time) return '0';
      
      if (typeof time === 'string') {
        const match = time.match(/(\d+(\.\d+)?)/);
        if (match) {
          return match[1];
        }
        return '0';
      }
      
      if (isNaN(Number(time))) return '0';
      const timeNum = Number(time);
      if (timeNum < 1) {
        return timeNum.toFixed(2);
      }
      return timeNum.toFixed(1);
    };

    return {
      currentDbPath,
      searchQuery,
      showDropdown,
      activeIndex,
      filteredItems,
      loading,
      searchInput,
      selectedFunction,
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
      t,
      goroutineData,
      callChainLoading
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

.table th {
  background-color: #f8f9fa;
  font-weight: 500;
}

.table-hover tbody tr:hover {
  background-color: rgba(13, 110, 253, 0.05);
}

.btn-group .btn {
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
}

.btn-group .btn i {
  font-size: 0.875rem;
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
  
  .btn-group .btn {
    border-color: #444444;
  }
}

[data-bs-theme="dark"] .metric-card {
  background-color: var(--bs-dark-bg-subtle);
}

[data-bs-theme="dark"] .metric-card .display-6 {
  color: var(--bs-info);
}

[data-bs-theme="dark"] .function-header {
  background-color: var(--bs-dark-bg-subtle);
}

/* 调用链路样式 */
.call-chain {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
  word-break: break-all;
}

.function-link {
  color: #0d6efd;
  background-color: rgba(13, 110, 253, 0.1);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  margin: 0 0.125rem;
  display: inline-block;
  transition: all 0.2s ease;
}

.function-link:hover {
  background-color: rgba(13, 110, 253, 0.2);
  color: #0a58ca;
}

/* 深色模式下的调用链路样式 */
@media (prefers-color-scheme: dark) {
  .function-link {
    color: #5b9aff;
    background-color: rgba(91, 154, 255, 0.15);
  }
  
  .function-link:hover {
    background-color: rgba(91, 154, 255, 0.25);
    color: #7bb3ff;
  }
}
</style> 