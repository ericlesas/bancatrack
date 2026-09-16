<script setup>
import document from '../../public/privacy/index.html?raw'

// O conteúdo vem de um arquivo local versionado, sem dados fornecidos pelo usuário.
const content = document.match(/<main>([\s\S]*?)<\/main>/)[1]
</script>

<template>
  <main class="privacy-page" v-html="content"></main>
</template>

<style scoped>
.privacy-page { max-width: 760px; margin: auto; padding: 24px 20px 48px; line-height: 1.7; }
.privacy-page :deep(a) { color: #9cf5ad; overflow-wrap: anywhere; }
.privacy-page :deep(a:focus-visible) { outline: 2px solid #9cf5ad; outline-offset: 4px; }
.privacy-page :deep(h1) { font-size: 1.8rem; line-height: 1.25; margin: 24px 0; }
.privacy-page :deep(h2) { font-size: 1.15rem; margin: 28px 0 16px; }
.privacy-page :deep(.date) { color: #bed5c4; }
.privacy-page :deep(section) { border-top: 1px solid #284c32; margin-top: 24px; }
</style>
