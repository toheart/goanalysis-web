<template>
  <div class="welcome-page">
    <div class="container py-4">
      <div class="text-center mb-4">
        <h1 class="display-5 fw-bold title-gradient mb-2">{{ $t('welcome.title') }}</h1>
        <p class="lead mb-0">{{ $t('welcome.subtitle') }}</p>
      </div>

      <div class="row justify-content-center mb-4">
        <div class="col-md-8">
          <div class="card shadow-sm border-0 hover-card">
            <div class="card-body p-4">
              <h2 class="card-title fs-4 mb-3"><i class="bi bi-info-circle text-primary me-2"></i>{{ $t('welcome.about.title') }}</h2>
              <p class="card-text">
                {{ $t('welcome.about.content') }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <h2 class="text-center fs-4 mb-4"><i class="bi bi-tools text-primary me-2"></i>{{ $t('welcome.features') }}</h2>
      
      <!-- 程序运行分析功能区 -->
      <div class="card mb-4 feature-card">
        <div class="card-header bg-primary text-white py-3">
          <h3 class="h5 mb-0 d-flex align-items-center"><i class="bi bi-activity me-2"></i>{{ $t('welcome.runtime.title') }}</h3>
        </div>
        <div class="card-body p-4">
          <div class="row g-4">
            <div class="col-md-7">
              <p class="card-text">
                {{ $t('welcome.runtime.description') }}
              </p>
              
              <!-- 项目插桩区域 -->
              <div class="card mt-3 mb-3 inner-card">
                <div class="card-header bg-gray text-white py-2">
                  <h5 class="mb-0 fs-5"><i class="bi bi-code-square me-2"></i>{{ $t('welcome.runtime.instrumentation.title') }}</h5>
                </div>
                <div class="card-body p-3">
                  <div class="input-group mb-3">
                    <span class="input-group-text bg-light"><i class="bi bi-folder"></i></span>
                    <input 
                      type="text" 
                      class="form-control"
                      :placeholder="$t('welcome.runtime.instrumentation.placeholder')" 
                      v-model="projectPath"
                      :disabled="isInstrumenting"
                    >
                    <button 
                      class="btn btn-primary" 
                      @click="instrumentProject"
                      :disabled="!projectPath || isInstrumenting"
                    >
                      <span v-if="isInstrumenting" class="spinner-border spinner-border-sm me-2" role="status"></span>
                      <i class="bi bi-code-square me-1" v-else></i>{{ isInstrumenting ? $t('welcome.runtime.instrumentation.processing') : $t('welcome.runtime.instrumentation.button') }}
                    </button>
                  </div>
                  <small class="text-muted fst-italic">{{ $t('welcome.runtime.instrumentation.hint') }}</small>
                  
                  <!-- 插桩结果提示 -->
                  <div v-if="instrumentError" class="alert alert-danger mt-3 mb-0">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ instrumentError }}
                  </div>
                  <div v-if="instrumentSuccess" class="alert alert-success mt-3 mb-0">
                    <i class="bi bi-check-circle-fill me-2"></i>{{ instrumentSuccess }}
                    <div class="mt-2">
                      <button class="btn btn-sm btn-info ms-2" @click="showUserManual = true">
                        <i class="bi bi-book me-1"></i>查看使用手册
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-5 d-flex align-items-center justify-content-center">
              <div class="text-center action-box p-4">
                <i class="bi bi-activity display-1 text-primary mb-3 action-icon"></i>
                <div>
                  <router-link to="/allgids" class="btn btn-primary btn-lg action-btn">
                    <i class="bi bi-arrow-right me-1"></i>{{ $t('welcome.runtime.viewAnalysis') }}
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 使用手册弹窗 -->
      <div v-if="showUserManual" class="modal fade show" tabindex="-1" style="display: block;">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title"><i class="bi bi-book me-2"></i>插桩后使用手册</h5>
              <button type="button" class="btn-close btn-close-white" @click="showUserManual = false"></button>
            </div>
            <div class="modal-body">
              <div class="user-manual">
                <h4 class="mb-3 text-primary fw-bold"><i class="bi bi-book-half me-2"></i>插桩后如何使用</h4>
                
                <div class="alert alert-info border-left mb-4">
                  <div class="d-flex align-items-center">
                    <div class="me-3">
                      <i class="bi bi-info-circle-fill text-primary" style="font-size: 2rem;"></i>
                    </div>
                    <div>
                      <h5 class="mb-1 fw-bold">插桩已完成！</h5>
                      <p class="mb-0">现在您需要按照以下步骤运行您的程序以收集运行时数据。</p>
                    </div>
                  </div>
                </div>
                
                <div class="card mb-4">
                  <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="bi bi-1-circle me-2"></i>第一步：运行您的程序</h5>
                  </div>
                  <div class="card-body">
                    <p>现在您的程序已经被插入了跟踪代码，您需要正常运行您的程序。程序运行时会自动收集函数调用信息。</p>
                    <div class="alert alert-warning">
                      <i class="bi bi-exclamation-triangle-fill me-2"></i>
                      <strong>注意：</strong> 请确保您的程序有足够的权限在当前目录创建和写入数据文件。
                    </div>
                    <div class="bg-light p-3 rounded border">
                      <h6 class="text-primary"><i class="bi bi-terminal me-2"></i>运行命令示例：</h6>
                      <pre class="mb-0 code-block"><code># 示例：运行您的Go程序
