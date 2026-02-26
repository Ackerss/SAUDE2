// --- VITALITY APP: LÓGICA PRINCIPAL ---

// Estado da Aplicação
let appState = {
    profile: null,
    records: []
};

// Chave Storage
const STORAGE_KEY = '@VitalityApp_Data';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initNavigation();
    initSettingsBtn();
    initModal();
    initForms();
    updateUI();
});

// --- DADOS & STORAGE ---
function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            appState = JSON.parse(data);
            // Corrige possíveis registros antigos sem cintura
            appState.records = appState.records.map(r => ({
                id: r.id || Date.now() + Math.random(),
                date: r.date,
                weight: parseFloat(r.weight),
                waist: r.waist ? parseFloat(r.waist) : null
            })).sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (e) {
            console.error('Erro ao ler dados', e);
        }
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    updateUI();
}

// --- NAVEGAÇÃO SPA ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');

            // Atualizar botões
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Atualizar views
            views.forEach(view => {
                view.classList.remove('active');
                setTimeout(() => view.classList.add('hidden'), 50); // Delay pro opacity
            });

            const targetView = document.getElementById(targetId);
            targetView.classList.remove('hidden');
            setTimeout(() => targetView.classList.add('active'), 50);

            // Refrescar gráficos se for dashboard
            if (targetId === 'view-dashboard') renderChart();
            if (targetId === 'view-history') renderHistory();

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Botão Voltar do Perfil
    document.getElementById('backFromProfile').addEventListener('click', () => {
        document.querySelector('.nav-item[data-target="view-dashboard"]').click();
    });
}

function initSettingsBtn() {
    document.getElementById('openSettingsBtn').addEventListener('click', () => {
        document.querySelector('.nav-item[data-target="view-profile"]').click();
    });
}

// --- MODAL NOVO REGISTRO ---
function initModal() {
    const modal = document.getElementById('addModal');
    const fab = document.getElementById('addRecordBtn');
    const closeBtn = document.getElementById('closeModalBtn');

    // Setar data de hoje por padrão
    document.getElementById('recDate').valueAsDate = new Date();

    fab.addEventListener('click', () => {
        if (!appState.profile) {
            Swal.fire({
                icon: 'warning',
                title: 'Perfil Incompleto',
                text: 'Por favor, configure seu perfil primeiro!',
                confirmButtonText: 'Configurar'
            }).then((result) => {
                if (result.isConfirmed) document.querySelector('.nav-item[data-target="view-profile"]').click();
            });
            return;
        }

        // Sugerir último peso e cintura
        if (appState.records.length > 0) {
            const last = appState.records[0];
            document.getElementById('recWeight').value = last.weight;
            if (last.waist) document.getElementById('recWaist').value = last.waist;
        } else {
            document.getElementById('recWeight').value = appState.profile.startWeight;
            document.getElementById('recWaist').value = appState.profile.startWaist || '';
        }

        modal.classList.add('active');
    });

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
}

