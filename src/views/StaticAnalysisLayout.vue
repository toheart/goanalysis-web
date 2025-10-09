<template>
  <div class="static-analysis-layout">
    <!-- 顶部模式切换器 -->
    <div class="mode-switcher mb-3">
      <div class="card">
        <div class="card-body p-3">
          <div class="d-flex justify-content-between align-items-center">
            <h4 class="mb-0">
              <i class="bi bi-diagram-3 me-2"></i>静态分析
            </h4>
            <div class="btn-group" role="group">
              <button
                type="button"
                class="btn"
                :class="currentMode === 'view' ? 'btn-primary' : 'btn-outline-primary'"
                @click="switchMode('view')"
              >
                <i class="bi bi-eye me-2"></i>查看历史分析
              </button>
              <button
                type="button"
                class="btn"
                :class="currentMode === 'create' ? 'btn-primary' : 'btn-outline-primary'"
                @click="switchMode('create')"
              >
                <i class="bi bi-plus-circle me-2"></i>创建新分析
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 查看历史分析模式 -->
    <div v-if="currentMode === 'view'" class="view-mode">
      <!-- 数据库选择器 -->
    <div class="database-section mb-3">
      <DatabaseSelector @database-selected="handleDatabaseSelected" />
    </div>

    <!-- 主内容区 - 仅在选择数据库后显示 -->
    <div v-if="isDatabaseSelected" class="main-content">
      <!-- 导航标签页（改为 router-link） -->
      <div class="nav-tabs-container mb-3">
        <ul class="nav nav-tabs">
          <li class="nav-item">
            <router-link class="nav-link" :class="{ active: $route.name === 'StaticOverview' }" to="/static-analysis/overview">
              <i class="bi bi-speedometer2 me-2"></i>总览
            </router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" :class="{ active: $route.name === 'StaticPackages' }" to="/static-analysis/packages">
              <i class="bi bi-diagram-3 me-2"></i>包依赖图
            </router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" :class="{ active: $route.name === 'StaticFunctionSearch' }" to="/static-analysis/search">
              <i class="bi bi-search me-2"></i>函数搜索
            </router-link>
          </li>
        </ul>
      </div>

      <!-- 子路由渲染区域 -->
      <div class="tab-content">
        <router-view />
      </div>
    </div>

    <!-- 未选择数据库提示 -->
    <div v-else class="no-database-prompt">
      <div class="card">
        <div class="card-body text-center py-5">
          <i class="bi bi-database display-1 text-muted mb-4"></i>
          <h4 class="mb-3">请选择分析数据库</h4>
          <p class="text-muted mb-4">
              从上方数据库列表中选择一个数据库，或切换到"创建新分析"模式
            </p>
            <button class="btn btn-primary btn-lg" @click="switchMode('create')">
              <i class="bi bi-plus-circle me-2"></i>创建新分析
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建新分析模式 -->
    <div v-else-if="currentMode === 'create'" class="create-mode">
      <!-- 步骤1: 项目路径输入 -->
      <div v-if="analysisStep === 'input'" class="step-container">
        <div class="card analysis-card">
          <div class="card-body p-5">
            <div class="text-center mb-4">
              <i class="bi bi-folder-plus display-3 text-primary mb-3"></i>
              <h3 class="mb-2">Go 项目静态分析</h3>
              <p class="text-muted">输入项目路径开始新的分析任务</p>
            </div>

            <div class="form-container">
              <div class="mb-4">
                <label class="form-label fw-bold">项目路径</label>
                <input 
                  v-model="projectPath" 
                  type="text" 
                  class="form-control form-control-lg"
                  placeholder="/path/to/your/go/project"
                  @keyup.enter="startAnalysis"
                >
                <small class="text-muted">请输入包含 go.mod 文件的 Go 项目根目录</small>
              </div>

              <div class="row mb-4">
                <div class="col-md-6">
                  <label class="form-label fw-bold">算法选择</label>
                  <select v-model="analysisOptions.algo" class="form-select">
                    <option value="cha">CHA (Class Hierarchy Analysis)</option>
                    <option value="rta">RTA (Rapid Type Analysis)</option>
                    <option value="vta">VTA (Variable Type Analysis)</option>
                    <option value="static">Static</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-bold">忽略方法</label>
                  <div class="form-check form-switch mt-2">
                    <input 
                      v-model="analysisOptions.ignoreMethod" 
                      class="form-check-input" 
                      type="checkbox" 
                      id="ignoreMethodSwitch"
                    >
                    <label class="form-check-label" for="ignoreMethodSwitch">
                      忽略方法级别分析
                    </label>
                  </div>
                </div>
              </div>

              <div class="d-grid gap-2">
                <button 
                  class="btn btn-primary btn-lg"
                  @click="startAnalysis"
                  :disabled="!projectPath.trim()"
                >
                  <i class="bi bi-play-circle me-2"></i>开始分析
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤2: 分析进行中 -->
      <div v-else-if="analysisStep === 'analyzing'" class="step-container">
        <div class="card analysis-card">
          <div class="card-body p-5">
            <div class="text-center">
              <div class="spinner-border text-primary mb-4" style="width: 4rem; height: 4rem;"></div>
              <h4 class="mb-3">正在分析项目...</h4>
              <p class="text-muted mb-4">{{ projectPath }}</p>

              <!-- 进度信息 -->
              <div class="progress-info">
                <div class="alert alert-info">
                  <div class="d-flex align-items-center">
                    <i class="bi bi-info-circle me-2"></i>
                    <div class="flex-grow-1 text-start">
                      <strong>当前状态:</strong> {{ taskStatus.status || '初始化中' }}
                      <div v-if="taskStatus.message" class="small mt-1">
                        {{ taskStatus.message }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 进度条 -->
                <div v-if="taskStatus.progress !== undefined" class="mb-3">
                  <div class="progress" style="height: 24px;">
                    <div 
                      class="progress-bar progress-bar-striped progress-bar-animated"
                      :style="{ width: (taskStatus.progress * 100) + '%' }"
                    >
                      {{ Math.round(taskStatus.progress * 100) }}%
                    </div>
                  </div>
                </div>

                <!-- 实时日志 -->
                <div v-if="analysisLogs.length > 0" class="analysis-logs mt-3">
                  <div class="card bg-dark text-light">
                    <div class="card-header bg-secondary text-white py-2">
                      <small class="fw-bold">
                        <i class="bi bi-terminal me-2"></i>分析日志
                        <span class="badge bg-light text-dark ms-2">{{ analysisLogs.length }}</span>
                      </small>
                    </div>
                    <div class="card-body p-3" style="max-height: 250px; overflow-y: auto;">
                      <small class="font-monospace">
                        <div 
                          v-for="(log, index) in analysisLogs" 
                          :key="index" 
                          class="log-line"
                          :class="{
                            'log-starting': log.type === 'starting',
                            'log-processing': log.type === 'processing',
                            'log-completed': log.type === 'completed',
                            'log-failed': log.type === 'failed'
                          }"
                        >
                          <span class="log-time">[{{ log.time }}]</span>
                          <span class="log-type-badge" v-if="log.type === 'starting'">
                            <i class="bi bi-play-circle"></i>
                          </span>
                          <span class="log-type-badge" v-else-if="log.type === 'processing'">
                            <i class="bi bi-gear"></i>
                          </span>
                          <span class="log-type-badge" v-else-if="log.type === 'completed'">
                            <i class="bi bi-check-circle"></i>
                          </span>
                          <span class="log-type-badge" v-else-if="log.type === 'failed'">
                            <i class="bi bi-x-circle"></i>
                          </span>
                          {{ log.message }}
                        </div>
                      </small>
                    </div>
                  </div>
                </div>

                <small class="text-muted mt-2 d-block">
                  分析可能需要几分钟时间，请耐心等待...
                </small>
              </div>

              <button class="btn btn-outline-secondary mt-4" @click="cancelAnalysis">
                <i class="bi bi-x-circle me-2"></i>取消分析
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤3: 分析完成 -->
      <div v-else-if="analysisStep === 'completed'" class="step-container">
        <div class="card analysis-card">
          <div class="card-body p-5">
            <div class="text-center mb-4">
              <i class="bi bi-check-circle-fill text-success display-3 mb-3"></i>
              <h3 class="mb-2">分析完成！</h3>
              <p class="text-muted">数据库已生成，可以查看分析结果</p>
            </div>

            <div class="d-flex justify-content-center gap-3">
              <button class="btn btn-primary btn-lg" @click="viewAnalysisResults">
                <i class="bi bi-bar-chart me-2"></i>查看分析结果
              </button>
              <button class="btn btn-outline-secondary btn-lg" @click="resetToInput">
                <i class="bi bi-arrow-left me-2"></i>分析新项目
          </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="alert alert-danger mt-3">
      <i class="bi bi-exclamation-triangle me-2"></i>
      <strong>错误:</strong> {{ error }}
      <button type="button" class="btn-close" @click="error = null"></button>
    </div>
  </div>
