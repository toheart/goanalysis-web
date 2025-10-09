<template>
  <div class="static-function-search-page">
    <div v-if="!ready" class="card">
      <div class="card-body">
        <div class="placeholder-glow">
          <span class="placeholder col-6"></span>
          <span class="placeholder col-8"></span>
          <span class="placeholder col-5"></span>
        </div>
      </div>
    </div>
    <div v-else>
      <FunctionSearch @view-call-graph="openGraph" />

      <div v-if="graphNodeKey" class="card mt-3">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0"><i class="bi bi-diagram-3 me-2"></i>函数上下游关系</h6>
          <button class="btn btn-sm btn-outline-secondary" @click="closeGraph">
            <i class="bi bi-x"></i>
          </button>
        </div>
        <div class="card-body">
          <FunctionUpDownGraph :function-key="graphNodeKey" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import FunctionSearch from '../../components/explorer/function/FunctionSearch.vue'
import FunctionUpDownGraph from '../../components/explorer/function/FunctionUpDownGraph.vue'
import { staticAnalysisAPI } from '../../config/api'

export default {
  name: 'StaticFunctionSearchView',
  components: { FunctionSearch, FunctionUpDownGraph },
  data() {
    return { ready: false, graphNodeKey: '' }
  },
  async mounted() {
    await this.ensureSession()
    // 如果从详情带着参数跳转，自动打开图
    const { openGraphKey } = this.$route.query
    if (openGraphKey) this.graphNodeKey = openGraphKey
  },
  methods: {
    async ensureSession() {
      try {
        const ok = await staticAnalysisAPI.checkSession()
        if (ok) { this.ready = true; return }
        this.$router.replace({ path: '/static-analysis', query: { redirect: 'search' } })
      } catch (e) {
        console.error('Ensure session failed:', e)
        this.$router.replace({ path: '/static-analysis', query: { redirect: 'search' } })
      }
    },
    openGraph(func) {
      this.graphNodeKey = func.key || func.name
    },
    closeGraph() {
      this.graphNodeKey = ''
    }
  }
}
</script>

<style scoped>
.static-function-search-page { width: 100%; }
</style>


