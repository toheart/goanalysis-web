<template>
  <div class="modal fade" :class="{ show: visible }" :style="{ display: visible ? 'block' : 'none' }" tabindex="-1" aria-labelledby="callChainModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="callChainModalLabel">
            <i class="bi bi-diagram-3 me-2"></i>
            Goroutine #{{ gid || 'N/A' }} 调用链路详情
          </h5>
          <button type="button" class="btn-close" @click="closeModal" aria-label="Close"></button>
        </div>
        
        <div class="modal-body">
          <!-- 基本信息 -->
          <div class="row mb-4">
            <div class="col-md-6">
              <div class="card border-0 bg-light">
                <div class="card-body">
                  <h6 class="card-title text-muted mb-2">基本信息</h6>
                  <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">Goroutine ID:</span>
                    <span class="badge bg-primary">{{ gid || 'N/A' }}</span>
                  </div>
                  <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">初始函数:</span>
                    <code class="text-truncate" style="max-width: 200px;">{{ initialFunc }}</code>
                  </div>
                  <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">调用深度:</span>
                    <span class="badge bg-info">{{ depth || '-' }}</span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="text-muted">执行时间:</span>
                    <span class="badge bg-secondary">{{ executionTime || '-' }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card border-0 bg-light">
                <div class="card-body">
                  <h6 class="card-title text-muted mb-2">状态信息</h6>
                  <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">当前状态:</span>
                    <span v-if="isFinished" class="badge bg-success">已完成</span>
                    <span v-else class="badge bg-warning">运行中</span>
                  </div>
                  <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">调用链长度:</span>
                    <span class="badge bg-dark">{{ callChainData.length }}</span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="text-muted">目标函数:</span>
                    <code class="text-truncate" style="max-width: 200px;">{{ targetFunction }}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 调用链路详情 -->
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">
                <i class="bi bi-arrow-right-circle me-2"></i>
                完整调用链路
              </h6>
            </div>
            <div class="card-body p-0">
              <div v-if="loading" class="text-center p-4">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">加载中...</span>
                </div>
                <p class="text-muted mt-2 mb-0">正在获取调用链路详情...</p>
              </div>
              
              <div v-else-if="error" class="alert alert-danger m-3">
                <i class="bi bi-exclamation-triangle me-2"></i>
                获取调用链路失败: {{ error }}
              </div>
              
              <div v-else-if="!gid || !dbPath" class="text-center p-4">
                <i class="bi bi-exclamation-triangle display-4 text-warning mb-3"></i>
                <h6 class="text-warning">缺少必要参数</h6>
                <p class="text-muted mb-0">Goroutine ID 或数据库路径无效</p>
              </div>
              
              <div v-else-if="callChainData.length === 0" class="text-center p-4">
                <i class="bi bi-inbox display-4 text-muted mb-3"></i>
                <h6 class="text-muted">暂无调用链路数据</h6>
                <p class="text-muted mb-0">当前Goroutine没有可用的调用链路信息</p>
              </div>
              
              <div v-else class="call-chain-container">
                <!-- 调用链路可视化 -->
                <div class="call-chain-visual p-3">
                  <div class="call-chain-flow">
                    <div 
                      v-for="(func, index) in callChainData" 
                      :key="index"
                      class="call-chain-item"
                      :class="{ 
                        'is-initial': index === 0,
                        'is-target': func === targetFunction,
                        'is-current': func === targetFunction
                      }"
                    >
                      <div class="function-card">
                        <div class="function-header">
                          <span class="function-index">{{ index + 1 }}</span>
                          <span class="function-type-badge" v-if="index === 0">初始</span>
                          <span class="function-type-badge target" v-if="func === targetFunction">目标</span>
                        </div>
                        <div class="function-name">
                          <code>{{ func }}</code>
                        </div>
                        <div class="function-details" v-if="funcDetails[func]">
                          <small class="text-muted">
                            <i class="bi bi-clock me-1"></i>
                            {{ funcDetails[func].executionTime || 'N/A' }}
                          </small>
                        </div>
                      </div>
                      
                      <!-- 箭头连接 -->
                      <div v-if="index < callChainData.length - 1" class="call-arrow">
                        <i class="bi bi-arrow-down"></i>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 调用链路表格 -->
                <div class="table-responsive">
                  <table class="table table-sm table-hover mb-0">
                    <thead class="table-light">
                      <tr>
                        <th style="width: 60px">#</th>
                        <th>函数名称</th>
                        <th style="width: 100px">类型</th>
                        <th style="width: 120px">执行时间</th>
                        <th style="width: 100px">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr 
                        v-for="(func, index) in callChainData" 
                        :key="index"
                        :class="{ 
                          'table-primary': func === targetFunction,
                          'table-light': index === 0
                        }"
                      >
                        <td>
                          <span class="badge" :class="{
                            'bg-primary': index === 0,
                            'bg-success': func === targetFunction,
                            'bg-secondary': index !== 0 && func !== targetFunction
                          }">{{ index + 1 }}</span>
                        </td>
                        <td>
                          <code class="text-break">{{ func }}</code>
                        </td>
                        <td>
                          <span v-if="index === 0" class="badge bg-primary">初始函数</span>
                          <span v-else-if="func === targetFunction" class="badge bg-success">目标函数</span>
                          <span v-else class="badge bg-secondary">中间函数</span>
                        </td>
                        <td>
                          <span v-if="funcDetails[func]?.executionTime" class="text-muted">
                            {{ funcDetails[func].executionTime }}
                          </span>
                          <span v-else class="text-muted">N/A</span>
                        </td>
                        <td>
                          <button 
                            v-if="func !== targetFunction"
                            class="btn btn-sm btn-outline-primary"
                            @click="searchFunction(func)"
                            title="搜索此函数"
                          >
                            <i class="bi bi-search"></i>
                          </button>
                          <span v-else class="text-success">
                            <i class="bi bi-check-circle"></i>
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">
            <i class="bi bi-x-circle me-1"></i>
            关闭
          </button>
          <router-link 
            v-if="gid"
            :to="{ 
              name: 'TraceDetails', 
              params: { gid: gid },
              query: { highlight: targetFunctionId }
            }" 
            class="btn btn-primary"
            @click="closeModal"
          >
            <i class="bi bi-eye me-1"></i>
            查看完整追踪
          </router-link>
          <button 
            v-else
            class="btn btn-primary"
            disabled
            title="Goroutine ID 无效"
          >
            <i class="bi bi-eye me-1"></i>
            查看完整追踪
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 模态框背景遮罩 -->
  <div v-if="visible" class="modal-backdrop fade show" @click="closeModal"></div>
