# -*- coding: utf-8 -*-
"""
Estrutura dos campos do Checklist (Grupos e Ciclos), portada 1:1 do
Index.html/Code.gs da aplicacao Apps Script (cablotec-app), para o PDF
gerado aqui ficar com exatamente os mesmos campos, pela mesma ordem.

Cada "bloco" descreve como ler um valor de `campos` (o dicionario guardado
em dadosJson pela app) e como desenhá-lo no template:

  ("texto", chave, rotulo)                        -> valor simples
  ("radio2", chave, rotulo, opcaoA, opcaoB)        -> duas opções (ex. Sim/Não)
  ("oknanok", chave_lista_de_itens, itens)         -> grupo de perguntas OK/NA/NOK
  ("tabela_componentes", chave, linhas)            -> tabela Modelo/Nº Série
  ("fotos", chave, rotulo)                         -> galeria de fotos
  ("assinatura", chave, rotulo)                    -> imagem de assinatura
  ("textarea", chave, rotulo)                      -> observações (texto livre)
"""

# ---------------------------------------------------------------------
# Grupos (DP156/R05) - 8 páginas no formulário.
# ---------------------------------------------------------------------
CG_PAGINA3_ITENS = [
    {"chave": "armazenamentoPreparacao", "rotulo": "Armazenamento e preparação de material"},
    {"chave": "identificacaoGC", "rotulo": "Identificação do GC (etiqueta com nº de obra, data de início, data de conclusão, operador, supervisor e assinaturas)"},
    {"chave": "montagemRefrigeracao", "rotulo": "Montagem de componentes de refrigeração conforme esquema de refrigeração"},
    {"chave": "elaboracaoTubosCobre", "rotulo": "Elaboração e montagem dos tubos de cobre"},
    {"chave": "oleoAcumuladorLiquido", "rotulo": "Inserir 0,5L de óleo no acumulador líquido (aplicável a grupos MPUM107MLP00E/MPUM108MLP00E)"},
    {"chave": "oleoSeparadorOleo", "rotulo": "Inserir 0,5L de óleo no separador de óleo (aplicável a grupos especiais com separador de óleo)"},
    {"chave": "brasagemComponentes", "rotulo": "Brasagem de componentes e tubos de cobre", "nota": "Ver instrução de trabalho IT92 – Brasagem de componentes sensíveis"},
]
CG_PAGINA3_ITENS2 = [
    {"chave": "apertoPorcas", "rotulo": "Aperto de porcas (untar com óleo a parte de fora do abocardado do tubo para evitar torção no momento do aperto)"},
    {"chave": "apertoSensoresPressao", "rotulo": "Aperto de sensores de pressão (devem ficar posicionados na vertical)"},
    {"chave": "pontasTuboSeladas", "rotulo": "Pontas de tubo seladas depois das torneiras de serviço com 20cm"},
    {"chave": "isolamentoTubagensAspiracao", "rotulo": "Isolamento de tubagens de aspiração"},
    {"chave": "bornesEsquemaEletrico", "rotulo": "Montagem e identificação de bornes conforme esquema elétrico"},
    {"chave": "eletrificacaoEsquema", "rotulo": "Eletrificação conforme esquema elétrico"},
    {"chave": "snubbersBobinas", "rotulo": "Eletrificação e montagem de snubbers nas bobinas das electroválvulas de Cool compressor / Bypass / Defrost"},
    {"chave": "cartaComunicacaoEKA", "rotulo": "Montagem da carta de comunicação (EKA 178B) no interior do controlador Optyma Plus (Danfoss)"},
    {"chave": "identificacaoComponentesEsquemas", "rotulo": "Identificação dos componentes elétricos e mecânicos conforme esquemas elétrico e refrigeração"},
    {"chave": "sondasTemperatura", "rotulo": "Montagem das sondas de temperatura de sucção, ambiente e descarga, devidamente identificadas e na posição indicada no esquema de refrigeração - atenção ao isolamento com silicone da sonda de descarga."},
]
CG_PAGINA4_ITENS = [
    {"chave": "identificacaoGrupoCondensador", "rotulo": "Identificação do grupo condensador (etiqueta de fabrico / supervisão)"},
    {"chave": "identificacaoComponentes", "rotulo": "Identificação dos componentes"},
    {"chave": "cravacaoPonteiras", "rotulo": "Cravação de ponteiras e aplicação em bornes/conetores de forma adequada"},
    {"chave": "montagemEletrificacaoComponentes", "rotulo": "Montagem e eletrificação de componentes conforme esquemas elétrico e refrigeração"},
    {"chave": "isolamentoTubosCobre", "rotulo": "Isolamento dos tubos de cobre e outros componentes"},
    {"chave": "fixacaoComponentes", "rotulo": "Fixação adequada de todos os componentes (verificação de apertos)", "nota": "Atenção ao aperto da bobina de Cool/Dry"},
    {"chave": "ausenciaDanosCondensador", "rotulo": "Ausência de danos físicos no Condensador (ou outros componentes)"},
    {"chave": "limpezaGeral", "rotulo": "Limpeza geral"},
]
CG_PAGINA7_ITENS = [
    {"chave": "caixaMadeira", "rotulo": "Caixa de madeira 1590 × 770 × 1070mm (devidamente identificada)"},
    {"chave": "protecoesPontasTubos", "rotulo": "Colocação de proteções nas pontas dos tubos de cobre ou sobreposições"},
    {"chave": "fixacaoBaseGrupo", "rotulo": "Fixação da base do grupo na base da caixa de madeira"},
    {"chave": "cantosEsponja", "rotulo": "Colocação de cantos em esponja almofadada anti-choque"},
]

