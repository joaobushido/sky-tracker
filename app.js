// ==========================================
// 1. CONFIGURAÇÃO FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAQfU4m4UAKmsq4QNdW__KPIIjNUT_HoI0",
    authDomain: "skytracker-6aada.firebaseapp.com",
    projectId: "skytracker-6aada",
    storageBucket: "skytracker-6aada.firebasestorage.app",
    messagingSenderId: "767894844971",
    appId: "1:767894844971:web:6800eafcf14f3b93dcdc6e"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// 2. ESTADOS
// ==========================================
let currentUserUID = null;
let userXP = 0;
let habitos = [];
let tarefas = [];
let treinos = [];
let financas = [];
let metas = [];
let meuGrafico;

// ==========================================
// 3. LOGIN & SINCRONIZAÇÃO
// ==========================================
document.getElementById('btn-login').addEventListener('click', () => {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => alert(e.message));
});

document.getElementById('btn-logout').addEventListener('click', () => { auth.signOut(); });

auth.onAuthStateChanged(user => {
    if (user) {
        currentUserUID = user.uid;
        document.getElementById('user-display-name').innerText = user.displayName || "Usuário";
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-main').style.display = 'flex';
        document.getElementById('dia-hoje').innerText = new Date().getDate();
        carregarNuvem(); 
    } else {
        currentUserUID = null;
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-main').style.display = 'none';
    }
});

function carregarNuvem() {
    db.collection("users_v10").doc(currentUserUID).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            userXP = data.userXP || 0;
            habitos = data.habitos || [];
            tarefas = data.tarefas || [];
            treinos = data.treinos || [];
            financas = data.financas || [];
            metas = data.metas || [];
            renderizarTudo();
        } else {
            salvarNuvem();
        }
    });
}

function salvarNuvem() {
    if (!currentUserUID) return;
    db.collection("users_v10").doc(currentUserUID).set({
        userXP, habitos, tarefas, treinos, financas, metas
    }, { merge: true });
}

function renderizarTudo() {
    renderHabitos();
    renderTarefas();
    renderTreinos();
    renderFinancas();
    renderMetas();
    atualizarXPVisual();
}

// ==========================================
// 4. XP E GAMIFICAÇÃO
// ==========================================
function darXP(valor) {
    userXP += valor;
    salvarNuvem();
    const toast = document.getElementById('toast-xp');
    toast.innerText = `+${valor} XP!`;
    toast.classList.add('show');
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.2 }, colors: ['#ffffff', '#00e676'] });
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function atualizarXPVisual() {
    const lvl = Math.floor(userXP / 1000) + 1;
    const rest = userXP % 1000;
    const lvlBadge = document.getElementById('user-level');
    if(lvlBadge) lvlBadge.innerText = lvl;
    
    const xpRest = document.getElementById('current-xp');
    if(xpRest) xpRest.innerText = rest;
    
    const xpFill = document.getElementById('xp-bar-fill');
    if(xpFill) xpFill.style.width = (rest / 10) + "%";
}

// ==========================================
// 5. NAVEGAÇÃO E MODAIS
// ==========================================
window.mudarAba = function(abaId, elemento) {
    document.querySelectorAll('.aba').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.nav-item-ios').forEach(n => n.classList.remove('active'));
    document.getElementById(`aba-${abaId}`).classList.add('active');
    if(elemento) elemento.classList.add('active');
}

window.abrirModal = (id) => document.getElementById(id).classList.add('active');
window.fecharModal = (id) => document.getElementById(id).classList.remove('active');

// ==========================================
// 6. LÓGICA DE CADA ABA
// ==========================================

/* --- HÁBITOS --- */
window.addHabito = () => {
    const nome = document.getElementById('inp-habito-nome').value;
    const cat = document.getElementById('inp-habito-cat').value || 'Geral';
    if(!nome) return;
    habitos.push({ texto: nome, categoria: cat, feito: false });
    document.getElementById('inp-habito-nome').value = '';
    fecharModal('modal-habito');
    salvarNuvem();
};

window.toggleHabito = (i) => {
    habitos[i].feito = !habitos[i].feito;
    if(habitos[i].feito) darXP(50);
    else { userXP -= 50; salvarNuvem(); }
};

window.removerHabito = (i) => { habitos.splice(i, 1); salvarNuvem(); };

