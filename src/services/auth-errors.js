export function authErrorMessage(error) {
  return {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'Senha atual incorreta.',
    'auth/invalid-email': 'Informe um e-mail válido.',
    'auth/email-already-in-use': 'Este e-mail já possui uma conta.',
    'auth/weak-password': 'A senha não atende aos requisitos de segurança. Use pelo menos seis caracteres.',
    'auth/password-does-not-meet-requirements': 'A senha não atende aos requisitos de segurança.',
    'auth/requires-recent-login': 'Entre novamente na conta e tente outra vez.',
    'auth/user-token-expired': 'Sua sessão expirou. Entre novamente.',
    'auth/network-request-failed': 'Confira sua conexão e tente novamente.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
    'auth/expired-action-code': 'Este link expirou. Solicite um novo e-mail de recuperação.',
    'auth/invalid-action-code': 'Este link é inválido ou já foi utilizado. Solicite um novo e-mail de recuperação.'
  }[error.code] || 'Não foi possível concluir a operação. Tente novamente.'
}
