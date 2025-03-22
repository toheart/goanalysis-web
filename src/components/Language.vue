<template>
  <div class="set-language">
    <div class="language-container">
      <div class="language-card">
        <div class="language-header">
          <h3 class="gradient-text">{{ $t('common.language') }}</h3>
          <div class="current-language">
            <i class="bi bi-globe2 me-2"></i>
            <span>{{ currentLanguage }}</span>
          </div>
        </div>
        
        <div class="language-body">
          <div class="language-preview">
            <div class="preview-item">
              <i class="bi bi-translate me-2"></i>
              <span>{{ $t('nav.title') }}</span>
            </div>
            <div class="preview-item">
              <i class="bi bi-code-square me-2"></i>
              <span>{{ $t('staticAnalysis.title') }}</span>
            </div>
          </div>
          
          <div class="language-buttons">
            <button 
              class="lang-btn zh-btn" 
              :class="{ 'active': currentLanguage === '中文' }"
              @click="changeLanguage('zh')"
            >
              <i class="bi bi-check-circle-fill me-2"></i>
              切换到中文
            </button>
            <button 
              class="lang-btn en-btn" 
              :class="{ 'active': currentLanguage === 'English' }"
              @click="changeLanguage('en')"
            >
              <i class="bi bi-check-circle-fill me-2"></i>
              Switch to English
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

export default {
  name: 'SetLanguage',
  setup() {
    const { locale, t } = useI18n({ useScope: 'global' })
    
    const currentLanguage = computed(() => {
      return locale.value === 'zh' ? '中文' : 'English'
    })
    
    const changeLanguage = (lang) => {
      locale.value = lang
      localStorage.setItem('locale', lang)
      console.log('Language changed to:', lang)
    }
    
    return {
      currentLanguage,
      changeLanguage,
      t
    }
  }
}
</script>

<style>
.set-language {
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--background-color) 0%, #deebff 100%);
  padding: 2rem;
}

.language-container {
  width: 100%;
  max-width: 600px;
  animation: fadeIn 0.5s ease-out;
}

.language-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.language-card:hover {
  transform: translateY(-5px);
}

.language-header {
  background: linear-gradient(120deg, var(--primary-color), var(--secondary-color));
  padding: 2rem;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gradient-text {
  margin: 0;
  font-weight: 600;
  font-size: 1.75rem;
}

.current-language {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  font-weight: 500;
}

.language-body {
  padding: 2rem;
}

.language-preview {
  background: rgba(0, 0, 0, 0.03);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.preview-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 12px;
  transition: background-color 0.3s ease;
  color: var(--text-color);
}

.preview-item:hover {
  background: rgba(0, 82, 204, 0.05);
}

.preview-item + .preview-item {
  margin-top: 0.5rem;
}

.language-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.lang-btn {
  border: none;
  padding: 1rem;
  border-radius: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.lang-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0));
  transform: translateX(-100%);
  transition: transform 0.3s ease;
}

.lang-btn:hover::before {
  transform: translateX(0);
}

.zh-btn {
  background: linear-gradient(120deg, var(--primary-color), var(--secondary-color));
  color: white;
}

.en-btn {
  background: linear-gradient(120deg, var(--gray-color), var(--gray-hover));
  color: white;
}

.lang-btn.active {
  transform: scale(0.98);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.lang-btn i {
  opacity: 0;
  transform: scale(0);
  transition: all 0.3s ease;
}

.lang-btn.active i {
  opacity: 1;
  transform: scale(1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 576px) {
  .language-buttons {
    grid-template-columns: 1fr;
  }
  
  .language-header {
    flex-direction: column;
    text-align: center;
  }
  
  .current-language {
    margin-top: 1rem;
  }
}
</style> 