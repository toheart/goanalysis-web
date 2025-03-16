<template>
  <div class="trace-viewer">
    <h1 class="page-title text-center mb-4">{{ $t('runtimeAnalysis.title') }}</h1>

    <!-- 消息提示组件 -->
    <div class="message-container" v-if="message.show">
      <div :class="['message-box', `message-${message.type}`]">
        <i :class="['bi', messageIcon]"></i>
        <span>{{ message.content }}</span>
      </div>
    </div>

    <!-- 文件路径输入界面 -->
    <div v-if="!isPathVerified" class="container">
      <!-- 初始验证加载状态 -->
      <div v-if="isInitialVerifying" class="row justify-content-center mb-4">
        <div class="col-md-8">
          <div class="card shadow">
            <div class="card-body p-4 text-center">
              <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">加载中...</span>
              </div>
              <h4>{{ $t('runtimeAnalysis.projectPath.starting') }}</h4>
              <p class="text-muted">{{ $t('runtimeAnalysis.projectPath.tip') }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="row justify-content-center">
        <div class="col-md-8">
          <div class="card shadow">
            <div class="card-header">
              <h3 class="mb-0 text-center">{{ $t('runtimeAnalysis.projectPath.title') }}</h3>
            </div>
            <div class="card-body p-4">
              <!-- 选择方式切换 -->
              <ul class="nav nav-tabs mb-4">
                <li class="nav-item">
                  <a class="nav-link" :class="{ active: inputMode === 'path' }" href="#" @click.prevent="inputMode = 'path'">
                    <i class="bi bi-folder me-1"></i> 输入项目路径
                  </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" :class="{ active: inputMode === 'file' }" href="#" @click.prevent="inputMode = 'file'">
                    <i class="bi bi-file-earmark me-1"></i> 选择分析文件
                  </a>
                </li>
              </ul>

              <!-- 项目路径输入 -->
              <div v-if="inputMode === 'path'">
                <div class="mb-4">
                  <label for="projectPath" class="form-label">{{ $t('runtimeAnalysis.projectPath.label') }}</label>
                  <div class="input-group">
                    <span class="input-group-text"><i class="bi bi-folder2-open"></i></span>
                    <input
                      id="projectPath"
                      v-model="projectPath"
                      type="text"
                      class="form-control"
                      :placeholder="$t('runtimeAnalysis.projectPath.placeholder')"
                      :class="{'is-invalid': pathError}"
                    />
                    <div class="invalid-feedback" v-if="pathError">
                      {{ pathError }}
                    </div>
                  </div>
                  <small class="text-muted">{{ $t('runtimeAnalysis.projectPath.description') }}</small>
                </div>
                <div class="text-center">
                  <button 
                    class="btn btn-primary btn-lg"
                    @click="verifyPath"
                    :disabled="isVerifying"
                  >
                    <i class="bi" :class="isVerifying ? 'bi-hourglass-split' : 'bi-search'"></i>
                    {{ isVerifying ? $t('runtimeAnalysis.projectPath.verifying') : $t('runtimeAnalysis.projectPath.startAnalysis') }}
                  </button>
                </div>
              </div>

              <!-- 文件列表 -->
              <div v-else>
                <div v-if="loadingFiles" class="text-center py-5">
                  <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                  </div>
                  <p class="mt-3">正在加载文件列表...</p>
                </div>
                <div v-else-if="files.length === 0" class="text-center py-5">
                  <i class="bi bi-folder2-open text-muted display-4"></i>
                  <p class="mt-3">没有找到运行时分析文件</p>
                </div>
                <div v-else>
                  <div class="table-responsive">
                    <table class="table table-hover">
                      <thead class="table-light">
                        <tr>
                          <th>文件名</th>
                          <th class="text-center">大小</th>
                          <th class="text-center">创建时间</th>
                          <th class="text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="file in files" :key="file.id">
                          <td>{{ file.name }}</td>
                          <td class="text-center">{{ formatFileSize(file.size) }}</td>
                          <td class="text-center">{{ formatDate(file.createTime) }}</td>
                          <td class="text-center">
                            <button class="btn btn-sm btn-primary me-2" @click="selectFile(file)">
                              <i class="bi bi-check-circle me-1"></i>选择
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <!-- 文件列表分页 -->
                  <div class="d-flex justify-content-between align-items-center mt-3">
                    <div>
                      显示 {{ (filesPage - 1) * filesLimit + 1 }} - {{ Math.min(filesPage * filesLimit, filesTotal) }} 条，共 {{ filesTotal }} 条
                    </div>
                    <nav aria-label="文件列表分页">
                      <ul class="pagination mb-0">
                        <li class="page-item" :class="{ disabled: filesPage === 1 }">
                          <a class="page-link" href="#" @click.prevent="changePage(1)">首页</a>
                        </li>
                        <li class="page-item" :class="{ disabled: filesPage === 1 }">
                          <a class="page-link" href="#" @click.prevent="changePage(filesPage - 1)">上一页</a>
                        </li>
                        <li v-for="page in displayedFilesPages" :key="page" class="page-item" :class="{ active: page === filesPage }">
                          <a class="page-link" href="#" @click.prevent="changePage(page)">{{ page }}</a>
                        </li>
                        <li class="page-item" :class="{ disabled: filesPage === filesTotalPages }">
                          <a class="page-link" href="#" @click.prevent="changePage(filesPage + 1)">下一页</a>
                        </li>
                        <li class="page-item" :class="{ disabled: filesPage === filesTotalPages }">
                          <a class="page-link" href="#" @click.prevent="changePage(filesTotalPages)">末页</a>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
                <div class="text-center mt-4">
                  <button class="btn btn-primary" @click="showUploadModal = true">
                    <i class="bi bi-upload me-2"></i>上传文件
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分析界面 -->
    <div v-else class="container">
      <!-- 项目信息 -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-8">
              <h5 class="mb-0"><i class="bi bi-folder me-2"></i>{{ $t('runtimeAnalysis.projectPath.currentProjectPath') }}</h5>
              <p class="mb-0 text-muted">{{ projectPath  }}</p>
            </div>
            <div class="col-md-4 text-end">
              <button class="btn btn-outline-secondary" @click="changePath">
                <i class="bi bi-arrow-repeat"></i> {{ $t('runtimeAnalysis.projectPath.changeProjectPath') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 标签页导航 -->
      <ul class="nav nav-tabs mb-4">
        <li class="nav-item">
          <router-link to="/runtime-analysis" class="nav-link" active-class="active">
            <i class="bi bi-activity me-1"></i> {{ $t('runtimeAnalysis.tabs.runtimeAnalysis') }}
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/function-analysis" class="nav-link" active-class="active">
            <i class="bi bi-search me-1"></i> {{ $t('runtimeAnalysis.tabs.functionAnalysis') }}
          </router-link>
        </li>
      </ul>

      <!-- 子路由视图 -->
      <router-view :project-path="projectPath" :db-path="dbPath" :current-file-name="currentFileName"></router-view>
    </div>

    <!-- 文件上传模态框 -->
    <div class="modal fade" :class="{ show: showUploadModal }" tabindex="-1" :style="{ display: showUploadModal ? 'block' : 'none' }">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">上传运行时分析文件</h5>
            <button type="button" class="btn-close" @click="showUploadModal = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="uploadStatus.uploading" class="text-center py-3">
              <div class="progress mb-3">
                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                     :style="{ width: uploadStatus.progress + '%' }">
                  {{ uploadStatus.progress }}%
                </div>
              </div>
              <p>正在上传文件，请勿关闭窗口...</p>
              <p class="text-muted">{{ uploadStatus.currentChunk }}/{{ uploadStatus.totalChunks }} 块</p>
            </div>
            <form v-else @submit.prevent="uploadFile">
              <div class="mb-3">
                <label for="file" class="form-label">选择文件</label>
                <input type="file" class="form-control" id="file" @change="handleFileChange" required>
                <div class="form-text">支持的文件类型：所有文件</div>
              </div>
              <div class="mb-3">
                <label for="description" class="form-label">文件描述</label>
                <textarea class="form-control" id="description" v-model="uploadForm.description" rows="3"></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label">分块大小</label>
                <div class="input-group">
                  <input type="number" class="form-control" v-model="chunkSize" min="1" max="10">
                  <span class="input-group-text">MB</span>
                </div>
                <div class="form-text">建议值：2-5MB，根据网络状况调整</div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showUploadModal = false" :disabled="uploadStatus.uploading">取消</button>
            <button type="button" class="btn btn-primary" @click="uploadFile" :disabled="!uploadForm.file || uploadStatus.uploading">
              <i class="bi bi-upload me-2"></i>上传
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showUploadModal" class="modal-backdrop fade show"></div>
  </div>
</template>

<script>
import axios from '../../axios';
import { useI18n } from 'vue-i18n';

export default {
  data() {
    return {
      projectPath: '',
      isPathVerified: false,
      isVerifying: false,
      pathError: '',
      isInitialVerifying: false,
      inputMode: 'path', // 'path' 或 'file'
      dbPath: '', // 数据库路径
      
      // 文件列表相关
      files: [],
      filesPage: 1,
      filesLimit: 10,
      filesTotal: 0,
      filesTotalPages: 1,
      loadingFiles: false,
      currentFileName: '',
      
      // 文件上传相关
      showUploadModal: false,
      uploadForm: {
        file: null,
        description: '',
        contentType: ''
      },
      chunkSize: 2, // 默认分块大小，单位MB
      uploadStatus: {
        uploading: false,
        progress: 0,
        currentChunk: 0,
        totalChunks: 0,
        fileId: ''
      },
      
      // 消息提示
      message: {
        show: false,
        content: '',
        type: 'info', // info, success, error, warning
        timer: null
      }
    };
  },
  setup() {
    const { t, locale } = useI18n({ useScope: 'global' });
    return { t, locale };
  },
  mounted() {
    // 检查本地存储中是否有已验证的路径
    const savedPath = localStorage.getItem('verifiedProjectPath');
    if (savedPath) {
      this.projectPath = savedPath;
      // 在设置路径为已验证之前，先调用API验证路径是否有效
      this.isInitialVerifying = true;
      this.verifyPathSilently(savedPath);
    } else {
      // 如果没有已验证的路径，则加载文件列表
      this.fetchFiles();
    }
    
    // 添加语言变化监听
    window.addEventListener('languageChanged', this.handleLanguageChange);
  },
  beforeUnmount() {
    // 移除语言变化监听
    window.removeEventListener('languageChanged', this.handleLanguageChange);
    
    // 清除消息定时器
    if (this.message.timer) {
      clearTimeout(this.message.timer);
    }
  },
  computed: {
    // 消息图标
    messageIcon() {
      const icons = {
        info: 'bi-info-circle',
        success: 'bi-check-circle',
        error: 'bi-exclamation-circle',
        warning: 'bi-exclamation-triangle'
      };
      return icons[this.message.type] || icons.info;
    },
    
    // 文件分页显示
    displayedFilesPages() {
      const pages = [];
      const maxVisiblePages = 5;
      let startPage = Math.max(1, this.filesPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(this.filesTotalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      return pages;
    }
  },
  methods: {
    async verifyPathSilently(path) {
      try {
        // 静默验证路径
        const response = await axios.post('/api/runtime/verify/path', {
          path: path
        });

        console.log('验证路径响应:', response.data);

        if (response.data && response.data.verified) {
          this.isPathVerified = true;
          this.dbPath = path;
          this.inputMode = 'path';
        } else {
          // 如果验证失败，清除本地存储并要求用户重新输入
          localStorage.removeItem('verifiedProjectPath');
          this.isPathVerified = false;
          this.pathError = '保存的项目路径已失效，请重新输入';
        }
      } catch (error) {
        console.error('验证路径失败:', error);
        // 验证出错时，清除本地存储并要求用户重新输入
        localStorage.removeItem('verifiedProjectPath');
        this.isPathVerified = false;
        this.pathError = '验证保存的路径时出错，请重新输入';
      } finally {
        this.isInitialVerifying = false;
      }
    },

    async verifyPath() {
      if (!this.projectPath.trim()) {
        this.pathError = '请输入项目路径';
        return;
      }

      this.isVerifying = true;
      this.pathError = '';

      try {
        // 发送验证请求
        const response = await axios.post('/api/runtime/verify/path', {
          path: this.projectPath
        });

        console.log('验证路径响应:', response.data);

        if (response.data && response.data.verified) {
          this.isPathVerified = true;
          this.dbPath = this.projectPath;
          // 保存验证通过的路径
          localStorage.setItem('verifiedProjectPath', this.projectPath);
          // 导航到运行时分析页面
          this.$router.push('/runtime-analysis');
        } else {
          this.pathError = response.data.message || '项目路径验证失败';
        }
      } catch (error) {
        this.pathError = '验证过程出错: ' + (error.response?.data?.message || error.message);
      } finally {
        this.isVerifying = false;
      }
    },

    changePath() {
      this.isPathVerified = false;
      this.dbPath = '';
      localStorage.removeItem('verifiedProjectPath');
      // 重置输入模式为路径输入
      this.inputMode = 'path';
    },
    
    // 获取文件列表
    async fetchFiles() {
      this.loadingFiles = true;
      try {
        const response = await axios.get('/api/files', {
          params: {
            fileType: 1, // 运行时文件类型
            limit: this.filesLimit,
            offset: (this.filesPage - 1) * this.filesLimit
          }
        });
        
        // 将API返回的字段映射到组件使用的字段
        const files = response.data.files || [];
        this.files = files.map(file => ({
          id: file.id,
          name: file.fileName,
          path: file.filePath || '',
          size: parseInt(file.fileSize, 10),
          type: file.fileType,
          contentType: file.contentType,
          createTime: new Date(file.uploadTime).getTime() / 1000,
          description: file.description
        }));
        this.filesTotal = parseInt(response.data.total || '0', 10);
        this.filesTotalPages = Math.ceil(this.filesTotal / this.filesLimit) || 1;
      } catch (error) {
        console.error('获取文件列表失败:', error);
        this.showMessage('获取文件列表失败', 'error');
        this.files = [];
        this.filesTotal = 0;
        this.filesTotalPages = 1;
      } finally {
        this.loadingFiles = false;
      }
    },
    
    // 切换文件列表页码
    changePage(page) {
      if (page < 1 || page > this.filesTotalPages) return;
      this.filesPage = page;
      this.fetchFiles();
    },
    
    // 选择文件
    selectFile(file) {
      this.projectPath = file.path;
      this.dbPath = file.path;
      this.isPathVerified = true;
      this.inputMode = 'file';
      // 设置当前缓存
      localStorage.setItem('verifiedProjectPath', file.path);
      // 导航到运行时分析页面
      this.$router.push('/runtime-analysis');
    },
    
    // 处理文件选择
    handleFileChange(event) {
      const file = event.target.files[0];
      if (file) {
        this.uploadForm.file = file;
        this.uploadForm.contentType = file.type || 'application/octet-stream';
      }
    },
    
    // 上传文件
    async uploadFile() {
      if (!this.uploadForm.file) {
        this.showMessage('请选择文件', 'error');
        return;
      }
      
      const file = this.uploadForm.file;
      const chunkSizeBytes = this.chunkSize * 1024 * 1024; // 转换为字节
      const totalChunks = Math.ceil(file.size / chunkSizeBytes);
      const fileId = Date.now().toString(); // 生成唯一文件ID
      
      this.uploadStatus = {
        uploading: true,
        progress: 0,
        currentChunk: 0,
        totalChunks: totalChunks,
        fileId: fileId
      };
      
      try {
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * chunkSizeBytes;
          const end = Math.min(start + chunkSizeBytes, file.size);
          const chunk = file.slice(start, end);
          
          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('file_id', fileId);
          formData.append('chunk_index', chunkIndex.toString());
          formData.append('total_chunks', totalChunks.toString());
          formData.append('file_name', file.name);
          formData.append('description', this.uploadForm.description);
          formData.append('content_type', this.uploadForm.contentType);
          
          await axios.post('/runtime/file/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
              // 计算当前块的上传进度
              const chunkProgress = progressEvent.loaded / progressEvent.total;
              // 计算总体进度
              const totalProgress = ((chunkIndex + chunkProgress) / totalChunks) * 100;
              this.uploadStatus.progress = Math.round(totalProgress);
            }
          });
          
          this.uploadStatus.currentChunk = chunkIndex + 1;
          this.uploadStatus.progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        }
        
        this.showMessage('文件上传成功', 'success');
        this.showUploadModal = false;
        this.fetchFiles(); // 刷新文件列表
        
        // 重置表单
        this.uploadForm = {
          file: null,
          description: '',
          contentType: ''
        };
        document.getElementById('file').value = '';
      } catch (error) {
        this.showMessage('文件上传失败: ' + (error.response?.data || error.message || '未知错误'), 'error');
      } finally {
        this.uploadStatus.uploading = false;
      }
    },
    
    // 格式化文件大小
    formatFileSize(size) {
      // 确保size是数字
      size = typeof size === 'string' ? parseInt(size, 10) : size;
      
      if (isNaN(size) || size === null) {
        return '未知';
      }
      
      if (size < 1024) {
        return size + ' B';
      } else if (size < 1024 * 1024) {
        return (size / 1024).toFixed(2) + ' KB';
      } else if (size < 1024 * 1024 * 1024) {
        return (size / (1024 * 1024)).toFixed(2) + ' MB';
      } else {
        return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
      }
    },
    
    // 格式化日期
    formatDate(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp * 1000);
      return date.toLocaleString();
    },
    
    // 显示消息
    showMessage(content, type = 'info', duration = 3000) {
      // 清除之前的定时器
      if (this.message.timer) {
        clearTimeout(this.message.timer);
      }
      
      // 设置消息内容
      this.message = {
        show: true,
        content,
        type,
        timer: null
      };
      
      // 设置定时器，自动关闭消息
      this.message.timer = setTimeout(() => {
        this.message.show = false;
      }, duration);
    },
    
    // 处理语言变化
    handleLanguageChange(event) {
      console.log('TraceViewer - Language changed:', event.detail.locale);
      // 强制刷新组件中的国际化文本
      this.$forceUpdate();
    }
  }
};
</script>

<style scoped>
.nav-tabs .nav-link {
  font-weight: 500;
  color: #6c757d;
  padding: 0.75rem 1.25rem;
  border-radius: 0;
  transition: all 0.2s ease;
}

.nav-tabs .nav-link.active {
  color: #0d6efd;
  border-bottom: 2px solid #0d6efd;
  background-color: transparent;
}

.nav-tabs .nav-link:hover:not(.active) {
  background-color: rgba(13, 110, 253, 0.05);
  border-color: transparent;
}

/* 消息提示样式 */
.message-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  width: 100%;
  max-width: 500px;
  pointer-events: none;
}

.message-box {
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 10px;
  animation: slide-down 0.3s ease;
  pointer-events: auto;
}

.message-info {
  background-color: #e8f4fd;
  border-left: 4px solid #0d6efd;
  color: #0d6efd;
}

.message-success {
  background-color: #e8f8f0;
  border-left: 4px solid #198754;
  color: #198754;
}

.message-error {
  background-color: #fdf0ef;
  border-left: 4px solid #dc3545;
  color: #dc3545;
}

.message-warning {
  background-color: #fff8e6;
  border-left: 4px solid #ffc107;
  color: #ffc107;
}

@keyframes slide-down {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>