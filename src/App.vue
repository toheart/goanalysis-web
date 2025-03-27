<template>
  <div id="app" class="modern-theme">
    <nav class="navbar navbar-expand-lg navbar-glass">
      <div class="container-fluid">
        <router-link to="/" class="navbar-brand glow-text">
          <i class="bi bi-code-square me-2"></i>{{ $t('nav.title', 'Go代码分析平台') }}
        </router-link>
        <button class="navbar-toggler custom-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
          aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav">
            <li class="nav-item">
              <router-link to="/" class="nav-link nav-button" exact-active-class="active">
                <i class="bi bi-house-door me-1"></i>{{ $t('nav.home') }}
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/allgids" class="nav-link nav-button" active-class="active">
                <i class="bi bi-activity me-1"></i>{{ $t('nav.runtimeAnalysis') }}
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/static-analysis" class="nav-link nav-button" active-class="active">
                <i class="bi bi-diagram-3 me-1"></i>{{ $t('nav.staticAnalysis') }}
              </router-link>
            </li>
          </ul>
          
          <ul class="navbar-nav ms-auto">
            <router-link to="/language" class="nav-link nav-button" active-class="active">
              <i class="bi bi-globe2 me-1"></i>{{ $t('welcome.setlanguage.button') }}
            </router-link>
          </ul>
        </div>
      </div>
    </nav>
    <main class="container mt-4 fade-in">
      <router-view></router-view>
    </main>
    <footer class="footer mt-5 py-3">
      <div class="container text-center">
        <span class="footer-text">{{ $t('nav.title', 'Go代码分析平台') }} &copy; 2024</span>
      </div>
    </footer>
  </div>
</template>

<script>
import { useI18n } from 'vue-i18n'
import { ref, onMounted, watch, nextTick } from 'vue'

export default {
  setup() {
    const { locale, t } = useI18n({ useScope: 'global' })
    const currentLanguage = ref(locale.value)
    
    // 监听语言变化
    onMounted(() => {
      // 从localStorage读取语言设置
      const savedLocale = localStorage.getItem('locale')
      if (savedLocale) {
        changeLanguage(savedLocale)
      }
    })
    
    // 监听locale变化，确保currentLanguage同步更新
    watch(locale, (newVal) => {
      currentLanguage.value = newVal
    })
    
    // 切换语言
    const changeLanguage = async (lang) => {
      console.log('App.vue - Changing language to:', lang)
      
      // 先更新状态
      locale.value = lang
      currentLanguage.value = lang
      localStorage.setItem('locale', lang)
      
      // 设置HTML lang属性
      document.documentElement.setAttribute('lang', lang)
      
      // 等待下一个DOM更新周期
      await nextTick()
      
      // 触发自定义事件，通知所有组件语言已更改
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { locale: lang } }))
      
      // 强制刷新部分组件
      const event = new Event('resize')
      window.dispatchEvent(event)
    }
    
    return {
      currentLanguage,
      changeLanguage,
      t
    }
  }
};
</script>

<style>
:root {
  --primary-color: #4785ff;
  --secondary-color: #2684ff;
  --accent-color: #4c9aff;
  --background-color: #f8f9fa;
  --text-color: #2c3e50;
  --hover-color: #0052cc;
  --success-color: #0065ff;
  --success-hover: #0052cc;
  --gray-color: #42526e;
  --gray-hover: #505f79;
  --card-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

#app {
  font-family: 'Inter', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-color);
  background-color: var(--background-color);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.modern-theme {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9f2ff 100%);
}

.navbar-glass {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid rgba(0, 82, 204, 0.08);
  padding: 0.8rem 0;
}

.glow-text {
  color: var(--primary-color) !important;
  text-shadow: 0 0 10px rgba(0, 82, 204, 0.15);
  font-weight: 600;
  transition: all 0.3s ease;
  letter-spacing: -0.5px;
}

.glow-text:hover {
  color: var(--hover-color) !important;
  text-shadow: 0 0 15px rgba(0, 82, 204, 0.3);
}

.nav-button {
  position: relative;
  color: var(--text-color) !important;
  padding: 0.5rem 1rem;
  margin: 0 0.25rem;
  border-radius: 6px;
  transition: all 0.3s ease;
  font-weight: 500;
}

.nav-button:hover, .nav-button.active {
  color: var(--primary-color) !important;
  background: rgba(0, 82, 204, 0.08);
}

.nav-button::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: var(--primary-color);
  transition: all 0.3s ease;
  transform: translateX(-50%);
}

.nav-button:hover::after, .nav-button.active::after {
  width: 70%;
}

.custom-toggler {
  border: none;
  padding: 0.5rem;
  border-radius: 6px;
  background: rgba(0, 82, 204, 0.08);
}

main {
  flex: 1;
}

.card {
  border: none;
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
}

.card-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  background-color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
}

.btn {
  border-radius: 6px;
  font-weight: 500;
  padding: 0.5rem 1.25rem;
  transition: all 0.3s ease;
  border: none;
}

.btn-primary {
  background: var(--primary-color);
  box-shadow: 0 2px 10px rgba(71, 133, 255, 0.2);
}

.btn-primary:hover {
  background: var(--hover-color);
  box-shadow: 0 4px 12px rgba(71, 133, 255, 0.3);
  transform: translateY(-1px);
}

.fade-in {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.footer {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(0, 82, 204, 0.08);
  position: relative;
  margin-top: auto;
}

.footer-text {
  color: var(--text-color);
  font-weight: 500;
  opacity: 0.7;
}

/* 全局样式优化 */
input.form-control, select.form-select {
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 0.6rem 1rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
}

input.form-control:focus, select.form-select:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(71, 133, 255, 0.15);
}

.alert {
  border-radius: 8px;
  border: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--card-shadow);
}
</style>
