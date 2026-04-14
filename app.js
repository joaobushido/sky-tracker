// ==========================================
// 1. CONFIGURAÇÃO DO FIREBASE (JÁ INSERIDO AS SUAS CHAVES)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAQfU4m4UAKmsq4QNdW__KPIIjNUT_HoI0",
    authDomain: "skytracker-6aada.firebaseapp.com",
    projectId: "skytracker-6aada",
    storageBucket: "skytracker-6aada.firebasestorage.app",
    messagingSenderId: "767894844971",
    appId: "1:767894844971:web:6800eafcf14f3b93dcdc6e"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// 2. VARIÁVEIS GLOBAIS E ESTADOS
// ==========================================
let currentUserUID = null;
let userXP = 0;
let habitos = [];
let transacoes = []; // NOVO: Módulo Finanças
let notas = "";
let filtroAtual = 'todos';
let meuGrafico;
let temaSalvo = localStorage.getItem('temaSkyOS') || '#00ff88'; // Lumeon Green por padrão
document.documentElement.style.setProperty('--accent', temaSalvo);

// ==========================================
// 3. SISTEMA DE AUTENTICAÇÃO (LOGIN)
// ==========================================
document.getElementById('btn-login').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => alert("Erro ao logar: " + error.message));
});

document.getElementById('btn-logout').addEventListener('click', () => { auth.signOut(); });

// Escuta o estado do login
auth.onAuthStateChanged(user => {
    if (user) {
        currentUserUID = user.uid;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-main').style.display = 'flex';
        carregarDadosDaNuvem(); // Puxa tudo do banco de dados!
    } else {
        currentUserUID = null;
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-main').style.display = 'none';
    }
});

// ==========================================
// 4. BANCO DE DADOS (FIRESTORE) - SINCRONIZAÇÃO COMPLETA
// ==========================================
function carregarDadosDaNuvem() {
    if (!currentUserUID) return;
    const docRef = db.collection("usuarios").doc(currentUserUID);

    // Ouve as alterações na nuvem em tempo real!
    docRef.onSnapshot((doc) => {
        if (doc.exists) {
            const dados = doc.data();
            habitos = dados.habitos || [];
            userXP = dados.userXP || 0;
            transacoes = dados.transacoes || []; // Carrega finanças
            notas = dados.notas || "";
            
            // Sincroniza visual
            const notesArea = document.getElementById('quick-notes');
            if (notesArea) notesArea.value = notas;
            
            atualizarHabitosVisuais();
            atualizarXPVisual();
            atualizarFinanceiroVisuais(); // NOVO
        } else {
            // Se for a primeira vez, cria um perfil em branco na nuvem
            salvarNaNuvem();
        }
    });
}

function salvarNaNuvem() {
    if (!currentUserUID) return;
    const notesArea = document.getElementById('quick-notes');
    if (notesArea) notas = notesArea.value; // Pega nota atual se houver campo

    db.collection("usuarios").doc(currentUserUID).set({
        habitos,
        userXP,
        transacoes, // Salva finanças
        notas
    }, { merge: true });
}

// Salva as notas na nuvem quando terminar de escrever
const notesAreaInput = document.getElementById('quick-notes');
if (notesAreaInput) {
    notesAreaInput.addEventListener('change', () => {
        salvarNaNuvem();
    });
}

