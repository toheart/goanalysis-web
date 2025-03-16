import { ref, computed } from 'vue';
import * as echarts from 'echarts';

export function useCallChainAnalysis(functionName, callData) {
  const collapsedNodes = ref(new Set());
  
  // 处理调用数据，添加层级信息
  const processedCallData = computed(() => {
    const result = [];
    
    const processNode = (node, level, parentId) => {
      const processedNode = {
        ...node,
        level,
        parentId
      };
      
      result.push(processedNode);
      
      if (!collapsedNodes.value.has(node.id) && node.children?.length) {
        node.children.forEach(child => {
          processNode(child, level + 1, node.id);
        });
      }
    };
    
    callData.forEach(node => {
      processNode(node, 0, null);
    });
    
    return result;
  });
  
  // 扁平化的调用数据，用于表格展示
  const flattenedCallData = computed(() => {
    return processedCallData.value.map(item => ({
      id: item.id,
      name: item.name,
      package: item.package || '',
      level: item.level,
      callCount: item.callCount || 0,
      avgTime: item.avgTime || 'N/A',
      parentId: item.parentId
    }));
  });
  
  // 导出为CSV
  const exportToCSV = () => {
    if (!flattenedCallData.value.length) {
      alert('没有数据可导出');
      return;
    }
    
    const headers = ['函数名称', '包路径', '调用层级', '调用次数', '平均耗时'];
    const csvData = flattenedCallData.value.map(item => [
      item.name,
      item.package,
      item.level,
      item.callCount,
      item.avgTime
    ]);
    
    csvData.unshift(headers);
    
    const csvString = csvData.map(row => row.map(cell => {
      if (cell && (String(cell).includes(',') || String(cell).includes('"') || String(cell).includes('\n'))) {
        return `"${String(cell).replace(/"/g, '""')}"`;
      }
      return String(cell);
    }).join(',')).join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `函数调用关系_${functionName}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // 将调用数据转换为ECharts树图格式
  const convertToTreeData = (node) => {
    if (!node) return null;
    
    const treeNode = {
      name: node.name,
      package: node.package || '',
      callCount: node.callCount || 0,
      avgTime: node.avgTime || 'N/A',
      value: node.avgTime ? parseFloat(node.avgTime.replace(/[^\d.]/g, '')) : 0,
      children: []
    };
    
    if (node.children?.length) {
      treeNode.children = node.children
        .map(child => convertToTreeData(child))
        .filter(Boolean);
    }
    
    return treeNode;
  };
  
  // 初始化树状图
  const initTreeChart = (chartRef, chartInstance) => {
    if (!chartRef) return;
    
    if (chartInstance.value) {
      chartInstance.value.dispose();
    }
    
    chartInstance.value = echarts.init(chartRef);
    
    const treeData = convertToTreeData(callData[0]);
    const option = {
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
        formatter: (params) => {
          const data = params.data;
          let html = `<div style="font-weight:bold;">${data.name}</div>`;
          
          if (data.package) {
            html += `<div>包路径: ${data.package}</div>`;
          }
          
          if (data.callCount !== undefined) {
            html += `<div>调用次数: ${data.callCount}</div>`;
          }
          
          if (data.avgTime) {
            html += `<div>平均耗时: ${data.avgTime}</div>`;
          }
          
          return html;
        }
      },
      series: [
        {
          type: 'tree',
          name: '函数调用关系',
          data: [treeData],
          top: '1%',
          left: '7%',
          bottom: '1%',
          right: '20%',
          symbolSize: 10,
          orient: 'vertical',
          expandAndCollapse: true,
          initialTreeDepth: 5,
          label: {
            position: 'top',
            rotate: 0,
            verticalAlign: 'middle',
            align: 'right',
            fontSize: 12,
            color: '#555'
          },
          leaves: {
            label: {
              position: 'right',
              verticalAlign: 'middle',
              align: 'left'
            }
          },
          emphasis: {
            focus: 'descendant'
          },
          animationDuration: 550,
          animationDurationUpdate: 750
        }
      ]
    };
    
    chartInstance.value.setOption(option);
  };
  
  // 刷新树状图
  const refreshTreeChart = () => {
    const chartRef = document.querySelector('.tree-chart-container');
    const chartInstance = ref(null);
    initTreeChart(chartRef, chartInstance);
  };
  
  return {
    flattenedCallData,
    exportToCSV,
    initTreeChart,
    refreshTreeChart
  };
} 