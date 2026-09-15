import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

export function useProgressiveList(items, pageSize) {
  const visibleCount = ref(pageSize)
  const sentinel = ref(null)
  const visibleItems = computed(() => items.value.slice(0, visibleCount.value))
  const hasMore = computed(() => visibleCount.value < items.value.length)
  let observer = null

  watch(items, () => {
    visibleCount.value = pageSize
  })

  onMounted(() => {
    if (typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore.value) visibleCount.value += pageSize
    }, { rootMargin: '160px 0px' })
    if (sentinel.value) observer.observe(sentinel.value)
  })

  onUnmounted(() => observer?.disconnect())

  return { visibleItems, hasMore, sentinel }
}
