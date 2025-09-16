<template>
  <div class="runtime-file-selector">
    <!-- 第一个卡片：指定SQLite数据库文件路径 + 最近访问 -->
    <div class="card shadow mb-4">
      <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h4 class="mb-0">
          <i class="bi bi-database me-2"></i>指定SQLite数据库文件路径
        </h4>
        <button 
          class="btn btn-outline-light btn-sm" 
          @click="showHelp = !showHelp"
          title="查看帮助文档"
        >
          <i class="bi bi-question-circle me-1"></i>帮助
        </button>
      </div>
      
      <!-- 帮助文档 -->
      <div v-if="showHelp" class="alert alert-info mb-0 border-0 rounded-0">
        <div class="d-flex">
          <div class="flex-shrink-0">
            <i class="bi bi-info-circle-fill text-info fs-4"></i>
          </div>
          <div class="flex-grow-1 ms-3">
            <h6 class="alert-heading">关于运行时分析</h6>
            <p class="mb-2">
              <strong>什么是运行时分析？</strong><br>
              运行时分析是对Go程序执行过程中的函数调用链、Goroutine状态等信息进行分析的功能。
            </p>
            <p class="mb-2">
              <strong>如何获取SQLite数据库文件？</strong><br>
              1. 使用 <code>functrace</code> 工具对Go程序进行跟踪<br>
              2. <code>functrace</code> 会生成一个SQLite数据库文件（通常以.db结尾）<br>
              3. 将该数据库文件的完整路径输入到下方输入框中
            </p>
            <p class="mb-2">
              <strong>文件路径示例：</strong><br>
              <code>/root/workspace/github/kubernetes/cmd/kubelet/kubelet_20250802093226.db</code>
            </p>
            <p class="mb-0">
              <strong>注意：</strong>请确保SQLite数据库文件存在且可访问，系统会验证文件的有效性。
            </p>
          </div>
        </div>
      </div>
      
      <div class="card-body">
        <!-- SQLite数据库文件路径输入区域 -->
        <div class="mb-4">
          <label for="projectPath" class="form-label">
            <i class="bi bi-database me-1"></i>SQLite数据库文件路径
          </label>
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-database"></i></span>
            <input
              id="projectPath"
              v-model="projectPath"
              type="text"
              class="form-control"
              placeholder="例如：/path/to/kubelet_20250802093226.db"
              :class="{'is-invalid': pathError}"
            />
            <div class="invalid-feedback" v-if="pathError">
              {{ pathError }}
            </div>
          </div>
          <small class="text-muted">
            <i class="bi bi-lightbulb me-1"></i>
            请输入由 <strong>functrace</strong> 工具生成的SQLite数据库文件的完整路径，系统将对该文件进行运行时分析。
          </small>
        </div>
        
        <div class="text-center mb-4">
          <button 
            class="btn btn-primary btn-lg"
            @click="verifyPath"
            :disabled="isVerifying"
          >
            <i class="bi" :class="isVerifying ? 'bi-hourglass-split' : 'bi-search'"></i>
            {{ isVerifying ? '验证中...' : '开始分析' }}
          </button>
        </div>

        <!-- 最近访问区域 -->
        <div v-if="recentPaths.length > 0">
          <hr class="my-4">
          <h6 class="text-muted mb-3">
            <i class="bi bi-clock-history me-2"></i>最近分析的数据库文件
          </h6>
          <div class="recent-files-grid">
            <div 
              v-for="(item, index) in recentPaths.slice(0, 3)" 
              :key="index"
              class="recent-file-item"
              @click="selectRecentItem(item)"
            >
              <div class="recent-file-content">
                <div class="recent-file-header">
                  <i class="bi text-primary me-2" :class="item.type === 'path' ? 'bi-database-fill' : 'bi-database'"></i>
                  <span class="recent-file-name">{{ item.name }}</span>
                  <button 
                    class="btn btn-sm btn-outline-danger recent-file-remove" 
                    @click.stop="removeRecentItem(index)"
                    title="移除"
                  >
                    <i class="bi bi-x"></i>
                  </button>
                </div>
                <div class="recent-file-path" :title="item.path">{{ item.path }}</div>
                <div class="recent-file-time">{{ formatDate(item.lastAccess) }}</div>
              </div>
            </div>
          </div>
          
          <div class="text-center" v-if="recentPaths.length > 3">
            <button 
              class="btn btn-outline-secondary btn-sm me-2" 
              @click="showAllRecent = !showAllRecent"
            >
              <i class="bi" :class="showAllRecent ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
              {{ showAllRecent ? '收起' : `查看全部 ${recentPaths.length} 条记录` }}
            </button>
          </div>
          
          <!-- 展开显示所有记录 -->
          <div v-if="showAllRecent && recentPaths.length > 3" class="mt-3">
            <div class="list-group">
              <div 
                v-for="(item, index) in recentPaths.slice(3)" 
                :key="index + 3"
                class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              >
                <div class="flex-grow-1" @click="selectRecentItem(item)">
                  <div class="d-flex align-items-center">
                    <i class="bi me-2" :class="item.type === 'path' ? 'bi-folder' : 'bi-file-earmark-binary'"></i>
                    <div>
                      <h6 class="mb-1">{{ item.name }}</h6>
                      <p class="mb-1 text-muted small">{{ item.path }}</p>
                      <small class="text-muted">{{ formatDate(item.lastAccess) }}</small>
                    </div>
                  </div>
                </div>
                <button 
                  class="btn btn-sm btn-outline-danger" 
                  @click="removeRecentItem(index + 3)"
                  title="从历史记录中移除"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
          
          <div class="text-center mt-3">
            <button class="btn btn-outline-secondary btn-sm" @click="clearRecentPaths">
              <i class="bi bi-trash me-1"></i>清空历史记录
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 第二个卡片：选择已上传的数据库文件 -->
    <div class="card shadow">
      <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
        <h4 class="mb-0">
          <i class="bi bi-cloud-arrow-up me-2"></i>选择已上传的数据库文件
        </h4>
        <small class="text-light opacity-75">
          <i class="bi bi-info-circle me-1"></i>从服务器上已上传的SQLite文件中选择
        </small>
      </div>
      <div class="card-body">
        <div v-if="loadingFiles" class="text-center py-5">
          <div class="spinner-border text-success" role="status">
            <span class="visually-hidden">加载中...</span>
          </div>
          <p class="mt-3">正在加载数据库文件列表...</p>
        </div>
        <div v-else-if="files.length === 0" class="text-center py-5">
          <i class="bi bi-database text-muted display-4"></i>
          <p class="mt-3">没有找到已上传的SQLite数据库文件</p>
          <p class="text-muted small">您可以上传由functrace生成的SQLite数据库文件</p>
          <button class="btn btn-success mt-2" @click="openUploadModal">
            <i class="bi bi-upload me-2"></i>上传SQLite文件
          </button>
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
                  <td>
                    <i class="bi bi-file-earmark-binary me-2 text-success"></i>
                    {{ file.name }}
                  </td>
                  <td class="text-center">{{ formatFileSize(file.size) }}</td>
                  <td class="text-center">{{ formatDate(file.createTime) }}</td>
                  <td class="text-center">
                    <button 
                      class="btn btn-sm btn-success me-2" 
                      @click="selectFile(file)"
                      :disabled="selectingFile === file.id"
                    >
                      <template v-if="selectingFile === file.id">
                        <i class="bi bi-hourglass-split me-1"></i>验证中...
                      </template>
                      <template v-else>
                        <i class="bi bi-check-circle me-1"></i>选择
                      </template>
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
              <span v-if="filesTotalPages > 1" class="ms-2">（共 {{ filesTotalPages }} 页）</span>
            </div>
            <nav aria-label="文件列表分页">
              <ul class="pagination mb-0">
                <li class="page-item" :class="{ disabled: filesPage === 1 }">
                  <a class="page-link" href="#" @click.prevent="changePage(1)" title="首页">
                    <i class="bi bi-chevron-double-left"></i>
                  </a>
                </li>
                <li class="page-item" :class="{ disabled: filesPage === 1 }">
                  <a class="page-link" href="#" @click.prevent="changePage(filesPage - 1)">上一页</a>
                </li>
                
                <!-- 显示省略号和页码 -->
                <li v-if="displayedFilesPages[0] > 1" class="page-item disabled">
                  <span class="page-link">...</span>
                </li>
                <li v-for="page in displayedFilesPages" :key="page" class="page-item" :class="{ active: page === filesPage }">
                  <a class="page-link" href="#" @click.prevent="changePage(page)">{{ page }}</a>
                </li>
                <li v-if="displayedFilesPages[displayedFilesPages.length - 1] < filesTotalPages" class="page-item disabled">
                  <span class="page-link">...</span>
                </li>
                
                <li class="page-item" :class="{ disabled: filesPage === filesTotalPages }">
                  <a class="page-link" href="#" @click.prevent="changePage(filesPage + 1)">下一页</a>
                </li>
                <li class="page-item" :class="{ disabled: filesPage === filesTotalPages }">
                  <a class="page-link" href="#" @click.prevent="changePage(filesTotalPages)" title="末页">
                    <i class="bi bi-chevron-double-right"></i>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          
          <div class="text-center mt-4">
            <button class="btn btn-success" @click="openUploadModal">
              <i class="bi bi-upload me-2"></i>上传SQLite文件
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件上传模态框 -->
    <div class="modal fade" :class="{ show: showUploadModal }" tabindex="-1" :style="{ display: showUploadModal ? 'block' : 'none' }">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-upload me-2"></i>上传SQLite数据库文件
            </h5>
            <button type="button" class="btn-close" @click="closeUploadModal"></button>
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
              <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                <strong>上传说明：</strong>请上传由 <code>functrace</code> 工具生成的SQLite数据库文件（通常以.db结尾）
              </div>
              <div class="mb-3">
                <label for="file" class="form-label">
                  <i class="bi bi-database me-1"></i>选择SQLite数据库文件
                </label>
                <input 
                  type="file" 
                  class="form-control" 
                  id="file" 
                  @change="handleFileChange" 
                  accept=".db,.sqlite,.sqlite3"
                  required
                >
                <div class="form-text">
                  <i class="bi bi-check-circle text-success me-1"></i>
                  支持的文件类型：.db, .sqlite, .sqlite3 等SQLite数据库文件
                </div>
              </div>
              <div class="mb-3">
                <label for="description" class="form-label">文件描述（可选）</label>
                <textarea 
                  class="form-control" 
                  id="description" 
                  v-model="uploadForm.description" 
                  rows="3"
                  placeholder="请简要描述该数据库文件的来源，例如：kubernetes kubelet 运行时跟踪数据"
                ></textarea>
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
            <button type="button" class="btn btn-secondary" @click="closeUploadModal" :disabled="uploadStatus.uploading">取消</button>
            <button type="button" class="btn btn-primary" @click="uploadFile" :disabled="!uploadForm.file || uploadStatus.uploading">
              <i class="bi bi-upload me-2"></i>上传SQLite文件
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showUploadModal" class="modal-backdrop fade show"></div>
  </div>
