// NAMESPACE ENTERPRISE
window.EstoqueApp = window.EstoqueApp || {};

(function(App) {
    // --- 1. CONFIGURAÇÕES E CONSTANTES ---
    App.Config = {
        key: "estoqueDados_v4_categorias",
        keyOcultos: "itensOcultosPadrao_v4",
        keyMeus: "meusItensPadrao_v4",
        mapaCategorias: {
            'temperos': ['orégano', 'pimenta', 'canela', 'colorau', 'caldo', 'tempero', 'ervas', 'salsa', 'cebolinha', 'cominho', 'açafrão', 'páprica', 'curry'],
            'limpeza': ['detergente', 'sabão', 'esponja', 'água sanitária', 'desinfetante', 'papel', 'saco', 'lixo', 'bucha', 'álcool', 'limpador', 'multiuso', 'pano', 'vassoura'],
            'carnes': ['carne', 'frango', 'bacon', 'calabresa', 'presunto', 'peixe', 'hamburguer', 'linguiça', 'strogonoff', 'costela', 'bife'],
            'laticinios': ['queijo', 'mussarela', 'cheddar', 'requeijão', 'catupiry', 'leite', 'manteiga', 'iogurte', 'creme de leite', 'parmesão', 'provolone', 'gorgonzola'],
            'hortifruti': ['tomate', 'cebola', 'alho', 'batata', 'banana', 'limão', 'alface', 'rúcula', 'manjericão', 'pimentão', 'cenoura', 'azeitona', 'milho', 'ervilha', 'palmito', 'cogumelo', 'champignon', 'fruta', 'abacaxi', 'uva'],
            'mercearia': ['arroz', 'feijão', 'trigo', 'farinha', 'açúcar', 'sal', 'macarrão', 'óleo', 'azeite', 'fermento', 'fubá', 'molho', 'extrato', 'passata', 'ketchup', 'maionese', 'mostarda', 'chocolate', 'café', 'pão'],
            'bebidas': ['refrigerante', 'coca', 'guaraná', 'suco', 'água', 'cerveja', 'vinho', 'vodka', 'whisky', 'gelo', 'polpa'],
            'embalagens': ['caixa', 'sacola', 'plástico', 'filme', 'alumínio', 'isopor', 'guardanapo', 'canudo', 'copo']
        },
        cores: { 'carnes': '#ef4444', 'laticinios': '#fbbf24', 'hortifruti': '#10b981', 'mercearia': '#8b5cf6', 'temperos': '#f43f5e', 'limpeza': '#3b82f6', 'bebidas': '#06b6d4', 'embalagens': '#6b7280', 'outros': '#444' },
        nomes: { 'carnes': '🥩 CARNES & FRIOS', 'laticinios': '🧀 LATICÍNIOS', 'hortifruti': '🥦 HORTIFRUTI', 'mercearia': '🍝 MERCEARIA', 'temperos': '🧂 TEMPEROS', 'limpeza': '🧽 LIMPEZA', 'bebidas': '🥤 BEBIDAS', 'embalagens': '📦 EMBALAGENS', 'outros': '📦 OUTROS' }
    };

    // --- 2. UTILITÁRIOS (Helpers) ---
    App.Helpers = {
        vibrar: () => { if (navigator.vibrate) navigator.vibrate(15); },
        toast: (msg) => {
            const t = document.getElementById("toast-container");
            const x = document.createElement("div"); x.className = "toast"; x.innerText = msg;
            t.appendChild(x); setTimeout(() => x.remove(), 3000);
        },
        limparCampo: (id) => { document.getElementById(id).value = ""; if(id === 'filtroBusca') App.Inventory.filtrar(); },
        getCategoria: (nomeItem) => {
            let nome = nomeItem.toLowerCase();
            for(let cat in App.Config.mapaCategorias) { if(App.Config.mapaCategorias[cat].some(t => nome.includes(t))) return cat; }
            return 'outros';
        }
    };

    // --- 3. RECONHECIMENTO DE VOZ ---
    App.Voice = {
        recognition: null, isRecording: false, activeField: null,
        init: () => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                App.Voice.recognition = new SpeechRecognition();
                App.Voice.recognition.lang = 'pt-BR';
                App.Voice.recognition.onstart = () => {
                    App.Voice.isRecording = true;
                    if (App.Voice.activeField === 'produto') { document.getElementById('btn-mic-prod').classList.add('ouvindo'); }
                    else if (App.Voice.activeField === 'busca') { document.getElementById('btn-mic-busca').classList.add('ouvindo'); }
                };
                App.Voice.recognition.onend = () => {
                    App.Voice.isRecording = false;
                    document.getElementById('btn-mic-prod').classList.remove('ouvindo');
                    document.getElementById('btn-mic-busca').classList.remove('ouvindo');
                    if(App.Voice.activeField === 'produto') App.Inventory.autoPreencher();
                    App.Voice.activeField = null;
                };
                App.Voice.recognition.onresult = (e) => {
                    let text = ''; for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
                    text = text.replace(/\.$/, '');
                    if (App.Voice.activeField === 'produto') { document.getElementById('novoProduto').value = text; }
                    else if (App.Voice.activeField === 'busca') { document.getElementById('filtroBusca').value = text; App.Inventory.filtrar(); }
                };
            }
        },
        toggle: (campo, event) => {
            if(event) event.stopPropagation(); App.Helpers.vibrar();
            if (!App.Voice.recognition) return App.Helpers.toast("Voz não suportada.");
            if (App.Voice.isRecording) { App.Voice.recognition.stop(); } 
            else { App.Voice.activeField = campo; try { App.Voice.recognition.start(); } catch(e) { App.Voice.recognition.stop(); } }
        }
    };

    // --- 4. GESTÃO DO ESTOQUE (DOM E DADOS) ---
    App.Inventory = {
        renderizar: (dados) => {
            const container = document.getElementById("lista-itens-container"); container.innerHTML = "";
            let grupos = { carnes:[], laticinios:[], hortifruti:[], mercearia:[], temperos:[], limpeza:[], bebidas:[], embalagens:[], outros:[] };
            dados.forEach(item => { grupos[App.Helpers.getCategoria(item.n)].push(item); });
            for(let cat in grupos) {
                if(grupos[cat].length > 0) {
                    let h = document.createElement("tr"); h.className = "categoria-header-row";
                    h.innerHTML = `<td colspan="4" class="categoria-header" style="background:${App.Config.cores[cat]}">${App.Config.nomes[cat]}</td>`;
                    container.appendChild(h);
                    grupos[cat].sort((a,b) => a.n.localeCompare(b.n)).forEach(item => {
                        let tr = document.createElement("tr"); if(item.c) tr.classList.add("linha-marcada");
                        tr.innerHTML = `<td><input type="checkbox" onchange="EstoqueApp.Inventory.checkLine(this)" ${item.c?'checked':''}></td><td><span class="nome-prod" contenteditable="true" onblur="EstoqueApp.Inventory.salvar()">${item.n}</span></td><td><input type="text" class="input-qtd-tabela" value="${item.q}" onclick="EstoqueApp.Calc.abrir(this)" readonly></td><td><select onchange="EstoqueApp.Inventory.salvar()"><option value="kg" ${item.u==='kg'?'selected':''}>kg</option><option value="g" ${item.u==='g'?'selected':''}>g</option><option value="uni" ${item.u==='uni'?'selected':''}>uni</option><option value="pct" ${item.u==='pct'?'selected':''}>pct</option><option value="cx" ${item.u==='cx'?'selected':''}>cx</option><option value="bld" ${item.u==='bld'?'selected':''}>bld</option><option value="crt" ${item.u==='crt'?'selected':''}>crt</option></select></td>`;
                        container.appendChild(tr);
                    });
                }
            }
            App.Inventory.atualizarDropdown();
        },
        salvar: () => {
            let d = [];
            document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => {
                d.push({ n: r.querySelector(".nome-prod").innerText.trim(), q: r.querySelector(".input-qtd-tabela").value, u: r.querySelector("select").value, c: r.querySelector("input").checked });
            });
            localStorage.setItem(App.Config.key, JSON.stringify(d));
            App.UI.atualizarPainelCompras();
            const s = document.getElementById("status-save"); s.style.opacity = "1"; setTimeout(() => s.style.opacity = "0", 1500);
        },
        checkLine: (box) => { App.Helpers.vibrar(); box.closest('tr').classList.toggle('linha-marcada', box.checked); App.Inventory.salvar(); },
        alternarTodos: (masterBox) => { App.Helpers.vibrar(); document.querySelectorAll("#lista-itens-container input[type='checkbox']").forEach(b => { b.checked = masterBox.checked; App.Inventory.checkLine(b); }); },
        autoPreencher: () => {
            let n = document.getElementById("novoProduto").value.toLowerCase().trim();
            let match = window.produtosPadrao.find(p => p.split("|")[0].toLowerCase().startsWith(n));
            if(match) document.getElementById("novoUnidade").value = match.split("|")[1];
        },
        adicionar: (fixar) => {
            let n = document.getElementById("novoProduto").value.trim(); if(!n) return; App.Helpers.vibrar();
            let dados = JSON.parse(localStorage.getItem(App.Config.key) || "[]");
            dados.push({ n: n, q: document.getElementById("novoQtd").value.trim(), u: document.getElementById("novoUnidade").value, c: false });
            App.Inventory.renderizar(dados); App.Inventory.salvar();
            if(fixar) { let favs = JSON.parse(localStorage.getItem(App.Config.keyMeus) || "[]"); favs.push({n:n, u:document.getElementById("novoUnidade").value}); localStorage.setItem(App.Config.keyMeus, JSON.stringify(favs)); App.Helpers.toast("Fixado ⭐"); }
            document.getElementById("novoProduto").value = ""; document.getElementById("novoQtd").value = "";
        },
        removerDoPadrao: () => {
            let p = document.getElementById("novoProduto").value.trim(); if(!p) return;
            document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => { if(r.querySelector(".nome-prod").innerText.toLowerCase() === p.toLowerCase()) r.remove(); });
            App.Inventory.salvar(); document.getElementById("novoProduto").value = ""; App.Inventory.atualizarDropdown();
        },
        filtrar: () => {
            let b = document.getElementById("filtroBusca").value.toLowerCase(), s = document.getElementById("filtroSelect").value.toLowerCase();
            document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => {
                let nome = r.querySelector(".nome-prod").innerText.toLowerCase();
                r.style.display = (nome.includes(b) && (s === "" || nome === s)) ? "" : "none";
            });
            document.querySelectorAll(".categoria-header-row").forEach(h => {
                let next = h.nextElementSibling, vis = false;
                while(next && !next.classList.contains("categoria-header-row")) { if(next.style.display !== "none") vis = true; next = next.nextElementSibling; }
                h.style.display = vis ? "" : "none";
            });
        },
        atualizarDropdown: () => {
            let v = document.getElementById("filtroSelect").value;
            let sel = document.getElementById("filtroSelect"); sel.innerHTML = '<option value="">📂 ITENS</option>';
            Array.from(document.querySelectorAll(".nome-prod")).map(td => td.innerText.trim()).sort().forEach(n => { let o = document.createElement("option"); o.value = n; o.text = n; sel.add(o); });
            sel.value = v;
        },
        novoDia: () => {
            if(confirm("Zerar as quantidades?")) {
                let d = JSON.parse(localStorage.getItem(App.Config.key)); d.forEach(i => { i.q = ""; i.c = false; });
                localStorage.setItem(App.Config.key, JSON.stringify(d)); location.reload();
            }
        }
    };

    // --- 5. CALCULADORA ---
    App.Calc = {
        inputAtual: null, expr: "", swipedRow: null,
        abrir: (el) => { if(App.Calc.swipedRow) return; App.Helpers.vibrar(); App.Calc.inputAtual = el; document.getElementById("modal-calc").style.display = "flex"; App.Calc.expr = el.value.replace(',','.'); document.getElementById("calc-display").innerText = App.Calc.expr || "0"; },
        fechar: () => document.getElementById("modal-calc").style.display = "none",
        digitar: (d) => { App.Helpers.vibrar(); if(d==='C') App.Calc.expr = ""; else if(d==='BACK') App.Calc.expr = App.Calc.expr.slice(0,-1); else App.Calc.expr += d.replace(',','.'); document.getElementById("calc-display").innerText = App.Calc.expr || "0"; },
        salvar: () => { try { let r = eval(App.Calc.expr.replace(/×/g,'*').replace(/÷/g,'/')); App.Calc.inputAtual.value = (Math.round(r*100)/100).toString().replace('.',','); App.Inventory.salvar(); App.Calc.fechar(); App.Helpers.toast("Qtd Salva ✅"); } catch(e){ document.getElementById("calc-display").innerText = "Erro"; } }
    };

    // --- 6. INTERFACE E EXPORTAÇÃO ---
    App.UI = {
        toggleBusca: (e) => { if(e) e.stopPropagation(); App.Helpers.vibrar(); let o = document.getElementById("search-overlay"); o.style.display = o.style.display==='none'?'block':'none'; if(o.style.display==='block') document.getElementById("filtroBusca").focus(); },
        alternarTabela: () => { App.Helpers.vibrar(); let t = document.querySelector(".table-wrapper"); t.style.display = t.style.display==='none'?'block':'none'; },
        alternarTema: () => { App.Helpers.vibrar(); document.body.classList.toggle('light-mode'); },
        atualizarPainelCompras: () => {
            let ul = document.getElementById("lista-compras-visual"); ul.innerHTML = ""; let tem = false;
            document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => { if(r.querySelector("input[type='checkbox']").checked) { tem = true; let li = document.createElement("li"); li.innerText = "• " + r.querySelector(".nome-prod").innerText.trim(); ul.appendChild(li); } });
            document.getElementById("area-compras").style.display = tem ? "block" : "none";
        }
    };

    App.Export = {
        textoEstoque: () => {
            let t = "*ESTOQUE " + new Date().toLocaleDateString() + "*\n\n", itens = [];
            document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => { let c = r.querySelectorAll("td"); itens.push(`${c[1].innerText.trim()}: ${c[2].querySelector("input").value.trim() || "   "} ${c[3].querySelector("select").options[c[3].querySelector("select").selectedIndex].text}`); });
            itens.sort().forEach(i => t += i + "\n"); return t;
        },
        textoCompras: () => {
            let t = "*LISTA DE COMPRAS*\n\n", itens = [];
            document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => { if(r.querySelector("input[type='checkbox']").checked) itens.push("• " + r.querySelector(".nome-prod").innerText.trim()); });
            itens.sort().forEach(i => t += i + "\n"); return t;
        },
        zapEstoque: () => window.open("https://wa.me/?text=" + encodeURIComponent(App.Export.textoEstoque())),
        zapCompras: () => window.open("https://wa.me/?text=" + encodeURIComponent(App.Export.textoCompras())),
        copiarEstoque: () => navigator.clipboard.writeText(App.Export.textoEstoque()).then(() => App.Helpers.toast("Copiado!")),
        copiarCompras: () => navigator.clipboard.writeText(App.Export.textoCompras()).then(() => App.Helpers.toast("Copiado!"))
    };

    // --- 7. ARMAZENAMENTO E BACKUP ---
    App.Storage = {
        salvarNoCelular: () => { let b = new Blob([localStorage.getItem(App.Config.key)], { type: "application/json" }); let a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "estoque_backup.json"; a.click(); },
        carregarDoCelular: (e) => { let f = e.target.files[0]; let r = new FileReader(); r.onload = (ev) => { localStorage.setItem(App.Config.key, ev.target.result); location.reload(); }; r.readAsText(f); },
        resetarFabrica: () => { if(confirm("Restaurar padrão fábrica?")) { localStorage.clear(); location.reload(); } }
    };

    // --- 8. INICIALIZAÇÃO E SWIPE ---
    App.boot = () => {
        // Inicializa Dados
        let s = localStorage.getItem(App.Config.key);
        if(s) { App.Inventory.renderizar(JSON.parse(s)); } 
        else { let d = window.produtosPadrao.map(p => { let x = p.split('|'); return {n:x[0], q:"", u:x[1], c:false}; }); App.Inventory.renderizar(d); }
        
        App.Voice.init();

        // Inicializa Swipe (Seguro para Scroll IOS)
        let startX = 0, currentX = 0, isSwiping = false, justSwiped = false;
        const cont = document.getElementById("lista-itens-container"), bg = document.getElementById("swipe-bg");
        cont.addEventListener('touchstart', e => {
            let tr = e.target.closest('tr'); if (!tr || tr.classList.contains('categoria-header-row') || e.target.tagName==='INPUT') return;
            if (App.Calc.swipedRow && App.Calc.swipedRow !== tr) { App.Calc.swipedRow.style.transform = `translateX(0px)`; bg.style.display='none'; App.Calc.swipedRow = null; }
            startX = e.touches[0].clientX; isSwiping = false; justSwiped = false;
            currentX = (App.Calc.swipedRow === tr) ? -80 : 0; tr.style.transition = 'none';
        }, {passive: true});
        cont.addEventListener('touchmove', e => {
            let tr = e.target.closest('tr'); if (!tr || tr.classList.contains('categoria-header-row') || e.target.tagName==='INPUT') return;
            let diffX = e.touches[0].clientX - startX;
            if (!isSwiping && Math.abs(diffX) > 15) isSwiping = true;
            if (isSwiping) { e.preventDefault(); justSwiped = true; bg.style.display = 'flex'; bg.style.top = tr.offsetTop + 'px'; bg.style.height = tr.offsetHeight + 'px'; let moveX = currentX + diffX; if (moveX > 0) moveX = 0; if (moveX < -100) moveX = -100; tr.style.transform = `translateX(${moveX}px)`; }
        }, {passive: false}); // passive false AQUI é crucial pro iPhone
        cont.addEventListener('touchend', e => {
            let tr = e.target.closest('tr'); if (!tr || tr.classList.contains('categoria-header-row')) return;
            if (isSwiping) {
                let diffX = e.changedTouches[0].clientX - startX; let finalX = currentX + diffX; tr.style.transition = 'transform 0.3s';
                if (finalX < -40) { tr.style.transform = `translateX(-80px)`; App.Calc.swipedRow = tr; bg.onclick = () => { tr.remove(); App.Inventory.salvar(); App.Inventory.atualizarDropdown(); bg.style.display = 'none'; App.Calc.swipedRow = null; App.Helpers.toast("Removido 🗑️"); }; } 
                else { tr.style.transform = `translateX(0px)`; setTimeout(()=> bg.style.display='none', 300); App.Calc.swipedRow = null; }
                setTimeout(() => justSwiped = false, 300);
            }
        });
        
        // Teste de Integração Automático
        setTimeout(() => {
            if(window.produtosPadrao) App.Helpers.toast("SISTEMA V4.7 ENTERPRISE OK ✅");
            else alert("Erro Crítico: produtos.js não carregou.");
        }, 1000);
    };

})(window.EstoqueApp);

// Gatilho de Partida
document.addEventListener('DOMContentLoaded', window.EstoqueApp.boot);
