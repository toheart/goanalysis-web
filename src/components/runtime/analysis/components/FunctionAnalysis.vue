<template>
  <div class="function-analysis">
    <!-- 函数搜索区域 -->
    <div class="search-section mb-4">
      <div class="card">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">数据库路径</label>
              <div class="input-group">
                <input 
                  type="text" 
                  class="form-control" 
                  v-model="dbPath"
                  placeholder="请输入数据库路径"
                  @change="onDbPathChange"
                >
                <button 
                  class="btn btn-outline-secondary" 
                  type="button"
                  @click="onDbPathChange"
                >
                  加载
                </button>
              </div>
            </div>
            
            <div class="col-md-6">
              <label class="form-label">函数名称</label>
              <div class="dropdown">
                <input 
                  type="text" 
                  class="form-control" 
                  v-model="searchQuery"
                  placeholder="请输入函数名称"
                  @focus="showSuggestions = true"
                  @input="onSearchInput"
                >
                <ul 
                  class="dropdown-menu w-100" 
                  :class="{ show: showSuggestions && filteredFunctions.length }"
                >
                  <li v-for="func in filteredFunctions" :key="func.name">
                    <a 
                      class="dropdown-item" 
                      href="#"
                      @click.prevent="onFunctionSelect(func.name)"
                    >
                      <div>{{ func.name }}</div>
                      <small class="text-muted">{{ func.package }}</small>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分析结果区域 -->
    <div v-if="functionName" class="analysis-section">
      <!-- 函数信息 -->
      <div class="function-info mb-4">
        <h4>{{ functionName }}</h4>
        <div class="text-muted">{{ currentPackage }}</div>
      </div>

      <!-- 分析标签页 -->
      <div class="analysis-tabs">
        <ul class="nav nav-tabs mb-3">
          <li class="nav-item">
            <a 
              class="nav-link" 
              :class="{ active: activeTab === 'call-chain' }"
              href="#"
              @click.prevent="switchTab('call-chain')"
            >
              调用链分析
            </a>
          </li>
          <li class="nav-item">
            <a 
              class="nav-link" 
              :class="{ active: activeTab === 'hot-path' }"
              href="#"
              @click.prevent="switchTab('hot-path')"
            >
              热点路径分析
            </a>
          </li>
          <li class="nav-item">
            <a 
              class="nav-link" 
              :class="{ active: activeTab === 'performance' }"
              href="#"
              @click.prevent="switchTab('performance')"
            >
              性能异常分析
            </a>
          </li>
        </ul>

        <!-- 分析内容 -->
        <div class="tab-content">
          <div v-show="activeTab === 'call-chain'">
            <CallChainAnalysis 
              :db-path="dbPath"
              :function-name="functionName"
            />
          </div>
          
          <div v-show="activeTab === 'hot-path'">
            <HotPathAnalysis 
              :db-path="dbPath"
              :function-name="functionName"
            />
          </div>
          
          <div v-show="activeTab === 'performance'">
            <PerformanceAnalysis 
              :db-path="dbPath"
              :function-name="functionName"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-5 text-muted">
      请选择要分析的函数
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { useFunctionAnalysis } from '../composables/useFunctionAnalysis';
import CallChainAnalysis from './CallChainAnalysis.vue';
import HotPathAnalysis from './HotPathAnalysis.vue';
import PerformanceAnalysis from './PerformanceAnalysis.vue';

export default {
  name: 'FunctionAnalysis',
  
  components: {
    CallChainAnalysis,
    HotPathAnalysis,
    PerformanceAnalysis
  },
  
  setup() {
    const {
      dbPath,
      functionName,
      activeTab,
      functions,
      currentPackage,
      loading,
      error,
      loadFunctions,
      selectFunction,
      switchTab,
      reset
    } = useFunctionAnalysis();

    const searchQuery = ref('');
    const showSuggestions = ref(false);
    
    // 过滤函数列表
    const filteredFunctions = computed(() => {
      if (!searchQuery.value) return functions.value;
      const query = searchQuery.value.toLowerCase();
      return functions.value.filter(f => 
        f.name.toLowerCase().includes(query) || 
        f.package.toLowerCase().includes(query)
      );
    });

    // 处理数据库路径变化
    const onDbPathChange = async () => {
      if (!dbPath.value) return;
      reset();
      await loadFunctions(dbPath.value);
    };

    // 处理搜索输入
    const onSearchInput = () => {
      showSuggestions.value = true;
    };

    // 处理函数选择
    const onFunctionSelect = (name) => {
      searchQuery.value = name;
      selectFunction(name);
      showSuggestions.value = false;
    };

    // 监听点击事件以关闭建议列表
    const onClickOutside = (event) => {
      if (!event.target.closest('.dropdown')) {
        showSuggestions.value = false;
      }
    };

    // 添加和移除全局点击事件监听
    watch(showSuggestions, (show) => {
      if (show) {
        document.addEventListener('click', onClickOutside);
      } else {
        document.removeEventListener('click', onClickOutside);
      }
    });

    return {
      dbPath,
      functionName,
      activeTab,
      currentPackage,
      searchQuery,
      showSuggestions,
      filteredFunctions,
      loading,
      error,
      onDbPathChange,
      onSearchInput,
      onFunctionSelect,
      switchTab
    };
  }
};
</script>

<style scoped>
.function-analysis .dropdown-menu {
  max-height: 300px;
  overflow-y: auto;
}

.function-analysis .dropdown-item {
  padding: 0.5rem 1rem;
  white-space: normal;
}

.function-analysis .dropdown-item small {
  display: block;
  font-size: 0.875em;
}

.function-analysis .function-info {
  border-left: 4px solid #0d6efd;
  padding-left: 1rem;
}
</style> 