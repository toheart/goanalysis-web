<template>
  <div class="function-analysis">
    <!-- 函数搜索组件 -->
    <FunctionSearch
      :db-path="dbPath"
      @search="handleSearch"
    />

    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ $t('runtimeAnalysis.functionAnalysis.loading') }}</span>
      </div>
      <p class="mt-3">{{ $t('runtimeAnalysis.functionAnalysis.analyzing') }}</p>
    </div>

    <!-- 无数据提示 -->
    <div v-else-if="functionName && !loading && !functionCallData.length" class="card mb-4">
      <div class="card-body text-center py-5">
        <i class="bi bi-search text-muted display-1"></i>
        <h4 class="mt-3">{{ $t('runtimeAnalysis.functionAnalysis.noRelatedFunction') }}</h4>
        <p>{{ $t('runtimeAnalysis.functionAnalysis.tryOtherFunctionName') }}</p>
      </div>
    </div>

    <div v-else-if="functionCallData.length > 0">
      <!-- 分析选项卡 -->
      <div class="card mb-4">
        <div class="card-header">
          <ul class="nav nav-tabs card-header-tabs">
            <li class="nav-item">
              <a class="nav-link" :class="{ active: activeTab === 'callchain' }" href="#" @click.prevent="activeTab = 'callchain'">
                <i class="bi bi-diagram-3 me-1"></i> 调用链分析
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" :class="{ active: activeTab === 'hotpath' }" href="#" @click.prevent="activeTab = 'hotpath'">
                <i class="bi bi-fire me-1"></i> 热点路径分析
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" :class="{ active: activeTab === 'performance' }" href="#" @click.prevent="activeTab = 'performance'">
                <i class="bi bi-speedometer2 me-1"></i> 性能分析
              </a>
            </li>
          </ul>
        </div>
        
        <div class="card-body p-0">
          <!-- 调用链分析 -->
          <div v-if="activeTab === 'callchain'" class="p-3">
            <CallChainAnalysis
              :function-name="functionName"
              :call-data="functionCallData"
              @search="handleSearch"
            />
          </div>
          
          <!-- 热点路径分析 -->
          <div v-if="activeTab === 'hotpath'" class="p-3">
            <HotPathAnalysis
              :db-path="dbPath || projectPath"
              :function-name="functionName"
            />
          </div>
          
          <!-- 性能分析 -->
          <div v-if="activeTab === 'performance'" class="p-3">
            <PerformanceAnalysis
              :db-path="dbPath || projectPath"
              :function-name="functionName"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import axios from '../../axios';
import FunctionSearch from './function-analysis/components/FunctionSearch.vue';
import CallChainAnalysis from './function-analysis/components/CallChainAnalysis.vue';
import HotPathAnalysis from './analysis/components/HotPathAnalysis.vue';
import PerformanceAnalysis from './analysis/components/PerformanceAnalysis.vue';

export default {
  name: 'FunctionAnalysis',
  components: {
    FunctionSearch,
    CallChainAnalysis,
    HotPathAnalysis,
    PerformanceAnalysis
  },
  props: {
    projectPath: {
      type: String,
      required: true
    },
    dbPath: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    const loading = ref(false);
    const functionName = ref('');
    const functionCallData = ref([]);
    const activeTab = ref('callchain');

    // 处理搜索事件
    const handleSearch = async (name) => {
      functionName.value = name;
      loading.value = true;
      functionCallData.value = [];
      
      try {
        const dbpath = props.dbPath || props.projectPath;
        if (!dbpath) {
          throw new Error('数据库路径为空');
        }
        
        const response = await axios.post('/api/runtime/function/analysis', {
          functionName: name,
          type: 'caller',
          path: dbpath
        });
        
        if (response.data?.callData) {
          functionCallData.value = processCallData(response.data.callData);
        }
      } catch (error) {
        console.error('获取函数调用关系失败:', error);
        alert('获取函数调用关系失败: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    // 处理调用数据，添加唯一ID
    const processCallData = (data) => {
      let nextId = 1;
      
      const addIds = (node) => {
        node.id = nextId++;
        
        if (node.children?.length) {
          node.children.forEach(child => {
            addIds(child);
          });
        }
        
        return node;
      };
      
      return data.map(node => addIds({...node}));
    };

    return {
      loading,
      functionName,
      functionCallData,
      activeTab,
      handleSearch
    };
  }
};
</script>

<style scoped>
.nav-tabs .nav-link {
  color: var(--bs-gray-700);
}

.nav-tabs .nav-link.active {
  color: var(--bs-primary);
  font-weight: 500;
}
</style> 