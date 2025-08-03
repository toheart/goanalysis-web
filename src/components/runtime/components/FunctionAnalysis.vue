<template>
  <div class="function-analysis">
    <!-- 搜索部分 -->
    <div class="card mb-4 shadow-sm search-section">
      <div class="card-header bg-gradient-primary text-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="bi bi-search me-2"></i>{{ t('runtimeAnalysis.functionAnalysis.title') }}
          <small class="ms-2 opacity-75">(函数搜索与分析)</small>
        </h5>
      </div>
      <div class="card-body">
        <!-- 搜索框区域 -->
                  <div class="d-flex align-items-center mb-3">
            <div class="search-icon me-2">
              <i class="bi bi-code-square text-primary"></i>
            </div>
            <div class="flex-grow-1">
              <input
                ref="searchInput"
                v-model="searchQuery"
                type="text"
                :placeholder="t('runtimeAnalysis.functionAnalysis.inputFunctionName')"
                class="form-control border-primary"
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
        <div v-if="showDropdown && filteredItems.length > 0" class="search-suggestions-card mt-2 shadow-sm">
          <div class="suggestions-header px-3 py-2 bg-light border-bottom">
            <small><i class="bi bi-info-circle me-1 text-primary"></i>{{ t('runtimeAnalysis.functionAnalysis.foundCount', { count: filteredItems.length }) }}</small>
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
                  <i class="bi bi-code-square text-primary"></i>
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
        <div class="card function-card shadow-sm">
          <div class="card-header bg-gradient-info text-white function-header">
            <i class="bi bi-code-square me-2"></i>
            <strong>{{ formatFunctionName(selectedFunction.name, getCurrentModule()) }}</strong>
            <small class="ms-2 opacity-75">(函数详情)</small>
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
              <div class="card mb-4 shadow-sm">
                <div class="card-header bg-gradient-success text-white">
                  <h5 class="mb-0">
                    <i class="bi bi-diagram-3 me-2"></i>函数在Goroutine中的分布
                    <small class="ms-2 opacity-75">({{ goroutineData.length }} 个)</small>
                  </h5>
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
                            函数 <code class="function-name">{{ formatFunctionName(selectedFunction.name, getCurrentModule()) }}</code> 在 
                            <span class="badge bg-primary rounded-pill mx-1">{{ goroutineData.length }}</span> 
                            个Goroutine中被调用
                          </p>
                        </div>
                        <div class="col-auto">
                          <div class="stats-badges">
                            <span class="badge bg-success rounded-pill me-2">
                              <i class="bi bi-check-circle me-1"></i>
                              {{ goroutineData.filter(g => g.isFinished).length }} 已完成
                            </span>
                            <span class="badge bg-warning rounded-pill">
                              <i class="bi bi-clock me-1"></i>
                              {{ goroutineData.filter(g => !g.isFinished).length }} 运行中
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="modern-table-container">
                      <table class="table table-hover modern-table mb-0">
                        <thead class="table-light">
                          <tr>
                            <th scope="col" class="text-center border-0" style="width: 60px;">
                              <i class="bi bi-hash me-1">序号</i>
                            </th>
                            <th scope="col" class="text-center border-0" style="width: 120px;">
                              <i class="bi bi-cpu me-1"></i>Goroutine ID
                            </th>
                            <th scope="col" class="border-0">
                              <i class="bi bi-code-slash me-1"></i>初始函数
                            </th>
                            <th scope="col" class="text-center border-0" style="width: 100px;">
                              <i class="bi bi-layers me-1"></i>调用深度
                            </th>
                            <th scope="col" class="text-center border-0" style="width: 120px;">
                              <i class="bi bi-stopwatch me-1"></i>执行时间
                            </th>
                            <th scope="col" class="text-center border-0" style="width: 100px;">
                              <i class="bi bi-circle-fill me-1"></i>状态
                            </th>
                            <th scope="col" class="text-center border-0" style="width: 180px;">
                              <i class="bi bi-gear me-1"></i>操作
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(goroutine, index) in goroutineData" :key="goroutine.gid" class="goroutine-row">
                            <td class="text-center">
                              <span class="rank-badge">{{ index + 1 }}</span>
                            </td>
                            <td class="text-center">
                              <span class="badge bg-primary rounded-pill">#{{ goroutine.gid }}</span>
                            </td>
                            <td>
                              <div class="function-info">
                                <code class="function-name">{{ formatFunctionName(goroutine.initialFunc, getCurrentModule()) }}</code>
                              </div>
                            </td>
                            <td class="text-center">
                              <span class="depth-badge">
                                <i class="bi bi-layers me-1"></i>
                                {{ goroutine.depth || '-' }}
                              </span>
                            </td>
                            <td class="text-center">
                              <span class="time-badge execution-time">
                                <i class="bi bi-stopwatch me-1"></i>
                                {{ goroutine.executionTime || '-' }}
                              </span>
                            </td>
                            <td class="text-center">
                              <span v-if="goroutine.isFinished" class="badge bg-success rounded-pill">
                                <i class="bi bi-check-circle me-1"></i>已完成
                              </span>
                              <span v-else class="badge bg-warning rounded-pill">
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
                                      highlight: goroutine.functionId || selectedFunction?.id
                                    }
                                  }" 
                                  class="btn btn-sm btn-outline-primary action-btn"
                                  title="查看详细执行流程"
                                >
                                  <i class="bi bi-eye me-1"></i>详情
                                </router-link>
                                <button 
                                  class="btn btn-sm btn-outline-success action-btn ms-1"
                                  @click="showCallChain(goroutine)"
                                  title="查看完整调用链路"
                                >
                                  <i class="bi bi-diagram-3 me-1"></i>链路
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
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from '../../../axios';
import debounce from 'lodash/debounce';
import CallChainModal from './CallChainModal.vue';
import { formatFunctionName } from '../utils/functionNameUtils.js';
import { useModuleState } from '../composables/useModuleState.js';

