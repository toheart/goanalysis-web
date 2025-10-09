<template>
  <div class="static-overview-page">
    <div v-if="!ready" class="card">
      <div class="card-body">
        <div class="placeholder-glow">
          <span class="placeholder col-4"></span>
          <span class="placeholder col-7"></span>
          <span class="placeholder col-5"></span>
        </div>
      </div>
    </div>
    <div v-else>
      <GlobalStatsWidget :db-path="dbPath" @database-setup-needed="ensureSession" />
    </div>
  </div>
</template>

<script>
import GlobalStatsWidget from '../../components/dashboard/GlobalStatsWidget.vue'
import { staticAnalysisAPI } from '../../config/api'

export default {
  name: 'StaticOverviewView',
  components: { GlobalStatsWidget },
  data() {
    return {
      ready: false,
      dbPath: ''
    }
  },
  async mounted() {
    await this.ensureSession()
  },
  methods: {
    async ensureSession() {
      try {
        // 尝试访问统计接口以判断会话是否已就绪
        const ok = await staticAnalysisAPI.checkSession()
        if (ok) {
          this.ready = true
          return
        }
        // 未就绪则引导回选择页，并记录返回目标
        this.$router.replace({ path: '/static-analysis', query: { redirect: 'overview' } })
      } catch (e) {
        console.error('Ensure session failed:', e)
        this.$router.replace({ path: '/static-analysis', query: { redirect: 'overview' } })
      }
    }
  }
}
</script>

<style scoped>
.static-overview-page { width: 100%; }
</style>