</template>

<script>
import axios from '../../../axios';

export default {
  name: 'RuntimeFileSelector',
  emits: ['path-selected'],
  data() {
    return {
      projectPath: '',
      isVerifying: false,
      pathError: '',
      showHelp: false, // 是否显示帮助文档
      
      // 文件列表相关
      files: [],
      filesPage: 1,
      filesLimit: 10,
      filesTotal: 0,
      filesTotalPages: 1,
      loadingFiles: false,
      selectingFile: null, // 当前正在选择的文件ID
      
      // 最近访问路径
      recentPaths: [],
      showAllRecent: false, // 是否显示所有最近访问记录
      
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
      }
    };
  },
  mounted() {
    this.loadRecentPaths();
    this.fetchFiles();
  },
  computed: {
    // 文件分页显示
    displayedFilesPages() {
      const pages = [];
      const maxVisiblePages = 5;
      
      // 如果总页数小于等于最大显示页数，显示所有页
      if (this.filesTotalPages <= maxVisiblePages) {
        for (let i = 1; i <= this.filesTotalPages; i++) {
          pages.push(i);
        }
        return pages;
      }
      
      // 计算起始和结束页码
      let startPage = Math.max(1, this.filesPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(this.filesTotalPages, startPage + maxVisiblePages - 1);
      
      // 调整起始页码，确保显示足够的页码
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      // 确保当前页在显示范围内
      if (this.filesPage < startPage) {
        startPage = Math.max(1, this.filesPage - Math.floor(maxVisiblePages / 2));
        endPage = Math.min(this.filesTotalPages, startPage + maxVisiblePages - 1);
      } else if (this.filesPage > endPage) {
        endPage = Math.min(this.filesTotalPages, this.filesPage + Math.floor(maxVisiblePages / 2));
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      return pages;
    }
  },
  methods: {
    // 验证项目路径
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
          // 添加到最近访问记录
          this.addToRecentPaths({
            type: 'path',
            name: this.getPathName(this.projectPath),
            path: this.projectPath,
            lastAccess: Date.now() / 1000
          });
          
          // 触发路径选择事件
          this.$emit('path-selected', {
            type: 'path',
            path: this.projectPath,
            dbPath: this.projectPath
          });
        } else {
          this.pathError = response.data.message || '项目路径验证失败';
        }
      } catch (error) {
        this.pathError = '验证过程出错: ' + (error.response?.data?.message || error.message);
      } finally {
        this.isVerifying = false;
      }
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
        this.filesTotalPages = Math.max(1, Math.ceil(this.filesTotal / this.filesLimit));
        
        // 确保当前页码不超过总页数
        if (this.filesPage > this.filesTotalPages && this.filesTotalPages > 0) {
          this.filesPage = this.filesTotalPages;
        }
      } catch (error) {
        console.error('获取文件列表失败:', error);
        this.files = [];
        this.filesTotal = 0;
        this.filesTotalPages = 1;
      } finally {
        this.loadingFiles = false;
      }
    },
    
    // 切换文件列表页码
    changePage(page) {
      // 确保页码在有效范围内且不是当前页
      if (page < 1 || page > this.filesTotalPages || page === this.filesPage) return;
      this.filesPage = page;
      this.fetchFiles();
    },
    
    // 选择文件
    async selectFile(file) {
      // 设置loading状态
      this.selectingFile = file.id;
      
      try {
        // 调用验证接口
        const response = await axios.post('/api/runtime/verify/path', {
          path: file.path
        });

        console.log('验证文件路径响应:', response.data);

        if (response.data && response.data.verified) {
          // 验证成功，添加到最近访问记录
          this.addToRecentPaths({
            type: 'file',
            name: file.name,
            path: file.path,
            lastAccess: Date.now() / 1000
          });
          
          // 触发路径选择事件
          this.$emit('path-selected', {
            type: 'file',
            path: file.path,
            dbPath: file.path,
            fileName: file.name
          });
        } else {
          // 验证失败，显示错误信息
          console.error('文件路径验证失败:', response.data.message);
          alert(`文件验证失败: ${response.data.message || '文件不存在或无法访问'}`);
        }
      } catch (error) {
        console.error('验证文件路径失败:', error);
        alert(`验证文件路径时出错: ${error.response?.data?.message || error.message}`);
      } finally {
        // 清除loading状态
        this.selectingFile = null;
      }
    },

    // 选择最近访问的项目
    async selectRecentItem(item) {
      try {
        // 调用验证接口
        const response = await axios.post('/api/runtime/verify/path', {
          path: item.path
        });

        console.log('验证最近访问路径响应:', response.data);

        if (response.data && response.data.verified) {
          // 验证成功，更新最后访问时间
          item.lastAccess = Date.now() / 1000;
          this.saveRecentPaths();
          
          // 触发路径选择事件
          this.$emit('path-selected', {
            type: item.type,
            path: item.path,
            dbPath: item.path,
            fileName: item.type === 'file' ? item.name : undefined
          });
        } else {
          // 验证失败，显示错误信息并询问是否从历史记录中移除
          const message = `路径验证失败: ${response.data.message || '文件不存在或无法访问'}`;
          const shouldRemove = confirm(`${message}\n\n是否从历史记录中移除此项？`);
          if (shouldRemove) {
            const index = this.recentPaths.findIndex(p => p.path === item.path);
            if (index !== -1) {
              this.removeRecentItem(index);
            }
          }
        }
      } catch (error) {
        console.error('验证最近访问路径失败:', error);
        const message = `验证路径时出错: ${error.response?.data?.message || error.message}`;
        const shouldRemove = confirm(`${message}\n\n是否从历史记录中移除此项？`);
        if (shouldRemove) {
          const index = this.recentPaths.findIndex(p => p.path === item.path);
          if (index !== -1) {
            this.removeRecentItem(index);
          }
        }
      }
    },

    // 加载最近访问路径
    loadRecentPaths() {
      try {
        const saved = localStorage.getItem('runtime_recent_paths');
        if (saved) {
          this.recentPaths = JSON.parse(saved);
          // 按最后访问时间排序
          this.recentPaths.sort((a, b) => b.lastAccess - a.lastAccess);
          // 只保留最近10个
          this.recentPaths = this.recentPaths.slice(0, 10);
        }
      } catch (error) {
        console.error('加载最近访问路径失败:', error);
        this.recentPaths = [];
      }
    },

    // 保存最近访问路径
    saveRecentPaths() {
      try {
        localStorage.setItem('runtime_recent_paths', JSON.stringify(this.recentPaths));
      } catch (error) {
        console.error('保存最近访问路径失败:', error);
      }
    },

    // 添加到最近访问记录
    addToRecentPaths(item) {
      // 检查是否已存在相同路径
      const existingIndex = this.recentPaths.findIndex(p => p.path === item.path);
      if (existingIndex !== -1) {
        // 如果已存在，更新最后访问时间并移到前面
        this.recentPaths[existingIndex].lastAccess = item.lastAccess;
        const existing = this.recentPaths.splice(existingIndex, 1)[0];
        this.recentPaths.unshift(existing);
      } else {
        // 如果不存在，添加到前面
        this.recentPaths.unshift(item);
      }
      
      // 只保留最近10个
      this.recentPaths = this.recentPaths.slice(0, 10);
      this.saveRecentPaths();
    },

    // 移除最近访问项目
    removeRecentItem(index) {
      this.recentPaths.splice(index, 1);
      this.saveRecentPaths();
    },

    // 清空最近访问记录
    clearRecentPaths() {
      this.recentPaths = [];
      this.saveRecentPaths();
    },

    // 获取路径名称（用于显示）
    getPathName(path) {
      const parts = path.split('/');
      return parts[parts.length - 1] || path;
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
        
        this.showUploadModal = false;
        this.fetchFiles(); // 刷新文件列表
        
        // 重置表单
        this.uploadForm = {
          file: null,
          description: '',
          contentType: ''
        };
        
        // 安全地重置文件输入框
        this.$nextTick(() => {
          const fileInput = document.getElementById('file');
          if (fileInput) {
            fileInput.value = '';
          }
        });
      } catch (error) {
        console.error('文件上传失败:', error);
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
    
    // 处理模态框关闭
    closeUploadModal() {
      // 如果正在上传，不允许关闭
      if (this.uploadStatus.uploading) {
        return;
      }
      
      // 重置表单数据
      this.uploadForm = {
        file: null,
        description: '',
        contentType: ''
      };
      
      // 关闭模态框
      this.showUploadModal = false;
    },
    
    // 打开上传模态框
    openUploadModal() {
      // 重置上传表单
      this.uploadForm = {
        file: null,
        description: '',
        contentType: ''
      };
      
      // 重置上传状态
      this.uploadStatus = {
        uploading: false,
        progress: 0,
        currentChunk: 0,
        totalChunks: 0,
        fileId: ''
      };
      
      // 打开模态框
      this.showUploadModal = true;
      
      // 确保DOM更新后清空文件输入框
      this.$nextTick(() => {
        const fileInput = document.getElementById('file');
        if (fileInput) {
          fileInput.value = '';
        }
      });
    }
  }
};
</script>

