<script setup>
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { betErrorMessage } from './services/bet-errors.js'
import AccountSettings from './components/AccountSettings.vue'
import PrivacyPolicy from './components/PrivacyPolicy.vue'
import ResetPassword from './components/ResetPassword.vue'
import { authErrorMessage } from './services/auth-errors.js'
import AuthForm from './components/AuthForm.vue'
import AppSplash from './components/AppSplash.vue'
import BetFilters from './components/BetFilters.vue'
import BetForm from './components/BetForm.vue'
import BetList from './components/BetList.vue'
import MonthlyChart from './components/MonthlyChart.vue'
import { BET_RESULTS } from './domain/bet-status.js'
import { calculateDashboardMetrics, calculateMonthlyResults, filterBetsByMonth, filterMonthlyResultsByPeriod } from './domain/calculations.js'
import { observeAuth, signIn, signOutUser, signUp, changePassword, reauthenticate, deleteAuthenticatedUser, requestPasswordReset } from './services/auth-service.js'
import { createBet, observeBets, removeAllUserData, removeBet as deleteBet, updateBet } from './services/bets-repository.js'

const activeView = ref('dashboard')
const privacyPage = /^\/privacy(?:\/index\.html|\/)?$/.test(window.location?.pathname || '')
const actionParams = new URLSearchParams(window.location?.search || '')
const resetPage = ref(window.location?.pathname === '/reset-password' || actionParams.has('mode'))
const accountPending = ref(false)
const accountError = ref('')
const accountMessage = ref('')
const authMessage = ref('')
function closeResetPage() {
  resetPage.value = false
  window.history.replaceState({}, '', '/')
}
async function recoverPassword(email) {
  if (authPending.value) return
  authError.value = authMessage.value = ''
  authPending.value = true
  try { await requestPasswordReset(email); authMessage.value = 'Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha.' }
  catch (error) { authError.value = authErrorMessage(error) }
  finally { authPending.value = false }
}
async function accountAction(action, success = '') {
  if (busy.value) return
  accountPending.value = true
  accountError.value = accountMessage.value = ''
  try { await action(); accountMessage.value = success }
  catch (error) { accountError.value = error.accountMessage || authErrorMessage(error) }
  finally { accountPending.value = false }
}
function updateAccountPassword(credentials) {
  return accountAction(() => changePassword(credentials.currentPassword, credentials.newPassword), 'Senha atualizada com sucesso.')
}
function logout() { return accountAction(signOutUser) }
function deleteAccount(password) {
  return accountAction(async () => {
    const authenticatedUser = await reauthenticate(password)
    try {
      await removeAllUserData(authenticatedUser.uid)
      await deleteAuthenticatedUser(authenticatedUser)
    } catch (error) {
      throw { accountMessage: 'A exclusão não foi concluída. Alguns dados podem já ter sido apagados. Confira sua conexão e tente novamente. ' + authErrorMessage(error) }
    }
  })
}
const bets = ref([])
const editingBet = ref(null)
const filters = ref({ month: '', result: '', wasTaken: '' })
const dashboardMonth = ref('')
const chartPeriod = ref('6')
const user = ref(null)
const authReady = ref(false)
const authPending = ref(false)
const authError = ref('')
const loadError = ref('')
const actionErrors = ref([])
const betsLoading = ref(true)
const saving = ref(false)
const deletingIds = ref([])
const updatingIds = ref([])
const formVersion = ref(0)
const restoredBet = ref(null)
const operations = new Set()
let sessionVersion = 0
const busy = computed(() => accountPending.value || saving.value || deletingIds.value.length > 0 || updatingIds.value.length > 0)

