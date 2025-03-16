<template>
  <div class="function-search">
    <div class="card mb-4">
      <div class="card-header">
        <h5 class="mb-0"><i class="bi bi-search me-2"></i>{{ $t('runtimeAnalysis.functionAnalysis.title') }}</h5>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-8 search-container">
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-code-square"></i></span>
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="$t('runtimeAnalysis.functionAnalysis.inputFunctionName')"
                class="form-control"
                @input="handleInput"
                @focus="showSuggestions = true"
                @blur="hideSuggestionsDelayed"
                ref="searchInput"
              />
              <button class="btn btn-primary" @click="search">
                <i class="bi bi-search me-1"></i> {{ $t('runtimeAnalysis.functionAnalysis.search') }}
              </button>
            </div>
            
            <teleport to="body" :disabled="!isMounted">
              <div class="suggestions-container" v-if="showSuggestions && filteredSuggestions.length && isMounted" :style="suggestionsStyle">
                <div class="suggestions-wrapper">
                  <ul class="list-group function-suggestions" ref="suggestionsList">
                    <li
                      v-for="(item, index) in filteredSuggestions"
                      :key="index"
                      class="list-group-item list-group-item-action"
                      :class="{ 'active': index === selectedIndex }"
                      @mousedown.prevent="selectSuggestion(item)"
                      @mouseover="selectedIndex = index"
                    >
                      <span v-html="highlightMatch(item.name, searchQuery)"></span>
                      <small v-if="item.package" class="text-muted d-block">{{ item.package }}</small>
                    </li>
                  </ul>
                </div>
              </div>
            </teleport>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFunctionSearch } from '../composables/useFunctionSearch';

export default {
  name: 'FunctionSearch',
  props: {
    dbPath: {
      type: String,
      required: true
    }
  },
  emits: ['search'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const searchInput = ref(null);
    const suggestionsList = ref(null);
    const isMounted = ref(false);
    
    const {
      searchQuery,
      showSuggestions,
      filteredSuggestions,
      selectedIndex,
      suggestionsStyle,
      handleInput,
      selectSuggestion,
      hideSuggestionsDelayed,
      highlightMatch,
      updateSuggestionsPosition
    } = useFunctionSearch(props.dbPath, emit);

    const search = () => {
      if (!searchQuery.value) {
        alert(t('runtimeAnalysis.functionAnalysis.pleaseInputFunction'));
        return;
      }
      emit('search', searchQuery.value);
    };

    onMounted(() => {
      isMounted.value = true;
      window.addEventListener('resize', updateSuggestionsPosition);
      window.addEventListener('scroll', updateSuggestionsPosition, true);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', updateSuggestionsPosition);
      window.removeEventListener('scroll', updateSuggestionsPosition, true);
    });

    return {
      searchInput,
      suggestionsList,
      isMounted,
      searchQuery,
      showSuggestions,
      filteredSuggestions,
      selectedIndex,
      suggestionsStyle,
      handleInput,
      selectSuggestion,
      hideSuggestionsDelayed,
      highlightMatch,
      search
    };
  }
};
</script>

<style scoped>
.search-container {
  position: relative;
  z-index: 1050;
}

.suggestions-container {
  position: fixed;
  z-index: 9999 !important;
}

.suggestions-wrapper {
  position: relative;
  width: 100%;
  max-width: 100%;
  overflow: visible;
}

.function-suggestions {
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 0 0 0.375rem 0.375rem;
  margin-top: 0;
  padding: 0;
}

.highlight {
  background-color: rgba(255, 230, 0, 0.4);
  font-weight: bold;
  border-radius: 2px;
  padding: 0 2px;
}
</style> 