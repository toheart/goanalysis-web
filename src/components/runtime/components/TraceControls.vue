<template>
  <div class="card mb-4">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h5 class="mb-0">
        <i class="bi bi-sliders me-2"></i>查询控制
      </h5>
      <div class="controls">
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-secondary" 
                  :disabled="isProcessing || loading"
                  @click="$emit('collapseAll')">
            <i class="bi bi-arrows-collapse me-1"></i>折叠全部
          </button>
          <button class="btn btn-sm btn-outline-secondary" 
                  :disabled="isProcessing || loading"
                  @click="$emit('expandAll')">
            <i class="bi bi-arrows-expand me-1"></i>展开全部
          </button>
        </div>
      </div>
    </div>
    <div class="card-body">
      <div class="row g-3 align-items-end">
        <div class="col-md-4">
          <label class="form-label">调用深度</label>
          <div class="d-flex align-items-center">
            <input 
              type="number" 
              class="form-control me-2" 
              :value="depth" 
              @input="$emit('update:depth', parseInt($event.target.value))"
              min="1" 
              max="10" 
              step="1"
            />
            <button 
              class="btn btn-primary" 
              @click="$emit('reloadData')"
              :disabled="loading || isProcessing"
            >
              <i v-if="loading" class="spinner-border spinner-border-sm me-1" role="status"></i>
              <i v-else class="bi bi-arrow-clockwise me-1"></i>
              {{ loading ? '加载中...' : '重新查询' }}
            </button>
          </div>
          <div class="form-text">
            设置调用链的最大深度（1-10层）
          </div>
        </div>
        
        <div class="col-md-8">
          <!-- 统计信息 -->
          <div class="row g-2">
            <div class="col-auto">
              <div class="d-flex align-items-center">
                <i class="bi bi-diagram-3 text-primary me-1"></i>
                <small class="text-muted">
                  最大深度: <strong class="text-primary">{{ callTreeStats.maxDepth }}</strong>
                </small>
              </div>
            </div>
            <div class="col-auto">
              <div class="d-flex align-items-center">
                <i class="bi bi-collection text-success me-1"></i>
                <small class="text-muted">
                  函数总数: <strong class="text-success">{{ callTreeStats.totalNodes }}</strong>
                </small>
              </div>
            </div>
            <div class="col-auto" v-if="visibleNodes !== undefined">
              <div class="d-flex align-items-center">
                <i class="bi bi-eye text-info me-1"></i>
                <small class="text-muted">
                  可见节点: <strong class="text-info">{{ visibleNodes }}</strong>
                </small>
              </div>
            </div>
            <div class="col-auto" v-if="expandedNodes !== undefined">
              <div class="d-flex align-items-center">
                <i class="bi bi-arrows-expand text-warning me-1"></i>
                <small class="text-muted">
                  已展开: <strong class="text-warning">{{ expandedNodes }}</strong>
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 懒加载进度条 -->
      <div v-if="isLazyLoading" class="mt-3">
        <div class="d-flex align-items-center mb-2">
          <i class="bi bi-hourglass-split text-primary me-2"></i>
          <span class="text-muted">正在加载数据...</span>
        </div>
        <div class="progress">
          <div 
            class="progress-bar progress-bar-striped progress-bar-animated" 
            role="progressbar" 
            style="width: 100%"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TraceControls',
  
  props: {
    depth: {
      type: Number,
      default: 3
    },
    loading: {
      type: Boolean,
      default: false
    },
    isLazyLoading: {
      type: Boolean,
      default: false
    },
    callTreeStats: {
      type: Object,
      default: () => ({
        totalNodes: 0,
        maxDepth: 0,
        functionCount: 0
      })
    },
    visibleNodes: {
      type: Number,
      required: false
    },
    expandedNodes: {
      type: Number,
      required: false
    },
    isProcessing: {
      type: Boolean,
      default: false
    }
  },
  
  emits: [
    'update:depth',
    'reloadData',
    'expandAll',
    'collapseAll'
  ]
};
</script>

<style>
@import url("../../../assets/styles/components/runtime/trace-controls.css");
</style> 