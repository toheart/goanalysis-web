<template>
  <div class="db-analysis-detail">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="mb-0">
        <i class="bi bi-database me-2"></i>数据库分析结果
      </h2>
      <button class="btn btn-outline-secondary" @click="goBack">
        <i class="bi bi-arrow-left me-2"></i>返回数据库列表
      </button>
    </div>

    <div v-if="loading" class="card mb-4">
      <div class="card-body text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3">正在分析数据库，请稍候...</p>
      </div>
    </div>
    
    <div v-else-if="analysisResult" class="analysis-result">
      <!-- 数据库信息 -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0"><i class="bi bi-info-circle me-2"></i>数据库信息</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <p><strong>文件名:</strong> {{ dbFileName }}</p>
              <p><strong>文件大小:</strong> {{ formatSize(dbFileSize) }}</p>
            </div>
            <div class="col-md-6">
              <p><strong>创建时间:</strong> {{ formatDate(dbFileCreateTime) }}</p>
              <p><strong>文件路径:</strong> {{ dbFilePath }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 基本信息卡片 -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0"><i class="bi bi-bar-chart-line me-2"></i>基本统计</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-4">
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="bi bi-code-square"></i>
                </div>
                <div class="stat-value">{{ analysisResult.totalFunctions }}</div>
                <div class="stat-label">总函数数</div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="bi bi-arrow-left-right"></i>
                </div>
                <div class="stat-value">{{ analysisResult.totalCalls }}</div>
                <div class="stat-label">调用关系数</div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="bi bi-folder2"></i>
                </div>
                <div class="stat-value">{{ analysisResult.totalPackages }}</div>
                <div class="stat-label">包数量</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 数据库状态提示 -->
      <div v-if="isSettingUpDatabase" class="alert alert-info mb-4">
        <div class="d-flex align-items-center">
          <div class="spinner-border spinner-border-sm me-2" role="status"></div>
          <span>正在重新设置分析数据库，请稍候...</span>
        </div>
      </div>

      <!-- 分析功能标签页 -->
      <div class="analysis-tabs">
        <ul class="nav nav-tabs" id="analysisTab" role="tablist">
          <li class="nav-item" role="presentation">
            <button 
              class="nav-link active" 
              id="overview-tab" 
              data-bs-toggle="tab" 
              data-bs-target="#overview" 
              type="button" 
              role="tab"
            >
              <i class="bi bi-bar-chart me-2"></i>总览
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button 
              class="nav-link" 
              id="hot-functions-tab" 
              data-bs-toggle="tab" 
              data-bs-target="#hot-functions" 
              type="button" 
              role="tab"
            >
              <i class="bi bi-fire me-2"></i>热点函数
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button 
              class="nav-link" 
              id="search-tab" 
              data-bs-toggle="tab" 
              data-bs-target="#search" 
              type="button" 
              role="tab"
            >
              <i class="bi bi-search me-2"></i>函数搜索
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button 
              class="nav-link" 
              id="init-functions-tab" 
              data-bs-toggle="tab" 
              data-bs-target="#init-functions" 
              type="button" 
              role="tab"
            >
              <i class="bi bi-play-circle me-2"></i>Init函数
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button 
              class="nav-link" 
              id="package-graph-tab" 
              data-bs-toggle="tab" 
              data-bs-target="#package-graph" 
              type="button" 
              role="tab"
            >
              <i class="bi bi-diagram-3 me-2"></i>包关联图
            </button>
          </li>
        </ul>
        
        <div class="tab-content mt-4" id="analysisTabContent">
          <!-- 总览标签页 -->
          <div class="tab-pane fade show active" id="overview" role="tabpanel">
            <StaticOverview 
              :db-path="decodedDbPath"
              @view-hot-functions="switchToHotFunctions"
              @view-function-detail="handleViewFunctionDetail"
              @database-setup-needed="setupDatabase"
            />
          </div>
          
          <!-- 热点函数标签页 -->
          <div class="tab-pane fade" id="hot-functions" role="tabpanel">
            <HotFunctionsList 
              :db-path="decodedDbPath"
            />
          </div>
          
          <!-- 函数搜索标签页 -->
          <div class="tab-pane fade" id="search" role="tabpanel">
            <FunctionSearch 
              :db-path="decodedDbPath"
              @view-call-graph="handleViewCallGraph"
            />
          </div>
          
          <!-- Init函数标签页 -->
          <div class="tab-pane fade" id="init-functions" role="tabpanel">
            <InitFunctionsList 
              :db-path="decodedDbPath"
            />
          </div>
          
          <!-- 包关联图标签页 -->
          <div class="tab-pane fade" id="package-graph" role="tabpanel">
            <PackageDependencyGraph 
              :db-path="decodedDbPath"
            />
          </div>
        </div>
      </div>

      <!-- 全局函数详情抽屉 -->
      <FunctionDetailDrawer
        :show="showGlobalDetailDrawer"
        :function-key="globalSelectedFunctionKey"
        :db-path="decodedDbPath"
        @close="showGlobalDetailDrawer = false"
        @view-call-graph="handleViewCallGraph"
        @find-call-paths="handleFindCallPaths"
        @view-function="handleViewRelatedFunction"
      />
    </div>
    
    <div v-else class="card mb-4">
      <div class="card-body text-center py-5">
        <i class="bi bi-exclamation-circle text-warning display-1"></i>
        <h4 class="mt-3">暂无分析结果</h4>
        <p>选择的数据库文件未返回分析结果，请返回选择其他文件。</p>
        <button class="btn btn-primary mt-3" @click="goBack">
          <i class="bi bi-arrow-left me-2"></i>返回数据库列表
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { staticAnalysisAPI } from '../../config/api'
import StaticOverview from './StaticOverview.vue'
import HotFunctionsList from './HotFunctionsList.vue'
import FunctionSearch from './FunctionSearch.vue'
import InitFunctionsList from './InitFunctionsList.vue'
import FunctionDetailDrawer from './FunctionDetailDrawer.vue'
import PackageDependencyGraph from './PackageDependencyGraph.vue'

export default {
  name: 'DbAnalysisDetail',
  components: {
    StaticOverview,
    HotFunctionsList,
    FunctionSearch,
    InitFunctionsList,
    FunctionDetailDrawer,
    PackageDependencyGraph
  },
  props: {
    dbFilePath: {
      type: String,
      required: true
    },
    dbFileName: {
      type: String,
      required: true
    },
    dbFileSize: {
      type: Number,
      default: 0
    },
    dbFileCreateTime: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      analysisResult: null,
      loading: true,
      showGlobalDetailDrawer: false,
      globalSelectedFunctionKey: '',
      isSettingUpDatabase: false,
      isInitialized: false
    }
  },
  computed: {
    decodedDbPath() {
      return decodeURIComponent(this.dbFilePath)
    }
  },
  mounted() {
    if (!this.isInitialized) {
      this.loadAnalysisData();
      this.isInitialized = true;
    }
  },
  beforeRouteEnter(to, from, next) {
    // 页面刷新或直接访问时的处理
    console.log('beforeRouteEnter triggered, from:', from?.name, 'to:', to.name);
    next(vm => {
      if (!vm.isInitialized) {
        console.log('Component not initialized, checking database setup...');
        // 检查是否需要重新设置数据库
        vm.checkAndSetupDatabase();
        vm.isInitialized = true;
      } else {
        console.log('Component already initialized, skipping setup');
      }
    });
  },
  methods: {
    async loadAnalysisData() {
      this.loading = true;
      try {
        // 解码路径中的URL编码字符
        const decodedPath = decodeURIComponent(this.dbFilePath);
        
        // 首先尝试设置当前分析数据库
        await this.ensureDatabaseSetup(decodedPath);
        
        // 然后获取基本统计信息（用于显示基本信息卡片）
        const response = await staticAnalysisAPI.analyzeDbFile(decodedPath);
        this.analysisResult = response;
        
      } catch (error) {
        console.error('分析数据库失败:', error);
        // 如果是文件不存在的错误，给用户选择
        if (error.message && error.message.includes('not_exist')) {
          const shouldRedirect = confirm('数据库文件不存在。是否返回选择其他文件？点击"取消"停留在当前页面。');
          if (shouldRedirect) {
            this.$router.push('/static-analysis');
          }
        }
      } finally {
        this.loading = false;
      }
    },

    async ensureDatabaseSetup(dbPath) {
      try {
        // 先检查 session 是否有效
        const isValid = await staticAnalysisAPI.checkSession();
        if (!isValid) {
          console.log('Session invalid, setting up database...');
          await staticAnalysisAPI.analyzeDbFile(dbPath);
        }
      } catch (error) {
        // 如果检查失败，尝试设置数据库
        console.log('Session check failed, setting up database...');
        await staticAnalysisAPI.analyzeDbFile(dbPath);
      }
    },

    formatDate(timestamp) {
      return new Date(timestamp).toLocaleString();
    },
    formatSize(bytes) {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Byte';
      const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    },
    goBack() {
      this.$emit('back');
    },

    // 标签页切换方法
    switchToHotFunctions() {
      const hotFunctionsTab = document.getElementById('hot-functions-tab');
      if (hotFunctionsTab) {
        hotFunctionsTab.click();
      }
    },

    handleViewFunctionDetail(func) {
      // 打开全局函数详情抽屉
      this.globalSelectedFunctionKey = func.key || func.name
      this.showGlobalDetailDrawer = true
      console.log('查看函数详情:', func);
    },

    handleViewCallGraph(func) {
      // 可以处理调用图查看
      console.log('查看调用图:', func);
    },

    handleFindCallPaths(func) {
      // 可以处理查找调用路径
      console.log('查找调用路径:', func);
    },

    handleViewRelatedFunction(functionKey) {
      // 查看相关函数
      this.globalSelectedFunctionKey = functionKey
      // 抽屉已经是打开状态，会自动刷新内容
      console.log('查看相关函数:', functionKey);
    },

    async checkAndSetupDatabase() {
      // 检查当前 session 是否有效
      try {
        const isValid = await staticAnalysisAPI.checkSession();
        if (!isValid) {
          console.log('Session invalid, re-setting database...');
          // 如果 session 无效，重新设置数据库
          await this.setupDatabase();
        } else {
          console.log('Session is valid, no need to re-setup database');
        }
      } catch (error) {
        console.warn('Session check failed, re-setting database:', error);
        await this.setupDatabase();
      }
    },

    async setupDatabase() {
      this.isSettingUpDatabase = true;
      try {
        const decodedPath = decodeURIComponent(this.dbFilePath);
        await staticAnalysisAPI.analyzeDbFile(decodedPath);
        console.log('Database re-setup completed');
      } catch (error) {
        console.error('Failed to setup database:', error);
      } finally {
        this.isSettingUpDatabase = false;
      }
    }
  }
}
</script>

