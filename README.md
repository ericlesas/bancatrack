# BancaTrack

PWA em Vue para registrar entradas de apostas e calcular resultados líquidos seguindo as regras confirmadas a partir da planilha de referência.

Requer Node.js 20 ou superior.

## Comandos

```bash
npm install
npm run dev
npm test
npm run build
```

## Firebase

1. Copie `.env.example` para `.env.local` e preencha a configuração do aplicativo Web do Firebase.
2. Publique as regras de `firestore.rules` pelo painel do Firestore.

O arquivo `.env.local` não é versionado.

## Regras implementadas

- Green realizado: `(odd × stake) - stake`
- Red realizado: `-stake`
- Void, em andamento ou aposta não realizada: `0`
- Resultado diário: soma de **todas** as entradas da mesma data.
