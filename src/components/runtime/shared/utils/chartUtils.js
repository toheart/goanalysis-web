import * as echarts from 'echarts';

// 创建树状图配置
export const createTreeChartOption = (treeData) => {
  return {
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
};

// 创建热点路径图表配置
export const createHotPathChartOption = (data, mode = 'time') => {
  return {
    title: {
      text: mode === 'time' ? '函数调用路径执行时间分析' : '函数调用路径频次分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params) => {
        const data = params[0].data;
        return `${data.name}<br/>${mode === 'time' ? '执行时间' : '调用次数'}: ${data.value}${mode === 'time' ? 'ms' : ''}`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: mode === 'time' ? '执行时间(ms)' : '调用次数',
      nameLocation: 'end'
    },
    yAxis: {
      type: 'category',
      data: data.map(item => {
        const name = item.name;
        if (name.length > 40) {
          return name.substring(0, 37) + '...';
        }
        return name;
      })
    },
    series: [
      {
        name: mode === 'time' ? '执行时间' : '调用次数',
        type: 'bar',
        data: data,
        itemStyle: {
          color: (params) => {
            const colorList = ['#c23531', '#d48265', '#91c7ae', '#749f83', '#ca8622'];
            return colorList[params.dataIndex % colorList.length];
          }
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params) => {
            return mode === 'time' ? params.value + 'ms' : params.value;
          }
        }
      }
    ]
  };
};

// 创建饼图配置
export const createPieChartOption = (data, title) => {
  return {
    title: {
      text: title,
      left: 'center'
    },
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: data
      }
    ]
  };
};

// 初始化图表
export const initChart = (chartRef, option) => {
  if (!chartRef) return null;
  
  const chart = echarts.init(chartRef);
  chart.setOption(option);
  
  return chart;
};

// 处理图表大小调整
export const handleChartResize = (chart) => {
  if (chart) {
    chart.resize();
  }
};

// 销毁图表
export const disposeChart = (chart) => {
  if (chart) {
    chart.dispose();
  }
}; 