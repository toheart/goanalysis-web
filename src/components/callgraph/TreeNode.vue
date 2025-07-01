<template>
  <tr :class="getRowClass()" @click="handleRowClick">
    <td class="function-name-cell">
      <div class="function-name-content" :style="{ paddingLeft: (level * 20) + 'px' }">
        <!-- 展开/收起按钮 -->
        <button 
          v-if="node.isExpandable" 
          class="expand-btn"
          @click.stop="toggleExpand"
          :disabled="expanding"
          type="button"
        >
          <span v-if="expanding" class="spinner-border spinner-border-sm" role="status"></span>
          <i v-else :class="node.isExpanded ? 'bi bi-chevron-down' : 'bi bi-chevron-right'"></i>
        </button>
        <span v-else class="expand-placeholder"></span>
        
        <!-- 节点图标 -->
        <i :class="getNodeIcon()" class="node-icon me-2"></i>
        
        <!-- 函数名称 -->
        <span class="function-name" :class="getNameClass()">{{ node.name }}</span>
        
        <!-- 类型标签 -->
        <span v-if="node.type && node.type !== 'root'" class="badge ms-2" :class="getTypeClass()">
          {{ getTypeLabel() }}
        </span>
      </div>
    </td>
    
    <!-- 包名 -->
    <td class="package-cell">
      <span v-if="node.package" class="package-name">{{ node.package }}</span>
      <span v-else class="text-muted">-</span>
    </td>
    
    <!-- 调用次数 -->
    <td class="call-count-cell">
      <span v-if="node.callCount > 0" class="badge bg-primary rounded-pill">{{ node.callCount }}</span>
      <span v-else class="text-muted">-</span>
    </td>
    
    <!-- 操作 -->
    <td class="action-cell">
      <div class="action-buttons">
        <button 
          v-if="node.type !== 'upstream_group' && node.type !== 'downstream_group'"
          class="btn btn-sm btn-outline-primary"
          @click.stop="analyzeFunction"
          :disabled="!node.key && !node.name"
          title="分析此函数"
        >
          <i class="bi bi-search"></i>
        </button>
        <button 
          v-if="node.fullName"
          class="btn btn-sm btn-outline-secondary ms-1"
          @click.stop="copyToClipboard"
          title="复制函数路径"
        >
          <i class="bi bi-clipboard"></i>
        </button>
      </div>
    </td>
  </tr>
  
  <!-- 子节点 -->
  <template v-if="node.isExpanded && node.children && node.children.length > 0">
    <tree-node
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :level="level + 1"
      @expand="$emit('expand', $event)"
      @collapse="$emit('collapse', $event)"
      @analyze-function="$emit('analyze-function', $event)"
    />
  </template>
</template>

