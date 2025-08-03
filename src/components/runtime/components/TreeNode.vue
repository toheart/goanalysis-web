<template>
  <div class="tree-node">
    <div class="d-flex align-items-center mb-1">
      <span 
        v-if="node.children && node.children.length" 
        class="toggle-icon me-2" 
        @click="toggleCollapse"
      >
        <i :class="isCollapsed ? 'bi bi-plus-square' : 'bi bi-dash-square'"></i>
      </span>
      <span v-else class="ms-3 me-1"></span>
      <span class="node-content" @click="selectFunction(node)">
        {{ node.name }}
        <small v-if="node.value" class="text-muted ms-1">{{ node.value }}</small>
      </span>
    </div>
    <div class="children-container ps-4" v-if="!isCollapsed && node.children && node.children.length">
      <div v-for="(child, index) in node.children" :key="index" class="mt-1">
        <tree-node :node="child" @select-function="onSelectFunction" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, defineComponent } from 'vue';

export default defineComponent({
  name: 'TreeNode',
  props: {
    node: {
      type: Object,
      required: true
    }
  },
  emits: ['select-function'],
  setup(props, { emit }) {
    const isCollapsed = ref(props.node.collapsed || false);
    
    const toggleCollapse = () => {
      isCollapsed.value = !isCollapsed.value;
    };
    
    const selectFunction = (node) => {
      emit('select-function', node);
    };
    
    const onSelectFunction = (node) => {
      emit('select-function', node);
    };
    
    return {
      isCollapsed,
      toggleCollapse,
      selectFunction,
      onSelectFunction
    };
  }
});
</script>

<style>
@import url("../../../assets/styles/components/common/tree-node.css");
</style> 