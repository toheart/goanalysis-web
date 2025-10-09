<template>
  <div class="package-dependency-view">
    <!-- 顶部控制栏 -->
    <div class="top-bar mb-3">
      <div class="d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="bi bi-diagram-3 me-2"></i>包依赖关系图
        </h5>
        <div class="controls">
          <span class="badge bg-light text-dark me-2">初始 20 个包</span>
          <button 
            class="btn btn-sm btn-outline-primary"
            @click="resetGraph"
            :disabled="false"
            title="重置到Top 20视图"
          >
            <i class="bi bi-arrow-counterclockwise me-2"></i>重置
          </button>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="card">
        <div class="card-body text-center py-5">
          <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
          <h5 class="text-muted">正在加载包依赖数据...</h5>
          <p class="text-muted small">这可能需要几秒钟</p>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div v-else class="row g-3">
      <!-- 左侧: 依赖关系图 -->
      <div class="col-lg-9">
        <PackageDependencyFlow
          :key="flowKey"
          :root-package-name="rootPackageName"
          :initial-node-limit="20"
          :expand-batch-size="5"
          @package-selected="handlePackageSelect"
        />
      </div>

      <!-- 右侧: 包详情侧边栏 -->
      <div class="col-lg-3">
        <PackageDetailPanel
          :selected-package="selectedPackageData"
          :dependencies="packageDependencies"
          :dependents="packageDependents"
          @add-package-to-graph="addPackageToGraph"
          @clear-selection="clearSelection"
        />
      </div>
    </div>
  </div>
</template>

<script>
import PackageDependencyFlow from '../components/explorer/graph/PackageDependencyFlow.vue'
import PackageDetailPanel from '../components/explorer/PackageDetailPanel.vue'
import { staticAnalysisAPI } from '../config/api'

export default {
  name: 'PackageDependencyView',
  components: {
    PackageDependencyFlow,
    PackageDetailPanel
  },
  props: {
    dbPath: {
      type: String,
      required: false
    },
    rootPackageName: {
      type: String,
      required: false,
      default: ''
    }
  },
  data() {
    return {
      // 加载状态
      loading: true,
      
      // 状态管理
      selectedPackageData: null,     // 当前选中的包详情
      allDependencies: [],           // 所有依赖关系数据（用于右侧表）
      flowKey: 0,                    // 用于强制重建 Flow 子图
      
      // 计算属性的缓存
      packageDependencies: [],       // 选中包依赖的其他包
      packageDependents: []          // 依赖选中包的其他包
    }
  },
  watch: {},
  mounted() {
    // 基于后端 session，直接加载
    this.loadDependenciesData()
  },
  methods: {
    async loadDependenciesData() {
      this.loading = true
      try {
        console.log('Loading package dependencies...')
        const data = await staticAnalysisAPI.getPackageDependencies()
        console.log('Package dependencies loaded:', data)
        this.allDependencies = data.dependencies || []
        console.log('Total dependencies:', this.allDependencies.length)
        
        // Flow 子组件会自行从 main 初始化 20 个包
      } catch (error) {
        console.error('Failed to load dependencies data:', error)
        alert(`加载包依赖数据失败: ${error.message || '未知错误'}`)
      } finally {
        this.loading = false
      }
    },

    handlePackageSelect(packageData) {
      console.log('Package selected:', packageData)
      this.selectedPackageData = packageData
      
      // 计算此包的依赖关系
      this.updatePackageRelations(packageData.name)
    },

    updatePackageRelations(packageName) {
      // 找出此包依赖的其他包（兼容蛇形和驼峰命名）
      this.packageDependencies = this.allDependencies.filter(dep => {
        const sourcePkg = dep.sourcePackage || dep.source_package
        return sourcePkg === packageName
      })
      
      // 找出依赖此包的其他包（兼容蛇形和驼峰命名）
      this.packageDependents = this.allDependencies.filter(dep => {
        const targetPkg = dep.targetPackage || dep.target_package
        return targetPkg === packageName
      })
    },

    addPackageToGraph(packageName) {
      console.warn('当前模式不支持从右侧直接添加到图：', packageName)
    },

    clearSelection() {
      this.selectedPackageData = null
      this.packageDependencies = []
      this.packageDependents = []
    },

    resetGraph() {
      // 通过切换 key 强制 Flow 子组件按 main 重新初始化 20 个包
      this.flowKey++
      this.clearSelection()
    }
  }
}
</script>

<style scoped>
/* 根元素样式 */
.package-dependency-view {
  width: 100%;
  min-height: 400px;
}

.loading-container {
  margin-top: 2rem;
}

.loading-container .card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.top-bar {
  background: #f8f9fa;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.top-bar h5 {
  color: #2c3e50;
  font-weight: 600;
}

.controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.badge {
  font-size: 0.85rem;
  padding: 0.4rem 0.8rem;
  border: 1px solid #dee2e6;
}

.btn {
  border-radius: 6px;
  transition: all 0.2s ease;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

/* 响应式设计 */
@media (max-width: 992px) {
  .top-bar {
    flex-direction: column;
    text-align: center;
  }
  
  .controls {
    margin-top: 0.5rem;
    justify-content: center;
  }
}
</style>
