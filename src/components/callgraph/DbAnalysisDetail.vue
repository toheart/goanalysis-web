<template>
  <div class="db-analysis-detail">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="mb-0">
        <i class="bi bi-database me-2"></i>数据库分析结果
      </h2>
      <button class="btn btn-outline-secondary" @click="goBack">
        <i class="bi bi-arrow-left me-2"></i>返回数据库列表
      </button>
    </div>

    <div v-if="loading" class="card mb-4">
      <div class="card-body text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3">正在分析数据库，请稍候...</p>
      </div>
    </div>
    
    <div v-else-if="analysisResult" class="analysis-result">
      <!-- 数据库信息 -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0"><i class="bi bi-info-circle me-2"></i>数据库信息</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <p><strong>文件名:</strong> {{ dbFileName }}</p>
              <p><strong>文件大小:</strong> {{ formatSize(dbFileSize) }}</p>
            </div>
            <div class="col-md-6">
              <p><strong>创建时间:</strong> {{ formatDate(dbFileCreateTime) }}</p>
              <p><strong>文件路径:</strong> {{ dbFilePath }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 基本信息卡片 -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0"><i class="bi bi-bar-chart-line me-2"></i>基本统计</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-4">
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="bi bi-code-square"></i>
                </div>
                <div class="stat-value">{{ analysisResult.totalFunctions }}</div>
                <div class="stat-label">总函数数</div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="bi bi-arrow-left-right"></i>
                </div>
                <div class="stat-value">{{ analysisResult.totalCalls }}</div>
                <div class="stat-label">调用关系数</div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="bi bi-folder2"></i>
                </div>
                <div class="stat-value">{{ analysisResult.totalPackages }}</div>
                <div class="stat-label">包数量</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 函数上下游分析 -->
      <FunctionAnalysis :dbFilePath="dbFilePath" />
    </div>
    
    <div v-else class="card mb-4">
      <div class="card-body text-center py-5">
        <i class="bi bi-exclamation-circle text-warning display-1"></i>
        <h4 class="mt-3">暂无分析结果</h4>
        <p>选择的数据库文件未返回分析结果，请返回选择其他文件。</p>
        <button class="btn btn-primary mt-3" @click="goBack">
          <i class="bi bi-arrow-left me-2"></i>返回数据库列表
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from '../../axios'
import FunctionAnalysis from './FunctionAnalysis.vue'

export default {
  name: 'DbAnalysisDetail',
  components: {
    FunctionAnalysis
  },
  props: {
    dbFilePath: {
      type: String,
      required: true
    },
    dbFileName: {
      type: String,
      required: true
    },
    dbFileSize: {
      type: Number,
      default: 0
    },
    dbFileCreateTime: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      analysisResult: null,
      loading: true
    }
  },
  mounted() {
    this.loadAnalysisData();
  },
  methods: {
    async loadAnalysisData() {
      this.loading = true;
      try {
        // 解码路径中的URL编码字符
        const decodedPath = decodeURIComponent(this.dbFilePath);
        
        // 获取基本统计信息
        const response = await axios.post('/api/static/analyze', {
          dbPath: decodedPath
        });
        
        // 检查数据库文件是否存在
        if (response.data && response.data.error === 'dbfile_not_exist') {
          // 显示提示并跳转到主页
          alert('数据库文件不存在，请重新输入项目路径进行分析');
          this.$router.push('/');
          return;
        }
        
        this.analysisResult = response.data;
      } catch (error) {
        console.error('分析数据库失败:', error);
      } finally {
        this.loading = false;
      }
    },

    formatDate(timestamp) {
      return new Date(timestamp).toLocaleString();
    },
    formatSize(bytes) {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Byte';
      const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    },
    goBack() {
      this.$emit('back');
    }
  }
}
</script>

<style scoped>
.stat-card {
  text-align: center;
  padding: 1.5rem;
  border-radius: 0.375rem;
  background-color: #f8f9fa;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 2rem;
  color: #0d6efd;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #212529;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #6c757d;
}

@media (max-width: 768px) {
  .row {
    flex-direction: column;
  }
  
  .stat-card {
    margin-bottom: 1rem;
  }
}
</style> 