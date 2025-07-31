<template>
  <div class="runtime-analysis">
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
            {{ func.name }}
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
        <div class="card-header">
          <h5 class="mb-0"><i class="bi bi-list-ul me-2"></i>{{ $t('runtimeAnalysis.goroutineList.title') }}</h5>
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


      <!-- 函数调用关系图组件 -->
      <GidCallGraph
        v-model:visible="showChart"
        :gid="currentGid"
        :dbpath="dbPath"
        :chart-data="chartData"
        @error="handleChartError"
      />

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
import axios from 'axios';
import GidCallGraph from './GidCallGraph.vue';
import CallChainModal from './CallChainModal.vue';
import FunctionAnalysis from './FunctionAnalysis.vue';

export default {
  name: 'RuntimeAnalysis',
  components: {
    GidCallGraph,
    CallChainModal,
    FunctionAnalysis
  },
  props: {
    projectPath: {
      type: String,
      default: ''
    },
  },
  setup(props) {
    const { t, locale } = useI18n({ useScope: 'global' });
    const currentGid = ref(0);
    const showChart = ref(false);
    const chartData = ref(null);
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

    // 查看函数调用链
    const viewFunctionCallChain = (gid) => {
      currentGid.value = Number(gid);
      showChart.value = true;
    };

    // 处理图表错误
    const handleChartError = (error) => {
      showMessage(`图表加载失败: ${error.message}`, 'error');
      showChart.value = false;
    };

    return {
      t,
      locale,
      currentGid,
      showChart,
      chartData,
      dbPath,
      message,
      showMessage,
      viewFunctionCallChain,
      handleChartError
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
    
    // 显示函数调用关系图
    async showFunctionCallGraph(gid) {
      try {
        // 保存当前滚动位置
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        
        this.currentGid = gid;
        // 先设置showChart为true，确保模态框开始显示
        this.showChart = true;
        this.chartData = null; // 清空旧数据
        
        // 获取函数调用链数据
        const [treeResponse, traceResponse] = await Promise.all([
          axios.post('/api/runtime/tree-graph/gid', {
            dbPath: this.getCurrentDbPath(),
            gid: gid
          }),
          axios.post(`/api/runtime/traces/${gid}`, {
            dbpath: this.getCurrentDbPath()
          })
        ]);
        
        const treeData = treeResponse.data;
        const traceData = traceResponse.data;
        
        if (!treeData || !treeData.trees || !traceData || !traceData.traceData) {
          throw new Error('返回的数据格式不正确');
        }
        
        // 创建函数ID到执行时间的映射
        const executionTimeMap = {};
        traceData.traceData.forEach(trace => {
          if (trace.id && trace.timeCost) {
            executionTimeMap[trace.id] = trace.timeCost;
          }
        });
        
        // 递归添加执行时间到树节点
        const addExecutionTime = (node) => {
          if (!node) return;
          
          // 添加执行时间
          if (node.value && executionTimeMap[node.value]) {
            node.executionTime = executionTimeMap[node.value];
          }
          
          // 递归处理子节点
          if (Array.isArray(node.children)) {
            node.children.forEach(child => addExecutionTime(child));
          }
        };
        
        // 处理所有树
        treeData.trees.forEach(tree => addExecutionTime(tree));
        
        // 确保每棵树都是一个独立的数据结构
        const processedTreeData = treeData.trees.map(tree => {
          // 处理树节点，确保数据格式正确
          return {
            name: tree.name || 'Root',
            value: tree.value || '',
            children: tree.children || [],
            executionTime: tree.executionTime || null
          };
        });
        
        // 更新图表数据
        // 延迟设置图表数据，确保模态框已经显示
        setTimeout(() => {
          this.chartData = processedTreeData;
        }, 200);

        // 监听模态框关闭事件
        const handleModalHidden = () => {
          // 恢复滚动位置
          setTimeout(() => {
            window.scrollTo(0, scrollPosition);
          }, 100);
        };

        // 添加一次性事件监听
        const modal = document.querySelector('.modal');
        if (modal) {
          modal.addEventListener('hidden.bs.modal', handleModalHidden, { once: true });
        }
      } catch (error) {
        this.showMessage(`获取调用链数据失败: ${error.message}`, 'error');
        this.showChart = false;
      }
    },



  }
};
</script>

<style>
@import url("../../../assets/styles/components/runtime/runtime-analysis.css");
</style>