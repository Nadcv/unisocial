# CAD Modular

Editor web de "modulações" — blocos paramétricos reutilizáveis (como armários, painéis, bancadas)
editados em duas vistas sincronizadas: planta 2D e cena 3D. Feito com Vite + TypeScript + three.js.

## Rodar localmente

```sh
cd cad-editor
npm install
npm run dev
```

`npm run build` gera a versão de produção em `dist/`.

## O que dá para fazer

- **Módulos paramétricos**: criar caixas (largura/profundidade/altura/posição/rotação/cor),
  mover e redimensionar tanto na planta 2D (arrastar/handle de canto) quanto na cena 3D
  (gizmo de mover/girar/escalar) — as duas vistas ficam sempre sincronizadas.
- **Módulos mestres reutilizáveis**: transformar um módulo num "bloco" reutilizável; inserir
  novas instâncias e editar dimensões/cor de uma delas atualiza todas as instâncias vinculadas
  (equivalente a blocks do AutoCAD).
- **Importar**:
  - `.dxf` → entidades (linha, polilinha, círculo, arco) desenhadas como referência na planta 2D.
  - `.stl` / `.obj` / `.gltf` / `.glb` → malhas de referência na cena 3D.
  - `.step` / `.stp` / `.igs` / `.iges` → **experimental**, via [opencascade.js](https://github.com/donalffons/opencascade.js)
    (porta WebAssembly do kernel OpenCascade, ~65MB, carregado sob demanda só quando você importa
    um desses ficheiros). Funciona para sólidos simples; geometria muito complexa pode falhar —
    o erro aparece na barra de status em vez de travar a aplicação.
- **Exportar**: `.dxf` (módulos + paredes + cotas + referências), `.stl`/`.obj`/`.gltf` (módulos +
  paredes), ou `.json` (projeto completo, para reabrir depois).
- **Desfazer/Refazer**: `Ctrl+Z` / `Ctrl+Shift+Z`, ou os botões na toolbar. Cobre criação, edição,
  duplicação, exclusão, paredes, cotas e "Novo projeto" — uma arrastada inteira (mover/redimensionar
  em 2D, ou mover/girar/escalar em 3D) vira um único passo de desfazer. Não cobre geometria
  importada (DXF de referência, malhas), que fica fora do histórico por não ser serializável.
- **Ajustar à grade (snap)**: liga/desliga na toolbar — 5cm de posição/dimensão em 2D e 3D, 15° de
  rotação. Cotas e paredes também encaixam nos mesmos 5cm ao desenhar.
- **Paredes**: ferramenta "Parede" — clique para começar, clique de novo para terminar (encadeia
  automaticamente a próxima parede a partir do fim da anterior); `Esc` ou botão direito cancela.
  Aparecem como linha grossa em 2D e caixa extrudada em 3D.
- **Cotas**: ferramenta "Cota" — clique em dois pontos para medir a distância; desenha linha de
  cota com linhas de extensão e o valor em metros, sempre em 2D.
- **Excluir**: tecla `Delete`/`Backspace` com o módulo ou parede selecionado (ferramenta "Selecionar").
- **Projeto**: autosave no `localStorage` do navegador a cada edição (recarregar a página restaura
  o último estado); "Abrir projeto..." carrega um `.json` exportado anteriormente; "Novo projeto"
  limpa tudo (desfazível).
- **Biblioteca de módulos pré-definidos**: painel à esquerda com presets comuns de marcenaria
  (armário base 40/60/80, gaveteiro, armário aéreo, torre, bancada, porta, janela) — clique para
  inserir; inserções repetidas do mesmo preset reaproveitam o mesmo módulo mestre.

## O que NÃO dá para fazer (e por quê)

- **`.dwg` nativo não é suportado.** É um formato binário fechado da Autodesk; não existe biblioteca
  JS/WASM gratuita e confiável para lê-lo. Ao tentar importar um `.dwg`, a aplicação explica as
  alternativas: exportar como DXF a partir do AutoCAD/BricsCAD/LibreCAD, usar o conversor gratuito
  ODA File Converter, ou licenciar a SDK da Open Design Alliance para suporte nativo num backend.
- **STEP/IGES são "melhor esforço"**: a API do opencascade.js não tem tipos TypeScript publicados
  e cobre ~72% das classes do OpenCascade — geometrias avançadas (superfícies NURBS muito
  complexas, montagens grandes) podem não tesselar corretamente.

## Arquitetura

```
src/
  core/       Document.ts (fonte única de verdade: módulos, mestres, paredes, cotas, seleção,
              histórico de desfazer/refazer) + tipos + emissor de eventos
  view2d/     Canvas2D.ts — planta baixa (canvas 2D: pan/zoom/seleção/arraste/redimensionar,
              ferramentas de parede/cota, snap à grade)
  view3d/     Scene3D.ts — cena three.js (OrbitControls + TransformControls, snap, paredes extrudadas)
  io/         dxf.ts, mesh.ts, step.ts, dwg.ts — import/export por formato
  ui/         Toolbar.ts, ModuleList.ts, PropertiesPanel.ts, PresetLibrary.ts
```

As views 2D e 3D nunca se comunicam diretamente: ambas leem/escrevem no `CadDocument` e
re-renderizam a cada evento `change`/`selectionChange`. Isso é o que mantém uma edição em 3D
(ex: arrastar um módulo) refletida instantaneamente na planta 2D, e vice-versa.
