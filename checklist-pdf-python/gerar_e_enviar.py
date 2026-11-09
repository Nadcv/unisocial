# -*- coding: utf-8 -*-
"""
Pipeline Python standalone (fora da app Apps Script) que:
  1. Lê os checklists guardados na mesma Google Sheet da app Cablotec;
  2. Para os que ainda não foram processados, gera um PDF fiel ao modelo
     de referência (templates/checklist.html), incluindo fotos e
     assinaturas descarregadas do Google Drive;
  3. Envia esse PDF por e-mail;
  4. Regista o checklist como "enviado" numa aba auxiliar da própria
     Sheet, para nunca reenviar o mesmo PDF.

Pensado para correr sozinho, sem intervenção, disparado por um
agendamento (GitHub Actions). Todas as credenciais vêm de variáveis de
ambiente (ver README.md deste projeto) — nunca ficam escritas no código.
"""

import base64
import json
import os
import smtplib
import sys
from datetime import datetime, timezone
from email.message import EmailMessage

import gspread
from google.auth.transport.requests import AuthorizedSession
from google.oauth2.service_account import Credentials
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from context_builder import construir_contexto

PASTA_BASE = os.path.dirname(os.path.abspath(__file__))

ABA_CHECKLISTS = "Checklists"
ABA_ENVIADOS = "PDFsEnviados"
CABECALHOS_ENVIADOS = ["id", "enviadoEm"]

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]

DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files/{id}"


def obter_env(nome, obrigatorio=True, default=None):
    valor = os.environ.get(nome, default)
    if obrigatorio and not valor:
        raise SystemExit("Variável de ambiente em falta: " + nome)
    return valor


def autenticar():
    """Lê a chave da conta de serviço (JSON) da variável de ambiente
    GOOGLE_SERVICE_ACCOUNT_JSON e devolve (cliente_sheets, sessao_drive)."""
    chave_json = obter_env("GOOGLE_SERVICE_ACCOUNT_JSON")
    info = json.loads(chave_json)
    credenciais = Credentials.from_service_account_info(info, scopes=SCOPES)
    cliente_sheets = gspread.authorize(credenciais)
    sessao_drive = AuthorizedSession(credenciais)
    return cliente_sheets, sessao_drive


def obter_ou_criar_aba(spreadsheet, nome, cabecalhos):
    try:
        return spreadsheet.worksheet(nome)
    except gspread.WorksheetNotFound:
        aba = spreadsheet.add_worksheet(title=nome, rows=10, cols=len(cabecalhos))
        aba.append_row(cabecalhos)
        return aba


def ler_ids_ja_enviados(aba_enviados):
    registos = aba_enviados.get_all_records()
    return {str(r.get("id")) for r in registos if r.get("id")}


class ResolvedorFotosDrive:
    """Descarrega imagens do Drive (fotos/assinaturas do checklist) uma vez
    por execução e devolve data-URIs prontos para o <img src="..."> do PDF."""

    def __init__(self, sessao_drive):
        self._sessao = sessao_drive
        self._cache = {}

    def __call__(self, ref):
        ficheiro_id = ref.get("id") if isinstance(ref, dict) else None
        if not ficheiro_id:
            return None
        if ficheiro_id in self._cache:
            return self._cache[ficheiro_id]
        try:
            meta = self._sessao.get(
                DRIVE_FILES_URL.format(id=ficheiro_id), params={"fields": "mimeType"}
            )
            meta.raise_for_status()
            mime = meta.json().get("mimeType", "image/jpeg")

            conteudo = self._sessao.get(
                DRIVE_FILES_URL.format(id=ficheiro_id), params={"alt": "media"}
            )
            conteudo.raise_for_status()
            b64 = base64.b64encode(conteudo.content).decode("ascii")
            url = "data:%s;base64,%s" % (mime, b64)
        except Exception as erro:
            print("  aviso: falhou ao descarregar imagem %s (%s)" % (ficheiro_id, erro))
            url = None
        self._cache[ficheiro_id] = url
        return url


def gerar_pdf(tipo, dados_checklist, resolver_foto, caminho_pdf):
    contexto = construir_contexto(tipo, dados_checklist, resolver_foto=resolver_foto)
    env = Environment(loader=FileSystemLoader(os.path.join(PASTA_BASE, "templates")))
    template = env.get_template("checklist.html")
    html_str = template.render(**contexto)
    HTML(string=html_str, base_url=PASTA_BASE).write_pdf(caminho_pdf)
    return contexto


