import { ref, watch } from 'vue';

export function useModuleState() {
  // 选中的module
  const selectedModule = ref('');
  
  // module列表
  const moduleList = ref([]);
  
  // 加载状态
  const loading = ref(false);
  
  // 错误信息
  const error = ref(null);

  // 从localStorage加载选中的module
  const loadSelectedModule = (dbPath) => {
    try {
      if (!dbPath) return;
      
      const storageKey = `runtime_analysis_module_${dbPath}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        selectedModule.value = saved;
      }
    } catch (err) {
      console.error('加载选中的module失败:', err);
    }
  };

  // 保存选中的module到localStorage
  const saveSelectedModule = (module, dbPath) => {
    try {
      if (!dbPath) return;
      
      const storageKey = `runtime_analysis_module_${dbPath}`;
      if (module) {
        localStorage.setItem(storageKey, module);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (err) {
      console.error('保存选中的module失败:', err);
    }
  };

  // 设置选中的module
  const setSelectedModule = (module, dbPath) => {
    selectedModule.value = module;
    saveSelectedModule(module, dbPath);
  };

  // 清除选中的module
  const clearSelectedModule = (dbPath) => {
    selectedModule.value = '';
    saveSelectedModule('', dbPath);
  };

  // 设置module列表
  const setModuleList = (modules) => {
    moduleList.value = modules || [];
  };

  // 检查module是否在列表中
  const isModuleInList = (module) => {
    return moduleList.value.includes(module);
  };

  // 获取可用的module选项（用于下拉选择器）
  const getModuleOptions = () => {
    return moduleList.value.map(module => ({
      value: module,
      label: module
    }));
  };

  // 监听selectedModule变化，自动保存
  watch(selectedModule, () => {
    // 注意：这里不再自动保存，因为需要dbPath参数
    // 保存操作由调用方显式调用
  });

  return {
    // 状态
    selectedModule,
    moduleList,
    loading,
    error,
    
    // 方法
    setSelectedModule,
    clearSelectedModule,
    setModuleList,
    isModuleInList,
    getModuleOptions,
    loadSelectedModule
  };
} 