function renderHabitos() {
    const lista = document.getElementById('lista-habitos');
    if(!lista) return;
    lista.innerHTML = '';
    let feitos = 0;

    habitos.forEach((h, i) => {
        if(h.feito) feitos++;
        lista.innerHTML += `
            <div class="habito-item">
                <div class="habito-check ${h.feito ? 'checked' : ''} click-pop" onclick="toggleHabito(${i})"></div>
                <div class="habito-info">
                    <p class="habito-title ${h.feito ? 'done' : ''}">${h.texto}</p>
                </div>
                <i class="fa-solid fa-trash text-dim click-pop" onclick="removerHabito(${i})" style="cursor:pointer; padding:5px;"></i>
            </div>
        `;
    });

    const scoreVisor = document.getElementById('habitos-score');
    if(scoreVisor) scoreVisor.innerText = `${feitos}/${habitos.length}`;
    
    // Gráfico minimalista
    if(!meuGrafico && document.getElementById('graficoProgresso')) {
        Chart.defaults.color = '#555'; Chart.defaults.font.family = 'Inter';
        meuGrafico = new Chart(document.getElementById('graficoProgresso').getContext('2d'), {
            type: 'line',
            data: { labels: ['S','T','Q','Q','S','S','H'], datasets: [{ data: [0,0,0,0,0,0,0], borderColor: '#fff', tension: 0.4, borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, border: {display:false} }, y: { display: false, max: 100 } }, elements: { point:{ radius: 0 } } }
        });
    }
    if(meuGrafico) {
        meuGrafico.data.datasets[0].data[6] = habitos.length ? (feitos/habitos.length)*100 : 0;
        meuGrafico.update('none');
    }
}

/* --- TAREFAS --- */
window.addTarefa = () => {
    const nome = document.getElementById('inp-tarefa-nome').value;
    if(!nome) return;
    tarefas.push({ nome, feito: false });
    document.getElementById('inp-tarefa-nome').value = '';
    fecharModal('modal-tarefa');
    salvarNuvem();
};
window.toggleTarefa = (i) => { tarefas[i].feito = !tarefas[i].feito; if(tarefas[i].feito) darXP(30); else { userXP-=30; salvarNuvem(); }};
window.removerTarefa = (i) => { tarefas.splice(i,1); salvarNuvem(); };

function renderTarefas() {
    const lista = document.getElementById('lista-tarefas');
    if(!lista) return;
    lista.innerHTML = '';
    tarefas.forEach((t, i) => {
        lista.innerHTML += `
            <div class="task-item">
                <div class="task-check ${t.feito ? 'checked' : ''} click-pop" onclick="toggleTarefa(${i})"></div>
                <div class="task-info ${t.feito ? 'done' : ''}"><p>${t.nome}</p></div>
                <i class="fa-solid fa-trash text-dim click-pop" onclick="removerTarefa(${i})" style="cursor:pointer; padding:5px;"></i>
            </div>
        `;
    });
}

/* --- TREINOS --- */
window.addTreino = () => {
    const nome = document.getElementById('inp-treino-nome').value;
    const series = document.getElementById('inp-treino-series').value;
    const kg = document.getElementById('inp-treino-kg').value;
    const reps = document.getElementById('inp-treino-reps').value;
    if(!nome) return;
    treinos.push({ nome, series, kg, reps });
    document.getElementById('inp-treino-nome').value = '';
    fecharModal('modal-treino');
    salvarNuvem();
};
window.removerTreino = (i) => { treinos.splice(i,1); salvarNuvem(); };

function renderTreinos() {
    const lista = document.getElementById('lista-treinos');
    if(!lista) return;
    lista.innerHTML = '';
    treinos.forEach((t, i) => {
        lista.innerHTML += `
            <div class="workout-card">
                <div class="workout-header">
                    <div class="workout-title"><div class="exercise-icon"></div><h3>${t.nome}</h3></div>
                    <i class="fa-solid fa-trash text-red click-pop" onclick="removerTreino(${i})" style="cursor:pointer; padding:5px;"></i>
                </div>
                <table class="workout-table">
                    <thead><tr><th>SÉRIE</th><th>KG</th><th>REPS</th></tr></thead>
                    <tbody><tr><td>${t.series}</td><td>${t.kg}</td><td>${t.reps}</td></tr></tbody>
                </table>
            </div>
        `;
    });
}

/* --- FINANÇAS (TOP GRID CALCULATION) --- */
const formataBRL = (v) => parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

window.addFinanca = (tipo) => {
    const desc = tipo === 'saida' ? document.getElementById('inp-gasto-desc').value : document.getElementById('inp-rec-desc').value;
    const valor = tipo === 'saida' ? document.getElementById('inp-gasto-valor').value : document.getElementById('inp-rec-valor').value;
    if(!desc || !valor) return;
    
    financas.push({ desc, valor: parseFloat(valor), tipo, data: Date.now() });
    
    document.getElementById(tipo === 'saida' ? 'inp-gasto-desc' : 'inp-rec-desc').value = '';
    document.getElementById(tipo === 'saida' ? 'inp-gasto-valor' : 'inp-rec-valor').value = '';

    fecharModal(`modal-fin-${tipo === 'saida' ? 'gasto' : 'receita'}`);
    if(tipo==='entrada') darXP(10);
    salvarNuvem();
};
window.removerFinanca = (i) => { financas.splice(i,1); salvarNuvem(); };

