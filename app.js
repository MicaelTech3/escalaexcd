const STORAGE_KEY = 'ds_scheduler_employees_v1';
const SETTINGS_KEY = 'ds_scheduler_settings_v1';

const defaultEmployees = [
  { name:'Marcela', qc:false, fixed:'', day:'Seg' },
  { name:'Thiago', qc:false, fixed:'', day:'Qua' },
  { name:'Jullya', qc:true,  fixed:'G1', day:'Ter' },
  { name:'João Felipe', qc:false, fixed:'', day:'Sex' },
  { name:'Marcos', qc:false, fixed:'', day:'Qui' },
];

const defaultSettings = {
  sectors:[
    { key:'simuladores', label:'Simuladores', slots:4, requireUniqueDays:true, requireQC:false },
    { key:'g1',          label:'G1',          slots:2, requireUniqueDays:true, requireQC:true },
    { key:'vrs',         label:'Vrs',         slots:5, requireUniqueDays:false, requireQC:false },
  ]
};

const $ = q => document.querySelector(q);

let employees = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultEmployees;
let settings  = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || defaultSettings;
let schedule  = null;

/* ================= RENDER COLABORADORES ================= */
function renderEmployees(){
  const tb = $('#tbody-emps');
  tb.innerHTML = '';

  employees.forEach((e,i)=>{
    tb.innerHTML += `
      <tr>
        <td><input class="input" value="${e.name}" data-i="${i}" data-k="name"></td>
        <td><input type="checkbox" ${e.qc?'checked':''} data-i="${i}" data-k="qc"></td>
        <td>
          <select class="input" data-i="${i}" data-k="fixed">
            <option value="">—</option>
            ${['Arenas','Simuladores','G1','Vrs'].map(s =>
              `<option ${e.fixed===s?'selected':''}>${s}</option>`
            ).join('')}
          </select>
        </td>
        <td>
          <select class="input" data-i="${i}" data-k="day">
            ${['Seg','Ter','Qua','Qui','Sex'].map(d =>
              `<option ${e.day===d?'selected':''}>${d}</option>`
            ).join('')}
          </select>
        </td>
        <td><button data-i="${i}" class="del">❌</button></td>
      </tr>
    `;
  });
}

$('#tbody-emps').addEventListener('change', e=>{
  const i = e.target.dataset.i;
  const k = e.target.dataset.k;
  if(i!=null){
    employees[i][k] = e.target.type==='checkbox' ? e.target.checked : e.target.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
  }
});

$('#tbody-emps').addEventListener('click', e=>{
  if(e.target.classList.contains('del')){
    employees.splice(e.target.dataset.i,1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    renderEmployees();
  }
});

/* ================= CONFIG SETORES ================= */
function renderSettings(){
  const box = $('#sectors-box');
  box.innerHTML = '';
  settings.sectors.forEach((s,i)=>{
    box.innerHTML += `
      <div class="card-list">
        <strong>${s.label}</strong><br>
        Staff:
        <input type="number" min="0" value="${s.slots}" data-i="${i}" data-k="slots" class="input w-16">
      </div>
    `;
  });

  box.onchange = e=>{
    const i = e.target.dataset.i;
    const k = e.target.dataset.k;
    if(i!=null){
      settings.sectors[i][k] = parseInt(e.target.value);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  };
}

/* ================= SORTEIO ================= */
function shuffle(a){
  return [...a].sort(()=>Math.random()-0.5);
}

function generateSchedule(){
  const pool = shuffle(employees);
  const res = {};

  settings.sectors.forEach(s=>{
    res[s.key] = [];
    pool.forEach(p=>{
      if(res[s.key].length < s.slots &&
         !Object.values(res).flat().includes(p)){
        res[s.key].push(p);
      }
    });
  });

  return res;
}

/* ================= RESULTADO ================= */
function renderResult(){
  const box = $('#result');
  box.innerHTML = '';
  if(!schedule) return;

  settings.sectors.forEach(s=>{
    const list = schedule[s.key] || [];
    box.innerHTML += `
      <div class="card-list">
        <strong>${s.label}</strong>
        <ul>
          ${list.map(p=>`
            <li>
              ${p.name}
              <span class="chip">
                ${p.qc ? p.fixed : '—'} • ${p.day}
              </span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  });
}

/* ================= BOTÕES ================= */
$('#btn-add').onclick = ()=>{
  employees.push({
    name: $('#inp-name').value,
    qc: $('#chk-qc').checked,
    fixed: $('#sel-fixed').value,
    day: $('#sel-day').value
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
  renderEmployees();
};

$('#btn-generate').onclick = ()=>{
  schedule = generateSchedule();
  renderResult();
};

$('#btn-export').onclick = ()=>{
  if(!schedule) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('Escala',14,16);

  const rows = [];
  settings.sectors.forEach(s=>{
    (schedule[s.key]||[]).forEach(p=>{
      rows.push([s.label,p.name,p.day]);
    });
  });

  doc.autoTable({
    startY:24,
    head:[['Setor','Nome','Folga']],
    body:rows
  });

  doc.save('escala.pdf');
};

/* ================= INIT ================= */
renderEmployees();
renderSettings();