// --- FORMULÁRIOS VINCULADOS ---
function initForms() {
    // FORM PROFILE
    const profileForm = document.getElementById('profileForm');

    // Auto-update ideal weight range when height changes
    const heightInput = document.getElementById('profHeight');
    heightInput.addEventListener('input', () => {
        const height = parseFloat(heightInput.value);
        if (height > 100) {
            const minW = (18.5 * Math.pow(height / 100, 2)).toFixed(1);
            const maxW = (24.9 * Math.pow(height / 100, 2)).toFixed(1);
            document.getElementById('profIdealWeightRange').textContent = `${minW} - ${maxW} kg`;
        }
    });

    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();

        appState.profile = {
            name: document.getElementById('profName').value,
            age: parseInt(document.getElementById('profAge').value),
            height: parseFloat(document.getElementById('profHeight').value),
            gender: document.querySelector('input[name="profGender"]:checked').value,
            startWeight: parseFloat(document.getElementById('profStartWeight').value),
            startWaist: document.getElementById('profStartWaist').value ? parseFloat(document.getElementById('profStartWaist').value) : null,
            targetWeight: parseFloat(document.getElementById('profTargetWeight').value)
        };

        // Se for o primeiro setup, adicionar o peso inicial no histórico
        if (appState.records.length === 0) {
            appState.records.push({
                id: Date.now(),
                date: new Date().toISOString().split('T')[0],
                weight: appState.profile.startWeight,
                waist: appState.profile.startWaist
            });
        }

        saveData();
        Swal.fire({
            icon: 'success',
            title: 'Perfil Salvo!',
            timer: 1500,
            showConfirmButton: false
        });

        setTimeout(() => document.querySelector('.nav-item[data-target="view-dashboard"]').click(), 1500);
    });

    // FORM RECORD
    const recordForm = document.getElementById('recordForm');
    recordForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const dateStr = document.getElementById('recDate').value;
        const weight = parseFloat(document.getElementById('recWeight').value);
        const waistVal = document.getElementById('recWaist').value;
        const waist = waistVal ? parseFloat(waistVal) : null;

        // Verifica se já tem registro no dia
        const existingIdx = appState.records.findIndex(r => r.date === dateStr);

        if (existingIdx >= 0) {
            appState.records[existingIdx].weight = weight;
            appState.records[existingIdx].waist = waist;
        } else {
            appState.records.push({
                id: Date.now(),
                date: dateStr,
                weight: weight,
                waist: waist
            });
        }

        // Ordena por data decrescente
        appState.records.sort((a, b) => new Date(b.date) - new Date(a.date));

        saveData();
        document.getElementById('addModal').classList.remove('active');

        Swal.fire({
            icon: 'success',
            title: 'Registro salvo!',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
        });
    });

    // BACKUP BUTTONS
    document.getElementById('btnExport').addEventListener('click', exportData);
    document.getElementById('btnClearData').addEventListener('click', confirmClearData);

    const fileInput = document.getElementById('fileImport');
    document.getElementById('btnImportWrapper').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', importData);

    // CHANGE CHART FILTER
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderChart();
        });
    });

    // CHANGE CHART TABS (Weight / Waist)
    document.querySelectorAll('.tab-btn[data-chart]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn[data-chart]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderChart();
        });
    });

}

// --- CÁLCULOS MÉDICOS ---

// IMC
function calcIMC(weight, heightCm) {
    const h = heightCm / 100;
    return (weight / (h * h)).toFixed(1);
}

function getIMCStatus(imc) {
    if (imc < 18.5) return { text: 'Abaixo do Peso', color: 'var(--orange)' };
    if (imc < 25) return { text: 'Peso Normal', color: 'var(--success)' };
    if (imc < 30) return { text: 'Sobrepeso', color: 'var(--orange)' };
    if (imc < 35) return { text: 'Obesidade Grau 1', color: 'var(--danger)' };
    if (imc < 40) return { text: 'Obesidade Grau 2', color: 'var(--danger)' };
    return { text: 'Obesidade Grau 3', color: 'var(--purple)' };
}

// RCE (Relação Cintura Estatura)
function calcRCE(waistCm, heightCm) {
    return (waistCm / heightCm).toFixed(2);
}

function getRCEStatus(rce) {
    if (rce < 0.43) return { label: 'Abaixo', percent: (rce / 0.6) * 100 };
    if (rce <= 0.52) return { label: 'Bom', percent: (rce / 0.6) * 100 };
    if (rce <= 0.58) return { label: 'Risco', percent: (rce / 0.6) * 100 };
    return { label: 'Alto Risco', percent: 100 };
}

// RFM (Gordura Relativa)
function calcRFM(waistCm, heightCm, gender) {
    if (gender === 'M') {
        return (64 - (20 * (heightCm / waistCm))).toFixed(1);
    } else {
        return (76 - (20 * (heightCm / waistCm))).toFixed(1);
    }
}

