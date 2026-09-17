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
- **Exportar**: `.dxf` (módulos + referências), `.stl`, `.obj`, `.gltf`, ou `.json` (projeto completo,
  para recarregar depois).

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
  core/       Document.ts (fonte única de verdade: módulos, mestres, seleção) + tipos + emissor de eventos
  view2d/     Canvas2D.ts — planta baixa (canvas 2D: pan/zoom/seleção/arraste/redimensionar)
  view3d/     Scene3D.ts — cena three.js (OrbitControls + TransformControls)
  io/         dxf.ts, mesh.ts, step.ts, dwg.ts — import/export por formato
  ui/         Toolbar.ts, ModuleList.ts, PropertiesPanel.ts
```

As views 2D e 3D nunca se comunicam diretamente: ambas leem/escrevem no `CadDocument` e
re-renderizam a cada evento `change`/`selectionChange`. Isso é o que mantém uma edição em 3D
(ex: arrastar um módulo) refletida instantaneamente na planta 2D, e vice-versa.
