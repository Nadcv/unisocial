// Produtos e alugueres iniciais. No navegador são usados na primeira visita
// (modo demonstração); no Apps Script (incluídos em apps-script/Code.gs) preenchem a
// Google Sheet quando ela é criada.
var SEED = {
  produtos: [
    { id: 'p1', nome: 'Mel de rosmaninho', categoria: 'Mercearia', preco: 7.5, unidade: 'frasco 500 g', stock: 24, produtor: 'Apicultura Serra Verde', local: 'Serra da Estrela', emoji: '🍯', descricao: 'Mel cru, extraído a frio, da colheita da primavera.' },
    { id: 'p2', nome: 'Queijo de ovelha curado', categoria: 'Laticínios', preco: 12.9, unidade: 'peça ~600 g', stock: 10, produtor: 'Queijaria do Vale', local: 'Castelo Branco', emoji: '🧀', descricao: 'Curado 60 dias, leite cru de ovelha.' },
    { id: 'p3', nome: 'Azeite virgem extra', categoria: 'Mercearia', preco: 9.8, unidade: 'garrafa 750 ml', stock: 40, produtor: 'Lagar da Ribeira', local: 'Trás-os-Montes', emoji: '🫒', descricao: 'Acidez inferior a 0,3%, prensagem a frio.' },
    { id: 'p4', nome: 'Cabaz de legumes da época', categoria: 'Hortícolas', preco: 15, unidade: 'cabaz ~5 kg', stock: 12, produtor: 'Horta da Quinta Nova', local: 'Oeste', emoji: '🥬', descricao: 'Seleção semanal de legumes biológicos colhidos na véspera.' },
    { id: 'p5', nome: 'Pão de centeio', categoria: 'Padaria', preco: 3.2, unidade: 'pão 800 g', stock: 30, produtor: 'Forno de Lenha da Aldeia', local: 'Minho', emoji: '🍞', descricao: 'Massa-mãe, fermentação lenta, cozido em forno de lenha.' },
    { id: 'p6', nome: 'Compota de figo', categoria: 'Mercearia', preco: 4.5, unidade: 'frasco 300 g', stock: 18, produtor: 'Doces da Avó Rosa', local: 'Algarve', emoji: '🫙', descricao: 'Sem conservantes, 60% fruta.' },
    { id: 'p7', nome: 'Ovos caseiros', categoria: 'Laticínios', preco: 3.6, unidade: 'dúzia', stock: 25, produtor: 'Quinta das Galinhas Felizes', local: 'Ribatejo', emoji: '🥚', descricao: 'Galinhas criadas ao ar livre.' },
    { id: 'p8', nome: 'Maçã Bravo de Esmolfe', categoria: 'Fruta', preco: 2.4, unidade: 'kg', stock: 60, produtor: 'Pomar do Dão', local: 'Viseu', emoji: '🍎', descricao: 'Variedade DOP, aroma intenso.' },
    { id: 'p9', nome: 'Vinho tinto regional', categoria: 'Bebidas', preco: 8.9, unidade: 'garrafa 750 ml', stock: 36, produtor: 'Adega Cooperativa', local: 'Alentejo', emoji: '🍷', descricao: 'Aragonez e Trincadeira, estagiado em barrica.' },
    { id: 'p10', nome: 'Cesto de vime artesanal', categoria: 'Artesanato', preco: 22, unidade: 'unidade', stock: 6, produtor: 'Cestaria Tradicional', local: 'Gonçalo', emoji: '🧺', descricao: 'Feito à mão, ideal para compras e piqueniques.' }
  ],
  alugueres: [
    { id: 'a1', nome: 'Casa de campo com piscina', tipo: 'Alojamento', precoDia: 120, caucao: 200, capacidade: '6 pessoas', local: 'Monsaraz', emoji: '🏡', proprietario: 'Joana M.', descricao: '3 quartos, piscina, churrasqueira e vista para o lago.' },
    { id: 'a2', nome: 'Salão de festas da junta', tipo: 'Espaço', precoDia: 90, caucao: 100, capacidade: '80 pessoas', local: 'Centro', emoji: '🎉', proprietario: 'Junta de Freguesia', descricao: 'Mesas, cadeiras, cozinha de apoio e som básico incluídos.' },
    { id: 'a3', nome: 'Betoneira 160 L', tipo: 'Equipamento', precoDia: 18, caucao: 50, capacidade: '160 L', local: 'Zona Industrial', emoji: '🏗️', proprietario: 'Obras Silva', descricao: 'Motor elétrico 230 V, ideal para pequenas obras.' },
    { id: 'a4', nome: 'Motosserra a gasolina', tipo: 'Equipamento', precoDia: 25, caucao: 80, capacidade: 'Sabre 45 cm', local: 'Aldeia Nova', emoji: '🪚', proprietario: 'Rui P.', descricao: 'Inclui óleo de corrente e viseira de proteção.' },
    { id: 'a5', nome: 'Bicicleta elétrica', tipo: 'Transporte', precoDia: 22, caucao: 100, capacidade: 'Autonomia 60 km', local: 'Centro', emoji: '🚲', proprietario: 'Pedala Local', descricao: 'Capacete e cadeado incluídos.' },
    { id: 'a6', nome: 'Tenda para eventos 6×4 m', tipo: 'Equipamento', precoDia: 45, caucao: 100, capacidade: '40 pessoas', local: 'Vila', emoji: '⛺', proprietario: 'Festas & Cia', descricao: 'Montagem não incluída (serviço opcional).' },
    { id: 'a7', nome: 'Máquina de lavar a alta pressão', tipo: 'Equipamento', precoDia: 15, caucao: 40, capacidade: '140 bar', local: 'Zona Industrial', emoji: '💦', proprietario: 'Obras Silva', descricao: 'Ideal para pátios, muros e viaturas.' },
    { id: 'a8', nome: 'Carrinha de 9 lugares', tipo: 'Transporte', precoDia: 75, caucao: 300, capacidade: '9 lugares', local: 'Vila', emoji: '🚐', proprietario: 'Transportes Costa', descricao: 'Quilometragem ilimitada, seguro incluído.' }
  ]
};
