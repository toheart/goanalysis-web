<template>
  <div class="static-analysis-with-monitor">
    <!-- 项目分析卡片 -->
    <div class="card mb-4 shadow-sm">
      <div class="card-header bg-gradient-primary">
        <h5 class="mb-0 text-white d-flex align-items-center">
          <i class="bi bi-folder2-open me-2"></i>{{ $t('staticAnalysis.form.projectPath') }}
        </h5>
      </div>
      <div class="card-body">
        <!-- 主要输入区域 -->
        <div class="mb-4">
          <div class="input-group">
            <span class="input-group-text bg-light">
              <i class="bi bi-folder text-primary"></i>
            </span>
              <input 
                type="text" 
              class="form-control form-control-lg" 
                :placeholder="$t('staticAnalysis.form.projectPathPlaceholder')" 
                v-model="projectPath"
                :disabled="isAnalyzing"
              >
              <button 
              class="btn btn-primary px-4" 
                @click="startAnalysis" 
                :disabled="!projectPath || isAnalyzing"
              >
                <span v-if="isAnalyzing" class="spinner-border spinner-border-sm me-2" role="status"></span>
              <i class="bi bi-play-fill me-1" v-else></i>
                {{ isAnalyzing ? $t('staticAnalysis.form.analyzing') : $t('staticAnalysis.form.startAnalysis') }}
              </button>
            </div>
            
          <!-- 错误提示 -->
          <div v-if="pathError" class="alert alert-danger mt-3 mb-0">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ pathError }}
          </div>
        </div>
        
        <!-- 分析选项 -->
        <div class="analysis-options">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0 text-primary">
              <i class="bi bi-gear me-2"></i>{{ $t('staticAnalysis.options.title') }}
            </h6>
            <button 
              class="btn btn-sm btn-outline-primary" 
              @click="showOptions = !showOptions"
            >
              <i :class="showOptions ? 'bi bi-chevron-up' : 'bi bi-chevron-down'" class="me-1"></i>
                  {{ showOptions ? $t('staticAnalysis.options.hideOptions') : $t('staticAnalysis.options.showOptions') }}
                </button>
              </div>
          
          <div v-show="showOptions" class="options-panel">
            <div class="row g-3">
                  <!-- 算法选择 -->
              <div class="col-md-6">
                <label class="form-label fw-bold small">{{ $t('staticAnalysis.options.algorithm') }}</label>
                    <select 
                  class="form-select form-select-sm" 
                      v-model="analysisOptions.algo"
                    >
                      <option value="vta">{{ $t('staticAnalysis.options.algorithms.vta') }}</option>
                      <option value="rta">{{ $t('staticAnalysis.options.algorithms.rta') }}</option>
                      <option value="cha">{{ $t('staticAnalysis.options.algorithms.cha') }}</option>
                      <option value="static">{{ $t('staticAnalysis.options.algorithms.static') }}</option>
                    </select>
                <div class="form-text small">{{ $t('staticAnalysis.options.algorithmTip') }}</div>
                  </div>
                                  
              <!-- 忽略方法 -->
              <div class="col-md-6">
                <label class="form-label fw-bold small">{{ $t('staticAnalysis.options.ignoreMethod') }}</label>
                    <input 
                      type="text" 
                  class="form-control form-control-sm" 
                      v-model="analysisOptions.ignoreMethod"
                      :placeholder="$t('staticAnalysis.options.ignoreMethodPlaceholder')"
                    >
                <div class="form-text small">{{ $t('staticAnalysis.options.ignoreMethodTip') }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 提示信息 -->
        <div class="alert alert-info border-0 bg-light-info mt-3">
          <div class="d-flex align-items-start">
            <i class="bi bi-info-circle-fill text-info me-2 mt-1"></i>
            <div>
              <strong>{{ $t('staticAnalysis.form.tip') }}</strong>
              <p class="mb-0 small">{{ $t('staticAnalysis.form.pathTip') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务监控卡片 -->
    <div class="card shadow-sm" v-if="taskId">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0 d-flex align-items-center">
          <i class="bi bi-activity me-2 text-primary"></i>{{ $t('staticAnalysis.monitor.title') }}
        </h5>
        <div class="d-flex align-items-center">
          <span 
            class="badge me-2"
            :class="{
              'bg-success': isConnected,
              'bg-danger': !isConnected && !connecting,
              'bg-warning': connecting
            }"
          >
            <i :class="{
              'bi bi-wifi': isConnected,
              'bi bi-wifi-off': !isConnected && !connecting,
              'bi bi-hourglass-split': connecting
            }" class="me-1"></i>
            {{ isConnected ? $t('staticAnalysis.monitor.connected') : 
               connecting ? $t('staticAnalysis.monitor.connecting') : 
               $t('staticAnalysis.monitor.disconnected') }}
          </span>
          <button 
            v-if="!isConnected && !connecting" 
            class="btn btn-sm btn-outline-primary" 
            @click="connect"
          >
            {{ $t('staticAnalysis.monitor.connectServer') }}
          </button>
          <button 
            v-else-if="isConnected" 
            class="btn btn-sm btn-outline-danger" 
            @click="disconnect"
          >
            {{ $t('staticAnalysis.monitor.disconnect') }}
          </button>
        </div>
      </div>
      
      <div class="card-body">
        <!-- 任务状态 -->
        <div v-if="taskId && taskStatus" class="mb-4">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <small class="text-muted">{{ $t('staticAnalysis.monitor.taskId') }}: {{ taskId }}</small>
            <span 
              class="badge fs-6"
              :class="{
                'bg-primary': taskStatus.status === 'processing',
                'bg-success': taskStatus.status === 'completed',
                'bg-danger': taskStatus.status === 'failed',
                'bg-secondary': taskStatus.status === 'not_found'
              }"
            >
              {{ getStatusText(taskStatus.status) }}
            </span>
          </div>
          
          <!-- 进度条 -->
          <div class="progress mb-3" style="height: 8px;">
            <div 
              class="progress-bar" 
              :class="{
                'progress-bar-striped progress-bar-animated': taskStatus.status === 'processing',
                'bg-success': taskStatus.status === 'completed',
                'bg-danger': taskStatus.status === 'failed'
              }"
              role="progressbar" 
              :style="{width: taskStatus.progress + '%'}" 
              :aria-valuenow="taskStatus.progress" 
              aria-valuemin="0" 
              aria-valuemax="100"
            >
            </div>
          </div>
          
          <!-- 状态提示 -->
          <div v-if="taskStatus.status === 'completed'" class="alert alert-success border-0">
            <i class="bi bi-check-circle-fill me-2"></i>{{ $t('staticAnalysis.monitor.completed') }}
            <button class="btn btn-sm btn-success ms-2" @click="$emit('refresh-db-files')">
              <i class="bi bi-arrow-clockwise me-1"></i>{{ $t('staticAnalysis.monitor.refreshDb') }}
            </button>
          </div>
          
          <div v-if="taskStatus.status === 'failed'" class="alert alert-danger border-0">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ $t('staticAnalysis.monitor.failed') }}: {{ taskStatus.message }}
          </div>
        </div>
        
        <!-- 日志区域 -->
        <div class="logs-section">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0 text-secondary">
              <i class="bi bi-terminal me-2"></i>{{ $t('staticAnalysis.monitor.logs') }}
            </h6>
            <span class="badge bg-info">{{ messages.length }} {{ $t('staticAnalysis.monitor.messages') }}</span>
        </div>
        
          <div class="logs-container">
            <div v-for="(message, index) in messages" :key="index" class="log-message">
              <div class="message-content" :class="getMessageClass(message)">
                {{ formatMessage(message) }}
              </div>
            </div>
            <div v-if="messages.length === 0" class="text-center text-muted py-4">
              <i class="bi bi-chat-square-text me-2"></i>{{ $t('staticAnalysis.monitor.noMessages') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useI18n } from 'vue-i18n';
import axios from '../../axios';

export default {
  name: 'StaticAnalysisWithMonitor',
  props: {
    initialProjectPath: {
      type: String,
      default: ''
    },
    initialAnalysisOptions: {
      type: Object,
      default: () => ({
        algo: 'vta',
        ignoreMethod: ''
      })
    }
  },
  setup() {
    const { t, locale } = useI18n({ useScope: 'global' });
    return { t, locale };
  },
  data() {
    return {
      projectPath: this.initialProjectPath,
      analysisOptions: { ...this.initialAnalysisOptions },
      showOptions: false,
      isAnalyzing: false,
      pathError: '',
      
      // 任务监控相关数据
      taskId: '',
      eventSource: null,
      isConnected: false,
      connecting: false,
      taskStatus: null,
      messages: [],
      statusCheckInterval: null,
      parseErrorCount: 0
    }
  },
  mounted() {
    // 添加语言变化监听
    window.addEventListener('languageChanged', this.handleLanguageChange);
  },
  beforeUnmount() {
    // 移除语言变化监听
    window.removeEventListener('languageChanged', this.handleLanguageChange);
    this.disconnect();
  },
  methods: {
    // 处理语言变化
    handleLanguageChange(event) {
      console.log('StaticAnalysisWithMonitor - Language changed:', event.detail.locale);
      // 强制刷新组件中的国际化文本
      this.$forceUpdate();
    },
    
    async startAnalysis() {
      if (!this.projectPath) {
        this.pathError = this.$t('staticAnalysis.form.pathError');
        return;
      }
      
      this.isAnalyzing = true;
      this.pathError = '';
      
      try {
        const apiBaseUrl = process.env.VUE_APP_API_URL || '';
        const response = await axios.post(`${apiBaseUrl}/api/static/analyze/path`, {
          path: this.projectPath,
          algo: this.analysisOptions.algo,
          ignoreMethod: this.analysisOptions.ignoreMethod
        });

        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}: ${response.data || this.$t('common.error')}`);
        }

        const data = response.data;

        if (data.taskId) {
          this.taskId = data.taskId;
          this.$emit('analysis-started', this.taskId);
          
          // 自动连接到事件流
          this.connect();
          this.startStatusCheck();
        } else {
          throw new Error(this.$t('staticAnalysis.form.noTaskId'));
        }
      } catch (error) {
        console.error('启动分析任务失败:', error);
        this.pathError = `${this.$t('staticAnalysis.form.analysisError')}: ${error.message}`;
        this.isAnalyzing = false;
      }
    },
    
    // 任务监控相关方法
    connect() {
      if (!this.taskId) return;
      
      if (this.eventSource) {
        this.disconnect();
      }
      
      this.connecting = true;
      
      try {
        // 构建 SSE URL
        const apiBaseUrl = process.env.VUE_APP_API_URL || '';
        const sseUrl = `${apiBaseUrl}/api/static/analysis/${this.taskId}`;
        console.log('Connecting to SSE:', sseUrl);
        
        this.eventSource = new EventSource(sseUrl);
        
        this.eventSource.onopen = () => {
          console.log('SSE connection established');
          this.isConnected = true;
          this.connecting = false;
          this.$emit('connected');
        };
        
        this.eventSource.onmessage = (event) => {
          try {
            // 将消息添加到消息列表中
            this.messages.push(event.data);
            this.scrollToBottom();
            
            // 尝试解析消息内容
            let messageType = 0;
            let isCompletionMessage = false;
            
            try {
              // 尝试从消息中提取type和message
              if (event.data.includes('"type"') && event.data.includes('"message"')) {
                const typeMatch = event.data.match(/"type":(\d+)/);
                if (typeMatch && typeMatch[1]) {
                  messageType = parseInt(typeMatch[1]);
                  // 检查是否是完成消息
                  isCompletionMessage = (messageType === 2);
                }
              }
              
              // 检查消息内容是否表示完成
              isCompletionMessage = isCompletionMessage || 
                                   event.data.includes('"type":2') || 
                                   event.data.includes('Analysis task completed') ||
                                   event.data.includes('分析完成');
            } catch (parseError) {
              console.warn('解析消息类型失败:', parseError);
            }
            
            // 根据消息类型更新任务状态
            if (isCompletionMessage) {
              console.log('收到分析完成消息，更新状态并断开连接');
              // 更新任务状态为完成
              this.taskStatus = {
                status: 'completed',
                progress: 100,
                message: this.formatMessage(event.data)
              };
              this.$emit('task-completed', this.taskStatus);
              this.$emit('status-updated', this.taskStatus);
              this.isAnalyzing = false;
              
              // 延迟断开连接，确保消息已经处理完毕
              setTimeout(() => {
                if (this.eventSource) {
                  console.log('分析完成，主动断开SSE连接');
                  this.disconnect();
                }
              }, 500);
            }
          } catch (e) {
            console.error('处理SSE消息失败:', e);
            // 如果处理失败，将原始消息添加到列表
            this.messages.push(`${this.$t('staticAnalysis.monitor.parseError')}: ${e.message}`);
            this.scrollToBottom();
            
            // 如果连续解析失败次数过多，则断开连接
            this.parseErrorCount = (this.parseErrorCount || 0) + 1;
            if (this.parseErrorCount > 3) {
              console.error('连续解析失败次数过多，断开连接');
              this.taskStatus = {
                status: 'failed',
                progress: 0,
                message: this.$t('staticAnalysis.monitor.tooManyParseErrors')
              };
              this.$emit('task-completed', this.taskStatus);
              this.$emit('status-updated', this.taskStatus);
              this.isAnalyzing = false;
              this.disconnect();
              this.stopStatusCheck();
            }
          }
        };
        
        this.eventSource.onerror = (error) => {
          console.error('SSE error:', error);
          
          // 检查是否已经完成分析，如果已完成则不显示错误
          if (this.taskStatus && this.taskStatus.status === 'completed') {
            console.log('SSE connection closed after task completion, ignoring error');
            this.isConnected = false;
            this.connecting = false;
            return;
          }
          
          // 检查消息中是否包含分析完成的标志
          const hasCompletionMessage = this.messages.some(msg => 
            msg.includes('"type":2') || 
            msg.includes('Analysis task completed') || 
            msg.includes('分析完成')
          );
          
          if (hasCompletionMessage) {
            console.log('Task already completed, ignoring SSE error');
            // 更新连接状态但不显示错误
            this.isConnected = false;
            this.connecting = false;
            return;
          }
          
          // 如果不是因为任务完成导致的连接关闭，则显示错误
          this.isConnected = false;
          this.connecting = false;
          this.$emit('error', error);
          
          // 更新任务状态为失败
          this.taskStatus = {
            status: 'failed',
            progress: 0,
            message: this.$t('staticAnalysis.monitor.connectionError')
          };
          this.$emit('task-completed', this.taskStatus);
          this.$emit('status-updated', this.taskStatus);
          this.isAnalyzing = false;
          
          // 断开连接并停止状态检查
          this.disconnect();
          this.stopStatusCheck();
        };
      } catch (error) {
        console.error('Failed to create SSE connection:', error);
        this.isConnected = false;
        this.connecting = false;
        this.$emit('error', error);
        this.isAnalyzing = false;
      }
    },
    
    disconnect() {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
        this.isConnected = false;
        this.stopStatusCheck();
      }
    },
    
    startStatusCheck() {
      this.fetchTaskStatus();
      this.stopStatusCheck();
      
      this.statusCheckInterval = setInterval(() => {
        this.fetchTaskStatus();
      }, 5000);
    },
    
    stopStatusCheck() {
      if (this.statusCheckInterval) {
        clearInterval(this.statusCheckInterval);
        this.statusCheckInterval = null;
      }
    },
    
    async fetchTaskStatus() {
      if (!this.taskId) return;
      
      try {
        const apiBaseUrl = process.env.VUE_APP_API_URL || '';
        const response = await fetch(`${apiBaseUrl}/api/static/task/${this.taskId}/status`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`获取任务状态失败: HTTP ${response.status} - ${errorText}`);
          this.taskStatus = {
            status: 'failed',
            progress: 0,
            message: `${this.$t('staticAnalysis.monitor.requestFailed')}: HTTP ${response.status} - ${errorText || this.$t('common.error')}`
          };
          this.stopStatusCheck();
          this.$emit('task-completed', this.taskStatus);
          this.$emit('status-updated', this.taskStatus);
          this.isAnalyzing = false;
          this.disconnect();
          return;
        }
        
        const data = await response.json();
        
        // 更新任务状态，包括进度信息
        this.taskStatus = {
          status: this.getStatusFromCode(data.status),
          message: data.message,
          progress: data.progress || 0 // 使用服务器返回的进度，如果没有则默认为0
        };
        
        // 触发状态更新事件
        this.$emit('status-updated', this.taskStatus);
        
        if (data.status === 2 || data.status === -1) { // 完成或失败
          this.stopStatusCheck();
          this.$emit('task-completed', this.taskStatus);
          this.isAnalyzing = false;
          this.disconnect();
        }
      } catch (error) {
        console.error('获取任务状态失败:', error);
        this.taskStatus = {
          status: 'failed',
          progress: 0,
          message: `${this.$t('staticAnalysis.monitor.requestException')}: ${error.message || this.$t('common.error')}`
        };
        this.stopStatusCheck();
        this.$emit('task-completed', this.taskStatus);
        this.$emit('status-updated', this.taskStatus);
        this.isAnalyzing = false;
        this.disconnect();
      }
    },
    
    // 将状态码转换为状态字符串
    getStatusFromCode(code) {
      switch (code) {
        case 0: return 'processing'; // 启动中
        case 1: return 'processing'; // 处理中
        case 2: return 'completed';  // 已完成
        case -1: return 'failed';    // 失败
        default: return 'not_found'; // 未找到
      }
    },
    
    getStatusText(status) {
      return this.$t(`staticAnalysis.monitor.status.${status}`) || status;
    },
    
    getMessageClass(message) {
      // 尝试从JSON中提取消息内容
      let content = message;
      try {
        if (message.startsWith('{') && message.endsWith('}')) {
          const data = JSON.parse(message);
          if (data.message) {
            content = data.message;
          }
        } else if (message.includes('"message"')) {
          const match = message.match(/"message":"([^"]+)"/);
          if (match && match[1]) {
            content = match[1];
          }
        }
      } catch (e) {
        // 解析失败，使用原始消息
        content = message;
      }
      
      // 根据消息内容设置样式
      if (content.includes('失败') || content.includes('错误') || 
          content.includes('failed') || content.includes('Failed') || 
          content.includes('error') || content.includes('Error')) {
        return 'bg-danger text-white';
      } else if (content.includes('完成') || content.includes('completed') || 
                content.includes('Completed') || content.includes('success') || 
                content.includes('Success') || content.includes('Saved')) {
        return 'bg-success text-white';
      } else if (content.includes('开始') || content.includes('Starting') || 
                content.includes('start') || content.includes('Start')) {
        return 'bg-primary text-white';
      } else {
        return 'bg-white border';
      }
    },
    
    scrollToBottom() {
      this.$nextTick(() => {
        const container = document.querySelector('.message-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    },
    
    formatMessage(message) {
      try {
        // 尝试解析JSON格式的消息
        if (message.startsWith('{') && message.endsWith('}')) {
          const data = JSON.parse(message);
          if (data.message) {
            return data.message;
          }
        }
        
        // 处理特定格式的消息
        if (message.includes('"type"') && message.includes('"message"')) {
          // 尝试提取message字段
          const match = message.match(/"message":"([^"]+)"/);
          if (match && match[1]) {
            return match[1];
          }
        }
        
        // 如果无法解析，则返回原始消息
        return message;
      } catch (e) {
        console.error('格式化消息失败:', e);
        return message;
      }
    }
  }
}
</script>

<style scoped>
.static-analysis-with-monitor {
  max-width: 1200px;
  margin: 0 auto;
}

/* 渐变背景 */
.bg-gradient-primary {
  background: linear-gradient(135deg, #4785ff 0%, #2684ff 100%);
}

.bg-light-info {
  background-color: rgba(13, 202, 240, 0.1);
}

/* 卡片阴影 */
.card.shadow-sm {
  box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.08);
  border: none;
  border-radius: 10px;
  overflow: hidden;
}

/* 输入组样式 */
.form-control-lg {
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border-radius: 0.5rem;
}

.input-group-text {
  border: none;
  background-color: #f8f9fa;
}

/* 按钮样式 */
.btn-primary {
  background: linear-gradient(135deg, #4785ff 0%, #2684ff 100%);
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #3674e8 0%, #1a73e8 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(70, 133, 255, 0.3);
}

.btn-outline-primary {
  border-color: #4785ff;
  color: #4785ff;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
}

.btn-outline-primary:hover {
  background-color: #4785ff;
  border-color: #4785ff;
  transform: translateY(-1px);
}

/* 选项面板 */
.options-panel {
  background: #f8f9fa;
  border-radius: 0.5rem;
  padding: 1rem;
  border: 1px solid #e9ecef;
}

.form-select-sm {
  border-radius: 0.375rem;
  border: 1px solid #ced4da;
}

.form-control-sm {
  border-radius: 0.375rem;
  border: 1px solid #ced4da;
}

/* 徽章样式 */
.badge {
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-weight: 500;
}

.badge.fs-6 {
  font-size: 0.875rem !important;
}

/* 进度条 */
.progress {
  border-radius: 0.5rem;
  background-color: #e9ecef;
}

.progress-bar {
  border-radius: 0.5rem;
  transition: width 0.6s ease;
}

/* 日志区域 */
.logs-container {
  max-height: 300px;
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 0.5rem;
  padding: 1rem;
  border: 1px solid #e9ecef;
}

.log-message {
  margin-bottom: 0.5rem;
}

.message-content {
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
  background: white;
  border: 1px solid #e9ecef;
  word-wrap: break-word;
}

.message-content.error {
  background-color: #f8d7da;
  border-color: #f5c6cb;
  color: #721c24;
}

.message-content.success {
  background-color: #d4edda;
  border-color: #c3e6cb;
  color: #155724;
}

.message-content.warning {
  background-color: #fff3cd;
  border-color: #ffeaa7;
  color: #856404;
}

.message-content.info {
  background-color: #d1ecf1;
  border-color: #bee5eb;
  color: #0c5460;
}

/* 滚动条样式 */
.logs-container::-webkit-scrollbar {
  width: 6px;
}

.logs-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.logs-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.logs-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 警告框样式 */
.alert {
  border-radius: 0.5rem;
  border: none;
  padding: 1rem;
}

.alert-success {
  background-color: rgba(25, 135, 84, 0.1);
  color: #198754;
}

.alert-danger {
  background-color: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.alert-info {
  background-color: rgba(13, 202, 240, 0.1);
  color: #0dcaf0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .static-analysis-with-monitor {
    padding: 0 1rem;
  }
  
  .card-body {
    padding: 1rem;
  }
  
  .btn-primary {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
  
  .form-control-lg {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }
}

/* 动画效果 */
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

.card {
  animation: fadeIn 0.3s ease-out;
}

.log-message {
  animation: fadeIn 0.2s ease-out;
}
</style> 