<style scoped>
.stat-card {
  text-align: center;
  padding: 1.5rem;
  border-radius: 0.375rem;
  background-color: #f8f9fa;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 2rem;
  color: #0d6efd;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #212529;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #6c757d;
}

/* 标签页样式 */
.analysis-tabs {
  margin-top: 2rem;
}

.nav-tabs {
  border-bottom: 2px solid #e9ecef;
}

.nav-tabs .nav-link {
  border: none;
  border-radius: 8px 8px 0 0;
  color: #6c757d;
  font-weight: 600;
  padding: 1rem 1.5rem;
  margin-right: 0.5rem;
  transition: all 0.3s ease;
}

.nav-tabs .nav-link:hover {
  border-color: transparent;
  background: rgba(71, 133, 255, 0.1);
  color: #4785ff;
}

.nav-tabs .nav-link.active {
  background: linear-gradient(135deg, #4785ff 0%, #2684ff 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 15px rgba(71, 133, 255, 0.3);
}

.tab-content {
  min-height: 500px;
}

.tab-pane {
  animation: fadeIn 0.3s ease-in-out;
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

@media (max-width: 768px) {
  .row {
    flex-direction: column;
  }
  
  .stat-card {
    margin-bottom: 1rem;
  }
  
  .nav-tabs .nav-link {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }
  
  .nav-tabs {
    flex-wrap: wrap;
  }
}
</style> 