/**
 * Backend em Google Apps Script unificado da Cablotec: "Relatorios" (fotos
 * de Testes/Ciclos) + "Controlo de Producao" (grupos/ciclos por etapa,
 * materiais por modelo, resumos por e-mail).
 *
 * Script LIGADO A UMA GOOGLE SHEET (script vinculado ao ficheiro, nao
 * standalone) - o Controlo de Producao precisa disso para guardar os seus
 * registos. Abra a Google Sheet de Controlo de Producao (ou uma nova,
 * vazia) e, em Extensoes > Apps Script, cole este Code.gs e o Index.html.
 *
 * As duas partes partilham o mesmo doGet/doPost, despachando por
 * ?action=... (fotos) ou por dados.acao (producao) - ver os dois blocos
 * abaixo. Nao ha nenhuma ligacao "solta" por URLs separados: e tudo o
 * mesmo projeto agora, por isso o atalho "Ver fotos deste numero de
 * serie" do Controlo de Producao chama a mesma implementacao /exec
 * diretamente (acao "contarFotos"), sem depender de outro script.
 *
 * O envio de resumos de producao por e-mail (manual e automatico) fica
 * concentrado nas funcoes enviarResumoProducao/configurarEnvioAutomatico/
 * enviarResumosAutomaticos, chamadas a partir de um unico sitio no
 * formulario (card "Enviar resumo de produção por e-mail" /
 * "Envio automático de resumos").
 *
 * CONFIGURACAO OBRIGATORIA:
 *  1. Confirmar/substituir FOLDER_ID pelo ID da pasta do Google Drive onde
 *     as fotos dos Relatorios devem ficar guardadas.
 *  2. Na implementacao (Implementar > Nova implementacao), escolher
 *     "Quem tem acesso: Qualquer pessoa" - ver README.md para o porque
 *     (evita falhas de envio fora da rede da empresa).
 */

var FOLDER_ID = '18H0wf27uzxFdDqdTOQ2f-9P6-zjwbGqO';

// Nome da empresa, mostrado no formulario e usado no assunto/corpo do e-mail.
var EMPRESA = 'Cablotec';

// Nomes das categorias de fotos aceites, e respetivos rotulos usados no e-mail/nome de ficheiro.
var CATEGORIAS = {
  responsavel: 'Fotografia do responsavel',
  eletrico: 'Teste eletrico',
  pressao: 'Pressao',
  especificacao: 'Especificacao da maquina',
  controlador: 'Controlador do compressor',
  deposito: 'Deposito de refrigeracao',
  vacuo: 'Teste de vacuo',
  esquemaEletrico: 'Esquema eletrico',
  esquemaFrio: 'Esquema de frio',
  ventilador: 'Ventilador'
};

// Categorias que suportam reutilizar/guardar um esquema por Grupo + Tipo de valvula.
var CATEGORIAS_ESQUEMA = ['esquemaEletrico', 'esquemaFrio'];

// Listas iniciais de sugestoes (codigos de esquema e gases). Ficam guardadas
// nas Propriedades do Script e crescem sozinhas quando alguem escreve um
// valor novo no formulario - nao e preciso voltar a mexer no codigo.
var LISTAS_PADRAO = {
  grupos: [
    '30',
    '46',
    '67',
    '68',
    '107',
    '108'
  ],
  esquemasEletrico: [
    'DCE-SWE-WALKIN-P-PH-MAIN-F',
    'DCE-SWE-WALKIN-P-PL-PH-PLH-MAIN-G',
    'DCE-SWE-300-500-50-MAIN-B'
  ],
  esquemasFrio: [
    'DCR-SWE-030-EEV-MAIN-A',
    'DCR-SWE-030-R513A-MAIN-A',
    'DCR-SWE-033-MAIN-C',
    'DCR-SWE-033-EEV-MAIN-B',
    'DCR-SWE-046-EEV-MAIN-C',
    'DCR-SWE-046-R513A-MAIN-A',
    'DCR-SWE-068-R513A-MAIN-A',
    'DCR-SWE-068-EEV-MAIN-A',
    'DCR-SWE-067-MAIN-A',
    'DCR-SWE-067-MAIN-B',
    'DCR-SWE-108-R513A-MAIN-A',
    'DCR-SWE-108-EEV-MAIN-D',
    'DCR-SWE-2895K5E-TFD-B',
    'DCR-SWE-Ciclo-PH-R513A-00-MAIN-A',
    'DCR-SWE-Ciclo-PLH-R513A-01_07_04-MAIN-A',
    'DCR-SWE-Ciclo-PH-EEV09-MAIN-A',
    'DCR-SWE-Ciclo-PLH-EEV11_14-MAIN-A'
  ],
  gases: [
    'R449A',
    'R513A',
    'R404A',
    'R407C',
    'R410A',
    'R452A',
    'R134a',
    'R290',
    'CO2 (R744)',
    'Azoto (N2)'
  ],
  ciclosPhPlh: [
    'PH',
    'PLH'
  ],
  tecnicos: [],
  gruposProducao: [
    '30',
    '46',
    '67',
    '68',
    '107',
    '108'
  ],
  ciclosProducao: [
    'PH',
    'PLH'
  ],
  checklistEquipamentosCiclos: [],
  checklistFabricantesSonda: [
    'Vaisala'
  ],
  checklistModelosSonda: [
    'HMP110'
  ],
  checklistFabricantesClico: [
    'Z.A'
  ]
};

function doGet(e) {
  var acao = e && e.parameter ? e.parameter.action : '';

  // --- Relatorios (fotos de Testes/Ciclos) ---
  if (acao === 'listarEsquemas') {
    return listarEsquemasSalvos(e.parameter);
  }
  if (acao === 'carregarRascunho') {
    return carregarRascunho(e.parameter);
  }
  if (acao === 'listarRascunhos') {
    return listarRascunhosAbertos();
  }
  if (acao === 'listarEnviosAnteriores') {
    return listarEnviosAnteriores(e.parameter);
  }
  if (acao === 'contarFotos') {
    return contarFotos(e.parameter);
  }

  // --- Controlo de Producao ---
  if (acao === 'listar') {
    return respostaJson(listarRegistos(e.parameter.tipo, e.parameter.filtro));
  }
  if (acao === 'obter') {
    return respostaJson(obterRegisto(e.parameter.tipo, e.parameter.serial));
  }
  if (acao === 'resumo') {
    return respostaJson(obterResumoGeral());
  }
  if (acao === 'configEnvio') {
    return respostaJson(obterConfigEnvioAutomatico());
  }
  if (acao === 'materiaisPadrao') {
    return respostaJson(listarMateriaisPadrao(e.parameter.tipo, e.parameter.modelo));
  }
  if (acao === 'baixarMateriais') {
    return baixarMateriais(e.parameter);
  }
  if (acao === 'gerarRelatorioEntrega') {
    return gerarRelatorioEntrega(e.parameter);
  }
  if (acao === 'listarMateriaisStock') {
    return respostaJson(listarMateriaisStock());
  }
  if (acao === 'estatisticasEtapas') {
    return respostaJson(obterEstatisticasEtapas());
  }
  if (acao === 'historicoCompleto') {
    return obterHistoricoCompleto(e.parameter);
  }
  if (acao === 'manifest') {
    return respostaManifest_();
  }
  if (acao === 'sw') {
    return respostaServiceWorker_();
  }
  if (acao === 'listarChecklists') {
    return respostaJson(listarChecklists(e.parameter));
  }
  if (acao === 'obterChecklist') {
    return respostaJson(obterChecklist(e.parameter));
  }

  // --- Pagina principal: um unico HTML com tres separadores (Relatorios,
  // Controlo de Producao e Checklist), alternados por um botao no topo. ---
  var tipoParametro = e && e.parameter ? e.parameter.tipo : '';
  var tipoRelatorio = tipoParametro === 'ciclos' ? 'ciclos' : 'testes';

  var listas = {
    grupos: obterLista('grupos'),
    esquemasEletrico: obterLista('esquemasEletrico'),
    esquemasFrio: obterLista('esquemasFrio'),
    gases: obterLista('gases'),
    ciclosPhPlh: obterLista('ciclosPhPlh'),
    tecnicos: obterLista('tecnicos'),
    gruposProducao: obterLista('gruposProducao'),
    ciclosProducao: obterLista('ciclosProducao'),
    checklistEquipamentosCiclos: obterLista('checklistEquipamentosCiclos'),
    checklistFabricantesSonda: obterLista('checklistFabricantesSonda'),
    checklistModelosSonda: obterLista('checklistModelosSonda'),
    checklistFabricantesClico: obterLista('checklistFabricantesClico')
  };

  var template = HtmlService.createTemplateFromFile('Index');
  template.appsScriptUrl = ScriptApp.getService().getUrl();
  template.tipoRelatorio = tipoRelatorio;
  template.listasJson = JSON.stringify(listas);
  var saida = template.evaluate();
  saida.setTitle(EMPRESA + ' - Relatorios e Controlo de Producao');
  saida.addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
  return saida;
}

