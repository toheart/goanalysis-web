import { ref, computed } from 'vue';
import axios from '../../../../axios';

export function useFunctionSearch(dbPath, emit) {
  const searchQuery = ref('');
  const showSuggestions = ref(false);
  const selectedIndex = ref(0);
  const functionNames = ref([]);
  const suggestionsStyle = ref({
    position: 'fixed',
    top: '0px',
    left: '0px',
    width: '300px',
    zIndex: 9999
  });

  // 防抖定时器
  let searchTimeout = null;
  let suggestionsTimer = null;

  // 过滤后的建议列表
  const filteredSuggestions = computed(() => {
    if (!searchQuery.value) return [];
    
    const searchTerm = searchQuery.value.toLowerCase();
    return functionNames.value
      .map(func => {
        const lowerName = func.name.toLowerCase();
        let score = 0;
        
        if (lowerName === searchTerm) {
          score = 100;
        } else if (lowerName.startsWith(searchTerm)) {
          score = 80;
        } else if (lowerName.includes(searchTerm)) {
          score = 60;
        } else if (lowerName.includes('_' + searchTerm) || lowerName.includes('.' + searchTerm)) {
          score = 40;
        }
        
        return { ...func, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.name.length - b.name.length)
      .slice(0, 20);
  });

  // 获取函数名列表
  const fetchFunctionNames = async () => {
    try {
      const response = await axios.post('/api/runtime/functions', {
        dbpath: dbPath,
        includePackage: true
      });
      
      if (response.data?.functions) {
        functionNames.value = response.data.functions;
      } else if (response.data?.functionNames) {
        functionNames.value = response.data.functionNames.map(name => ({
          name,
          package: ''
        }));
      }
    } catch (error) {
      console.error('获取函数名列表失败:', error);
      functionNames.value = [];
    }
  };

  // 处理输入
  const handleInput = () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    searchTimeout = setTimeout(() => {
      selectedIndex.value = 0;
      updateSuggestionsPosition();
    }, 300);
  };

  // 选择建议
  const selectSuggestion = (item) => {
    searchQuery.value = item.name;
    showSuggestions.value = false;
    emit('search', item.name);
  };

  // 延迟隐藏建议列表
  const hideSuggestionsDelayed = () => {
    if (suggestionsTimer) {
      clearTimeout(suggestionsTimer);
    }
    
    suggestionsTimer = setTimeout(() => {
      showSuggestions.value = false;
    }, 200);
  };

  // 高亮匹配文本
  const highlightMatch = (text, query) => {
    if (!query) return text;
    
    try {
      const lowerText = text.toLowerCase();
      const lowerQuery = query.toLowerCase();
      
      if (lowerText.includes(lowerQuery)) {
        const startIndex = lowerText.indexOf(lowerQuery);
        const endIndex = startIndex + lowerQuery.length;
        
        return (
          text.substring(0, startIndex) +
          '<span class="highlight">' +
          text.substring(startIndex, endIndex) +
          '</span>' +
          text.substring(endIndex)
        );
      }
    } catch (e) {
      console.error('高亮匹配文本失败:', e);
    }
    
    return text;
  };

  // 更新建议列表位置
  const updateSuggestionsPosition = () => {
    const inputEl = document.querySelector('.function-search input');
    if (inputEl) {
      const rect = inputEl.getBoundingClientRect();
      suggestionsStyle.value = {
        position: 'fixed',
        top: `${rect.bottom}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 9999,
        maxHeight: `${window.innerHeight - rect.bottom - 20}px`
      };
    }
  };

  // 初始化时获取函数名列表
  fetchFunctionNames();

  return {
    searchQuery,
    showSuggestions,
    filteredSuggestions,
    selectedIndex,
    suggestionsStyle,
    handleInput,
    selectSuggestion,
    hideSuggestionsDelayed,
    highlightMatch,
    updateSuggestionsPosition
  };
} 