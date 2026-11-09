# -*- coding: utf-8 -*-
"""
Converte os `campos` de um checklist (o dicionario guardado em dadosJson
pela app Cablotec) numa lista plana de "blocos" prontos a desenhar pelo
template Jinja2 (templates/checklist.html).

Mantido separado da leitura da Google Sheet / Drive: este modulo so
transforma dados em memoria. Quem chama pode opcionalmente passar
`resolver_foto(ref)` para transformar uma referencia Drive {"id","nome"}
num URL/caminho local ja descarregado (usado para fotos e assinaturas).
"""

from checklist_fields import BLOCOS_POR_TIPO, TITULOS


def _resolver_imagem(valor, resolver_foto=None):
    """valor pode ser None, uma string (URL/caminho/data-URI já pronta)
    ou um dict {'id':..., 'nome':...} (referência Drive por resolver)."""
    if not valor:
        return None
    if isinstance(valor, str):
        return {"url": valor, "nome": None}
    if isinstance(valor, dict):
        url = valor.get("url")
        if not url and resolver_foto:
            url = resolver_foto(valor)
        if not url:
            return None
        return {"url": url, "nome": valor.get("nome")}
    return None


def construir_blocos(tipo, campos, resolver_foto=None):
    """tipo: 'grupos' ou 'ciclos'. campos: dict guardado em dadosJson.campos.
    Devolve uma lista de dicts simples, um por bloco visual do PDF."""
    campos = campos or {}
    blocos_def = BLOCOS_POR_TIPO[tipo]
    saida = []

    for b in blocos_def:
        kind = b[0]

        if kind == "texto":
            _, chave, rotulo = b
            saida.append({"tipo": "texto", "rotulo": rotulo, "valor": campos.get(chave) or ""})

        elif kind == "texto_condicional":
            _, chave, rotulo, chave_cond, valor_cond = b
            if campos.get(chave_cond) != valor_cond:
                continue
            saida.append({"tipo": "texto", "rotulo": rotulo, "valor": campos.get(chave) or ""})

        elif kind == "radio2":
            _, chave, rotulo, opcao_a, opcao_b = b
            saida.append({
                "tipo": "radio2",
                "rotulo": rotulo,
                "opcoes": [opcao_a, opcao_b],
                "selecionado": campos.get(chave),
            })

        elif kind == "radio_okna":
            chave = b[1]
            rotulo = b[2]
            nota = b[3] if len(b) > 3 else None
            saida.append({
                "tipo": "oknanok",
                "itens": [{"rotulo": rotulo, "valor": campos.get(chave), "nota": nota}],
            })

        elif kind == "nota_destaque":
            _, _, texto = b
            partes = texto.split("\n", 1)
            saida.append({
                "tipo": "nota_destaque",
                "texto": partes[0],
                "destaque": partes[1] if len(partes) > 1 else None,
            })

        elif kind == "oknanok":
            _, chave, itens = b
            dados = campos.get(chave) or {}
            linhas = []
            for item in itens:
                info = dados.get(item["chave"]) or {}
                valor = info.get("valor") if isinstance(info, dict) else info
                linhas.append({"rotulo": item["rotulo"], "valor": valor, "nota": item.get("nota")})
            saida.append({"tipo": "oknanok", "itens": linhas})

        elif kind == "assinatura":
            _, chave, rotulo = b
            saida.append({
                "tipo": "assinatura",
                "rotulo": rotulo,
                "imagem": _resolver_imagem(campos.get(chave), resolver_foto),
            })

        elif kind == "fotos":
            _, chave, rotulo = b
            fotos = []
            for f in (campos.get(chave) or []):
                img = _resolver_imagem(f, resolver_foto)
                if img:
                    fotos.append(img)
            saida.append({"tipo": "fotos", "rotulo": rotulo, "fotos": fotos})

        elif kind == "textarea":
            _, chave, rotulo = b
            saida.append({"tipo": "textarea", "rotulo": rotulo, "valor": campos.get(chave) or ""})

        elif kind == "tabela_componentes":
            _, chave, linhas_def = b
            dados = campos.get(chave) or {}
            linhas = []
            for ch, rotulo in linhas_def:
                item = dados.get(ch) or {}
                linhas.append({"rotulo": rotulo, "valores": [item.get("modelo") or "", item.get("serie") or ""]})
            saida.append({
                "tipo": "tabela",
                "titulo": "Componentes",
                "colunas": ["Modelo", "Nº Série"],
                "linhas": linhas,
            })

        elif kind == "tabela_controlador":
            _, chave, rotulo = b
            item = campos.get(chave) or {}
            saida.append({
                "tipo": "tabela",
                "titulo": rotulo,
                "colunas": ["Modelo", "Nº Série", "Versão do firmware (PV/SW)"],
                "linhas": [{"rotulo": "Controlador", "valores": [
                    item.get("modelo") or "", item.get("serie") or "", item.get("versaoFirmware") or "",
                ]}],
                "nota": "* Informar Aralab sempre que verificada alteração na versão.",
            })

        elif kind in ("tabela_sonda", "tabela_evaporador", "tabela_clico"):
            _, chave, rotulo = b
            item = campos.get(chave) or {}
            saida.append({
                "tipo": "tabela",
                "titulo": rotulo,
                "colunas": ["Fabricante", "Modelo", "Nº Série"],
                "linhas": [{"rotulo": rotulo, "valores": [
                    item.get("fabricante") or "", item.get("modelo") or "", item.get("serie") or "",
                ]}],
            })

    return saida


def construir_contexto(tipo, dados_checklist, resolver_foto=None):
    """dados_checklist: a linha do checklist (com 'dadosJson' já decodificado,
    contendo pelo menos a chave 'campos'). Devolve o dict pronto para o template."""
    titulo, codigo = TITULOS[tipo]
    campos = (dados_checklist or {}).get("campos") or {}
    return {
        "titulo": titulo,
        "codigo": codigo,
        "equipamento": campos.get("equipamento") or "",
        "numero_serie": campos.get("numeroSerie") or "",
        "numero_checklist": (dados_checklist or {}).get("numeroChecklist") or "",
        "blocos": construir_blocos(tipo, campos, resolver_foto=resolver_foto),
    }