</template>

<script>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from '../../../axios';

export default {
  name: 'CallChainModal',
  
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    gid: {
      type: [String, Number],
      default: null
    },
    initialFunc: {
      type: String,
      default: ''
    },
    depth: {
      type: [String, Number],
      default: null
    },
    executionTime: {
      type: String,
      default: ''
    },
    isFinished: {
      type: Boolean,
      default: false
    },
    callChain: {
      type: Array,
      default: () => []
    },
    targetFunction: {
      type: String,
      default: ''
    },
    targetFunctionId: {
      type: [String, Number],
      default: null
    },
    dbPath: {
      type: String,
      default: ''
    }
  },
  
  emits: ['update:visible'],
  
  setup(props, { emit }) {
    const router = useRouter();
    const loading = ref(false);
    const error = ref(null);
    const callChainData = ref([]);
    const funcDetails = ref({});
    
    // 计算属性
    const closeModal = () => {
      emit('update:visible', false);
    };
    
    // 监听visible变化，加载数据
    watch(() => props.visible, (newVisible) => {
      if (newVisible && props.gid && props.dbPath) {
        loadCallChainDetails();
      }
    });
    
    // 加载调用链路详情
    const loadCallChainDetails = async () => {
      if (!props.gid || !props.dbPath) return;
      
      loading.value = true;
      error.value = null;
      
      try {
        // 使用传入的调用链路数据
        callChainData.value = [...props.callChain];
        
        // 获取函数详细信息
        if (props.targetFunctionId && props.gid) {
          const functionInfoResponse = await axios.post('/api/runtime/function/info', {
            dbpath: props.dbPath,
            gid: props.gid,
            functionId: props.targetFunctionId,
            currentDepth: props.depth || 3
          });
          
          if (functionInfoResponse.data && functionInfoResponse.data.functionInfo) {
            const functionInfo = functionInfoResponse.data.functionInfo;
            
                         // 构建函数详情映射
             if (functionInfo.parentIds && functionInfo.parentIds.length > 0) {
               functionInfo.parentIds.forEach((parent) => {
                 if (parent.name) {
                   funcDetails.value[parent.name] = {
                     executionTime: parent.executionTime || 'N/A',
                     depth: parent.depth
                   };
                 }
               });
             }
            
            // 添加目标函数详情
            if (functionInfo.executionTime) {
              funcDetails.value[props.targetFunction] = {
                executionTime: functionInfo.executionTime,
                depth: functionInfo.depth
              };
            }
          }
        }
        
      } catch (err) {
        console.error('获取调用链路详情失败:', err);
        error.value = err.message || '获取调用链路详情失败';
      } finally {
        loading.value = false;
      }
    };
    
    // 搜索函数
    const searchFunction = (functionName) => {
      closeModal();
      router.push({
        name: 'FunctionAnalysis',
        query: { 
          search: functionName,
          dbpath: props.dbPath
        }
      });
    };
    
    return {
      loading,
      error,
      callChainData,
      funcDetails,
      closeModal,
      searchFunction
    };
  }
};
</script>

<style scoped>
.call-chain-container {
  max-height: 600px;
  overflow-y: auto;
}

.call-chain-visual {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.call-chain-flow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.call-chain-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 500px;
}

.function-card {
  background: white;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.function-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

.function-card.is-initial {
  border-color: #0d6efd;
  background: linear-gradient(135deg, #f8f9ff 0%, #e7f3ff 100%);
}

.function-card.is-target {
  border-color: #198754;
  background: linear-gradient(135deg, #f8fff9 0%, #e7ffe7 100%);
}

.function-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.function-index {
  background: #6c757d;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
}

.function-type-badge {
  background: #6c757d;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.function-type-badge.target {
  background: #198754;
}

.function-name {
  margin-bottom: 0.5rem;
}

.function-name code {
  font-size: 0.9rem;
  word-break: break-all;
  line-height: 1.4;
}

.function-details {
  font-size: 0.8rem;
}

.call-arrow {
  color: #6c757d;
  font-size: 1.5rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .call-chain-item {
    max-width: 100%;
  }
  
  .function-card {
    padding: 0.75rem;
  }
  
  .function-name code {
    font-size: 0.8rem;
  }
}

/* 表格样式优化 */
.table th {
  font-weight: 600;
  background-color: #f8f9fa;
}

.table td {
  vertical-align: middle;
}

.table-primary {
  background-color: rgba(13, 110, 253, 0.1) !important;
}

.table-light {
  background-color: rgba(248, 249, 250, 0.5) !important;
}
</style> 