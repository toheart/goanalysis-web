<template>
  <div class="function-call-graph">
    <!-- 图表容器 -->
    <div class="modal fade" ref="graphModal" tabindex="-1">
      <div class="modal-dialog modal-fullscreen">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-diagram-3 me-2"></i>函数调用关系图
            </h5>
            <div class="btn-group me-2">
              <button class="btn btn-outline-secondary btn-sm" @click="zoomIn" title="放大">
                <i class="bi bi-zoom-in"></i>
              </button>
              <button class="btn btn-outline-secondary btn-sm" @click="zoomOut" title="缩小">
                <i class="bi bi-zoom-out"></i>
              </button>
              <button class="btn btn-outline-secondary btn-sm" @click="resetZoom" title="重置缩放">
                <i class="bi bi-arrows-angle-contract"></i>
              </button>
            </div>
            <button class="btn-close" @click="closeModal"></button>
          </div>
          <div class="modal-body p-0">
            <!-- 加载状态 -->
            <div v-if="loading" class="loading-overlay">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">加载中...</span>
              </div>
              <p class="mt-3">正在生成调用关系图...</p>
              <div class="progress mt-2" style="width: 250px;">
                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                     role="progressbar" 
                     :style="{width: loadingProgress + '%'}" 
                     :aria-valuenow="loadingProgress" 
                     aria-valuemin="0" 
                     aria-valuemax="100">
                  {{loadingProgress}}%
                </div>
              </div>
              <p class="text-muted small mt-2">大型调用图可能需要较长时间处理</p>
            </div>
            
            <!-- 图表区域 -->
            <div ref="chartContainer" class="chart-container"></div>
            
            <!-- 节点信息卡片 -->
            <div v-if="nodeInfoVisible" class="node-info-card">
              <div class="card-header">
                <h6 class="mb-0">节点信息</h6>
                <button type="button" class="btn-close" @click="clearActiveNode"></button>
              </div>
              <div class="card-body">
                <div><strong>函数名:</strong> {{ nodeInfo.name }}</div>
                <div><strong>函数ID:</strong> {{ nodeInfo.id }}</div>
                <div><strong>执行时间:</strong> {{ nodeInfo.executionTime }}</div>
                <div v-if="nodeInfo.childrenCount > 0">
                  <strong>子节点数:</strong> {{ nodeInfo.childrenCount }}
                </div>
              </div>
            </div>
            
            <!-- 错误提示 -->
            <div v-if="error" class="error-message">
              <i class="bi bi-exclamation-triangle me-2"></i>
              {{ error }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Modal } from 'bootstrap';
import { initChart, handleChartResize, disposeChart, createTreeChartOption } from '../utils/chartUtils';

