<template>
  <div class="function-search">
    <div class="search-header mb-4">
      <h4 class="mb-3">
        <i class="bi bi-search me-2"></i>函数搜索
      </h4>
      
      <!-- 搜索框 -->
      <div class="search-box-container">
        <div class="input-group">
          <span class="input-group-text">
            <i class="bi bi-search"></i>
          </span>
          <input
            type="text"
            v-model="searchQuery"
            @keyup.enter="performSearch"
            class="form-control"
            placeholder="输入函数名、包名或关键词进行搜索..."
          />
          <button 
            class="btn btn-primary" 
            @click="performSearch"
            :disabled="loading || !searchQuery.trim()"
          >
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            搜索
          </button>
        </div>
        
        <!-- 搜索提示 -->
        <div class="search-hints mt-2">
          <small class="text-muted">
            <i class="bi bi-lightbulb me-1"></i>
            支持模糊搜索,可搜索函数名、包名等关键词
          </small>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="hasSearched">
      <div v-if="loading" class="card">
        <div class="card-body text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-3">正在搜索函数...</p>
        </div>
      </div>

      <div v-else-if="searchResults.length" class="search-results">
        <div class="results-header mb-3">
          <h6 class="mb-0">
            <i class="bi bi-check-circle text-success me-2"></i>
            找到 {{ searchResults.length }} 个相关函数
          </h6>
        </div>

        <div class="card">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>函数名</th>
                    <th>包名</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="func in searchResults" 
                    :key="func.name + func.package"
                    class="function-row"
                    @click="viewFunctionDetail(func)"
                  >
                    <td>
                      <div class="function-name" v-html="highlightMatch(func.name)"></div>
                    </td>
                    <td>
                      <span class="package-badge" v-html="highlightMatch(func.package)"></span>
                    </td>
                    <td>
                      <button 
                        class="btn btn-sm btn-outline-info me-2"
                        @click.stop="viewFunctionDetail(func)"
                      >
                        <i class="bi bi-info-circle me-1"></i>详情
                      </button>
                      <button 
                        class="btn btn-sm btn-outline-primary"
                        @click.stop="viewCallGraph(func)"
                      >
                        <i class="bi bi-diagram-3 me-1"></i>调用图
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="card">
        <div class="card-body text-center py-5">
          <i class="bi bi-search text-muted display-4"></i>
          <h5 class="mt-3">未找到相关函数</h5>
          <p class="text-muted">请尝试使用其他关键词或检查拼写</p>
          <div class="mt-3">
            <button class="btn btn-outline-primary" @click="clearSearch">
              <i class="bi bi-arrow-clockwise me-2"></i>重新搜索
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索历史 -->
    <div v-if="!hasSearched && searchHistory.length" class="search-history">
      <div class="card">
        <div class="card-header">
          <h6 class="mb-0">
            <i class="bi bi-clock-history me-2"></i>搜索历史
          </h6>
        </div>
        <div class="card-body">
          <div class="history-items">
            <span 
              v-for="(query, index) in searchHistory" 
              :key="index"
              class="badge bg-light text-dark me-2 mb-2 history-item"
              @click="searchFromHistory(query)"
            >
              {{ query }}
              <i class="bi bi-x-circle ms-1" @click.stop="removeFromHistory(index)"></i>
            </span>
          </div>
          <div class="mt-3">
            <button class="btn btn-sm btn-outline-secondary" @click="clearHistory">
              <i class="bi bi-trash me-1"></i>清空历史
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索建议 -->
    <div v-if="!hasSearched && !searchHistory.length" class="search-suggestions">
      <div class="card">
        <div class="card-header">
          <h6 class="mb-0">
            <i class="bi bi-lightbulb me-2"></i>搜索建议
          </h6>
        </div>
        <div class="card-body">
          <div class="suggestions-grid">
            <div 
              v-for="suggestion in suggestions" 
              :key="suggestion.query"
              class="suggestion-card"
              @click="searchFromSuggestion(suggestion.query)"
            >
              <i :class="suggestion.icon" class="suggestion-icon"></i>
              <div class="suggestion-text">
                <div class="suggestion-title">{{ suggestion.title }}</div>
                <div class="suggestion-desc">{{ suggestion.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 函数详情抽屉 -->
    <FunctionDetailDrawer
      :show="showDetailDrawer"
      :function-key="selectedFunctionKey"
      :db-path="dbPath"
      @close="showDetailDrawer = false"
    />
  </div>
</template>

<script>
import { staticAnalysisAPI } from '../../../config/api'
import FunctionDetailDrawer from './FunctionDetail.vue'

export default {
  name: 'FunctionSearch',
  components: {
    FunctionDetailDrawer
  },
  props: {
    dbPath: {
      type: String,
      required: true
    }
  },
  emits: ['view-call-graph'],
  data() {
    return {
      searchQuery: '',
      loading: false,
      hasSearched: false,
      searchResults: [],
      searchHistory: [],
      showDetailDrawer: false,
      selectedFunctionKey: '',
      suggestions: [
        {
          query: 'main',
          title: '搜索主函数',
          description: '查找项目入口函数',
          icon: 'bi bi-play-circle'
        },
        {
          query: 'handler',
          title: '搜索处理函数',
          description: '查找事件处理相关函数',
          icon: 'bi bi-gear'
        },
        {
          query: 'service',
          title: '搜索服务函数',
          description: '查找业务服务相关函数',
          icon: 'bi bi-server'
        },
        {
          query: 'util',
          title: '搜索工具函数',
          description: '查找工具类相关函数',
          icon: 'bi bi-tools'
        }
      ]
    }
  },
  mounted() {
    this.loadSearchHistory()
  },
  methods: {
    async performSearch() {
      if (!this.searchQuery.trim()) return
      
      this.loading = true
      this.hasSearched = true
      
      try {
        const data = await staticAnalysisAPI.searchFunctions(this.searchQuery.trim())
        this.searchResults = data.functions || []
        this.addToHistory(this.searchQuery.trim())
      } catch (error) {
        console.error('Failed to search functions:', error)
        this.searchResults = []
      } finally {
        this.loading = false
      }
    },

    clearSearch() {
      this.searchQuery = ''
      this.hasSearched = false
      this.searchResults = []
    },

    highlightMatch(text) {
      if (!this.searchQuery.trim()) return text
      
      const query = this.searchQuery.trim()
      const regex = new RegExp(`(${query})`, 'gi')
      return text.replace(regex, '<mark>$1</mark>')
    },

    viewFunctionDetail(func) {
      // 使用函数对象中的key字段作为functionKey
      this.selectedFunctionKey = func.key || func.name
      this.showDetailDrawer = true
    },

    viewCallGraph(func) {
      this.$emit('view-call-graph', func)
    },

    // 搜索历史管理
    loadSearchHistory() {
      const history = localStorage.getItem('functionSearchHistory')
      if (history) {
        this.searchHistory = JSON.parse(history)
      }
    },

    addToHistory(query) {
      if (!this.searchHistory.includes(query)) {
        this.searchHistory.unshift(query)
        if (this.searchHistory.length > 10) {
          this.searchHistory = this.searchHistory.slice(0, 10)
        }
        this.saveSearchHistory()
      }
    },

    removeFromHistory(index) {
      this.searchHistory.splice(index, 1)
      this.saveSearchHistory()
    },

    clearHistory() {
      this.searchHistory = []
      this.saveSearchHistory()
    },

    saveSearchHistory() {
      localStorage.setItem('functionSearchHistory', JSON.stringify(this.searchHistory))
    },

    searchFromHistory(query) {
      this.searchQuery = query
      this.performSearch()
    },

    searchFromSuggestion(query) {
      this.searchQuery = query
      this.performSearch()
    }
  }
}
</script>

<style scoped>
.search-box-container {
  max-width: 600px;
}

.input-group {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.input-group-text {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: none;
  color: #6c757d;
}

.form-control {
  border: none;
  padding: 0.75rem 1rem;
  font-size: 1rem;
}

.form-control:focus {
  box-shadow: none;
  border-color: transparent;
}

.btn-primary {
  background: linear-gradient(135deg, #4785ff 0%, #2684ff 100%);
  border: none;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
}

.search-hints {
  margin-left: 3rem;
}

.results-header h6 {
  color: #495057;
  font-weight: 600;
}

.function-row {
  cursor: pointer;
  transition: all 0.2s ease;
}

.function-row:hover {
  background-color: rgba(71, 133, 255, 0.05);
  transform: translateX(2px);
}

.function-name {
  font-weight: 600;
  color: #212529;
  font-size: 0.9rem;
}

.function-name :deep(mark) {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-weight: 700;
}

.package-badge {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #1565c0;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.package-badge :deep(mark) {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-weight: 700;
}

.history-item {
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
}

.history-item:hover {
  background: linear-gradient(135deg, #4785ff 0%, #2684ff 100%) !important;
  color: white !important;
  transform: translateY(-1px);
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.suggestion-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8f9fa;
}

.suggestion-card:hover {
  background: linear-gradient(135deg, rgba(71, 133, 255, 0.1) 0%, rgba(38, 132, 255, 0.15) 100%);
  border-color: #4785ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(71, 133, 255, 0.2);
}

.suggestion-icon {
  font-size: 1.5rem;
  color: #4785ff;
  margin-right: 0.75rem;
}

.suggestion-title {
  font-weight: 600;
  color: #212529;
  margin-bottom: 0.25rem;
}

.suggestion-desc {
  font-size: 0.8rem;
  color: #6c757d;
}

.card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.card-header {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 1rem 1.25rem;
}

.card-header h6 {
  color: #495057;
  font-weight: 600;
}

.table thead th {
  background: linear-gradient(135deg, #4785ff 0%, #2684ff 100%);
  color: white;
  border: none;
  font-weight: 600;
  padding: 1rem;
  font-size: 0.875rem;
}

.table tbody td {
  padding: 1rem;
  vertical-align: middle;
  border-bottom: 1px solid #f1f3f4;
}

.btn {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-outline-info {
  border-color: #17a2b8;
  color: #17a2b8;
}

.btn-outline-info:hover {
  background: #17a2b8;
  border-color: #17a2b8;
  color: white;
  transform: translateY(-1px);
}

.btn-outline-primary {
  border-color: #4785ff;
  color: #4785ff;
}

.btn-outline-primary:hover {
  background: #4785ff;
  border-color: #4785ff;
  color: white;
  transform: translateY(-1px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .search-box-container {
    max-width: 100%;
  }
  
  .search-hints {
    margin-left: 0;
    margin-top: 0.5rem;
  }
  
  .suggestions-grid {
    grid-template-columns: 1fr;
  }
  
  .suggestion-card {
    padding: 0.75rem;
  }
  
  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
  }
}

/* 表格响应式 */
.table-responsive {
  border-radius: 8px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-responsive::-webkit-scrollbar {
  height: 6px;
}

.table-responsive::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.table-responsive::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.table-responsive::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 动画效果 */
.search-results {
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