go run main.go

# 或者如果是已编译的程序
./your_program</code></pre>
                    </div>
                  </div>
                </div>
                
                <div class="card mb-4">
                  <div class="card-header bg-success text-white">
                    <h5 class="mb-0"><i class="bi bi-2-circle me-2"></i>第二步：查看分析结果</h5>
                  </div>
                  <div class="card-body">
                    <p>程序运行后，系统会自动收集函数调用数据。您可以通过以下方式查看分析结果：</p>
                    <ol class="steps-list">
                      <li class="mb-2">点击"查看分析结果"按钮进入分析页面</li>
                      <li>在分析页面中，您可以：
                        <ul class="features-list mt-2">
                          <li><i class="bi bi-check-circle-fill text-success me-2"></i>查看所有Goroutine的运行情况</li>
                          <li><i class="bi bi-check-circle-fill text-success me-2"></i>分析热点函数</li>
                          <li><i class="bi bi-check-circle-fill text-success me-2"></i>检查未完成的函数（可能存在的阻塞）</li>
                          <li><i class="bi bi-check-circle-fill text-success me-2"></i>查看函数调用关系图</li>
                        </ul>
                      </li>
                    </ol>
                  </div>
                </div>
                
                <div class="card mb-4">
                  <div class="card-header bg-info text-white">
                    <h5 class="mb-0"><i class="bi bi-question-circle me-2"></i>常见问题</h5>
                  </div>
                  <div class="card-body">
                    <div class="accordion" id="faqAccordion">
                      <div class="accordion-item">
                        <h2 class="accordion-header">
                          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq1">
                            <i class="bi bi-question-diamond-fill text-primary me-2"></i>插桩会影响我的程序性能吗？
                          </button>
                        </h2>
                        <div id="faq1" class="accordion-collapse collapse">
                          <div class="accordion-body">
                            插桩会对程序性能产生一定影响，主要体现在函数调用的额外开销上。在生产环境中，建议仅在需要分析时使用插桩版本。
                          </div>
                        </div>
                      </div>
                      <div class="accordion-item">
                        <h2 class="accordion-header">
                          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq2">
                            <i class="bi bi-question-diamond-fill text-primary me-2"></i>如何恢复我的代码（移除插桩）？
                          </button>
                        </h2>
                        <div id="faq2" class="accordion-collapse collapse">
                          <div class="accordion-body">
                            如果您使用了版本控制系统（如Git），可以通过还原更改来移除插桩。否则，您需要手动删除每个函数中添加的<code class="bg-light px-1 rounded">defer functrace.Trace(...)</code>语句和导入语句。
                          </div>
                        </div>
                      </div>
                      <div class="accordion-item">
                        <h2 class="accordion-header">
                          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq3">
                            <i class="bi bi-question-diamond-fill text-primary me-2"></i>数据保存在哪里？
                          </button>
                        </h2>
                        <div id="faq3" class="accordion-collapse collapse">
                          <div class="accordion-body">
                            函数调用数据会保存在您项目目录下的数据库文件中。这些数据会在程序运行时自动收集和更新。
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" @click="showUserManual = false">
                <i class="bi bi-x-circle me-1"></i>关闭
              </button>
              <router-link to="/allgids" class="btn btn-primary">
                <i class="bi bi-arrow-right me-1"></i>前往分析页面
              </router-link>
            </div>
          </div>
        </div>
      </div>
      <!-- 模态框背景 -->
      <div v-if="showUserManual" class="modal-backdrop fade show"></div>
      
      <!-- 程序调用静态分析功能区 -->
      <div class="card mb-5">
        <div class="card-header bg-success text-white">
          <h3 class="h5 mb-0"><i class="bi bi-diagram-3 me-2"></i>{{ $t('welcome.static.title') }}</h3>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-7">
              <p class="card-text">
                {{ $t('welcome.static.description') }}
              </p>
            </div>
            <div class="col-md-5 d-flex align-items-center justify-content-center">
              <div class="text-center">
                <i class="bi bi-diagram-3 display-1 text-success mb-3"></i>
                <div>
                  <router-link to="/static-analysis" class="btn btn-success btn-lg">
                    <i class="bi bi-arrow-right me-1"></i>{{ $t('welcome.static.startAnalysis') }}
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from '../axios';
import { useI18n } from 'vue-i18n';
import { ref } from 'vue';