export default {
  name: 'FunctionAnalysis',
  
  components: {
    CallChainModal
  },
  
  setup() {
    const { t } = useI18n();
    const currentDbPath = ref(localStorage.getItem('verifiedProjectPath') || '');
    
    // Module状态管理
    const { selectedModule } = useModuleState();
    
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
              // 只有当初始函数和目标函数不同时才添加初始函数
              if (goroutine.initialFunc && goroutine.initialFunc !== selectedFunction.value.name) {
                goroutine.callChain = [goroutine.initialFunc, selectedFunction.value.name];
              } else {
                goroutine.callChain = [selectedFunction.value.name];
              }
              
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
                    
                    // 获取所有父函数（按深度排序）
                    const allParents = [];
                    if (functionInfo.parentIds && functionInfo.parentIds.length > 0) {
                      const sortedParents = functionInfo.parentIds
                        .sort((a, b) => a.depth - b.depth);
                      
                      // 收集所有父函数名称
                      sortedParents.forEach((parent) => {
                        if (parent.name) {
                          allParents.push(parent.name);
                        }
                      });
                    }
                    
                    // 检查初始函数是否在父函数列表中
                    const isInitialFuncInParents = goroutine.initialFunc && allParents.includes(goroutine.initialFunc);
                    
                    // 只有当初始函数不在父函数列表中时，才添加为初始函数
                    if (goroutine.initialFunc && !isInitialFuncInParents) {
                      callChain.push(goroutine.initialFunc);
                    }
                    
                    // 添加父函数（按深度排序）
                    if (allParents.length > 0) {
                      allParents.forEach((parentName) => {
                        // 避免重复添加初始函数
                        if (parentName !== goroutine.initialFunc) {
                          callChain.push(parentName);
                        }
                      });
                    } else {
                      // 如果没有父函数信息，且没有初始函数，添加说明
                      if (callChain.length === 0) {
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
              if (goroutine.initialFunc && goroutine.initialFunc !== selectedFunction.value.name) {
                goroutine.callChain = [goroutine.initialFunc, selectedFunction.value.name].filter(Boolean);
              } else {
                goroutine.callChain = [selectedFunction.value.name].filter(Boolean);
              }
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

    // 从localStorage获取当前数据库的module设置
    const getCurrentModule = () => {
      const dbPath = currentDbPath.value;
      if (dbPath) {
        const storageKey = `runtime_analysis_module_${dbPath}`;
        return localStorage.getItem(storageKey) || '';
      }
      return '';
    };

    // 监听selectedModule变化，强制刷新页面
    watch(selectedModule, () => {
      console.log('Module changed, reloading page to get fresh data');
      // 强制刷新页面以重新获取原始数据
      window.location.reload();
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
      showCallChain,
      formatFunctionName,
      selectedModule,
      getCurrentModule
    };
  }
};
</script>

<style>
@import url("../../../assets/styles/components/runtime/function-analysis.css");
</style> 