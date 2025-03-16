<template>
  <div class="runtime-analysis">
    <!-- 消息提示组件 -->
    <div class="message-container" v-if="message.show">
      <div :class="['message-box', `message-${message.type}`]">
        <i :class="['bi', messageIcon]"></i>
        <span>{{ message.content }}</span>
      </div>
    </div>
    
    <!-- 运行时分析内容 -->
    <div>
      
      <!-- 函数名建议列表 -->
      <div class="suggestions-wrapper" v-if="showFunctionSuggestions && filteredFunctionNames.length">
        <ul class="list-group function-suggestions">
          <li
            v-for="(name, index) in filteredFunctionNames"
            :key="index"
            class="list-group-item list-group-item-action"
            @mousedown.prevent="selectFunction(name)"
          >
            {{ name }}
          </li>
        </ul>
      </div>

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
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body text-center">
              <h5 class="card-title"><i class="bi bi-exclamation-triangle me-2"></i>未完成函数</h5>
              <p class="display-4">{{ unfinishedFunctions.length || 0 }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 未完成函数列表 -->
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="bi bi-exclamation-circle me-2"></i>未完成函数列表</h5>
          <div class="d-flex align-items-center">
            <div class="threshold-control me-3">
              <label class="form-label mb-0 me-2 fw-bold">阻塞阈值：</label>
              <div class="input-group">
                <input 
                  type="number" 
                  class="form-control" 
                  v-model="blockingThreshold" 
                  min="100"
                  step="100"
                  style="width: 100px;"
                >
                <span class="input-group-text">ms</span>
                <button class="btn btn-primary" @click="updateBlockingThreshold" title="应用阈值">
                  <i class="bi bi-check-lg"></i> 应用
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div v-if="loadingUnfinishedFunctions" class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">加载中...</span>
            </div>
            <p class="mt-3">正在加载未完成函数数据...</p>
          </div>
          <div v-else-if="unfinishedFunctions.length === 0" class="text-center py-5">
            <i class="bi bi-check-circle text-success display-4"></i>
            <p class="mt-3">没有检测到未完成函数</p>
          </div>
          <div v-else>
            <div class="alert alert-info mb-3">
              <i class="bi bi-info-circle me-2"></i>
              当函数运行时间超过 <strong>{{ blockingThreshold }}ms</strong> 时会被标记为阻塞状态
            </div>
            <div class="table-responsive">
              <table class="table table-hover">
                <thead class="table-light">
                  <tr>
                    <th>函数名称</th>
                    <th class="text-center">GID</th>
                    <th class="text-center">已运行时间</th>
                    <th class="text-center">状态</th>
                    <th class="text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(func, index) in unfinishedFunctions" :key="index" :class="{'table-warning': func.isBlocking}">
                    <td><code>{{ func.name }}</code></td>
                    <td class="text-center">
                      <span class="badge bg-primary">{{ func.gid }}</span>
                    </td>
                    <td class="text-center">{{ func.runningTime || '未知' }}</td>
                    <td class="text-center">
                      <span v-if="func.isBlocking" class="badge bg-danger">
                        <i class="bi bi-exclamation-triangle me-1"></i>阻塞
                      </span>
                      <span v-else class="badge bg-secondary">
                        <i class="bi bi-hourglass-split me-1"></i>运行中
                      </span>
                    </td>
                    <td class="text-center">
                      <router-link 
                        :to="{ name: 'TraceDetails', params: { gid: func.gid }, query: { highlight: func.functionId } }" 
                        class="btn btn-sm btn-success"
                        title="查看详情并高亮显示"
                      >
                        <i class="bi bi-eye me-1"></i>详情
                      </router-link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- 分页控件 -->
            <div class="d-flex justify-content-between align-items-center mt-3">
              <div>
                <span class="text-muted">共 {{ unfinishedFunctionsTotal }} 个未完成函数</span>
              </div>
              <nav aria-label="未完成函数分页">
                <ul class="pagination mb-0">
                  <li class="page-item" :class="{ disabled: unfinishedFunctionsPage <= 1 }">
                    <a class="page-link" href="#" @click.prevent="prevUnfinishedFunctionsPage">
                      <i class="bi bi-chevron-left"></i>
                    </a>
                  </li>
                  <li v-for="page in displayedUnfinishedFunctionsPages" :key="page" 
                      class="page-item" :class="{ active: page === unfinishedFunctionsPage }">
                    <a class="page-link" href="#" @click.prevent="goToUnfinishedFunctionsPage(page)">{{ page }}</a>
                  </li>
                  <li class="page-item" :class="{ disabled: unfinishedFunctionsPage >= unfinishedFunctionsTotalPages }">
                    <a class="page-link" href="#" @click.prevent="nextUnfinishedFunctionsPage">
                      <i class="bi bi-chevron-right"></i>
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <!-- 热点函数分析 -->
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="bi bi-fire me-2"></i>{{ $t('runtimeAnalysis.hotFunctions.title') }}</h5>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-primary" @click="sortHotFunctions('calls')" :class="{ active: hotFunctionSortBy === 'calls' }">
              {{ $t('runtimeAnalysis.hotFunctions.sortByCalls') }}
            </button>
            <button class="btn btn-sm btn-outline-primary" @click="sortHotFunctions('time')" :class="{ active: hotFunctionSortBy === 'time' }">
              {{ $t('runtimeAnalysis.hotFunctions.sortByTime') }}
            </button>
          </div>
        </div>
        <div class="card-body">
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">{{ $t('runtimeAnalysis.hotFunctions.loading') }}</span>
            </div>
            <p class="mt-3">{{ $t('runtimeAnalysis.hotFunctions.loadingData') }}</p>
          </div>
          <div v-else-if="hotFunctions.length === 0" class="text-center py-5">
            <i class="bi bi-exclamation-circle text-warning display-4"></i>
            <p class="mt-3">{{ $t('runtimeAnalysis.hotFunctions.noData') }}</p>
          </div>
          <div v-else>
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>{{ $t('runtimeAnalysis.hotFunctions.functionName') }}</th>
                    <th class="text-center">{{ $t('runtimeAnalysis.hotFunctions.callCount') }}</th>
                    <th class="text-center">{{ $t('runtimeAnalysis.hotFunctions.totalTime') }}</th>
                    <th class="text-center">{{ $t('runtimeAnalysis.hotFunctions.avgTime') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(func, index) in hotFunctions.slice(0, 10)" :key="index">
                    <td><code>{{ func.name }}</code></td>
                    <td class="text-center">
                      <span class="badge bg-primary">{{ func.callCount }}</span>
                    </td>
                    <td class="text-center">{{ func.totalTime }}</td>
                    <td class="text-center">{{ func.avgTime }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Goroutine列表 -->
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="bi bi-list-ul me-2"></i>{{ $t('runtimeAnalysis.goroutineList.title') }}</h5>
          <div class="pagination-info">
            <span class="badge bg-secondary">{{ $t('runtimeAnalysis.goroutineList.currentPage') }}: {{ currentPage }} / {{ totalPages }}</span>
            <div class="btn-group ms-2">
              <button class="btn btn-sm btn-outline-primary" @click="prevPage" :disabled="currentPage <= 1">
                <i class="bi bi-chevron-left"></i>
              </button>
              <button class="btn btn-sm btn-outline-primary" @click="nextPage" :disabled="currentPage >= totalPages">
                <i class="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover table-striped mb-0">
              <thead class="table-light">
                <tr>
                  <th>{{ $t('runtimeAnalysis.goroutineList.gid') }}</th>
                  <th>{{ $t('runtimeAnalysis.goroutineList.initialFunction') }}</th>
                  <th class="text-center">{{ $t('runtimeAnalysis.goroutineList.callDepth') }}</th>
                  <th class="text-center">{{ $t('runtimeAnalysis.goroutineList.executionTime') }}</th>
                  <th class="text-center">状态</th>
                  <th class="text-center">{{ $t('runtimeAnalysis.goroutineList.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="result in filteredGIDs" :key="result.GID">
                  <td><span class="badge bg-primary">{{ result.gid }}</span></td>
                  <td><code>{{ result.initialFunc }}</code></td>
                  <td class="text-center">{{ result.depth || '-' }}</td>
                  <td class="text-center">{{ result.executionTime || '-' }}</td>
                  <td class="text-center">
                    <span v-if="result.isFinished" class="badge bg-success">已完成</span>
                    <span v-else class="badge bg-warning">运行中</span>
                  </td>
                  <td class="text-center">
                    <template v-if="result.gid">
                      <div class="btn-group">
                        <router-link 
                          :to="{ name: 'TraceDetails', params: { gid: result.gid } }" 
                          class="btn btn-sm btn-primary"
                          :title="$t('runtimeAnalysis.goroutineList.details')"
                        >
                          <i class="bi bi-eye"></i> {{ $t('runtimeAnalysis.goroutineList.details') }}
                        </router-link>
                        <button 
                          class="btn btn-sm btn-success"
                          :title="$t('runtimeAnalysis.goroutineList.callGraph')"
                          @click="showFunctionCallGraph(result.gid)"
                        >
                          <i class="bi bi-graph-up"></i> {{ $t('runtimeAnalysis.goroutineList.callGraph') }}
                        </button>
                      </div>
                    </template>
                  </td>
                </tr>
                <!-- 无数据时显示 -->
                <tr v-if="filteredGIDs.length === 0">
                  <td colspan="6" class="text-center py-4">
                    <div class="alert alert-info mb-0">
                      <i class="bi bi-info-circle me-2"></i>
                      {{ $t('runtimeAnalysis.goroutineList.noData') }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer">
          <!-- 分页控件 -->
          <nav aria-label="Page navigation">
            <ul class="pagination justify-content-center mb-0">
              <li class="page-item" :class="{ disabled: currentPage <= 1 }">
                <a class="page-link" href="#" @click.prevent="prevPage">{{ $t('runtimeAnalysis.goroutineList.prevPage') }}</a>
              </li>
              <li v-for="page in displayedPages" :key="page" class="page-item" :class="{ active: page === currentPage }">
                <a class="page-link" href="#" @click.prevent="goToPage(page)">{{ page }}</a>
              </li>
              <li class="page-item" :class="{ disabled: currentPage >= totalPages }">
                <a class="page-link" href="#" @click.prevent="nextPage">{{ $t('runtimeAnalysis.goroutineList.nextPage') }}</a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <!-- 函数调用关系图组件 -->
      <function-call-graph
        v-if="showChart"
        :visible="showChart"
        :gid="currentGid"
        :dbpath="getCurrentDbPath()"
        @update:visible="showChart = $event"
        @error="handleChartError"
        :key="`chart-${currentGid}-${chartRenderCount}`"
        :use-mock-data="testMode"
      />
    </div>
  </div>
</template>

<script>
import FunctionCallGraph from '../charts/FunctionCallGraph.vue';
import { useI18n } from 'vue-i18n';

export default {
  name: 'RuntimeAnalysis',
  components: {
    FunctionCallGraph
  },
  props: {
    projectPath: {
      type: String,
      default: ''
    },
    dbPath: {
      type: String,
      default: ''
    },
  },
  setup() {
    const { t, locale } = useI18n({ useScope: 'global' });
    return { t, locale };
  },
  data() {
    return {
      projectPathInput: '',
      functionName: '',
      filteredFunctionNames: [],
      showFunctionSuggestions: false,
      functionNames: [],
      currentPage: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
      gids: [],
      currentGid: null,
      suggestionsTimer: null, // 用于延迟隐藏建议列表的计时器
      isSearching: false, // 标记是否正在搜索
      inputPosition: { top: 0, left: 0, width: 0 }, // 存储输入框位置
      loading: false,
      showAllGoroutines: false,
      hotFunctions: [],
      hotFunctionSortBy: 'calls', // 'calls' 或 'time'
      goroutineStats: {
        active: 0,
        avgTime: '0ms',
        maxDepth: 0
      },
      showChart: false, // 是否显示图表
      showDatabaseError: false, // 添加数据库错误标志
      gidLimit: 10, // 添加gidLimit属性
      hotFunctionLimit: 10, // 添加hotFunctionLimit属性
      chartRenderCount: 0, // 图表渲染计数器，用于强制重新创建组件
      testMode: false, // 测试模式，用于在API请求失败时使用模拟数据
      searchTimeout: null, // 用于防抖
      unfinishedFunctions: [], // 未完成函数列表
      unfinishedFunctionsTotal: 0, // 未完成函数总数
      unfinishedFunctionsPage: 1, // 当前页码
      unfinishedFunctionsLimit: 10, // 每页数量
      unfinishedFunctionsTotalPages: 1, // 总页数
      blockingThreshold: 1000, // 阻塞时间阈值（毫秒），默认1秒
      loadingUnfinishedFunctions: false, // 加载状态
      highlightedFunctionId: null, // 高亮显示的函数ID
      
      // 消息提示
      message: {
        show: false,
        content: '',
        type: 'info', // info, success, error, warning
        timer: null
      }
    };
  },
  mounted() {
    this.isComponentMounted = true;
    
    // 从本地存储中恢复阻塞阈值设置
    const savedThreshold = localStorage.getItem('blockingThreshold');
    if (savedThreshold) {
      const threshold = parseInt(savedThreshold);
      if (!isNaN(threshold) && threshold >= 100) {
        this.blockingThreshold = threshold;
      }
    }
    
    // 初始化数据
    this.initializeData();
    
    document.addEventListener('click', this.handleDocumentClick);
    window.addEventListener('resize', this.updateInputPosition);
    
    // 添加语言变化监听
    window.addEventListener('languageChanged', this.handleLanguageChange);
  },
  beforeUnmount() {
    // 确保在组件卸载前关闭图表
    this.showChart = false;
    
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
      let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      return pages;
    },
    displayedUnfinishedFunctionsPages() {
      const pages = [];
      const maxVisiblePages = 5;
      let startPage = Math.max(1, this.unfinishedFunctionsPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(this.unfinishedFunctionsTotalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
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
      this.projectPathInput = this.projectPath;
      this.fetchGIDs();
      this.fetchHotFunctions();
      this.fetchFunctionNames();
      this.fetchUnfinishedFunctions();
      
    },
    
    // 获取当前数据库路径
    getCurrentDbPath() {
      console.log('获取数据库路径，当前状态:', {
        dbPath: this.dbPath,
        projectPath: this.projectPath
      });
      
      // 如果已经设置了数据库路径，直接返回
      if (this.dbPath) {
        console.log('使用已设置的数据库路径:', this.dbPath);
        return this.dbPath;
      }
      
      // 否则使用项目路径作为数据库路径
      if (this.projectPath) {
        console.log('使用项目路径作为数据库路径:', this.projectPath);
        return this.projectPath;
      }
      
      // 如果都没有，返回空字符串
      console.warn('数据库路径为空');
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
        this.total = data.total || 0;
        this.totalPages = Math.ceil(this.total / this.limit) || 1;
        
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
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.fetchGIDs();
      }
    },
    
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.fetchGIDs();
      }
    },
    
    // 显示消息
    showMessage(content, type = 'info', duration = 3000) {
      // 清除之前的定时器
      if (this.message.timer) {
        clearTimeout(this.message.timer);
      }
      
      // 设置消息内容
      this.message = {
        show: true,
        content,
        type,
        timer: null
      };
      
      // 设置定时器，自动关闭消息
      this.message.timer = setTimeout(() => {
        this.message.show = false;
      }, duration);
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
            limit: this.hotFunctionLimit,
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
        
        // 更新函数名列表
        this.functionNames = data.functionNames || [];
      } catch (error) {
        this.showMessage(`get function names list failed: ${error.message}`, 'error');
        this.functionNames = [];
      }
    },
    
    // 获取未完成函数列表
    async fetchUnfinishedFunctions() {
      try {
        this.loadingUnfinishedFunctions = true;
        const dbpath = this.getCurrentDbPath();
        
        if (!dbpath) {
          this.loadingUnfinishedFunctions = false;
          return;
        }
        
        // 调用API获取未完成函数列表
        const response = await fetch('/api/runtime/unfinished-functions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            page: this.unfinishedFunctionsPage,
            limit: this.unfinishedFunctionsLimit,
            blockingThreshold: this.blockingThreshold,
            dbpath: dbpath
          })
        });
        
        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 更新数据
        this.unfinishedFunctions = data.functions || [];
        this.unfinishedFunctionsTotal = data.total || 0;
        this.unfinishedFunctionsTotalPages = Math.ceil(this.unfinishedFunctionsTotal / this.unfinishedFunctionsLimit) || 1;
      } catch (error) {
        this.showMessage(`get unfinished functions list failed: ${error.message}`, 'error');
        this.unfinishedFunctions = [];
        this.unfinishedFunctionsTotal = 0;
        this.unfinishedFunctionsTotalPages = 1;
      } finally {
        this.loadingUnfinishedFunctions = false;
      }
    },
    
    // 更新阻塞阈值
    updateBlockingThreshold() {
      // 验证阈值
      if (isNaN(this.blockingThreshold) || this.blockingThreshold < 100) {
        this.showMessage('blocking threshold must be greater than or equal to 100ms', 'warning');
        this.blockingThreshold = 1000; // 重置为默认值
        return;
      }
      
      // 保存到本地存储
      localStorage.setItem('blockingThreshold', this.blockingThreshold.toString());
      
      // 刷新未完成函数列表
      this.fetchUnfinishedFunctions();
      
      this.showMessage(`blocking threshold has been updated to ${this.blockingThreshold}ms`, 'success');
    },
    
    // 未完成函数分页控制
    prevUnfinishedFunctionsPage() {
      if (this.unfinishedFunctionsPage > 1) {
        this.unfinishedFunctionsPage--;
        this.fetchUnfinishedFunctions();
      }
    },
    
    nextUnfinishedFunctionsPage() {
      if (this.unfinishedFunctionsPage < this.unfinishedFunctionsTotalPages) {
        this.unfinishedFunctionsPage++;
        this.fetchUnfinishedFunctions();
      }
    },
    
    goToUnfinishedFunctionsPage(page) {
      if (page >= 1 && page <= this.unfinishedFunctionsTotalPages) {
        this.unfinishedFunctionsPage = page;
        this.fetchUnfinishedFunctions();
      }
    },
    
    // 查看函数调用链
    viewFunctionCallChain(functionId, gid) {
      this.highlightedFunctionId = functionId;
      this.currentGid = gid;
      this.showChart = true;
    },
    
    // 显示函数调用图
    showFunctionCallGraph(gid) {
      this.currentGid = gid;
      this.chartRenderCount++; // 增加计数器，强制重新创建组件
      this.showChart = true;
    },
    
    // 处理图表错误
    handleChartError(error) {
      this.showMessage(`chart loading failed: ${error.message}`, 'error');
    },
    
    // 排序热点函数
    sortHotFunctions(sortBy) {
      if (this.hotFunctionSortBy !== sortBy) {
        this.hotFunctionSortBy = sortBy;
        this.fetchHotFunctions();
      }
    },
    
    // 处理文档点击事件（用于隐藏建议列表）
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
    
    // 更新输入框位置（用于建议列表定位）
    updateInputPosition() {
      const input = document.querySelector('#functionNameInput');
      if (input) {
        const rect = input.getBoundingClientRect();
        this.inputPosition = {
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        };
      }
    },
    
    // 处理语言变化
    handleLanguageChange() {
      // 刷新数据
      this.fetchGIDs();
      this.fetchHotFunctions();
    },
    
    // 选择函数名
    selectFunction(name) {
      this.functionName = name;
      this.showFunctionSuggestions = false;
      
      // 根据选择的函数名搜索相关的GID
      this.searchGIDsByFunctionName();
    },
    
    // 根据函数名搜索GID
    async searchGIDsByFunctionName() {
      if (!this.functionName.trim()) {
        // 如果函数名为空，则获取所有GID
        this.fetchGIDs();
        return;
      }
      
      try {
        this.loading = true;
        const dbpath = this.getCurrentDbPath();
        
        if (!dbpath) {
          this.showMessage('database path is empty', 'error');
          this.loading = false;
          return;
        }
        
        // 调用API根据函数名搜索GID
        const response = await fetch('/api/runtime/gids/function', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            functionName: this.functionName,
            path: dbpath,
            includeMetrics: true
          })
        });
        
        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 更新数据
        this.gids = data.body || [];
        this.total = data.total || 0;
        this.totalPages = Math.ceil(this.total / this.limit) || 1;
        this.currentPage = 1; // 重置为第一页
        
        if (this.gids.length === 0) {
          this.showMessage(`no goroutine found for function "${this.functionName}"`, 'info');
        }
      } catch (error) {
        this.showMessage(`search function failed: ${error.message}`, 'error');
        this.gids = [];
        this.total = 0;
        this.totalPages = 1;
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.search-container {
  position: relative;
}

.suggestions-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 0;
  z-index: 9999;
  pointer-events: none;
}

.function-suggestions {
  position: absolute;
  z-index: 9999;
  width: calc(100% - 30px);
  max-width: 600px;
  max-height: 300px;
  overflow-y: auto;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  margin-top: 0;
  top: 140px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: auto;
  padding: 0;
}

.function-suggestions .list-group-item {
  border-left: none;
  border-right: none;
  border-radius: 0;
  padding: 0.75rem 1rem;
  font-family: 'Consolas', 'Monaco', monospace;
  transition: all 0.2s ease;
  cursor: pointer;
}

.function-suggestions .list-group-item:first-child {
  border-top: none;
}

.function-suggestions .list-group-item:last-child {
  border-bottom: none;
}

.function-suggestions .list-group-item:hover {
  background-color: #f8f9fa;
  color: #0d6efd;
}

.function-suggestions .list-group-item-action:active {
  background-color: #e9ecef;
}

.pagination-info {
  display: flex;
  align-items: center;
}

/* 阻塞阈值控件样式 */
.threshold-control {
  display: flex;
  align-items: center;
  background-color: #f8f9fa;
  padding: 8px 12px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.threshold-control .form-label {
  color: #495057;
  white-space: nowrap;
}

.threshold-control .input-group {
  width: auto;
  flex-wrap: nowrap;
}

.threshold-control .form-control {
  text-align: center;
  font-weight: 500;
}

.threshold-control .btn-primary {
  min-width: 80px;
}

@media (max-width: 768px) {
  .pagination-info {
    margin-top: 1rem;
  }
  
  .function-suggestions {
    width: 90%;
    top: 180px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start !important;
  }
  
  .card-header .d-flex {
    margin-top: 10px;
    width: 100%;
  }
  
  .threshold-control {
    width: 100%;
    margin-bottom: 10px;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .threshold-control .form-label {
    margin-bottom: 5px !important;
  }
  
  .threshold-control .input-group {
    width: 100%;
  }
}

/* 消息提示样式 */
.message-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  min-width: 300px;
  max-width: 80%;
}

.message-box {
  padding: 10px 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  animation: message-fade-in 0.3s;
}

.message-box i {
  margin-right: 10px;
  font-size: 16px;
}

.message-info {
  background-color: #f4f4f5;
  border: 1px solid #ebeef5;
  color: #909399;
}

.message-success {
  background-color: #f0f9eb;
  border: 1px solid #e1f3d8;
  color: #67c23a;
}

.message-warning {
  background-color: #fdf6ec;
  border: 1px solid #faecd8;
  color: #e6a23c;
}

.message-error {
  background-color: #fef0f0;
  border: 1px solid #fde2e2;
  color: #f56c6c;
}

@keyframes message-fade-in {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style> 