<script setup>
import { computed, reactive, watch } from 'vue'
import { BET_RESULTS, BET_RESULT_LABELS } from '../domain/bet-status.js'
import { calculateBetReturn } from '../domain/calculations.js'

const props = defineProps({ bet: { type: Object, default: null } })
const emit = defineEmits(['save', 'cancel'])

function getLocalDate() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

const today = getLocalDate()
const form = reactive({
  betDate: today,
  odd: '',
  stake: '',
  wasTaken: true,
  result: BET_RESULTS.IN_PROGRESS
})

const resultOptions = Object.entries(BET_RESULT_LABELS).map(([value, label]) => ({ value, label }))
const hasValidNumbers = computed(() => Number(form.odd) > 0 && Number(form.stake) > 0)
const projectedReturn = computed(() => hasValidNumbers.value ? calculateBetReturn(form) : 0)
const isEditing = computed(() => Boolean(props.bet))

watch(() => props.bet, (bet) => {
  form.betDate = bet?.betDate ?? today
  form.odd = bet?.odd ?? ''
  form.stake = bet?.stake ?? ''
  form.wasTaken = bet?.wasTaken ?? true
  form.result = bet?.result ?? BET_RESULTS.IN_PROGRESS
}, { immediate: true })

function saveBet() {
  if (!hasValidNumbers.value || !form.betDate) return

  emit('save', {
    id: props.bet?.id ?? crypto.randomUUID(),
    betDate: form.betDate,
    odd: Number(form.odd),
    stake: Number(form.stake),
    wasTaken: form.wasTaken,
    result: form.result
  })

  if (!isEditing.value) {
    form.odd = ''
    form.stake = ''
    form.result = BET_RESULTS.IN_PROGRESS
  }
}
</script>

<template>
  <form class="bet-form" @submit.prevent="saveBet">
    <label>
      <span>Data da entrada</span>
      <input v-model="form.betDate" type="date" required />
    </label>

    <div class="field-grid">
      <label>
        <span>ODD</span>
        <input v-model="form.odd" inputmode="decimal" min="1.01" step="0.001" type="number" placeholder="Ex.: 1,80" required />
      </label>
      <label>
        <span>Valor da aposta</span>
        <input v-model="form.stake" inputmode="decimal" min="0.01" step="0.01" type="number" placeholder="Ex.: 7,00" required />
      </label>
    </div>

    <div class="outcome-grid">
      <div class="toggle-field">
        <span id="taken-label">Entrada realizada?</span>
        <button
          class="toggle-control"
          :aria-checked="form.wasTaken"
          aria-labelledby="taken-label"
          role="switch"
          type="button"
          @click="form.wasTaken = !form.wasTaken"
        >
          <span class="toggle-track" aria-hidden="true"><span class="toggle-knob"></span></span>
          <span>{{ form.wasTaken ? 'Sim' : 'Não' }}</span>
        </button>
      </div>

      <label>
        <span>Resultado da aposta</span>
        <select v-model="form.result">
          <option v-for="option in resultOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
    </div>

    <div class="return-preview" :class="projectedReturn < 0 ? 'negative' : 'positive'">
      <span>Retorno calculado</span>
      <strong>{{ new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectedReturn) }}</strong>
    </div>

    <div class="form-actions">
      <button v-if="isEditing" class="secondary-button" type="button" @click="emit('cancel')">Cancelar</button>
      <button class="primary-button" type="submit" :disabled="!hasValidNumbers">{{ isEditing ? 'Salvar alterações' : 'Salvar entrada' }}</button>
    </div>
  </form>
</template>
