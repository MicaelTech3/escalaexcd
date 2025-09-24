// ================== Constantes de Storage ==================
const STORAGE_KEY = 'ds_scheduler_employees_v1';
const SETTINGS_KEY = 'ds_scheduler_settings_v1';

// ================== Dados Padrão ==================
const defaultEmployees = [
  { name: 'Marcela', qc: false, day: 'Seg' },
  { name: 'Leonardo', qc: false, day: 'Qua' },
  { name: 'João Pedro', qc: false, day: 'Qui' },
  { name: 'Thiago', qc: false, day: 'Qua' },
  { name: 'Jullya', qc: true, day: 'Ter' },
  { name: 'Maria Eduarda', qc: false, day: 'Qua' },
  { name: 'William', qc: true, day: 'Seg' },
  { name: 'João Felipe', qc: false, day: 'Sex' },
  { name: 'Julio', qc: true, day: 'Sex' },
  { name: 'Kauan', qc: false, day: 'Sex' },
  { name: 'Vinicius', qc: false, day: 'Ter' },
  { name: 'Marcos', qc: false, day: 'Qui' },
  { name: 'Cristian Gabriel', qc: false, day: 'Ter' },
];

// Ajuste (pedido): Simuladores 4, Xfood 2 (exige ≥1 QC), Vrs 5
const defaultSettings = {
  sectors: [
    { key: 'simuladores', label: 'Simuladores', slots: 4, requireUniqueDays: true, requireQC: false },
    { key: 'xfood', label: 'Xfood', slots: 2, requireUniqueDays: true, requireQC: true },
    { key: 'vrs', label: 'Vrs', slots: 5, requireUniqueDays: false, requireQC: false },
  ],
};

// ================== Helpers ==================
const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

