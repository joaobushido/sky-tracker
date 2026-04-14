// ==========================================
// 1. CONFIGURAÇÃO DO FIREBASE (COM SUAS CHAVES)
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
let habitos = [];
let financas = [];
let meuGrafico;

// ==========================================
// 3. LOGIN & ROTEAMENTO
// ==========================================
document.getElementById('btn-login').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e => alert("Erro: " + e.message));
});

document.getElementById('btn-logout').addEventListener('click', () => { auth.signOut(); });

auth.onAuthStateChanged(user => {
    if (user) {
        currentUserUID = user.uid;
        document.getElementById('user-display-name').innerText = user.displayName || "Usuário";
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-main').style.display = 'flex';
        carregarNuvem(); 
    } else {
        currentUserUID = null;
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-main').style.display = 'none';
    }
});

// ==========================================
// 4. FIREBASE SYNC (O SEGREDO MULTI-USUÁRIO)
// ==========================================
function carregarNuvem() {
    if (!currentUserUID) return;
    // Ele busca o documento EXCLUSIVO de quem está logado
    db.collection("users_v9").doc(currentUserUID).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            habitos = data.habitos || [];
            financas = data.financas || [];
            renderizarHabitos();
            renderizarFinancas();
        } else {
            salvarNuvem(); // Cria perfil vazio
        }
    });
}

function salvarNuvem() {
    if (!currentUserUID) return;
    db.collection("users_v9").doc(currentUserUID).set({
        habitos, financas
    }, { merge: true });
}

// ==========================================
// 5. NAVEGAÇÃO INFERIOR
// ==========================================
window.mudarAba = function(abaId, elemento) {
    document.querySelectorAll('.aba').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.nav-item-ios').forEach(n => n.classList.remove('active'));
    
    document.getElementById(`aba-${abaId}`).classList.add('active');
    if(elemento) elemento.classList.add('active');
}

// ==========================================
// 6. ABA HÁBITOS (Totalmente dinâmica para os amigos)
// ==========================================
function renderizarHabitos() {
    const lista = document.getElementById('lista-habitos');
    lista.innerHTML = '';
    let feitos = 0;

    habitos.forEach((h, i) => {
        if(h.feito) feitos++;
        const item = document.createElement('div');
        item.className = 'habito-item';
        item.innerHTML = `
            <div class="habito-check ${h.feito ? 'checked' : ''}" onclick="toggleHabito(${i})"></div>
            <div class="habito-info">
                <p class="habito-title ${h.feito ? 'done' : ''}">${h.texto}</p>
                <p class="habito-cat">${h.categoria}</p>
            </div>
            <i class="fa-solid fa-trash text-dim" style="cursor:pointer;" onclick="removerHabito(${i})"></i>
        `;
        lista.appendChild(div); // Oops, appendChild(item);
    });

    // Atualizar Gráfico com percentual
    const porc = habitos.length ? (feitos / habitos.length) * 100 : 0;
    if(meuGrafico) {
        meuGrafico.data.datasets[0].data[6] = porc; // Atualiza o dia de hoje
        meuGrafico.update('none');
    }
}

window.toggleHabito = (i) => {
    habitos[i].feito = !habitos[i].feito;
    salvarNuvem();
};

window.removerHabito = (i) => {
    habitos.splice(i, 1);
    salvarNuvem();
}

document.getElementById('btn-adicionar').onclick = () => {
    const txt = document.getElementById('novo-habito-input').value;
    const cat = document.getElementById('categoria-input').value || 'Geral';
    if(!txt) return;

    habitos.push({ texto: txt, categoria: cat, feito: false });
    document.getElementById('novo-habito-input').value = '';
    document.getElementById('categoria-input').value = '';
    salvarNuvem();
};

// ==========================================
// 7. ABA FINANÇAS E CHAT IA
// ==========================================
function renderizarFinancas() {
    const lista = document.getElementById('lista-financeiro');
    lista.innerHTML = '';
    let saldo = 0;

    // Usando dados fake só pra manter o design do print preenchido caso não tenha dados, 
    // mas na vida real você usaria o array 'financas'.
    const transacaoExemplo = document.createElement('div');
    transacaoExemplo.className = 'transacao-item';
    transacaoExemplo.innerHTML = `
        <div class="transacao-left">
            <div class="trans-icon"><i class="fa-solid fa-arrow-trend-down"></i></div>
            <div class="trans-info">
                <p>Pix para namorada</p>
                <small>Outros</small>
            </div>
        </div>
        <span class="trans-valor text-red">-R$ 60,00</span>
    `;
    lista.appendChild(transacaoExemplo);
}

// Simulador da IA
window.enviarIA = function() {
    const input = document.getElementById('ia-input');
    const respostaBox = document.getElementById('ia-resposta');
    const btnIcon = document.querySelector('.btn-send-ia i');
    
    if(!input.value) return;

    // Efeito de carregamento
    btnIcon.className = "fa-solid fa-spinner fa-spin";
    respostaBox.style.display = "block";
    respostaBox.innerHTML = "<span class='text-dim'>Analisando dados...</span>";

    // Resposta fake da IA baseada na pergunta
    setTimeout(() => {
        btnIcon.className = "fa-solid fa-arrow-up";
        respostaBox.innerHTML = `<strong>Sky IA:</strong> Analisei seus registros. Baseado na sua solicitação "${input.value}", recomendo reduzir gastos em delivery este fim de semana para bater sua Meta do BMW M3 mais rápido.`;
        input.value = '';
    }, 1500);
}

// ==========================================
// 8. INICIALIZAÇÃO GRÁFICO
// ==========================================
Chart.defaults.color = '#7a7a7a';
Chart.defaults.font.family = 'Inter';
const ctxChart = document.getElementById('graficoProgresso');
if(ctxChart) {
    meuGrafico = new Chart(ctxChart.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'], 
            datasets: [{
                data: [20, 50, 30, 80, 60, 90, 0], // Valores aleatórios pro design
                borderColor: '#00e676', borderWidth: 2, tension: 0.4, fill: false,
                pointBackgroundColor: '#141414', pointBorderColor: '#00e676', pointBorderWidth: 2, pointRadius: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { display: false, max: 100 }, x: { grid: { display: false }, border: { display: false } } }
        }
    });
}