function renderFinancas() {
    const lista = document.getElementById('lista-financeiro');
    if(!lista) return;
    lista.innerHTML = '';
    let saldo = 0;
    let entrou = 0;
    let saiu = 0;

    financas.sort((a,b)=>b.data-a.data).forEach((f, i) => {
        if(f.tipo === 'entrada') {
            saldo += f.valor;
            entrou += f.valor;
        } else {
            saldo -= f.valor;
            saiu += f.valor;
        }
        const ehVerde = f.tipo === 'entrada';
        lista.innerHTML += `
            <div class="transacao-item">
                <div class="transacao-left">
                    <div class="trans-icon ${ehVerde ? 'green' : 'red'}"><i class="fa-solid ${ehVerde ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i></div>
                    <div class="trans-info"><p>${f.desc}</p><small>${new Date(f.data).toLocaleDateString()}</small></div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="trans-valor" style="color:${ehVerde ? 'var(--green)' : 'var(--red)'}">${ehVerde?'+':'-'}${formataBRL(f.valor)}</span>
                    <i class="fa-solid fa-trash text-dim click-pop" onclick="removerFinanca(${i})" style="cursor:pointer; padding:5px;"></i>
                </div>
            </div>
        `;
    });
    
    document.getElementById('fin-entrou').innerText = formataBRL(entrou);
    document.getElementById('fin-saiu').innerText = formataBRL(saiu);
    document.getElementById('saldo-total').innerText = formataBRL(saldo);
}

/* --- METAS --- */
window.addMeta = () => {
    const nome = document.getElementById('inp-meta-nome').value;
    const alvo = document.getElementById('inp-meta-alvo').value;
    if(!nome || !alvo) return;
    metas.push({ nome, alvo: parseFloat(alvo), atual: 0 });
    document.getElementById('inp-meta-nome').value = '';
    fecharModal('modal-meta');
    salvarNuvem();
};
window.addProgressoMeta = (i) => { metas[i].atual += 100; salvarNuvem(); darXP(20);}; 
window.removerMeta = (i) => { metas.splice(i,1); salvarNuvem(); };

function renderMetas() {
    const lista = document.getElementById('lista-metas');
    if(!lista) return;
    lista.innerHTML = '';
    metas.forEach((m, i) => {
        const porc = Math.min((m.atual / m.alvo) * 100, 100);
        lista.innerHTML += `
            <div class="meta-card-big">
                <div class="meta-img-bg" style="background:#222;">
                    <span class="meta-category" style="display:flex; justify-content:space-between; width:100%;">OBJETIVO <i class="fa-solid fa-trash click-pop" onclick="removerMeta(${i})" style="cursor:pointer; font-size:14px;"></i></span>
                    <h3>${m.nome}</h3>
                </div>
                <div class="meta-card-bottom">
                    <div class="progress-bar-thin"><div class="progress-fill-gold" style="width: ${porc}%;"></div></div>
                    <div class="meta-stats-row">
                        <p><strong>${formataBRL(m.atual)}</strong> / <br>${formataBRL(m.alvo)}</p>
                        <button class="click-pop" style="background:rgba(255,255,255,0.1); border:none; color:white; font-weight:bold; padding:8px 12px; border-radius:30px; cursor:pointer;" onclick="addProgressoMeta(${i})">+ Aportar</button>
                    </div>
                </div>
            </div>
        `;
    });
}

/* --- CHAT IA (SIMULADOR) --- */
window.setIaText = (txt) => document.getElementById('ia-input').value = txt;

window.enviarIA = () => {
    const input = document.getElementById('ia-input');
    const respBox = document.getElementById('ia-resposta');
    const btn = document.querySelector('.btn-send-ia i');
    const txt = input.value.toLowerCase();
    
    if(!txt) return;
    btn.className = "fa-solid fa-spinner fa-spin";
    respBox.style.display = "block";
    respBox.innerHTML = "<span class='text-dim'>Processando requisição...</span>";

    setTimeout(() => {
        btn.className = "fa-solid fa-arrow-up";
        if(txt.includes('resumo') || txt.includes('mes')) {
            respBox.innerHTML = `<strong>IA:</strong> Seu saldo livre hoje é de ${document.getElementById('saldo-total').innerText}. Entrou ${document.getElementById('fin-entrou').innerText} e você gastou ${document.getElementById('fin-saiu').innerText}.`;
        } else if(txt.includes('gastei') || txt.includes('almoço')) {
            respBox.innerHTML = `<strong>IA:</strong> Anotado! Sugiro abrir o painel de "Gasto" e lançar esse valor para manter o controle perfeito.`;
        } else {
            respBox.innerHTML = `<strong>IA:</strong> Compreendi. Fique à vontade para adicionar suas receitas ou despesas nos botões logo acima para eu ajudar a gerenciar.`;
        }
        input.value = '';
    }, 1500);
};
        
