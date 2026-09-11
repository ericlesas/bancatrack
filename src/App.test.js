import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, ssrContextKey } from 'vue'
import App from './App.vue'
import BetForm from './components/BetForm.vue'
import { observeAuth } from './services/auth-service.js'
import { observeBets, createBet, updateBet, removeBet } from './services/bets-repository.js'

vi.mock('./services/auth-service.js', () => ({ observeAuth: vi.fn(), signIn: vi.fn(), signUp: vi.fn(), signOutUser: vi.fn() }))
vi.mock('./services/bets-repository.js', () => ({ observeBets: vi.fn(), createBet: vi.fn(), updateBet: vi.fn(), removeBet: vi.fn() }))

// Exercita o estado dos componentes com o runtime Vue, sem navegador ou DOM adicional.
const node = (text = '') => ({ children: [], text, props: {} })
const renderer = createRenderer({
  createElement: () => node(), createText: node, createComment: node,
  setText: (el, text) => { el.text = text },
  setElementText: (el, text) => { el.text = text; el.children = [] },
  patchProp: (el, key, previous, value) => { el.props[key] = value },
  insert: (el, parent, anchor) => {
    if (el.parent) { const index = el.parent.children.indexOf(el); if (index >= 0) el.parent.children.splice(index, 1) }
    const index = anchor ? parent.children.indexOf(anchor) : -1
    parent.children.splice(index < 0 ? parent.children.length : index, 0, el)
    el.parent = parent
  },
  remove: (el) => { const index = el.parent?.children.indexOf(el); if (index >= 0) el.parent.children.splice(index, 1) },
  parentNode: (el) => el.parent,
  nextSibling: (el) => el.parent?.children[el.parent.children.indexOf(el) + 1]
})
const bet = { id: 'bet-1', betDate: '2026-09-08', odd: 2, stake: 10, wasTaken: true, result: 'green' }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
let app, state, snapshot, auth, loadFailure

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('window', { confirm: vi.fn(() => true), scrollTo: vi.fn() })
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => `id-${Math.random()}`) })
  observeAuth.mockImplementation((callback) => { auth = callback; return vi.fn() })
  observeBets.mockImplementation((id, callback, error) => { snapshot = callback; loadFailure = error; return vi.fn() })
  app = renderer.createApp({ ...App, render: () => null })
  app.provide(ssrContextKey, {})
  state = app.mount(node()).$.setupState
  auth({ uid: 'user-1' })
})

afterEach(() => { app.unmount(); vi.unstubAllGlobals() })

