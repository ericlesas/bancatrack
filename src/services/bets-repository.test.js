import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore'
import { createBet, observeBets, removeBet, updateBet } from './bets-repository.js'

vi.mock('./firebase.js', () => ({ db: { name: 'mock-db' } }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn()
}))

const bet = {
  id: 'bet-1',
  betDate: '2026-09-10',
  odd: 1.85,
  stake: 20,
  wasTaken: true,
  result: 'green',
  ignoredField: 'não deve ser persistido'
}

beforeEach(() => {
  vi.clearAllMocks()
  collection.mockReturnValue('bets-collection')
  orderBy.mockReturnValue('bet-order')
  query.mockReturnValue('bets-query')
  doc.mockReturnValue('bet-document')
  serverTimestamp.mockReturnValue('server-timestamp')
})

describe('repositório de entradas', () => {
  it('observa as entradas do usuário, ordenadas pela data mais recente', () => {
    const unsubscribe = vi.fn()
    const onBets = vi.fn()
    const onError = vi.fn()
    onSnapshot.mockReturnValue(unsubscribe)
    const result = observeBets('user-1', onBets, onError)
    expect(collection).toHaveBeenCalledWith({ name: 'mock-db' }, 'users', 'user-1', 'bets')
    expect(orderBy).toHaveBeenCalledWith('betDate', 'desc')
    expect(query).toHaveBeenCalledWith('bets-collection', 'bet-order')
    expect(onSnapshot).toHaveBeenCalledWith('bets-query', { includeMetadataChanges: true }, expect.any(Function), onError)
    expect(result).toBe(unsubscribe)
  })

  it('converte o snapshot e informa entradas com gravações pendentes', () => {
    const onBets = vi.fn()
    observeBets('user-1', onBets, vi.fn())
    const snapshotHandler = onSnapshot.mock.calls[0][2]
    snapshotHandler({
      metadata: { fromCache: true, hasPendingWrites: true },
      docs: [
        { id: 'bet-1', data: () => ({ odd: 2 }), metadata: { hasPendingWrites: true } },
        { id: 'bet-2', data: () => ({ odd: 1.5 }), metadata: { hasPendingWrites: false } }
      ]
    })
    expect(onBets).toHaveBeenCalledWith(
      [{ id: 'bet-1', odd: 2 }, { id: 'bet-2', odd: 1.5 }],
      { pendingIds: ['bet-1'], fromCache: true, hasPendingWrites: true }
    )
  })

  it('cria uma entrada somente com os campos permitidos e timestamps', () => {
    createBet('user-1', bet)
    expect(doc).toHaveBeenCalledWith({ name: 'mock-db' }, 'users', 'user-1', 'bets', bet.id)
    expect(setDoc).toHaveBeenCalledWith('bet-document', {
      betDate: bet.betDate,
      odd: bet.odd,
      stake: bet.stake,
      wasTaken: bet.wasTaken,
      result: bet.result,
      createdAt: 'server-timestamp',
      updatedAt: 'server-timestamp'
    })
  })

  it('atualiza os campos editáveis sem substituir a data de criação', () => {
    updateBet('user-1', bet)
    expect(updateDoc).toHaveBeenCalledWith('bet-document', {
      betDate: bet.betDate,
      odd: bet.odd,
      stake: bet.stake,
      wasTaken: bet.wasTaken,
      result: bet.result,
      updatedAt: 'server-timestamp'
    })
  })

  it('exclui apenas o documento indicado do usuário', () => {
    removeBet('user-1', bet.id)
    expect(doc).toHaveBeenCalledWith({ name: 'mock-db' }, 'users', 'user-1', 'bets', bet.id)
    expect(deleteDoc).toHaveBeenCalledWith('bet-document')
  })
})
