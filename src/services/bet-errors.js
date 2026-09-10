const actions = {
  create: 'salvar a entrada',
  edit: 'salvar as alterações',
  delete: 'excluir a entrada',
  load: 'carregar suas entradas'
}

export function betErrorMessage(error, action) {
  const prefix = `Não foi possível ${actions[action] ?? 'concluir a operação'}.`
  const code = (error?.code ?? '').replace(/^firestore\//, '')
  const reasons = {
    'permission-denied': 'Sua conta não tem permissão para esta operação. Entre novamente e, se continuar, procure suporte.',
    unauthenticated: 'Sua sessão precisa ser renovada. Saia e entre novamente.',
    unavailable: 'O serviço está indisponível no momento. Tente novamente mais tarde.',
    'not-found': 'Esta entrada não está mais disponível. Consulte o histórico atualizado.',
    'invalid-argument': 'Confira a data, a odd e o valor informados.',
    'resource-exhausted': 'O serviço atingiu seu limite temporário. Tente novamente mais tarde.',
    'failed-precondition': 'Não foi possível concluir esta operação no momento. Atualize a página e tente novamente.'
  }
  return `${prefix} ${reasons[code] ?? 'Tente novamente. Se o problema continuar, procure suporte.'}`
}