export default {
  name: 'WelcomePage',
  setup() {
    const { t } = useI18n({ useScope: 'global' });
    
    const projectPath = ref('');
    const isInstrumenting = ref(false);
    const instrumentError = ref('');
    const instrumentSuccess = ref('');
    const showUserManual = ref(false);
    
    const instrumentProject = async () => {
      if (!projectPath.value) {
        instrumentError.value = '请输入项目路径';
        return;
      }
      
      instrumentError.value = '';
      instrumentSuccess.value = '';
      isInstrumenting.value = true;
      
      try {
        const response = await axios.post('/api/runtime/instrument', {
          path: projectPath.value
        });
        
        if (response.data.success) {
          instrumentSuccess.value = response.data.message || '项目插桩成功，现在可以运行您的程序进行分析';
        } else {
          instrumentError.value = response.data.message || '插桩失败';
        }
      } catch (error) {
        instrumentError.value = '插桩过程出错: ' + (error.response?.data?.message || error.message);
      } finally {
        isInstrumenting.value = false;
      }
    };
    
    return {
      projectPath,
      isInstrumenting,
      instrumentError,
      instrumentSuccess,
      instrumentProject,
      t,
      showUserManual
    };
  }
}
</script>

<style scoped>
.welcome-page {
  padding-bottom: 2rem;
}

.title-gradient {
  background: linear-gradient(45deg, var(--primary-color), #36b9cc);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  display: inline-block;
}

.hover-card {
  transition: all 0.3s ease;
}

.hover-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1) !important;
}

.feature-card {
  overflow: hidden;
  transition: all 0.3s ease;
  border: none;
}

.feature-card:hover {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

.feature-card .card-header {
  border-radius: 0;
}

.inner-card {
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
  border: none;
}

.bg-gray {
  background-color: var(--gray-color);
}

.action-box {
  background: rgba(71, 133, 255, 0.03);
  border-radius: 12px;
  border: 1px dashed rgba(71, 133, 255, 0.3);
  transition: all 0.3s ease;
}

.action-box:hover {
  background: rgba(71, 133, 255, 0.06);
  border-color: rgba(71, 133, 255, 0.5);
}

.action-icon {
  animation: pulse 2s infinite;
}

.action-btn {
  box-shadow: 0 5px 15px rgba(71, 133, 255, 0.3);
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(71, 133, 255, 0.4);
}

.border-left {
  border-left: 4px solid var(--primary-color);
}

.code-block {
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 1rem;
  color: #212529;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

.steps-list li {
  margin-bottom: 0.75rem;
}

.features-list {
  list-style: none;
  padding-left: 0.5rem;
}

.features-list li {
  margin-bottom: 0.5rem;
}

.modal-content {
  border-radius: 12px;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style> 