<script>
export default {
  name: 'TreeNode',
  props: {
    node: {
      type: Object,
      required: true
    },
    level: {
      type: Number,
      default: 0
    }
  },
  emits: ['expand', 'collapse', 'analyze-function'],
  data() {
    return {
      expanding: false
    };
  },
  methods: {
    // 切换展开/收起
    async toggleExpand() {
      if (this.expanding) return;
      
      if (this.node.isExpanded) {
        this.$emit('collapse', this.node);
      } else {
        this.expanding = true;
        try {
          await this.$emit('expand', this.node);
        } finally {
          this.expanding = false;
        }
      }
    },
    
    // 处理行点击
    handleRowClick() {
      if (this.node.isExpandable) {
        this.toggleExpand();
      }
    },
    
    // 分析函数
    analyzeFunction() {
      if (this.node.key || this.node.name) {
        // 触发父组件重新分析这个函数
        this.$emit('analyze-function', {
          key: this.node.key,
          name: this.node.name,
          package: this.node.package,
          callCount: this.node.callCount
        });
      }
    },
    
    // 复制到剪贴板
    async copyToClipboard() {
      try {
        await navigator.clipboard.writeText(this.node.fullName || this.node.name);
        this.$message?.success('已复制到剪贴板');
      } catch (error) {
        console.error('复制失败:', error);
        this.$message?.error('复制失败');
      }
    },
    
    // 获取行样式类
    getRowClass() {
      const classes = ['tree-row'];
      
      if (this.node.type === 'root') {
        classes.push('root-row');
      } else if (this.node.type === 'upstream_group' || this.node.type === 'downstream_group') {
        classes.push('group-row');
      } else if (this.node.type === 'upstream') {
        classes.push('upstream-row');
      } else if (this.node.type === 'downstream') {
        classes.push('downstream-row');
      }
      
      if (this.node.isExpandable) {
        classes.push('expandable-row');
      }
      
      return classes.join(' ');
    },
    
    // 获取节点图标
    getNodeIcon() {
      switch (this.node.type) {
        case 'root':
          return 'bi bi-star-fill text-warning';
        case 'upstream_group':
          return 'bi bi-arrow-down-circle text-success';
        case 'downstream_group':
          return 'bi bi-arrow-up-circle text-info';
        case 'upstream':
          return 'bi bi-arrow-down text-success';
        case 'downstream':
          return 'bi bi-arrow-up text-info';
        default:
          return 'bi bi-code-square text-primary';
      }
    },
    
    // 获取名称样式类
    getNameClass() {
      const classes = [];
      
      if (this.node.type === 'root') {
        classes.push('fw-bold', 'text-primary');
      } else if (this.node.type === 'upstream_group' || this.node.type === 'downstream_group') {
        classes.push('fw-semibold', 'text-secondary');
      }
      
      return classes.join(' ');
    },
    
    // 获取类型标签样式
    getTypeClass() {
      switch (this.node.type) {
        case 'upstream':
          return 'bg-success';
        case 'downstream':
          return 'bg-info';
        default:
          return 'bg-secondary';
      }
    },
    
    // 获取类型标签文本
    getTypeLabel() {
      switch (this.node.type) {
        case 'upstream':
          return '调用者';
        case 'downstream':
          return '被调用';
        case 'upstream_group':
          return '调用者组';
        case 'downstream_group':
          return '被调用组';
        default:
          return '';
      }
    }
  }
};
</script>

<style scoped>
.tree-row {
  cursor: pointer;
  transition: all 0.2s ease;
}

.tree-row:hover {
  background-color: #f8f9fa;
}

.root-row {
  background-color: #fff3cd;
  border-left: 4px solid #ffc107;
}

.root-row:hover {
  background-color: #ffeaa7;
}

.group-row {
  background-color: #e2e3e5;
  font-weight: 600;
}

.group-row:hover {
  background-color: #d6d8db;
}

.upstream-row {
  border-left: 3px solid #28a745;
}

.downstream-row {
  border-left: 3px solid #17a2b8;
}

.expandable-row {
  cursor: pointer;
}

.function-name-content {
  display: flex;
  align-items: center;
  min-height: 24px;
}

.expand-btn {
  background: none;
  border: none;
  padding: 2px 6px;
  margin-right: 8px;
  border-radius: 4px;
  color: #6c757d;
  transition: all 0.2s ease;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-btn:hover {
  background-color: #e9ecef;
  color: #495057;
}

.expand-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.expand-placeholder {
  width: 24px;
  height: 24px;
  margin-right: 8px;
}

.node-icon {
  font-size: 0.9rem;
  min-width: 16px;
}

.function-name {
  font-size: 0.9rem;
  line-height: 1.4;
  word-break: break-word;
}

.package-name {
  font-size: 0.85rem;
  color: #6c757d;
  font-family: 'Courier New', monospace;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-buttons .btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  line-height: 1;
}

.function-name-cell {
  max-width: 0;
  width: 50%;
}

.package-cell {
  width: 20%;
}

.call-count-cell {
  width: 15%;
  text-align: center;
}

.action-cell {
  width: 15%;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .function-name-content {
    font-size: 0.8rem;
  }
  
  .action-buttons .btn {
    padding: 0.125rem 0.25rem;
    font-size: 0.7rem;
  }
  
  .package-name {
    font-size: 0.75rem;
  }
}

/* 表格行边框 */
.tree-row td {
  border-top: 1px solid #dee2e6;
  vertical-align: middle;
  padding: 0.75rem 0.5rem;
}

.tree-row:first-child td {
  border-top: none;
}

/* 深度层级缩进指示线 */
.function-name-content::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: #dee2e6;
  margin-left: calc(var(--level, 0) * 20px + 12px);
}

/* 展开状态的子项连接线 */
.tree-row.expandable-row.expanded .function-name-content::after {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 8px;
  height: 1px;
  background-color: #dee2e6;
  margin-left: calc(var(--level, 0) * 20px + 12px);
}
</style> 