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
@import url("../assets/styles/components/common/language.css");
</style> 