GRUPOS_BLOCOS = [
    ("texto", "equipamento", "Equipamento"),
    ("texto", "numeroSerie", "Nº Série"),
    ("radio2", "producaoPor", "Produção do Grupo por", "Aralab", "Subcontrato"),
    ("texto_condicional", "producaoPorEmpresa", "Nome do Subcontracto", "producaoPor", "Subcontrato"),
    ("texto", "email", "E-Mail de quem preenche o documento"),
    ("texto", "esquemaEletrico", "Esquema Elétrico"),
    ("texto", "esquemaRefrigeracao", "Esquema de refrigeração"),
    ("nota_destaque", None, "Verificação de conformidade das estruturas e componentes com a documentação técnica.\n(Qualquer anomalia deverá ser comunicada de imediato à Aralab)"),
    ("oknanok", "verificacaoEstruturas", CG_PAGINA3_ITENS),
    ("oknanok", "verificacaoEstruturas", CG_PAGINA3_ITENS2),
    ("assinatura", "assinaturaPagina3", "Assinatura do Responsável"),
    ("oknanok", "grupoCondensador", CG_PAGINA4_ITENS),
    ("assinatura", "assinaturaPagina4", "Assinatura do Responsável"),
    ("radio_okna", "testeEletricoOk", "Teste Eléctrico"),
    ("texto", "testeEletrico", "Gás"),
    ("radio_okna", "testePressao", "Teste de pressão", "Conforme IT128"),
    ("radio_okna", "testeVacuo", "Teste de vácuo", "Conforme IT128"),
    ("assinatura", "assinaturaPagina5", "Assinatura do Responsável"),
    ("tabela_componentes", "componentes", [
        ("grupoCondensador", "Grupo condensador"),
        ("compressor", "Compressor"),
        ("ventilador", "Ventilador"),
    ]),
    ("fotos", "fotosEtiquetas", "Fotos etiquetas"),
    ("tabela_controlador", "controlador", "Controlador"),
    ("radio2", "temModulosExpansao", "Tem módulos de expansão?", "Sim", "Não"),
    ("fotos", "fotosControlador", "Fotos Controlador"),
    ("fotos", "fotosTesteEletrico", "Fotos Teste Eléctrico"),
    ("fotos", "fotosTestePressao", "Fotos Teste de Pressão"),
    ("fotos", "fotosTesteVacuo", "Fotos Teste de Vácuo"),
    ("assinatura", "assinaturaPagina6", "Assinatura do Responsável"),
    ("oknanok", "embalagem", CG_PAGINA7_ITENS),
    ("assinatura", "assinaturaPagina7", "Assinatura do Responsável"),
    ("radio2", "_conformidade", "Durante a produção do grupo, houve alguma não conformidade que deva ser registada?", "Não", "Sim"),
    ("textarea", "observacoes", "Observações"),
    ("assinatura", "assinaturaSupervisor", "Assinatura do Supervisor"),
]

