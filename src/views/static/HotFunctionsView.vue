<template>
  <div class="static-hot-page">
    <div v-if="!ready" class="card">
      <div class="card-body">
        <div class="placeholder-glow">
          <span class="placeholder col-7"></span>
          <span class="placeholder col-5"></span>
          <span class="placeholder col-8"></span>
        </div>
      </div>
    </div>
    <div v-else>
      <HotFunctionsWidget :db-path="dbPath" />
    </div>
  </div>
</template>

<script>
import HotFunctionsWidget from '../../components/dashboard/HotFunctionsWidget.vue'
import { staticAnalysisAPI } from '../../config/api'

export default {
  name: 'StaticHotFunctionsView',
  components: { HotFunctionsWidget },
  data() {
    return { ready: false, dbPath: '' }
  },
  async mounted() {
    await this.ensureSession()
  },
  methods: {
    async ensureSession() {
      try {
        const ok = await staticAnalysisAPI.checkSession()
        if (ok) { this.ready = true; return }
        this.$router.replace({ path: '/static-analysis', query: { redirect: 'hotfunctions' } })
      } catch (e) {
        console.error('Ensure session failed:', e)
        this.$router.replace({ path: '/static-analysis', query: { redirect: 'hotfunctions' } })
      }
    }
  }
}
</script>

<style scoped>
.static-hot-page { width: 100%; }
</style>