<style scoped>
.runtime-file-selector {
  max-width: 1000px;
  margin: 0 auto;
}

.card-header {
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.card-header h4 {
  font-weight: 600;
}

/* 最近文件网格布局 */
.recent-files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.recent-file-item {
  border: 1px solid #dee2e6;
  border-radius: 0.5rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fff;
  position: relative;
}

.recent-file-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #007bff;
}

.recent-file-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.recent-file-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  position: relative;
}

.recent-file-name {
  font-weight: 600;
  color: #495057;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-file-remove {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.recent-file-item:hover .recent-file-remove {
  opacity: 1;
}

.recent-file-path {
  color: #6c757d;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-file-time {
  color: #adb5bd;
  font-size: 0.75rem;
  margin-top: auto;
}

.list-group-item {
  border: 1px solid rgba(0,0,0,.125);
  border-radius: 0.375rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.list-group-item:hover {
  background-color: #f8f9fa;
}

.list-group-item .flex-grow-1 {
  cursor: pointer;
}

.table th {
  border-top: none;
  font-weight: 600;
  color: #495057;
}

.btn-group .btn {
  border-radius: 0.375rem;
}

.btn-group .btn:not(:last-child) {
  margin-right: 0.25rem;
}

.modal-backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}

.progress {
  height: 1.5rem;
}

.progress-bar {
  font-size: 0.875rem;
  line-height: 1.5rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .runtime-file-selector {
    max-width: 100%;
    padding: 0 15px;
  }
  
  .recent-files-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .recent-file-item {
    padding: 0.75rem;
  }
}

/* 卡片动画效果 */
.card {
  transition: box-shadow 0.15s ease-in-out;
}

.card:hover {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
}

/* 按钮样式优化 */
.btn-lg {
  padding: 0.75rem 2rem;
  font-size: 1.1rem;
  font-weight: 500;
}

/* 输入框样式 */
.form-control:focus {
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

/* 分割线样式 */
hr {
  border-top: 2px solid #e9ecef;
  opacity: 0.5;
}

/* 文本截断 */
.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