function readStorage(key, fallback) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch { return fallback; }
}
function writeStorage(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

let employees = readStorage(STORAGE_KEY, defaultEmployees);
let settings  = readStorage(SETTINGS_KEY, defaultSettings);
let schedule  = null;

// ================== Render Colaboradores ==================
function renderEmployees() {
  const tb = $('#tbody-emps');
  tb.innerHTML = '';
  employees.forEach((e, i) => {
    const tr = document.createElement('tr');
    tr.className = 'border-t border-slate-700 hover:bg-slate-800';
    tr.innerHTML = `
      <td class="p-2">
        <input value="${e.name}" data-i="${i}" data-k="name"
          class="w-full bg-transparent border border-transparent focus:border-slate-600 rounded p-1" />
      </td>
      <td class="p-2 text-center">
        <input type="checkbox" ${e.qc ? 'checked' : ''} data-i="${i}" data-k="qc" class="accent-emerald-500" />
      </td>
      <td class="p-2 text-center">
        <select data-i="${i}" data-k="day" class="bg-slate-900 border border-slate-700 p-1 rounded">
          ${['Seg','Ter','Qua','Qui','Sex'].map(d => `<option ${e.day===d?'selected':''}>${d}</option>`).join('')}
        </select>
      </td>
      <td class="p-2 text-right">
        <button data-i="${i}" class="btn-del px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-xs">Remover</button>
      </td>`;
    tb.appendChild(tr);
  });
}

function attachEmpHandlers() {
  $('#tbody-emps').addEventListener('change', (ev) => {
    const i = ev.target.getAttribute('data-i');
    const k = ev.target.getAttribute('data-k');
    if (i == null || !k) return;
    const v = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
    employees[i][k] = v;
    writeStorage(STORAGE_KEY, employees);
  });
  $('#tbody-emps').addEventListener('click', (ev) => {
    if (ev.target.classList.contains('btn-del')) {
      const i = +ev.target.getAttribute('data-i');
      if (confirm('Remover ' + employees[i].name + '?')) {
        employees.splice(i, 1);
        writeStorage(STORAGE_KEY, employees);
        renderEmployees();
      }
    }
  });
}

// ================== Render Configurações ==================
function renderSettings() {
  const box = $('#sectors-box');
  box.innerHTML = '';
  settings.sectors.forEach((s, idx) => {
    const el = document.createElement('div');
    el.className = 'p-3 rounded-lg bg-slate-900 border border-slate-700';
    el.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <div class="font-semibold">${s.label}</div>
          <div class="text-xs text-slate-400">Chave: ${s.key}</div>
        </div>
        <div class="flex items-center gap-3">
          <label class="text-sm flex items-center gap-2">
            <input type="checkbox" ${s.requireUniqueDays?'checked':''} data-idx="${idx}" data-k="requireUniqueDays" class="accent-blue-500"/>
            Sem folga repetida
          </label>
          <label class="text-sm flex items-center gap-2">
            <input type="checkbox" ${s.requireQC?'checked':''} data-idx="${idx}" data-k="requireQC" class="accent-blue-500"/>
            Exigir ≥1 QC
          </label>
          <label class="text-sm">
            Slots
            <input type="number" min="0" value="${s.slots}" data-idx="${idx}" data-k="slots"
              class="w-16 ml-1 p-1 rounded bg-slate-800 border border-slate-700"/>
          </label>
        </div>
      </div>`;
    box.appendChild(el);
  });

  // Importante: sem { once: true } — permite editar quantas vezes quiser
  box.addEventListener('change', (ev) => {
    const idx = ev.target.getAttribute('data-idx');
    const k   = ev.target.getAttribute('data-k');
    if (idx == null || !k) return;
    let v = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
    if (k === 'slots') v = Math.max(0, parseInt(v || 0));
    settings.sectors[idx][k] = v;
    writeStorage(SETTINGS_KEY, settings);
  });
}

// ================== Lógica de Sorteio ==================
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateSchedule(employees, settings) {
  const pool = [...employees];
  const maxAttempts = 2500;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shuffled = shuffle(pool);
    const result = {};
    let ok = true;

    for (const s of settings.sectors) {
      const picked = [];
      for (let i = 0; i < shuffled.length && picked.length < s.slots; i++) {
        const p = shuffled[i];
        // Sem duplicar pessoa em setores diferentes
        if (Object.values(result).flat().some(x => x.name === p.name)) continue;
        // Dias únicos no setor, se exigido
        if (s.requireUniqueDays && picked.some(x => x.day === p.day)) continue;
        picked.push(p);
      }

      // slots não preenchidos
      if (picked.length < s.slots) { ok = false; break; }

      // Exigir pelo menos 1 QC, se existir QC no pool
      if (s.requireQC) {
        const hasQC = picked.some(x => x.qc);
        const anyQC = pool.some(x => x.qc);
        if (!hasQC && anyQC) {
          // tentar forçar 1 QC mantendo regras
          const replacement = shuffled.find(x =>
            x.qc &&
            !Object.values(result).flat().some(y => y.name === x.name) &&
            !picked.some(y => y.name === x.name) &&
            (!s.requireUniqueDays || !picked.some(y => y.day === x.day))
          );
          if (replacement) picked[picked.length - 1] = replacement;
        }
        if (!picked.some(x => x.qc) && anyQC) { ok = false; break; }
      }

      result[s.key] = picked;
    }

    if (!ok) continue;

    // Garantia extra: ninguém repetido entre setores
    const names = Object.values(result).flat().map(p => p.name);
    if (new Set(names).size !== names.length) continue;

    return result;
  }
  return null;
}

// ================== Render Resultado ==================
function renderResult() {
  const box = $('#result');
  box.innerHTML = '';
  if (!schedule) {
    box.innerHTML = '<div class="text-slate-400 text-sm">Ainda não gerou escala.</div>';
    return;
  }
  settings.sectors.forEach(s => {
    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl bg-slate-900 border border-slate-700';
    const list = schedule[s.key] || [];
    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold">${s.label} <span class="chip bg-slate-700 ml-2">${s.slots}</span></h3>
        <div class="text-xs text-slate-400">
          ${s.requireUniqueDays ? 'Sem folga repetida' : ''} ${s.requireQC ? ' • Exige QC' : ''}
        </div>
      </div>
      <ul class="space-y-1">
        ${list.map(p => `
          <li class="flex items-center justify-between">
            <span>${p.name}</span>
            <span class="text-xs text-slate-400">${p.qc ? '<span class="text-emerald-400">QC</span> • ' : ''}${p.day}</span>
          </li>`).join('')}
      </ul>`;
    box.appendChild(card);
  });
}

// ================== Exportar PDF (Completo SEMPRE) ==================
function exportPDF() {
  if (!schedule) { alert('Gere a escala antes.'); return; }
  // jsPDF garantido global por index.html (window.jsPDF = window.jspdf.jsPDF)
  const jsPDF = window.jsPDF;
  if (!jsPDF) { alert('jsPDF não encontrado.'); return; }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  // Cabeçalho
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dataStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const drawHeader = (title) => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 64, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(title, 40, 40);
    doc.setFontSize(10);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(`Gerado em ${dataStr}`, doc.internal.pageSize.getWidth() - 40, 40, { align: 'right' });
    doc.setTextColor(15, 23, 42);
  };

  const drawFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      doc.text(`Página ${i} de ${pageCount}`, w - 40, h - 20, { align: 'right' });
    }
    doc.setTextColor(15, 23, 42);
  };

  // Conteúdo — uma tabela por setor
  drawHeader('Escala — Completa');

  let yStart = 80;
  settings.sectors.forEach((s, idx) => {
    const list = (schedule[s.key] || []).map((p, i) => ({
      Ordem: i + 1,
      Nome: p.name,
      QC: p.qc ? 'QC' : '',
      Folga: p.day
    }));

    if (idx > 0 && yStart + 120 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      drawHeader('Escala — Completa');
      yStart = 80;
    }

    doc.setFontSize(12); doc.setTextColor(30, 41, 59);
    doc.text(
      `${s.label}  •  Slots: ${s.slots}  ${s.requireUniqueDays ? '• Sem folga repetida' : ''} ${s.requireQC ? '• Exige QC' : ''}`,
      28, yStart
    );

    doc.autoTable({
      startY: yStart + 10,
      head: [["Ordem", "Nome", "QC", "Folga"]],
      body: list.map(r => [r.Ordem, r.Nome, r.QC, r.Folga]),
      styles: { fontSize: 10, cellPadding: 6, lineColor: [226,232,240], lineWidth: 0.5 },
      headStyles: { fillColor: [30,41,59], textColor: 255, halign: 'left' },
      alternateRowStyles: { fillColor: [248,250,252] },
      bodyStyles: { textColor: [15,23,42] },
      margin: { top: 72, right: 28, bottom: 40, left: 28 },
    });

    yStart = doc.lastAutoTable.finalY + 24;
    if (yStart > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      drawHeader('Escala — Completa');
      yStart = 80;
    }
  });

  drawFooter();
  doc.save('escala_completa.pdf');
}

