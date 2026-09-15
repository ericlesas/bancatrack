import { beforeEach, expect, it, vi } from 'vitest'
import { getDocsFromServer, writeBatch, deleteDoc } from 'firebase/firestore'
import { removeAllUserData } from './bets-repository.js'
vi.mock('./firebase.js', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), doc: vi.fn(), query: vi.fn(), limit: vi.fn(), getDocsFromServer: vi.fn(), writeBatch: vi.fn(), deleteDoc: vi.fn(),
  onSnapshot: vi.fn(), orderBy: vi.fn(), serverTimestamp: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn()
}))
beforeEach(() => vi.resetAllMocks())
it('apaga todos os lotes antes do documento do usuário', async () => {
  const commit = vi.fn().mockResolvedValue()
  const remove = vi.fn()
  writeBatch.mockReturnValue({ delete: remove, commit })
  getDocsFromServer.mockResolvedValueOnce({ empty: false, docs: [{ ref: 'one' }] }).mockResolvedValueOnce({ empty: false, docs: [{ ref: 'two' }] }).mockResolvedValueOnce({ empty: true })
  await removeAllUserData('user')
  expect(remove.mock.calls).toEqual([['one'], ['two']])
  expect(commit).toHaveBeenCalledTimes(2)
  expect(deleteDoc).toHaveBeenCalledTimes(1)
})
it('interrompe a exclusão em caso de falha de lote', async () => {
  getDocsFromServer.mockResolvedValue({ empty: false, docs: [{ ref: 'one' }] })
  writeBatch.mockReturnValue({ delete: vi.fn(), commit: vi.fn().mockRejectedValue(new Error('offline')) })
  await expect(removeAllUserData('user')).rejects.toThrow('offline')
  expect(deleteDoc).not.toHaveBeenCalled()
})
