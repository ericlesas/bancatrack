<script setup>
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { betErrorMessage } from './services/bet-errors.js'
import AuthForm from './components/AuthForm.vue'
import AppSplash from './components/AppSplash.vue'
import BetFilters from './components/BetFilters.vue'
import BetForm from './components/BetForm.vue'
import BetList from './components/BetList.vue'
import MonthlyChart from './components/MonthlyChart.vue'
import { calculateDashboardMetrics, calculateMonthlyResults, filterBetsByMonth } from './domain/calculations.js'
import { observeAuth, signIn, signOutUser, signUp } from './services/auth-service.js'
import { createBet, observeBets, removeBet as deleteBet, updateBet } from './services/bets-repository.js'

const activeView = ref('dashboard')
const bets = ref([])
const editingBet = ref(null)
const filters = ref({ month: '', result: '', wasTaken: '' })
const dashboardMonth = ref('')
const user = ref(null)
const authReady = ref(false)
const authPending = ref(false)
const authError = ref('')
const loadError = ref('')
const actionErrors = ref([])
const betsLoading = ref(true)
const saving = ref(false)
const deletingIds = ref([])
const formVersion = ref(0)
const restoredBet = ref(null)
const operations = new Set()
let sessionVersion = 0
const busy = computed(() => saving.value || deletingIds.value.length > 0)

// O snapshot local libera a interface; a Promise continua tratando a confirmação remota.
function finishLocal(operation) {
  if (operation.local || operation.session !== sessionVersion) return
  operation.local = true
  if (operation.kind === 'delete') {
    deletingIds.value = deletingIds.value.filter((id) => id !== operation.bet.id)
  } else {
    saving.value = false
    editingBet.value = null
    restoredBet.value = operation.kind === 'create' ? { betDate: operation.bet.betDate, wasTaken: operation.bet.wasTaken } : null
    formVersion.value += 1
    if (operation.kind === 'edit') activeView.value = 'history'
  }
}

async function performOperation(kind, bet, write) {
  const operation = { kind, bet: { ...bet }, session: sessionVersion, local: false }
  operations.add(operation)
  try {
    await write()
    finishLocal(operation)
  } catch (error) {
    if (operation.session !== sessionVersion) return
    actionErrors.value.push({
      id: crypto.randomUUID(),
      message: `${betErrorMessage(error, kind)} Entrada de ${bet.betDate.split('-').reverse().join('/')}, ODD ${bet.odd}, ${formattedResult(bet.stake)}.`,
      bet: operation.local && kind !== 'delete' ? operation.bet : null,
      kind
    })
  } finally {
    operations.delete(operation)
    if (operation.session === sessionVersion) {
      if (kind === 'delete') deletingIds.value = deletingIds.value.filter((id) => id !== bet.id)
      else if (!operation.local) saving.value = false
    }
  }
}

function restoreFailedEntry(failure) {
  if (busy.value) return
  if (activeView.value === 'entry' && !window.confirm('Recuperar esta entrada substituirá os dados do formulário atual. Continuar?')) return
  editingBet.value = failure.kind === 'edit' ? failure.bet : null
  restoredBet.value = failure.bet
  formVersion.value += 1
  activeView.value = 'entry'
  actionErrors.value = actionErrors.value.filter((item) => item.id !== failure.id)
}
let stopObservingBets = null
const availableMonths = computed(() => calculateMonthlyResults(bets.value))
const dashboardBets = computed(() => filterBetsByMonth(bets.value, dashboardMonth.value))
const monthlyResults = computed(() => calculateMonthlyResults(dashboardBets.value))
const dashboardMetrics = computed(() => calculateDashboardMetrics(dashboardBets.value))
const latestMonth = computed(() => monthlyResults.value[0] ?? null)
const visibleBets = computed(() => bets.value.filter((bet) => {
  if (filters.value.month && !bet.betDate.startsWith(filters.value.month)) return false
  if (filters.value.result && bet.result !== filters.value.result) return false
  return !filters.value.wasTaken || String(bet.wasTaken) === filters.value.wasTaken
}))
const formattedResult = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2
}).format(value)
const formattedPercentage = (value) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)
const formatMonth = (month) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  .format(new Date(`${month}-01T00:00:00Z`))

function friendlyAuthError(error) {
  const messages = {
    'auth/email-already-in-use': 'Este e-mail já possui uma conta.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/invalid-email': 'Informe um e-mail válido.',
    'auth/weak-password': 'A senha precisa ter pelo menos seis caracteres.'
  }
  return messages[error.code] ?? 'Não foi possível concluir a autenticação. Tente novamente.'
}

