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
                    <div class="goroutine-summary mb-4">
                      <div class="row align-items-center">
                        <div class="col">
                          <h6 class="mb-1">函数分布概览</h6>
                          <p class="text-muted mb-0">
                            函数 <code class="text-primary">{{ selectedFunction.name }}</code> 在 
                            <span class="badge bg-primary mx-1">{{ goroutineData.length }}</span> 
                            个Goroutine中被调用
                          </p>
                        </div>
                        <div class="col-auto">
                          <div class="stats-badges">
                            <span class="badge bg-success me-2">
                              <i class="bi bi-check-circle me-1"></i>
                              {{ goroutineData.filter(g => g.isFinished).length }} 已完成
                            </span>
                            <span class="badge bg-warning">
                              <i class="bi bi-clock me-1"></i>
                              {{ goroutineData.filter(g => !g.isFinished).length }} 运行中
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="modern-table-container">
                      <table class="table table-hover modern-table">
                        <thead>
                          <tr>
                            <th scope="col" class="text-center" style="width: 60px;">#</th>
                            <th scope="col" class="text-center" style="width: 120px;">Goroutine ID</th>
                            <th scope="col">初始函数</th>
                            <th scope="col" class="text-center" style="width: 100px;">调用深度</th>
                            <th scope="col" class="text-center" style="width: 120px;">执行时间</th>
                            <th scope="col" class="text-center" style="width: 100px;">状态</th>
                            <th scope="col" class="text-center" style="width: 180px;">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(goroutine, index) in goroutineData" :key="goroutine.gid" class="goroutine-row">
                            <td class="text-center">
                              <span class="row-number">{{ index + 1 }}</span>
                            </td>
                            <td class="text-center">
                              <span class="badge bg-gradient-primary goroutine-badge">{{ goroutine.gid }}</span>
                            </td>
                            <td>
                              <div class="function-info">
                                <code class="function-name">{{ goroutine.initialFunc }}</code>
                                <small class="text-muted d-block">初始调用函数</small>
                              </div>
                            </td>
                            <td class="text-center">
                              <span class="metric-badge depth-badge">
                                <i class="bi bi-layers me-1"></i>
                                {{ goroutine.depth || '-' }}
                              </span>
                            </td>
                            <td class="text-center">
                              <span class="metric-badge time-badge">
                                <i class="bi bi-stopwatch me-1"></i>
                                {{ goroutine.executionTime || '-' }}
                              </span>
                            </td>
                            <td class="text-center">
                              <span v-if="goroutine.isFinished" class="status-badge status-finished">
                                <i class="bi bi-check-circle me-1"></i>已完成
                              </span>
                              <span v-else class="status-badge status-running">
                                <i class="bi bi-play-circle me-1"></i>运行中
                              </span>
                            </td>
                            <td class="text-center">
                              <div class="action-buttons">
                                <router-link 
                                  :to="{ 
                                    name: 'TraceDetails', 
                                    params: { gid: goroutine.gid },
                                    query: { 
                                      highlight: goroutine.functionId || selectedFunction?.id || selectedFunction?.name,
                                      highlightId: goroutine.functionId || selectedFunction?.id,
                                      functionName: selectedFunction?.name
                                    }
                                  }" 
                                  class="btn btn-sm btn-primary action-btn"
                                  title="查看详细执行流程"
                                >
                                  <i class="bi bi-eye"></i>
                                  <span class="btn-text">详情</span>
                                </router-link>
                                <button 
                                  class="btn btn-sm btn-success action-btn"
                                  @click="showCallChain(goroutine)"
                                  title="查看完整调用链路"
                                >
                                  <i class="bi bi-diagram-3"></i>
                                  <span class="btn-text">链路</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
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

    <!-- 调用链路模态框 -->
    <CallChainModal
      v-model:visible="showCallChainModal"
      :gid="currentCallChainGoroutine?.gid"
      :initial-func="currentCallChainGoroutine?.initialFunc"
      :depth="currentCallChainGoroutine?.depth"
      :execution-time="currentCallChainGoroutine?.executionTime"
      :is-finished="currentCallChainGoroutine?.isFinished"
      :call-chain="currentCallChainGoroutine?.callChain"
      :target-function="selectedFunction?.name"
      :target-function-id="currentCallChainGoroutine?.functionId"
      :db-path="currentDbPath"
    />
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from '../../../axios';
import debounce from 'lodash/debounce';
import CallChainModal from './CallChainModal.vue';

