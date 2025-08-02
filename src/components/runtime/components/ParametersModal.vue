<template>
  <!-- 参数显示模态框 -->
  <div class="modal fade" id="paramsModal" tabindex="-1" aria-labelledby="paramsModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="paramsModalLabel">
            <i class="bi bi-code-square me-2"></i>参数详情
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body parameters-modal-body">
          <div v-if="parameters.length === 0" class="text-center py-4">
            <i class="bi bi-inbox display-4 text-muted mb-3 d-block"></i>
            <p class="text-muted">该函数没有参数信息</p>
          </div>
          <div v-else>
            <div v-for="(param, index) in parameters" :key="index" class="mb-4">
              <div class="card parameter-card">
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
                  </div>
                </div>
                <div class="card-body parameter-card-body">
                  <!-- JSON格式显示 -->
                  <div v-if="param.isJson && param.parsedJson" class="json-viewer-container">
                    <JsonViewer 
                      :value="param.parsedJson" 
                      :expand-depth="jsonViewerOptions.expanded"
                      :copyable="jsonViewerOptions.copyable"
                      :sort="jsonViewerOptions.sort"
                      :boxed="jsonViewerOptions.boxed"
                      :theme="jsonViewerOptions.theme"
                      :show-double-quotes="jsonViewerOptions.showDoubleQuotes"
                      :show-array-index="jsonViewerOptions.showArrayIndex"
                      :preview-mode="jsonViewerOptions.previewMode"
                    />
                  </div>
                  <!-- 普通文本显示 -->
                  <div v-else class="param-content">
                    <pre class="param-text">{{ formatParamValue(param) }}</pre>
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
        expanded: 0,
        copyable: true,
        sort: false,
        boxed: true,
        theme: 'jv-light',
        showDoubleQuotes: false,
        showArrayIndex: true,
        previewMode: false
      })
    }
  },
  
  methods: {
    // 格式化参数值
    formatParamValue(param) {
      if (!param.param) return '';
      
      const value = String(param.param);
      
      // 如果是长文本，则截断显示
      if (param.isLong) {
        return value.substring(0, this.paramMaxLength) + '...';
      }
      
      return value;
    }
  }
};
</script>

<style>
@import url("../../../assets/styles/components/runtime/parameters-modal.css");
</style> 