const { defineConfig } = require('@vue/cli-service')

// 从环境变量获取API URL，如果没有则使用默认值
const getApiUrl = () => {
  // 在开发模式下，优先使用.env.development中的配置
  if (process.env.NODE_ENV === 'development' && process.env.VUE_APP_API_URL) {
    return process.env.VUE_APP_API_URL;
  }
  // 回退到默认配置
  return process.env.VUE_APP_API_URL || 'http://127.0.0.1:8000';
};

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
        target: getApiUrl(),
        changeOrigin: true,
      },
    },
  }
})
