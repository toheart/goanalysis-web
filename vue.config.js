const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: [],
  configureWebpack: {
    resolve: {
      alias: {
        vue$: 'vue/dist/vue.esm-bundler.js',
      },
    },
  },
  devServer: {
    proxy: {
      '/api': {
        target: 'http://175.178.49.104:8000',
        changeOrigin: true,
      },
    },
  }
})
