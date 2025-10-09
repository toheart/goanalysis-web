<template>
  <div class="node-card" :title="data?.pkg || data?.package || ''" :class="{ selected }">
    <Handle type="target" position="left" />
    <div class="node-content">
      <div class="title" :title="data?.title">{{ data?.title }}</div>
    </div>
    <Handle type="source" position="right" />
  </div>
</template>

<script>
import { Handle } from '@vue-flow/core'

export default {
  name: 'NodeCard',
  components: { Handle },
  props: {
    id: { type: String, required: true },
    data: { type: Object, default: () => ({}) },
    selected: { type: Boolean, default: false }
  }
}
</script>

<style scoped>
.node-card {
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  min-width: 240px;
}

.node-card.selected {
  border-color: #4785ff;
  background: rgba(71, 133, 255, 0.05);
  box-shadow: 0 4px 12px rgba(71, 133, 255, 0.25);
}

.node-content {
  padding: 10px 14px;
}

.title {
  font-size: 13px;
  color: #5f6b7a;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 只读模式下隐藏句柄视觉但保留连线功能 */
.vue-flow__handle { opacity: 0; width: 0; height: 0; }
</style>


