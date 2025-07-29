<template>
  <!-- 参数显示模态框 -->
  <div class="modal fade" id="paramsModal" tabindex="-1" aria-labelledby="paramsModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="paramsModalLabel">
            <i class="bi bi-code-square me-2"></i>参数详情
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div v-if="parameters.length === 0" class="text-center py-4">
            <i class="bi bi-inbox display-4 text-muted mb-3 d-block"></i>
            <p class="text-muted">该函数没有参数信息</p>
          </div>
          <div v-else>
            <div v-for="(param, index) in parameters" :key="index" class="mb-4">
              <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                  <h6 class="mb-0">
                    <i class="bi bi-hash me-1"></i>参数 {{ index + 1 }}
                    <span v-if="param.name" class="text-muted ms-2">({{ param.name }})</span>
                  </h6>
                  <div class="d-flex gap-2">
                    <!-- JSON格式标识 -->
                    <span v-if="param.isJson" class="badge bg-success">JSON</span>
                    <!-- 长文本标识 -->
                    <span v-if="param.isLong" class="badge bg-warning">长文本</span>
                    <!-- 展开/折叠按钮 -->
                    <button v-if="param.isLong" 
                            class="btn btn-sm btn-outline-secondary" 
                            @click="toggleParamExpansion(param)">
                      <i class="bi" 
                         :class="param.expanded ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
                      {{ param.expanded ? '折叠' : '展开' }}
                    </button>
                  </div>
                </div>
                <div class="card-body">
                  <!-- JSON格式显示 -->
                  <div v-if="param.isJson && param.parsedJson">
                    <JsonViewer 
                      :value="param.parsedJson" 
                      :expand-depth="jsonViewerOptions.expanded"
                      :copyable="jsonViewerOptions.copyable"
                      :sort="jsonViewerOptions.sort"
                      :boxed="jsonViewerOptions.boxed"
                      :theme="jsonViewerOptions.theme"
                      :show-double-quotes="jsonViewerOptions.showDoubleQuotes"
                      :show-array-index="jsonViewerOptions.showArrayIndex"
                    />
                  </div>
                  <!-- 普通文本显示 -->
                  <div v-else class="param-content">
                    <pre class="param-text" 
                         :class="{ 'param-collapsed': param.isLong && !param.expanded }">{{ formatParamValue(param) }}</pre>
                    <!-- 截断提示 -->
                    <div v-if="param.isLong && !param.expanded" class="text-muted small mt-2">
                      <i class="bi bi-three-dots me-1"></i>
                      内容过长，已截断显示前 {{ paramMaxLength }} 个字符
                    </div>
                  </div>
                  
                  <!-- 参数元信息 -->
                  <div v-if="param.type || param.size" class="mt-3 pt-3 border-top">
                    <div class="row g-2">
                      <div v-if="param.type" class="col-auto">
                        <span class="badge bg-info">类型: {{ param.type }}</span>
                      </div>
                      <div v-if="param.size" class="col-auto">
                        <span class="badge bg-secondary">大小: {{ param.size }}</span>
                      </div>
                      <div class="col-auto">
                        <span class="badge bg-light text-dark">
                          长度: {{ String(param.param || '').length }} 字符
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
            <i class="bi bi-x-circle me-1"></i>关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import JsonViewer from 'vue-json-viewer';

export default {
  name: 'ParametersModal',
  
  components: {
    JsonViewer
  },
  
  props: {
    parameters: {
      type: Array,
      default: () => []
    },
    paramMaxLength: {
      type: Number,
      default: 200
    },
    jsonViewerOptions: {
      type: Object,
      default: () => ({
        expanded: 2,
        copyable: true,
        sort: false,
        boxed: true,
        theme: 'jv-light',
        showDoubleQuotes: false,
        showArrayIndex: true
      })
    }
  },
  
  methods: {
    // 切换参数展开状态
    toggleParamExpansion(param) {
      param.expanded = !param.expanded;
    },
    
    // 格式化参数值
    formatParamValue(param) {
      if (!param.param) return '';
      
      const value = String(param.param);
      
      // 如果是长文本且未展开，则截断显示
      if (param.isLong && !param.expanded) {
        return value.substring(0, this.paramMaxLength) + '...';
      }
      
      return value;
    }
  }
};
</script>

<style scoped>
.modal-xl {
  max-width: 90vw;
}

.param-content {
  position: relative;
}

.param-text {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  padding: 1rem;
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-x: auto;
}

.param-collapsed {
  max-height: 200px;
  overflow: hidden;
}

.card-header h6 {
  color: #495057;
  font-weight: 600;
}

.badge {
  font-size: 0.75rem;
}

/* 自定义JSON查看器样式 */
:deep(.jv-container) {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

:deep(.jv-container .jv-code) {
  padding: 1rem;
}

/* 暗色模式适配 */
@media (prefers-color-scheme: dark) {
  .param-text {
    background-color: #2d3748;
    border-color: #4a5568;
    color: #e2e8f0;
  }
  
  :deep(.jv-container) {
    background-color: #2d3748;
    border-color: #4a5568;
  }
}
</style> 