# ---------------------------------------------------------------------
# Ciclos (DP155/R06) - 9 páginas no formulário.
# ---------------------------------------------------------------------
CC_PAGINA3_ITENS = [
    {"chave": "armazenamentoPreparacao", "rotulo": "Armazenamento e preparação de material"},
    {"chave": "identificacaoClico", "rotulo": "Identificação do Clico (etiqueta com nº de obra, data de início, data de conclusão, operador, supervisor e assinaturas)"},
    {"chave": "montagemVentiladorTampa", "rotulo": "Montagem de ventilador na tampa do evaporador"},
    {"chave": "montagemTampaExterior", "rotulo": "Montagem de tampa exteriror para acesso ao evaporador (apenas modelo PLH)"},
    {"chave": "fixacaoEvaporador", "rotulo": "Fixação do evaporador à estrutura"},
    {"chave": "montagemComponentesRefrigeracao", "rotulo": "Montagem de componentes conforme esquema de refrigeração"},
    {"chave": "brasagemComponentes", "rotulo": "Brasagem de componentes e tubos de cobre"},
    {"chave": "selagemPontasTubos", "rotulo": "Selagem das pontas dos tubos de cobre"},
    {"chave": "isolamentoValvulaExpansao", "rotulo": "Isolamento de válvula de expansão e troço de tubo até ao filtro"},
    {"chave": "montagemSondasEvaporator", "rotulo": 'Montagem das sonda "Evaporator" e "Evaporator Out", devidamente identificadas (consultar posição no esquema refrigeração)'},
    {"chave": "montagemSondaTempHumidade", "rotulo": "Montagem da sonda Temperatura/Humidade Vaisala T1/H1"},
    {"chave": "certificadoVaisala", "rotulo": "Certificado Vaisala digitalizado e arquivado"},
    {"chave": "montagemSondasHeaterAirSafety", "rotulo": 'Montagem das sondas "Heater" e "Air safety" devidamente identificadas'},
    {"chave": "montagemTermicoResistencias", "rotulo": "Montagem de térmico (70°C/80°C) das resistências"},
]
CC_PAGINA3_ITENS2 = [
    {"chave": "montagemCaixaDerivacaoSondas", "rotulo": "Montagem de caixa de derivação (sondas) com conetores de interface de acordo com esquema elétrico"},
    {"chave": "montagemCaixaDerivacaoHeaterSteam", "rotulo": "Montagem de caixa de derivação (heater steam) com conetores e bornes identificados de acordo com layout no esquema elétrico (aplicável ao modelo PH)"},
    {"chave": "conexaoSensoresCaixaDerivacao", "rotulo": "Conexão dos sensores na caixa de derivação conforme esquema elétrico"},
    {"chave": "ligacaoCabosConectoresInterface", "rotulo": "Ligação dos cabos elétricos com conetores de interface em: caixas de derivação, ventilador e sonda T/H (quando solicitado)"},
    {"chave": "conexaoResistenciasTermicoEletrovalvula", "rotulo": "Conexão das resistências, térmico e eletroválvula no conetor macho HC-EVO-B10"},
    {"chave": "aplicacaoConetorFemeaHCEVOB10", "rotulo": "Aplicação de conetor fêmea HC-EVO-B10 (quando solicitado)"},
    {"chave": "montagemAnelVaporHumido", "rotulo": "Montagem de anel de vapor húmido e admissão de ar para gerador humidade em tubagem de PVC (aplicável ao modelo PH)"},
    {"chave": "identificacaoCablagem", "rotulo": "Identificação de cablagem (quando solicitada sua integração)"},
]
CC_PAGINA5_ITENS = [
    {"chave": "identificacaoComponentes", "rotulo": "Identificação dos componentes"},
    {"chave": "cravacaoPonteiras", "rotulo": "Cravação de ponteiras e aplicação em bornes/conetores de forma adequada"},
    {"chave": "montagemEletrificacaoComponentes", "rotulo": "Montagem e eletrificação de componentes conforme esquemas elétrico e refrigeração"},
    {"chave": "isolamentoTubosCobre", "rotulo": "Isolamento dos tubos de cobre e outros componentes"},
    {"chave": "fixacaoComponentes", "rotulo": "Fixação adequada de todos os componentes (verificação de apertos)", "nota": "Atenção ao aperto da bobina de Cool/Dry"},
    {"chave": "ausenciaDanosClico", "rotulo": "Ausência de danos físicos no clico (ou outros componentes)"},
    {"chave": "limpezaGeral", "rotulo": "Limpeza geral"},
]
CC_PAGINA8_ITENS = [
    {"chave": "caixaMadeira", "rotulo": "Caixa de madeira 1375 × 1275 × 1010mm (devidamente identificada)"},
    {"chave": "protecoesPontasTubos", "rotulo": "Colocação de proteções nas pontas dos tubos de cobre ou sobreposições"},
    {"chave": "fixacaoBaseMetatica", "rotulo": "Fixação da base metática do Clico na base da caixa de madeira"},
    {"chave": "cantosEsponja", "rotulo": "Colocação de cantos em esponja almofadada anti-choque"},
    {"chave": "inclusaoKitFixacao", "rotulo": "Inclusão do kit de fixação do Clico"},
]

