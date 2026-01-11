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

// ================== Configuração de Setores ==================
const defaultSettings = {
  sectors: [
    { key: 'simuladores', label: 'Simuladores', slots: 4, requireUniqueDays: true,  requireQC: false },
    { key: 'g1',          label: 'G1',          slots: 2, requireUniqueDays: true,  requireQC: true  }, // Xfood → G1
    { key: 'vrs',         label: 'Vrs',         slots: 5, requireUniqueDays: false, requireQC: false },
  ],
};

// ================== Helpers ==================
const $ = (q) => document.querySelector(q);

function readStorage(key, fallback) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

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
      <td class="p-2">
        <input value="${e.name}" data-i="${i}" data-k="name"
          class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1" />
      </td>

      <td class="p-2 text-center">
        <input type="checkbox" ${e.qc ? 'checked' : ''} data-i="${i}" data-k="qc" />
      </td>

      <td class="p-2">
        <select data-i="${i}" data-k="day"
          class="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-full">
          ${['Seg','Ter','Qua','Qui','Sex'].map(d =>
            `<option ${e.day === d ? 'selected' : ''}>${d}</option>`
          ).join('')}
        </select>
      </td>

      <td class="p-2 text-right">
        <button data-i="${i}" class="btn-sm btn-del">Remover</button>
      </td>
    `;

    tb.appendChild(tr);
  });
}

function attachEmpHandlers() {
  $('#tbody-emps').addEventListener('change', (ev) => {
    const i = ev.target.getAttribute('data-i');
    const k = ev.target.getAttribute('data-k');
    if (i == null || !k) return;

    const v = ev.target.type === 'checkbox'
      ? ev.target.checked
      : ev.target.value;

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
      <div class="flex justify-between items-center gap-2">
        <div>
          <div class="font-semibold">${s.label}</div>
          <div class="text-xs text-slate-400">Chave: ${s.key}</div>
        </div>

        <div class="flex gap-3 text-sm">
          <label>
            <input type="checkbox" ${s.requireUniqueDays ? 'checked' : ''}
              data-idx="${idx}" data-k="requireUniqueDays" />
            Dias únicos
          </label>

          <label>
            <input type="checkbox" ${s.requireQC ? 'checked' : ''}
              data-idx="${idx}" data-k="requireQC" />
            Exige lugar fixo
          </label>

          <label>
            Staff
            <input type="number" min="0" value="${s.slots}"
              data-idx="${idx}" data-k="slots"
              class="w-16 bg-slate-900 border border-slate-700 rounded px-1" />
          </label>
        </div>
      </div>
    `;

    box.appendChild(el);
  });

  box.addEventListener('change', (ev) => {
    const idx = ev.target.getAttribute('data-idx');
    const k   = ev.target.getAttribute('data-k');
    if (idx == null || !k) return;

    let v = ev.target.type === 'checkbox'
      ? ev.target.checked
      : parseInt(ev.target.value || 0);

    settings.sectors[idx][k] = v;
    writeStorage(SETTINGS_KEY, settings);
  });
}

// ================== Sorteio ==================
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

  for (let attempt = 0; attempt < 2500; attempt++) {
    const shuffled = shuffle(pool);
    const result = {};
    let ok = true;

    for (const s of settings.sectors) {
      const picked = [];

      for (const p of shuffled) {
        if (picked.length >= s.slots) break;
        if (Object.values(result).flat().some(x => x.name === p.name)) continue;
        if (s.requireUniqueDays && picked.some(x => x.day === p.day)) continue;
        picked.push(p);
      }

      if (picked.length < s.slots) { ok = false; break; }

      if (s.requireQC && !picked.some(x => x.qc)) {
        ok = false;
        break;
      }

      result[s.key] = picked;
    }

    if (!ok) continue;
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
      <div class="font-semibold mb-1">
        ${s.label} <span class="chip">Staff: ${s.slots}</span>
      </div>

      <ul>
        ${list.map(p => `
          <li class="flex justify-between">
            <span>${p.name}</span>
            <span class="text-xs text-slate-400">
              ${p.qc ? '<span class="text-emerald-400">Lugar fixo</span> • ' : ''}
              ${p.day}
            </span>
          </li>
        `).join('')}
      </ul>
    `;

    box.appendChild(card);
  });
}

// ================== Exportar PDF ==================
function exportPDF() {
  if (!schedule) return alert('Gere a escala antes.');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const rows = [];
  settings.sectors.forEach(s => {
    (schedule[s.key] || []).forEach(p => {
      rows.push({ setor: s.label, nome: p.name, folga: p.day, qc: p.qc });
    });
  });

  doc.text('Escala Completa', 40, 40);

  doc.autoTable({
    startY: 60,
    head: [['Setor', 'Nome', 'Folga']],
    body: rows.map(r => [r.setor, r.nome, r.folga]),
    didParseCell(data) {
      if (data.section === 'body' && rows[data.row.index].qc) {
        data.cell.styles.fillColor = [170, 230, 180];
      }
    }
  });

  doc.save('escala_completa.pdf');
}

// ================== Eventos ==================
$('#btn-generate').onclick = () => {
  const res = generateSchedule(employees, settings);
  if (!res) return alert('Não foi possível gerar escala.');
  schedule = res;
  renderResult();
};

$('#btn-export').onclick = exportPDF;

// ================== Init ==================
renderEmployees();
attachEmpHandlers();
renderSettings();
renderResult();
