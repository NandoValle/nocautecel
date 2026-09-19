// Montadores da arena: tudo que depende de QUAIS aparelhos estão na disputa.
// Usa as globais do script principal (aparelhos, CHAVES, P, criterios, cor, fotoDe, brl, fmt, dataBR, link, el, K, CHAO).

function htmlEsc(t){ return String(t).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]); }
// Campo que não consta na ficha (null) vira texto honesto, nunca "null g".
function pesoTxt(a){ return a.peso == null ? "peso não consta" : a.peso + " g"; }
function capTxt(it){ return it.gb == null ? null : it.gb >= 1024 ? fmt(it.gb / 1024) + " TB" : it.gb + " GB"; }
const tiraAcento = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function creditoFoto(a){
  const f = a.foto;
  if (!f) return "sem foto livre · silhueta em escala";
  if (f.tipo === "ia") return "Ilustração gerada por IA · confira o desenho e a cor na fonte oficial";
  return "foto " + f.autor + ", " + f.lic + (f.nota ? " · " + f.nota : "");
}

// Silhueta em escala para quem não tem foto livre: proporção das medidas oficiais.
function silhueta(k){
  const a = aparelhos[k], w = 60, h = Math.min(80, Math.round(w * a.alt / a.larg));
  return '<svg class="silhueta" viewBox="0 0 60 80" role="img" aria-label="Silhueta em escala do ' + htmlEsc(a.nome) + ', sem foto de licença livre">' +
    '<rect x="' + ((60 - Math.min(w, 80 * a.larg / a.alt)) / 2) + '" y="' + (80 - h) / 2 + '" width="' + Math.min(w, 80 * a.larg / a.alt) + '" height="' + h + '" rx="6"/>' +
    '<text x="30" y="44" text-anchor="middle" font-size="8">' + htmlEsc(a.sigla) + '</text></svg>';
}

// ---------- Seletor: 2 ou 3 do catálogo, ordenados do mais caro ao mais barato ----------
function montaCatalogo(aoMudar){
  const lista = document.getElementById("catalogo");
  if (!lista) return;
  lista.textContent = "";
  const chaves = Object.keys(aparelhos).filter(k => P.itens[k]).sort((a, b) => P.itens[b].preco - P.itens[a].preco);
  chaves.forEach(k => {
    const a = aparelhos[k], it = P.itens[k], li = document.createElement("li");
    const f = fotoDe(k);
    li.innerHTML = '<label class="opcao"><input type="checkbox" value="' + k + '">' +
      (f ? '<img class="mini-foto" src="' + f + '" alt="" loading="lazy" decoding="async" width="60" height="80">' : '<span class="mini-foto">' + silhueta(k) + '</span>') +
      '<span class="txt">' + htmlEsc(a.nome) + '<small>' + brl(it.preco) + (capTxt(it) ? ' · ' + capTxt(it) : '') +
      (it.suspeito ? ' · <em>preço suspeito</em>' : '') + (a.foto?.tipo === 'ia' ? ' · ilustração IA' : '') + '</small></span></label>';
    li.dataset.marca = a.marca;
    li.dataset.busca = tiraAcento(a.nome + " " + a.curto + " " + a.marca);
    lista.appendChild(li);
  });
  montaFiltro(lista, chaves);
  lista.addEventListener("change", ev => {
    const caixa = ev.target;
    if (!caixa.matches("input")) return;
    const marcados = [...lista.querySelectorAll("input:checked")].map(i => i.value);
    const aviso = document.getElementById("escolha-aviso");
    if (marcados.length < 2){
      caixa.checked = true;
      aviso.textContent = "A arena precisa de pelo menos 2 aparelhos. Marque outro antes de tirar este.";
      aviso.hidden = false;
      return;
    }
    aviso.hidden = true;
    aoMudar(marcados);
  });
}

