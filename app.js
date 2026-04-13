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
let filtroAtual = 'todos';
let meuGrafico;
let temaSalvo = localStorage.getItem('temaSkyOS') || '#00ff88'; // Lumeon Green
document.documentElement.style.setProperty('--accent', temaSalvo);

// ==========================================
// 3. SISTEMA DE AUTENTICAÇÃO (LOGIN)
// ==========================================
document.getElementById('btn-login').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => alert("Erro ao logar: " + error.message));
});

document.getElementById('btn-logout').addEventListener('click', () => {
    auth.signOut();
});

// Fica escutando para ver se logou ou deslogou
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
// 4. BANCO DE DADOS (FIRESTORE)
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
            const notesArea = document.getElementById('quick-notes');
            if (notesArea) notesArea.value = dados.notas || "";
            atualizarHabitosVisuais();
            atualizarXPVisual();
        } else {
            // Se for a primeira vez, cria um perfil em branco
            salvarNaNuvem();
        }
    });
}

function salvarNaNuvem() {
    if (!currentUserUID) return;
    const notas = document.getElementById('quick-notes').value;
    db.collection("usuarios").doc(currentUserUID).set({
        habitos: habitos,
        userXP: userXP,
        notas: notas
    }, { merge: true });
}

// Salva as notas na nuvem quando terminar de escrever
const notesArea = document.getElementById('quick-notes');
if (notesArea) notesArea.addEventListener('change', salvarNaNuvem);

// ==========================================
// 5. NOVA LÓGICA DE IMAGEM (PROVA DE CONCLUSÃO - SUA PEDRA NO SAPATO)
// ==========================================
let indexTarefaPendenteProva = null; // Guarda qual a tarefa que estamos concluindo

window.toggleHabito = (i) => {
    // Se a tarefa não está feita e vai marcar como feita, pede a prova!
    if (!habitos[i].feito) {
        indexTarefaPendenteProva = i;
        document.getElementById('upload-prova').click(); // Abre a janela de arquivos
    } else {
        // Se vai desmarcar, apenas retira o check e a imagem
        habitos[i].feito = false;
        habitos[i].imagem = null; // Apaga a prova
        gerenciarXP(-150);
        salvarNaNuvem();
    }
};

// Quando escolher a imagem de prova de conclusão
document.getElementById('upload-prova').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file && indexTarefaPendenteProva !== null) {
        const reader = new FileReader();
        reader.onload = function (evento) {
            habitos[indexTarefaPendenteProva].feito = true;
            habitos[indexTarefaPendenteProva].imagem = evento.target.result; // Salva a foto (Base64 pequeno)
            gerenciarXP(150); // XP por prova enviada!
            salvarNaNuvem();
            indexTarefaPendenteProva = null;
            e.target.value = ''; // Limpa o input pra poder enviar a mesma foto se quiser
            
            // Dispara os confetes com as cores do tema ao enviar a prova!
            dispararConfetes();
        };
        reader.readAsDataURL(file); // Lê a foto e dispara a função acima
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

// ==========================================
// 6. RENDERIZAÇÃO DO SISTEMA VISUAL PRO
// ==========================================
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
        // Adiciona classe para cor da tag baseada na ref de progresso
        div.className = `habito glass-panel slide-up ${obterClasseCategoria(h.categoria)}`;
        
        // Foto da prova aparece pequena no cartão
        let imgHtml = h.imagem ? `<img src="${h.imagem}" class="habito-img hover-lift" title="Clique para ver a prova ampliada">` : '<div class="habito-img-placeholder text-dim">Sem prova</div>';
        
        div.innerHTML = `
            <input type="checkbox" ${h.feito ? 'checked' : ''} onchange="toggleHabito(${i})">
            <div class="habito-texto-container">
                <p class="${h.feito ? 'feito' : ''}">${h.texto}</p>
                <span class="cat-tag">${h.categoria}</span>
            </div>
            <div class="habito-img-container">
                ${imgHtml}
            </div>
            <button onclick="removerHabito(${i})" class="btn-remove-habito" title="Excluir Missão">✖</button>
        `;
        lista.appendChild(div);
    });

    // Atualiza Dopamina e Performance
    const total = habitos.length;
    const porc = total ? Math.round((concluidos / total) * 100) : 0;
    
    document.getElementById('txt-porc').innerText = porc + "%";
    const sequenciaTxt = document.getElementById('txt-sequencia');
    if(sequenciaTxt) sequenciaTxt.innerText = concluidos > 0 ? habitos.filter(h=>h.feito).length : 0; // Streak simplificado pra teste

    localStorage.setItem('habitosV7', JSON.stringify(habitos)); // Backup local por garantia
    
    // Atualiza o gráfico Dinâmico sem recriar
    if (meuGrafico) {
        meuGrafico.data.datasets[0].data[6] = porc;
        meuGrafico.update('none'); // Update sem animação pra não travar
    }
}

document.getElementById('btn-adicionar').onclick = () => {
    const textoIn = document.getElementById('novo-habito-input');
    const categoriaIn = document.getElementById('categoria-input');
    const texto = textoIn.value;
    const categoria = categoriaIn.value;
    if (!texto) return;

    // Não pede a foto aqui! Cria em branco.
    habitos.push({ texto, categoria, feito: false, imagem: null });
    textoIn.value = '';
    guardarNaNuvem(); // Sincroniza
};

window.removerHabito = (i) => { habitos.splice(i, 1); guardarNaNuvem(); };

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