function getRFMMarkerPercent(rfm, gender) {
    const max = gender === 'M' ? 35 : 45;
    let p = (rfm / max) * 100;
    return Math.min(Math.max(p, 0), 100);
}

// RISCO ABDOMINAL (Baseado na cintura)
function getAbdominalRisk(waist, gender) {
    if (gender === 'M') {
        if (waist < 94) return { text: "Risco Baixo", icon: "fa-face-smile", color: "var(--success)" };
        if (waist <= 102) return { text: "Risco Moderado", icon: "fa-face-meh", color: "var(--orange)", desc: "Atenção: Aumente exercícios" };
        return { text: "Risco Alto", icon: "fa-face-frown", color: "var(--danger)", desc: "Procure avaliação médica" };
    } else {
        if (waist < 80) return { text: "Risco Baixo", icon: "fa-face-smile", color: "var(--success)" };
        if (waist <= 88) return { text: "Risco Moderado", icon: "fa-face-meh", color: "var(--orange)", desc: "Atenção: Aumente exercícios" };
        return { text: "Risco Alto", icon: "fa-face-frown", color: "var(--danger)", desc: "Procure avaliação médica" };
    }
}

// --- ATUALIZAÇÃO DA UI ---
function updateUI() {
    updateHeader();

    if (appState.profile) {
        populateProfileForm();
        updateDashboard();
        renderHistory();
    } else {
        // Estado sem perfil
        document.getElementById('dashIMCStatus').textContent = "Configure Perfil";
    }
}

function updateHeader() {
    const hour = new Date().getHours();
    let greting = "Boa noite,";
    if (hour >= 5 && hour < 12) greting = "Bom dia,";
    else if (hour >= 12 && hour < 18) greting = "Boa tarde,";

    document.getElementById('greetingTime').textContent = greting;

    if (appState.profile && appState.profile.name) {
        document.getElementById('headerName').textContent = appState.profile.name;
        document.getElementById('headerAvatar').innerHTML = appState.profile.name.charAt(0).toUpperCase();
    }
}

function populateProfileForm() {
    document.getElementById('profName').value = appState.profile.name;
    document.getElementById('profAge').value = appState.profile.age;
    document.getElementById('profHeight').value = appState.profile.height;
    document.querySelector(`input[name="profGender"][value="${appState.profile.gender}"]`).checked = true;
    document.getElementById('profStartWeight').value = appState.profile.startWeight;
    if (appState.profile.startWaist) document.getElementById('profStartWaist').value = appState.profile.startWaist;
    document.getElementById('profTargetWeight').value = appState.profile.targetWeight;

    // Trigger event for ideal weight calc
    document.getElementById('profHeight').dispatchEvent(new Event('input'));
}

