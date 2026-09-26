---
name: PWA e Leitura de Câmera (Fase 8)
description: Diretrizes para tornar o sistema um Progressive Web App instalável e incluir recurso de câmera para ler QR Code de notas fiscais.
---

# PWA (Fase 8)

Transforma a aplicação em um app instalável (Progressive Web App) e habilita funcionalidades nativas de dispositivo, como a câmera para agilizar o preenchimento de notas fiscais.

## 1. PWA - Service Worker e Manifest
Para o PWA no Vite, utilizaremos o plugin `vite-plugin-pwa` e geraremos um arquivo de manifesto e os ícones padrão.

**Configuração necessária:**
- Instalar `vite-plugin-pwa`.
- Adicionar ao `vite.config.ts`.
- Configurar o `manifest` com os ícones, nome, cor de tema (`theme_color`) e cor de fundo (`background_color`).
- Inserir as tags meta do PWA no `index.html`.

## 2. Funcionalidade de Câmera (Leitor de QR Code / Chave)
O foco é usar a câmera em dispositivos móveis no formulário de Lançamento (aba "Nota Fiscal").
- **Biblioteca recomendada:** `html5-qrcode` ou `react-qr-reader` (dependendo da compatibilidade com React 18, `html5-qrcode` com wrapper manual costuma ser mais robusto).
- **Integração no Formulário:** No campo `Chave de Acesso` do modal de Novo Lançamento, incluir um botão de "câmera". Ao clicar, abre um leitor na tela.
- Ao detectar o QR Code, a string da URL/chave deve ser tratada para extrair apenas os 44 dígitos da chave de acesso e preencher automaticamente o input.

## 3. Integração SEFAZ (Decisão Pendente)
A documentação marca como pendente se a chave lida deverá preencher os outros dados. Para manter escopo local sem criar um backend para raspar a Sefaz (que exige captcha/certificados digitais complexos), a solução atual deve se limitar a preencher o campo "Chave de Acesso" automaticamente com o leitor.

## 4. Pipeline de Execução (Próximos Passos)
1. Rodar `npm install vite-plugin-pwa -D`.
2. Rodar `npm install html5-qrcode`.
3. Criar os ícones do PWA (pode ser 192x192 e 512x512 padrão na pasta public).
4. Configurar `vite.config.ts`.
5. Modificar `NovoLancamento.tsx` para incluir o leitor de QRCode.