export default {
  name: 'GidCallGraph',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    gid: {
      type: [String, Number],
      required: true,
      validator: (value) => {
        // 如果是数字，将其转换为字符串后验证
        const strValue = String(value);
        return strValue && strValue.trim().length > 0;
      }
    },
    dbpath: {
      type: String,
      required: true,
      validator: (value) => {
        return typeof value === 'string' && value.trim().length > 0;
      }
    },
    chartData: {
      type: Array,
      default: () => []
    }
  },
  
  setup(props, { emit }) {
    const chartContainer = ref(null);
    const graphModal = ref(null);
    const chart = ref(null);
    const modal = ref(null);
    const loading = ref(false);
    const loadingProgress = ref(10);
    const error = ref(null);
    const scrollPosition = ref(0);
    const hideRootNodes = ref(false);
    const operationInProgress = ref(false);
    const currentOperation = ref('');
    const activeNode = ref(null);
    const nodeInfoVisible = ref(false);
    const nodeInfo = ref({
      name: '',
      id: '',
      executionTime: '',
      childrenCount: 0
    });
    
    // 获取节点颜色
    const getNodeColor = (index) => {
      const colors = {
        0: '#4b96ff', // 蓝色
        1: '#ff7875', // 珊瑚红
        2: '#52c41a', // 绿色
        3: '#faad14', // 橙色
        4: '#ff4d4f', // 红色
        5: '#40a9ff'  // 浅蓝色
      };
      
      return colors[index % Object.keys(colors).length] || colors[0];
    };
    
    // 更新图表
    const updateChartData = (data) => {
      if (chartContainer.value && data) {
        // 销毁旧的图表实例
        if (chart.value) {
          disposeChart(chart.value);
          chart.value = null;
        }
        
        // 模拟加载进度
        loadingProgress.value = 25;
        const progressInterval = setInterval(() => {
          if (loadingProgress.value < 90) {
            loadingProgress.value += Math.floor(Math.random() * 8) + 1;
          }
        }, 300);
        
        // 延迟初始化图表，确保容器完全显示并有尺寸
        setTimeout(() => {
          // 再次检查容器和数据有效性
          if (!chartContainer.value || !data) {
            clearInterval(progressInterval);
            console.error('图表容器或数据不可用');
            error.value = '无法初始化图表，请重试';
            loading.value = false;
            return;
          }
          
          // 确保容器可见且有尺寸
          if (chartContainer.value.offsetWidth === 0 || chartContainer.value.offsetHeight === 0) {
            console.error('图表容器尺寸异常，尝试强制设置尺寸');
            
            // 强制设置容器尺寸并确保可见
            chartContainer.value.style.display = 'block';
            chartContainer.value.style.width = '100%';
            chartContainer.value.style.height = 'calc(100vh - 60px)';
            chartContainer.value.style.minWidth = '800px';
            chartContainer.value.style.minHeight = '600px';
            
            // 允许足够的时间让DOM更新
            setTimeout(() => {
              // 触发窗口resize事件以便于重新计算尺寸
              window.dispatchEvent(new Event('resize'));
              
              // 延迟继续初始化图表
              createChart();
            }, 100);
          } else {
            // 直接创建图表
            createChart();
          }
          
          function createChart() {
            loadingProgress.value = 70;
            
            // 创建新的图表实例
            chart.value = initChart(chartContainer.value, createTreeChartOption(data));
            
            loadingProgress.value = 90;
            
            // 确保图表实例创建成功后再添加事件监听
            if (chart.value) {
              // 监听图表的点击事件
              chart.value.on('click', (params) => {
                if (params.data) {
                  // 展开或收缩节点
                  toggleNodeByClick(params);
                }
              });
  
              // 应用根节点的可见性
              if (hideRootNodes.value) {
                applyRootNodesVisibility();
              }
  
              // 设置完成
              loadingProgress.value = 100;
              
              // 额外延迟执行resize以确保容器已经完全显示
              setTimeout(() => {
                clearInterval(progressInterval);
                if (chart.value) {
                  chart.value.resize();
                  loading.value = false; // 加载完成
                }
              }, 500);
            } else {
              clearInterval(progressInterval);
              console.error('图表初始化失败');
              error.value = '无法创建图表，请检查数据格式或刷新页面重试';
              loading.value = false;
            }
          }
        }, 300); // 延迟300ms，等待Modal渲染完成
      }
    };
    
    // 根据点击切换节点状态
    const toggleNodeByClick = (params) => {
      if (!params || !params.data) {
        console.warn('节点点击事件缺少必要信息');
        return;
      }
      
      if (chart.value) {
        try {
          // 记录当前节点名称，用于后续查找
          const nodeName = params.data.name;
          const seriesIndex = params.seriesIndex || 0;
          const dataIndex = params.dataIndex;
          
          // 检查是否有子节点
          const hasChildren = params.data.children && params.data.children.length > 0;
          
          // 选中当前节点，和之前的选中节点进行比较
          const selectedNodeData = {
            seriesIndex,
            dataIndex,
            name: nodeName,
            value: params.data.value
          };
          
          // 取消之前选中的节点高亮
          if (activeNode.value && chart.value) {
            chart.value.dispatchAction({
              type: 'downplay',
              seriesIndex: activeNode.value.seriesIndex,
              dataIndex: activeNode.value.dataIndex
            });
          }
          
          // 设置当前节点为活跃节点并高亮
          activeNode.value = selectedNodeData;
          chart.value.dispatchAction({
            type: 'highlight',
            seriesIndex: seriesIndex,
            dataIndex: dataIndex
          });
          
          // 显示节点信息
          nodeInfoVisible.value = true;
          nodeInfo.value = {
            name: nodeName,
            id: params.data.value,
            executionTime: params.data.executionTime || '未知',
            childrenCount: hasChildren ? params.data.children.length : 0
          };
          
          // 只有有子节点的节点才能展开/折叠
          if (hasChildren) {
            // 判断当前节点状态
            const isCurrentlyExpanded = !params.data.collapsed; // ECharts中，collapsed为false表示展开状态
            
            // 确定操作类型
            const actionType = isCurrentlyExpanded ? 'treeCollapse' : 'treeExpand';
            
            // 使用明确的展开/折叠操作
            chart.value.dispatchAction({
              type: actionType,
              seriesIndex: seriesIndex,
              dataIndex: dataIndex
            });
            
            console.log(`节点 ${nodeName} ${actionType === 'treeExpand' ? '已展开' : '已折叠'}`);
            
            // 延迟刷新图表，使动画更连贯
            setTimeout(() => {
              if (chart.value) {
                chart.value.resize();
              }
            }, 650);
          } else {
            console.log('该节点没有子节点，无法展开/折叠');
          }
        } catch (err) {
          console.error('点击节点处理失败:', err);
        }
      }
    };
    
    // 清除活跃节点
    const clearActiveNode = () => {
      if (activeNode.value && chart.value) {
        chart.value.dispatchAction({
          type: 'downplay',
          seriesIndex: activeNode.value.seriesIndex,
          dataIndex: activeNode.value.dataIndex
        });
        activeNode.value = null;
        nodeInfoVisible.value = false;
      }
    };
    
    
    // 应用根节点的可见性
    const applyRootNodesVisibility = () => {
      if (!chart.value) return;
      
      const option = chart.value.getOption();
      
      if (!option || !option.series) return;
      
      try {
        // 处理每个系列
        const newSeries = option.series.map(series => {
          // 调整每棵树的根节点显示
          if (hideRootNodes.value) {
            // 隐藏根节点: 通过修改数据结构，让子节点成为新的顶级节点
            if (series.data && series.data.length > 0 && series.data[0].children) {
              return {
                ...series,
                data: series.data[0].children // 使用根节点的子节点作为新的顶级节点
              };
            }
          } else {
            // 恢复原始数据结构，重新加载图表
            // 这需要完整重新加载数据，因为我们无法保存完整的原始数据结构
            // 所以这里只进行部分操作，完整操作需要重新加载图表
          }
          return series;
        });
        
        // 设置新的配置
        chart.value.setOption({
          series: newSeries
        });
        
        // 如果是显示根节点，则需要完全重新加载图表
        if (!hideRootNodes.value) {
          // 使用setTimeout避免状态更新冲突
          setTimeout(() => {
            updateChartData(props.chartData);
          }, 100);
        }
      } catch (err) {
        console.error('切换根节点可见性失败:', err);
        error.value = '切换根节点可见性失败';
      }
    };
    
    
    // 监听图表数据变化
    watch(() => props.chartData, (newData) => {
      // 只有在模态框已显示的情况下才处理数据更新
      if (!props.visible || !modal.value) {
        return;
      }
      
      // 增强数据验证
      if (!newData) {
        console.warn('图表数据为空');
        loading.value = false;
        error.value = '无效的图表数据：数据为空';
        return;
      }
      
      if (!Array.isArray(newData)) {
        console.warn('图表数据不是数组');
        loading.value = false;
        error.value = '无效的图表数据：数据格式错误';
        return;
      }
      
      if (newData.length === 0) {
        console.warn('图表数据数组为空');
        loading.value = false;
        error.value = '无效的图表数据：没有函数调用数据';
        return;
      }
      
      // 检查数据结构
      const isValidData = newData.every(item => {
        return item && typeof item === 'object' && typeof item.name === 'string';
      });
      
      if (!isValidData) {
        console.warn('图表数据结构不正确');
        loading.value = false;
        error.value = '无效的图表数据：数据结构不正确';
        return;
      }
      
      try {
        // 重置错误状态
        loading.value = false;
        error.value = null;
        
        // 在下一个tick更新图表，确保DOM已更新
        nextTick(() => {
          console.log('处理图表数据:', newData.length, '棵树');
          updateChartData(newData);
        });
      } catch (err) {
        console.error('处理图表数据时发生错误:', err);
        error.value = '处理图表数据时发生错误，请检查数据格式';
        loading.value = false;
      }
    }, { deep: true });
    
    // 缩放控制
    const zoomIn = () => {
      if (chart.value) {
        const option = chart.value.getOption();
        const zoom = option.series[0].zoom || 1;
        chart.value.setOption({
          series: [{
            zoom: zoom * 1.2
          }]
        });
      }
    };
    
    const zoomOut = () => {
      if (chart.value) {
        const option = chart.value.getOption();
        const zoom = option.series[0].zoom || 1;
        chart.value.setOption({
          series: [{
            zoom: zoom / 1.2
          }]
        });
      }
    };
    
    const resetZoom = () => {
      if (chart.value) {
        chart.value.setOption({
          series: [{
            zoom: 1
          }]
        });
      }
    };
    
    // 监听窗口大小变化
    const handleResize = () => {
      handleChartResize(chart.value);
    };
    
    // 保存滚动位置
    const saveScrollPosition = () => {
      scrollPosition.value = window.pageYOffset || document.documentElement.scrollTop;
    };

    // 恢复滚动位置
    const restoreScrollPosition = () => {
      setTimeout(() => {
        window.scrollTo(0, scrollPosition.value);
      }, 0);
    };
    
    // 关闭模态框
    const closeModal = () => {
      if (modal.value) {
        modal.value.hide();
      }
    };
    
    onMounted(() => {
      // 初始化模态框
      if (graphModal.value) {
        modal.value = new Modal(graphModal.value, {
          backdrop: 'static',
          keyboard: false
        });
        
        // 监听模态框事件
        graphModal.value.addEventListener('show.bs.modal', () => {
          saveScrollPosition();
        });

        graphModal.value.addEventListener('hidden.bs.modal', () => {
          emit('update:visible', false);
          restoreScrollPosition();
          
          // 修复关闭后无法再次打开的问题：清理状态
          if (chart.value) {
            disposeChart(chart.value);
            chart.value = null;
          }
          
          // 重置所有状态
          loading.value = false;
          error.value = null;
          nodeInfoVisible.value = false;
          activeNode.value = null;
          hideRootNodes.value = false;
          operationInProgress.value = false;
          currentOperation.value = '';
          loadingProgress.value = 10;
        });
      }
      
      // 监听窗口大小变化
      window.addEventListener('resize', handleResize);
    });
    
    onUnmounted(() => {
      // 清理事件监听
      window.removeEventListener('resize', handleResize);
      
      // 销毁图表实例
      if (chart.value) {
        disposeChart(chart.value);
      }
      
      // 销毁模态框实例
      if (modal.value) {
        modal.value.dispose();
      }
    });
    
    // 监听可见性变化
    watch(() => props.visible, (newVal) => {
      if (newVal && modal.value) {
        loading.value = true;
        // 显示模态框
        modal.value.show();
        
        // 添加模态框显示完成的事件监听
        graphModal.value.addEventListener('shown.bs.modal', () => {
          // 修复容器尺寸问题：确保容器有足够的尺寸和可见性
          if (chartContainer.value) {
            chartContainer.value.style.display = 'block';
            chartContainer.value.style.width = '100%';
            chartContainer.value.style.height = 'calc(100vh - 60px)';
            
            // 手动触发一个resize事件，确保容器尺寸已更新
            window.dispatchEvent(new Event('resize'));
          }
          
          // 模态框完全显示后处理图表数据
          const chartData = props.chartData;
          
          // 预先验证数据
          if (!chartData) {
            loading.value = false;
            error.value = '无效的图表数据：数据为空';
            return;
          }
          
          if (!Array.isArray(chartData)) {
            loading.value = false;
            error.value = '无效的图表数据：数据格式错误';
            return;
          }
          
          if (chartData.length === 0) {
            loading.value = false;
            error.value = '无效的图表数据：没有函数调用数据';
            return;
          }
          
          // 验证数据结构
          const isValidData = chartData.every(item => {
            return item && typeof item === 'object' && typeof item.name === 'string';
          });
          
          if (!isValidData) {
            loading.value = false;
            error.value = '无效的图表数据：数据结构不正确';
            return;
          }
          
          console.log('模态框显示完成，准备处理图表数据:', chartData.length, '棵树');
          
          // 延长等待时间，确保DOM完全渲染后再初始化图表
          setTimeout(() => {
            updateChartData(chartData);
          }, 300);
        }, { once: true }); // 只监听一次事件
      } else if (!newVal && modal.value) {
        modal.value.hide();
      }
    });
    
    return {
      chartContainer,
      graphModal,
      loading,
      loadingProgress,
      error,
      closeModal,
      zoomIn,
      zoomOut,
      resetZoom,
      getNodeColor,
      activeNode,
      nodeInfoVisible,
      nodeInfo,
      clearActiveNode
    };
  }
};
</script>

<style scoped>
.function-call-graph {
  width: 100%;
  height: 100%;
}

.chart-container {
  width: 100%;
  height: calc(100vh - 60px);
  background-color: #fff;
  position: relative;
  overflow: hidden;
}

.modal-content {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.modal-body {
  flex: 1;
  padding: 0;
  position: relative;
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 1000;
}

.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 1rem;
  background-color: #fff3f3;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  color: #ff4d4f;
}

.modal-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  padding: 1rem;
  display: flex;
  align-items: center;
}

.modal-header .btn-group {
  margin-left: 1rem;
}

.node-info-card {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 280px;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  transition: all 0.3s ease;
  overflow: hidden;
}

.node-info-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.node-info-card .card-body {
  padding: 15px;
}

.node-info-card .card-body div {
  margin-bottom: 8px;
}

.node-info-card .btn-close {
  padding: 0;
  font-size: 12px;
}
</style> 