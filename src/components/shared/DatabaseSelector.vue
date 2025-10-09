<template>
  <div class="database-selector">
    <div class="card">
      <div class="card-header bg-light">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-0">
            <i class="bi bi-database me-2"></i>数据库文件列表
          </h6>
          <button 
            class="btn btn-sm btn-outline-primary" 
            @click="loadDbFiles"
            :disabled="loading"
          >
            <i class="bi bi-arrow-clockwise" :class="{ 'spinning': loading }"></i>
          </button>
        </div>
      </div>

      <div class="card-body p-0">
        <!-- 加载状态 -->
        <div v-if="initialLoading" class="text-center py-5">
          <div class="spinner-border text-primary mb-3"></div>
          <p class="text-muted mb-0">正在加载数据库列表...</p>
        </div>

        <!-- 数据库列表 -->
        <div v-else-if="dbFiles.length > 0" class="db-list">
          <div 
            v-for="db in dbFiles" 
            :key="db.path"
            class="db-item"
            :class="{ 'selected': currentDatabase && currentDatabase.path === db.path }"
            @click="selectDatabase(db)"
          >
            <div class="db-item-icon">
              <i class="bi" :class="currentDatabase && currentDatabase.path === db.path ? 'bi-database-fill-check text-success' : 'bi-database-fill text-primary'"></i>
            </div>
            <div class="db-item-info">
              <div class="db-item-name">{{ db.name }}</div>
              <div class="db-item-meta">
                <span><i class="bi bi-hdd me-1"></i>{{ formatSize(db.size) }}</span>
                <span class="mx-2">•</span>
                <span><i class="bi bi-clock me-1"></i>{{ formatDate(db.createTime) }}</span>
              </div>
            </div>
            <div class="db-item-action">
              <i v-if="currentDatabase && currentDatabase.path === db.path" class="bi bi-check-circle-fill text-success"></i>
              <i v-else class="bi bi-arrow-right-circle text-muted"></i>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="text-center py-5">
          <i class="bi bi-inbox display-4 text-muted mb-3 d-block"></i>
          <h6 class="text-muted">暂无数据库文件</h6>
          <p class="text-muted small mb-0">请先创建静态分析任务生成数据库</p>
        </div>
      </div>

      <!-- 当前选中的数据库 -->
      <div v-if="currentDatabase" class="card-footer bg-success bg-opacity-10 border-success border-opacity-25">
        <small class="text-success fw-bold">
          <i class="bi bi-check-circle-fill me-2"></i>
          当前分析数据库: {{ currentDatabase.name }}
        </small>
      </div>
    </div>
  </div>
</template>

<script>
import { staticAnalysisAPI } from '../../config/api'

export default {
  name: 'DatabaseSelector',
  emits: ['database-selected'],
  data() {
    return {
      showSelector: false,
      loading: false,
      initialLoading: true,  // 初始加载状态
      dbFiles: [],
      currentDatabase: null,
      refreshInterval: null  // 自动刷新定时器
    }
  },
  async mounted() {
    this.initialLoading = true
    await this.loadDbFiles()
    this.initialLoading = false
    
    // 每30秒自动刷新数据库列表
    this.refreshInterval = setInterval(() => {
      this.loadDbFiles()
    }, 30000)
  },
  
  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
  },
  methods: {
    async loadDbFiles() {
      this.loading = true
      try {
        const data = await staticAnalysisAPI.getStaticDbFiles()
        const newFiles = data.files || []
        
        // 检查是否有新文件
        const hasNewFiles = newFiles.length > this.dbFiles.length
        
        this.dbFiles = newFiles
        console.log('Loaded database files:', this.dbFiles.length)
        
        // 如果有新文件且文件按时间排序，自动选择最新的
        if (hasNewFiles && this.dbFiles.length > 0 && !this.currentDatabase) {
          console.log('New database file detected, auto-selecting latest')
          // 假设第一个是最新的
          await this.selectDatabase(this.dbFiles[0], false)
        }
      } catch (error) {
        console.error('Failed to load database files:', error)
        
        // 显示友好的错误提示
        if (error.response) {
          const status = error.response.status
          if (status === 500) {
            console.error('后端服务错误，可能是后端服务未启动或配置问题')
          } else if (status === 404) {
            console.error('API接口不存在，请检查后端版本')
          }
        } else if (error.request) {
          console.error('无法连接到后端服务，请确认后端服务已启动')
        }
        
        // 如果初次加载失败，不要继续重试
        if (this.initialLoading) {
          this.dbFiles = []
        }
      } finally {
        this.loading = false
      }
    },

    selectDatabase(db) {
      console.log('Selecting database:', db.name, db.path)
      // 只设置当前数据库和发出事件，API 调用由父组件处理
      this.currentDatabase = db
      console.log('Emitting database-selected event')
      this.$emit('database-selected', db)
      console.log('Database selected successfully:', db.name)
    },

    formatSize(bytes) {
      if (!bytes) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    },

    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
.database-selector {
  width: 100%;
}

.card {
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.card-header {
  border-bottom: 1px solid #e0e0e0;
  padding: 1rem 1.25rem;
}

.card-header h6 {
  color: #2c3e50;
  font-weight: 600;
}

/* 刷新按钮旋转动画 */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 数据库列表 */
.db-list {
  display: flex;
  flex-direction: column;
}

.db-item {
  display: flex;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.db-item:last-child {
  border-bottom: none;
}

.db-item:hover {
  background: rgba(71, 133, 255, 0.05);
}

.db-item.selected {
  background: rgba(40, 167, 69, 0.05);
  border-left: 4px solid #28a745;
}

.db-item-icon {
  font-size: 2rem;
  margin-right: 1rem;
  min-width: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.db-item-info {
  flex: 1;
  min-width: 0;
}

.db-item-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.db-item-meta {
  font-size: 0.875rem;
  color: #6c757d;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.db-item-action {
  font-size: 1.5rem;
  margin-left: 1rem;
  min-width: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-footer {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid rgba(40, 167, 69, 0.2);
}

/* 响应式 */
@media (max-width: 768px) {
  .db-item-meta {
    font-size: 0.75rem;
  }
  
  .db-item-name {
    font-size: 0.9rem;
  }
}
</style>