// ==========================================
// 5. MÓDULO FINANÇAS (PRINT 9)
// ==========================================
function formataBRL(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function atualizarFinanceiroVisuais() {
    const lista = document.getElementById('lista-financeiro');
    if (!lista) return;
    lista.innerHTML = '';
    
    let totalReceita = 0;
    let totalDespesa = 0;

    // Sorteia transações da mais nova para a mais antiga
    transacoes.sort((a,b) => b.data - a.data);

    transacoes.forEach((t, i) => {
        const valorVal = parseFloat(t.valor);
        if (t.tipo === 'entrada') totalReceita += valorVal;
        else totalDespesa += valorVal;

        // Renderiza item na lista
        const div = document.createElement('div');
        div.className = 'fin-item glass-panel';
        div.innerHTML = `
            <div>
                <p style="font-weight:600">${t.desc}</p>
                <small class="text-dim">${new Date(t.data).toLocaleDateString('pt-BR')}</small>
            </div>
            <div class="fin-item-valor" style="color: ${t.tipo === 'entrada' ? '#00ff88' : '#ff4d4d'}">
                ${t.tipo === 'entrada' ? '+' : '-'} ${formataBRL(valorVal)}
            </div>
            <button onclick="removerTransacao(${i})" class="btn-remove-habito">✖</button>
        `;
        lista.appendChild(div);
    });

    // Atualiza cards superiores
    document.getElementById('fin-total-receita').innerText = '+' + formataBRL(totalReceita);
    document.getElementById('fin-total-despesa').innerText = '-' + formataBRL(totalDespesa);
    
    // Saldo Total
    const saldo = totalReceita - totalDespesa;
    const saldoVisor = document.getElementById('saldo-total');
    saldoVisor.innerText = formataBRL(saldo);
    
    // Muda cor do saldo
    if (saldo >= 0) { saldoVisor.classList.remove('glow-text-purple'); saldoVisor.classList.add('glow-text-cyan'); }
    else { saldoVisor.classList.remove('glow-text-cyan'); saldoVisor.classList.add('glow-text-purple'); }
}

document.getElementById('btn-add-fin').onclick = () => {
    const descIn = document.getElementById('fin-desc');
    const valorIn = document.getElementById('fin-valor');
    const tipoIn = document.getElementById('fin-tipo');

    if (!descIn.value || !valorIn.value) return;

    // Cria transação
    transacoes.push({
        desc: descIn.value,
        valor: valorIn.value,
        tipo: tipoIn.value,
        data: Date.now()
    });

    // Limpa inputs
    descIn.value = '';
    valorIn.value = '';

    atualizarFinanceiroVisuais(); // Sincroniza visual local
    salvarNaNuvem(); // Sincroniza nuvem
};

window.removerTransacao = (i) => { transacoes.splice(i, 1); atualizarFinanceiroVisuais(); salvarNaNuvem(); };

// ==========================================
// 6. MÓDULO HÁBITOS (PRINTS 3, 5) - ANTIBUG DA CÂMERA MANTIDO
// ==========================================
let indexTarefaPendenteProva = null; 

// UX Inteligente: Impede a caixinha de marcar sozinha até que a foto seja salva
window.iniciarProva = (i, event) => {
    event.preventDefault(); // Impede o navegador de marcar a caixinha antes da foto!

    if (!habitos[i].feito) {
        indexTarefaPendenteProva = i;
        // Ativa a CÂMERA do celular direto
        document.getElementById('upload-prova').click(); 
    } else {
        // Desmarcar tarefa
        habitos[i].feito = false;
        habitos[i].imagem = null; 
        gerenciarXP(-150); // Perde XP se desmarcar!
        atualizarHabitosVisuais(); // Atualiza local
        salvarNaNuvem(); // Sincroniza nuvem
    }
};

document.getElementById('upload-prova').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file && indexTarefaPendenteProva !== null) {
        const reader = new FileReader();
        reader.onload = function (evento) {
            // Foto tirada com sucesso!
            habitos[indexTarefaPendenteProva].feito = true;
            habitos[indexTarefaPendenteProva].imagem = evento.target.result; // Foto compactada Base64
            gerenciarXP(150); // XP por prova enviada!
            atualizarHabitosVisuais(); // Força a atualização da caixinha (agora sim)
            salvarNaNuvem(); // Sincroniza nuvem
            indexTarefaPendenteProva = null;
            e.target.value = ''; 
            dispararConfetes();
        };
        reader.readAsDataURL(file); 
    } else {
        // Se cancelar a câmera
        indexTarefaPendenteProva = null;
        e.target.value = '';
    }
});

