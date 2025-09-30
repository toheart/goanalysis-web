<template>
  <!-- 抽屉组件 -->
  <div v-if="show" class="drawer-overlay" @click="closeDrawer">
    <div class="drawer-content" @click.stop>
      <div class="drawer-header">
        <h5 class="drawer-title">
          <i class="bi bi-info-circle me-2"></i>函数详情
        </h5>
        <button class="btn-close" @click="closeDrawer"></button>
      </div>

      <div class="drawer-body">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-3">正在加载函数详情...</p>
        </div>

        <div v-else-if="functionDetail" class="function-details">
          <!-- 基本信息 -->
          <div class="detail-section">
            <h6 class="section-title">
              <i class="bi bi-info-square me-2"></i>基本信息
            </h6>
            <div class="info-grid">
              <div class="info-item">
                <label>函数名:</label>
                <span class="function-name">{{ functionDetail.name }}</span>
              </div>
              <div class="info-item">
                <label>包名:</label>
                <span class="package-name">{{ functionDetail.package }}</span>
              </div>
              <div class="info-item">
                <label>完整名称:</label>
                <span class="full-name">{{ functionDetail.fullName }}</span>
              </div>
              <div class="info-item">
                <label>函数Key:</label>
                <span class="function-key">{{ functionDetail.key }}</span>
              </div>
            </div>
          </div>

          <!-- 函数签名 -->
          <div v-if="functionDetail.signature" class="detail-section">
            <h6 class="section-title">
              <i class="bi bi-code-slash me-2"></i>函数签名
            </h6>
            <div class="signature-block">
              <pre><code>{{ functionDetail.signature }}</code></pre>
            </div>
          </div>

          <!-- 位置信息 -->
          <div v-if="functionDetail.position" class="detail-section">
            <h6 class="section-title">
              <i class="bi bi-geo-alt me-2"></i>位置信息
            </h6>
            <div class="position-info">
              <div class="info-item">
                <label>文件:</label>
                <span class="filename">{{ functionDetail.position.filename }}</span>
              </div>
              <div class="info-item">
                <label>行号:</label>
                <span class="line-numbers">
                  {{ functionDetail.position.startLine }} - {{ functionDetail.position.endLine }}
                </span>
              </div>
            </div>
          </div>

          <!-- 度量信息 -->
          <div v-if="functionDetail.metrics" class="detail-section">
            <h6 class="section-title">
              <i class="bi bi-bar-chart me-2"></i>度量信息
            </h6>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-value">{{ functionDetail.metrics.callerCount }}</div>
                <div class="metric-label">调用者数量</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">{{ functionDetail.metrics.calleeCount }}</div>
                <div class="metric-label">被调用者数量</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">{{ functionDetail.metrics.depthLevel }}</div>
                <div class="metric-label">调用深度</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">{{ functionDetail.metrics.centrality?.toFixed(3) || 'N/A' }}</div>
                <div class="metric-label">中心性</div>
              </div>
            </div>
          </div>

          <!-- 文档说明 -->
          <div v-if="functionDetail.doc" class="detail-section">
            <h6 class="section-title">
              <i class="bi bi-file-text me-2"></i>文档说明
            </h6>
            <div class="doc-content">
              <pre>{{ functionDetail.doc }}</pre>
            </div>
          </div>

          <!-- 调用点信息 -->
          <div v-if="functionDetail.callSites && functionDetail.callSites.length" class="detail-section">
            <h6 class="section-title">
              <i class="bi bi-cursor me-2"></i>调用点 ({{ functionDetail.callSites.length }})
            </h6>
            <div class="call-sites-list">
              <div 
                v-for="(site, index) in functionDetail.callSites" 
                :key="index"
                class="call-site-item"
              >
                <div class="site-info">
                  <span class="site-file">{{ site.file }}</span>
                  <span class="site-line">第 {{ site.line }} 行</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 调用者列表 -->
          <div v-if="callers && callers.length" class="detail-section">
            <h6 class="section-title">
              <i class="bi bi-arrow-up-circle me-2"></i>调用者 ({{ callers.length }})
            </h6>
            <div class="related-functions-list">
              <div 
                v-for="caller in callers.slice(0, 10)" 
                :key="caller.key"
                class="function-item"
                @click="viewRelatedFunction(caller.key)"
              >
                <div class="function-info">
                  <div class="function-name">{{ caller.name }}</div>
                  <div class="function-package">{{ caller.package }}</div>
                </div>
                <div class="function-metrics">
                  <span class="badge bg-primary">{{ caller.metrics?.callerCount || 0 }}</span>
                </div>
              </div>
              <div v-if="callers.length > 10" class="show-more">
                <button class="btn btn-sm btn-outline-primary">
                  显示更多 ({{ callers.length - 10 }})
                </button>
              </div>
            </div>
          </div>

          <!-- 被调用者列表 -->
          <div v-if="callees && callees.length" class="detail-section">
            <h6 class="section-title">
              <i class="bi bi-arrow-down-circle me-2"></i>被调用者 ({{ callees.length }})
            </h6>
            <div class="related-functions-list">
              <div 
                v-for="callee in callees.slice(0, 10)" 
                :key="callee.key"
                class="function-item"
                @click="viewRelatedFunction(callee.key)"
              >
                <div class="function-info">
                  <div class="function-name">{{ callee.name }}</div>
                  <div class="function-package">{{ callee.package }}</div>
                </div>
                <div class="function-metrics">
                  <span class="badge bg-secondary">{{ callee.metrics?.calleeCount || 0 }}</span>
                </div>
              </div>
              <div v-if="callees.length > 10" class="show-more">
                <button class="btn btn-sm btn-outline-primary">
                  显示更多 ({{ callees.length - 10 }})
                </button>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="detail-section">
            <div class="action-buttons">
              <button class="btn btn-primary me-2" @click="viewCallGraph">
                <i class="bi bi-diagram-3 me-1"></i>查看调用图
              </button>
              <button class="btn btn-outline-info me-2" @click="findCallPaths">
                <i class="bi bi-arrow-left-right me-1"></i>查找调用路径
              </button>
              <button class="btn btn-outline-secondary" @click="copyFunctionInfo">
                <i class="bi bi-clipboard me-1"></i>复制信息
              </button>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-5">
          <i class="bi bi-exclamation-circle text-warning display-4"></i>
          <h5 class="mt-3">无法加载函数详情</h5>
          <p class="text-muted">请检查函数Key是否正确</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { staticAnalysisAPI } from '../../config/api'

