import * as echarts from 'echarts';

// 定义颜色变量
const colors = {
  primary: '#4b96ff',      // 主色调：蓝色
  secondary: '#ff7875',    // 互补色：珊瑚红
  success: '#52c41a',      // 成功色：绿色
  warning: '#faad14',      // 警告色：橙色
  danger: '#ff4d4f',       // 危险色：红色
  info: '#40a9ff',         // 信息色：浅蓝色
  textPrimary: '#1f1f1f',  // 主要文本色
  textSecondary: '#666666' // 次要文本色
};

// 格式化图表数据
export function formatChartData(data) {
  return data;
}

// 初始化图表
export function initChart(container, option) {
  if (!container) {
    console.error('图表容器不存在');
    return null;
  }

  try {
    // 检查容器尺寸
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.error('图表容器尺寸异常：', { width: container.offsetWidth, height: container.offsetHeight });
      
      // 尝试调整容器大小并强制显示
      container.style.display = 'block';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.minWidth = '800px';
      container.style.minHeight = '600px';
      
      // 强制浏览器回流以更新尺寸
      void container.offsetHeight;
      
      // 如果还是没有尺寸，则给出警告但继续尝试初始化
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        console.warn('调整后容器尺寸仍然异常，将尝试使用固定尺寸初始化图表');
      }
    }
    
    // 检查选项是否有效
    if (!option || typeof option !== 'object') {
      console.error('图表配置无效');
      return null;
    }

    // 创建图表实例，如果容器没有尺寸，使用备选方案
    let chart;
    try {
      chart = echarts.init(container);
    } catch (e) {
      console.error('常规初始化失败，尝试备选方法:', e);
      
      // 备选方案：使用固定尺寸初始化
      container.style.width = '800px';
      container.style.height = '600px';
      container.style.position = 'relative';
      container.style.visibility = 'visible';
      
      // 强制浏览器回流
      void container.offsetHeight;
      
      chart = echarts.init(container);
    }
    
    // 设置图表配置
    chart.setOption(option);
    
    // 给图表一个临时ID以便于调试
    chart.__debugId = 'echarts_' + Date.now();
    console.log('图表初始化成功:', chart.__debugId);
    
    // 添加自动resize的功能
    const observer = new ResizeObserver(() => {
      chart.resize();
    });
    
    // 观察容器尺寸变化
    observer.observe(container);
    
    // 保存observer以便后续清理
    chart.__resizeObserver = observer;
    
    // 立即执行一次resize确保图表完全适应容器
    chart.resize();
    
    return chart;
  } catch (error) {
    console.error('初始化图表失败:', error);
    return null;
  }
}

// 处理图表大小调整
export function handleChartResize(chart) {
  if (chart) {
    try {
      chart.resize();
    } catch (e) {
      console.error('调整图表大小失败:', e);
    }
  }
}

// 销毁图表实例
export function disposeChart(chart) {
  if (chart) {
    try {
      // 清理ResizeObserver
      if (chart.__resizeObserver) {
        chart.__resizeObserver.disconnect();
        chart.__resizeObserver = null;
      }
      
      chart.dispose();
      console.log('图表已销毁:', chart.__debugId);
    } catch (e) {
      console.error('销毁图表失败:', e);
    }
  }
}

// 创建树形图配置
export const createTreeChartOption = (data) => {
  // 确保数据是数组且非空
  if (!Array.isArray(data) || data.length === 0) {
    return {
      series: [{
        type: 'tree',
        data: [{
          name: '暂无数据',
          value: '',
        }],
        layout: 'orthogonal',
        orient: 'LR',
        label: {
          show: true
        }
      }]
    };
  }
  
  // 配置全局样式
  const globalStyle = {
    symbol: 'emptyCircle',
    symbolSize: 16,
    itemStyle: {
      color: '#fff',
      borderWidth: 1.5,
      shadowBlur: 4,
      shadowColor: 'rgba(0, 0, 0, 0.2)'
    },
    lineStyle: {
      width: 1.5,
      curveness: 0.1,
      opacity: 0.7,
      shadowBlur: 2,
      shadowColor: 'rgba(0, 0, 0, 0.15)'
    },
    label: {
      show: true,
      position: 'right',
      formatter: (params) => formatLabel(params),
      backgroundColor: 'rgba(255,255,255,0.95)',
      padding: [5, 8],
      borderRadius: 4,
      distance: 12,
      shadowColor: 'rgba(0, 0, 0, 0.15)',
      shadowBlur: 4,
      shadowOffsetX: 1,
      shadowOffsetY: 1,
      rich: {
        title: {
          fontSize: 13,
          fontWeight: 'bold',
          lineHeight: 18,
          color: colors.textPrimary
        },
        time: {
          fontSize: 12,
          color: colors.primary,
          lineHeight: 16
        },
        icon: {
          fontSize: 16,
          fontWeight: 'bold',
          color: colors.primary,
          lineHeight: 18,
          align: 'center',
          padding: [0, 4, 0, 0]
        }
      }
    }
  };
  
  // 公共提示框配置
  const tooltipConfig = {
    trigger: 'item',
    triggerOn: 'mousemove',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: colors.primary,
    borderWidth: 1,
    padding: [12, 16],
    textStyle: {
      color: colors.textPrimary
    },
    formatter: (params) => {
      const { name, value } = params.data;
      const executionTime = params.data.executionTime || '未知';
      let childCount = '';
      if (params.data.children && params.data.children.length > 0) {
        childCount = `<div>子节点数: <span style="color:${colors.primary};font-weight:bold">${params.data.children.length}</span></div>`;
      }
      return `
        <div style="font-weight: bold; font-size:14px; margin-bottom: 10px; color: ${colors.primary}; border-bottom:1px solid #eee; padding-bottom:5px;">
          ${name || '未知函数'}
        </div>
        <div style="color: ${colors.textSecondary}">
          <div>函数ID: <span style="font-family:monospace;color:#333">${value || '未知'}</span></div>
          <div>执行时间: <span style="color:${colors.secondary};font-weight:bold">${executionTime}</span></div>
          ${childCount}
        </div>
      `;
    },
    extraCssText: 'box-shadow: 0 3px 12px rgba(0,0,0,0.15); border-radius: 6px;'
  };
  
  // 如果有多棵树
  if (data.length > 1) {
    return createMultipleTreeOption(data, globalStyle, tooltipConfig);
  }
  
  // 单棵树的配置
  return createSingleTreeOption(data, globalStyle, tooltipConfig);
};