CICLOS_BLOCOS = [
    ("texto", "equipamento", "Equipamento"),
    ("texto", "numeroSerie", "Nº Série"),
    ("radio2", "producaoPor", "Produção do Clico/VA por", "Aralab", "Subcontrato"),
    ("texto_condicional", "producaoPorEmpresa", "Nome do Subcontracto", "producaoPor", "Subcontrato"),
    ("texto", "email", "E-Mail de quem preenche o documento"),
    ("texto", "esquemaEletrico", "Esquema Elétrico"),
    ("texto", "esquemaRefrigeracao", "Esquema de refrigeração"),
    ("nota_destaque", None, "Verificação de conformidade das estruturas e componentes com a documentação técnica.\n(Qualquer anomalia deverá ser comunicada de imediato à Aralab)"),
    ("oknanok", "verificacaoEstruturas", CC_PAGINA3_ITENS),
    ("texto", "refa", "Refª"),
    ("oknanok", "verificacaoEstruturas", CC_PAGINA3_ITENS2),
    ("assinatura", "assinaturaPagina3", "Assinatura do Responsável"),
    ("radio2", "ventiladoresAdicionais", "Há Ventiladores adicionais?", "Sim", "Não"),
    ("fotos", "fotosIdentificacao", "Fotos identificação"),
    ("oknanok", "clico", CC_PAGINA5_ITENS),
    ("assinatura", "assinaturaPagina5", "Assinatura do Responsável"),
    ("fotos", "fotosTesteEletrico", "Fotos Teste Eléctrico"),
    ("fotos", "fotosTestePressao", "Fotos Teste de Pressão"),
    ("fotos", "fotosTesteVacuo", "Fotos Teste de Vácuo"),
    ("fotos", "fotosTesteEletricoHumidificador", "Fotos Teste Eléctrico Humidificador"),
    ("assinatura", "assinaturaPagina6", "Assinatura do Responsável"),
    ("tabela_sonda", "sondaTemperaturaHumidade", "Sonda Temperatura/Humidade"),
    ("tabela_evaporador", "evaporador", "Evaporador"),
    ("tabela_clico", "clicoIdentificacao", "Identificação Clico"),
    ("assinatura", "assinaturaPagina7", "Assinatura do Responsável"),
    ("oknanok", "embalagem", CC_PAGINA8_ITENS),
    ("assinatura", "assinaturaPagina8", "Assinatura do Responsável"),
    ("textarea", "observacoes", "Observações"),
    ("assinatura", "assinaturaSupervisor", "Assinatura do Supervisor"),
]

TITULOS = {
    "grupos": ("CHECK-LIST DE PRODUÇÃO Grupo Cond. Walkin", "DP156/R05"),
    "ciclos": ("CHECK-LIST DE PRODUÇÃO Clico/VA", "DP155/R06"),
}

BLOCOS_POR_TIPO = {
    "grupos": GRUPOS_BLOCOS,
    "ciclos": CICLOS_BLOCOS,
}