// Com dezenas de aparelhos, a lista precisa de marca e busca. Os já escolhidos nunca somem.
let filtroMarca = "", filtroTexto = "";
function montaFiltro(lista, chaves){
  if (document.getElementById("catalogo-filtro")) return;
  const marcas = [...new Set(chaves.map(k => aparelhos[k].marca))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const box = document.createElement("div");
  box.id = "catalogo-filtro"; box.className = "filtro-cat";
  box.innerHTML = '<input type="search" placeholder="Buscar modelo (ex.: S25, g86, 17 Pro)" aria-label="Buscar modelo no catálogo" enterkeyhint="search">' +
    '<div class="marcas" role="group" aria-label="Filtrar por marca">' +
    [["", "Todas", chaves.length]].concat(marcas.map(m => [m, m, chaves.filter(k => aparelhos[k].marca === m).length]))
      .map(m => '<button type="button" data-marca="' + htmlEsc(m[0]) + '" aria-pressed="' + (m[0] === "" ? "true" : "false") + '">' + htmlEsc(m[1]) + ' <small>' + m[2] + '</small></button>').join("") +
    '</div><p class="conta" aria-live="polite"></p>';
  lista.parentNode.insertBefore(box, lista);
  box.querySelector("input").addEventListener("input", ev => { filtroTexto = tiraAcento(ev.target.value.trim()); aplicaFiltro(); });
  box.querySelector(".marcas").addEventListener("click", ev => {
    const b = ev.target.closest("button"); if (!b) return;
    filtroMarca = b.dataset.marca;
    box.querySelectorAll(".marcas button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    aplicaFiltro();
  });
  aplicaFiltro();
}
function aplicaFiltro(){
  const lista = document.getElementById("catalogo"), box = document.getElementById("catalogo-filtro");
  if (!lista || !box) return;
  const termos = filtroTexto.split(/\s+/).filter(Boolean);
  let vistos = 0;
  lista.querySelectorAll("li").forEach(li => {
    const escolhido = li.querySelector("input").checked;
    const passa = escolhido || ((!filtroMarca || li.dataset.marca === filtroMarca) && termos.every(t => li.dataset.busca.indexOf(t) >= 0));
    li.hidden = !passa;
    if (passa) vistos++;
  });
  box.querySelector(".conta").textContent = vistos + (vistos === 1 ? " aparelho na lista" : " aparelhos na lista") +
    (filtroMarca || termos.length ? " · os já escolhidos continuam visíveis" : " · do mais caro ao mais barato");
}

function marcaCatalogo(){
  const lista = document.getElementById("catalogo");
  if (!lista) return;
  lista.querySelectorAll("input").forEach(i => {
    const pos = CHAVES.indexOf(i.value);
    i.checked = pos >= 0;
    i.disabled = CHAVES.length >= 3 && pos < 0;
    i.closest(".opcao").className = "opcao" + (pos >= 0 ? " s" + pos : "");
  });
  aplicaFiltro();
  const resumo = document.getElementById("escolha-resumo");
  if (resumo) resumo.textContent = CHAVES.map(k => aparelhos[k].curto).join(" × ") + (CHAVES.length < 3 ? " · cabe mais 1" : "");
}

// ---------- Palco em escala: corpos gerados das medidas oficiais ----------
const FRACAO = {}, alturas = {};
const TEXTURA = {edge:1, pura:1, ultra:1};   // só esses têm o recorte "-corpo" feito rente ao aparelho

function desenhaPalco(){
  const g = document.getElementById("corpos"), tab = document.getElementById("tabela-palco");
  if (!g || !tab) return;
  g.textContent = ""; tab.textContent = "";
  const n = CHAVES.length, gap = 46;
  const larguras = CHAVES.map(k => aparelhos[k].larg * K);
  const prof = CHAVES.map(k => aparelhos[k].esp * 1.76);
  const total = larguras.reduce((s, w) => s + w, 0) + prof.reduce((s, d) => s + d, 0) + gap * (n - 1);
  let x = 512 - total / 2;
  const titulo = document.getElementById("palco-titulo");
  if (titulo) titulo.textContent = n === 2 ? "DOIS NA BALANÇA" : "TRÊS NA BALANÇA";

  CHAVES.forEach((k, i) => {
    const a = aparelhos[k], w = larguras[i], h = a.alt * K, d = prof[i], sk = d * .56, y = CHAO - h;
    const grupo = el("g", {class: "corpo s" + i});
    const cx = x + w / 2;
    const rot = (t, yy, cls, fs) => { const e = el("text", {x: cx, y: yy, "text-anchor": "middle", class: cls, "font-size": fs}); e.textContent = t; grupo.appendChild(e); };
    // Nome curto: com três aparelhos lado a lado, o nome completo invade o vizinho.
    rot(a.curto.toUpperCase(), y - 54, "rotulo-nome", 15);
    rot(fmt(a.alt) + " × " + fmt(a.larg) + " × " + fmt(a.esp) + " mm", y - 34, "rotulo-dado", 12);
    rot(pesoTxt(a) + (a.dobra ? " · dobrado" : ""), y - 16, "rotulo-dado", 12);
    grupo.appendChild(el("path", {class: "lado", d: "M" + (x + w) + " " + (y + 10) + " L" + (x + w + d) + " " + (y + 10 - sk) + " L" + (x + w + d) + " " + (CHAO - sk) + " L" + (x + w) + " " + CHAO + " Z"}));
    grupo.appendChild(el("path", {class: "lado", d: "M" + (x + 10) + " " + y + " L" + (x + 10 + d) + " " + (y - sk) + " L" + (x + w + d) + " " + (y - sk) + " L" + (x + w) + " " + y + " Z"}));
    grupo.appendChild(el("rect", {class: "face", x: x, y: y, width: w, height: h, rx: 14}));
    if (TEXTURA[k]){
      const clip = "c-" + k + "-" + i;
      const cp = el("clipPath", {id: clip}); cp.appendChild(el("rect", {x: x, y: y, width: w, height: h, rx: 14}));
      grupo.appendChild(cp);
      const gi = el("g", {"clip-path": "url(#" + clip + ")"});
      gi.appendChild(el("image", {href: "fotos/" + k + "-corpo.webp", x: x, y: y, width: w, height: h, preserveAspectRatio: "xMidYMid slice"}));
      grupo.appendChild(gi);
    }
    grupo.appendChild(el("rect", {class: "contorno", x: x, y: y, width: w, height: h, rx: 14}));
    g.appendChild(grupo);
    alturas[k] = -h;
    FRACAO[k] = cx / 1200;
    x += w + d + gap;
  });

  // Tabela à direita do palco
  const T = (t, xx, yy, extra) => { const e = el("text", Object.assign({x: xx, y: yy}, extra || {})); e.textContent = t; tab.appendChild(e); return e; };
  T("ESPECIFICAÇÕES COMPARATIVAS", 860, 336, {class: "tabela-t", "font-size": 13.5});
  tab.appendChild(el("line", {class: "tabela-linha", x1: 852, y1: 352, x2: 1188, y2: 352}));
  [["MODELO", 856, "start"], ["ALTURA", 1000, "end"], ["LARGURA", 1064, "end"], ["ESPESSURA", 1132, "end"], ["PESO", 1186, "end"]]
    .forEach(c => T(c[0], c[1], 376, {class: "tabela-cab", "font-size": 9.5, "text-anchor": c[2]}));
  tab.appendChild(el("line", {class: "tabela-linha", x1: 852, y1: 388, x2: 1188, y2: 388}));
  CHAVES.forEach((k, i) => {
    const a = aparelhos[k], yy = 418 + i * 44;
    T(a.curto.toUpperCase(), 856, yy, {class: "tabela-v", "font-size": 12, fill: ["#8CD8FF", "#FF6B86", "#C4A8FF"][i]});
    T(fmt(a.alt) + " mm", 1000, yy, {class: "tabela-v", "font-size": 12, "text-anchor": "end"});
    T(fmt(a.larg) + " mm", 1064, yy, {class: "tabela-v", "font-size": 12, "text-anchor": "end"});
    T(fmt(a.esp) + " mm", 1132, yy, {class: "tabela-v", "font-size": 12, "text-anchor": "end"});
    T(a.peso == null ? "—" : a.peso + " g", 1186, yy, {class: "tabela-v", "font-size": 12, "text-anchor": "end"});
    tab.appendChild(el("line", {class: "tabela-linha", x1: 852, y1: yy + 16, x2: 1188, y2: yy + 16}));
  });
  const yb = 418 + CHAVES.length * 44;
  T("Medidas declaradas pelo fabricante.", 856, yb, {class: "mono", "font-size": 11, fill: "#8494A5"});
  T("Nada foi medido em bancada. Dobráveis: dobrados.", 856, yb + 18, {class: "mono", "font-size": 11, fill: "#8494A5"});

  const svg = document.getElementById("palco-svg");
  if (svg) svg.setAttribute("aria-label", "Pesagem em escala: " + CHAVES.map(k => {
    const a = aparelhos[k]; return a.nome + ", " + fmt(a.alt) + " por " + fmt(a.larg) + " por " + fmt(a.esp) + " mm, " + pesoTxt(a);
  }).join("; ") + ".");
}

// ---------- Fita métrica: a ficha lado a lado ----------
function desenhaFita(){
  const t = document.getElementById("fita-tabela");
  if (!t) return;
  t.style.setProperty("--n", CHAVES.length);
  let h = '<div class="tl cab" role="row"><div role="columnheader"><span class="sr">Critério</span></div>' +
    CHAVES.map((k, i) => '<div class="s' + i + '" role="columnheader"><span class="lutador">' + htmlEsc(aparelhos[k].curto) + '</span></div>').join("") + '</div>';

  // Linha numérica: o melhor ganha a cor; os outros mostram a distância; sem dado não entra na conta.
  const num = (rot, sub, val, mostra, menor, unid, nota, grande) => {
    const vs = CHAVES.map(val), validos = vs.filter(v => v != null);
    const melhor = validos.length > 1 ? (menor ? Math.min(...validos) : Math.max(...validos)) : null;
    const teto = validos.length ? Math.max(...validos) : 0;
    h += '<div class="tl' + (grande ? ' grande' : '') + '" role="row"><div class="rot" role="rowheader">' + rot + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
    CHAVES.forEach((k, i) => {
      const v = vs[i], ganha = v != null && v === melhor;
      h += '<div class="v s' + i + (ganha ? ' ganha' : '') + (v == null ? ' sem' : '') + '" role="cell"><span class="val">' + (v == null ? 'não consta' : mostra(k)) + '</span>' +
        (v != null && melhor != null && v !== melhor ? '<span class="delta">' + (menor ? '+' : '−') + unid(Math.abs(v - melhor)) + '</span>' : '') +
        (nota && nota(k) ? '<span class="nota">' + htmlEsc(nota(k)) + '</span>' : '') +
        (v != null && teto ? '<i class="barra" style="--p:' + (v / teto * 100).toFixed(1) + '%"></i>' : '') +
        (ganha ? '<span class="sr">melhor nesta linha</span>' : '') + '</div>';
    });
    h += '</div>';
  };
  const txt = (rot, sub, f) => {
    h += '<div class="tl" role="row"><div class="rot" role="rowheader">' + rot + (sub ? '<small>' + sub + '</small>' : '') + '</div>' +
      CHAVES.map((k, i) => { const r = f(k); return '<div class="v s' + i + (r[1] || '') + '" role="cell"><span class="val">' + htmlEsc(r[0]) + '</span></div>'; }).join("") + '</div>';
  };

  num("Preço hoje", "Amazon · data em cada coluna", k => P.itens[k].preco, k => brl(P.itens[k].preco).replace(/,\d\d$/, ""), true, d => brl(d).replace(/,\d\d$/, ""),
      k => (P.itens[k].coleta || "coleta de " + dia(P.coletado_em)) + (P.itens[k].suspeito ? " · preço suspeito" : ""), true);
  num("Espessura", "menos é melhor · dobráveis dobrados", k => aparelhos[k].esp, k => fmt(aparelhos[k].esp) + " mm", true, d => fmt(Math.round(d * 100) / 100) + " mm");
  num("Peso", "menos é melhor", k => aparelhos[k].peso, k => aparelhos[k].peso + " g", true, d => d + " g");
  txt("Altura × largura", "dobráveis dobrados", k => [fmt(aparelhos[k].alt) + " × " + fmt(aparelhos[k].larg) + " mm"]);
  txt("Tela", null, k => aparelhos[k].tela ? [aparelhos[k].tela] : ["não consta na ficha", " sem"]);
  num("Capacidade da bateria", "declarada pelo fabricante · não é autonomia medida", k => aparelhos[k].bateria, k => fmt(aparelhos[k].bateria) + " mAh", false, d => fmt(d) + " mAh", k => aparelhos[k].batNota);
  num("Câmera principal", "resolução declarada", k => aparelhos[k].cam, k => aparelhos[k].cam + " MP", false, d => d + " MP");
  num("Zoom óptico", 'o que o fabricante chama de óptico', k => aparelhos[k].zoom, k => aparelhos[k].zoom === 0 ? "sem tele" : fmt(aparelhos[k].zoom) + "x", false, d => fmt(d) + "x", k => aparelhos[k].zoomTxt);
  txt("5G", null, k => aparelhos[k].g5 === true ? ["sim", " ganha"] : aparelhos[k].g5 === false ? ["não", " sem"] : ["não consta na ficha", " sem"]);
  txt("Loja de apps", null, k => aparelhos[k].loja === "google" ? ["Google Play", " ganha"] : aparelhos[k].loja === "apple" ? ["App Store", " ganha"] : aparelhos[k].loja === false ? ["sem Google Play", " sem"] : ["não consta na ficha", " sem"]);
  if (CHAVES.some(k => aparelhos[k].dobra)) txt("Dobrável", null, k => aparelhos[k].dobra ? [aparelhos[k].dobra] : ["não", " sem"]);
  t.innerHTML = h;
}

// ---------- O que a ficha não mostra ----------
function desenhaReplay(){
  const t = document.getElementById("replay-tabela");
  if (!t) return;
  t.style.setProperty("--n", CHAVES.length);
  let h = '<div class="tl cab" role="row"><div role="columnheader"><span class="sr">Fato</span></div>' +
    CHAVES.map((k, i) => '<div class="s' + i + '" role="columnheader"><span class="lutador">' + htmlEsc(aparelhos[k].curto) + '</span></div>').join("") + '</div>';
  const linha = (rot, sub, f) => {
    h += '<div class="tl grande" role="row"><div class="rot" role="rowheader">' + rot + '<small>' + sub + '</small></div>' +
      CHAVES.map((k, i) => { const r = f(k); return '<div class="v s' + i + (r ? '' : ' sem') + '" role="cell"><span class="val">' + (r ? htmlEsc(r[0]) : 'sem dado') + '</span>' + (r && r[1] ? '<span class="nota">' + htmlEsc(r[1]) + '</span>' : '') + '</div>'; }).join("") + '</div>';
  };
  linha("Autonomia medida", "Tom's Guide · navegação web", k => k === "edge" ? ["12h38", "o S25 Ultra fez 17h14 no mesmo teste"] : null);
  linha("Vídeo, segundo o fabricante", "horas declaradas · não é teste independente", k => {
    const m = /até (\d+) h de vídeo/.exec(aparelhos[k].batNota || ""); return m ? [m[1] + " h", "declarado pela Apple"] : null;
  });
  linha("Segurança garantida até", "ficha oficial", k => aparelhos[k].seg ? [dataBR(aparelhos[k].seg), "período de atualizações de segurança"] : null);
  t.innerHTML = h;
}

// ---------- Bilheteria ----------
function desenhaBilheteria(){
  const t = document.getElementById("bilheteria-lista");
  if (!t) return;
  t.innerHTML = CHAVES.map((k, i) => {
    const a = aparelhos[k], it = P.itens[k];
    const cap = capTxt(it) || "capacidade não conferida";
    return '<article class="ingresso s' + i + '"><h3>' + htmlEsc(a.nome) + '</h3><p class="obs">' + cap + ' · ' + htmlEsc(it.condicao || "") +
      (it.suspeito ? '<span class="suspeito">⚠ ' + htmlEsc(it.suspeito) + '</span>' : '') + '</p>' +
      '<div class="preco">' + brl(it.preco) + '<small>' + htmlEsc(it.coleta || "coleta de " + dia(P.coletado_em)) + '</small></div>' +
      '<a class="comprar" href="' + link(k) + '" target="_blank" rel="noopener sponsored nofollow">Ver na Amazon</a></article>';
  }).join("");
}

// ---------- Laudo: fontes e fotos só dos que estão na arena ----------
function desenhaLaudo(){
  const fontes = document.getElementById("laudo-fontes"), fotos = document.getElementById("laudo-fotos");
  if (fontes) fontes.innerHTML = CHAVES.map(k => htmlEsc(aparelhos[k].nome) + ': <a href="' + aparelhos[k].fonte.url + '" rel="noopener" target="_blank">ficha oficial</a> (acesso ' + aparelhos[k].fonte.acesso + ')').join(" · ") +
    (CHAVES.indexOf("edge") >= 0 ? " · Tom's Guide, \"Galaxy S25 Edge battery life tested\" (acesso 11/09/2026)" : "");
  if (fotos) fotos.innerHTML = CHAVES.map(k => {
    const f = aparelhos[k].foto;
    if (!f) return htmlEsc(aparelhos[k].nome) + ": sem foto de licença livre — silhueta desenhada a partir das medidas oficiais";
    if (f.tipo === "ia") return htmlEsc(aparelhos[k].nome) + ": ilustração gerada por IA (OpenAI), não é fotografia oficial. Confira o desenho e a cor na fonte do fabricante";
    return htmlEsc(aparelhos[k].nome) + ": " + htmlEsc(f.autor) + ', <a href="https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(f.arquivo) + '" rel="noopener" target="_blank">arquivo</a>, ' + htmlEsc(f.lic) + (f.nota ? " (" + htmlEsc(f.nota) + ")" : "");
  }).join(" · ") + ". Fotografias de terceiros: via Wikimedia Commons, sob a licença indicada em cada original. Ilustrações por IA: identificadas separadamente.";
}

// ---------- Laudo em texto ----------
function textoPesagem(){
  const col = (t, n) => (String(t) + " ".repeat(n)).slice(0, n);
  const L = ["NOCAUTECEL · LAUDO DA DISPUTA", "Arena: " + CHAVES.map(k => aparelhos[k].nome).join(" × "),
    "Método: fichas oficiais comparadas, sem medição em bancada. Não somos laboratório acreditado.", ""];
  const lin = (rot, f) => L.push(col(rot, 22) + CHAVES.map(k => col(f(k), 26)).join(""));
  lin("", k => aparelhos[k].curto);
  lin("Preço (Amazon)", k => brl(P.itens[k].preco) + (P.itens[k].suspeito ? " (!)" : ""));
  lin("Coleta", k => P.itens[k].coleta || dia(P.coletado_em));
  lin("A x L x E (mm)", k => fmt(aparelhos[k].alt) + "x" + fmt(aparelhos[k].larg) + "x" + fmt(aparelhos[k].esp));
  lin("Peso", k => pesoTxt(aparelhos[k]));
  lin("Tela", k => aparelhos[k].tela || "não consta");
  lin("Bateria", k => aparelhos[k].bateria == null ? "sem mAh declarado" : fmt(aparelhos[k].bateria) + " mAh");
  lin("Câmera principal", k => aparelhos[k].cam == null ? "não consta" : aparelhos[k].cam + " MP");
  lin("Zoom óptico", k => aparelhos[k].zoom == null ? "não consta" : aparelhos[k].zoom + "x");
  lin("5G", k => aparelhos[k].g5 === true ? "sim" : aparelhos[k].g5 === false ? "não" : "não consta");
  lin("Segurança até", k => aparelhos[k].seg ? dataBR(aparelhos[k].seg) : "não consta");
  L.push("", "Fontes:");
  CHAVES.forEach(k => L.push("- " + aparelhos[k].nome + ": " + aparelhos[k].fonte.url + " (acesso " + aparelhos[k].fonte.acesso + ")"));
  L.push("", "(!) preço acima de modelo mais novo e mais completo da mesma marca: conferir o vendedor.", "Preço muda todo dia. Confira na loja antes de pagar.");
  return L.join("\r\n");
}
