<template>
  <div class="function-analysis">
    <FunctionCallTree 
      :db-file-path="dbFilePath"
      :initial-function="initialFunction"
    />
  </div>
</template>

<script>
import FunctionCallTree from './FunctionCallTree.vue';

export default {
  name: 'FunctionAnalysis',
  components: {
    FunctionCallTree
  },
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