function dispararConfetes() {
    var duration = 2000;
    var end = Date.now() + duration;
    (function frame() {
        confetti({ particleCount: 7, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors: [temaSalvo, '#ffffff', '#00bfff'] });
        confetti({ particleCount: 7, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors: [temaSalvo, '#ffffff', '#b026ff'] });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
}

function obterClasseCategoria(categoria) {
    if (categoria === 'Saúde') return 'tag-saude';
    if (categoria === 'Sky Burger') return 'tag-sky';
    if (categoria === 'Pessoal') return 'tag-pessoal';
    return '';
}

function atualizarHabitosVisuais() {
    const lista = document.getElementById('lista-habitos');
    if (!lista) return;
    lista.innerHTML = '';
    let concluidos = 0;

    habitos.forEach((h, i) => {
        if (filtroAtual !== 'todos' && h.categoria !== filtroAtual) return;
        if (h.feito) concluidos++;

        const div = document.createElement('div');
        div.className = `habito glass-panel slide-up ${obterClasseCategoria(h.categoria)}`;
        
        let imgHtml = h.imagem ? `<img src="${h.imagem}" class="habito-img hover-lift">` : '<div class="habito-img-placeholder text-dim">Sem prova</div>';
        
        // A mágica anti-bug está no onclick="iniciarProva(${i}, event)"
        div.innerHTML = `
            <input type="checkbox" ${h.feito ? 'checked' : ''} onclick="iniciarProva(${i}, event)">
            <div class="habito-texto-container">
                <p class="${h.feito ? 'feito' : ''}">${h.texto}</p>
                <span class="cat-tag">${h.categoria}</span>
            </div>
            <div class="habito-img-container">
                ${imgHtml}
            </div>
            <button onclick="removerHabito(${i})" class="btn-remove-habito">✖</button>
        `;
        lista.appendChild(div);
    });

    const total = habitos.length;
    const porc = total ? Math.round((concluidos / total) * 100) : 0;
    
    document.getElementById('txt-porc').innerText = porc + "%";
    const sequenciaTxt = document.getElementById('txt-sequencia');
    if(sequenciaTxt) sequenciaTxt.innerText = concluidos > 0 ? habitos.filter(h=>h.feito).length : 0; 
    
    if (meuGrafico) {
        meuGrafico.data.datasets[0].data[6] = porc;
        meuGrafico.update('none'); 
    }
}

document.getElementById('btn-adicionar').onclick = () => {
    const textoIn = document.getElementById('novo-habito-input');
    const categoriaIn = document.getElementById('categoria-input');
    const texto = textoIn.value;
    const categoria = categoriaIn.value;
    if (!texto) return;

    habitos.push({ texto, categoria, feito: false, imagem: null });
    textoIn.value = '';
    atualizarHabitosVisuais(); salvarNaNuvem(); // Sincroniza local e nuvem
};

window.removerHabito = (i) => { habitos.splice(i, 1); atualizarHabitosVisuais(); salvarNaNuvem(); };

// ==========================================
// 7. UX, XP E UTILITÁRIOS (RELOGIO PRO, CLIMA BH, POMODORO CIRCULAR)
// ==========================================
function atualizarXPVisual() {
    const levelBadge = document.getElementById('user-level');
    const currentXPvisor = document.getElementById('current-xp');
    const xpFill = document.getElementById('xp-bar-fill');
    
    if(!levelBadge) return;

    levelBadge.innerText = Math.floor(userXP / 1000) + 1;
    let xpNoLevel = userXP % 1000;
    
    xpFill.style.width = (xpNoLevel / 10) + "%";
    currentXPvisor.innerText = xpNoLevel;
}

function gerenciarXP(ganho) { userXP = Math.max(0, userXP + ganho); atualizarXPVisual(); }

window.filtrar = function (cat, btn) {
    filtroAtual = cat;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    atualizarHabitosVisuais();
}

window.mudarAba = function (aba, elemento) {
    document.querySelectorAll('.aba').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    if(elemento && !elemento.classList.contains('circle-add-btn')) elemento.classList.add('active');
}

document.querySelector('.circle-add-btn').onclick = () => {
    mudarAba('habitos');
    document.querySelectorAll('.nav-item')[1].classList.add('active'); 
}

function atualizarRelogioEData() {
    const agora = new Date();
    // Formato premium: HH:MM:SS - dia, DD de mês
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const segs = agora.getSeconds().toString().padStart(2, '0');
    const dataFormatada = agora.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
    
    const visor = document.getElementById('data-atual');
    if(visor) visor.innerHTML = `${horaFormatada}<span class="text-dim" style="font-size:0.8em">:${segs}</span> • <span style="text-transform:capitalize">${dataFormatada}</span>`;

    const dataAlvo = new Date('April 20, 2026 18:00:00').getTime();
    const diff = dataAlvo - agora.getTime();
    const countdownVisor = document.getElementById('countdown');
    if (diff > 0 && countdownVisor) countdownVisor.innerText = `${Math.floor(diff / (1000 * 60 * 60 * 24))}d ${Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))}h`;
    else if(countdownVisor) countdownVisor.innerText = "Inaugurado! 🎉"; 
}
setInterval(atualizarRelogioEData, 1000);

async function carregarAPIs() {
    try {
        const resClima = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-19.9208&longitude=-43.9378&current_weather=true');
        const dataClima = await resClima.json();
        const climaVisor = document.getElementById('clima-bh');
        if(climaVisor) climaVisor.innerText = `${Math.round(dataClima.current_weather.temperature)}°`;
    } catch (e) { }

    try {
        const resFrase = await fetch('https://api.adviceslip.com/advice');
        const dataFrase = await resFrase.json();
        const fraseVisor = document.getElementById('frase-dia');
        if(fraseVisor) fraseVisor.innerText = `"${dataFrase.slip.advice}"`;
    } catch (e) { }
}

// POMODORO PREMIUM (CIRCULAR - PRINT 8) - Reativado na Aba Foco
let timerInterval, segundosPomodoro = 1500;
const circleProg = document.querySelector('.progress-ring__circle');
const radius = circleProg ? circleProg.r.baseVal.value : 90;
const circumference = 2 * Math.PI * radius;

if(circleProg) {
    circleProg.style.strokeDasharray = `${circumference} ${circumference}`;
    circleProg.style.strokeDashoffset = circumference;
}

function setProgress(percent) {
    if(!circleProg) return;
    const offset = circumference - (percent / 100 * circumference);
    circleProg.style.strokeDashoffset = offset;
}

document.getElementById('timer-start').onclick = () => {
    if (timerInterval) return;
    document.getElementById('timer-clock').style.color = temaSalvo; 
    timerInterval = setInterval(() => {
        segundosPomodoro--;
        const mins = Math.floor(segundosPomodoro / 60);
        const segs = segundosPomodoro % 60;
        document.getElementById('timer-clock').innerText = `${mins}:${segs.toString().padStart(2, '0')}`;
        
        const porcConcluida = ((1500 - segundosPomodoro) / 1500) * 100;
        setProgress(porcConcluida);

        if (segundosPomodoro <= 0) {
            clearInterval(timerInterval);
            gerenciarXP(100);
            salvarNaNuvem();
            alert("Sessão concluída! +100 XP.");
            timerInterval = null;
            resetTimer();
        }
    }, 1000);
};

document.getElementById('timer-pause').onclick = () => { clearInterval(timerInterval); timerInterval = null; };
document.getElementById('timer-reset').onclick = resetTimer;

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    segundosPomodoro = 1500;
    document.getElementById('timer-clock').innerText = "25:00";
    document.getElementById('timer-clock').style.color = '#8c92a6'; 
    setProgress(0);
}

// INICIALIZA O GRÁFICO (Performance Semanal Dinâmica)
Chart.defaults.color = '#8c92a6';
Chart.defaults.font.family = 'Inter';
const ctxChart = document.getElementById('graficoProgresso');
if(ctxChart) {
    const context = ctxChart.getContext('2d');
    let gradient = context.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.2)'); 
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0.0)');

    meuGrafico = new Chart(context, {
        type: 'line',
        data: {
            labels: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'], 
            datasets: [{
                data: [40, 60, 50, 90, 70, 85, 0], // Inicia zerado hoje
                borderColor: temaSalvo, borderWidth: 3, tension: 0.4, fill: true, backgroundColor: gradient,
                pointBackgroundColor: '#0d1117', pointBorderColor: temaSalvo, pointBorderWidth: 2, pointRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { y: { beginAtZero: true, max: 100, display: false }, x: { grid: { display: false }, border: { display: false } } },
            animation: { duration: 1000, easing: 'easeOutQuart' }
        }
    });
}

// START
carregarAPIs();
setProgress(0);
const pulseIcon = document.querySelector('.pulsing-icon');
if(pulseIcon) pulseIcon.style.animationPlayState = 'paused';
