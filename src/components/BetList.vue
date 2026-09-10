<script setup>
import { computed } from 'vue'
import { BET_RESULT_LABELS } from '../domain/bet-status.js'
import { calculateDailyResults } from '../domain/calculations.js'

const props = defineProps({ bets: { type: Array, required: true }, deletingIds: { type: Array, default: () => [] }, busy: Boolean })
const emit = defineEmits(['remove', 'edit'])
const dailyResults = computed(() => calculateDailyResults(props.bets))

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const formatDate = (date) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
</script>

<template>
  <section class="history-list" aria-label="Histórico de entradas">
    <p v-if="!dailyResults.length" class="empty-state">Nenhuma entrada encontrada para os filtros selecionados.</p>

    <article v-for="day in dailyResults" :key="day.date" class="day-group">
      <header>
        <div><strong>{{ formatDate(day.date) }}</strong><span>{{ day.bets.length }} entrada(s)</span></div>
        <strong :class="day.netResult < 0 ? 'negative' : 'positive'">{{ formatCurrency(day.netResult) }}</strong>
      </header>
      <ul>
        <li v-for="bet in day.bets" :key="bet.id">
          <div>
            <strong>ODD {{ bet.odd }}</strong>
            <span>Valor da aposta {{ formatCurrency(bet.stake) }} · {{ bet.wasTaken ? 'Sim' : 'Não' }} · {{ BET_RESULT_LABELS[bet.result] }}</span>
          </div>
          <div class="bet-return">
            <strong :class="bet.netReturn < 0 ? 'negative' : 'positive'">{{ formatCurrency(bet.netReturn) }}</strong>
            <span class="row-actions"><button :disabled="busy" type="button" :aria-label="`Editar entrada com ODD ${bet.odd}`" @click="emit('edit', bet)">Editar</button><button :disabled="busy" type="button" :aria-label="`Excluir entrada com ODD ${bet.odd}`" @click="emit('remove', bet)">{{ deletingIds.includes(bet.id) ? 'Excluindo…' : 'Excluir' }}</button></span>
          </div>
        </li>
      </ul>
    </article>
  </section>
</template>
