<template>
  <div class="function-analysis">
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0"><i class="bi bi-info-circle me-2"></i>函数分析</h5>
      </div>
      <div class="card-body">
        <div class="text-center py-5">
          <i class="bi bi-tools display-4 text-muted"></i>
          <h4 class="mt-3">功能开发中</h4>
          <p class="text-muted">函数分析功能正在重新设计，敬请期待</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FunctionAnalysis',
  props: {
    dbFilePath: {
      type: String,
      required: true
    },
    initialFunction: {
      type: Object,
      default: null
    }
  }
};
</script>

<style scoped>
.function-analysis {
  max-width: 100%;
}
</style> 