function gerenciarXP(ganho) {
    userXP = Math.max(0, userXP + ganho);
    atualizarXPVisual();
    // Não precisa salvar aqui, o SalvarNaNuvem já é chamado no toggleHabito
}

window.filtrar = function (cat, btn) {
    filtroAtual = cat;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    atualizarHabitosVisuais();
}

// Tema (Cores)
window.mudarTema = function (cor) {
    document.documentElement.style.setProperty('--accent', cor);
    localStorage.setItem('temaSkyOS', cor);
    temaSalvo = cor;
    if (meuGrafico) {
        meuGrafico.data.datasets[0].borderColor = cor;
        meuGrafico.data.datasets[0].pointBorderColor = cor;
        meuGrafico.update('none');
    }
}

// Navegação Premium
window.mudarAba = function (aba, elemento) {
    document.querySelectorAll('.aba').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    
    document.getElementById(`aba-${aba}`).classList.add('active');
    
    // Se não for o botão central de ADD, marca como ativo
    if(elemento && !elemento.classList.contains('circle-add-btn')) {
        elemento.classList.add('active');
    }
}

// Botão central de ADD leva pra aba Missões
document.querySelector('.circle-add-btn').onclick = () => {
    mudarAba('habitos');
    document.querySelectorAll('.nav-item')[1].classList.add('active'); // Marca Missões como ativo
}

// ==========================================
// 7. UTILITÁRIOS (Relógio PRO, APIs, Sons, Foco PRO)
// ==========================================
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
    if (diff > 0 && countdownVisor) {
        countdownVisor.innerText = `${Math.floor(diff / (1000 * 60 * 60 * 24))}d ${Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))}h`;
    } else if(countdownVisor) { countdownVisor.innerText = "Inaugurado! 🎉"; }
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

// SONS PREMIUM (Player Simples Baseado na Ref)
const audioLofi = document.getElementById('audio-lofi');
const btnPlayLofiPrem = document.getElementById('btn-play-lofi-prem');
const volumeLofiPrem = document.getElementById('lofi-volume-prem');
const artLofi = document.querySelector('.album-art');

let lofiTocando = false;

if(btnPlayLofiPrem) {
    btnPlayLofiPrem.addEventListener('click', () => {
        if (lofiTocando) {
            audioLofi.pause();
            btnPlayLofiPrem.innerHTML = '<i class="fa-solid fa-play"></i>';
            document.querySelector('.pulsing-icon').style.animationPlayState = 'paused';
            artLofi.style.animationPlayState = 'paused';
        } else {
            audioLofi.play();
            btnPlayLofiPrem.innerHTML = '<i class="fa-solid fa-pause"></i>';
            document.querySelector('.pulsing-icon').style.animationPlayState = 'running';
            artLofi.style.animationPlayState = 'running';
        }
        lofiTocando = !lofiTocando;
    });
    volumeLofiPrem.addEventListener('input', (e) => audioLofi.volume = e.target.value);
}

// FOCO POMODORO PREMIUM (CIRCULAR - IMAGEM 8)
let timerInterval, segundosPomodoro = 1500;
const circleProg = document.querySelector('.progress-ring__circle');
const radius = circleProg.r.baseVal.value;
const circumference = 2 * Math.PI * radius;

circleProg.style.strokeDasharray = `${circumference} ${circumference}`;
circleProg.style.strokeDashoffset = circumference;

function setProgress(percent) {
    const offset = circumference - (percent / 100 * circumference);
    circleProg.style.strokeDashoffset = offset;
}

document.getElementById('timer-start').onclick = () => {
    if (timerInterval) return;
    document.getElementById('timer-clock').style.color = temaSalvo; // Cyan da ref
    timerInterval = setInterval(() => {
        segundosPomodoro--;
        const mins = Math.floor(segundosPomodoro / 60);
        const segs = segundosPomodoro % 60;
        document.getElementById('timer-clock').innerText = `${mins}:${segs.toString().padStart(2, '0')}`;
        
        // Atualiza anel de progresso (25min = 1500s)
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
    document.getElementById('timer-clock').style.color = '#8c92a6'; // Volta cor dim
    setProgress(0);
}

// INICIALIZA O GRÁFICO (CHART.JS Premium)
Chart.defaults.color = '#8c92a6';
Chart.defaults.font.family = 'Inter';
const ctx = document.getElementById('graficoProgresso');
if(ctx) {
    const context = ctx.getContext('2d');
    // Degradê do tema
    let gradient = context.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.2)'); // Usando verde Lumeon
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0.0)');

    meuGrafico = new Chart(context, {
        type: 'line',
        data: {
            labels: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'], // Abreviado
            datasets: [{
                data: [40, 60, 50, 90, 70, 85, 0],
                borderColor: temaSalvo, borderWidth: 3, tension: 0.4, fill: true, backgroundColor: gradient,
                pointBackgroundColor: '#0d1117', pointBorderColor: temaSalvo, pointBorderWidth: 2, pointRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                y: { beginAtZero: true, max: 100, display: false }, // Esconde eixo Y pra limpar visual
                x: { grid: { display: false }, border: { display: false } }
            },
            animation: { duration: 1000, easing: 'easeOutQuart' }
        }
    });
}

// START
carregarAPIs();
setProgress(0);
// Para o icon pulsing do player carregar parado
const pulse = document.querySelector('.pulsing-icon');
if(pulse) pulse.style.animationPlayState = 'paused';