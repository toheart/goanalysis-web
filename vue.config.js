const { defineConfig } = require('@vue/cli-service')

// 从环境变量获取API URL，如果没有则使用默认值
const getApiUrl = () => {
  // 在开发模式下，优先使用.env.development中的配置
  if (process.env.NODE_ENV === 'development' && process.env.VUE_APP_API_URL) {
    return process.env.VUE_APP_API_URL;
  }
  // 回退到默认配置
  return process.env.VUE_APP_API_URL || 'http://localhost:8081';
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
        secure: false,
        // 修正Cookie域名重写配置
        cookieDomainRewrite: {
          '192.168.141.128': 'localhost',
          '*': 'localhost'
        },
        // 修正Cookie路径重写
        cookiePathRewrite: {
          '*': '/'
        },
        onProxyReq: (proxyReq, req, res) => {
          // 确保代理请求包含原始的cookie
          if (req.headers.cookie) {
            proxyReq.setHeader('cookie', req.headers.cookie);
          }
          // 设置正确的Origin头
          proxyReq.setHeader('Origin', getApiUrl());
        },
        onProxyRes: (proxyRes, req, res) => {
          // 处理Set-Cookie响应头，确保Cookie能在localhost域下工作
          const setCookieHeaders = proxyRes.headers['set-cookie'];
          if (setCookieHeaders) {
            proxyRes.headers['set-cookie'] = setCookieHeaders.map(cookie => {
              // 移除Domain限制或设置为localhost
              return cookie
                .replace(/Domain=[^;]+;?\s*/gi, 'Domain=localhost; ')
                .replace(/Secure;?\s*/gi, '') // 开发环境移除Secure标志
                .replace(/SameSite=None/gi, 'SameSite=Lax'); // 调整SameSite策略
            });
          }
        }
      },
    },
  }
})