async function authenticate(action, credentials) {
  authError.value = ''
  authPending.value = true
  try {
    await action(credentials.email, credentials.password)
  } catch (error) {
    authError.value = friendlyAuthError(error)
  } finally {
    authPending.value = false
  }
}

async function addBet(bet) {
  if (busy.value || !user.value) return
  saving.value = true
  const userId = user.value.uid
  const kind = editingBet.value ? 'edit' : 'create'
  await performOperation(kind, bet, () => kind === 'edit' ? updateBet(userId, bet) : createBet(userId, bet))
}

async function removeBet(bet) {
  if (busy.value || !user.value) return
  const date = bet.betDate.split('-').reverse().join('/')
  if (!window.confirm(`Excluir a entrada de ${date}, ODD ${bet.odd}, no valor de ${formattedResult(bet.stake)}? Esta ação não pode ser desfeita.`)) return
  deletingIds.value = [...deletingIds.value, bet.id]
  const userId = user.value.uid
  await performOperation('delete', bet, () => deleteBet(userId, bet.id))
}

function startBetsObserver(firebaseUser) {
  stopObservingBets?.()
  loadError.value = ''
  betsLoading.value = true
  const observerSession = sessionVersion
  stopObservingBets = observeBets(firebaseUser.uid, (loadedBets, metadata) => {
    if (observerSession !== sessionVersion) return
    bets.value = loadedBets
    betsLoading.value = false
    loadError.value = ''
    for (const operation of operations) {
      const found = loadedBets.find((bet) => bet.id === operation.bet.id)
      const matches = found && ['betDate', 'odd', 'stake', 'wasTaken', 'result'].every((key) => found[key] === operation.bet[key])
      if (operation.kind === 'delete' ? !found : matches && metadata.pendingIds.includes(found.id)) finishLocal(operation)
    }
  }, (error) => {
    if (observerSession !== sessionVersion) return
    betsLoading.value = false
    loadError.value = betErrorMessage(error, 'load')
  })
}

