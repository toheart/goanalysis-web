<template>
  <div class="runtime-analysis">
    <!-- Module选择器 -->
    <ModuleSelector 
      :db-path="getCurrentDbPath()"
      @module-change="handleModuleChange"
    />
    
    <!-- 搜索框 -->
    <div class="search-container mb-4">
      
      <!-- 函数名建议列表 -->
      <div class="suggestions-wrapper" v-if="showFunctionSuggestions">
        <div class="function-suggestions list-group">
          <button
            v-for="func in functionSuggestions"
            :key="func.name"
            class="list-group-item list-group-item-action"
            @click="selectFunction(func.name)"
          >
            {{ formatFunctionName(func.name) }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- 消息提示组件 -->
    <div class="message-container" v-if="message.show">
      <div :class="['message-box', `message-${message.type}`]">
        <i :class="['bi', messageIcon]"></i>
        <span>{{ message.content }}</span>
      </div>
    </div>
    
    <!-- 运行时分析内容 -->
    <div>
      
      <!-- 统计卡片 -->
      <div class="row mb-4">
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body text-center">
              <h5 class="card-title"><i class="bi bi-cpu me-2"></i>{{ $t('runtimeAnalysis.statistics.activeGoroutines') }}</h5>
              <p class="display-4">{{ goroutineStats.active || 0 }}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body text-center">
              <h5 class="card-title"><i class="bi bi-hourglass-split me-2"></i>{{ $t('runtimeAnalysis.statistics.avgExecutionTime') }}</h5>
              <p class="display-4">{{ goroutineStats.avgTime || '0ms' }}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body text-center">
              <h5 class="card-title"><i class="bi bi-lightning-charge me-2"></i>{{ $t('runtimeAnalysis.statistics.maxCallDepth') }}</h5>
              <p class="display-4">{{ goroutineStats.maxDepth || 0 }}</p>
            </div>
          </div>
        </div>

      </div>



      <!-- 热点函数分析 -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-gradient-primary text-white d-flex justify-content-between align-items-center">
          <h5 class="mb-0">
            <i class="bi bi-fire me-2"></i>{{ $t('runtimeAnalysis.hotFunctions.title') }}
            <small class="ms-2 opacity-75">(Top 10)</small>
          </h5>
          <div class="btn-group">
            <button class="btn btn-sm btn-light" @click="sortHotFunctions('calls')" :class="{ active: hotFunctionSortBy === 'calls' }">
              <i class="bi bi-sort-numeric-down me-1"></i>{{ $t('runtimeAnalysis.hotFunctions.sortByCalls') }}
            </button>
            <button class="btn btn-sm btn-light" @click="sortHotFunctions('time')" :class="{ active: hotFunctionSortBy === 'time' }">
              <i class="bi bi-clock-history me-1"></i>{{ $t('runtimeAnalysis.hotFunctions.sortByTime') }}
            </button>
          </div>
        </div>
        <div class="card-body p-0">
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">{{ $t('runtimeAnalysis.hotFunctions.loading') }}</span>
            </div>
            <p class="text-muted mb-0">{{ $t('runtimeAnalysis.hotFunctions.loadingData') }}</p>
          </div>
          <div v-else-if="hotFunctions.length === 0" class="text-center py-5">
            <div class="empty-state">
              <i class="bi bi-exclamation-circle text-warning display-4 mb-3"></i>
              <h6 class="text-muted">{{ $t('runtimeAnalysis.hotFunctions.noData') }}</h6>
              <p class="text-muted small">暂无热点函数数据</p>
            </div>
          </div>
          <div v-else>
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th class="border-0">
                      <i class="bi bi-code-slash me-1"></i>{{ $t('runtimeAnalysis.hotFunctions.functionName') }}
                    </th>
                    <th class="text-center border-0">
                      <i class="bi bi-arrow-repeat me-1"></i>{{ $t('runtimeAnalysis.hotFunctions.callCount') }}
                    </th>
                    <th class="text-center border-0">
                      <i class="bi bi-stopwatch me-1"></i>{{ $t('runtimeAnalysis.hotFunctions.totalTime') }}
                    </th>
                    <th class="text-center border-0">
                      <i class="bi bi-speedometer2 me-1"></i>{{ $t('runtimeAnalysis.hotFunctions.avgTime') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(func, index) in hotFunctions.slice(0, 10)" :key="index" class="hot-function-row">
                    <td class="function-name-cell">
                      <div class="d-flex align-items-center">
                        <span class="rank-badge me-2">{{ index + 1 }}</span>
                        <code class="function-name">{{ formatFunctionName(func.name) }}</code>
                      </div>
                    </td>
                    <td class="text-center">
                      <span class="badge bg-primary rounded-pill">{{ func.callCount }}</span>
                    </td>
                    <td class="text-center">
                      <span class="time-badge total-time">{{ func.totalTime }}</span>
                    </td>
                    <td class="text-center">
                      <span class="time-badge avg-time">{{ func.avgTime }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Goroutine列表 -->
      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-gradient-info text-white d-flex justify-content-between align-items-center">
          <h5 class="mb-0">
            <i class="bi bi-list-ul me-2"></i>{{ $t('runtimeAnalysis.goroutineList.title') }}
            <small class="ms-2 opacity-75">({{ total }} 个)</small>
          </h5>
          <div class="d-flex align-items-center">
            <span class="badge bg-light text-dark me-2">
              <i class="bi bi-activity me-1"></i>活跃: {{ goroutineStats.active }}
            </span>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th class="border-0">
                    <i class="bi bi-hash me-1"></i>{{ $t('runtimeAnalysis.goroutineList.gid') }}
                  </th>
                  <th class="border-0">
                    <i class="bi bi-code-slash me-1"></i>{{ $t('runtimeAnalysis.goroutineList.initialFunction') }}
                  </th>
                  <th class="text-center border-0">
                    <i class="bi bi-layers me-1"></i>{{ $t('runtimeAnalysis.goroutineList.callDepth') }}
                  </th>
                  <th class="text-center border-0">
                    <i class="bi bi-stopwatch me-1"></i>{{ $t('runtimeAnalysis.goroutineList.executionTime') }}
                  </th>
                  <th class="text-center border-0">
                    <i class="bi bi-circle-fill me-1"></i>状态
                  </th>
                  <th class="text-center border-0">
                    <i class="bi bi-gear me-1"></i>{{ $t('runtimeAnalysis.goroutineList.actions') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="result in filteredGIDs" :key="result.GID" class="goroutine-row">
                  <td class="gid-cell">
                    <span class="badge bg-primary rounded-pill">#{{ result.gid }}</span>
                  </td>
                  <td class="function-cell">
                    <code class="function-name">{{ formatFunctionName(result.initialFunc) }}</code>
                  </td>
                  <td class="text-center">
                    <span class="depth-badge">{{ result.depth || '-' }}</span>
                  </td>
                  <td class="text-center">
                    <span class="time-badge execution-time">{{ result.executionTime || '-' }}</span>
                  </td>
                  <td class="text-center">
                    <span v-if="result.isFinished" class="badge bg-success rounded-pill">
                      <i class="bi bi-check-circle me-1"></i>已完成
                    </span>
                    <span v-else class="badge bg-warning rounded-pill">
                      <i class="bi bi-play-circle me-1"></i>运行中
                    </span>
                  </td>
                  <td class="text-center">
                    <template v-if="result.gid">
                      <router-link 
                        :to="{ name: 'TraceDetails', params: { gid: result.gid } }" 
                        class="btn btn-sm btn-outline-primary"
                        :title="$t('runtimeAnalysis.goroutineList.details')"
                      >
                        <i class="bi bi-eye me-1"></i>{{ $t('runtimeAnalysis.goroutineList.details') }}
                      </router-link>
                    </template>
                  </td>
                </tr>
                <!-- 无数据时显示 -->
                <tr v-if="filteredGIDs.length === 0">
                  <td colspan="6" class="text-center py-5">
                    <div class="empty-state">
                      <i class="bi bi-inbox text-muted display-4 mb-3"></i>
                      <h6 class="text-muted">{{ $t('runtimeAnalysis.goroutineList.noData') }}</h6>
                      <p class="text-muted small">暂无Goroutine数据</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer">
          <!-- 分页控件 -->
          <div class="d-flex justify-content-between align-items-center">
            <!-- 分页信息 -->
            <div class="text-muted small">
              显示 {{ (currentPage - 1) * limit + 1 }} - {{ Math.min(currentPage * limit, total) }} 条，共 {{ total }} 条
              <span v-if="totalPages > 1" class="ms-2">（共 {{ totalPages }} 页）</span>
            </div>
            
            <!-- 分页导航 -->
            <nav aria-label="Page navigation">
              <ul class="pagination mb-0">
                <li class="page-item" :class="{ disabled: currentPage <= 1 }">
                  <a class="page-link" href="#" @click.prevent="goToPage(1)" title="首页">
                    <i class="bi bi-chevron-double-left"></i>
                  </a>
                </li>
                <li class="page-item" :class="{ disabled: currentPage <= 1 }">
                  <a class="page-link" href="#" @click.prevent="prevPage">{{ $t('runtimeAnalysis.goroutineList.prevPage') }}</a>
                </li>
                
                <!-- 显示省略号和页码 -->
                <li v-if="displayedPages[0] > 1" class="page-item disabled">
                  <span class="page-link">...</span>
                </li>
                <li v-for="page in displayedPages" :key="page" class="page-item" :class="{ active: page === currentPage }">
                  <a class="page-link" href="#" @click.prevent="goToPage(page)">{{ page }}</a>
                </li>
                <li v-if="displayedPages[displayedPages.length - 1] < totalPages" class="page-item disabled">
                  <span class="page-link">...</span>
                </li>
                
                <li class="page-item" :class="{ disabled: currentPage >= totalPages }">
                  <a class="page-link" href="#" @click.prevent="nextPage">{{ $t('runtimeAnalysis.goroutineList.nextPage') }}</a>
                </li>
                <li class="page-item" :class="{ disabled: currentPage >= totalPages }">
                  <a class="page-link" href="#" @click.prevent="goToPage(totalPages)" title="末页">
                    <i class="bi bi-chevron-double-right"></i>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      <!-- 函数分析组件 -->
      <FunctionAnalysis />




      <!-- 调用链路模态框 -->
      <CallChainModal
        v-model:visible="showCallChainModal"
        :call-chain="currentCallChain"
      />
    </div>
  </div>
</template>

<script>
import { useI18n } from 'vue-i18n';
import { ref, computed } from 'vue';
import CallChainModal from './CallChainModal.vue';
import FunctionAnalysis from './FunctionAnalysis.vue';
import ModuleSelector from './ModuleSelector.vue';
import { formatFunctionName } from '../utils/functionNameUtils.js';

export default {
  name: 'RuntimeAnalysis',
  components: {
    CallChainModal,
    FunctionAnalysis,
    ModuleSelector
  },
  props: {
    projectPath: {
      type: String,
      default: ''
    },
  },
  setup(props) {
    const { t, locale } = useI18n({ useScope: 'global' });
    const dbPath = computed(() => props.projectPath || '');
    const message = ref({
      show: false,
      content: '',
      type: 'info',
      timer: null
    });

    // 显示消息提示
    const showMessage = (content, type = 'info', duration = 3000) => {
      // 清除之前的定时器
      if (message.value.timer) {
        clearTimeout(message.value.timer);
      }
      
      // 设置消息内容
      message.value = {
        show: true,
        content,
        type,
        timer: null
      };
      
      // 设置定时器，自动关闭消息
      message.value.timer = setTimeout(() => {
        message.value.show = false;
      }, duration);
    };

    return {
      t,
      locale,
      dbPath,
      message,
      showMessage
    };
  },
  data() {
    return {
      functionName: '',
      filteredFunctionNames: [],
      showFunctionSuggestions: false,
      functionNames: [],
      currentPage: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
      gids: [],
      suggestionsTimer: null,
      isSearching: false,
      inputPosition: { top: 0, left: 0, width: 0 },
      loading: false,
      showAllGoroutines: false,
      hotFunctions: [],
      hotFunctionSortBy: 'calls',
      goroutineStats: {
        active: 0,
        avgTime: '0ms',
        maxDepth: 0
      },

      highlightedFunctionId: null,


      showCallChainModal: false,
      currentCallChain: []
    };
  },
  mounted() {
    this.isComponentMounted = true;
    

    
    // 初始化数据
    this.initializeData();
    
    document.addEventListener('click', this.handleDocumentClick);
    window.addEventListener('resize', this.updateInputPosition);
    
    // 添加语言变化监听
    window.addEventListener('languageChanged', this.handleLanguageChange);
  },
  beforeUnmount() {
    this.isComponentMounted = false;
    
    document.removeEventListener('click', this.handleDocumentClick);
    window.removeEventListener('resize', this.updateInputPosition);
    window.removeEventListener('languageChanged', this.handleLanguageChange);
    
    if (this.suggestionsTimer) {
      clearTimeout(this.suggestionsTimer);
    }
    
  },
  computed: {
    filteredGIDs() {
      return this.gids || [];
    },
    displayedPages() {
      const pages = [];
      const maxVisiblePages = 5;
      
      // 如果总页数小于等于最大显示页数，显示所有页
      if (this.totalPages <= maxVisiblePages) {
        for (let i = 1; i <= this.totalPages; i++) {
          pages.push(i);
        }
        return pages;
      }
      
      // 计算起始和结束页码
      let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
      
      // 调整起始页码，确保显示足够的页码
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      // 确保当前页在显示范围内
      if (this.currentPage < startPage) {
        startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
      } else if (this.currentPage > endPage) {
        endPage = Math.min(this.totalPages, this.currentPage + Math.floor(maxVisiblePages / 2));
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      return pages;
    },

    
    // 消息图标
    messageIcon() {
      const icons = {
        info: 'bi-info-circle',
        success: 'bi-check-circle',
        error: 'bi-exclamation-circle',
        warning: 'bi-exclamation-triangle'
      };
      return icons[this.message.type] || icons.info;
    }
  },
  watch: {
    showAllGoroutines() {
      this.fetchGIDs();
    },
    dbPath(newVal) {
      if (newVal) {
        this.initializeData();
      }
    }
  },
  methods: {
    // 返回首页
    backToHome() {
      this.$router.push('/');
    },
    
    // 初始化数据
    initializeData() {
      this.fetchGIDs();
      this.fetchHotFunctions();
      this.fetchFunctionNames();
    },
    
    // 获取当前数据库路径
    getCurrentDbPath() {
      // 否则使用项目路径作为数据库路径
      if (this.projectPath) {
        return this.projectPath;
      }
      return '';
    },
    
    // 获取所有GID列表
    async fetchGIDs() {
      try {
        this.loading = true;
        const dbpath = this.getCurrentDbPath();
        
        if (!dbpath) {
          this.showMessage('database path is empty', 'error');
          this.loading = false;
          return;
        }
        
        // 调用API获取GID列表
        const response = await fetch('/api/runtime/gids', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            page: this.currentPage,
            limit: this.limit,
            includeMetrics: true,
            dbpath: dbpath
          })
        });
        
        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 更新数据
        this.gids = data.body || [];
        this.total = parseInt(data.total || '0', 10);
        this.totalPages = Math.max(1, Math.ceil(this.total / this.limit));
        
        // 确保当前页码不超过总页数
        if (this.currentPage > this.totalPages && this.totalPages > 0) {
          this.currentPage = this.totalPages;
        }
        
        // 更新Goroutine统计信息
        this.fetchGoroutineStats();
      } catch (error) {
        this.showMessage(`get gid list failed: ${error.message}`, 'error');
        this.gids = [];
        this.total = 0;
        this.totalPages = 1;
      } finally {
        this.loading = false;
      }
    },
    
    // 获取Goroutine统计信息
    async fetchGoroutineStats() {
      try {
        const dbpath = this.getCurrentDbPath();
        
        if (!dbpath) {
          return;
        }
        
        const response = await fetch('/api/runtime/goroutine-stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dbpath: dbpath
          })
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 更新统计信息
        this.goroutineStats = {
          active: data.active || 0,
          avgTime: data.avgTime || '0ms',
          maxDepth: data.maxDepth || 0
        };
      } catch (error) {
        this.showMessage(`get goroutine stats failed: ${error.message}`, 'error');
        // 不显示错误消息，因为这是次要功能
      }
    },
    
    // 分页控制方法
    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.fetchGIDs();
      }
    },
    
    nextPage() {
      // 确保有下一页数据才进行翻页
      if (this.currentPage < this.totalPages && this.totalPages > 0) {
        this.currentPage++;
        this.fetchGIDs();
      }
    },
    
    goToPage(page) {
      // 确保页码在有效范围内
      if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
        this.currentPage = page;
        this.fetchGIDs();
      }
    },
    
    // 获取热点函数列表
    async fetchHotFunctions() {
      try {
        this.loading = true;
        const dbpath = this.getCurrentDbPath();
        
        if (!dbpath) {
          this.showMessage('database path is empty', 'error');
          this.loading = false;
          return;
        }
        
        // 调用API获取热点函数列表
        const response = await fetch('/api/runtime/hot-functions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            limit: 10,
            sortBy: this.hotFunctionSortBy,
            dbpath: dbpath
          })
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 更新数据
        this.hotFunctions = data.functions || [];
      } catch (error) {
        this.showMessage(`get hot functions list failed: ${error.message}`, 'error');
        this.hotFunctions = [];
      } finally {
        this.loading = false;
      }
    },
    
    // 排序热点函数
    async sortHotFunctions(sortBy) {
      if (this.hotFunctionSortBy === sortBy) {
        return; // 如果已经是当前排序方式，则不需要重新排序
      }
      
      this.hotFunctionSortBy = sortBy;
      await this.fetchHotFunctions(); // 重新获取排序后的数据
    },
    
    // 获取函数名列表（用于自动完成）
    async fetchFunctionNames() {
      try {
        const dbpath = this.getCurrentDbPath();
        
        if (!dbpath) {
          return;
        }
        
        const response = await fetch('/api/runtime/functions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dbpath: dbpath
          })
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 更新数据
        this.functionNames = data.functions || [];
      } catch (error) {
        this.showMessage(`get function names failed: ${error.message}`, 'error');
        this.functionNames = [];
      }
    },
    

    
    // 处理文档点击事件
    handleDocumentClick(event) {
      // 如果点击的不是建议列表或输入框，则隐藏建议列表
      if (this.showFunctionSuggestions) {
        const suggestions = document.querySelector('.function-suggestions');
        const input = document.querySelector('#functionNameInput');
        
        if (suggestions && input && !suggestions.contains(event.target) && !input.contains(event.target)) {
          this.showFunctionSuggestions = false;
        }
      }
    },
    
    // 更新输入框位置
    updateInputPosition() {
      const input = this.$refs.functionNameInput;
      if (input) {
        const rect = input.getBoundingClientRect();
        this.inputPosition = {
          top: rect.top,
          left: rect.left,
          width: rect.width
        };
      }
    },
    
    // 处理语言变化
    handleLanguageChange() {
      // 重新初始化数据
      this.initializeData();
    },
    
    // 选择函数
    selectFunction(name) {
      this.functionName = name;
      this.showFunctionSuggestions = false;
    },
    
    // 格式化函数名称（根据选中的module进行简化）
    formatFunctionName(functionName) {
      // 从localStorage获取当前数据库的module设置
      const dbPath = this.getCurrentDbPath();
      let currentModule = '';
      if (dbPath) {
        const storageKey = `runtime_analysis_module_${dbPath}`;
        currentModule = localStorage.getItem(storageKey) || '';
      }
      return formatFunctionName(functionName, currentModule);
    },
    
    // 处理module选择变化
    handleModuleChange(module) {
      console.log('Module changed to:', module);
      
      // 保存module选择到localStorage（以数据库名称作为key）
      const dbPath = this.getCurrentDbPath();
      if (dbPath) {
        const storageKey = `runtime_analysis_module_${dbPath}`;
        if (module) {
          localStorage.setItem(storageKey, module);
        } else {
          localStorage.removeItem(storageKey);
        }
      }
      
      // 强制刷新页面以重新获取原始数据
      window.location.reload();
    },
    




  }
};
</script>

<style>
@import url("../../../assets/styles/components/runtime/runtime-analysis.css");
</style>