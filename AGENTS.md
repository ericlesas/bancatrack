# Banca Track

## Visão geral

Banca Track é uma aplicação web/PWA para gestão de banca de apostas.

A aplicação permite registrar apostas, acompanhar histórico, calcular resultados e armazenar os dados do usuário no Firebase.

---

## Stack principal

- Vue 3
- JavaScript com ES Modules
- Composition API
- `<script setup>`
- Vite 4
- Firebase SDK 12
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting
- vite-plugin-pwa
- CSS próprio
- Vitest
- Node.js >= 20
- npm

## Observações sobre a stack

- O projeto não utiliza TypeScript.
- O Firebase Authentication é utilizado para cadastro, login com e-mail/senha e encerramento de sessão.
- O Cloud Firestore é utilizado para persistência das apostas e atualização dos dados.
- O PWA utiliza `vite-plugin-pwa` para manifesto e service worker.
- Os testes automatizados utilizam Vitest.
- Python não faz parte da aplicação. Ele pode existir apenas como ferramenta auxiliar em scripts de suporte.

---

## Regras de desenvolvimento

- Não usar TypeScript.
- Preferir Composition API.
- Preferir `<script setup>` nos componentes Vue.
- Não adicionar dependências sem necessidade.
- Manter componentes pequenos e com responsabilidades claras.
- Evitar duplicação de lógica.
- Reutilizar componentes e funções existentes quando fizer sentido.
- Manter o padrão arquitetural existente do projeto.
- Não realizar refatorações não relacionadas à tarefa atual.

---

## Firebase

- Não alterar configurações do Firebase sem explicar antes.
- Não alterar `firebase.json`, `.firebaserc`, regras do Firestore ou configuração de autenticação sem justificar a mudança.
- Não expor secrets, API keys privadas ou valores de arquivos `.env`.
- Utilizar as variáveis de ambiente já existentes sempre que possível.
- Mudanças que possam impactar dados existentes devem ser explicadas antes de serem implementadas.

---

## Testes

- Sempre executar os testes após mudanças que afetem código da aplicação.
- Utilizar os testes existentes como referência antes de criar novos padrões.
- Criar ou atualizar testes quando houver mudança em regras de negócio ou cálculos.
- Não considerar uma alteração concluída se os testes relevantes estiverem falhando.
- Informar claramente quando não for possível executar algum teste.

---

## Arquitetura

- Explique mudanças arquiteturais importantes.
- Antes de introduzir uma nova abstração, serviço, camada ou padrão, verificar se a estrutura atual já resolve o problema.
- Evitar complexidade desnecessária.
- Preferir soluções simples e compatíveis com a arquitetura existente.
- Mudanças estruturais grandes devem ser explicadas antes da implementação.

---

## Forma de trabalho

Ao receber uma tarefa:

1. Analise primeiro a implementação existente.
2. Preserve os padrões atuais do projeto.
3. Faça apenas as alterações necessárias para atender à tarefa.
4. Execute os testes relevantes.
5. Informe quais arquivos foram alterados.
6. Resuma o que foi implementado.
7. Destaque decisões arquiteturais ou impactos importantes.
8. Quando uma alteração for destinada à branch `main`, validar build e testes antes do deploy.
9. Após merge na `main`, realizar deploy no Firebase Hosting.

---

## Deploy

- Todo merge realizado na branch `main` deve resultar em um deploy para o Firebase Hosting.
- Antes do deploy, verificar se o projeto compila corretamente.
- Executar os testes relevantes antes do deploy.
- Informar claramente os comandos que serão executados.
- Em caso de falha de build ou testes, interromper o deploy e explicar o motivo.
- Após o deploy, informar o resultado da publicação e a URL do ambiente publicado.