<template>
  <BaseEdge
    :id="id"
    :path="path[0]"
    :style="{ stroke: '#8aa0b4', strokeWidth: 2, ...style }"
    marker-end="url(#vue-flow__arrowhead)"
  />
</template>

<script>
import { BaseEdge, getBezierPath } from '@vue-flow/core'

export default {
  name: 'DirectedEdge',
  components: { BaseEdge },
  props: {
    id: { type: String, required: true },
    sourceX: { type: Number, required: true },
    sourceY: { type: Number, required: true },
    targetX: { type: Number, required: true },
    targetY: { type: Number, required: true },
    sourcePosition: { type: String, required: true },
    targetPosition: { type: String, required: true },
    style: { type: Object, default: () => ({}) },
    data: { type: Object, default: () => ({}) }
  },
  computed: {
    path() {
      return getBezierPath(this)
    }
  }
}
</script>


