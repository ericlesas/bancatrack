<script setup>
import { computed } from 'vue'
import { BET_RESULT_LABELS } from '../domain/bet-status.js'

const props = defineProps({
  bets: { type: Array, required: true },
  modelValue: { type: Object, required: true }
})
const emit = defineEmits(['update:modelValue'])

const months = computed(() => [...new Set(props.bets.map((bet) => bet.betDate.slice(0, 7)))].sort().reverse())
const formatMonth = (month) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  .format(new Date(`${month}-01T00:00:00Z`))

function update(field, value) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

function clear() {
  emit('update:modelValue', { month: '', result: '', wasTaken: '' })
}
</script>

<template>
  <section class="filters" aria-label="Filtros do histórico">
    <div class="section-heading"><h3>Filtrar histórico</h3><button class="text-button" type="button" @click="clear">Limpar</button></div>
    <div class="filter-grid">
      <label><span>Mês</span><select :value="modelValue.month" @change="update('month', $event.target.value)"><option value="">Todos</option><option v-for="month in months" :key="month" :value="month">{{ formatMonth(month) }}</option></select></label>
      <label><span>Resultado</span><select :value="modelValue.result" @change="update('result', $event.target.value)"><option value="">Todos</option><option v-for="(label, value) in BET_RESULT_LABELS" :key="value" :value="value">{{ label }}</option></select></label>
      <label><span>Peguei</span><select :value="modelValue.wasTaken" @change="update('wasTaken', $event.target.value)"><option value="">Todos</option><option value="true">Sim</option><option value="false">Não</option></select></label>
    </div>
  </section>
</template>
