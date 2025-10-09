<template>
  <div v-if="selectedPackage" class="package-detail-panel">
    <div class="panel-header">
      <h5 class="panel-title">
        <i class="bi bi-box-seam me-2"></i>包详情
      </h5>
    </div>

    <div class="panel-body">
      <!-- 基本信息 -->
      <div class="info-section">
        <div class="section-title">基本信息</div>
        <div class="info-item">
          <label>包名:</label>
          <span class="package-name">{{ selectedPackage.name }}</span>
        </div>
        <div class="info-item">
          <label>函数数量:</label>
          <span class="metric-value">{{ selectedPackage.functionCount || 0 }}</span>
        </div>
        <div class="info-item">
          <label>复杂度:</label>
          <div class="complexity-bar">
            <div 
              class="complexity-fill" 
              :style="{ width: (selectedPackage.complexity * 100) + '%' }"
            ></div>
            <span class="complexity-text">{{ (selectedPackage.complexity || 0).toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- 依赖的包 -->
      <div v-if="dependencies.length" class="info-section">
        <div class="section-title">
          依赖的包 ({{ dependencies.length }})
        </div>
        <div class="package-list">
          <div 
            v-for="dep in dependencies" 
            :key="dep.targetPackage"
            class="package-list-item"
          >
            <div class="package-item-info">
              <div class="package-item-name">{{ dep.targetPackage }}</div>
              <div class="package-item-stats">
                <span class="badge bg-info">{{ dep.callCount }} 次调用</span>
              </div>
            </div>
            <button 
              class="btn btn-sm btn-outline-primary"
              @click="addPackageToGraph(dep.targetPackage)"
              title="在图中显示此包"
            >
              <i class="bi bi-plus-circle"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 被依赖的包 -->
      <div v-if="dependents.length" class="info-section">
        <div class="section-title">
          被依赖的包 ({{ dependents.length }})
        </div>
        <div class="package-list">
          <div 
            v-for="dep in dependents" 
            :key="dep.sourcePackage"
            class="package-list-item"
          >
            <div class="package-item-info">
              <div class="package-item-name">{{ dep.sourcePackage }}</div>
              <div class="package-item-stats">
                <span class="badge bg-warning">{{ dep.callCount }} 次调用</span>
              </div>
            </div>
            <button 
              class="btn btn-sm btn-outline-primary"
              @click="addPackageToGraph(dep.sourcePackage)"
              title="在图中显示此包"
            >
              <i class="bi bi-plus-circle"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <button 
          class="btn btn-outline-secondary btn-sm w-100 mb-2"
          @click="clearSelection"
        >
          <i class="bi bi-x-circle me-1"></i>清除选择
        </button>
      </div>
    </div>
  </div>

  <!-- 空状态 -->
  <div v-else class="package-detail-panel empty-state">
    <div class="empty-icon">
      <i class="bi bi-box"></i>
    </div>
    <p class="empty-text">点击图中的包节点查看详情</p>
  </div>
</template>

<script>
export default {
  name: 'PackageDetailPanel',
  props: {
    selectedPackage: {
      type: Object,
      default: null
    },
    dependencies: {
      type: Array,
      default: () => []
    },
    dependents: {
      type: Array,
      default: () => []
    }
  },
  emits: ['add-package-to-graph', 'clear-selection'],
  methods: {
    addPackageToGraph(packageName) {
      this.$emit('add-package-to-graph', packageName)
    },
    
    clearSelection() {
      this.$emit('clear-selection')
    }
  }
}
</script>

<style scoped>
.package-detail-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  height: 100%;
}

.panel-header {
  background: linear-gradient(135deg, #4785ff 0%, #2684ff 100%);
  color: white;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.panel-body {
  padding: 1.25rem;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.info-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.info-section:last-child {
  border-bottom: none;
}

.section-title {
  font-weight: 600;
  color: #495057;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.info-item label {
  font-weight: 600;
  color: #6c757d;
  font-size: 0.85rem;
}

.package-name {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #212529;
  background: #f8f9fa;
  padding: 0.5rem;
  border-radius: 6px;
  word-break: break-all;
  font-size: 0.85rem;
}

.metric-value {
  font-weight: 700;
  color: #4785ff;
  font-size: 1.2rem;
}

.complexity-bar {
  display: flex;
  align-items: center;
  background: #e9ecef;
  border-radius: 10px;
  height: 24px;
  overflow: hidden;
  position: relative;
}

.complexity-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745 0%, #ffc107 50%, #dc3545 100%);
  transition: width 0.3s ease;
}

.complexity-text {
  position: absolute;
  right: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #495057;
}

.package-list {
  max-height: 300px;
  overflow-y: auto;
}

.package-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.package-list-item:hover {
  background: rgba(71, 133, 255, 0.05);
  border-color: #4785ff;
  transform: translateX(2px);
}

.package-item-info {
  flex: 1;
  min-width: 0;
}

.package-item-name {
  font-weight: 600;
  color: #212529;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.package-item-stats {
  display: flex;
  gap: 0.25rem;
}

.badge {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
}

.action-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  background: #f8f9fa;
}

.empty-icon {
  font-size: 4rem;
  color: #dee2e6;
  margin-bottom: 1rem;
}

.empty-text {
  color: #6c757d;
  font-size: 0.9rem;
  text-align: center;
  margin: 0;
}

/* 按钮样式 */
.btn {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-outline-primary {
  border-color: #4785ff;
  color: #4785ff;
}

.btn-outline-primary:hover {
  background: #4785ff;
  border-color: #4785ff;
  color: white;
}

.btn-outline-secondary {
  border-color: #6c757d;
  color: #6c757d;
}

.btn-outline-secondary:hover {
  background: #6c757d;
  border-color: #6c757d;
  color: white;
}

/* 滚动条美化 */
.panel-body::-webkit-scrollbar,
.package-list::-webkit-scrollbar {
  width: 6px;
}

.panel-body::-webkit-scrollbar-track,
.package-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.panel-body::-webkit-scrollbar-thumb,
.package-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.panel-body::-webkit-scrollbar-thumb:hover,
.package-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 响应式设计 */
@media (max-width: 992px) {
  .package-detail-panel {
    margin-top: 1rem;
  }
}
</style>