function updateDashboard() {
    const records = appState.records;
    if (records.length === 0) return;

    const latest = records[0];
    const profile = appState.profile;

    // Atualiza Valores Principais
    document.getElementById('dashCurrentWeight').textContent = latest.weight.toFixed(1);
    document.getElementById('dashTargetWeight').textContent = profile.targetWeight.toFixed(1);

    // IMC
    const imc = calcIMC(latest.weight, profile.height);
    document.getElementById('dashIMC').textContent = imc.replace('.', ',');
    const imcStatus = getIMCStatus(imc);
    const dashStatusEl = document.getElementById('dashIMCStatus');
    dashStatusEl.textContent = imcStatus.text;
    dashStatusEl.style.backgroundColor = imcStatus.color + '33'; // 20% opacity
    dashStatusEl.style.color = imcStatus.color;

    // Evolução de Peso
    const weightDiff = (latest.weight - profile.startWeight).toFixed(1);
    const trendEl = document.getElementById('weightTrend');
    if (weightDiff > 0) {
        trendEl.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> +${weightDiff} kg`;
        trendEl.className = 'trend up';
    } else if (weightDiff < 0) {
        trendEl.innerHTML = `<i class="fa-solid fa-arrow-trend-down"></i> ${weightDiff} kg`;
        trendEl.className = 'trend down';
    } else {
        trendEl.innerHTML = `<i class="fa-solid fa-minus"></i> 0.0 kg`;
        trendEl.className = 'trend';
    }

    // Progresso para Meta
    const totalToLose = profile.startWeight - profile.targetWeight;
    const currentLost = profile.startWeight - latest.weight;
    let progress = 0;

    if (totalToLose > 0 && currentLost > 0) {
        progress = (currentLost / totalToLose) * 100;
    } else if (totalToLose < 0 && currentLost < 0) { // Goal is gain weight
        progress = (currentLost / totalToLose) * 100;
    }

    if (progress > 100) progress = 100;
    if (progress < 0) progress = 0;
    document.getElementById('goalProgress').style.width = `${progress}%`;

    // Atualiza Insight
    const insightCard = document.getElementById('insightText');
    const insightBox = document.getElementById('insightCard');
    const insightIcon = insightBox.querySelector('.insight-icon');

    if (progress >= 100) {
        insightCard.textContent = "Incrível! Você alcançou o seu peso alvo. Consulte um especialista para manter a manutenção.";
        insightBox.style.borderLeftColor = "var(--success)";
        insightIcon.style.backgroundColor = "var(--success)";
        insightIcon.innerHTML = '<i class="fa-solid fa-trophy"></i>';
    } else if (progress > 50) {
        insightCard.textContent = "Muito bem! Você já passou da metade do caminho para a sua meta principal.";
        insightBox.style.borderLeftColor = "var(--primary)";
        insightIcon.style.backgroundColor = "var(--primary)";
        insightIcon.innerHTML = '<i class="fa-solid fa-star"></i>';
    } else if (weightDiff < 0) {
        insightCard.textContent = "Bom trabalho, você está perdendo peso. Continue o acompanhamento constante.";
        insightBox.style.borderLeftColor = "#4A90E2";
        insightIcon.style.backgroundColor = "#4A90E2";
        insightIcon.innerHTML = '<i class="fa-solid fa-arrow-trend-down"></i>';
    } else {
        insightCard.textContent = "Mantenha o foco! Registre seu peso e cintura regularmente para acompanhar sua evolução.";
        insightBox.style.borderLeftColor = "var(--text-muted)";
        insightIcon.style.backgroundColor = "var(--text-muted)";
        insightIcon.innerHTML = '<i class="fa-solid fa-lightbulb"></i>';
    }

    // Saúde Metabólica (Apenas se tiver cintura)
    if (latest.waist) {
        document.getElementById('dashCurrentWaist').textContent = latest.waist.toFixed(1);

        // RCE
        const rce = calcRCE(latest.waist, profile.height);
        document.getElementById('dashRCE').textContent = rce;
        const rceStat = getRCEStatus(rce);
        document.getElementById('markerRCE').style.left = `${Math.min(rceStat.percent, 100)}%`;

        // RFM
        const rfm = calcRFM(latest.waist, profile.height, profile.gender);
        document.getElementById('dashRFM').textContent = `${rfm}%`;
        const rfmPercent = getRFMMarkerPercent(rfm, profile.gender);
        document.getElementById('markerRFM').style.left = `${rfmPercent}%`;

        // Risco Abdominal
        const risk = getAbdominalRisk(latest.waist, profile.gender);
        document.getElementById('dashAbdominalRisk').innerHTML = `<i class="fa-solid ${risk.icon}" style="color: ${risk.color}"></i> ${risk.text}`;

        const descEl = document.getElementById('abdominalRiskDesc');
        if (risk.desc) {
            descEl.textContent = risk.desc;
            descEl.style.display = 'block';
        } else {
            descEl.style.display = 'none';
        }

    } else {
        document.getElementById('dashCurrentWaist').textContent = '--';
        document.getElementById('dashRCE').textContent = '--';
        document.getElementById('dashRFM').textContent = '--';
        document.getElementById('markerRCE').style.left = `0%`;
        document.getElementById('markerRFM').style.left = `0%`;
        document.getElementById('dashAbdominalRisk').textContent = 'Faltam Dados';
    }

    // Renderiza gráfico na hora só se a view tiver visivel
    if (document.getElementById('view-dashboard').classList.contains('active')) {
        renderChart();
    }
}


function renderHistory() {
    const listEl = document.getElementById('recordsList');
    const records = appState.records;

    // Atualiza Totais
    document.getElementById('totalRecords').textContent = records.length;

    if (records.length > 0 && appState.profile) {
        const lost = (appState.profile.startWeight - records[0].weight).toFixed(1);
        document.getElementById('totalLostweight').textContent = lost > 0 ? lost : 0;
    }

    if (records.length === 0) {
        document.getElementById('historyEmpty').style.display = 'block';
        listEl.style.display = 'none';
        return;
    }

    document.getElementById('historyEmpty').style.display = 'none';
    listEl.style.display = 'flex';
    listEl.innerHTML = '';

    // Filtragem simplificada (Todos) - Filtros de tempo serão visuais no app final
    records.forEach(req => {
        const d = new Date(req.date + 'T12:00:00'); // Evita bug de fuso
        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase();

        let gorduraVal = '--';
        if (appState.profile && req.waist) {
            gorduraVal = calcRFM(req.waist, appState.profile.height, appState.profile.gender) + '%';
        }

        const riskVal = req.waist && appState.profile ? getAbdominalRisk(req.waist, appState.profile.gender).text : 'Desc.';

        const div = document.createElement('div');
        div.className = 'record-card';
        div.innerHTML = `
            <div class="rc-header">
                <div class="rc-date">${dateStr}</div>
                <div class="rc-main-val">${req.weight.toFixed(1)} <small>kg</small></div>
            </div>
            <div class="rc-metrics">
                <div class="rc-metric-item">
                    <div class="rc-icon"><i class="fa-solid fa-ruler-horizontal"></i></div>
                    <span class="rc-label">Cintura</span>
                    <span class="rc-val">${req.waist ? req.waist.toFixed(1) : '-'}</span>
                </div>
                <div class="rc-metric-item">
                    <div class="rc-icon"><i class="fa-solid fa-person"></i></div>
                    <span class="rc-label">Gordura</span>
                    <span class="rc-val">${gorduraVal}</span>
                </div>
                <div class="rc-metric-item">
                    <div class="rc-icon"><i class="fa-solid fa-heart-pulse"></i></div>
                    <span class="rc-label">Risco</span>
                    <span class="rc-val">${riskVal}</span>
                </div>
            </div>
            <div class="rc-actions">
                <button class="rc-btn" onclick="editRecord(${req.id})"><i class="fa-solid fa-pen"></i> Editar</button>
                <button class="rc-btn delete" onclick="deleteRecord(${req.id})"><i class="fa-solid fa-trash"></i> Apagar</button>
            </div>
        `;
        listEl.appendChild(div);
    });
}

// Global para gráficos Chart.js
let evoChart = null;

function renderChart() {
    const canvas = document.getElementById('evolutionChart');
    if (!canvas) return;

    const records = [...appState.records].sort((a, b) => new Date(a.date) - new Date(b.date));
    const noDataEl = document.getElementById('chartNoData');

    if (records.length < 2) {
        canvas.style.display = 'none';
        noDataEl.style.display = 'block';
        return;
    }

    canvas.style.display = 'block';
    noDataEl.style.display = 'none';

    // Qual tab estamos? Weight ou Waist?
    const activeTab = document.querySelector('.tab-btn[data-chart].active').getAttribute('data-chart');
    const isWeight = activeTab === 'weight';

    // Qual periodo? (Simplificado: só pega as N ultimas)
    const period = document.querySelector('.filter-btn.active').getAttribute('data-period');
    let dataSlice = records;
    if (period === '7') dataSlice = records.slice(-7);
    if (period === '30') dataSlice = records.slice(-30);

    const labels = dataSlice.map(r => {
        const d = new Date(r.date + 'T12:00:00');
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });

    let datasetPoints = [];
    if (isWeight) {
        datasetPoints = dataSlice.map(r => r.weight);
    } else {
        // Filtrar dias q não tem cintura
        const filtered = dataSlice.filter(r => r.waist);
        if (filtered.length < 2) {
            canvas.style.display = 'none';
            noDataEl.style.display = 'block';
            if (evoChart) evoChart.destroy();
            return;
        }
        datasetPoints = filtered.map(r => r.waist);
    }

    const ctx = canvas.getContext('2d');

    if (evoChart) evoChart.destroy();

    // Gradiente para linha
    let gradient = ctx.createLinearGradient(0, 0, 0, 200);
    if (isWeight) {
        gradient.addColorStop(0, 'rgba(255, 107, 82, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 107, 82, 0.05)');
    } else {
        gradient.addColorStop(0, 'rgba(138, 43, 226, 0.4)');
        gradient.addColorStop(1, 'rgba(138, 43, 226, 0.05)');
    }

    evoChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: isWeight ? 'Peso (kg)' : 'Cintura (cm)',
                data: datasetPoints,
                borderColor: isWeight ? '#FF6B52' : '#8A2BE2',
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: isWeight ? '#FF6B52' : '#8A2BE2',
                pointBorderColor: '#FFF',
                pointBorderWidth: 2,
                pointRadius: 4,
                fill: true,
                tension: 0.4 // Smoothed curve
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// --- AÇÕES DO HISTÓRICO ---
window.editRecord = function (id) {
    const rec = appState.records.find(r => r.id === id);
    if (rec) {
        document.getElementById('recDate').value = rec.date;
        document.getElementById('recWeight').value = rec.weight;
        document.getElementById('recWaist').value = rec.waist || '';
        document.getElementById('addModal').classList.add('active');
    }
};

window.deleteRecord = function (id) {
    Swal.fire({
        title: 'Apagar registro?',
        text: "Você não poderá reverter isso.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--danger)',
        cancelButtonColor: 'var(--text-muted)',
        confirmButtonText: 'Sim, apagar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            appState.records = appState.records.filter(r => r.id !== id);
            saveData();
            Swal.fire('Apagado!', 'O registro foi removido.', 'success');
        }
    });
};

// --- MODAIS EXTRAS ---
window.openWaistModal = function () {
    document.getElementById('waistModal').classList.add('active');
};

document.getElementById('waistModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('waistModal')) {
        document.getElementById('waistModal').classList.remove('active');
    }
});

// --- BACKUP E RESTAURAÇÃO ---
function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `vitality_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if (data.profile && data.records) {
                appState = data;
                saveData();
                Swal.fire('Restaurado', 'Dados restaurados com sucesso.', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                throw new Error("Invalid Format");
            }
        } catch (err) {
            Swal.fire('Erro', 'Arquivo de backup inválido ou corrompido.', 'error');
        }
    };
    reader.readAsText(file);
}

function confirmClearData() {
    Swal.fire({
        title: 'Você tem certeza Absoluta?',
        text: "Isso apagará TODO seu histórico e perfil permanentemente. Faça um backup antes!",
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: 'var(--danger)',
        cancelButtonColor: 'var(--text-muted)',
        confirmButtonText: 'APAGAR TUDO',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem(STORAGE_KEY);
            appState = { profile: null, records: [] };
            location.reload();
        }
    });
}
