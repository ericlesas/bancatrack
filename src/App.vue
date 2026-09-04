<script setup>
import { computed, nextTick, onUnmounted, ref } from 'vue'
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
const dataError = ref('')
const syncState = ref('')
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
  dataError.value = ''
  try {
    const wasEditing = Boolean(editingBet.value)
    if (wasEditing) await updateBet(user.value.uid, bet)
    else await createBet(user.value.uid, bet)
    editingBet.value = null
    if (wasEditing) activeView.value = 'history'
  }
  catch { dataError.value = 'Não foi possível salvar a entrada. Ela será tentada novamente quando houver conexão.' }
}

async function removeBet(id) {
  dataError.value = ''
  try { await deleteBet(user.value.uid, id) }
  catch { dataError.value = 'Não foi possível excluir a entrada agora.' }
}

function startBetsObserver(firebaseUser) {
  stopObservingBets?.()
  dataError.value = ''
  stopObservingBets = observeBets(firebaseUser.uid, (loadedBets, metadata) => {
    bets.value = loadedBets
    syncState.value = metadata.hasPendingWrites ? 'Alterações aguardando sincronização' : metadata.fromCache ? 'Exibindo dados offline' : 'Sincronizado'
  }, () => { dataError.value = 'Não foi possível carregar suas entradas. Verifique as regras do Firestore.' })
}

async function editBet(bet) {
  editingBet.value = bet
  activeView.value = 'entry'
  await nextTick()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openNewEntry() {
  editingBet.value = null
  activeView.value = 'entry'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEditing() {
  editingBet.value = null
  activeView.value = 'history'
}

const stopObservingAuth = observeAuth((firebaseUser) => {
  user.value = firebaseUser
  authReady.value = true
  if (firebaseUser) startBetsObserver(firebaseUser)
  else {
    stopObservingBets?.()
    stopObservingBets = null
    bets.value = []
    syncState.value = ''
  }
})

onUnmounted(() => {
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
      <div class="header-actions"><span class="offline-badge">{{ syncState || 'Conectando…' }}</span><button class="sign-out" type="button" @click="signOutUser">Sair</button></div>
    </header>

    <section v-if="activeView === 'dashboard'" class="dashboard" aria-label="Dashboard">
      <section class="dashboard-period" aria-label="Filtro de período">
        <div>
          <span class="dashboard-period-kicker">Visão do dashboard</span>
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
      <BetForm :bet="editingBet" @cancel="cancelEditing" @save="addBet" />
      <p v-if="dataError" class="form-error" role="alert">{{ dataError }}</p>
    </section>

    <section v-else class="content-card" aria-label="Histórico de entradas">
      <div class="section-heading"><div><h2>Histórico</h2><span class="section-caption">Consulte, filtre e edite suas entradas.</span></div><span>{{ bets.length }} cadastrada(s)</span></div>
      <BetFilters v-model="filters" :bets="bets" />
      <BetList :bets="visibleBets" @edit="editBet" @remove="removeBet" />
    </section>

    <nav class="bottom-nav" aria-label="Navegação principal">
      <button :class="{ active: activeView === 'dashboard' }" @click="activeView = 'dashboard'">Dashboard</button>
      <button :class="{ active: activeView === 'entry' }" @click="openNewEntry">Nova entrada</button>
      <button :class="{ active: activeView === 'history' }" @click="activeView = 'history'">Histórico</button>
    </nav>
  </main>
</template>