export default {
  name: 'FunctionDetailDrawer',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    functionKey: {
      type: String,
      required: true
    },
    dbPath: {
      type: String,
      required: true
    }
  },
  emits: ['close', 'view-call-graph', 'find-call-paths', 'view-function'],
  data() {
    return {
      loading: false,
      functionDetail: null,
      callers: [],
      callees: []
    }
  },
  watch: {
    show(newVal) {
      if (newVal && this.functionKey) {
        this.loadFunctionDetail()
      }
    },
    functionKey(newVal) {
      if (this.show && newVal) {
        this.loadFunctionDetail()
      }
    }
  },
  methods: {
    async loadFunctionDetail() {
      if (!this.functionKey) return
      
      this.loading = true
      try {
        const data = await staticAnalysisAPI.getFunctionDetails(this.functionKey)
        
        this.functionDetail = data.function
        this.callers = data.callers || []
        this.callees = data.callees || []
      } catch (error) {
        console.error('加载函数详情失败:', error)
        this.functionDetail = null
        this.callers = []
        this.callees = []
      } finally {
        this.loading = false
      }
    },

    closeDrawer() {
      this.$emit('close')
    },

    viewCallGraph() {
      this.$emit('view-call-graph', this.functionDetail)
      this.closeDrawer()
    },

    findCallPaths() {
      this.$emit('find-call-paths', this.functionDetail)
      this.closeDrawer()
    },

    viewRelatedFunction(functionKey) {
      this.$emit('view-function', functionKey)
    },

    copyFunctionInfo() {
      if (!this.functionDetail) return
      
      const info = [
        `函数名: ${this.functionDetail.name}`,
        `包名: ${this.functionDetail.package}`,
        `完整名称: ${this.functionDetail.fullName}`,
        `函数Key: ${this.functionDetail.key}`,
        this.functionDetail.signature ? `签名: ${this.functionDetail.signature}` : '',
        this.functionDetail.position ? `位置: ${this.functionDetail.position.filename}:${this.functionDetail.position.startLine}-${this.functionDetail.position.endLine}` : ''
      ].filter(Boolean).join('\n')
      
      navigator.clipboard.writeText(info).then(() => {
        // 可以添加提示消息
        console.log('函数信息已复制到剪贴板')
      })
    }
  }
}
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1050;
  display: flex;
  justify-content: flex-end;
  animation: fadeIn 0.3s ease;
}

