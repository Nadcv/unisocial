# Checklist PDF (pipeline Python)

Pipeline standalone, **separado da app Apps Script**, que corre sozinho
num agendamento (GitHub Actions) e:

1. Lê os checklists guardados na mesma Google Sheet da app Cablotec;
2. Gera um PDF fiel ao modelo de referência (fundo cinza, cartão branco
   arredondado, cabeçalho repetido em cada página, campos com borda,
   radios OK/NA/NOK a verde, fotos com borda tracejada, assinaturas em
   caixa com borda) para cada checklist ainda não processado;
3. Envia esse PDF por e-mail para quem preencheu o checklist (+ outros
   destinatários opcionais);
4. Regista cada checklist como "enviado" numa aba `PDFsEnviados` da
   própria Sheet, para nunca reenviar o mesmo PDF duas vezes.

Corre automaticamente via GitHub Actions (`.github/workflows/checklist-pdf.yml`,
duas vezes por dia por omissão), sem qualquer intervenção manual.

## Estrutura

```
checklist-pdf-python/
  checklist_fields.py    # estrutura dos campos (portada 1:1 do Index.html da app)
  context_builder.py     # converte os campos do checklist em blocos prontos a desenhar
  templates/checklist.html  # template HTML/CSS que gera o PDF
  gerar_e_enviar.py       # script principal (ler Sheet -> gerar PDF -> enviar e-mail)
  requirements.txt
```

## Credenciais necessárias (GitHub Secrets)

**Nunca** colocar nenhuma destas credenciais diretamente no código ou no
repositório — só como *GitHub Secrets* (`Settings → Secrets and variables
→ Actions → New repository secret`).

| Secret | O que é |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Conteúdo completo do ficheiro JSON da conta de serviço Google (ver abaixo) |
| `GOOGLE_SHEET_ID` | O ID da Google Sheet da app (está no URL: `.../spreadsheets/d/<ID>/edit`) |
| `SMTP_HOST` | Servidor SMTP (ex.: `smtp.gmail.com`) |
| `SMTP_PORT` | Porta SMTP SSL (ex.: `465`) |
| `SMTP_USER` | Utilizador/e-mail de envio |
| `SMTP_PASSWORD` | Palavra-passe de aplicação SMTP (ver abaixo) |
| `EMAIL_REMETENTE` | (opcional) Endereço "De:" se diferente de `SMTP_USER` |
| `EMAIL_DESTINATARIOS_EXTRA` | (opcional) E-mails extra a receber sempre cópia, separados por vírgula |

### 1. Criar a conta de serviço Google (`GOOGLE_SERVICE_ACCOUNT_JSON`)

1. Na [Google Cloud Console](https://console.cloud.google.com/), criar (ou
   escolher) um projeto.
2. **APIs & Services → Library**: ativar a **Google Sheets API** e a
   **Google Drive API**.
3. **APIs & Services → Credentials → Create credentials → Service account**.
   Dar-lhe um nome (ex.: `checklist-pdf-bot`) e criar.
4. Na conta de serviço criada, separador **Keys → Add key → Create new key
   → JSON**. Isto descarrega um ficheiro `.json` — é esse conteúdo (o
   ficheiro todo) que vai para o secret `GOOGLE_SERVICE_ACCOUNT_JSON`.
5. Copiar o endereço de e-mail da conta de serviço (algo como
   `checklist-pdf-bot@<projeto>.iam.gserviceaccount.com`).
6. Abrir a Google Sheet da app Cablotec → botão **Partilhar** → colar esse
   e-mail da conta de serviço com permissão de **Editor** (precisa de
   Editor, não só leitura, para poder escrever na aba `PDFsEnviados`).
7. As fotos/assinaturas dos checklists ficam numa pasta do Google Drive
   (a mesma usada pela app). Partilhar também essa pasta com o e-mail da
   conta de serviço (acesso de leitura é suficiente).

### 2. Palavra-passe de aplicação SMTP (`SMTP_PASSWORD`)

Se usar Gmail como remetente:

1. Ativar a verificação em 2 passos na conta Google que vai enviar os
   e-mails.
2. Ir a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   e gerar uma "palavra-passe de aplicação".
3. Usar essa palavra-passe (não a palavra-passe normal da conta) no
   secret `SMTP_PASSWORD`. `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`,
   `SMTP_USER=<o-email-gmail>`.

## Testar manualmente

No GitHub, separador **Actions → Checklist PDF - gerar e enviar → Run
workflow** corre o pipeline imediatamente (não é preciso esperar pelo
agendamento).

## Correr localmente (para testes)

```bash
cd checklist-pdf-python
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export GOOGLE_SERVICE_ACCOUNT_JSON="$(cat caminho/para/chave.json)"
export GOOGLE_SHEET_ID="..."
export SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_USER=... SMTP_PASSWORD=...
python gerar_e_enviar.py
```

Os PDFs gerados ficam em `checklist-pdf-python/saida/` (não é enviado
para o Git).

## Alterar a frequência do agendamento

Editar as linhas `cron:` em `.github/workflows/checklist-pdf.yml` (hora
em UTC). Por omissão corre às 7h e às 17h (hora de Portugal, UTC+0/+1).
