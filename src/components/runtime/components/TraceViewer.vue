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
        <div class="col-md-10">
          <!-- 使用新的简化文件选择器组件 -->
          <RuntimeFileSelector @path-selected="handlePathSelected" />
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

      <!-- 页面标题 -->
      <div class="mb-4">
        <h4 class="text-primary">
          <i class="bi bi-activity me-2"></i>{{ $t('runtimeAnalysis.tabs.runtimeAnalysis') }}
        </h4>
      </div>

      <!-- 子路由视图 -->
      <router-view :project-path="projectPath" :db-path="dbPath" :current-file-name="currentFileName"></router-view>
    </div>


  </div>
</template>

<script>
import axios from '../../../axios';
import { useI18n } from 'vue-i18n';
import { clearSessionPathCache } from '../../../config/api.js';
import RuntimeFileSelector from './RuntimeFileSelector.vue';

export default {
  components: {
    RuntimeFileSelector
  },
  data() {
    return {
      projectPath: '',
      isPathVerified: false,
      isInitialVerifying: false,
      dbPath: '', // 数据库路径
      currentFileName: '',
      
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
        } else {
          // 如果验证失败，清除本地存储并要求用户重新输入
          localStorage.removeItem('verifiedProjectPath');
          this.isPathVerified = false;
        }
      } catch (error) {
        console.error('验证路径失败:', error);
        // 验证出错时，清除本地存储并要求用户重新输入
        localStorage.removeItem('verifiedProjectPath');
        this.isPathVerified = false;
      } finally {
        this.isInitialVerifying = false;
      }
    },

    // 处理路径选择事件
    handlePathSelected(data) {
      this.projectPath = data.path;
      this.dbPath = data.dbPath;
      this.currentFileName = data.fileName || '';
      this.isPathVerified = true;
      
      // 保存验证通过的路径
      localStorage.setItem('verifiedProjectPath', data.path);
      
      // 清除旧的路径缓存
      clearSessionPathCache();
      
      // 更新本地缓存
      import('../../../config/api.js').then(({ updateSessionCache }) => {
        updateSessionCache(data.path);
        console.log('✅ 路径已设置到session，本地缓存已更新');
      });
      
      // 导航到运行时分析页面
      this.$router.push('/runtime-analysis');
    },

    changePath() {
      this.isPathVerified = false;
      this.dbPath = '';
      localStorage.removeItem('verifiedProjectPath');
      // 清除session缓存
      clearSessionPathCache();
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

<style>
@import url("../../../assets/styles/components/runtime/trace-viewer.css");
</style>