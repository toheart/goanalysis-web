<template>
  <div class="package-dependency-view">
    <!-- 顶部控制栏 -->
    <div class="top-bar mb-3">
      <div class="d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="bi bi-diagram-3 me-2"></i>包依赖关系图
        </h5>
        <div class="controls">
          <span class="badge bg-light text-dark me-2">
            {{ visiblePackagesInGraph.length || 20 }} 个包
          </span>
          <button 
            class="btn btn-sm btn-outline-primary"
            @click="resetGraph"
            :disabled="visiblePackagesInGraph.length === 0"
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
          :packages-to-show="visiblePackagesInGraph"
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
      required: true
    }
  },
  data() {
    return {
      // 加载状态
      loading: true,
      
      // 状态管理
      selectedPackageData: null,     // 当前选中的包详情
      visiblePackagesInGraph: [],    // 当前在图中显示的包名列表
      allDependencies: [],           // 所有依赖关系数据
      
      // 计算属性的缓存
      packageDependencies: [],       // 选中包依赖的其他包
      packageDependents: []          // 依赖选中包的其他包
    }
  },
  watch: {
    // 监听 dbPath 变化，自动重新加载数据
    dbPath(newPath, oldPath) {
      console.log('PackageDependencyView: dbPath changed from', oldPath, 'to', newPath)
      if (newPath && newPath !== oldPath) {
        // 重置状态并重新加载
        this.clearSelection()
        this.visiblePackagesInGraph = [] // 重置显示列表
        this.loadDependenciesData()
      }
    }
  },
  mounted() {
    if (this.dbPath) {
      this.loadDependenciesData()
    }
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
        
        // 计算并显示Top 20包
        if (this.allDependencies.length > 0) {
          const topPackages = this.calculateTopPackages(this.allDependencies, 20)
          this.visiblePackagesInGraph = topPackages.map(p => p.name)
          console.log('Initialized with top packages:', this.visiblePackagesInGraph.length)
        } else {
          console.warn('No dependencies data loaded')
        }
      } catch (error) {
        console.error('Failed to load dependencies data:', error)
        alert(`加载包依赖数据失败: ${error.message || '未知错误'}`)
      } finally {
        this.loading = false
      }
    },

    calculateTopPackages(dependencies, limit = 20) {
      const packageMap = new Map()
      
      // 统计每个包的出入度
      dependencies.forEach(dep => {
        // 兼容蛇形和驼峰命名
        const sourcePkg = dep.sourcePackage || dep.source_package
        const targetPkg = dep.targetPackage || dep.target_package
        
        if (!packageMap.has(sourcePkg)) {
          packageMap.set(sourcePkg, { name: sourcePkg, out: 0, in: 0 })
        }
        if (!packageMap.has(targetPkg)) {
          packageMap.set(targetPkg, { name: targetPkg, out: 0, in: 0 })
        }
        packageMap.get(sourcePkg).out++
        packageMap.get(targetPkg).in++
      })
      
      // 按总度数（重要度）排序
      return Array.from(packageMap.values())
        .map(pkg => ({ 
          ...pkg, 
          total: pkg.in + pkg.out,
          importance: (pkg.in * 0.6 + pkg.out * 0.4) // 入度权重更高
        }))
        .sort((a, b) => b.importance - a.importance)
        .slice(0, limit)
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
      console.log('Adding package to graph:', packageName)
      
      // 检查是否已经在图中
      if (!this.visiblePackagesInGraph.includes(packageName)) {
        this.visiblePackagesInGraph = [...this.visiblePackagesInGraph, packageName]
      }
    },

    clearSelection() {
      this.selectedPackageData = null
      this.packageDependencies = []
      this.packageDependents = []
    },

    resetGraph() {
      // 重置到初始状态
      if (this.allDependencies.length > 0) {
        const topPackages = this.calculateTopPackages(this.allDependencies, 20)
        this.visiblePackagesInGraph = topPackages.map(p => p.name)
      }
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
