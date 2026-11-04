<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { withBase } from 'vitepress'
import { localizePath, type Locale } from '../i18n'

/**
 * The missing-translation line (spec 0008, seam S3): one line saying the page has no version
 * in the locale the learner asked for, and a way to that locale's challenge list.
 *
 * Written in the REQUESTED locale, not the page's (G20): it is for a reader of that language
 * looking at a page in the other one, so every string is translated with `locale` explicitly
 * and `lang` says which language the line is in. The page around it, and the interface, stay
 * in the page's locale.
 *
 * There is no close control (D15). Whether it shows at all is decided by the routing module
 * (`lineLocale`); this component only says it.
 */
const props = defineProps<{ locale: Locale }>()
const { t } = useI18n()
const inRequestedLocale = (key: string) => t(key, {}, { locale: props.locale })
const listPath = () => localizePath('/challenges', props.locale)
</script>

<template>
  <div data-missing-translation role="note" :lang="locale" class="missing-translation">
    <span data-missing-translation-text>{{ inRequestedLocale('missing_translation.notice') }}</span>
    <a :href="withBase(listPath())">{{ inRequestedLocale('missing_translation.list_link') }}</a>
  </div>
</template>

<style scoped>
.missing-translation {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  align-items: baseline;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
  line-height: 1.5;
}
.missing-translation a {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
}
</style>
