<template>
  <div class="static-analysis container mt-5">
    <h1 class="page-title text-center mb-4">{{ $t('staticAnalysis.title') }}</h1>
    
    <!-- 如果选择了数据库文件，显示分析详情 -->
    <div v-if="selectedDb && !showDbList">
      <DbAnalysisDetail 
        :dbFilePath="selectedDb"
        :dbFileName="getSelectedDbFileName()"
        :dbFileSize="getSelectedDbFileSize()"
        :dbFileCreateTime="getSelectedDbCreateTime()"
        @back="showDbList = true"
      />
    </div>
    
    <!-- 否则显示数据库文件列表和项目路径输入 -->
    <div v-else>
      <!-- 使用新的合并组件替换原来的表单和监控组件 -->
      <StaticAnalysisWithMonitor
        :initialProjectPath="projectPath"
        :initialAnalysisOptions="analysisOptions"
        @analysis-started="handleAnalysisStarted"
        @task-completed="handleTaskCompleted"
        @status-updated="updateTaskStatus"
        @refresh-db-files="fetchDbFiles"
      />
      
      <!-- 使用指南 -->
      <div v-if="!dbFiles.length && !isAnalyzing && !currentTaskId" class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0"><i class="bi bi-info-circle me-2"></i>{{ $t('staticAnalysis.guide.title') }}</h5>
        </div>
        <div class="card-body">
          <div class="alert alert-info">
            <h4><i class="bi bi-lightbulb me-2"></i>{{ $t('staticAnalysis.guide.welcome') }}</h4>
            <p>{{ $t('staticAnalysis.guide.description') }}</p>
          </div>
          
          <div class="usage-steps">
            <h5><i class="bi bi-1-circle me-2"></i>{{ $t('staticAnalysis.guide.step1') }}</h5>
            <p>{{ $t('staticAnalysis.guide.step1Desc') }}</p>
            
            <h5 class="mt-4"><i class="bi bi-2-circle me-2"></i>{{ $t('staticAnalysis.guide.step2') }}</h5>
            <p>{{ $t('staticAnalysis.guide.step2Desc') }}</p>
            
            <h5 class="mt-4"><i class="bi bi-3-circle me-2"></i>{{ $t('staticAnalysis.guide.step3') }}</h5>
            <p>{{ $t('staticAnalysis.guide.step3Desc') }}</p>
            
            <h5 class="mt-4"><i class="bi bi-4-circle me-2"></i>{{ $t('staticAnalysis.guide.step4') }}</h5>
            <p>{{ $t('staticAnalysis.guide.step4Desc') }}</p>
            <button class="btn btn-primary" @click="fetchDbFiles">
              <i class="bi bi-arrow-clockwise me-2"></i>{{ $t('staticAnalysis.guide.refreshDb') }}
            </button>
          </div>
        </div>
      </div>

      <!-- 数据库文件列表 -->
      <div v-if="dbFiles.length > 0" class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0"><i class="bi bi-database me-2"></i>{{ $t('staticAnalysis.dbList.title') }}</h5>
          <button class="btn btn-sm btn-outline-primary" @click="fetchDbFiles">
            <i class="bi bi-arrow-clockwise me-2"></i>{{ $t('staticAnalysis.dbList.refresh') }}
          </button>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead>
                <tr>
                  <th>{{ $t('staticAnalysis.dbList.fileName') }}</th>
                  <th>{{ $t('staticAnalysis.dbList.createTime') }}</th>
                  <th>{{ $t('staticAnalysis.dbList.size') }}</th>
                  <th class="text-center">{{ $t('staticAnalysis.dbList.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="file in dbFiles" :key="file.path">
                  <td>
                    <i class="bi bi-file-earmark-code me-2"></i>
                    {{ file.name }}
                  </td>
                  <td>{{ formatDate(file.createTime) }}</td>
                  <td>{{ formatSize(file.size) }}</td>
                  <td class="text-center">
                    <button 
                      class="btn btn-sm btn-primary" 
                      @click="viewDbAnalysis(file.path)"
                    >
                      <i class="bi bi-search me-1"></i>{{ $t('staticAnalysis.dbList.viewAnalysis') }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from '../../axios'
import DbAnalysisDetail from './DbAnalysisDetail.vue'
import StaticAnalysisWithMonitor from './StaticAnalysisWithMonitor.vue'

export default {
  name: 'StaticAnalysis',
  components: {
    DbAnalysisDetail,
    StaticAnalysisWithMonitor
  },
  data() {
    return {
      projectPath: '',
      pathError: '',
      isAnalyzing: false,
      currentTaskId: '',
      dbFiles: [],
      selectedDb: '',
      showDbList: true,
      copiedCommand: false,
      showOptions: true,
      analysisOptions: {
        algo: 'rta',         // 默认使用RTA算法
        isCache: true,       // 默认启用缓存
        outputPath: '',      // 默认输出路径
        cachePath: '',       // 默认缓存路径
        onlyMethod: '',      // 默认分析所有方法
      },
      taskStatus: {
        status: 'processing',
        progress: 0,
        message: '分析任务已启动'
      },
    }
  },
  mounted() {
    this.fetchDbFiles()
  },
  methods: {
    handleAnalysisStarted(taskId) {
      this.currentTaskId = taskId;
      this.isAnalyzing = true;
      console.log('Analysis task started with ID:', taskId);
    },
    
    handleTaskCompleted(status) {
      // 任务完成后的处理
      if (status.status === 'completed') {
        this.fetchDbFiles();
        this.isAnalyzing = false;
        // 可以选择在一段时间后清除任务ID
        setTimeout(() => {
          this.currentTaskId = '';
        }, 10000); // 10秒后清除
      } else if (status.status === 'failed') {
        this.isAnalyzing = false;
        this.pathError = status.message || '分析失败';
      }
    },

    async fetchDbFiles() {
      try {
        const response = await axios.get('/api/static/dbfiles')
        this.dbFiles = response.data.files || []
      } catch (error) {
        console.error('获取数据库文件列表失败:', error)
      }
    },

    viewDbAnalysis(path) {
      this.selectedDb = path
      this.showDbList = false
    },

    getSelectedDbFileName() {
      if (!this.selectedDb) return ''
      const file = this.dbFiles.find(f => f.path === this.selectedDb)
      return file ? file.name : ''
    },

    getSelectedDbFileSize() {
      if (!this.selectedDb) return 0
      const file = this.dbFiles.find(f => f.path === this.selectedDb)
      return file ? file.size : 0
    },

    getSelectedDbCreateTime() {
      if (!this.selectedDb) return ''
      const file = this.dbFiles.find(f => f.path === this.selectedDb)
      return file ? file.createTime : ''
    },

    formatDate(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },

    formatSize(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },

    updateTaskStatus(status) {
      this.taskStatus = status;
    }
  }
}
</script>

<style scoped>
.static-analysis {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  background: linear-gradient(135deg, #4785ff 0%, #2684ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
  font-size: 2.5rem;
  margin-bottom: 2rem;
}

/* 卡片样式 */
.card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.card-header {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 1.25rem 1.5rem;
}

.card-header h5 {
  color: #495057;
  font-weight: 600;
  margin: 0;
}

.card-body {
  padding: 1.5rem;
}

/* 使用指南样式 */
.usage-steps h5 {
  color: #4785ff;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.usage-steps p {
  color: #6c757d;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

/* 数据库文件列表样式 */
.table {
  border-radius: 8px;
  overflow: hidden;
}

.table thead th {
  background: linear-gradient(135deg, #4785ff 0%, #2684ff 100%);
  color: white;
  border: none;
  font-weight: 600;
  padding: 1rem;
  font-size: 0.875rem;
  letter-spacing: 0.5px;
}

.table tbody tr {
  transition: all 0.2s ease;
}

.table tbody tr:hover {
  background-color: rgba(71, 133, 255, 0.05);
  transform: scale(1.01);
}

.table tbody td {
  padding: 1rem;
  vertical-align: middle;
  border-bottom: 1px solid #f1f3f4;
}

/* 按钮样式 */
.btn {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #4785ff 0%, #2684ff 100%);
  box-shadow: 0 2px 8px rgba(71, 133, 255, 0.3);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #3674e8 0%, #1a73e8 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(71, 133, 255, 0.4);
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-outline-primary {
  border: 2px solid #4785ff;
  color: #4785ff;
  background: transparent;
}

.btn-outline-primary:hover {
  background: #4785ff;
  border-color: #4785ff;
  color: white;
  transform: translateY(-1px);
}

/* 警告框样式 */
.alert {
  border-radius: 10px;
  border: none;
  padding: 1.25rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.alert-info {
  background: linear-gradient(135deg, rgba(13, 202, 240, 0.1) 0%, rgba(13, 202, 240, 0.15) 100%);
  color: #0c5460;
}

.alert h4 {
  color: #0c5460;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

/* 图标样式 */
.bi {
  font-size: 1.1em;
}

.card-header .bi {
  color: #4785ff;
}

/* 表格响应式 */
.table-responsive {
  border-radius: 8px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 文件图标 */
.bi-file-earmark-code {
  color: #4785ff;
  font-size: 1.2em;
}

/* 动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: fadeInUp 0.5s ease-out;
}

.card:nth-child(2) {
  animation-delay: 0.1s;
}

.card:nth-child(3) {
  animation-delay: 0.2s;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .static-analysis {
    padding: 0 1rem;
  }
  
  .page-title {
    font-size: 2rem;
    margin-bottom: 1.5rem;
  }
  
  .card-body {
    padding: 1rem;
  }
  
  .table tbody td {
    padding: 0.75rem 0.5rem;
    font-size: 0.875rem;
  }
  
  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
  }
}

@media (max-width: 576px) {
  .table-responsive {
    font-size: 0.8rem;
  }
  
  .card-header {
    padding: 1rem;
  }
  
  .usage-steps h5 {
    font-size: 1rem;
  }
}

/* 滚动条美化 */
.table-responsive::-webkit-scrollbar {
  height: 6px;
}

.table-responsive::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.table-responsive::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.table-responsive::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 加载状态 */
.loading {
  opacity: 0.6;
  pointer-events: none;
}

/* 交互效果 */
.clickable {
  cursor: pointer;
  user-select: none;
}

.clickable:active {
  transform: scale(0.98);
}
</style> 