// 创建多棵树的图表配置
function createMultipleTreeOption(data, globalStyle, tooltipConfig) {
  const treeCount = data.length;
  const seriesArray = [];
  
  // 创建多个series，每个树单独占一个series
  for (let i = 0; i < treeCount; i++) {
    // 根据树的数量选择布局模式
    // 修改：所有布局都使用正交布局，从左向右展示
    const layout = 'orthogonal';
    const orient = 'LR';
    
    // 计算每棵树的位置
    let top, left, height, width;
    const treeColor = getTreeColor(i);
    
    if (treeCount <= 2) {
      // 如果只有1-2棵树，垂直排列
      top = `${5 + (90 / treeCount) * i}%`;
      left = '10%';
      height = `${90 / treeCount - 5}%`;
      width = '80%';
    } else if (treeCount <= 4) {
      // 如果有3-4棵树，2x2网格排列
      top = i < 2 ? '5%' : '55%';
      left = i % 2 === 0 ? '5%' : '55%';
      height = '40%';
      width = '40%';
    } else {
      // 如果有更多树，使用动态网格
      const cols = treeCount <= 6 ? 2 : 3;
      const rows = Math.ceil(treeCount / cols);
      const colIndex = i % cols;
      const rowIndex = Math.floor(i / cols);
      
      // 计算每个单元格的大小
      const cellHeight = 95 / rows;
      const cellWidth = 95 / cols;
      
      top = `${2.5 + cellHeight * rowIndex}%`;
      left = `${2.5 + cellWidth * colIndex}%`;
      height = `${cellHeight - 5}%`;
      width = `${cellWidth - 5}%`;
    }
    
    // 所有布局都使用polyline边缘形状
    const edgeShape = 'polyline';
    
    // 创建单个树的系列配置
    seriesArray.push({
      type: 'tree',
      name: `树 ${i+1}`,
      data: [data[i]], // 每个series只包含一棵树
      top: top,
      left: left,
      height: height,
      width: width,
      symbolSize: globalStyle.symbolSize,
      
      // 布局设置
      layout: layout,
      orient: orient,
      initialTreeDepth: 2, // 默认展开两层
      
      // 交互相关配置
      roam: true,
      expandAndCollapse: true,
      animationDuration: 550,
      animationDurationUpdate: 750,
      animationEasingUpdate: 'elasticOut',
      edgeShape: edgeShape,
      edgeForkPosition: '50%',
      nodeGap: 35,
      layerPadding: 150,
      
      // 高亮效果
      emphasis: {
        focus: 'descendant',
        itemStyle: {
          color: '#fff',
          borderColor: treeColor,
          borderWidth: 3,
          shadowBlur: 8,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        },
        lineStyle: {
          width: 2.5,
          color: treeColor,
          shadowBlur: 3,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        },
        label: {
          fontWeight: 'bold',
          backgroundColor: 'rgba(255,255,255,0.98)',
          shadowBlur: 5,
          shadowColor: 'rgba(0, 0, 0, 0.2)'
        }
      },
      
      // 标签样式
      label: {
        ...globalStyle.label,
        position: 'right'
      },
      
      // 节点样式
      itemStyle: {
        ...globalStyle.itemStyle,
        borderColor: treeColor
      },
      
      // 连线样式
      lineStyle: {
        ...globalStyle.lineStyle,
        color: `rgba(${hexToRgb(treeColor)}, 0.6)`,
        curveness: 0.1
      },
      
      // 叶子节点样式
      leaves: {
        label: {
          ...globalStyle.label,
          position: 'right'
        },
        itemStyle: {
          color: '#fff',
          borderColor: treeColor,
          borderWidth: 1.5,
          shadowBlur: 3,
          shadowColor: 'rgba(0, 0, 0, 0.15)'
        }
      }
    });
  }
  
  return {
    backgroundColor: '#fff',
    tooltip: tooltipConfig,
    
    // 为每棵树添加可选择的图例
    legend: {
      show: treeCount > 1,
      top: '10px',
      type: 'scroll',
      data: data.map((_, i) => `树 ${i+1}`),
      selected: data.reduce((acc, _, i) => {
        acc[`树 ${i+1}`] = true;
        return acc;
      }, {}),
      textStyle: {
        color: colors.textPrimary
      },
      icon: 'circle'
    },
    
    // 删除工具箱功能
    
    series: seriesArray
  };
}