// O snapshot local libera a interface; a Promise continua tratando a confirmação remota.
function finishLocal(operation) {
  if (operation.local || operation.session !== sessionVersion) return
  operation.local = true
  if (operation.kind === 'delete') {
    deletingIds.value = deletingIds.value.filter((id) => id !== operation.bet.id)
  } else if (operation.kind === 'result') {
    updatingIds.value = updatingIds.value.filter((id) => id !== operation.bet.id)
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
      bet: operation.local && (kind === 'create' || kind === 'edit') ? operation.bet : null,
      kind
    })
  } finally {
    operations.delete(operation)
    if (operation.session === sessionVersion) {
      if (kind === 'delete') deletingIds.value = deletingIds.value.filter((id) => id !== bet.id)
      else if (kind === 'result') updatingIds.value = updatingIds.value.filter((id) => id !== bet.id)
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
const monthlyResults = computed(() => calculateMonthlyResults(bets.value))
const dashboardMetrics = computed(() => calculateDashboardMetrics(dashboardBets.value))
const currentCalendarMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
const chartResults = computed(() => filterMonthlyResultsByPeriod(monthlyResults.value, currentCalendarMonth(), chartPeriod.value))
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
const formatDisplayMonth = (month) => {
  const formatted = formatMonth(month)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

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

async function updateBetResult({ bet, result }) {
  if (busy.value || !user.value || !bet.wasTaken || bet.result !== BET_RESULTS.IN_PROGRESS) return
  if (result !== BET_RESULTS.GREEN && result !== BET_RESULTS.RED) return
  const updatedBet = { ...bet, result }
  const userId = user.value.uid
  updatingIds.value = [...updatingIds.value, bet.id]
  await performOperation('result', updatedBet, () => updateBet(userId, updatedBet))
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
  activeView.value = 'dashboard'
  accountError.value = accountMessage.value = ''
  sessionVersion += 1
  operations.clear()
  saving.value = false
  deletingIds.value = []
  updatingIds.value = []
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
  <PrivacyPolicy v-if="privacyPage" />
  <ResetPassword v-else-if="resetPage" :code="actionParams.get('oobCode')" :mode="actionParams.get('mode')" @back="closeResetPage" />
  <AppSplash v-else-if="!authReady" />
  <AuthForm v-else-if="!user" :error="authError" :message="authMessage" @clear="authError = authMessage = ''" @reset="recoverPassword" :pending="authPending" @sign-in="authenticate(signIn, $event)" @sign-up="authenticate(signUp, $event)" />
  <main v-else class="app-shell">
    <header v-if="activeView !== 'account'" class="topbar">
      <div>
        <h1>BancaTrack</h1>
        <p class="app-subtitle">Gestão inteligente de apostas</p>
      </div>
      <div class="header-actions">
        <button class="settings-button" type="button" :disabled="busy" aria-label="Configurações da conta" title="Configurações da conta" :aria-pressed="activeView === 'account'" @click="activeView = 'account'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="m9.5 3-.5 2-2 1-2-.5-2 3.5L4.5 11v2L3 15l2 3.5 2-.5 2 1 .5 2h5l.5-2 2-1 2 .5 2-3.5-1.5-2v-2L21 9l-2-3.5-2 .5-2-1-.5-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
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

    <p v-if="accountError && activeView !== 'account'" class="form-error" role="alert">{{ accountError }}</p>
    <AccountSettings v-if="activeView === 'account'" :email="user.email" :pending="busy" :error="accountError" :message="accountMessage" @clear="accountError = accountMessage = ''" @password="updateAccountPassword" @delete="deleteAccount" @logout="logout" @back="activeView = 'dashboard'" />
    <section v-if="activeView === 'dashboard' && !betsLoading && !loadError" class="dashboard" aria-label="Resumo">
      <section class="dashboard-period" aria-label="Filtro de período">
        <div>
          <span class="dashboard-period-kicker">Visão do resumo</span>
          <strong>{{ dashboardMonth ? formatDisplayMonth(dashboardMonth) : 'Todo o histórico' }}</strong>
        </div>
        <label>
          <span>Selecionar período</span>
          <select v-model="dashboardMonth">
            <option value="">todo o histórico</option>
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
        <div class="section-heading chart-heading">
          <div><h2>Resultados por mês</h2><span v-if="latestMonth" class="section-caption">Último período: {{ formattedResult(latestMonth.netResult) }}</span></div>
          <label><span>Período do gráfico</span><select v-model="chartPeriod"><option value="6">últimos 6 meses</option><option value="12">últimos 12 meses</option><option value="all">todo o histórico</option></select></label>
        </div>
        <p v-if="!monthlyResults.length" class="empty-state">Cadastre uma entrada para começar a acompanhar seus resultados.</p>
        <MonthlyChart v-else :results="chartResults" />
      </section>
    </section>

    <section v-else-if="activeView === 'entry'" class="content-card" aria-label="Nova entrada">
      <div class="section-heading"><h2>{{ editingBet ? 'Editar entrada' : 'Nova entrada' }}</h2><span>{{ bets.length }} cadastrada(s)</span></div>
      <BetForm :key="formVersion" :bet="editingBet" :initial-bet="restoredBet" :pending="saving" @cancel="cancelEditing" @save="addBet" />
    </section>

    <section v-else-if="activeView === 'history' && !betsLoading && !loadError" class="content-card" aria-label="Histórico de entradas">
      <div class="section-heading"><div><h2>Histórico</h2><span class="section-caption">Consulte, filtre e edite suas entradas.</span></div><span>{{ bets.length }} cadastrada(s)</span></div>
      <BetFilters v-model="filters" :bets="bets" />
      <BetList :bets="visibleBets" :deleting-ids="deletingIds" :updating-ids="updatingIds" :busy="busy" @edit="editBet" @remove="removeBet" @update-result="updateBetResult" />
    </section>

    <nav v-if="activeView !== 'account'" class="bottom-nav" aria-label="Navegação principal">
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