</template>

<script>
import DatabaseSelector from '../components/shared/DatabaseSelector.vue'
import { staticAnalysisAPI } from '../config/api'

export default {
  name: 'StaticAnalysisLayout',
  components: {
    DatabaseSelector
  },
  data() {
    return {
      // 模式管理
      currentMode: 'view', // 'view' 或 'create'
      
      // 查看模式状态
      currentTab: 'overview',
      isDatabaseSelected: false,
      currentDatabase: null,
      
      // 创建模式状态
      analysisStep: 'input', // 'input', 'analyzing', 'completed'
      projectPath: '',
      analysisOptions: {
        algo: 'cha',
        ignoreMethod: false
      },
      taskId: null,
      taskStatus: {},
      eventSource: null,
      analysisLogs: [],
      progressTimer: null,
      
      // 错误状态
      error: null
    }
  },
  mounted() {
    // 从 URL query 参数恢复状态
    const mode = this.$route.query.mode
    const tab = this.$route.query.tab
    
    if (mode === 'create') {
      this.currentMode = 'create'
    }
    
    if (tab && this.currentMode === 'view') {
      this.currentTab = tab
    }

    // 直链进入兜底：如果处于查看模式但尚未选择数据库，尝试触发子组件的自动选择
    // 注意：DatabaseSelector 会在有新文件且当前未选中时自动发出 database-selected
    // 这里不直接访问子组件实例，保持单向数据流，仅依赖其已有行为
  },
  beforeUnmount() {
    this.closeEventSource()
  },
  methods: {
    // ============ 模式切换 ============
    switchMode(mode) {
      console.log('Switching mode to:', mode)
      this.currentMode = mode
      this.error = null
      
      // 更新 URL
      this.$router.replace({ 
        query: { ...this.$route.query, mode } 
      }).catch(() => {})
      
      // 如果切换到查看模式且分析刚完成，自动选择最新数据库
      if (mode === 'view' && this.analysisStep === 'completed') {
        // 触发数据库选择器刷新，它会自动选择最新的数据库
        this.analysisStep = 'input'
      }
    },

    // ============ 查看模式 - 数据库管理 ============
    async handleDatabaseSelected(database) {
      console.log('=== handleDatabaseSelected called ===')
      console.log('Database:', database)
      console.log('Current isDatabaseSelected:', this.isDatabaseSelected)
      this.error = null
      
      try {
        // 调用 API 设置后端 session
        console.log('Setting database in backend session:', database.path)
        await staticAnalysisAPI.analyzeDbFile(database.path)
        
        this.currentDatabase = database
        this.isDatabaseSelected = true
        
        // 若存在重定向目标，按目标路由跳转；否则回新概览路由
        const redirect = this.$route.query.redirect
        if (redirect === 'packages') {
          this.$router.replace('/static-analysis/packages')
        } else if (redirect === 'hotfunctions') {
          this.$router.replace('/static-analysis/hotfunctions')
        } else if (redirect === 'overview') {
          this.$router.replace('/static-analysis/overview')
        } else {
          this.$router.replace('/static-analysis/overview')
        }
        
        console.log('=== Database setup complete ===')
        console.log('isDatabaseSelected:', this.isDatabaseSelected)
        console.log('currentDatabase:', this.currentDatabase)
        console.log('currentTab:', this.currentTab)
      } catch (err) {
        console.error('Failed to set database:', err)
        this.error = `设置数据库失败: ${err.message || '未知错误'}`
        // 重置状态
        this.isDatabaseSelected = false
        this.currentDatabase = null
      }
    },

    // 处理子组件请求的数据库会话重建
    async handleDatabaseSetupNeeded() {
      // 日志：父组件接收到会话重建请求
      console.log('Rebuilding backend session for current database...')
      try {
        // 如果当前数据库存在，则调用后端接口重建 session
        if (this.currentDatabase && this.currentDatabase.path) {
          await staticAnalysisAPI.analyzeDbFile(this.currentDatabase.path)
          // 确保标记为已选择，避免主内容被隐藏
          this.isDatabaseSelected = true
          console.log('Backend session rebuilt successfully')
        } else {
          console.warn('No currentDatabase available to rebuild session')
        }
      } catch (err) {
        console.error('Failed to rebuild backend session:', err)
      }
    },

    switchTab(tab) {
      console.log('Switching to tab:', tab)
      this.currentTab = tab
      
      // 更新 URL query 参数
      this.$router.replace({ 
        query: { ...this.$route.query, tab } 
      }).catch(() => {})
    },

    // ============ 创建模式 - 分析管理 ============
    async startAnalysis() {
      if (!this.projectPath.trim()) {
        this.error = '请输入项目路径'
        return
      }

      this.error = null
      this.analysisStep = 'analyzing'
      this.analysisLogs = []

      try {
        console.log('Starting analysis for:', this.projectPath)
        
        const response = await staticAnalysisAPI.analyzeProjectPath(
          this.projectPath,
          this.analysisOptions.algo,
          this.analysisOptions.ignoreMethod
        )

        console.log('Analysis response:', response)

        if (response.task_id || response.taskId) {
          this.taskId = response.task_id || response.taskId
          console.log('Task ID:', this.taskId)
          
          // 使用SSE获取实时进度
          this.connectEventSource()
          // 启动进度轮询
          this.startProgressPolling()
        } else {
          this.error = response.message || '启动分析失败'
          this.analysisStep = 'input'
        }
      } catch (err) {
        console.error('Failed to start analysis:', err)
        this.error = err.message || '启动分析失败'
        this.analysisStep = 'input'
      }
    },

    connectEventSource() {
      if (!this.taskId) return

      try {
        this.eventSource = staticAnalysisAPI.createAnalysisEventSource(this.taskId)
        
        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('SSE message:', data)
            
            const statusMap = {
              0: 'starting',
              1: 'processing', 
              2: 'completed',
              [-1]: 'failed'
            }

            // 后端字段为大写 `Type`/`Message`，这里做兼容
            const rawType = (data.type !== undefined ? data.type : data.Type)
            const statusType = (typeof rawType === 'number') ? (statusMap[rawType] || 'processing') : (rawType || 'processing')
            const message = (data.message !== undefined ? data.message : data.Message) || ''
            
            this.taskStatus = {
              status: statusType,
              message: message,
              // 进度通过轮询接口更新，这里不依赖SSE中的progress
              progress: this.taskStatus.progress || 0
            }

            if (message) {
              this.analysisLogs.push({
                time: new Date().toLocaleTimeString(),
                type: statusType,
                message: message
              })
              
              this.$nextTick(() => {
                const logContainer = this.$el.querySelector('.analysis-logs .card-body')
                if (logContainer) {
                  logContainer.scrollTop = logContainer.scrollHeight
                }
              })
            }

            if (statusType === 'completed') {
              console.log('Analysis completed!')
              this.closeEventSource()
              this.analysisStep = 'completed'
              this.clearProgressTimer()
            } else if (statusType === 'failed') {
              console.error('Analysis failed:', data.message)
              this.closeEventSource()
              this.error = message || '分析失败'
              this.analysisStep = 'input'
              this.clearProgressTimer()
            }
          } catch (err) {
            console.error('Failed to parse SSE message:', err, 'Raw data:', event.data)
          }
        }

        this.eventSource.onerror = (error) => {
          console.error('SSE error:', error)
          this.closeEventSource()
          
          if (this.analysisStep === 'analyzing') {
            this.error = 'SSE连接失败，请检查网络或重试'
            this.analysisStep = 'input'
            this.clearProgressTimer()
          }
        }

        console.log('EventSource connected for task:', this.taskId)
      } catch (err) {
        console.error('Failed to create EventSource:', err)
        this.error = '无法建立实时连接'
        this.analysisStep = 'input'
        this.clearProgressTimer()
      }
    },

    closeEventSource() {
      if (this.eventSource) {
        console.log('Closing EventSource')
        this.eventSource.close()
        this.eventSource = null
      }
    },

    // 轮询任务进度，直到完成/失败/取消
    startProgressPolling() {
      this.clearProgressTimer()
      if (!this.taskId) return
      this.progressTimer = setInterval(async () => {
        try {
          const resp = await staticAnalysisAPI.getAnalysisTaskStatus(this.taskId)
          // 后端返回 progress 为 0-100，这里转换为 0-1
          const normalized = (typeof resp.progress === 'number') ? (resp.progress / 100) : 0
          const statusMap = {
            0: 'starting',
            1: 'processing',
            2: 'completed',
            [-1]: 'failed',
            [-2]: 'not_found'
          }
          const statusType = statusMap[resp.status] || 'processing'
          this.taskStatus = {
            status: statusType,
            message: this.taskStatus.message || '',
            progress: normalized
          }

          if (resp.status === 2) {
            // 完成
            this.clearProgressTimer()
            // SSE 会很快也会发 completed，这里不重复更改步骤
          } else if (resp.status === -1) {
            // 失败
            this.clearProgressTimer()
            this.closeEventSource()
            this.error = resp.message || '分析失败'
            this.analysisStep = 'input'
          }
        } catch (e) {
          console.warn('Progress polling failed:', e)
          // 不中断UI，仅记录
        }
      }, 1500)
    },

    clearProgressTimer() {
      if (this.progressTimer) {
        clearInterval(this.progressTimer)
        this.progressTimer = null
      }
    },

    cancelAnalysis() {
      this.closeEventSource()
      this.clearProgressTimer()
      this.analysisStep = 'input'
      this.taskId = null
      this.taskStatus = {}
      this.analysisLogs = []
      this.error = null
    },

    resetToInput() {
      this.analysisStep = 'input'
      this.projectPath = ''
      this.taskId = null
      this.taskStatus = {}
      this.analysisLogs = []
      this.error = null
      this.clearProgressTimer()
    },

    viewAnalysisResults() {
      // 切换到查看模式，数据库选择器会自动选择最新的数据库
      this.switchMode('view')
    }
  }
}
</script>

