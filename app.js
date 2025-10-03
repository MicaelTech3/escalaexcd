// ================== Constantes de Storage ==================
const STORAGE_KEY = 'ds_scheduler_employees_v1';
const SETTINGS_KEY = 'ds_scheduler_settings_v1';

// ================== Dados Padrão ==================
const defaultEmployees = [
  { name: 'Marcela', qc: false, day: 'Seg' },
  { name: 'Leonardo', qc: false, day: 'Qua' },
  { name: 'João Pedro', qc: false, day: 'Qui' },
  { name: 'Thiago', qc: false, day: 'Qua' },
  { name: 'Jullya', qc: true,  day: 'Ter' },
  { name: 'Maria Eduarda', qc: false, day: 'Qua' },
  { name: 'William', qc: true, day: 'Seg' },
  { name: 'João Felipe', qc: false, day: 'Sex' },
  { name: 'Julio', qc: true, day: 'Sex' },
  { name: 'Kauan', qc: false, day: 'Sex' },
  { name: 'Vinicius', qc: false, day: 'Ter' },
  { name: 'Marcos', qc: false, day: 'Qui' },
  { name: 'Cristian Gabriel', qc: false, day: 'Ter' },
];

// Ajuste: Simuladores 4, Xfood 2 (exige ≥1 QC), Vrs 5
const defaultSettings = {
  sectors: [
    { key: 'simuladores', label: 'Simuladores', slots: 4, requireUniqueDays: true, requireQC: false },
    { key: 'xfood',       label: 'Xfood',       slots: 2, requireUniqueDays: true, requireQC: true  },
    { key: 'vrs',         label: 'Vrs',         slots: 5, requireUniqueDays: false, requireQC: false },
  ],
};

// ================== Helpers ==================
const $  = (q) => document.querySelector(q);
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
    tr.innerHTML = `
      <td>
        <input value="${e.name}" data-i="${i}" data-k="name" />
      </td>
      <td class="t-center">
        <input type="checkbox" ${e.qc ? 'checked' : ''} data-i="${i}" data-k="qc" />
      </td>
      <td>
        <select data-i="${i}" data-k="day">
          ${['Seg','Ter','Qua','Qui','Sex'].map(d => `<option ${e.day===d?'selected':''}>${d}</option>`).join('')}
        </select>
      </td>
      <td class="t-right">
        <button data-i="${i}" class="btn-sm btn-secondary btn-del">Remover</button>
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
    el.className = 'box';
    el.innerHTML = `
      <div class="row">
        <div>
          <div style="font-weight:600">${s.label}</div>
          <div style="font-size:12px;color:#9fb0d3">Chave: ${s.key}</div>
        </div>
        <div class="row">
          <label>
            <input type="checkbox" ${s.requireUniqueDays?'checked':''} data-idx="${idx}" data-k="requireUniqueDays"/>
            Sem folga repetida
          </label>
          <label>
            <input type="checkbox" ${s.requireQC?'checked':''} data-idx="${idx}" data-k="requireQC"/>
            Exigir ≥1 QC
          </label>
          <label>
            Staff
            <input type="number" min="0" value="${s.slots}" data-idx="${idx}" data-k="slots"/>
          </label>
        </div>
      </div>`;
    box.appendChild(el);
  });

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
        if (Object.values(result).flat().some(x => x.name === p.name)) continue;      // sem duplicar
        if (s.requireUniqueDays && picked.some(x => x.day === p.day)) continue;       // dias únicos
        picked.push(p);
      }

      if (picked.length < s.slots) { ok = false; break; }

      if (s.requireQC) {
        const hasQC = picked.some(x => x.qc);
        const anyQC = pool.some(x => x.qc);
        if (!hasQC && anyQC) {
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
    box.innerHTML = '<div class="hint">Ainda não gerou escala.</div>';
    return;
  }
  settings.sectors.forEach(s => {
    const list = schedule[s.key] || [];
    const card = document.createElement('div');
    card.className = 'card-list';
    card.innerHTML = `
      <div class="title">
        <div><strong>${s.label}</strong> <span class="chip">Staff: ${s.slots}</span></div>
        <div style="font-size:12px;color:#9fb0d3">
          ${s.requireUniqueDays ? 'Sem folga repetida' : ''} ${s.requireQC ? ' • Exige QC' : ''}
        </div>
      </div>
      <ul>
        ${list.map(p => `
          <li>
            <span>${p.name}</span>
            <span style="font-size:12px;color:#9fb0d3">${p.qc ? '<span style="color:#34d399">QC</span> • ' : ''}${p.day}</span>
          </li>`).join('')}
      </ul>`;
    box.appendChild(card);
  });
}

// ================== Exportar PDF (COMO NA IMAGEM) ==================
function exportPDF() {
  if (!schedule) { alert('Gere a escala antes.'); return; }

  // jsPDF UMD (2.5+)
  const jsPDF = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
  if (!jsPDF) { alert('jsPDF não encontrado.'); return; }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  // Monta uma lista única de linhas: Setor | Nome | Folga (+ qc para destaque)
  const rows = [];
  settings.sectors.forEach(s => {
    (schedule[s.key] || []).forEach(p => {
      rows.push({ setor: s.label, nome: p.name, folga: p.day, qc: !!p.qc });
    });
  });

  // Cabeçalho
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dataStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // Faixa superior
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('Escala — Completa', 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(`Gerado em ${dataStr}`, doc.internal.pageSize.getWidth() - 40, 40, { align: 'right' });

  // Estilos “da imagem”
  const headerBlue = [0, 45, 114];      // azul cabeçalho
  const zebraGray  = [238, 238, 238];   // listrado
  const lineColor  = [60, 60, 60];      // borda discreta
  const qcGreen    = [170, 230, 180];   // verde destaque (QC)

  doc.autoTable({
    startY: 84,
    head: [['Setor', 'Nome', 'Folga']],
    body: rows.map(r => [r.setor, r.nome, r.folga]),
    styles: {
      fontSize: 11,
      cellPadding: { top: 6, right: 10, bottom: 6, left: 10 },
      lineColor,
      lineWidth: 0.4,
      textColor: [0, 0, 0],
      halign: 'left',
      valign: 'middle'
    },
    headStyles: {
      fillColor: headerBlue,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineColor,
      lineWidth: 0.6
    },
    alternateRowStyles: { fillColor: zebraGray },
    bodyStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 150 },     // Setor
      1: { cellWidth: 'auto' },  // Nome
      2: { cellWidth: 80, halign: 'center' } // Folga
    },
    margin: { top: 72, right: 28, bottom: 60, left: 28 },

    // Linha inteira verde quando QC = true
    didParseCell: function (data) {
      if (data.section === 'body') {
        const idx = data.row.index;
        if (rows[idx].qc) data.cell.styles.fillColor = qcGreen;
      }
    },

    // Rodapé com paginação
    didDrawPage: function (data) {
      const total = doc.getNumberOfPages();
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Página ${data.pageNumber} de ${total}`,
        doc.internal.pageSize.getWidth() - 40,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'right' });
    }
  });

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
  if (!res) { alert('Não foi possível gerar com as regras atuais. Ajuste Staff/regras ou colaboradores.'); return; }
  schedule = res; renderResult();
});

$('#btn-export').addEventListener('click', () => exportPDF());

// ================== Init ==================
renderEmployees();
attachEmpHandlers();
renderSettings();
renderResult();