export default {
  name: 'FunctionAnalysis',
  
  components: {
    CallChainModal
  },
  
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

    // CallChainModal相关
    const showCallChainModal = ref(false);
    const currentCallChainGoroutine = ref(null);

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
        id: null, // search接口不返回id字段，会从gids接口获取
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
            
            // 打印所有Goroutine的functionId用于调试
            console.log('获取到的Goroutine数据:', goroutineData.value.map(g => ({
              gid: g.gid,
              functionId: g.functionId,
              initialFunc: g.initialFunc
            })));
            
            // 不再设置全局的selectedFunction.value.id，每个Goroutine使用自己的functionId
          }
        } catch (error) {
          console.error('获取函数在Goroutine中的分布失败:', error);
        }
        
        // 为每个Goroutine获取调用链路信息
        if (goroutineData.value.length > 0) {
          callChainLoading.value = true;
          console.log('准备为每个Goroutine获取调用链路信息');
          
          // 为每个Goroutine获取调用链路信息
          await Promise.all(goroutineData.value.map(async (goroutine) => {
            try {
              // 首先为每个goroutine设置默认调用链路
              goroutine.callChain = [goroutine.initialFunc, selectedFunction.value.name];
              
              console.log(`为Goroutine ${goroutine.gid} 获取调用链路详情，functionId: ${goroutine.functionId}`);
              
              // 只有在Goroutine有自己的functionId时才调用info接口
              if (goroutine.functionId) {
                console.log(`使用Goroutine自己的functionId ${goroutine.functionId} 调用info接口`);
                try {
                  const functionInfoResponse = await axios.post('/api/runtime/function/info', {
                    dbpath: currentDbPath.value,
                    gid: goroutine.gid,
                    functionId: goroutine.functionId,
                    currentDepth: goroutine.depth || 3
                  });
                  
                  console.log(`Goroutine ${goroutine.gid} (functionId: ${goroutine.functionId}) 调用链路响应:`, functionInfoResponse?.data);
                  
                  if (functionInfoResponse?.data?.functionInfo) {
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
                        if (parent.name && parent.name !== goroutine.initialFunc) {
                          callChain.push(parent.name);
                        }
                      });
                    } else {
                      // 如果没有父函数信息，添加说明
                      if (callChain.length > 0) {
                        callChain.push('...');
                      }
                    }
                    
                    // 添加当前函数
                    if (!callChain.includes(selectedFunction.value.name)) {
                      callChain.push(selectedFunction.value.name);
                    }
                    
                    goroutine.callChain = callChain;
                    console.log(`Goroutine ${goroutine.gid} 调用链路构建完成:`, callChain);
                  } else {
                    console.log(`Goroutine ${goroutine.gid} 没有返回有效的函数信息，使用默认调用链路`);
                  }
                } catch (error) {
                  console.error(`Goroutine ${goroutine.gid} 调用info接口失败:`, error);
                  // 保持默认的调用链路
                }
              } else {
                console.log(`Goroutine ${goroutine.gid} 没有functionId，使用默认调用链路`);
                // 保持默认的调用链路
              }
              
            } catch (error) {
              console.error(`获取Goroutine ${goroutine.gid} 的调用链路失败:`, error);
              // 确保即使出错也有基本的调用链路
              goroutine.callChain = [goroutine.initialFunc, selectedFunction.value.name].filter(Boolean);
            }
          }));
          
          callChainLoading.value = false;
          console.log('所有调用链路获取完成');
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
        id: null, // 不从search接口获取id，会从gids接口中的functionId获取
        name: searchQuery.value,
        package: ''
      };
      
      // 直接分析函数详情，functionId会从gids接口获取
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

    // 显示调用链路详情
    const showCallChain = (goroutine) => {
      currentCallChainGoroutine.value = goroutine;
      showCallChainModal.value = true;
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
      callChainLoading,
      showCallChainModal,
      currentCallChainGoroutine,
      showCallChain
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

/* 现代化表格样式 */
.goroutine-summary {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e1e5e9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.goroutine-summary h6 {
  color: #495057;
  font-weight: 600;
  font-size: 1.1rem;
}

.stats-badges .badge {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.modern-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  border: 1px solid #e1e5e9;
}

.modern-table {
  margin-bottom: 0;
  font-size: 0.9rem;
}

.modern-table thead th {
  background: linear-gradient(135deg, #495057 0%, #6c757d 100%);
  color: white;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  padding: 1rem 0.75rem;
  border: none;
  position: relative;
}

.modern-table thead th::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #007bff, #0056b3);
}

.goroutine-row {
  transition: all 0.2s ease;
  border-bottom: 1px solid #f1f3f4;
}

.goroutine-row:hover {
  background: linear-gradient(135deg, rgba(0, 123, 255, 0.02) 0%, rgba(0, 123, 255, 0.05) 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
}

.goroutine-row td {
  padding: 1rem 0.75rem;
  vertical-align: middle;
  border: none;
}

.row-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #6c757d, #495057);
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.8rem;
}

.goroutine-badge {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 8px;
  background: linear-gradient(135deg, #007bff, #0056b3) !important;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
  border: none;
}

.function-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.function-name {
  background: rgba(0, 123, 255, 0.08);
  color: #0056b3;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  border: 1px solid rgba(0, 123, 255, 0.2);
  display: inline-block;
  word-break: break-all;
}

.metric-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.depth-badge {
  background: linear-gradient(135deg, #17a2b8, #138496);
  color: white;
}

.time-badge {
  background: linear-gradient(135deg, #6c757d, #545b62);
  color: white;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-finished {
  background: linear-gradient(135deg, #28a745, #1e7e34);
  color: white;
}

.status-running {
  background: linear-gradient(135deg, #ffc107, #e0a800);
  color: #212529;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.2s ease;
  text-decoration: none;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.action-btn.btn-primary {
  background: linear-gradient(135deg, #007bff, #0056b3);
  border: none;
}

.action-btn.btn-success {
  background: linear-gradient(135deg, #28a745, #1e7e34);
  border: none;
}

.btn-text {
  font-size: 0.75rem;
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .goroutine-summary {
    background: linear-gradient(135deg, #2d2d2d 0%, #3d3d3d 100%);
    border-color: #444;
    color: #e1e1e1;
  }
  
  .goroutine-summary h6 {
    color: #e1e1e1;
  }
  
  .modern-table-container {
    background: #2d2d2d;
    border-color: #444;
  }
  
  .modern-table {
    color: #e1e1e1;
  }
  
  .goroutine-row {
    border-bottom-color: #444;
  }
  
  .goroutine-row:hover {
    background: linear-gradient(135deg, rgba(91, 154, 255, 0.05) 0%, rgba(91, 154, 255, 0.1) 100%);
  }
  
  .function-name {
    background: rgba(91, 154, 255, 0.15);
    color: #7bb3ff;
    border-color: rgba(91, 154, 255, 0.3);
  }
}
</style> 