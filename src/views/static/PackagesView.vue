<template>
  <div class="static-packages-page">
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
      <PackageDependencyView :db-path="dbPath" :root-package-name="rootPackageName" />
    </div>
  </div>
</template>

<script>
import PackageDependencyView from '../PackageDependencyView.vue'
import { staticAnalysisAPI } from '../../config/api'

export default {
  name: 'StaticPackagesView',
  components: { PackageDependencyView },
  data() {
    return { ready: false, dbPath: '', rootPackageName: '' }
  },
  async mounted() {
    await this.ensureSession()
  },
  methods: {
    async ensureSession() {
      try {
        const ok = await staticAnalysisAPI.checkSession()
        if (ok) {
          // 会话就绪后，解析 main 函数所在包作为根包
          try {
            const res = await staticAnalysisAPI.searchFunctions('main')
            const list = Array.isArray(res.functions) ? res.functions : []
            const exact = list.find(f => f && f.name === 'main')
            if (exact && exact.package) {
              this.rootPackageName = exact.package
              console.log('Root package resolved from main:', this.rootPackageName)
            } else {
              console.warn('No exact main function found in current database')
              this.rootPackageName = ''
            }
          } catch (e) {
            console.error('Failed to resolve root package from main:', e)
            this.rootPackageName = ''
          }
          this.ready = true
          return
        }
        this.$router.replace({ path: '/static-analysis', query: { redirect: 'packages' } })
      } catch (e) {
        console.error('Ensure session failed:', e)
        this.$router.replace({ path: '/static-analysis', query: { redirect: 'packages' } })
      }
    }
  }
}
</script>

<style scoped>
.static-packages-page { width: 100%; }
</style>