async function editBet(bet) {
  if (busy.value) return
  restoredBet.value = null
  formVersion.value += 1
  editingBet.value = bet
  activeView.value = 'entry'
  await nextTick()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openNewEntry() {
  if (busy.value) return
  if (activeView.value === 'entry' && !editingBet.value) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  restoredBet.value = null
  formVersion.value += 1
  editingBet.value = null
  activeView.value = 'entry'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEditing() {
  if (busy.value) return
  restoredBet.value = null
  editingBet.value = null
  activeView.value = 'history'
}

const stopObservingAuth = observeAuth((firebaseUser) => {
  sessionVersion += 1
  operations.clear()
  saving.value = false
  deletingIds.value = []
  actionErrors.value = []
  editingBet.value = null
  restoredBet.value = null
  bets.value = []
  user.value = firebaseUser
  authReady.value = true
  if (firebaseUser) startBetsObserver(firebaseUser)
  else {
    stopObservingBets?.()
    stopObservingBets = null
    bets.value = []
  }
})

onUnmounted(() => {
  sessionVersion += 1
  operations.clear()
  stopObservingAuth()
  stopObservingBets?.()
})
</script>

<template>
  <AppSplash v-if="!authReady" />
  <AuthForm v-else-if="!user" :error="authError" :pending="authPending" @sign-in="authenticate(signIn, $event)" @sign-up="authenticate(signUp, $event)" />
  <main v-else class="app-shell">
    <header class="topbar">
      <div>
        <h1>BancaTrack</h1>
        <p class="app-subtitle">Gestão inteligente de apostas</p>
      </div>
      <div class="header-actions"><button class="sign-out" type="button" @click="signOutUser">Sair</button></div>
    </header>

    <div v-if="actionErrors.length" class="action-errors">
      <div v-for="failure in actionErrors" :key="failure.id" class="action-error" role="alert">
        <p class="form-error">{{ failure.message }}</p>
        <button v-if="failure.bet" class="text-button" :disabled="busy" @click="restoreFailedEntry(failure)">Recuperar dados da entrada</button>
        <button class="text-button" @click="actionErrors = actionErrors.filter((item) => item.id !== failure.id)">Fechar</button>
      </div>
    </div>
    <p v-if="betsLoading" class="empty-state" role="status">Carregando entradas…</p>
    <div v-else-if="loadError" class="action-error" role="alert">
      <p class="form-error">{{ loadError }}</p>
      <button class="text-button" @click="startBetsObserver(user)">Tentar novamente</button>
    </div>

    <section v-if="activeView === 'dashboard' && !betsLoading && !loadError" class="dashboard" aria-label="Resumo">
      <section class="dashboard-period" aria-label="Filtro de período">
        <div>
          <span class="dashboard-period-kicker">Visão do resumo</span>
          <strong>{{ dashboardMonth ? formatMonth(dashboardMonth) : 'Todo o histórico' }}</strong>
        </div>
        <label>
          <span>Selecionar período</span>
          <select v-model="dashboardMonth">
            <option value="">Todo o histórico</option>
            <option v-for="item in availableMonths" :key="item.month" :value="item.month">{{ formatMonth(item.month) }}</option>
          </select>
        </label>
      </section>

      <article class="hero-card">
        <p>{{ dashboardMonth ? 'Resultado do período' : 'Resultado acumulado' }}</p>
        <strong :class="dashboardMetrics.netResult >= 0 ? 'positive' : 'negative'">{{ formattedResult(dashboardMetrics.netResult) }}</strong>
        <small>{{ dashboardMonth ? formatMonth(dashboardMonth) : 'Somatório líquido das entradas registradas' }}</small>
      </article>

      <section class="summary-grid" aria-label="Resumo">
        <article class="summary-card"><span>Entradas realizadas</span><strong>{{ dashboardMetrics.taken }}</strong></article>
        <article class="summary-card"><span>Apostas finalizadas</span><strong>{{ dashboardMetrics.settled }}</strong></article>
        <article class="summary-card"><span>Apostas ganhas</span><strong class="positive">{{ dashboardMetrics.green }}</strong></article>
        <article class="summary-card"><span>Apostas perdidas</span><strong class="negative">{{ dashboardMetrics.red }}</strong></article>
        <article class="summary-card"><span>Taxa de acerto</span><strong>{{ formattedPercentage(dashboardMetrics.winRate) }}%</strong></article>
        <article class="summary-card"><span>ROI finalizado</span><strong :class="dashboardMetrics.roi >= 0 ? 'positive' : 'negative'">{{ formattedPercentage(dashboardMetrics.roi) }}%</strong></article>
        <article class="summary-card summary-card-wide"><span>Valor apostado no período</span><strong>{{ formattedResult(dashboardMetrics.settledStake) }}</strong></article>
      </section>

      <section class="content-card">
        <div class="section-heading"><div><h2>Resultados por mês</h2><span v-if="latestMonth" class="section-caption">Último período: {{ formattedResult(latestMonth.netResult) }}</span></div></div>
        <p v-if="!monthlyResults.length" class="empty-state">Cadastre uma entrada para começar a acompanhar seus resultados.</p>
        <MonthlyChart v-else :results="monthlyResults" />
      </section>
    </section>

    <section v-else-if="activeView === 'entry'" class="content-card" aria-label="Nova entrada">
      <div class="section-heading"><h2>{{ editingBet ? 'Editar entrada' : 'Nova entrada' }}</h2><span>{{ bets.length }} cadastrada(s)</span></div>
      <BetForm :key="formVersion" :bet="editingBet" :initial-bet="restoredBet" :pending="saving" @cancel="cancelEditing" @save="addBet" />
    </section>

    <section v-else-if="activeView === 'history' && !betsLoading && !loadError" class="content-card" aria-label="Histórico de entradas">
      <div class="section-heading"><div><h2>Histórico</h2><span class="section-caption">Consulte, filtre e edite suas entradas.</span></div><span>{{ bets.length }} cadastrada(s)</span></div>
      <BetFilters v-model="filters" :bets="bets" />
      <BetList :bets="visibleBets" :deleting-ids="deletingIds" :busy="busy" @edit="editBet" @remove="removeBet" />
    </section>

    <nav class="bottom-nav" aria-label="Navegação principal">
      <button :disabled="busy" :class="{ active: activeView === 'dashboard' }" @click="activeView = 'dashboard'">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M4 4v16h16M8 16v-4m5 4V8m5 8V5" />
        </svg>
        <span>Resumo</span>
      </button>
      <button :disabled="busy" :class="{ active: activeView === 'entry' }" @click="openNewEntry">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8m-4-4h8" />
        </svg>
        <span>Nova entrada</span>
      </button>
      <button :disabled="busy" :class="{ active: activeView === 'history' }" @click="activeView = 'history'">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span>Histórico</span>
      </button>
    </nav>
  </main>
</template>
