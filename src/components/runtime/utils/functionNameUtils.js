/**
 * 函数名称处理工具
 * 用于根据选中的module简化函数名称显示
 */

/**
 * 根据选中的module简化函数名称
 * @param {string} functionName - 完整的函数名称
 * @param {string} selectedModule - 选中的module名称
 * @returns {string} 简化后的函数名称
 */
export function formatFunctionName(functionName, selectedModule) {
  if (!functionName || !selectedModule) {
    return functionName;
  }

  // 如果函数名称以选中的module开头，则移除该module前缀
  if (functionName.startsWith(selectedModule)) {
    const remaining = functionName.substring(selectedModule.length);
    // 移除开头的斜杠
    return remaining.startsWith('/') ? remaining.substring(1) : remaining;
  }

  return functionName;
}

/**
 * 从函数名称中提取package部分
 * @param {string} functionName - 完整的函数名称
 * @param {string} selectedModule - 选中的module名称
 * @returns {string} package名称
 */
export function extractPackageName(functionName, selectedModule) {
  if (!functionName) {
    return '';
  }

  const simplifiedName = formatFunctionName(functionName, selectedModule);
  const lastDotIndex = simplifiedName.lastIndexOf('.');
  
  if (lastDotIndex === -1) {
    return '';
  }

  return simplifiedName.substring(0, lastDotIndex);
}

/**
 * 从函数名称中提取函数名部分
 * @param {string} functionName - 完整的函数名称
 * @returns {string} 函数名
 */
export function extractFunctionName(functionName) {
  if (!functionName) {
    return '';
  }

  const lastDotIndex = functionName.lastIndexOf('.');
  
  if (lastDotIndex === -1) {
    return functionName;
  }

  return functionName.substring(lastDotIndex + 1);
}

/**
 * 检查函数名称是否包含指定的module
 * @param {string} functionName - 完整的函数名称
 * @param {string} moduleName - module名称
 * @returns {boolean} 是否包含该module
 */
export function containsModule(functionName, moduleName) {
  if (!functionName || !moduleName) {
    return false;
  }

  return functionName.startsWith(moduleName);
} 