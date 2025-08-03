<template>
  <div class="module-selector">
    <div class="row align-items-center">
      <div class="col-md-6">
        <label for="moduleSelect" class="form-label">
          <i class="bi bi-gear me-2"></i>Module简化设置
        </label>
        <div class="input-group">
          <select 
            id="moduleSelect"
            class="form-select" 
            v-model="selectedModule"
            @change="handleModuleChange"
            :disabled="loading"
          >
            <option value="">-- 选择Module进行简化 --</option>
            <option 
              v-for="module in moduleOptions" 
              :key="module.value" 
              :value="module.value"
            >
              {{ module.label }}
            </option>
          </select>
          <button 
            class="btn btn-outline-secondary" 
            type="button"
            @click="clearSelection"
            :disabled="!selectedModule || loading"
            title="清除选择"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
      <div class="col-md-6">
        <div class="module-info">
          <div v-if="selectedModule" class="alert alert-info mb-0">
            <i class="bi bi-info-circle me-2"></i>
            <strong>当前选中:</strong> {{ selectedModule }}
            <br>
            <small class="text-muted">
              函数名称将自动移除该module前缀以提升可读性
            </small>
            <br>
            <small class="text-warning">
              <i class="bi bi-exclamation-triangle me-1"></i>
              选择module后页面将自动刷新以应用新的显示设置
            </small>
          </div>
          <div v-else class="alert alert-light mb-0">
            <i class="bi bi-lightbulb me-2"></i>
            <small class="text-muted">
              选择一个module来简化函数名称显示，提升分析体验
            </small>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="mt-2">
      <div class="d-flex align-items-center text-muted">
        <div class="spinner-border spinner-border-sm me-2" role="status">
          <span class="visually-hidden">加载中...</span>
        </div>
        <small>正在加载module列表...</small>
      </div>
    </div>
    
    <!-- 错误提示 -->
    <div v-if="error" class="mt-2">
      <div class="alert alert-danger alert-sm mb-0">
        <i class="bi bi-exclamation-triangle me-2"></i>
        <small>{{ error }}</small>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, watch } from 'vue';
import { useModuleState } from '../composables/useModuleState';

export default {
  name: 'ModuleSelector',
  props: {
    dbPath: {
      type: String,
      required: true
    }
  },
  emits: ['module-change'],
  setup(props, { emit }) {
    const {
      selectedModule,
      moduleList,
      loading,
      error,
      clearSelectedModule,
      setModuleList,
      getModuleOptions,
      loadSelectedModule
    } = useModuleState();

    // 计算属性
    const moduleOptions = computed(() => getModuleOptions());

    // 加载module列表
    const loadModuleList = async (dbPath) => {
      try {
        loading.value = true;
        error.value = null;
        
        const response = await fetch('/api/runtime/modules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dbpath: dbPath,
            maxSamples: 100
          })
        });

        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        setModuleList(data.moduleNames || []);
      } catch (err) {
        error.value = `加载module列表失败: ${err.message}`;
        console.error('加载module列表失败:', err);
        setModuleList([]);
      } finally {
        loading.value = false;
      }
    };

    // 处理module选择变化
    const handleModuleChange = () => {
      const currentModule = selectedModule.value;
      console.log('Module selection changed to:', currentModule);
      emit('module-change', currentModule);
    };

    // 清除选择
    const clearSelection = () => {
      clearSelectedModule(props.dbPath);
      emit('module-change', '');
    };

    // 监听dbPath变化，重新加载module列表和选中的module
    watch(() => props.dbPath, async (newDbPath) => {
      if (newDbPath) {
        // 加载该数据库对应的module选择
        loadSelectedModule(newDbPath);
        // 加载module列表
        await loadModuleList(newDbPath);
      }
    }, { immediate: true });

    return {
      selectedModule,
      moduleList,
      loading,
      error,
      moduleOptions,
      handleModuleChange,
      clearSelection
    };
  }
};
</script>

<style scoped>
.module-selector {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.module-info .alert {
  font-size: 0.875rem;
}

.alert-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
}

.form-label {
  font-weight: 500;
  color: #495057;
  margin-bottom: 0.5rem;
}

.input-group .btn {
  border-left: 0;
}

.input-group .form-select {
  border-right: 0;
}

.input-group .form-select:focus + .btn {
  border-color: #86b7fe;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}
</style> 