describe('ações de entradas', () => {
  it('cancela a exclusão sem chamar a persistência', async () => {
    window.confirm.mockReturnValue(false)
    await state.removeBet(bet)
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('08/09/2026'))
    expect(removeBet).not.toHaveBeenCalled()
  })

  it('impede exclusões repetidas e exibe falhas', async () => {
    const write = deferred(); removeBet.mockReturnValue(write.promise)
    const task = state.removeBet(bet)
    await state.removeBet(bet)
    expect(removeBet).toHaveBeenCalledTimes(1)
    expect(state.deletingIds).toEqual([bet.id])
    write.reject({ code: 'permission-denied' }); await task
    expect(state.deletingIds).toEqual([])
    expect(state.actionErrors[0].message).toContain('permissão')
  })

  it('libera exclusão aplicada localmente sem aguardar o servidor', async () => {
    snapshot([bet], { pendingIds: [] })
    const write = deferred(); removeBet.mockReturnValue(write.promise)
    const task = state.removeBet(bet)
    snapshot([], { pendingIds: [] })
    expect(state.deletingIds).toEqual([])
    write.resolve(); await task
  })

  it('conclui a exclusão quando o servidor responde antes do snapshot', async () => {
    removeBet.mockResolvedValue()
    await state.removeBet(bet)
    expect(removeBet).toHaveBeenCalledWith('user-1', bet.id)
    expect(state.deletingIds).toEqual([])
    expect(state.actionErrors).toEqual([])
  })

  it('impede envio duplicado e mantém o formulário quando a gravação falha', async () => {
    const write = deferred(); createBet.mockReturnValue(write.promise)
    const version = state.formVersion
    const task = state.addBet(bet)
    await state.addBet(bet)
    expect(createBet).toHaveBeenCalledTimes(1)
    expect(state.saving).toBe(true)
    write.reject({ code: 'unavailable' }); await task
    expect(state.saving).toBe(false)
    expect(state.formVersion).toBe(version)
    expect(state.actionErrors).toHaveLength(1)
  })

  it('libera cadastro local, preserva data e permite recuperar rejeição posterior', async () => {
    const write = deferred(); createBet.mockReturnValue(write.promise)
    const task = state.addBet(bet)
    snapshot([bet], { pendingIds: [bet.id] })
    expect(state.saving).toBe(false)
    expect(state.restoredBet.betDate).toBe(bet.betDate)
    write.reject({ code: 'permission-denied' }); await task
    expect(state.actionErrors[0].bet).toEqual(bet)
    state.restoreFailedEntry(state.actionErrors[0])
    expect(state.restoredBet).toEqual(bet)
    expect(state.editingBet).toBeNull()
  })

  it('conclui o cadastro quando o servidor responde antes do snapshot', async () => {
    createBet.mockResolvedValue()
    await state.addBet(bet)
    expect(createBet).toHaveBeenCalledWith('user-1', bet)
    expect(state.saving).toBe(false)
    expect(state.restoredBet).toEqual({ betDate: bet.betDate, wasTaken: bet.wasTaken })
    expect(state.actionErrors).toEqual([])
  })

  it('retorna ao histórico após edição aplicada e ignora snapshots antigos', async () => {
    const write = deferred(); updateBet.mockReturnValue(write.promise)
    await state.editBet(bet)
    const task = state.addBet({ ...bet, stake: 20 })
    snapshot([bet], { pendingIds: [bet.id] })
    expect(state.saving).toBe(true)
    snapshot([{ ...bet, stake: 20 }], { pendingIds: [bet.id] })
    expect(state.activeView).toBe('history')
    write.resolve(); await task
  })

  it('mantém a edição aberta quando a atualização falha antes do snapshot local', async () => {
    updateBet.mockRejectedValue({ code: 'invalid-argument' })
    await state.editBet(bet)
    await state.addBet({ ...bet, stake: 0 })
    expect(state.activeView).toBe('entry')
    expect(state.editingBet).toEqual(bet)
    expect(state.saving).toBe(false)
    expect(state.actionErrors[0].message).toContain('Confira a data')
  })

  it('não executa ações de persistência sem usuário autenticado', async () => {
    auth(null)
    await state.addBet(bet)
    await state.removeBet(bet)
    expect(createBet).not.toHaveBeenCalled()
    expect(updateBet).not.toHaveBeenCalled()
    expect(removeBet).not.toHaveBeenCalled()
  })

  it('mantém o erro quando a recuperação é cancelada sobre outro formulário', () => {
    const failure = { id: 'failure-1', bet, kind: 'create', message: 'Falha' }
    state.actionErrors = [failure]
    state.openNewEntry()
    window.confirm.mockReturnValue(false)
    state.restoreFailedEntry(failure)
    expect(window.confirm).toHaveBeenCalled()
    expect(state.actionErrors).toEqual([failure])
    expect(state.restoredBet).toBeNull()
  })

  it('não aplica falhas de uma sessão anterior ao próximo usuário', async () => {
    const write = deferred(); createBet.mockReturnValue(write.promise)
    const task = state.addBet(bet)
    const oldSnapshot = snapshot
    auth({ uid: 'user-2' })
    oldSnapshot([bet], { pendingIds: [bet.id] })
    write.reject({ code: 'permission-denied' }); await task
    expect(state.actionErrors).toEqual([])
    expect(state.bets).toEqual([])
  })

  it('distingue carregamento, histórico vazio e falha de leitura', async () => {
    expect(state.betsLoading).toBe(true)
    loadFailure({ code: 'permission-denied' })
    expect(state.betsLoading).toBe(false)
    expect(state.loadError).toContain('carregar')
    state.startBetsObserver({ uid: 'user-1' })
    expect(state.betsLoading).toBe(true)
    snapshot([], { pendingIds: [] })
    expect(state.betsLoading).toBe(false)
    expect(state.loadError).toBe('')
    await nextTick()
  })

  it('preserva o rascunho ao clicar novamente na tab de nova entrada', () => {
    state.openNewEntry()
    const version = state.formVersion
    state.openNewEntry()
    expect(state.formVersion).toBe(version)
  })

  it('mantém valores e o mesmo identificador ao reenviar o formulário', () => {
    const save = vi.fn()
    const formApp = renderer.createApp({ ...BetForm, render: () => null }, { onSave: save })
    formApp.provide(ssrContextKey, {})
    const formState = formApp.mount(node()).$.setupState
    Object.assign(formState.form, bet)
    formState.saveBet()
    formState.saveBet()
    expect(formState.form.stake).toBe(10)
    expect(save.mock.calls[0][0].id).toBe(save.mock.calls[1][0].id)
    formApp.unmount()
  })

  it('formata o valor da aposta em BRL durante a digitação', () => {
    const formApp = renderer.createApp({ ...BetForm, render: () => null })
    formApp.provide(ssrContextKey, {})
    const formState = formApp.mount(node()).$.setupState
    formState.updateStake({ target: { value: '1' } })
    expect(formState.form.stake).toBe(0.01)
    expect(formState.formatStake(formState.form.stake)).toBe('R$ 0,01')
    formState.updateStake({ target: { value: 'R$ 1.234,56' } })
    expect(formState.form.stake).toBe(1234.56)
    expect(formState.formatStake(formState.form.stake)).toBe('R$ 1.234,56')
    formState.updateStake({ target: { value: '' } })
    expect(formState.form.stake).toBe('')
    expect(formState.formatStake(formState.form.stake)).toBe('')
    formApp.unmount()
  })

  it('carrega e envia o valor monetário editado como número', () => {
    const save = vi.fn()
    const formApp = renderer.createApp({ ...BetForm, render: () => null }, { bet, onSave: save })
    formApp.provide(ssrContextKey, {})
    const formState = formApp.mount(node()).$.setupState
    expect(formState.formatStake(formState.form.stake)).toBe('R$ 10,00')
    formState.updateStake({ target: { value: 'R$ 25,90' } })
    formState.saveBet()
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ stake: 25.9 }))
    formApp.unmount()
  })
})