.drawer-content {
  width: 600px;
  max-width: 90vw;
  background: white;
  height: 100vh;
  overflow-y: auto;
  box-shadow: -4px 0 15px rgba(0, 0, 0, 0.2);
  animation: slideInRight 0.3s ease;
}

.drawer-header {
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #dee2e6;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  position: sticky;
  top: 0;
  z-index: 10;
}

.drawer-title {
  margin: 0;
  color: #495057;
  font-weight: 600;
  flex: 1;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6c757d;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #495057;
}

.drawer-body {
  padding: 1.5rem;
}

.detail-section {
  margin-bottom: 2rem;
}

.section-title {
  color: #4785ff;
  font-weight: 600;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e9ecef;
}

.info-grid {
  display: grid;
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item label {
  font-weight: 600;
  color: #6c757d;
  font-size: 0.875rem;
}

.function-name {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #212529;
  background: #f8f9fa;
  padding: 0.5rem;
  border-radius: 4px;
}

.package-name {
  color: #4785ff;
  font-weight: 500;
  background: rgba(71, 133, 255, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
}

.full-name, .function-key {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: #6c757d;
  background: #f8f9fa;
  padding: 0.5rem;
  border-radius: 4px;
  word-break: break-all;
}

.signature-block {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}

.signature-block pre {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: #495057;
  white-space: pre-wrap;
}

.position-info {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #4785ff;
}

.filename {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #212529;
}

.line-numbers {
  font-family: 'Courier New', monospace;
  color: #4785ff;
  font-weight: 600;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.metric-card {
  text-align: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  transition: all 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #4785ff;
  margin-bottom: 0.5rem;
}

.metric-label {
  font-size: 0.8rem;
  color: #6c757d;
  font-weight: 500;
}

.doc-content {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
  max-height: 200px;
  overflow-y: auto;
}

.doc-content pre {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 0.875rem;
  color: #495057;
  white-space: pre-wrap;
  line-height: 1.5;
}

.call-sites-list {
  max-height: 300px;
  overflow-y: auto;
}

.call-site-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
}

.call-site-item:hover {
  background: rgba(71, 133, 255, 0.05);
  border-color: #4785ff;
}

.site-file {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #212529;
  font-size: 0.875rem;
}

.site-line {
  color: #4785ff;
  font-weight: 600;
  font-size: 0.8rem;
}

.related-functions-list {
  max-height: 300px;
  overflow-y: auto;
}

.function-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.function-item:hover {
  background: rgba(71, 133, 255, 0.05);
  border-color: #4785ff;
  transform: translateX(2px);
}

.function-info .function-name {
  font-weight: 600;
  color: #212529;
  font-size: 0.875rem;
  background: transparent;
  padding: 0;
}

.function-info .function-package {
  font-size: 0.75rem;
  color: #6c757d;
  margin-top: 0.25rem;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.show-more {
  text-align: center;
  margin-top: 1rem;
}

/* 动画效果 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .drawer-content {
    width: 100vw;
    max-width: 100vw;
  }
  
  .drawer-header {
    padding: 1rem;
  }
  
  .drawer-body {
    padding: 1rem;
  }
  
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-buttons .btn {
    width: 100%;
  }
}

/* 滚动条美化 */
.drawer-content::-webkit-scrollbar,
.call-sites-list::-webkit-scrollbar,
.related-functions-list::-webkit-scrollbar {
  width: 6px;
}

.drawer-content::-webkit-scrollbar-track,
.call-sites-list::-webkit-scrollbar-track,
.related-functions-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.drawer-content::-webkit-scrollbar-thumb,
.call-sites-list::-webkit-scrollbar-thumb,
.related-functions-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.drawer-content::-webkit-scrollbar-thumb:hover,
.call-sites-list::-webkit-scrollbar-thumb:hover,
.related-functions-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
