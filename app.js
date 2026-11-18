const $=s=>document.querySelector(s);
const KEY='library_desk_v1', FINE=2; // fine per late day
let db=JSON.parse(localStorage.getItem(KEY)||'null')||{books:[],members:[],loans:[]};
const save=()=>{localStorage.setItem(KEY,JSON.stringify(db));render()};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toISOString().slice(0,10);
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
const late=l=>Math.max(0,Math.floor((new Date(l.ret||today())-new Date(l.due))/864e5));
const out=id=>db.loans.filter(l=>l.book===id&&!l.ret).length;
const name=(a,id,f)=>(db[a].find(x=>x.id===id)||{})[f]||'(deleted)';
const rows=(h,msg)=>h||`<tr><td>${msg}</td></tr>`;

function loanRow(l,ret){
  const d=late(l), fine=d*FINE;
  return `<tr><td>${esc(name('books',l.book,'title'))}<small>${esc(name('members',l.member,'name'))}</small></td>
  <td>Due ${l.due}${d?`<small class="late">${d} day(s) late · fine ₹${fine}</small>`:''}</td>
  <td>${ret?`<button onclick="returnBook('${l.id}')">Return</button>`:`Returned ${l.ret}${fine?`<small>Fine ₹${fine}</small>`:''}`}</td></tr>`;
}

function render(){
  const act=db.loans.filter(l=>!l.ret), od=act.filter(l=>late(l)>0);
  $('#stats').innerHTML=[['Titles',db.books.length],['Members',db.members.length],['On loan',act.length],['Overdue',od.length]]
    .map(([a,b])=>`<div class="stat"><b>${b}</b>${a}</div>`).join('');
  $('#overdueRows').innerHTML=rows(od.map(l=>loanRow(l,true)).join(''),'Nothing overdue.');

  const q=$('#q').value.toLowerCase();
  $('#bookRows').innerHTML=rows(db.books.filter(b=>(b.title+b.author+b.isbn).toLowerCase().includes(q)).map(b=>
    `<tr><td>${esc(b.title)}<small>${esc(b.author)} ${esc(b.isbn)}</small></td><td>${b.copies-out(b.id)}/${b.copies}</td>
    <td><button class="del" onclick="delBook('${b.id}')">Delete</button></td></tr>`).join(''),'No books yet. Add one above.');

  $('#memRows').innerHTML=rows(db.members.map(m=>
    `<tr><td>${esc(m.name)}<small>${esc(m.contact)}</small></td><td>${db.loans.filter(l=>l.member===m.id&&!l.ret).length}</td>
    <td><button class="del" onclick="delMember('${m.id}')">Delete</button></td></tr>`).join(''),'No members yet. Add one above.');

  $('#selMem').innerHTML='<option value="">Select member</option>'+db.members.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
  $('#selBook').innerHTML='<option value="">Select book</option>'+db.books.filter(b=>b.copies-out(b.id)>0).map(b=>`<option value="${b.id}">${esc(b.title)}</option>`).join('');
  $('#loanRows').innerHTML=rows(act.map(l=>loanRow(l,true)).join(''),'No books on loan.');
  $('#histRows').innerHTML=rows(db.loans.filter(l=>l.ret).reverse().slice(0,50).map(l=>loanRow(l,false)).join(''),'No returns yet.');
}

window.returnBook=id=>{db.loans.find(l=>l.id===id).ret=today();save()};
window.delBook=id=>{
  if(out(id))return alert('This book is on loan. Return it first.');
  if(confirm('Delete this book?')){db.books=db.books.filter(b=>b.id!==id);save()}
};
window.delMember=id=>{
  if(db.loans.some(l=>l.member===id&&!l.ret))return alert('Member has books out. Return them first.');
  if(confirm('Delete this member?')){db.members=db.members.filter(m=>m.id!==id);save()}
};

const fd=e=>{e.preventDefault();return Object.fromEntries(new FormData(e.target))};
$('#bookForm').onsubmit=e=>{const f=fd(e);db.books.push({id:uid(),title:f.title.trim(),author:f.author.trim(),isbn:f.isbn.trim(),copies:Math.max(1,+f.copies||1)});e.target.reset();e.target.copies.value=1;save()};
$('#memForm').onsubmit=e=>{const f=fd(e);db.members.push({id:uid(),name:f.name.trim(),contact:f.contact.trim()});e.target.reset();save()};
$('#loanForm').onsubmit=e=>{
  const f=fd(e);
  if(db.loans.filter(l=>l.member===f.member&&!l.ret).length>=5)return alert('Limit reached: 5 books per member.');
  db.loans.push({id:uid(),member:f.member,book:f.book,issued:today(),due:addDays(today(),+f.days||14),ret:null});
  e.target.reset();e.target.days.value=14;save();
};
$('#q').oninput=render;

document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!==b.dataset.t);
});

$('#exp').onclick=()=>{
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));
  a.download='library-backup-'+today()+'.json';a.click();
};
$('#imp').onchange=e=>{
  const r=new FileReader();
  r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.books||!d.members||!d.loans)throw 0;db=d;save()}catch{alert('Invalid backup file.')}};
  r.readAsText(e.target.files[0]);
};
$('#sample').onclick=()=>{
  if(db.books.length&&!confirm('Add sample data to existing records?'))return;
  const b=[['The C Programming Language','Kernighan & Ritchie'],['Compilers: Principles, Techniques, and Tools','Aho, Lam, Sethi, Ullman'],['Introduction to Algorithms','Cormen et al.']];
  b.forEach(([t,a])=>db.books.push({id:uid(),title:t,author:a,isbn:'',copies:2}));
  db.members.push({id:uid(),name:'Sample Student',contact:'student@example.com'});
  save();
};
render();
