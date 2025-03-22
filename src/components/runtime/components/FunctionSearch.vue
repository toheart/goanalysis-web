<template>
  <div class="function-search">
    <div class="card mb-4">
      <div class="card-header">
        <h5 class="mb-0"><i class="bi bi-search me-2"></i>{{ $t('runtimeAnalysis.functionAnalysis.title') }}</h5>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-8">
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-code-square"></i></span>
              <!-- 使用Bootstrap原生组件 -->
              <div class="dropdown w-100">
                <input
                  ref="searchInput"
                  v-model="searchQuery"
                  type="text"
                  :placeholder="$t('runtimeAnalysis.functionAnalysis.inputFunctionName')"
                  class="form-control"
                  @input="handleInput"
                  @keydown.down="onDown"
                  @keydown.up="onUp"
                  @keydown.enter="onEnter"
                  @keydown.esc="hideDropdown"
                  aria-haspopup="true"
                  :aria-expanded="showDropdown"
                  autocomplete="off"
                />
                <!-- 下拉菜单使用Bootstrap原生dropdown组件 -->
                <ul 
                  class="dropdown-menu w-100"
                  :class="{'show': showDropdown && filteredItems.length > 0}"
                  style="max-height: 350px; overflow-y: auto;"
                >
                  <li class="dropdown-header">
                    <small><i class="bi bi-info-circle me-1"></i>找到 {{ filteredItems.length }} 个匹配函数</small>
                  </li>
                  <li><hr class="dropdown-divider"></li>
                  <li v-for="(item, index) in filteredItems" :key="index">
                    <a 
                      class="dropdown-item" 
                      href="#" 
                      :class="{'active': index === activeIndex}"
                      @click.prevent="selectItem(item)"
                      @mouseover="activeIndex = index"
                    >
                      <div class="d-flex align-items-center">
                        <div class="function-icon me-2">
                          <i class="bi bi-code-square"></i>
                        </div>
                        <div>
                          <div v-html="highlightText(item.name, searchQuery)"></div>
                          <small v-if="item.package" class="text-muted">{{ item.package }}</small>
                        </div>
                      </div>
                    </a>
                  </li>
                </ul>
              </div>
              <button class="btn btn-primary" @click="search">
                <i class="bi bi-search me-1"></i> {{ $t('runtimeAnalysis.functionAnalysis.search') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import debounce from 'lodash/debounce';

export default {
  name: 'FunctionSearch',
  props: {
    dbPath: {
      type: String,
      required: true
    }
  },
  emits: ['search'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const searchQuery = ref('');
    const showDropdown = ref(false);
    const activeIndex = ref(-1);
    const items = ref([]);
    const loading = ref(false);
    const searchInput = ref(null);

    // 过滤后的项目
    const filteredItems = computed(() => {
      return items.value;
    });

    // 获取函数列表
    const fetchFunctions = async (query) => {
      if (!props.dbPath || !query) {
        items.value = [];
        return;
      }

      loading.value = true;

      try {
        const response = await axios.post('/api/runtime/functions/search', {
          dbpath: props.dbPath,
          query: query,
          limit: 10
        });

        items.value = response.data.functions || [];
        
        if (items.value.length > 0) {
          showDropdown.value = true;
          activeIndex.value = -1;
        } else {
          showDropdown.value = false;
        }
      } catch (error) {
        console.error('获取函数列表失败:', error);
        items.value = [];
        showDropdown.value = false;
      } finally {
        loading.value = false;
      }
    };

    // 防抖处理
    const debouncedFetch = debounce(fetchFunctions, 300);

    // 处理输入
    const handleInput = () => {
      if (searchQuery.value.length > 0) {
        debouncedFetch(searchQuery.value);
      } else {
        items.value = [];
        showDropdown.value = false;
      }
    };

    // 键盘导航 - 下
    const onDown = (e) => {
      e.preventDefault();
      if (!showDropdown.value) {
        showDropdown.value = true;
        return;
      }
      
      if (filteredItems.value.length === 0) return;
      
      activeIndex.value = activeIndex.value < filteredItems.value.length - 1 
        ? activeIndex.value + 1 
        : 0;
      
      scrollToActive();
    };

    // 键盘导航 - 上
    const onUp = (e) => {
      e.preventDefault();
      if (!showDropdown.value || filteredItems.value.length === 0) return;
      
      activeIndex.value = activeIndex.value > 0 
        ? activeIndex.value - 1 
        : filteredItems.value.length - 1;
      
      scrollToActive();
    };

    // 确保活动项在视图中
    const scrollToActive = () => {
      nextTick(() => {
        const activeEl = document.querySelector('.dropdown-item.active');
        if (activeEl) {
          activeEl.scrollIntoView({ block: 'nearest' });
        }
      });
    };

    // 处理回车
    const onEnter = () => {
      if (showDropdown.value && activeIndex.value >= 0 && activeIndex.value < filteredItems.value.length) {
        selectItem(filteredItems.value[activeIndex.value]);
      } else {
        search();
      }
    };

    // 隐藏下拉框
    const hideDropdown = () => {
      showDropdown.value = false;
    };

    // 选择项目
    const selectItem = (item) => {
      searchQuery.value = item.name;
      hideDropdown();
      emit('search', item.name);
    };

    // 执行搜索
    const search = () => {
      if (!searchQuery.value) {
        alert(t('runtimeAnalysis.functionAnalysis.pleaseInputFunction'));
        return;
      }
      hideDropdown();
      emit('search', searchQuery.value);
    };

    // 高亮文本
    const highlightText = (text, query) => {
      if (!query) return text;
      try {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
      } catch (e) {
        return text;
      }
    };

    // 点击外部关闭下拉框
    const handleClickOutside = (event) => {
      if (searchInput.value && !searchInput.value.contains(event.target)) {
        hideDropdown();
      }
    };

    // 生命周期钩子
    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
      if (debouncedFetch.cancel) debouncedFetch.cancel();
    });

    return {
      searchQuery,
      showDropdown,
      activeIndex,
      filteredItems,
      loading,
      searchInput,
      handleInput,
      onDown,
      onUp,
      onEnter,
      hideDropdown,
      selectItem,
      search,
      highlightText
    };
  }
};
</script>

<style scoped>
.function-search {
  position: relative;
}

.dropdown-menu {
  border-radius: 0 0 8px 8px;
}

.dropdown-item {
  padding: 0.5rem 1rem;
  white-space: normal;
}

.dropdown-item.active, 
.dropdown-item:active {
  background-color: rgba(13, 110, 253, 0.08);
  color: inherit;
}

.dropdown-item:hover {
  background-color: rgba(13, 110, 253, 0.05);
}

.highlight {
  background-color: rgba(255, 193, 7, 0.2);
  padding: 0.1em 0.2em;
  border-radius: 2px;
  font-weight: bold;
}

.function-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: rgba(13, 110, 253, 0.1);
  color: #0d6efd;
  border-radius: 8px;
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .dropdown-header {
    background-color: #2d2d2d;
    color: #e1e1e1;
  }

  .dropdown-menu {
    background-color: #2d2d2d;
    border: 1px solid #3d3d3d;
  }

  .dropdown-item {
    color: #e1e1e1;
  }

  .dropdown-item.active, 
  .dropdown-item:active, 
  .dropdown-item:hover {
    background-color: rgba(91, 154, 255, 0.15);
  }

  .highlight {
    background-color: rgba(255, 193, 7, 0.15);
    color: #e1e1e1;
  }

  .function-icon {
    background-color: rgba(91, 154, 255, 0.15);
    color: #5b9aff;
  }
}
</style> 