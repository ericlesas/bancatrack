<script setup>
import { computed } from 'vue'

const props = defineProps({ results: { type: Array, required: true } })

const chartResults = computed(() => [...props.results].sort((a, b) => a.month.localeCompare(b.month)))
const highestValue = computed(() => Math.max(1, ...chartResults.value.map((item) => Math.abs(item.netResult))))
const formatMonth = (month) => new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' })
  .format(new Date(`${month}-01T00:00:00Z`))
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const percentage = (value) => `${(Math.abs(value) / highestValue.value) * 100}%`
</script>

<template>
  <section class="monthly-chart" aria-label="Gráfico de resultado mensal">
    <div class="chart-legend"><span><i class="legend-positive"></i>Lucro</span><span><i class="legend-negative"></i>Prejuízo</span></div>
    <div class="chart-axis" aria-hidden="true"><span>Prejuízo</span><span>Lucro</span></div>
    <ul>
      <li v-for="item in chartResults" :key="item.month">
        <span class="chart-month">{{ formatMonth(item.month) }}</span>
        <div class="chart-bar" :aria-label="`${formatMonth(item.month)}: ${formatCurrency(item.netResult)}`">
          <div class="chart-half chart-negative"><span v-if="item.netResult < 0" :style="{ width: percentage(item.netResult) }"></span></div>
          <div class="chart-half chart-positive"><span v-if="item.netResult > 0" :style="{ width: percentage(item.netResult) }"></span></div>
        </div>
        <strong :class="item.netResult < 0 ? 'negative' : 'positive'">{{ formatCurrency(item.netResult) }}</strong>
      </li>
    </ul>
  </section>
</template>