function respostaJson(objeto) {
  var saida = ContentService.createTextOutput(JSON.stringify(objeto));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

/**
 * Devolve a lista guardada nas Propriedades do Script para o nome dado
 * (esquemasEletrico, esquemasFrio ou gases), semeando com a lista padrao
 * na primeira vez que for pedida.
 */
function obterLista(nomePropriedade) {
  var propriedades = PropertiesService.getScriptProperties();
  var valorGuardado = propriedades.getProperty(nomePropriedade);
  if (valorGuardado) {
    return JSON.parse(valorGuardado);
  }
  var padrao = LISTAS_PADRAO[nomePropriedade] || [];
  propriedades.setProperty(nomePropriedade, JSON.stringify(padrao));
  return padrao;
}

/**
 * Acrescenta um valor novo a uma lista guardada (se ainda nao existir),
 * para ficar disponivel como sugestao nos proximos envios.
 */
function adicionarValorNaLista(nomePropriedade, valor) {
  if (!valor) return;
  var lista = obterLista(nomePropriedade);
  if (lista.indexOf(valor) !== -1) return;
  lista.push(valor);
  var propriedades = PropertiesService.getScriptProperties();
  propriedades.setProperty(nomePropriedade, JSON.stringify(lista));
}

function doPost(e) {
  var resposta;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Pedido sem dados (postData.contents em falta).');
    }

    var dados = JSON.parse(e.postData.contents);

    // --- Controlo de Producao: despacho por "acao" ---
    if (dados.acao) {
      if (dados.acao === 'guardarRegisto') {
        resposta = guardarRegisto(dados);
      } else if (dados.acao === 'mudarNumeroSerie') {
        resposta = mudarNumeroSerie(dados);
      } else if (dados.acao === 'enviarResumo') {
        resposta = enviarResumoProducao(dados);
      } else if (dados.acao === 'configurarEnvioAutomatico') {
        resposta = configurarEnvioAutomatico(dados);
      } else if (dados.acao === 'adicionarMaterialPadrao') {
        resposta = adicionarMaterialPadrao(dados);
      } else if (dados.acao === 'removerMaterialPadrao') {
        resposta = removerMaterialPadrao(dados);
      } else if (dados.acao === 'adicionarMaterialStock') {
        resposta = adicionarMaterialStock(dados);
      } else if (dados.acao === 'removerMaterialStock') {
        resposta = removerMaterialStock(dados);
      } else if (dados.acao === 'registarMovimentoStock') {
        resposta = registarMovimentoStock(dados);
      } else if (dados.acao === 'guardarChecklist') {
        resposta = guardarChecklist(dados);
      } else {
        throw new Error('Acao desconhecida.');
      }
      return respostaJson(resposta);
    }

    // --- Relatorios: despacho por flags booleanas ---
    if (dados.guardarComoRascunho === true) {
      return guardarProgresso(dados);
    }

    if (dados.apagarFotoRascunho === true) {
      return apagarFotoRascunho(dados);
    }

    if (dados.corrigirEnvio === true) {
      return corrigirEnvio(dados);
    }

    // --- Relatorios: envio principal (sem "acao" nem flags) ---
    var serial = (dados.serial || '').toString().trim();
    var emailsInput = (dados.emails || '').toString().trim();
    var grupo = (dados.grupo || '').toString().trim();
    var tipoValvula = (dados.tipoValvula || '').toString().trim();
    var fotos = dados.fotos || {};
    var esquemasExistentes = dados.esquemasExistentes || {};
    var guardarEsquema = dados.guardarEsquema || {};
    var descricoesEsquema = dados.descricoesEsquema || {};
    var observacoes = (dados.observacoes || '').toString().trim();
    var gas = (dados.gas || '').toString().trim();
    var phPlh = (dados.phPlh || '').toString().trim();
    var tecnico = (dados.tecnico || '').toString().trim();
    var tipoRelatorio = dados.tipoRelatorio === 'ciclos' ? 'ciclos' : 'testes';
    var nomeRelatorio = tipoRelatorio === 'ciclos' ? 'Relatorio de Ciclos' : 'Relatorio de Testes';
    var prefixoPasta = tipoRelatorio === 'ciclos' ? 'CICLO_' : 'SN_';

    if (!serial) {
      throw new Error('Numero de serie em falta.');
    }
    if (!emailsInput) {
      throw new Error('Pelo menos um e-mail de destinatario e obrigatorio.');
    }
    if (!grupo) {
      throw new Error('Selecione o Grupo da maquina.');
    }
    if (!tipoValvula) {
      throw new Error('Selecione o Tipo de valvula.');
    }

    var emails = limparListaEmails(emailsInput);

    var folder = DriveApp.getFolderById(FOLDER_ID);

    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyyMMdd_HHmmss');
    var nomeSubpasta = prefixoPasta + sanitizeNome(serial) + '_Grupo' + sanitizeNome(grupo) + '_' + timestamp;
    var subfolder = folder.createFolder(nomeSubpasta);

    var pastaRascunhoExistente = obterPastaRascunho(serial, false);

    var anexos = [];
    var totalBytes = 0;
    var totalFotos = 0;

    var chaves = Object.keys(CATEGORIAS);
    for (var i = 0; i < chaves.length; i++) {
      var chave = chaves[i];
      var ehEsquema = ehCategoriaEsquema(chave);

      var fotosRascunho = anexarFotosDoRascunho(pastaRascunhoExistente, chave, CATEGORIAS[chave], subfolder);
      for (var k = 0; k < fotosRascunho.length; k++) {
        anexos.push(fotosRascunho[k]);
        totalBytes = totalBytes + fotosRascunho[k].getBytes().length;
        totalFotos = totalFotos + 1;
      }

      var fileIdExistente = ehEsquema ? esquemasExistentes[chave] : null;

      if (fileIdExistente) {
        var resultado = anexarEsquemaExistente(fileIdExistente, CATEGORIAS[chave], subfolder);
        if (resultado) {
          anexos.push(resultado.blob);
          totalBytes = totalBytes + resultado.blob.getBytes().length;
          totalFotos = totalFotos + 1;
        }
        continue;
      }

      var lista = fotos[chave];
      if (!lista || !lista.length) continue;

      for (var j = 0; j < lista.length; j++) {
        var dataUrl = lista[j];
        if (!dataUrl) continue;

        var blob = base64ParaBlob(dataUrl, CATEGORIAS[chave] + '_' + (j + 1));
        if (!blob) continue;

        subfolder.createFile(blob);
        anexos.push(blob);
        totalBytes = totalBytes + blob.getBytes().length;
        totalFotos = totalFotos + 1;

        if (ehEsquema && guardarEsquema[chave] === true) {
          guardarEsquemaNaBiblioteca(blob, chave, grupo, tipoValvula);
        }
      }
    }

    if (totalFotos === 0) {
      throw new Error('Nenhuma fotografia foi recebida.');
    }

    var limiteBytes = 25 * 1024 * 1024;
    if (totalBytes > limiteBytes) {
      var totalMB = Math.round(totalBytes / 1024 / 1024);
      throw new Error('O total de anexos (' + totalMB + ' MB) excede o limite de ~25 MB do Gmail. Reduza o numero ou o tamanho das fotos.');
    }

    var corpo = EMPRESA + ' - ' + nomeRelatorio + ' da maquina.';
    corpo = corpo + '\n\n';
    corpo = corpo + 'Numero de serie: ' + serial + '\n';
    corpo = corpo + 'Grupo: ' + grupo + '\n';
    corpo = corpo + 'Tipo de valvula: ' + tipoValvula + '\n';
    if (phPlh) {
      corpo = corpo + 'Ciclo: ' + phPlh + '\n';
    }
    if (gas) {
      corpo = corpo + 'Gas: ' + gas + '\n';
    }
    if (tecnico) {
      corpo = corpo + 'Tecnico responsavel: ' + tecnico + '\n';
    }
    corpo = corpo + 'Total de fotografias em anexo: ' + totalFotos + '\n';
    corpo = corpo + montarTextoDescricoesEsquema(descricoesEsquema);
    corpo = corpo + '\n';

    if (observacoes) {
      corpo = corpo + '\nObservacoes:\n' + observacoes + '\n';
    }

    corpo = corpo + '\nEste e-mail foi gerado automaticamente pela aplicacao de recolha de fotos de testes.';

    MailApp.sendEmail({
      to: emails,
      subject: EMPRESA + ' - ' + nomeRelatorio + ' - S/N: ' + serial + ' - Grupo ' + grupo,
      body: corpo,
      attachments: anexos
    });

    adicionarValorNaLista('grupos', grupo);
    adicionarValorNaLista('esquemasEletrico', (descricoesEsquema.esquemaEletrico || '').toString().trim());
    adicionarValorNaLista('esquemasFrio', (descricoesEsquema.esquemaFrio || '').toString().trim());
    adicionarValorNaLista('gases', gas);
    adicionarValorNaLista('ciclosPhPlh', phPlh);
    adicionarValorNaLista('tecnicos', tecnico);

    if (pastaRascunhoExistente) {
      pastaRascunhoExistente.setTrashed(true);
    }

    resposta = { status: 'ok', mensagem: 'Enviado com sucesso.', fotos: totalFotos };
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  var saida = ContentService.createTextOutput(JSON.stringify(resposta));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

/**
 * Constroi o texto com as descricoes dos esquemas (sugeridas pela Aralab),
 * uma linha por categoria de esquema que tenha descricao preenchida.
 */
function montarTextoDescricoesEsquema(descricoesEsquema) {
  var texto = '';
  for (var i = 0; i < CATEGORIAS_ESQUEMA.length; i++) {
    var chave = CATEGORIAS_ESQUEMA[i];
    var descricao = (descricoesEsquema[chave] || '').toString().trim();
    if (descricao) {
      texto = texto + '\n' + CATEGORIAS[chave] + ' - Descricao: ' + descricao;
    }
  }
  return texto;
}

/**
 * Guarda o progresso de um envio ainda incompleto (fotos + campos do
 * formulario) numa pasta de rascunho no Drive, identificada pelo numero
 * de serie. Nao envia e-mail nenhum. Usado quando um teste demora horas
 * (ex.: vacuo, pressao) e as fotos nao podem ficar so no telemovel.
 */
function guardarProgresso(dados) {
  var resposta;
  try {
    var serial = (dados.serial || '').toString().trim();
    if (!serial) {
      throw new Error('Numero de serie em falta para guardar o progresso.');
    }

    var pastaRascunho = obterPastaRascunho(serial, true);
    var fotos = dados.fotos || {};
    var chaves = Object.keys(CATEGORIAS);
    var totalNovas = 0;
    var fotosCriadas = {};

    for (var i = 0; i < chaves.length; i++) {
      var chave = chaves[i];
      var lista = fotos[chave];
      if (!lista || !lista.length) continue;

      var pastaCategoria = obterOuCriarSubpasta(pastaRascunho, chave, true);
      var criadasCategoria = [];
      for (var j = 0; j < lista.length; j++) {
        var dataUrl = lista[j];
        if (!dataUrl) continue;

        var blob = base64ParaBlob(dataUrl, CATEGORIAS[chave] + '_' + (j + 1));
        if (!blob) continue;

        var ficheiroCriado = pastaCategoria.createFile(blob);
        criadasCategoria.push({ id: ficheiroCriado.getId(), nome: ficheiroCriado.getName() });
        totalNovas = totalNovas + 1;
      }
      if (criadasCategoria.length) {
        fotosCriadas[chave] = criadasCategoria;
      }
    }

    var camposGuardados = {
      serial: serial,
      emails: dados.emails || '',
      grupo: dados.grupo || '',
      tipoValvula: dados.tipoValvula || '',
      tipoRelatorio: dados.tipoRelatorio || 'testes',
      phPlh: dados.phPlh || '',
      gas: dados.gas || '',
      tecnico: dados.tecnico || '',
      observacoes: dados.observacoes || '',
      descricoesEsquema: dados.descricoesEsquema || {}
    };
    guardarDadosRascunho(pastaRascunho, camposGuardados);

    resposta = { status: 'ok', mensagem: 'Progresso guardado.', fotosGuardadas: totalNovas, fotosCriadas: fotosCriadas };
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  var saida = ContentService.createTextOutput(JSON.stringify(resposta));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

/**
 * Apaga (move para o lixo) uma foto especifica de um rascunho, pelo ID
 * do ficheiro no Drive. Usado quando o operador quer remover uma foto
 * ja guardada, antes de enviar o relatorio final.
 */
function apagarFotoRascunho(dados) {
  var resposta;
  try {
    var fileId = (dados.fileId || '').toString().trim();
    if (!fileId) {
      throw new Error('ID do ficheiro em falta.');
    }
    var ficheiro = DriveApp.getFileById(fileId);
    ficheiro.setTrashed(true);
    resposta = { status: 'ok', mensagem: 'Foto apagada.' };
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  var saida = ContentService.createTextOutput(JSON.stringify(resposta));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

/**
 * Responde em JSON com a lista de todos os rascunhos ainda em aberto
 * (numero de serie, grupo e tipo de relatorio), para o operador poder
 * escolher qual continuar sem ter de se lembrar do numero de serie.
 */
function listarRascunhosAbertos() {
  var resposta;
  try {
    var raiz = DriveApp.getFolderById(FOLDER_ID);
    var pastaRascunhos = obterOuCriarSubpasta(raiz, 'Rascunhos', false);
    var itens = [];

    if (pastaRascunhos) {
      var pastas = pastaRascunhos.getFolders();
      while (pastas.hasNext()) {
        var pasta = pastas.next();
        var dadosGuardados = lerDadosRascunho(pasta);
        var serial = dadosGuardados.serial || pasta.getName().replace(/^RASCUNHO_/, '');
        itens.push({
          serial: serial,
          grupo: dadosGuardados.grupo || '',
          tipoRelatorio: dadosGuardados.tipoRelatorio || 'testes',
          atualizadoEm: pasta.getLastUpdated().toISOString()
        });
      }
    }

    itens.sort(function (a, b) {
      return b.atualizadoEm.localeCompare(a.atualizadoEm);
    });

    resposta = { status: 'ok', itens: itens };
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  var saida = ContentService.createTextOutput(JSON.stringify(resposta));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

/**
 * Responde em JSON com a lista de envios ja enviados (pastas finais) para
 * um numero de serie, usada para escolher qual corrigir.
 */
function listarEnviosAnteriores(parametros) {
  var resposta;
  try {
    var serial = (parametros.serial || '').toString().trim();
    if (!serial) {
      throw new Error('Numero de serie em falta.');
    }

    var raiz = DriveApp.getFolderById(FOLDER_ID);
    var prefixoSerial = sanitizeNome(serial);
    var itens = [];

    var pastas = raiz.getFolders();
    while (pastas.hasNext()) {
      var pasta = pastas.next();
      var nome = pasta.getName();
      var ehDesteSerial =
        nome.indexOf('SN_' + prefixoSerial + '_Grupo') === 0 ||
        nome.indexOf('CICLO_' + prefixoSerial + '_Grupo') === 0;
      if (!ehDesteSerial) continue;

      itens.push({
        id: pasta.getId(),
        nome: nome,
        criadoEm: pasta.getDateCreated().toISOString()
      });
    }

    itens.sort(function (a, b) {
      return b.criadoEm.localeCompare(a.criadoEm);
    });

    resposta = { status: 'ok', itens: itens };
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  var saida = ContentService.createTextOutput(JSON.stringify(resposta));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

/**
 * Responde em JSON com o numero de relatorios ja enviados e o total de
 * fotografias guardadas para um numero de serie. Usado pelo script de
 * "Controlo de Producao" para mostrar quantas fotos ja existem, sem ter
 * de abrir o Drive.
 */
function contarFotos(parametros) {
  var resposta;
  try {
    var serial = (parametros.serial || '').toString().trim();
    if (!serial) {
      throw new Error('Numero de serie em falta.');
    }

    var raiz = DriveApp.getFolderById(FOLDER_ID);
    var prefixoSerial = sanitizeNome(serial);
    var totalEnvios = 0;
    var totalFotos = 0;

    var pastas = raiz.getFolders();
    while (pastas.hasNext()) {
      var pasta = pastas.next();
      var nome = pasta.getName();
      var ehDesteSerial =
        nome.indexOf('SN_' + prefixoSerial + '_Grupo') === 0 ||
        nome.indexOf('CICLO_' + prefixoSerial + '_Grupo') === 0;
      if (!ehDesteSerial) continue;

      totalEnvios = totalEnvios + 1;
      var ficheiros = pasta.getFiles();
      while (ficheiros.hasNext()) {
        ficheiros.next();
        totalFotos = totalFotos + 1;
      }
    }

    resposta = { status: 'ok', totalEnvios: totalEnvios, totalFotos: totalFotos };
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  var saida = ContentService.createTextOutput(JSON.stringify(resposta));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

/**
 * Envia um e-mail de correcao a um relatorio ja enviado anteriormente.
 * Nao reenvia o e-mail original (isso nao e possivel) - envia um novo
 * e-mail so com o que foi corrigido/adicionado, guardando tambem as
 * fotos novas na pasta do envio original no Drive.
 */
function corrigirEnvio(dados) {
  var resposta;
  try {
    var serial = (dados.serial || '').toString().trim();
    var pastaOriginalId = (dados.pastaOriginalId || '').toString().trim();
    var emailsInput = (dados.emails || '').toString().trim();
    var notaCorrecao = (dados.notaCorrecao || '').toString().trim();
    var fotos = dados.fotos || {};
    var grupo = (dados.grupo || '').toString().trim();
    var tipoValvula = (dados.tipoValvula || '').toString().trim();
    var gas = (dados.gas || '').toString().trim();
    var phPlh = (dados.phPlh || '').toString().trim();
    var tecnico = (dados.tecnico || '').toString().trim();
    var observacoes = (dados.observacoes || '').toString().trim();
    var tipoRelatorio = dados.tipoRelatorio === 'ciclos' ? 'ciclos' : 'testes';
    var nomeRelatorio = tipoRelatorio === 'ciclos' ? 'Relatorio de Ciclos' : 'Relatorio de Testes';

    if (!serial) {
      throw new Error('Numero de serie em falta.');
    }
    if (!pastaOriginalId) {
      throw new Error('Escolha qual envio quer corrigir.');
    }
    if (!emailsInput) {
      throw new Error('Pelo menos um e-mail de destinatario e obrigatorio.');
    }
    if (!notaCorrecao) {
      throw new Error('Descreva o que foi corrigido.');
    }

    var emails = limparListaEmails(emailsInput);
    var pastaOriginal = DriveApp.getFolderById(pastaOriginalId);

    var anexos = [];
    var totalBytes = 0;
    var totalFotos = 0;
    var chaves = Object.keys(CATEGORIAS);

    for (var i = 0; i < chaves.length; i++) {
      var chave = chaves[i];
      var lista = fotos[chave];
      if (!lista || !lista.length) continue;

      for (var j = 0; j < lista.length; j++) {
        var dataUrl = lista[j];
        if (!dataUrl) continue;

        var blob = base64ParaBlob(dataUrl, CATEGORIAS[chave] + '_correcao_' + (j + 1));
        if (!blob) continue;

        pastaOriginal.createFile(blob);
        anexos.push(blob);
        totalBytes = totalBytes + blob.getBytes().length;
        totalFotos = totalFotos + 1;
      }
    }

    var limiteBytes = 25 * 1024 * 1024;
    if (totalBytes > limiteBytes) {
      var totalMB = Math.round(totalBytes / 1024 / 1024);
      throw new Error('O total de anexos (' + totalMB + ' MB) excede o limite de ~25 MB do Gmail.');
    }

    var corpo = EMPRESA + ' - Correcao ao ' + nomeRelatorio + ' da maquina.';
    corpo = corpo + '\n\n';
    corpo = corpo + 'Numero de serie: ' + serial + '\n';
    if (grupo) corpo = corpo + 'Grupo: ' + grupo + '\n';
    if (tipoValvula) corpo = corpo + 'Tipo de valvula: ' + tipoValvula + '\n';
    if (phPlh) corpo = corpo + 'Ciclo: ' + phPlh + '\n';
    if (gas) corpo = corpo + 'Gas: ' + gas + '\n';
    if (tecnico) corpo = corpo + 'Tecnico responsavel: ' + tecnico + '\n';

    corpo = corpo + '\nO que foi corrigido:\n' + notaCorrecao + '\n';

    if (totalFotos > 0) {
      corpo = corpo + '\nFotografias corrigidas/adicionadas em anexo: ' + totalFotos + '\n';
    }

    if (observacoes) {
      corpo = corpo + '\nObservacoes:\n' + observacoes + '\n';
    }

    corpo = corpo + '\nEsta e uma correcao a um relatorio enviado anteriormente (pasta original: ' + pastaOriginal.getName() + ').';
    corpo = corpo + '\nEste e-mail foi gerado automaticamente pela aplicacao de recolha de fotos de testes.';

    MailApp.sendEmail({
      to: emails,
      subject: EMPRESA + ' - CORRECAO - ' + nomeRelatorio + ' - S/N: ' + serial + (grupo ? ' - Grupo ' + grupo : ''),
      body: corpo,
      attachments: anexos
    });

    adicionarValorNaLista('tecnicos', tecnico);

    resposta = { status: 'ok', mensagem: 'Correcao enviada com sucesso.', fotos: totalFotos };
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  var saida = ContentService.createTextOutput(JSON.stringify(resposta));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

/**
 * Responde em JSON com os campos e as fotos ja guardadas num rascunho
 * para o numero de serie indicado (usado para retomar um envio).
 */
function carregarRascunho(parametros) {
  var resposta;
  try {
    var serial = (parametros.serial || '').toString().trim();
    if (!serial) {
      throw new Error('Numero de serie em falta.');
    }

    var pastaRascunho = obterPastaRascunho(serial, false);
    if (!pastaRascunho) {
      resposta = { status: 'ok', existe: false };
    } else {
      var dadosGuardados = lerDadosRascunho(pastaRascunho);
      var fotos = {};
      var chaves = Object.keys(CATEGORIAS);

      for (var i = 0; i < chaves.length; i++) {
        var chave = chaves[i];
        var pastaCategoria = obterOuCriarSubpasta(pastaRascunho, chave, false);
        var itens = [];

        if (pastaCategoria) {
          var ficheiros = pastaCategoria.getFiles();
          while (ficheiros.hasNext()) {
            var ficheiro = ficheiros.next();
            itens.push({ id: ficheiro.getId(), nome: ficheiro.getName() });
          }
        }

        fotos[chave] = itens;
      }

      resposta = { status: 'ok', existe: true, dados: dadosGuardados, fotos: fotos };
    }
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  var saida = ContentService.createTextOutput(JSON.stringify(resposta));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

/**
 * Devolve (ou cria) a pasta de rascunho para um numero de serie.
 */
function obterPastaRascunho(serial, criarSeNaoExistir) {
  if (!serial) return null;
  var raiz = DriveApp.getFolderById(FOLDER_ID);
  var pastaRascunhos = obterOuCriarSubpasta(raiz, 'Rascunhos', criarSeNaoExistir);
  if (!pastaRascunhos) return null;
  var nomePasta = 'RASCUNHO_' + sanitizeNome(serial);
  return obterOuCriarSubpasta(pastaRascunhos, nomePasta, criarSeNaoExistir);
}

function guardarDadosRascunho(pastaRascunho, dadosCampos) {
  var conteudo = JSON.stringify(dadosCampos);
  var existentes = pastaRascunho.getFilesByName('dados.json');
  if (existentes.hasNext()) {
    existentes.next().setTrashed(true);
  }
  var blob = Utilities.newBlob(conteudo, 'application/json', 'dados.json');
  pastaRascunho.createFile(blob);
}

function lerDadosRascunho(pastaRascunho) {
  var existentes = pastaRascunho.getFilesByName('dados.json');
  if (!existentes.hasNext()) return {};
  var conteudo = existentes.next().getBlob().getDataAsString();
  return JSON.parse(conteudo);
}

/**
 * Copia todas as fotos ja guardadas num rascunho, para uma dada
 * categoria, para a subpasta deste envio, devolvendo os blobs para
 * serem anexados ao e-mail.
 */
function anexarFotosDoRascunho(pastaRascunho, chave, nomeBase, subfolder) {
  var anexosRascunho = [];
  if (!pastaRascunho) return anexosRascunho;

  var pastaCategoria = obterOuCriarSubpasta(pastaRascunho, chave, false);
  if (!pastaCategoria) return anexosRascunho;

  var ficheiros = pastaCategoria.getFiles();
  var indice = 0;
  while (ficheiros.hasNext()) {
    var ficheiroOriginal = ficheiros.next();
    indice = indice + 1;
    var blob = ficheiroOriginal.getBlob();
    var extensao = obterExtensao(ficheiroOriginal.getName());
    var nomeFicheiro = sanitizeNome(nomeBase) + '_rascunho_' + indice + '.' + extensao;
    var blobRenomeado = blob.setName(nomeFicheiro);
    subfolder.createFile(blobRenomeado);
    anexosRascunho.push(blobRenomeado);
  }

  return anexosRascunho;
}

function ehCategoriaEsquema(chave) {
  for (var i = 0; i < CATEGORIAS_ESQUEMA.length; i++) {
    if (CATEGORIAS_ESQUEMA[i] === chave) {
      return true;
    }
  }
  return false;
}

/**
 * Copia um esquema ja guardado na biblioteca para a subpasta deste envio,
 * e devolve o blob para ser anexado ao e-mail.
 */
function anexarEsquemaExistente(fileId, nomeBase, subfolder) {
  var ficheiroOriginal = DriveApp.getFileById(fileId);
  var blob = ficheiroOriginal.getBlob();
  var extensao = obterExtensao(ficheiroOriginal.getName());
  var nomeFicheiro = sanitizeNome(nomeBase) + '_reutilizado.' + extensao;
  var blobRenomeado = blob.setName(nomeFicheiro);
  subfolder.createFile(blobRenomeado);
  return { blob: blobRenomeado };
}

function obterExtensao(nomeFicheiro) {
  var partes = nomeFicheiro.split('.');
  if (partes.length > 1) {
    return partes[partes.length - 1];
  }
  return 'jpg';
}

/**
 * Guarda uma copia do esquema na biblioteca permanente (organizada por
 * Grupo + Tipo de valvula), para poder ser reutilizado em maquinas futuras.
 */
function guardarEsquemaNaBiblioteca(blob, categoria, grupo, tipoValvula) {
  var pastaCategoria = obterPastaEsquemas(categoria, grupo, tipoValvula, true);
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyyMMdd_HHmmss');
  var nomeFicheiro = sanitizeNome(categoria) + '_' + timestamp + '.' + obterExtensao(blob.getName());
  var copia = blob.copyBlob();
  copia.setName(nomeFicheiro);
  pastaCategoria.createFile(copia);
}

/**
 * Devolve (ou cria) a pasta da biblioteca de esquemas para uma
 * categoria + Grupo + Tipo de valvula especifica.
 */
function obterPastaEsquemas(categoria, grupo, tipoValvula, criarSeNaoExistir) {
  var raiz = DriveApp.getFolderById(FOLDER_ID);
  var nomePastaGrupo = 'Esquemas_Guardados_Grupo' + sanitizeNome(grupo) + '_' + sanitizeNome(tipoValvula);
  var pastaGrupo = obterOuCriarSubpasta(raiz, nomePastaGrupo, criarSeNaoExistir);
  if (!pastaGrupo) {
    return null;
  }
  var pastaCategoria = obterOuCriarSubpasta(pastaGrupo, sanitizeNome(categoria), criarSeNaoExistir);
  return pastaCategoria;
}

function obterOuCriarSubpasta(pastaPai, nome, criarSeNaoExistir) {
  var existentes = pastaPai.getFoldersByName(nome);
  if (existentes.hasNext()) {
    return existentes.next();
  }
  if (criarSeNaoExistir) {
    return pastaPai.createFolder(nome);
  }
  return null;
}

/**
 * Responde em JSON a lista de esquemas ja guardados para uma
 * categoria + Grupo + Tipo de valvula (usado pelo frontend para
 * preencher o menu "usar esquema ja guardado").
 */
function listarEsquemasSalvos(parametros) {
  var resposta;
  try {
    var categoria = (parametros.categoria || '').toString().trim();
    var grupo = (parametros.grupo || '').toString().trim();
    var tipoValvula = (parametros.tipoValvula || '').toString().trim();

    if (!categoria || !grupo || !tipoValvula) {
      throw new Error('Parametros em falta (categoria, grupo, tipoValvula).');
    }

    var pastaCategoria = obterPastaEsquemas(categoria, grupo, tipoValvula, false);
    var itens = [];

    if (pastaCategoria) {
      var ficheiros = pastaCategoria.getFiles();
      while (ficheiros.hasNext()) {
        var ficheiro = ficheiros.next();
        itens.push({ id: ficheiro.getId(), nome: ficheiro.getName() });
      }
    }

    resposta = { status: 'ok', itens: itens };
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  var saida = ContentService.createTextOutput(JSON.stringify(resposta));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

function limparListaEmails(texto) {
  var partes = texto.split(',');
  var limpas = [];
  for (var i = 0; i < partes.length; i++) {
    var parte = partes[i].trim();
    if (parte.length > 0) {
      limpas.push(parte);
    }
  }
  return limpas.join(',');
}

/**
 * Converte uma string "data:image/jpeg;base64,...." num Blob do Apps Script.
 */
function base64ParaBlob(dataUrl, nomeBase) {
  var match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl);
  if (!match) {
    return null;
  }

  var mimeType = match[1];
  var base64 = match[2];
  var extensao = mimeType.split('/')[1] || 'jpg';

  var bytes = Utilities.base64Decode(base64);
  var nomeFicheiro = sanitizeNome(nomeBase) + '.' + extensao;
  var blob = Utilities.newBlob(bytes, mimeType, nomeFicheiro);
  return blob;
}

function sanitizeNome(texto) {
  return texto.toString().replace(/[^a-zA-Z0-9_-]+/g, '_');
}

// ===========================================================================
// Controlo de Producao (grupos/ciclos por etapa, materiais por modelo,
// resumos por e-mail manuais e automaticos) - despachado pelo doGet/doPost
// acima atraves de "acao".
// ===========================================================================

// Separador usado dentro da celula de cada etapa, para guardar a data de
// conclusao e uma nota curta opcional na mesma celula (ex.: "2026-09-22
// 10:00::falta um parafuso").
var SEPARADOR_NOTA = '::';

// Chave usada nas Propriedades do Script para guardar a configuracao do
// envio automatico de resumos (e-mails, se esta ativo, e a frequencia).
var CONFIG_ENVIO_KEY = 'configEnvioAutomatico';

// Nome da funcao chamada pelo gatilho (trigger) de envio automatico.
var NOME_FUNCAO_TRIGGER = 'enviarResumosAutomaticos';

// Nomes das abas na Google Sheet, uma para cada tipo de producao.
var ABAS = {
  grupos: 'Grupos',
  ciclos: 'Ciclos'
};

// Aba onde fica guardada a estrutura permanente de materiais (eletrica e
// frio) de cada modelo (Grupo ou Ciclo). E a mesma aba para os dois tipos,
// distinguida pela coluna "Tipo".
var ABA_MATERIAIS = 'MateriaisPadrao';

var CABECALHOS_MATERIAIS = ['Tipo', 'Modelo', 'Categoria', 'Codigo', 'Descricao', 'Quantidade', 'Criado em'];

var COL_MAT = {
  TIPO: 1,
  MODELO: 2,
  CATEGORIA: 3,
  CODIGO: 4,
  DESCRICAO: 5,
  QUANTIDADE: 6,
  CRIADO: 7
};

// Colunas fixas (antes das etapas), pela ordem em que aparecem na folha.
var COLUNAS_BASE = [
  'Numero de serie',
  'Grupo/Tipo',
  'Estado geral',
  'Em atraso',
  'Previsao de saida',
  'Data de entrega',
  'Materiais em falta',
  'Materiais entregues',
  'Numeros de serie anteriores',
  'Criado em',
  'Atualizado em'
];

// Etapas de producao, pela ordem indicada. "chave" e o identificador usado
// no JSON (sem acentos), "rotulo" e o texto mostrado ao utilizador/na folha.
var ETAPAS = [
  { chave: 'preparacao', rotulo: 'Preparacao' },
  { chave: 'embalamento', rotulo: 'Embalamento' },
  { chave: 'desmontagem', rotulo: 'Desmontagem' },
  { chave: 'montagem', rotulo: 'Montagem' },
  { chave: 'intervencaoExtra', rotulo: 'Intervencao extra' },
  { chave: 'corteTubo', rotulo: 'Corte de tubo' },
  { chave: 'soldaduraHvac', rotulo: 'Montagem e soldadura HVAC' },
  { chave: 'eletrificacaoGrupo', rotulo: 'Eletrificacao do grupo' },
  { chave: 'eletrificacaoQuadro', rotulo: 'Eletrificacao do quadro' },
  { chave: 'isolamento', rotulo: 'Isolamento' },
  { chave: 'testeEletrico', rotulo: 'Teste eletrico' },
  { chave: 'testePressao', rotulo: 'Teste de pressao' },
  { chave: 'testeVacuo', rotulo: 'Teste de vacuo' }
];

// Indices das colunas fixas (1-based, como o Apps Script espera nos Ranges).
var COL = {
  SERIAL: 1,
  GRUPO: 2,
  ESTADO: 3,
  ATRASO: 4,
  PREVISAO: 5,
  ENTREGA: 6,
  MAT_FALTA: 7,
  MAT_ENTREGUE: 8,
  HISTORICO: 9,
  CRIADO: 10,
  ATUALIZADO: 11
};

var TOTAL_COLUNAS_BASE = COLUNAS_BASE.length; // 11
var COL_PRIMEIRA_ETAPA = TOTAL_COLUNAS_BASE + 1; // 12

/**
 * Devolve a aba (Sheet) correta para o tipo pedido ("grupos" ou "ciclos"),
 * criando-a com os cabecalhos corretos se ainda nao existir.
 */
function obterAba(tipo) {
  var nomeAba = ABAS[tipo];
  if (!nomeAba) {
    throw new Error('Tipo invalido: ' + tipo + ' (use "grupos" ou "ciclos").');
  }

  var folha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = folha.getSheetByName(nomeAba);
  if (aba) {
    return aba;
  }

  aba = folha.insertSheet(nomeAba);
  var cabecalhos = COLUNAS_BASE.concat(ETAPAS.map(function (et) { return et.rotulo; }));
  aba.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
  aba.setFrozenRows(1);
  aba.getRange(1, 1, 1, cabecalhos.length).setFontWeight('bold');

  // Formata como texto simples as colunas com datas/horas escritas por nos,
  // para o Sheets nao as reinterpretar/reformatar sozinho.
  var colunasTexto = [COL.PREVISAO, COL.ENTREGA, COL.CRIADO, COL.ATUALIZADO];
  colunasTexto.forEach(function (c) {
    aba.getRange(2, c, 1000, 1).setNumberFormat('@');
  });
  aba.getRange(2, COL_PRIMEIRA_ETAPA, 1000, ETAPAS.length).setNumberFormat('@');

  return aba;
}

/**
 * Devolve (criando se necessario) a aba onde fica a estrutura permanente
 * de materiais por modelo.
 */
function obterAbaMateriais() {
  var folha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = folha.getSheetByName(ABA_MATERIAIS);
  if (aba) return aba;

  aba = folha.insertSheet(ABA_MATERIAIS);
  aba.getRange(1, 1, 1, CABECALHOS_MATERIAIS.length).setValues([CABECALHOS_MATERIAIS]);
  aba.setFrozenRows(1);
  aba.getRange(1, 1, 1, CABECALHOS_MATERIAIS.length).setFontWeight('bold');
  aba.getRange(2, COL_MAT.CRIADO, 2000, 1).setNumberFormat('@');
  return aba;
}

/**
 * Responde com a estrutura de materiais (eletrica + frio) permanente de um
 * modelo (Grupo ou Ciclo). Usado para preencher a tabela automaticamente
 * assim que o Grupo/Tipo e identificado no formulario.
 */
function listarMateriaisPadrao(tipo, modelo) {
  var modeloLimpo = (modelo || '').toString().trim();
  if (!modeloLimpo) {
    return { status: 'ok', itens: [] };
  }

  var aba = obterAbaMateriais();
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return { status: 'ok', itens: [] };

  var valores = aba.getRange(2, 1, ultimaLinha - 1, CABECALHOS_MATERIAIS.length).getValues();
  var itens = [];

  for (var i = 0; i < valores.length; i++) {
    var linha = valores[i];
    if ((linha[COL_MAT.TIPO - 1] || '') !== tipo) continue;
    if ((linha[COL_MAT.MODELO - 1] || '').toString().trim().toLowerCase() !== modeloLimpo.toLowerCase()) continue;

    itens.push({
      categoria: (linha[COL_MAT.CATEGORIA - 1] || '').toString(),
      codigo: (linha[COL_MAT.CODIGO - 1] || '').toString(),
      descricao: (linha[COL_MAT.DESCRICAO - 1] || '').toString(),
      quantidade: (linha[COL_MAT.QUANTIDADE - 1] || '').toString()
    });
  }

  itens.sort(function (a, b) {
    if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
    return a.codigo.localeCompare(b.codigo);
  });

  return { status: 'ok', itens: itens };
}

/**
 * Acrescenta (ou atualiza, se o codigo ja existir para o mesmo
 * modelo+categoria) um material na estrutura permanente de um modelo.
 */
function adicionarMaterialPadrao(dados) {
  var tipo = (dados.tipo || '').toString().trim();
  var modelo = (dados.modelo || '').toString().trim();
  var categoria = (dados.categoria || '').toString().trim();
  var codigo = (dados.codigo || '').toString().trim();
  var descricao = (dados.descricao || '').toString().trim();
  var quantidade = (dados.quantidade || '').toString().trim();

  if (!tipo || !modelo || !categoria || !codigo) {
    throw new Error('Indique modelo, categoria e codigo do material.');
  }

  var aba = obterAbaMateriais();
  var ultimaLinha = aba.getLastRow();

  if (ultimaLinha >= 2) {
    var valores = aba.getRange(2, 1, ultimaLinha - 1, CABECALHOS_MATERIAIS.length).getValues();
    for (var i = 0; i < valores.length; i++) {
      var linha = valores[i];
      var mesmoTipo = (linha[COL_MAT.TIPO - 1] || '') === tipo;
      var mesmoModelo = (linha[COL_MAT.MODELO - 1] || '').toString().trim().toLowerCase() === modelo.toLowerCase();
      var mesmaCategoria = (linha[COL_MAT.CATEGORIA - 1] || '') === categoria;
      var mesmoCodigo = (linha[COL_MAT.CODIGO - 1] || '').toString().trim().toLowerCase() === codigo.toLowerCase();

      if (mesmoTipo && mesmoModelo && mesmaCategoria && mesmoCodigo) {
        var linhaFolha = i + 2;
        aba.getRange(linhaFolha, COL_MAT.DESCRICAO).setValue(descricao);
        aba.getRange(linhaFolha, COL_MAT.QUANTIDADE).setValue(quantidade);
        return { status: 'ok', mensagem: 'Material atualizado.' };
      }
    }
  }

  var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd HH:mm');
  var novaLinha = [tipo, modelo, categoria, codigo, descricao, quantidade, agora];
  aba.getRange(aba.getLastRow() + 1, 1, 1, novaLinha.length).setValues([novaLinha]);

  return { status: 'ok', mensagem: 'Material adicionado.' };
}

/**
 * Remove um material da estrutura permanente de um modelo, pelo codigo.
 */
function removerMaterialPadrao(dados) {
  var tipo = (dados.tipo || '').toString().trim();
  var modelo = (dados.modelo || '').toString().trim();
  var categoria = (dados.categoria || '').toString().trim();
  var codigo = (dados.codigo || '').toString().trim();

  if (!tipo || !modelo || !categoria || !codigo) {
    throw new Error('Indique modelo, categoria e codigo do material.');
  }

  var aba = obterAbaMateriais();
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) {
    throw new Error('Material nao encontrado.');
  }

  var valores = aba.getRange(2, 1, ultimaLinha - 1, CABECALHOS_MATERIAIS.length).getValues();
  for (var i = 0; i < valores.length; i++) {
    var linha = valores[i];
    var mesmoTipo = (linha[COL_MAT.TIPO - 1] || '') === tipo;
    var mesmoModelo = (linha[COL_MAT.MODELO - 1] || '').toString().trim().toLowerCase() === modelo.toLowerCase();
    var mesmaCategoria = (linha[COL_MAT.CATEGORIA - 1] || '') === categoria;
    var mesmoCodigo = (linha[COL_MAT.CODIGO - 1] || '').toString().trim().toLowerCase() === codigo.toLowerCase();

    if (mesmoTipo && mesmoModelo && mesmaCategoria && mesmoCodigo) {
      aba.deleteRow(i + 2);
      return { status: 'ok', mensagem: 'Material removido.' };
    }
  }

  throw new Error('Material nao encontrado.');
}

/**
 * Gera a tabela de materiais (eletrica + frio) de um modelo em Excel ou
 * PDF, e devolve uma pagina HTML que despoleta logo o download no
 * telemovel/computador do operador (sem deixar ficheiros no Drive).
 */
function baixarMateriais(parametros) {
  var tipo = (parametros.tipo || '').toString().trim();
  var modelo = (parametros.modelo || '').toString().trim();
  var formato = parametros.formato === 'pdf' ? 'pdf' : 'xlsx';

  if (!modelo) {
    return HtmlService.createHtmlOutput('<p>Numero de modelo em falta.</p>');
  }

  var abaTemp = null;
  try {
    var nomeTipo = tipo === 'ciclos' ? 'Ciclos' : 'Grupos';
    var itens = listarMateriaisPadrao(tipo, modelo).itens;
    abaTemp = criarAbaTemporariaMateriais(itens, nomeTipo, modelo);

    var blob = exportarAbaComoBlob(abaTemp, formato);
    var base64 = Utilities.base64Encode(blob.getBytes());
    var mimeType = formato === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    var nomeFicheiro = 'Materiais_' + nomeTipo + '_' + sanitizeNomeFicheiro(modelo) + '.' + formato;

    var html = '<html><body onload="document.getElementById(\'l\').click();">' +
      '<a id="l" href="data:' + mimeType + ';base64,' + base64 + '" download="' + nomeFicheiro + '">A transferir...</a>' +
      '<p>Se o download nao comecar sozinho, toque no link acima. Pode fechar esta janela depois.</p>' +
      '</body></html>';
    return HtmlService.createHtmlOutput(html);
  } catch (erro) {
    var mensagem = erro && erro.message ? erro.message : String(erro);
    return HtmlService.createHtmlOutput('<p>Erro ao gerar o ficheiro: ' + mensagem + '</p>');
  } finally {
    if (abaTemp) {
      SpreadsheetApp.getActiveSpreadsheet().deleteSheet(abaTemp);
    }
  }
}

function criarAbaTemporariaMateriais(itens, nomeTipo, modelo) {
  var folha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = folha.insertSheet('_tmp_materiais_' + new Date().getTime());

  aba.getRange(1, 1, 1, 4).merge().setValue('Materiais - ' + nomeTipo + ' ' + modelo).setFontWeight('bold').setFontSize(12);
  aba.getRange(2, 1, 1, 4).setValues([['Categoria', 'Codigo', 'Descricao', 'Quantidade']]).setFontWeight('bold');

  if (itens.length) {
    var linhas = itens.map(function (item) {
      return [item.categoria, item.codigo, item.descricao, item.quantidade];
    });
    aba.getRange(3, 1, linhas.length, 4).setValues(linhas);
  }

  aba.autoResizeColumns(1, 4);
  return aba;
}

function sanitizeNomeFicheiro(texto) {
  return texto.toString().replace(/[^a-zA-Z0-9_-]+/g, '_');
}

/**
 * Gera o relatorio de entrega de um numero de serie (dados do registo +
 * etapas + materiais do modelo) em Word, Excel ou PDF, e devolve uma
 * pagina HTML que despoleta logo o download (sem deixar ficheiros no
 * Drive). O Word/PDF sao gerados a partir de um Google Doc temporario
 * (melhor para texto/tabelas formatadas); o Excel a partir de uma aba
 * temporaria na propria Sheet (consistente com "Baixar materiais").
 */
function gerarRelatorioEntrega(parametros) {
  var tipo = (parametros.tipo || '').toString().trim();
  var serial = (parametros.serial || '').toString().trim();
  var formato = ['docx', 'pdf', 'xlsx'].indexOf(parametros.formato) !== -1 ? parametros.formato : 'pdf';

  if (!serial) {
    return HtmlService.createHtmlOutput('<p>Numero de serie em falta.</p>');
  }

  var temporario = null;
  try {
    var aba = obterAba(tipo);
    var linha = encontrarLinha(aba, serial);
    if (linha === -1) {
      throw new Error('Registo nao encontrado para o numero de serie ' + serial + '.');
    }

    var valores = aba.getRange(linha, 1, 1, COL_PRIMEIRA_ETAPA - 1 + ETAPAS.length).getValues()[0];
    var dados = linhaParaObjeto(valores);
    var materiais = listarMateriaisPadrao(tipo, dados.grupo).itens;

    var blob, mimeType;
    if (formato === 'xlsx') {
      temporario = criarFolhaRelatorioEntrega_(dados, materiais, tipo);
      blob = exportarAbaComoBlob(temporario, 'xlsx');
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      temporario = criarDocRelatorioEntrega_(dados, materiais, tipo);
      blob = exportarDocComoBlob_(temporario, formato);
      mimeType = formato === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf';
    }

    var base64 = Utilities.base64Encode(blob.getBytes());
    var nomeFicheiro = 'Entrega_' + sanitizeNomeFicheiro(serial) + '.' + formato;

    var html = '<html><body onload="document.getElementById(\'l\').click();">' +
      '<a id="l" href="data:' + mimeType + ';base64,' + base64 + '" download="' + nomeFicheiro + '">A transferir...</a>' +
      '<p>Se o download nao comecar sozinho, toque no link acima. Pode fechar esta janela depois.</p>' +
      '</body></html>';
    return HtmlService.createHtmlOutput(html);
  } catch (erro) {
    var mensagem = erro && erro.message ? erro.message : String(erro);
    return HtmlService.createHtmlOutput('<p>Erro ao gerar o ficheiro: ' + mensagem + '</p>');
  } finally {
    if (temporario) {
      if (formato === 'xlsx') {
        SpreadsheetApp.getActiveSpreadsheet().deleteSheet(temporario);
      } else {
        DriveApp.getFileById(temporario.getId()).setTrashed(true);
      }
    }
  }
}

function montarLinhasMateriaisRelatorio_(itens, categoria) {
  var linhas = [['Codigo', 'Descricao', 'Quantidade']];
  var filtrados = itens.filter(function (m) { return m.categoria === categoria; });
  if (!filtrados.length) {
    linhas.push(['-', 'Nenhum material registado', '-']);
  } else {
    filtrados.forEach(function (m) {
      linhas.push([m.codigo, m.descricao || '-', m.quantidade || '-']);
    });
  }
  return linhas;
}

function criarDocRelatorioEntrega_(dados, materiais, tipo) {
  var nomeTipo = tipo === 'ciclos' ? 'Ciclos' : 'Grupos';
  var doc = DocumentApp.create('_tmp_entrega_' + new Date().getTime());
  var corpo = doc.getBody();
  corpo.clear();

  corpo.appendParagraph(EMPRESA).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  corpo.appendParagraph('Relatorio de Entrega - ' + nomeTipo).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  corpo.appendParagraph(' ');

  corpo.appendTable([
    ['Numero de serie', dados.serial],
    ['Grupo/Tipo', dados.grupo],
    ['Estado geral', dados.estado],
    ['Previsao de saida', dados.previsaoSaida || '-'],
    ['Data de entrega', dados.dataEntrega || '-'],
    ['Criado em', dados.criadoEm],
    ['Materiais em falta', dados.materiaisEmFalta || '-'],
    ['Materiais entregues', dados.materiaisEntregues || '-']
  ]);

  corpo.appendParagraph(' ');
  corpo.appendParagraph('Etapas de producao').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  var linhasEtapas = [['Etapa', 'Concluida em', 'Nota']];
  ETAPAS.forEach(function (et) {
    var info = dados.etapas[et.chave] || {};
    linhasEtapas.push([et.rotulo, info.data || '-', info.nota || '-']);
  });
  corpo.appendTable(linhasEtapas);

  corpo.appendParagraph(' ');
  corpo.appendParagraph('Materiais - parte eletrica').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  corpo.appendTable(montarLinhasMateriaisRelatorio_(materiais, 'Eletrica'));

  corpo.appendParagraph(' ');
  corpo.appendParagraph('Materiais - parte de frio').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  corpo.appendTable(montarLinhasMateriaisRelatorio_(materiais, 'Frio'));

  doc.saveAndClose();
  return doc;
}

function criarFolhaRelatorioEntrega_(dados, materiais, tipo) {
  var nomeTipo = tipo === 'ciclos' ? 'Ciclos' : 'Grupos';
  var folha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = folha.insertSheet('_tmp_entrega_' + new Date().getTime());

  var linhaAtual = 1;
  aba.getRange(linhaAtual, 1, 1, 4).merge().setValue(EMPRESA + ' - Relatorio de Entrega (' + nomeTipo + ')').setFontWeight('bold').setFontSize(13);
  linhaAtual = linhaAtual + 2;

  var campos = [
    ['Numero de serie', dados.serial],
    ['Grupo/Tipo', dados.grupo],
    ['Estado geral', dados.estado],
    ['Previsao de saida', dados.previsaoSaida || '-'],
    ['Data de entrega', dados.dataEntrega || '-'],
    ['Criado em', dados.criadoEm],
    ['Materiais em falta', dados.materiaisEmFalta || '-'],
    ['Materiais entregues', dados.materiaisEntregues || '-']
  ];
  campos.forEach(function (linha) {
    aba.getRange(linhaAtual, 1).setValue(linha[0]).setFontWeight('bold');
    aba.getRange(linhaAtual, 2).setValue(linha[1]);
    linhaAtual = linhaAtual + 1;
  });
  linhaAtual = linhaAtual + 1;

  aba.getRange(linhaAtual, 1).setValue('Etapas de producao').setFontWeight('bold');
  linhaAtual = linhaAtual + 1;
  aba.getRange(linhaAtual, 1, 1, 3).setValues([['Etapa', 'Concluida em', 'Nota']]).setFontWeight('bold');
  linhaAtual = linhaAtual + 1;
  ETAPAS.forEach(function (et) {
    var info = dados.etapas[et.chave] || {};
    aba.getRange(linhaAtual, 1, 1, 3).setValues([[et.rotulo, info.data || '-', info.nota || '-']]);
    linhaAtual = linhaAtual + 1;
  });
  linhaAtual = linhaAtual + 1;

  ['Eletrica', 'Frio'].forEach(function (categoria) {
    var rotuloCategoria = categoria === 'Eletrica' ? 'Materiais - parte eletrica' : 'Materiais - parte de frio';
    aba.getRange(linhaAtual, 1).setValue(rotuloCategoria).setFontWeight('bold');
    linhaAtual = linhaAtual + 1;
    var linhasMateriais = montarLinhasMateriaisRelatorio_(materiais, categoria);
    aba.getRange(linhaAtual, 1, linhasMateriais.length, 3).setValues(linhasMateriais);
    aba.getRange(linhaAtual, 1, 1, 3).setFontWeight('bold');
    linhaAtual = linhaAtual + linhasMateriais.length + 1;
  });

  aba.autoResizeColumns(1, 4);
  return aba;
}

function exportarDocComoBlob_(doc, formato) {
  var id = doc.getId();
  var url = 'https://docs.google.com/document/d/' + id + '/export?format=' + formato;
  var opcoes = {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  };

  var resposta = UrlFetchApp.fetch(url, opcoes);
  if (resposta.getResponseCode() !== 200) {
    throw new Error('Falha ao exportar o documento como ' + formato + ' (codigo ' + resposta.getResponseCode() + ').');
  }

  var nomeFicheiro = doc.getName() + '.' + formato;
  return resposta.getBlob().setName(nomeFicheiro);
}

/**
 * Devolve o numero da linha (1-based, incluindo o cabecalho) onde esta o
 * numero de serie indicado, ou -1 se nao existir.
 */
function encontrarLinha(aba, serial) {
  var alvo = serial.toString().trim().toLowerCase();
  if (!alvo) return -1;

  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return -1;

  var valores = aba.getRange(2, COL.SERIAL, ultimaLinha - 1, 1).getValues();
  for (var i = 0; i < valores.length; i++) {
    if (valores[i][0].toString().trim().toLowerCase() === alvo) {
      return i + 2;
    }
  }
  return -1;
}

/**
 * Converte uma linha da folha (array de valores) num objeto JSON amigavel
 * para o frontend, incluindo o estado de cada etapa.
 */
function linhaParaObjeto(valores) {
  var etapas = {};
  ETAPAS.forEach(function (et, indice) {
    var bruto = (valores[COL_PRIMEIRA_ETAPA - 1 + indice] || '').toString();
    var partes = bruto.split(SEPARADOR_NOTA);
    etapas[et.chave] = { data: partes[0] || '', nota: partes[1] || '' };
  });

  return {
    serial: (valores[COL.SERIAL - 1] || '').toString(),
    grupo: (valores[COL.GRUPO - 1] || '').toString(),
    estado: (valores[COL.ESTADO - 1] || 'Em curso').toString(),
    emAtraso: (valores[COL.ATRASO - 1] || 'Nao').toString(),
    previsaoSaida: (valores[COL.PREVISAO - 1] || '').toString(),
    dataEntrega: (valores[COL.ENTREGA - 1] || '').toString(),
    materiaisEmFalta: (valores[COL.MAT_FALTA - 1] || '').toString(),
    materiaisEntregues: (valores[COL.MAT_ENTREGUE - 1] || '').toString(),
    serialAnteriores: (valores[COL.HISTORICO - 1] || '').toString(),
    criadoEm: (valores[COL.CRIADO - 1] || '').toString(),
    atualizadoEm: (valores[COL.ATUALIZADO - 1] || '').toString(),
    etapas: etapas
  };
}

/**
 * Responde com a lista de registos de um tipo, filtrada por estado
 * ("todos", "emCurso", "terminados" ou "atraso").
 */
function listarRegistos(tipo, filtro) {
  var aba = obterAba(tipo);
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return { status: 'ok', itens: [] };

  var todasAsLinhas = aba.getRange(2, 1, ultimaLinha - 1, COL_PRIMEIRA_ETAPA - 1 + ETAPAS.length).getValues();
  var itens = [];

  for (var i = 0; i < todasAsLinhas.length; i++) {
    var linha = todasAsLinhas[i];
    if (!linha[COL.SERIAL - 1]) continue;
    var item = linhaParaObjeto(linha);

    if (filtro === 'emCurso' && item.estado !== 'Em curso') continue;
    if (filtro === 'terminados' && item.estado !== 'Terminado') continue;
    if (filtro === 'atraso' && item.emAtraso !== 'Sim') continue;

    itens.push(item);
  }

  itens.sort(function (a, b) { return b.atualizadoEm.localeCompare(a.atualizadoEm); });
  return { status: 'ok', itens: itens };
}

/**
 * Responde com um unico registo pelo numero de serie, ou existe:false se
 * ainda nao existir nenhum registo com esse numero.
 */
function obterRegisto(tipo, serial) {
  var serialLimpo = (serial || '').toString().trim();
  if (!serialLimpo) {
    throw new Error('Numero de serie em falta.');
  }

  var aba = obterAba(tipo);
  var linha = encontrarLinha(aba, serialLimpo);
  if (linha === -1) {
    return { status: 'ok', existe: false };
  }

  var valores = aba.getRange(linha, 1, 1, COL_PRIMEIRA_ETAPA - 1 + ETAPAS.length).getValues()[0];
  return { status: 'ok', existe: true, dados: linhaParaObjeto(valores) };
}

/**
 * Cria ou atualiza (upsert, pelo numero de serie) um registo de producao.
 */
function guardarRegisto(dados) {
  var tipo = dados.tipo;
  var serial = (dados.serial || '').toString().trim();
  if (!serial) {
    throw new Error('Numero de serie em falta.');
  }

  var aba = obterAba(tipo);
  var linha = encontrarLinha(aba, serial);
  var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd HH:mm');

  var previsaoSaida = (dados.previsaoSaida || '').toString().trim();
  var estado = (dados.estado || 'Em curso').toString().trim();
  var emAtraso = calcularEmAtraso(estado, previsaoSaida);

  if (linha === -1) {
    var novaLinha = [
      serial,
      (dados.grupo || '').toString().trim(),
      estado,
      emAtraso,
      previsaoSaida,
      (dados.dataEntrega || '').toString().trim(),
      (dados.materiaisEmFalta || '').toString().trim(),
      (dados.materiaisEntregues || '').toString().trim(),
      '',
      agora,
      agora
    ].concat(aplicarEtapasNovoRegisto(dados.etapas, agora));

    aba.getRange(aba.getLastRow() + 1, 1, 1, novaLinha.length).setValues([novaLinha]);
  } else {
    var valoresAtuais = aba.getRange(linha, 1, 1, COL_PRIMEIRA_ETAPA - 1 + ETAPAS.length).getValues()[0];

    aba.getRange(linha, COL.GRUPO).setValue((dados.grupo || '').toString().trim());
    aba.getRange(linha, COL.ESTADO).setValue(estado);
    aba.getRange(linha, COL.ATRASO).setValue(emAtraso);
    aba.getRange(linha, COL.PREVISAO).setValue(previsaoSaida);
    aba.getRange(linha, COL.ENTREGA).setValue((dados.dataEntrega || '').toString().trim());
    aba.getRange(linha, COL.MAT_FALTA).setValue((dados.materiaisEmFalta || '').toString().trim());
    aba.getRange(linha, COL.MAT_ENTREGUE).setValue((dados.materiaisEntregues || '').toString().trim());
    aba.getRange(linha, COL.ATUALIZADO).setValue(agora);

    ETAPAS.forEach(function (et, indice) {
      var coluna = COL_PRIMEIRA_ETAPA + indice;
      var brutoAtual = (valoresAtuais[coluna - 1] || '').toString().trim();
      var dataAtual = brutoAtual.split(SEPARADOR_NOTA)[0];
      var etapaPedida = (dados.etapas && dados.etapas[et.chave]) || {};
      var marcadoAgora = etapaPedida.marcado === true;
      var notaAgora = (etapaPedida.nota || '').toString().trim();

      if (marcadoAgora) {
        var dataFinal = dataAtual || agora;
        var valorFinal = notaAgora ? dataFinal + SEPARADOR_NOTA + notaAgora : dataFinal;
        aba.getRange(linha, coluna).setValue(valorFinal);
      } else {
        aba.getRange(linha, coluna).setValue('');
      }
    });
  }

  adicionarValorNaLista(tipo === 'ciclos' ? 'ciclosProducao' : 'gruposProducao', (dados.grupo || '').toString().trim());

  return { status: 'ok', mensagem: 'Registo guardado.' };
}

function aplicarEtapasNovoRegisto(etapasPedidas, agora) {
  return ETAPAS.map(function (et) {
    var etapaPedida = (etapasPedidas && etapasPedidas[et.chave]) || {};
    if (etapaPedida.marcado !== true) return '';
    var nota = (etapaPedida.nota || '').toString().trim();
    return nota ? agora + SEPARADOR_NOTA + nota : agora;
  });
}

/**
 * Conta, para "Grupos" e para "Ciclos", quantos registos estao em curso,
 * terminados, e em atraso. Usado pelo painel-resumo no topo do formulario.
 */
function obterResumoGeral() {
  var resultado = {};

  ['grupos', 'ciclos'].forEach(function (tipo) {
    var aba = obterAba(tipo);
    var ultimaLinha = aba.getLastRow();
    var emCurso = 0;
    var terminados = 0;
    var atraso = 0;

    if (ultimaLinha >= 2) {
      var linhas = aba.getRange(2, 1, ultimaLinha - 1, 4).getValues();
      linhas.forEach(function (linha) {
        var serial = (linha[0] || '').toString().trim();
        if (!serial) return;
        var estado = (linha[2] || '').toString();
        var emAtraso = (linha[3] || '').toString();

        if (estado === 'Terminado') {
          terminados = terminados + 1;
        } else {
          emCurso = emCurso + 1;
        }
        if (emAtraso === 'Sim') atraso = atraso + 1;
      });
    }

    resultado[tipo] = { emCurso: emCurso, terminados: terminados, atraso: atraso, total: emCurso + terminados };
  });

  return { status: 'ok', resumo: resultado };
}

function calcularEmAtraso(estado, previsaoSaida) {
  if (estado === 'Terminado' || !previsaoSaida) return 'Nao';
  var dataPrevista = new Date(previsaoSaida + 'T23:59:59');
  if (isNaN(dataPrevista.getTime())) return 'Nao';
  var hoje = new Date();
  return dataPrevista.getTime() < hoje.getTime() ? 'Sim' : 'Nao';
}

/**
 * Muda o numero de serie de um registo existente (usar so em ultimo caso,
 * ex.: engano na etiquetagem da maquina). Guarda o numero antigo na coluna
 * de historico, para nao se perder o rasto.
 */
function mudarNumeroSerie(dados) {
  var tipo = dados.tipo;
  var serialAtual = (dados.serialAtual || '').toString().trim();
  var serialNovo = (dados.serialNovo || '').toString().trim();

  if (!serialAtual || !serialNovo) {
    throw new Error('Indique o numero de serie atual e o novo.');
  }
  if (serialAtual.toLowerCase() === serialNovo.toLowerCase()) {
    throw new Error('O novo numero de serie tem de ser diferente do atual.');
  }

  var aba = obterAba(tipo);
  var linha = encontrarLinha(aba, serialAtual);
  if (linha === -1) {
    throw new Error('Nao foi encontrado nenhum registo com o numero de serie ' + serialAtual + '.');
  }
  if (encontrarLinha(aba, serialNovo) !== -1) {
    throw new Error('Ja existe um registo com o numero de serie ' + serialNovo + '.');
  }

  var historicoAtual = aba.getRange(linha, COL.HISTORICO).getValue().toString().trim();
  var novoHistorico = historicoAtual ? historicoAtual + ', ' + serialAtual : serialAtual;

  aba.getRange(linha, COL.SERIAL).setValue(serialNovo);
  aba.getRange(linha, COL.HISTORICO).setValue(novoHistorico);
  aba.getRange(linha, COL.ATUALIZADO).setValue(
    Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd HH:mm')
  );

  return { status: 'ok', mensagem: 'Numero de serie atualizado.' };
}

/**
 * Gera um Excel (.xlsx) e um PDF a partir da aba pedida (estado atual
 * completo de "Grupos" ou "Ciclos") e envia-os por e-mail.
 */
function enviarResumoProducao(dados) {
  var tipo = dados.tipo;
  var emailsInput = (dados.emails || '').toString().trim();
  if (!emailsInput) {
    throw new Error('Indique pelo menos um e-mail de destinatario.');
  }

  var aba = obterAba(tipo);
  if (aba.getLastRow() < 2) {
    throw new Error('Ainda nao ha nenhum registo de producao nesta aba.');
  }

  var emails = limparListaEmails(emailsInput);
  var excelBlob = exportarAbaComoBlob(aba, 'xlsx');
  var pdfBlob = exportarAbaComoBlob(aba, 'pdf');

  var nomeTipo = tipo === 'ciclos' ? 'Ciclos' : 'Grupos';
  var corpo = EMPRESA + ' - Resumo de producao (' + nomeTipo + ').\n\n';
  corpo = corpo + 'Em anexo: o estado atual de todos os numeros de serie em producao (' + nomeTipo + '), em Excel e PDF.\n';
  corpo = corpo + '\nEste e-mail foi gerado automaticamente pela aplicacao de Controlo de Producao.';

  MailApp.sendEmail({
    to: emails,
    subject: EMPRESA + ' - Resumo de producao - ' + nomeTipo + ' - ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'dd/MM/yyyy'),
    body: corpo,
    attachments: [excelBlob, pdfBlob]
  });

  return { status: 'ok', mensagem: 'Resumo enviado por e-mail.' };
}

/**
 * Ativa ou desativa o envio automatico do resumo de producao por e-mail.
 * Suporta tres tipos de agendamento, escolhidos livremente:
 *  - "diario": todos os dias, a uma hora/minuto escolhidos.
 *  - "semanal": um dia da semana escolhido, a uma hora/minuto escolhidos.
 *  - "unico": uma unica vez, numa data e hora exatas escolhidas.
 * Guarda a configuracao nas Propriedades do Script e cria/remove o
 * gatilho (trigger) correspondente.
 */
function configurarEnvioAutomatico(dados) {
  var emails = (dados.emails || '').toString().trim();
  var ativo = dados.ativo === true;
  var frequencia = ['diario', 'semanal', 'unico'].indexOf(dados.frequencia) !== -1 ? dados.frequencia : 'diario';
  var hora = Math.min(23, Math.max(0, parseInt(dados.hora, 10) || 0));
  var minuto = Math.min(59, Math.max(0, parseInt(dados.minuto, 10) || 0));
  var diaSemana = (dados.diaSemana || 'MONDAY').toString().trim();
  var dataHora = (dados.dataHora || '').toString().trim();

  if (ativo && !emails) {
    throw new Error('Indique pelo menos um e-mail para o envio automatico.');
  }
  if (ativo && frequencia === 'unico') {
    if (!dataHora) {
      throw new Error('Escolha a data e a hora para o envio unico.');
    }
    var dataAlvo = new Date(dataHora);
    if (isNaN(dataAlvo.getTime())) {
      throw new Error('Data/hora invalida.');
    }
    if (dataAlvo.getTime() <= new Date().getTime()) {
      throw new Error('Escolha uma data/hora no futuro.');
    }
  }
  if (ativo && frequencia === 'semanal' && !ScriptApp.WeekDay[diaSemana]) {
    throw new Error('Dia da semana invalido.');
  }

  removerTriggersExistentes(NOME_FUNCAO_TRIGGER);

  if (ativo) {
    if (frequencia === 'unico') {
      ScriptApp.newTrigger(NOME_FUNCAO_TRIGGER).timeBased().at(new Date(dataHora)).create();
    } else if (frequencia === 'semanal') {
      ScriptApp.newTrigger(NOME_FUNCAO_TRIGGER).timeBased()
        .atHour(hora).nearMinute(minuto)
        .onWeekDay(ScriptApp.WeekDay[diaSemana]).everyWeeks(1)
        .create();
    } else {
      ScriptApp.newTrigger(NOME_FUNCAO_TRIGGER).timeBased()
        .atHour(hora).nearMinute(minuto)
        .everyDays(1)
        .create();
    }
  }

  guardarConfigEnvioAutomatico({
    ativo: ativo,
    emails: limparListaEmails(emails),
    frequencia: frequencia,
    hora: hora,
    minuto: minuto,
    diaSemana: diaSemana,
    dataHora: dataHora
  });

  return { status: 'ok', mensagem: ativo ? 'Envio automatico ativado.' : 'Envio automatico desativado.' };
}

function removerTriggersExistentes(nomeFuncao) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === nomeFuncao) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function obterConfigEnvioAutomatico() {
  var propriedades = PropertiesService.getScriptProperties();
  var guardado = propriedades.getProperty(CONFIG_ENVIO_KEY);
  var padrao = { status: 'ok', ativo: false, emails: '', frequencia: 'diario', hora: 8, minuto: 0, diaSemana: 'MONDAY', dataHora: '' };
  if (!guardado) return padrao;

  var config = JSON.parse(guardado);
  return {
    status: 'ok',
    ativo: !!config.ativo,
    emails: config.emails || '',
    frequencia: config.frequencia || 'diario',
    hora: typeof config.hora === 'number' ? config.hora : 8,
    minuto: typeof config.minuto === 'number' ? config.minuto : 0,
    diaSemana: config.diaSemana || 'MONDAY',
    dataHora: config.dataHora || ''
  };
}

function guardarConfigEnvioAutomatico(config) {
  var propriedades = PropertiesService.getScriptProperties();
  propriedades.setProperty(CONFIG_ENVIO_KEY, JSON.stringify(config));
}

/**
 * Chamada automaticamente pelo gatilho (diario, semanal ou unico), nunca
 * diretamente pelo formulario. Os gatilhos do Apps Script nao recebem
 * argumentos, por isso le a configuracao guardada nas Propriedades do
 * Script. Um envio "unico" desativa-se sozinho depois de disparar.
 */
function enviarResumosAutomaticos() {
  var propriedades = PropertiesService.getScriptProperties();
  var guardado = propriedades.getProperty(CONFIG_ENVIO_KEY);
  if (!guardado) return;

  var config = JSON.parse(guardado);
  if (!config.ativo || !config.emails) return;

  ['grupos', 'ciclos'].forEach(function (tipo) {
    try {
      var aba = obterAba(tipo);
      if (aba.getLastRow() < 2) return;
      enviarResumoProducao({ tipo: tipo, emails: config.emails });
    } catch (erroEnvio) {
      // Nao interrompe o envio do outro tipo se um deles falhar.
    }
  });

  if (config.frequencia === 'unico') {
    config.ativo = false;
    guardarConfigEnvioAutomatico(config);
  }
}

function exportarAbaComoBlob(aba, formato) {
  var folha = SpreadsheetApp.getActiveSpreadsheet();
  var url = 'https://docs.google.com/spreadsheets/d/' + folha.getId() + '/export' +
    '?format=' + formato +
    '&gid=' + aba.getSheetId() +
    '&portrait=false&fitw=true&gridlines=true&printtitle=false&sheetnames=false';

  var opcoes = {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  };

  var resposta = UrlFetchApp.fetch(url, opcoes);
  if (resposta.getResponseCode() !== 200) {
    throw new Error('Falha ao exportar a folha como ' + formato + ' (codigo ' + resposta.getResponseCode() + ').');
  }

  var nomeFicheiro = aba.getName() + '_' +
    Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyyMMdd_HHmm') + '.' + formato;
  return resposta.getBlob().setName(nomeFicheiro);
}

// ===========================================================================
// Alerta por WhatsApp (opcional, desligado por omissao). Usa a API gratuita
// do CallMeBot: basta enviar uma mensagem "I allow callmebot to send me
// messages" para o numero do bot indicado em
// https://www.callmebot.com/blog/free-api-whatsapp-messages/, receber de
// volta uma apikey por WhatsApp, e preencher WHATSAPP_TELEFONE/APIKEY abaixo.
// Enquanto estiver vazio, enviarAlertaWhatsapp_ nao faz nada (sem erros).
// ===========================================================================
var WHATSAPP_TELEFONE = ''; // numero com codigo do pais, sem "+" (ex.: '351912345678')
var WHATSAPP_APIKEY = '';

function enviarAlertaWhatsapp_(mensagem) {
  if (!WHATSAPP_TELEFONE || !WHATSAPP_APIKEY) return;
  try {
    var url = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(WHATSAPP_TELEFONE) +
      '&text=' + encodeURIComponent(mensagem) + '&apikey=' + encodeURIComponent(WHATSAPP_APIKEY);
    UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  } catch (erroWhatsapp) {
    // Alerta e sempre "best effort" - nunca deve bloquear a operacao principal.
  }
}

// ===========================================================================
// Armazem: stock real de materiais (diferente da estrutura "MateriaisPadrao"
// por modelo, que e so a lista do que cada modelo precisa). Aqui guarda-se
// a quantidade realmente em stock, com um historico de movimentos
// (entradas/saidas) que permite calcular uma previsao simples de quando o
// stock minimo vai ser atingido.
// ===========================================================================
var ABA_MATERIAIS_STOCK = 'Materiais';
var ABA_MOVIMENTOS_STOCK = 'MovimentosStock';
var CABECALHOS_MATERIAIS_STOCK = ['id', 'nome', 'categoria', 'unidade', 'stockAtual', 'stockMinimo', 'notas', 'criadoEm'];
var CABECALHOS_MOVIMENTOS_STOCK = ['id', 'dataHora', 'materialId', 'materialNome', 'tipo', 'quantidade', 'responsavel', 'notas'];
var DIAS_JANELA_PREVISAO = 60; // janela usada para calcular o consumo medio diario

function obterAbaMateriaisStock_() {
  var folha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = folha.getSheetByName(ABA_MATERIAIS_STOCK);
  if (aba) return aba;
  aba = folha.insertSheet(ABA_MATERIAIS_STOCK);
  aba.getRange(1, 1, 1, CABECALHOS_MATERIAIS_STOCK.length).setValues([CABECALHOS_MATERIAIS_STOCK]);
  aba.setFrozenRows(1);
  aba.getRange(1, 1, 1, CABECALHOS_MATERIAIS_STOCK.length).setFontWeight('bold');
  return aba;
}

function obterAbaMovimentosStock_() {
  var folha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = folha.getSheetByName(ABA_MOVIMENTOS_STOCK);
  if (aba) return aba;
  aba = folha.insertSheet(ABA_MOVIMENTOS_STOCK);
  aba.getRange(1, 1, 1, CABECALHOS_MOVIMENTOS_STOCK.length).setValues([CABECALHOS_MOVIMENTOS_STOCK]);
  aba.setFrozenRows(1);
  aba.getRange(1, 1, 1, CABECALHOS_MOVIMENTOS_STOCK.length).setFontWeight('bold');
  return aba;
}

function gerarIdStock_() {
  return Utilities.getUuid();
}

function lerLinhasComoObjetos_(aba, cabecalhos) {
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return [];
  var valores = aba.getRange(2, 1, ultimaLinha - 1, cabecalhos.length).getValues();
  return valores
    .map(function (linha) {
      var obj = {};
      cabecalhos.forEach(function (h, i) { obj[h] = linha[i]; });
      return obj;
    })
    .filter(function (obj) { return obj.id; });
}

/**
 * Lista todos os materiais em stock, com uma previsao simples de dias at
 * atingir o stock minimo, calculada a partir do consumo medio diario
 * (saidas) nos ultimos DIAS_JANELA_PREVISAO dias.
 */
function listarMateriaisStock() {
  var abaMateriais = obterAbaMateriaisStock_();
  var materiais = lerLinhasComoObjetos_(abaMateriais, CABECALHOS_MATERIAIS_STOCK);

  var abaMovimentos = obterAbaMovimentosStock_();
  var movimentos = lerLinhasComoObjetos_(abaMovimentos, CABECALHOS_MOVIMENTOS_STOCK);

  var limiteJanela = new Date().getTime() - DIAS_JANELA_PREVISAO * 24 * 60 * 60 * 1000;

  var saidasPorMaterial = {};
  movimentos.forEach(function (mov) {
    if (mov.tipo !== 'Saida') return;
    var dataMov = new Date((mov.dataHora || '').toString());
    if (isNaN(dataMov.getTime()) || dataMov.getTime() < limiteJanela) return;
    saidasPorMaterial[mov.materialId] = (saidasPorMaterial[mov.materialId] || 0) + (Number(mov.quantidade) || 0);
  });

  var itens = materiais.map(function (m) {
    var totalSaidas = saidasPorMaterial[m.id] || 0;
    var consumoMedioDiario = totalSaidas / DIAS_JANELA_PREVISAO;
    var stockAtual = Number(m.stockAtual) || 0;
    var stockMinimo = Number(m.stockMinimo) || 0;
    var diasAteMinimo = null;
    if (consumoMedioDiario > 0) {
      diasAteMinimo = Math.max(0, Math.round((stockAtual - stockMinimo) / consumoMedioDiario));
    }
    return {
      id: m.id,
      nome: m.nome,
      categoria: m.categoria,
      unidade: m.unidade,
      stockAtual: stockAtual,
      stockMinimo: stockMinimo,
      notas: m.notas,
      consumoMedioDiario: Math.round(consumoMedioDiario * 100) / 100,
      diasAteMinimo: diasAteMinimo,
      stockBaixo: stockAtual <= stockMinimo
    };
  });

  itens.sort(function (a, b) { return a.nome.localeCompare(b.nome); });
  return { status: 'ok', itens: itens };
}

function adicionarMaterialStock(dados) {
  var nome = (dados.nome || '').toString().trim();
  var categoria = (dados.categoria || '').toString().trim();
  var unidade = (dados.unidade || 'un').toString().trim() || 'un';
  var stockAtual = Number(dados.stockAtual);
  var stockMinimo = Number(dados.stockMinimo);

  if (!nome) throw new Error('Indique o nome do material.');
  if (['Eletrica', 'Frio', 'Consumivel'].indexOf(categoria) === -1) {
    throw new Error('Categoria invalida (use Eletrica, Frio ou Consumivel).');
  }
  if (isNaN(stockAtual) || stockAtual < 0) stockAtual = 0;
  if (isNaN(stockMinimo) || stockMinimo < 0) stockMinimo = 0;

  var aba = obterAbaMateriaisStock_();
  aba.appendRow([
    gerarIdStock_(),
    nome,
    categoria,
    unidade,
    stockAtual,
    stockMinimo,
    (dados.notas || '').toString().trim(),
    Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd HH:mm')
  ]);

  return listarMateriaisStock();
}

function removerMaterialStock(dados) {
  var id = (dados.id || '').toString().trim();
  if (!id) throw new Error('ID do material em falta.');

  var aba = obterAbaMateriaisStock_();
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha >= 2) {
    var ids = aba.getRange(2, 1, ultimaLinha - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (ids[i][0] === id) {
        aba.deleteRow(i + 2);
        break;
      }
    }
  }
  return listarMateriaisStock();
}

/**
 * Regista uma entrada ou saida de stock, atualiza o stock atual do
 * material, e dispara um alerta (WhatsApp, se configurado) se o stock
 * ficar no minimo ou abaixo dele.
 */
function registarMovimentoStock(dados) {
  var materialId = (dados.materialId || '').toString().trim();
  var tipo = (dados.tipo || '').toString().trim();
  var quantidade = Number(dados.quantidade);
  var responsavel = (dados.responsavel || '').toString().trim();

  if (!materialId) throw new Error('Selecione o material.');
  if (['Entrada', 'Saida'].indexOf(tipo) === -1) throw new Error('Tipo de movimento invalido.');
  if (isNaN(quantidade) || quantidade <= 0) throw new Error('Indique uma quantidade valida (maior que zero).');
  if (!responsavel) throw new Error('Indique o responsavel.');

  var abaMateriais = obterAbaMateriaisStock_();
  var ultimaLinha = abaMateriais.getLastRow();
  var linhaMaterial = -1;
  var materialNome = '';
  var novoStock = 0;

  if (ultimaLinha >= 2) {
    var valores = abaMateriais.getRange(2, 1, ultimaLinha - 1, CABECALHOS_MATERIAIS_STOCK.length).getValues();
    for (var i = 0; i < valores.length; i++) {
      if (valores[i][0] === materialId) {
        linhaMaterial = i + 2;
        materialNome = valores[i][1];
        var stockAtual = Number(valores[i][4]) || 0;
        novoStock = tipo === 'Entrada' ? stockAtual + quantidade : stockAtual - quantidade;
        break;
      }
    }
  }

  if (linhaMaterial === -1) throw new Error('Material nao encontrado.');

  abaMateriais.getRange(linhaMaterial, 5).setValue(novoStock);

  var abaMovimentos = obterAbaMovimentosStock_();
  abaMovimentos.appendRow([
    gerarIdStock_(),
    Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd HH:mm'),
    materialId,
    materialNome,
    tipo,
    quantidade,
    responsavel,
    (dados.notas || '').toString().trim()
  ]);

  var stockMinimo = Number(abaMateriais.getRange(linhaMaterial, 6).getValue()) || 0;
  if (novoStock <= stockMinimo) {
    enviarAlertaWhatsapp_(EMPRESA + ': stock de "' + materialNome + '" esta no minimo (' + novoStock + ', minimo ' + stockMinimo + ').');
  }

  return listarMateriaisStock();
}

// ===========================================================================
// Estatisticas de etapas (bottlenecks) e tendencia de atrasos, para o
// dashboard do Controlo de Producao.
// ===========================================================================
function obterEstatisticasEtapas() {
  var porEtapa = ETAPAS.map(function (et) { return { chave: et.chave, rotulo: et.rotulo, somaDias: 0, contagem: 0 }; });
  var porEtapaMapa = {};
  porEtapa.forEach(function (p) { porEtapaMapa[p.chave] = p; });

  var atrasosPorMes = {};

  ['grupos', 'ciclos'].forEach(function (tipo) {
    var aba = obterAba(tipo);
    var ultimaLinha = aba.getLastRow();
    if (ultimaLinha < 2) return;

    var valores = aba.getRange(2, 1, ultimaLinha - 1, COL_PRIMEIRA_ETAPA - 1 + ETAPAS.length).getValues();
    valores.forEach(function (linha) {
      if (!linha[COL.SERIAL - 1]) return;
      var criadoEm = (linha[COL.CRIADO - 1] || '').toString();
      var emAtraso = (linha[COL.ATRASO - 1] || '').toString();
      var dataAnterior = criadoEm ? new Date(criadoEm.replace(' ', 'T')) : null;

      if (criadoEm) {
        var mesChave = criadoEm.slice(0, 7);
        atrasosPorMes[mesChave] = atrasosPorMes[mesChave] || { total: 0, atraso: 0 };
        atrasosPorMes[mesChave].total = atrasosPorMes[mesChave].total + 1;
        if (emAtraso === 'Sim') atrasosPorMes[mesChave].atraso = atrasosPorMes[mesChave].atraso + 1;
      }

      ETAPAS.forEach(function (et, indice) {
        var bruto = (linha[COL_PRIMEIRA_ETAPA - 1 + indice] || '').toString();
        var dataConcluida = bruto.split(SEPARADOR_NOTA)[0];
        if (!dataConcluida || !dataAnterior) return;
        var dataEtapa = new Date(dataConcluida.replace(' ', 'T'));
        if (isNaN(dataEtapa.getTime())) return;
        var dias = (dataEtapa.getTime() - dataAnterior.getTime()) / (1000 * 60 * 60 * 24);
        if (dias >= 0) {
          porEtapaMapa[et.chave].somaDias = porEtapaMapa[et.chave].somaDias + dias;
          porEtapaMapa[et.chave].contagem = porEtapaMapa[et.chave].contagem + 1;
        }
        dataAnterior = dataEtapa;
      });
    });
  });

  var porEtapaFinal = porEtapa.map(function (p) {
    return {
      chave: p.chave,
      rotulo: p.rotulo,
      mediaDias: p.contagem ? Math.round((p.somaDias / p.contagem) * 10) / 10 : null,
      contagem: p.contagem
    };
  });

  var mesesOrdenados = Object.keys(atrasosPorMes).sort();
  var tendenciaAtraso = mesesOrdenados.map(function (mes) {
    return { mes: mes, total: atrasosPorMes[mes].total, atraso: atrasosPorMes[mes].atraso };
  });

  return { status: 'ok', porEtapa: porEtapaFinal, tendenciaAtraso: tendenciaAtraso };
}

// ===========================================================================
// Historico completo por numero de serie: junta os envios de Relatorios
// (pastas no Drive) com as etapas de Controlo de Producao, num unico feed
// cronologico - para nao ter de ir aos dois separadores separadamente.
// ===========================================================================
function isoDeDataHora_(texto) {
  var d = new Date(texto.toString().replace(' ', 'T'));
  return isNaN(d.getTime()) ? texto.toString() : d.toISOString();
}

function obterHistoricoCompleto(parametros) {
  var resposta;
  try {
    var serial = (parametros.serial || '').toString().trim();
    if (!serial) {
      throw new Error('Numero de serie em falta.');
    }

    var eventos = [];
    var raiz = DriveApp.getFolderById(FOLDER_ID);
    var prefixoSerial = sanitizeNome(serial);

    var pastas = raiz.getFolders();
    while (pastas.hasNext()) {
      var pasta = pastas.next();
      var nome = pasta.getName();
      var ehDesteSerial =
        nome.indexOf('SN_' + prefixoSerial + '_Grupo') === 0 ||
        nome.indexOf('CICLO_' + prefixoSerial + '_Grupo') === 0;
      if (!ehDesteSerial) continue;

      eventos.push({
        data: pasta.getDateCreated().toISOString(),
        tipo: 'relatorio',
        descricao: 'Relatorio enviado (' + nome + ')'
      });
    }

    ['grupos', 'ciclos'].forEach(function (tipo) {
      var aba = obterAba(tipo);
      var linha = encontrarLinha(aba, serial);
      if (linha === -1) return;

      var valores = aba.getRange(linha, 1, 1, COL_PRIMEIRA_ETAPA - 1 + ETAPAS.length).getValues()[0];
      var obj = linhaParaObjeto(valores);
      var nomeTipo = tipo === 'ciclos' ? 'Ciclos' : 'Grupos';

      if (obj.criadoEm) {
        eventos.push({
          data: isoDeDataHora_(obj.criadoEm),
          tipo: 'producao',
          descricao: 'Registo de producao criado (' + nomeTipo + ')'
        });
      }

      ETAPAS.forEach(function (et) {
        var info = obj.etapas[et.chave];
        if (info && info.data) {
          var descricaoEtapa = 'Etapa concluida: ' + et.rotulo;
          if (info.nota) descricaoEtapa = descricaoEtapa + ' (' + info.nota + ')';
          eventos.push({ data: isoDeDataHora_(info.data), tipo: 'producao', descricao: descricaoEtapa });
        }
      });
    });

    eventos.sort(function (a, b) { return a.data.localeCompare(b.data); });
    resposta = { status: 'ok', eventos: eventos };
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  return respostaJson(resposta);
}

// ===========================================================================
// Suporte PWA (experimental, melhor esforco): manifesto + service worker,
// servidos pelo proprio doGet (?action=manifest / ?action=sw), para
// permitir "Adicionar ao ecra principal" e um arranque mais rapido/parcial
// sem rede. NAO torna o envio de fotos/e-mails possivel offline - isso
// continua a precisar de ligacao, como em qualquer app Apps Script.
// ===========================================================================
var ICONE_APP_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192">' +
  '<rect width="192" height="192" rx="24" fill="#0d47a1"/>' +
  '<text x="96" y="132" font-size="110" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif">C</text>' +
  '</svg>';

function respostaManifest_() {
  var manifest = {
    name: EMPRESA + ' - Relatorios e Controlo de Producao',
    short_name: 'Cablotec',
    start_url: ScriptApp.getService().getUrl(),
    display: 'standalone',
    background_color: '#1a73e8',
    theme_color: '#0d47a1',
    icons: [{
      src: 'data:image/svg+xml;base64,' + Utilities.base64Encode(ICONE_APP_SVG),
      sizes: '192x192',
      type: 'image/svg+xml'
    }]
  };
  var saida = ContentService.createTextOutput(JSON.stringify(manifest));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

function respostaServiceWorker_() {
  var js = [
    "self.addEventListener('install', function (evento) {",
    "  evento.waitUntil(",
    "    caches.open('cablotec-shell-v1').then(function (cache) {",
    "      return cache.add(self.registration.scope);",
    "    })",
    "  );",
    "});",
    "self.addEventListener('fetch', function (evento) {",
    "  if (evento.request.mode !== 'navigate') return;", // so cuida da pagina principal, nunca das chamadas de dados/acao
    "  evento.respondWith(",
    "    fetch(evento.request).then(function (resposta) {",
    "      caches.open('cablotec-shell-v1').then(function (cache) { cache.put(evento.request, resposta.clone()); });",
    "      return resposta;",
    "    }).catch(function () {",
    "      return caches.match(evento.request);",
    "    })",
    "  );",
    "});"
  ].join('\n');

  var saida = ContentService.createTextOutput(js);
  saida.setMimeType(ContentService.MimeType.JAVASCRIPT);
  return saida;
}

// ===========================================================================
// Checklist de Producao (Grupos e Ciclos) - formularios detalhados de
// verificacao de qualidade, com varias paginas, fotos e assinaturas.
// Guardados numa unica aba "Checklists" (uma linha por submissao); os
// campos especificos de cada tipo ficam dentro de "dadosJson", para o
// layout de cada checklist poder evoluir sem redesenhar a folha de calculo.
// ===========================================================================
var ABA_CHECKLISTS = 'Checklists';
var CABECALHOS_CHECKLISTS = ['id', 'tipo', 'equipamento', 'numeroSerie', 'email', 'conformidade', 'criadoEm', 'dadosJson'];

function obterAbaChecklists_() {
  var folha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = folha.getSheetByName(ABA_CHECKLISTS);
  if (aba) return aba;
  aba = folha.insertSheet(ABA_CHECKLISTS);
  aba.getRange(1, 1, 1, CABECALHOS_CHECKLISTS.length).setValues([CABECALHOS_CHECKLISTS]);
  aba.setFrozenRows(1);
  aba.getRange(1, 1, 1, CABECALHOS_CHECKLISTS.length).setFontWeight('bold');
  return aba;
}

/**
 * Guarda a imagem de uma foto ou assinatura (data:image/...;base64,...)
 * numa subpasta do Drive dedicada a este checklist, e devolve {id, nome}
 * para ficar guardado em dadosJson (em vez do base64 completo, que
 * tornaria a Sheet enorme).
 */
function guardarImagemChecklist_(pastaChecklist, dataUrl, nomeBase) {
  var blob = base64ParaBlob(dataUrl, nomeBase);
  if (!blob) return null;
  var ficheiro = pastaChecklist.createFile(blob);
  return { id: ficheiro.getId(), nome: ficheiro.getName() };
}

/**
 * Percorre recursivamente os dados de um checklist, convertendo qualquer
 * valor "data:image/..." (fotos ou assinaturas) num ficheiro no Drive e
 * substituindo-o pela referencia {id, nome}. Mantem a estrutura tal como o
 * frontend a enviou (campos simples, tabelas, listas de fotos).
 */
function processarImagensChecklist_(valor, pastaChecklist, prefixo, contador) {
  if (Array.isArray(valor)) {
    return valor.map(function (item, indice) {
      return processarImagensChecklist_(item, pastaChecklist, prefixo + '_' + (indice + 1), contador);
    });
  }
  if (valor && typeof valor === 'object') {
    var resultado = {};
    Object.keys(valor).forEach(function (chave) {
      resultado[chave] = processarImagensChecklist_(valor[chave], pastaChecklist, prefixo + '_' + chave, contador);
    });
    return resultado;
  }
  if (typeof valor === 'string' && valor.indexOf('data:image/') === 0) {
    contador.n = contador.n + 1;
    return guardarImagemChecklist_(pastaChecklist, valor, prefixo + '_' + contador.n);
  }
  return valor;
}

/**
 * Guarda uma submissao completa de checklist (Grupos ou Ciclos). "dados"
 * vem do frontend com tipo/equipamento/numeroSerie/email/conformidade, e
 * um objeto "campos" com TODOS os valores do formulario (incluindo fotos e
 * assinaturas em base64, guardadas no Drive antes de escrever a linha).
 */
function guardarChecklist(dados) {
  var tipo = (dados.tipo || '').toString().trim();
  var equipamento = (dados.equipamento || '').toString().trim();
  var numeroSerie = (dados.numeroSerie || '').toString().trim();
  var email = (dados.email || '').toString().trim();
  var conformidade = dados.conformidade === 'Sim' ? 'Sim' : 'Nao';

  if (['grupos', 'ciclos'].indexOf(tipo) === -1) {
    throw new Error('Tipo de checklist invalido.');
  }
  if (!numeroSerie) {
    throw new Error('Numero de serie em falta.');
  }
  if (!email) {
    throw new Error('E-mail de quem preenche o documento em falta.');
  }

  var raiz = DriveApp.getFolderById(FOLDER_ID);
  var pastaChecklists = obterOuCriarSubpasta(raiz, 'Checklists', true);
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyyMMdd_HHmmss');
  var nomePasta = sanitizeNome(tipo) + '_' + sanitizeNome(numeroSerie) + '_' + timestamp;
  var pastaChecklist = pastaChecklists.createFolder(nomePasta);

  var contador = { n: 0 };
  var camposProcessados = processarImagensChecklist_(dados.campos || {}, pastaChecklist, 'checklist', contador);

  var aba = obterAbaChecklists_();
  var id = Utilities.getUuid();
  var criadoEm = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd HH:mm');
  var dadosJson = JSON.stringify({ campos: camposProcessados, pastaId: pastaChecklist.getId() });

  aba.appendRow([id, tipo, equipamento, numeroSerie, email, conformidade, criadoEm, dadosJson]);

  // Faz crescer as listas de sugestoes dos campos "Outro (escrever)..." -
  // os esquemas sao PARTILHADOS com o Relatorio de Testes (mesma lista),
  // os restantes sao especificos do Checklist.
  var camposOriginais = dados.campos || {};
  adicionarValorNaLista('esquemasEletrico', (camposOriginais.esquemaEletrico || '').toString().trim());
  adicionarValorNaLista('esquemasFrio', (camposOriginais.esquemaRefrigeracao || '').toString().trim());
  if (tipo === 'grupos') {
    adicionarValorNaLista('gases', (camposOriginais.testeEletrico || '').toString().trim());
  }
  if (tipo === 'ciclos') {
    adicionarValorNaLista('checklistEquipamentosCiclos', equipamento);
    var sondaInfo = camposOriginais.sondaTemperaturaHumidade || {};
    adicionarValorNaLista('checklistFabricantesSonda', (sondaInfo.fabricante || '').toString().trim());
    adicionarValorNaLista('checklistModelosSonda', (sondaInfo.modelo || '').toString().trim());
    var clicoInfo = camposOriginais.clicoIdentificacao || {};
    adicionarValorNaLista('checklistFabricantesClico', (clicoInfo.fabricante || '').toString().trim());
  }

  if (conformidade === 'Sim') {
    enviarAlertaWhatsapp_(EMPRESA + ': checklist de ' + tipo + ' (' + numeroSerie + ') registou uma NAO CONFORMIDADE.');
  }

  return { status: 'ok', id: id, mensagem: 'Checklist guardado com sucesso.' };
}

function listarChecklists(parametros) {
  var tipo = (parametros.tipo || '').toString().trim();
  var aba = obterAbaChecklists_();
  var itens = lerLinhasComoObjetos_(aba, CABECALHOS_CHECKLISTS);

  if (tipo) {
    itens = itens.filter(function (item) { return item.tipo === tipo; });
  }

  itens.sort(function (a, b) { return b.criadoEm.localeCompare(a.criadoEm); });

  var resumo = itens.map(function (item) {
    return {
      id: item.id,
      tipo: item.tipo,
      equipamento: item.equipamento,
      numeroSerie: item.numeroSerie,
      conformidade: item.conformidade,
      criadoEm: item.criadoEm
    };
  });

  return { status: 'ok', itens: resumo };
}

function obterChecklist(parametros) {
  var id = (parametros.id || '').toString().trim();
  if (!id) {
    throw new Error('ID do checklist em falta.');
  }

  var aba = obterAbaChecklists_();
  var itens = lerLinhasComoObjetos_(aba, CABECALHOS_CHECKLISTS);
  var encontrado = itens.filter(function (item) { return item.id === id; })[0];

  if (!encontrado) {
    throw new Error('Checklist nao encontrado.');
  }

  var dados = JSON.parse(encontrado.dadosJson || '{}');
  return {
    status: 'ok',
    tipo: encontrado.tipo,
    equipamento: encontrado.equipamento,
    numeroSerie: encontrado.numeroSerie,
    email: encontrado.email,
    conformidade: encontrado.conformidade,
    criadoEm: encontrado.criadoEm,
    campos: dados.campos || {}
  };
}
