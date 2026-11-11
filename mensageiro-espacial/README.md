# 🛰️ Mensageiro Espacial — mensagens sem Wi‑Fi nem internet

Web app (um único `index.html`, sem dependências) para enviar mensagens
**sem rede**, usando o mesmo princípio que a NASA usa no espaço profundo:
**rede tolerante a atrasos (DTN, "armazenar e reencaminhar")**.

## A verdade sobre 1 000 000 000 000 km

10¹² km é cerca de 6 700 vezes a distância Terra‑Sol (~0,1 ano‑luz). Nada
viaja mais depressa do que a luz, por isso **qualquer** mensagem demora no
mínimo **~38,6 dias** a lá chegar. Um telemóvel não tem potência nem antena
para isso (o separador **Física** da app faz as contas: o sinal chegaria
~147 dB abaixo do ruído). Nem a Voyager 1, a ~25 mil milhões de km, se ouve
sem as antenas de 70 m da NASA.

O que a app faz é o que funciona na prática: a mensagem vira um **pacote**
autónomo (remetente, destino, hora, distância, n.º de saltos, CRC‑32) que
pode viajar **salto a salto** por qualquer meio, sem ligação contínua até
ao destino. Quem recebe um pacote que não é para si pode reencaminhá‑lo.

## Meios de transmissão (todos sem rede)

| Meio | Como |
|------|------|
| 🔊 **Som** | Modem acústico MFSK (34 tons, 800–3440 Hz, ~4 bytes/s). Um aparelho toca, o outro ouve pelo microfone. |
| 💡 **Morse** | Som, ecrã a piscar (lanterna/espelho) ou vibração. Também serve para rádio CB ou batidas. Inclui descodificador manual. |
| 📤 **Ficheiro / Partilha** | Ficheiro `.uni` por Bluetooth, Nearby Share, AirDrop, cabo USB, cartão SD. |
| 🔤 **Código de texto** | `UNI1.…` para copiar por SMS, ditar por rádio de voz ou escrever em papel. |

## Funcionalidades

- **Cifra de ponta a ponta opcional** (AES‑256‑GCM, chave PBKDF2 a partir de palavra‑passe).
- **Verificação de integridade** (CRC‑32) — pacotes corrompidos são rejeitados.
- **Compressão** automática (deflate) quando o browser suporta.
- **Reencaminhamento** (retransmissores): incrementa o contador de saltos.
- **Simulação do atraso da luz**: a mensagem só "chega" quando a luz lá chegaria.
- **Calculadora física**: tempo‑luz, perda em espaço livre, comparação com a Voyager.
- **Funciona offline**: abra uma vez em `https://` (ou instale como app/PWA)
  e o service worker guarda tudo em cache. Também funciona abrindo o
  `index.html` diretamente (a cifra exige `https://` ou `localhost`).

## Usar

```bash
cd mensageiro-espacial
python3 -m http.server 8000
# abrir http://localhost:8000 em dois aparelhos/browsers
```

1. Defina o seu **indicativo** (ex.: `TERRA-1`).
2. **Escrever** → destino, distância, mensagem (e palavra‑passe opcional).
3. **Transmitir** → escolha o meio.
4. No outro aparelho, **Receber** → ouvir, colar código ou abrir ficheiro.
5. **Mensagens** → ler, decifrar, ou reencaminhar para o próximo salto.