// 创建单棵树的图表配置
function createSingleTreeOption(data, globalStyle, tooltipConfig) {
  const treeColor = colors.primary;
  
  return {
    backgroundColor: '#fff',
    tooltip: tooltipConfig,
    
    // 删除工具箱功能
    
    series: [{
      type: 'tree',
      data: data,
      top: '5%',
      left: '10%',
      bottom: '5%',
      right: '20%',
      symbolSize: globalStyle.symbolSize,
      
      // 布局设置
      layout: 'orthogonal',
      orient: 'LR',
      initialTreeDepth: 2,
      
      // 交互相关配置
      roam: true,
      expandAndCollapse: true,
      animationDuration: 550,
      animationDurationUpdate: 750,
      animationEasingUpdate: 'elasticOut',
      edgeShape: 'polyline',
      edgeForkPosition: '50%',
      nodeGap: 35,
      layerPadding: 150,
      
      // 高亮效果
      emphasis: {
        focus: 'descendant',
        itemStyle: {
          color: '#fff',
          borderColor: treeColor,
          borderWidth: 3,
          shadowBlur: 8,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        },
        lineStyle: {
          width: 2.5,
          color: treeColor,
          shadowBlur: 3,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        },
        label: {
          fontWeight: 'bold',
          backgroundColor: 'rgba(255,255,255,0.98)',
          shadowBlur: 5,
          shadowColor: 'rgba(0, 0, 0, 0.2)'
        }
      },
      
      // 标签样式
      label: globalStyle.label,
      
      // 节点样式
      itemStyle: {
        ...globalStyle.itemStyle,
        borderColor: treeColor
      },
      
      // 连线样式
      lineStyle: {
        ...globalStyle.lineStyle,
        color: `rgba(${hexToRgb(treeColor)}, 0.6)`
      },
      
      // 叶子节点样式
      leaves: {
        label: globalStyle.label,
        itemStyle: {
          color: '#fff',
          borderColor: treeColor,
          borderWidth: 1.5,
          shadowBlur: 3,
          shadowColor: 'rgba(0, 0, 0, 0.15)'
        }
      }
    }]
  };
}

// 根据索引生成不同的颜色
const getTreeColor = (index) => {
  const colorPalette = [
    colors.primary,    // 蓝色
    colors.secondary,  // 珊瑚红
    colors.success,    // 绿色
    colors.warning,    // 橙色
    colors.danger,     // 红色
    colors.info        // 浅蓝色
  ];
  
  return colorPalette[index % colorPalette.length];
};

// 格式化标签
const formatLabel = (params) => {
  if (!params || !params.data) {
    return '未知';
  }
  
  const { name, executionTime, children } = params.data;
  if (!name) {
    return '未知函数';
  }
  
  // 提取函数名（只保留最后一部分）
  const funcName = name.split('.').pop() || name;
  
  // 截断过长的函数名
  const maxLength = 20;
  const displayName = funcName.length > maxLength 
    ? funcName.substring(0, maxLength) + '...' 
    : funcName;
  
  // 添加不同的标记，表示是否有子节点
  const hasChildren = children && children.length > 0;
  const icon = hasChildren ? '⊕' : '○'; // 使用简单字符，⊕表示可展开节点，○表示叶子节点
  
  // 使用富文本格式化
  if (executionTime) {
    return `{icon|${icon}} {title|${displayName}}\n{time|⏱ ${executionTime}}`;
  }
  
  return `{icon|${icon}} {title|${displayName}}`;
};

// 辅助函数：将hex颜色转换为RGB
function hexToRgb(hex) {
  // 移除可能的#前缀
  hex = hex.replace(/^#/, '');
  
  // 解析RGB颜色
  let bigint = parseInt(hex, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;
  
  return `${r}, ${g}, ${b}`;
}