def enviar_email(caminho_pdf, destinatarios, assunto, corpo):
    host = obter_env("SMTP_HOST")
    porta = int(obter_env("SMTP_PORT", default="465"))
    utilizador = obter_env("SMTP_USER")
    palavra_passe = obter_env("SMTP_PASSWORD")
    remetente = obter_env("EMAIL_REMETENTE", obrigatorio=False, default=utilizador)

    msg = EmailMessage()
    msg["Subject"] = assunto
    msg["From"] = remetente
    msg["To"] = ", ".join(destinatarios)
    msg.set_content(corpo)

    with open(caminho_pdf, "rb") as f:
        msg.add_attachment(
            f.read(),
            maintype="application",
            subtype="pdf",
            filename=os.path.basename(caminho_pdf),
        )

    with smtplib.SMTP_SSL(host, porta) as servidor:
        servidor.login(utilizador, palavra_passe)
        servidor.send_message(msg)


def destinatarios_para(linha_checklist):
    lista = []
    email_checklist = (linha_checklist.get("email") or "").strip()
    if email_checklist:
        lista.append(email_checklist)
    extra = os.environ.get("EMAIL_DESTINATARIOS_EXTRA", "")
    for endereco in extra.split(","):
        endereco = endereco.strip()
        if endereco and endereco not in lista:
            lista.append(endereco)
    return lista


def main():
    sheet_id = obter_env("GOOGLE_SHEET_ID")
    cliente_sheets, sessao_drive = autenticar()
    spreadsheet = cliente_sheets.open_by_key(sheet_id)

    aba_checklists = spreadsheet.worksheet(ABA_CHECKLISTS)
    aba_enviados = obter_ou_criar_aba(spreadsheet, ABA_ENVIADOS, CABECALHOS_ENVIADOS)

    ja_enviados = ler_ids_ja_enviados(aba_enviados)
    linhas = aba_checklists.get_all_records()

    pendentes = [l for l in linhas if str(l.get("id")) and str(l.get("id")) not in ja_enviados]
    print("Checklists encontrados: %d | já enviados: %d | por enviar: %d" % (
        len(linhas), len(ja_enviados), len(pendentes)
    ))

    resolver_foto = ResolvedorFotosDrive(sessao_drive)
    pasta_saida = os.path.join(PASTA_BASE, "saida")
    os.makedirs(pasta_saida, exist_ok=True)

    enviados_agora = 0
    for linha in pendentes:
        checklist_id = str(linha.get("id"))
        tipo = linha.get("tipo")
        if tipo not in ("grupos", "ciclos"):
            print("  a ignorar checklist %s: tipo desconhecido (%r)" % (checklist_id, tipo))
            continue

        print("A processar checklist %s (%s, %s)..." % (checklist_id, tipo, linha.get("equipamento")))
        try:
            dados_json = json.loads(linha.get("dadosJson") or "{}")
        except (TypeError, ValueError) as erro:
            print("  erro ao ler dadosJson do checklist %s: %s" % (checklist_id, erro))
            continue

        nome_ficheiro = "checklist_%s_%s.pdf" % (dados_json.get("numeroChecklist") or checklist_id, tipo)
        caminho_pdf = os.path.join(pasta_saida, nome_ficheiro)

        try:
            gerar_pdf(tipo, dados_json, resolver_foto, caminho_pdf)
        except Exception as erro:
            print("  erro ao gerar PDF do checklist %s: %s" % (checklist_id, erro))
            continue

        destinatarios = destinatarios_para(linha)
        if not destinatarios:
            print("  aviso: checklist %s sem destinatário de e-mail, PDF gerado mas não enviado" % checklist_id)
        else:
            assunto = "Checklist de Produção — %s (Nº %s)" % (
                linha.get("equipamento") or tipo, dados_json.get("numeroChecklist") or checklist_id,
            )
            corpo = (
                "Segue em anexo o checklist de produção preenchido.\n\n"
                "Equipamento: %s\nNº Série: %s\n"
            ) % (linha.get("equipamento") or "", linha.get("numeroSerie") or "")
            try:
                enviar_email(caminho_pdf, destinatarios, assunto, corpo)
                print("  e-mail enviado para: %s" % ", ".join(destinatarios))
            except Exception as erro:
                print("  erro ao enviar e-mail do checklist %s: %s" % (checklist_id, erro))
                continue

        aba_enviados.append_row([checklist_id, datetime.now(timezone.utc).isoformat()])
        enviados_agora += 1

    print("Concluído. PDFs gerados e enviados nesta execução: %d" % enviados_agora)


if __name__ == "__main__":
    try:
        main()
    except SystemExit as erro:
        print("ERRO: %s" % erro)
        sys.exit(1)
