import { describe, expect, it } from 'vitest'
import { betErrorMessage } from './bet-errors.js'

describe('mensagens de erro de entradas', () => {
  it('distingue a operação e traduz códigos com prefixo', () => {
    expect(betErrorMessage({ code: 'firestore/permission-denied' }, 'delete')).toContain('excluir a entrada. Sua conta não tem permissão')
    expect(betErrorMessage({ code: 'not-found' }, 'edit')).toContain('Esta entrada não está mais disponível')
  })
  
  it('não expõe detalhes internos nem promete nova tentativa automática', () => {
    const message = betErrorMessage({ message: 'internal secrets' }, 'create')
    expect(message).toContain('Não foi possível salvar a entrada')
    expect(message).not.toContain('internal secrets')
    expect(message).not.toContain('quando houver conexão')
  })
})
