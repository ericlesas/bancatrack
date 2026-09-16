# Preparação para compartilhamento e lojas

Revisão: 15/09/2026. O proprietário pretende publicar futuramente; a distribuição nas lojas não faz parte desta entrega.

## Identidade e compartilhamento

- Manter o nome BancaTrack. O nome já está consistente no HTML e manifesto PWA.
- Metadados Open Graph e Twitter usam o logo atual e a URL de produção. Validar a prévia real após publicar: redes sociais podem manter cache.
- A política de privacidade está em `/privacy/`, em HTML estático, acessível sem login e sem inicializar o Firebase. Contato autorizado: Éricles de Alencar Santos, ericles.alencar96@gmail.com.
- Antes da distribuição pública, revisar a política à luz das regiões de armazenamento, retenção e configurações efetivas dos serviços. Não foi feita auditoria jurídica nem verificação das configurações remotas.

## Ícones Android e iOS

| Uso | Situação | Próximo passo |
| --- | --- | --- |
| PWA Android básico | PNG 192×192 e 512×512, `purpose: any` | Manter compatibilidade atual |
| PWA Android adaptável | Sem variante `maskable`; logo circular com transparência e conteúdo próximo das bordas | Criar versão 512×512 ou maior com fundo opaco, sem mudar a identidade, e manter o logo dentro do círculo central de raio 40% da largura; testar máscaras antes de declarar `purpose: maskable` |
| Ícone nativo Android | Sem projeto Android | Ao empacotar, preparar camadas de primeiro plano/fundo e versão monocromática para ícones temáticos |
| Listagem Google Play | Ícone atual tem 512×512, mas ainda requer revisão visual específica | Preparar PNG conforme especificação da loja, sem incorporar arredondamento ou sombra externos |
| PWA iPhone | Apple touch icon de 180×180 já configurado | Validar instalação em aparelho real |
| App Store | Sem projeto iOS nem asset catalog | Preparar ícone de 1024×1024 e assets conforme a versão do Xcode usada |

A fonte atual tem 1271×1238 e transparência. Não marcar a imagem atual como `maskable` sem criar uma composição segura: isso pode cortar o texto. Uma revisão visual posterior deve considerar legibilidade do retrato e das letras em tamanhos pequenos.

Fontes:
- https://web.dev/articles/maskable-icon
- https://developer.android.com/distribute/google-play/resources/icon-design-specifications
- https://developer.android.com/studio/write/create-app-icons
- https://developer.apple.com/documentation/xcode/configuring-your-app-icon

## Publicação futura

Ícones e um PWA não bastam para publicar nas lojas. Ainda serão necessários empacotamento, contas de desenvolvedor, assinatura, testes em aparelhos e declarações de privacidade/segurança dos dados.

Revisar o enquadramento do produto nas políticas relacionadas a apostas antes de investir no empacotamento; não presumir aprovação nem rejeição apenas por ser um registro de banca. A política Google Play tem condições distintas para apostas e anúncios relacionados (inclusive restrições de funcionalidades auxiliares dentro da seção de anúncios). O app atual não integra anúncios. A Apple também avalia utilidade e funcionalidade além de um site reempacotado.

- https://support.google.com/googleplay/android-developer/answer/9877032
- https://developer.apple.com/app-store/review/guidelines/

Resolver também as pendências de exclusão concorrente e ações de e-mail registradas no AGENTS.md antes da distribuição pública.