// ================== Handlers UI ==================
$('#btn-add').addEventListener('click', () => {
  const name = $('#inp-name').value.trim();
  const day  = $('#sel-day').value;
  const qc   = $('#chk-qc').checked;
  if (!name) return alert('Nome é obrigatório');
  employees.push({ name, qc, day });
  writeStorage(STORAGE_KEY, employees);
  $('#inp-name').value = ''; $('#chk-qc').checked = false; $('#sel-day').value = 'Seg';
  renderEmployees();
});

$('#btn-reset-defaults').addEventListener('click', () => {
  if (!confirm('Resetar colaboradores e configurações para o padrão?')) return;
  employees = JSON.parse(JSON.stringify(defaultEmployees));
  settings  = JSON.parse(JSON.stringify(defaultSettings));
  writeStorage(STORAGE_KEY, employees);
  writeStorage(SETTINGS_KEY, settings);
  schedule = null;
  renderEmployees(); renderSettings(); renderResult();
});

$('#btn-generate').addEventListener('click', () => {
  const res = generateSchedule(employees, settings);
  if (!res) { alert('Não foi possível gerar com as regras atuais. Ajuste slots/regras ou colaboradores.'); return; }
  schedule = res; renderResult();
});

$('#btn-export').addEventListener('click', () => exportPDF());

// ================== Init ==================
renderEmployees();
attachEmpHandlers();
renderSettings();
renderResult();
