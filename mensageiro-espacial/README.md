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

## 🆘 Emergência (Portugal, Espanha, São Tomé e Príncipe)

Separador **Emergência**: gera uma mensagem compacta **≤ 160 caracteres, em
maiúsculas, sem acentos nem vírgulas** — o mesmo texto serve para SMS (um acento
faria o SMS cair para 70 caracteres), e‑mail, Winlink e JS8Call — legível por
quem não tem a app:

```
SOS1 SAO-TOME-1 T111015 L0.33650/6.72730 P3 FER AGUA CASA AZUL JUNTO A PONTE CK1B49
```

`T` = dia/hora/minuto UTC · `L` = latitude,longitude (GPS, funciona sem rede) ·
`P` = n.º de pessoas · códigos (`OK FER GRV PRESO EVAC AGUA COMIDA MED ABRIGO
CHEIA FOGO BAT`) · texto livre · `CKXXXX` = verificação (CRC‑16). Mensagens
maiores são divididas em partes `(1/2)`, `(2/2)` e voltam a juntar‑se ao ler.

**Contactos e envio** (abre a app de SMS ou de e‑mail do telemóvel já preenchida):

| Tipo | Envio |
|------|-------|
| 📱 Telemóvel | SMS normal. Um SMS internacional de PT/ES para um número de STP (+239, CST/Unitel) não precisa de gateway. Se o telemóvel e a operadora suportarem Starlink Direct to Cell, segue por satélite. |
| 🛰️ Iridium | e‑mail para `<número>@msg.iridium.com` |
| 🛰️ Inmarsat | e‑mail para `<número>@message.inmarsat.com` |
| 🛰️ Thuraya | e‑mail para `sms@smsr.thuraya.com`, número no assunto |
| ✉️ E‑mail | endereço livre (ex.: Garmin inReach) |
| 📻 Winlink | e‑mail para `<INDICATIVO>@winlink.org`, assunto `//WL2K SOS`: quem tem internet escreve, o radioamador recebe por rádio HF sem internet |
| 📻 JS8Call | copia a linha `<INDICATIVO> MSG SOS1 …` para colar no JS8Call |

**Radioamador:** só pode transmitir quem tiver licença (a licença CEPT
portuguesa cobre visitas temporárias a Espanha; São Tomé e Príncipe exige
licença local da AGER). **Por rádio é proibido cifrar**, por isso a mensagem SOS
vai sempre em texto aberto. Para ~800 km (PT ⇄ Valência) a banda dos 40 m
costuma ser melhor do que a dos 20 m; para São Tomé (~4 600 km), 20 m.

⚠️ Os formatos de e‑mail‑para‑satélite devem ser **confirmados com o
fornecedor** de cada terminal. O envio por e‑mail precisa de internet do lado
de quem envia. Em perigo imediato: **112** (PT/ES) ou números locais em STP.

**Ler SOS recebido**: cole o SMS/e‑mail; a app verifica o código, mostra a
localização (link `geo:` para mapas offline) e guarda em Mensagens, de onde
pode ser reencaminhado por som, Morse ou ficheiro.

## 🌐 Relé gratuito (Portugal/Espanha ⇄ São Tomé e Príncipe, custo zero)

Não existe satélite grátis e ilimitado entre PT e STP. A forma **gratuita**
é aproveitar **qualquer momento de internet**, mesmo breve (Wi‑Fi de um café,
escola, dados de um vizinho):

1. As mensagens ficam guardadas no telemóvel (caixa de saída).
2. Quando há ligação, a app publica‑as num **canal** do
   [ntfy](https://ntfy.sh) — serviço público, gratuito, de código aberto, sem
   conta (também pode ser alojado por conta própria).
3. A app de quem tem o mesmo canal recolhe‑as quando apanhar ligação e
   publica uma **confirmação de entrega** (`ACK.<id>.<indicativo>`).
4. O servidor público guarda as mensagens só ~12 h, por isso a app
   **republica** a cada 10 h, durante 7 dias, até receber a confirmação.

Entre esses momentos a mensagem continua a viajar **sem rede** (som, Morse,
ficheiro, papel), de pessoa em pessoa. Quem souber o canal lê as mensagens:
use um canal gerado e, para assuntos privados, uma palavra‑passe (cifra
AES‑256 — o servidor só vê texto cifrado).

### Gateway de SMS (ainda não implementado)

Envio/receção **automáticos** (sem o utilizador carregar em "Enviar SMS")
exigiria um pequeno servidor: app → servidor → API do gateway (Telerivet,
eSMS Africa, …) → SMS em STP, e respostas pelo caminho inverso (webhook).
A chave da API tem de ficar no servidor — nunca dentro da app.

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
