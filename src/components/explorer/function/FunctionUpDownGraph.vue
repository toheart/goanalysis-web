<template>
  <div class="updown-graph">
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary"></div>
    </div>
    <div v-else>
      <VueFlow
        ref="flow"
        v-model:nodes="nodes"
        v-model:edges="edges"
        :fit-view-on-init="true"
        :min-zoom="0.2" :max-zoom="2"
        class="vue-flow-container"
        @node-click="onNodeClick"
      >
        <Background pattern-color="#aaa" :gap="16" />
        <Controls />
        <MiniMap />
        <template #node-default="nodeProps">
          <NodeCard :id="nodeProps.id" :data="nodeProps.data" />
        </template>
        <template #node-center="nodeProps">
          <div class="node-center-wrap">
            <div class="center-actions d-flex justify-content-center mb-2">
              <button class="btn btn-sm btn-outline-primary me-2" @click.stop="expandUpAll(nodeProps.id)">展开上游</button>
              <button class="btn btn-sm btn-outline-primary" @click.stop="expandDownAll(nodeProps.id)">展开下游</button>
            </div>
            <NodeCard :id="nodeProps.id" :data="nodeProps.data" />
          </div>
        </template>
      </VueFlow>
    </div>
  </div>
</template>

<script>
import { VueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { staticAnalysisAPI } from '../../../config/api'
import { applyDagreLayout } from '../../explorer/graph/layout/dagreLayout'
import NodeCard from './NodeCard.vue'

export default {
  name: 'FunctionUpDownGraph',
  components: { VueFlow, Background, Controls, MiniMap, NodeCard },
  props: {
    functionKey: { type: String, required: true }
  },
  data() {
    return { loading: false, nodes: [], edges: [], loaded: new Set(), rootKey: '' }
  },
  watch: {
    functionKey: {
      immediate: true,
      async handler(newKey) {
        if (!newKey) return
        await this.buildInitial(newKey)
      }
    }
  },
  methods: {
    async buildInitial(rootKey) {
      this.loading = true
      try {
        const d = await staticAnalysisAPI.getFunctionDetails(rootKey)
        this.nodes = []
        this.edges = []
        this.loaded = new Set([rootKey])
        this.rootKey = rootKey
        // 中心节点
        this.nodes.push(this.makeNode(d.function, 'center', 500, 400))
        // 上游（callers）放左边
        const callers = d.callers || []
        callers.slice(0, 10).forEach((fn, i) => {
          const id = fn.key
          this.nodes.push(this.makeNode(fn, 'caller', 200, 150 + i * 60))
          this.edges.push(this.makeEdge(id, rootKey))
        })
        // 下游（callees）放右边
        const callees = d.callees || []
        callees.slice(0, 10).forEach((fn, i) => {
          const id = fn.key
          this.nodes.push(this.makeNode(fn, 'callee', 800, 150 + i * 60))
          this.edges.push(this.makeEdge(rootKey, id))
        })
        // 布局
        const laid = applyDagreLayout(this.nodes, this.edges, 'LR')
        this.nodes = laid.nodes
      } catch (e) {
        console.error('buildInitial failed:', e)
        await this.$nextTick()
        this.$refs.flow?.fitView({ padding: 0.2 })
      } finally {
        this.loading = false
      }
    },
    makeNode(fn, role, x, y) {
      return {
        id: fn.key,
        type: role === 'center' ? 'center' : 'default',
        position: { x, y },
        data: { title: fn.name, pkg: fn.package, label: fn.name, role },
      }
    },
    makeEdge(source, target) {
      return { 
        id: `e-${source}-${target}`,
        source,
        target,
        style: { stroke: '#8aa0b4', strokeWidth: 2 },
        markerEnd: MarkerType.ArrowClosed
      }
    },
    async expandUp(key) {
      try {
        const d = await staticAnalysisAPI.getFunctionDetails(key)
        const center = this.nodes.find(n => n.id === key)
        if (!center) return
        const centerX = center.position.x
        const centerY = center.position.y
        const callers = (d.callers || []).slice(0, 5)
        callers.forEach((fn, i) => {
          if (!this.nodes.find(n => n.id === fn.key)) this.nodes.push(this.makeNode(fn, 'caller', centerX - 260, centerY - 120 + i * 60))
          if (!this.edges.find(e => e.id === `e-${fn.key}-${key}`)) this.edges.push(this.makeEdge(fn.key, key))
        })
        const laid = applyDagreLayout(this.nodes, this.edges, 'LR')
        this.nodes = laid.nodes
        await this.$nextTick()
        this.$refs.flow?.fitView({ padding: 0.2 })
      } catch (e) { console.error('expandUp failed:', e) }
    },
    async expandUpAll(key) {
      try {
        const d = await staticAnalysisAPI.getFunctionDetails(key)
        const center = this.nodes.find(n => n.id === key)
        if (!center) return
        const centerX = center.position.x
        const centerY = center.position.y
        const callers = d.callers || []
        callers.forEach((fn, i) => {
          if (!this.nodes.find(n => n.id === fn.key)) this.nodes.push(this.makeNode(fn, 'caller', centerX - 260, centerY - 120 + i * 60))
          if (!this.edges.find(e => e.id === `e-${fn.key}-${key}`)) this.edges.push(this.makeEdge(fn.key, key))
        })
        const laid = applyDagreLayout(this.nodes, this.edges, 'LR')
        this.nodes = laid.nodes
        await this.$nextTick()
        this.$refs.flow?.fitView({ padding: 0.2 })
      } catch (e) { console.error('expandUpAll failed:', e) }
    },
    async expandDown(key) {
      try {
        const d = await staticAnalysisAPI.getFunctionDetails(key)
        const center = this.nodes.find(n => n.id === key)
        if (!center) return
        const centerX = center.position.x
        const centerY = center.position.y
        const callees = (d.callees || []).slice(0, 5)
        callees.forEach((fn, i) => {
          if (!this.nodes.find(n => n.id === fn.key)) this.nodes.push(this.makeNode(fn, 'callee', centerX + 260, centerY - 120 + i * 60))
          if (!this.edges.find(e => e.id === `e-${key}-${fn.key}`)) this.edges.push(this.makeEdge(key, fn.key))
        })
        const laid = applyDagreLayout(this.nodes, this.edges, 'LR')
        this.nodes = laid.nodes
        await this.$nextTick()
        this.$refs.flow?.fitView({ padding: 0.2 })
      } catch (e) { console.error('expandDown failed:', e) }
    },
    async expandDownAll(key) {
      try {
        const d = await staticAnalysisAPI.getFunctionDetails(key)
        const center = this.nodes.find(n => n.id === key)
        if (!center) return
        const centerX = center.position.x
        const centerY = center.position.y
        const callees = d.callees || []
        callees.forEach((fn, i) => {
          if (!this.nodes.find(n => n.id === fn.key)) this.nodes.push(this.makeNode(fn, 'callee', centerX + 260, centerY - 120 + i * 60))
          if (!this.edges.find(e => e.id === `e-${key}-${fn.key}`)) this.edges.push(this.makeEdge(key, fn.key))
        })
        const laid = applyDagreLayout(this.nodes, this.edges, 'LR')
        this.nodes = laid.nodes
        await this.$nextTick()
        this.$refs.flow?.fitView({ padding: 0.2 })
      } catch (e) { console.error('expandDownAll failed:', e) }
    },
    async onNodeClick(evt) {
      const key = evt.node?.id
      if (!key || this.loaded.has(key)) return
      try {
        const d = await staticAnalysisAPI.getFunctionDetails(key)
        this.loaded.add(key)
        const centerX = evt.node.position.x
        const centerY = evt.node.position.y
        // 仅当点击的是搜索的焦点函数（rootKey）时，才展开上下游；
        // 其他节点点击只展开下游（callees）
        if (key === this.rootKey) {
          const callers = d.callers || []
          callers.slice(0, 5).forEach((fn, i) => {
            if (!this.nodes.find(n => n.id === fn.key)) this.nodes.push(this.makeNode(fn, 'caller', centerX - 260, centerY - 120 + i * 60))
            if (!this.edges.find(e => e.id === `e-${fn.key}-${key}`)) this.edges.push(this.makeEdge(fn.key, key))
          })
          const callees = d.callees || []
          callees.slice(0, 5).forEach((fn, i) => {
            if (!this.nodes.find(n => n.id === fn.key)) this.nodes.push(this.makeNode(fn, 'callee', centerX + 260, centerY - 120 + i * 60))
            if (!this.edges.find(e => e.id === `e-${key}-${fn.key}`)) this.edges.push(this.makeEdge(key, fn.key))
          })
        } else {
          const callees = d.callees || []
          callees.slice(0, 5).forEach((fn, i) => {
            if (!this.nodes.find(n => n.id === fn.key)) this.nodes.push(this.makeNode(fn, 'callee', centerX + 260, centerY - 120 + i * 60))
            if (!this.edges.find(e => e.id === `e-${key}-${fn.key}`)) this.edges.push(this.makeEdge(key, fn.key))
          })
        }
        // 布局
        const laid = applyDagreLayout(this.nodes, this.edges, 'LR')
        this.nodes = laid.nodes
        await this.$nextTick()
        this.$refs.flow?.fitView({ padding: 0.2 })
      } catch (e) {
        console.error('expand node failed:', e)
      }
    }
  }
}
</script>

<style scoped>
.vue-flow-container { width: 100%; height: 600px; }
</style>