<style scoped>
.static-analysis-layout {
  padding: 1.5rem;
  background: #f8f9fa;
  min-height: 100vh;
}

/* 主内容区 */
.main-content {
  width: 100%;
  display: block;
  position: relative;
}

/* 模式切换器 */
.mode-switcher .card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.mode-switcher .btn-group .btn {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.mode-switcher .btn-group .btn:first-child {
  margin-right: 0.5rem;
}

/* 数据库选择区 */
.database-section {
  background: white;
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* 导航标签 */
.nav-tabs-container {
  background: white;
  padding: 1rem 1rem 0;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.nav-tabs {
  border-bottom: 2px solid #e9ecef;
}

.nav-link {
  color: #6c757d;
  font-weight: 500;
  border: none;
  border-bottom: 3px solid transparent;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-link:hover {
  color: #4785ff;
  background: rgba(71, 133, 255, 0.05);
  border-bottom-color: rgba(71, 133, 255, 0.3);
}

.nav-link.active {
  color: #4785ff;
  background: rgba(71, 133, 255, 0.1);
  border-bottom-color: #4785ff;
  font-weight: 600;
}

/* 标签页内容 */
.tab-content {
  background: white;
  padding: 1.5rem;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  min-height: 500px;
  position: relative;
  display: block;
  width: 100%;
}

.tab-pane {
  width: 100%;
  /* v-show 会自动处理 display */
}

.tab-pane > * {
  display: block;
  width: 100%;
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

/* 未选择数据库提示 */
.no-database-prompt {
  margin-top: 3rem;
}

/* 创建分析模式 */
.step-container {
  max-width: 800px;
  margin: 0 auto;
}

.analysis-card {
  border: none;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.form-container {
  max-width: 600px;
  margin: 0 auto;
}

.form-control:focus,
.form-select:focus {
  border-color: #4785ff;
  box-shadow: 0 0 0 0.2rem rgba(71, 133, 255, 0.25);
}

.progress-info {
  max-width: 500px;
  margin: 0 auto;
}

/* 日志样式 */
.analysis-logs .card-body {
  background: #1e1e1e;
}

.analysis-logs .log-line {
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  word-break: break-word;
  line-height: 1.6;
  transition: background-color 0.2s;
}

.analysis-logs .log-line:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.analysis-logs .log-line:last-child {
  border-bottom: none;
}

.log-time {
  color: #6c757d;
  margin-right: 0.5rem;
}

.log-type-badge {
  margin-right: 0.5rem;
  display: inline-block;
  width: 1.2rem;
}

.log-starting {
  color: #0dcaf0;
}

.log-starting .log-type-badge {
  color: #0dcaf0;
}

.log-processing {
  color: #ffc107;
}

.log-processing .log-type-badge {
  color: #ffc107;
  animation: spin 2s linear infinite;
}

.log-completed {
  color: #198754;
  font-weight: 500;
}

.log-completed .log-type-badge {
  color: #198754;
}

.log-failed {
  color: #dc3545;
  font-weight: 500;
}

.log-failed .log-type-badge {
  color: #dc3545;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 通用卡片样式 */
.card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

/* 按钮样式 */
.btn {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .static-analysis-layout {
    padding: 1rem;
  }

  .mode-switcher .btn-group {
    flex-direction: column;
    width: 100%;
  }

  .mode-switcher .btn-group .btn {
    width: 100%;
    margin-right: 0 !important;
    margin-bottom: 0.5rem;
  }

  .nav-link {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .nav-link i {
    display: none;
  }
}
</style>