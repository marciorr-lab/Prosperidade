import { useState, useMemo, useEffect } from “react”;
import { initializeApp } from “https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js”;
import {
getFirestore, collection, addDoc, deleteDoc, doc,
onSnapshot, query, orderBy
} from “https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js”;

// ── Firebase config ────────────────────────────────────
const firebaseConfig = {
apiKey: “AIzaSyDKDA2vGuDb55PNfZ9H7Icb5mterbyIM1c”,
authDomain: “controle-financeiro-2d108.firebaseapp.com”,
projectId: “controle-financeiro-2d108”,
storageBucket: “controle-financeiro-2d108.firebasestorage.app”,
messagingSenderId: “410695463761”,
appId: “1:410695463761:web:cfb273305c39cb309e5970”
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ── Constants ──────────────────────────────────────────
const CATEGORIES = [
{ id:“mercado”,     label:“🛒 Mercado”,     color:”#4ade80” },
{ id:“alimentacao”, label:“🍽️ Alimentação”, color:”#fb923c” },
{ id:“educacao”,    label:“📚 Educação”,     color:”#60a5fa” },
{ id:“saude”,       label:“🏥 Saúde”,        color:”#f472b6” },
{ id:“transporte”,  label:“🚗 Transporte”,   color:”#a78bfa” },
{ id:“lazer”,       label:“🎉 Lazer”,        color:”#fbbf24” },
{ id:“roupas”,      label:“👕 Roupas”,       color:”#34d399” },
{ id:“casa”,        label:“🏠 Casa”,         color:”#f87171” },
{ id:“assinaturas”, label:“📱 Assinaturas”,  color:”#38bdf8” },
{ id:“outros”,      label:“📦 Outros”,       color:”#94a3b8” },
];

const INCOME_TYPES = [
{ id:“salario”,   label:“💼 Salário”,      color:”#4ade80” },
{ id:“freelance”, label:“🛠️ Freelance”,    color:”#60a5fa” },
{ id:“reembolso”, label:“↩️ Reembolso”,    color:”#fbbf24” },
{ id:“bonus”,     label:“🏆 Bônus”,        color:”#fb923c” },
{ id:“aluguel”,   label:“🏘️ Aluguel rec.”, color:”#a78bfa” },
{ id:“dividendo”, label:“📈 Dividendo”,    color:”#34d399” },
{ id:“presente”,  label:“🎁 Presente”,     color:”#f472b6” },
{ id:“outro”,     label:“📦 Outro”,        color:”#94a3b8” },
];

const PAYMENT_METHODS = [
{ id:“corrente”, label:“🏦 Conta Corrente” },
{ id:“card1”,    label:“💳 Cartão 1” },
{ id:“card2”,    label:“💳 Cartão 2” },
{ id:“card3”,    label:“💳 Cartão 3” },
];

const PERSONS = [
{ id:“p1”, avatar:“👤”, color:”#7c6af7” },
{ id:“p2”, avatar:“👤”, color:”#f472b6” },
];

const MONTHS = [“Jan”,“Fev”,“Mar”,“Abr”,“Mai”,“Jun”,“Jul”,“Ago”,“Set”,“Out”,“Nov”,“Dez”];
const now = new Date();

const fmt = (v) => v.toLocaleString(“pt-BR”,{style:“currency”,currency:“BRL”});
const IS = { background:”#1a1a24”, border:“1.5px solid #2a2a3a”, borderRadius:10, padding:“12px 14px”, color:”#f0ede8”, fontSize:14, fontFamily:”‘Georgia’,serif”, outline:“none”, width:“100%”, boxSizing:“border-box” };
const SS = { background:”#1a1a24”, border:“1.5px solid #2a2a3a”, borderRadius:8, padding:“8px 10px”, color:”#f0ede8”, fontSize:12, fontFamily:”‘Georgia’,serif”, outline:“none”, cursor:“pointer” };
const CS = (bg, border) => ({ background:bg, border:`1px solid ${border}33`, borderRadius:12, padding:“14px” });

function BalancePill({ income, expense }) {
const bal = income - expense;
const pos = bal >= 0;
return (
<div style={{background:pos?”#14532d”:”#2d0f0f”,border:`1px solid ${pos?"#4ade80":"#f87171"}`,borderRadius:12,padding:“10px 14px”,display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:14}}>
<div>
<div style={{fontSize:10,color:pos?”#4ade80”:”#f87171”,letterSpacing:1}}>SALDO DO MÊS</div>
<div style={{fontSize:20,fontWeight:“bold”,color:pos?”#4ade80”:”#f87171”,marginTop:2}}>{fmt(bal)}</div>
</div>
<div style={{textAlign:“right”,fontSize:11,color:”#6b6b8a”,lineHeight:1.8}}>
<div>↑ Entradas: <span style={{color:”#4ade80”}}>{fmt(income)}</span></div>
<div>↓ Saídas: <span style={{color:”#f87171”}}>{fmt(expense)}</span></div>
</div>
</div>
);
}

function Spinner() {
return (
<div style={{display:“flex”,flexDirection:“column”,alignItems:“center”,justifyContent:“center”,height:200,gap:14}}>
<div style={{width:36,height:36,border:“3px solid #2a2a3a”,borderTop:“3px solid #7c6af7”,borderRadius:“50%”,animation:“spin 0.8s linear infinite”}}/>
<div style={{color:”#6b6b8a”,fontSize:13}}>Sincronizando com a nuvem…</div>
<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
</div>
);
}

// ══════════════════════════════════════════════════════
export default function App() {
const [expenses,  setExpenses]  = useState([]);
const [incomes,   setIncomes]   = useState([]);
const [invest,    setInvest]    = useState({ accounts:[], contributions:[] });
const [loading,   setLoading]   = useState(true);
const [syncing,   setSyncing]   = useState(false);

const [tab,        setTab]       = useState(“add”);
const [entryMode,  setEntryMode] = useState(“expense”);
const [selMonth,   setSelMonth]  = useState(now.getMonth());
const [selYear]                  = useState(now.getFullYear());
const [names,      setNames]     = useState({p1:“Você”, p2:“Parceiro(a)”});
const [editNames,  setEditNames] = useState(false);

const [ef,  setEf]  = useState({description:””,amount:””,category:“mercado”,paymentMethod:“corrente”,person:“p1”,date:now.toISOString().split(“T”)[0]});
const [inf, setInf] = useState({description:””,amount:””,type:“salario”,person:“p1”,date:now.toISOString().split(“T”)[0]});
const [ok,  setOk]  = useState(””);

const [fCat,  setFCat]  = useState(“all”);
const [fPm,   setFPm]   = useState(“all”);
const [fPer,  setFPer]  = useState(“all”);
const [fType, setFType] = useState(“all”);

const [invForm, setInvForm] = useState({accountId:””,amount:””,month:now.getMonth(),year:now.getFullYear()});
const [newAcc,  setNewAcc]  = useState({name:””,institution:””,balance:””});
const [showAcc, setShowAcc] = useState(false);
const [invOk,   setInvOk]   = useState(””);

const flash = (msg) => { setOk(msg); setTimeout(()=>setOk(””),2200); };
const flashInv = (msg) => { setInvOk(msg); setTimeout(()=>setInvOk(””),2200); };

// ── Firebase listeners ─────────────────────────────
useEffect(() => {
let count = 0;
const done = () => { count++; if(count>=3) setLoading(false); };

```
const unsubExp = onSnapshot(query(collection(db,"expenses"),orderBy("date","desc")), snap => {
  setExpenses(snap.docs.map(d=>({id:d.id,...d.data()})));
  done();
});

const unsubInc = onSnapshot(query(collection(db,"incomes"),orderBy("date","desc")), snap => {
  setIncomes(snap.docs.map(d=>({id:d.id,...d.data()})));
  done();
});

const unsubInv = onSnapshot(collection(db,"investments"), snap => {
  const data = snap.docs.map(d=>({id:d.id,...d.data()}));
  const accs  = data.filter(d=>d.type==="account");
  const conts = data.filter(d=>d.type==="contribution");
  setInvest({accounts:accs, contributions:conts});
  done();
});

return () => { unsubExp(); unsubInc(); unsubInv(); };
```

}, []);

// ── Expense memos ──────────────────────────────────
const monthExp = useMemo(()=>expenses.filter(e=>e.month===selMonth&&e.year===selYear),[expenses,selMonth,selYear]);
const totalExp = monthExp.reduce((s,e)=>s+e.amount,0);
const filteredExp = useMemo(()=>monthExp.filter(e=>(fCat===“all”||e.category===fCat)&&(fPm===“all”||e.paymentMethod===fPm)&&(fPer===“all”||e.person===fPer)).sort((a,b)=>b.date?.localeCompare(a.date)),[monthExp,fCat,fPm,fPer]);
const byCat  = useMemo(()=>{const m={};monthExp.forEach(e=>{m[e.category]=(m[e.category]||0)+e.amount});return CATEGORIES.map(c=>({…c,total:m[c.id]||0})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);},[monthExp]);
const byCard = useMemo(()=>{const m={};monthExp.forEach(e=>{m[e.paymentMethod]=(m[e.paymentMethod]||0)+e.amount});return PAYMENT_METHODS.map(p=>({…p,total:m[p.id]||0}));},[monthExp]);
const byPersonExp = useMemo(()=>PERSONS.map(p=>({…p,label:names[p.id],total:monthExp.filter(e=>e.person===p.id).reduce((s,e)=>s+e.amount,0)})),[monthExp,names]);

// ── Income memos ───────────────────────────────────
const monthInc = useMemo(()=>incomes.filter(i=>i.month===selMonth&&i.year===selYear),[incomes,selMonth,selYear]);
const totalInc = monthInc.reduce((s,i)=>s+i.amount,0);
const filteredInc = useMemo(()=>monthInc.filter(i=>(fPer===“all”||i.person===fPer)&&(fType===“all”||i.type===fType)).sort((a,b)=>b.date?.localeCompare(a.date)),[monthInc,fPer,fType]);
const byPersonInc = useMemo(()=>PERSONS.map(p=>({…p,label:names[p.id],total:monthInc.filter(i=>i.person===p.id).reduce((s,i)=>s+i.amount,0)})),[monthInc,names]);
const byType = useMemo(()=>{const m={};monthInc.forEach(i=>{m[i.type]=(m[i.type]||0)+i.amount});return INCOME_TYPES.map(t=>({…t,total:m[t.id]||0})).filter(t=>t.total>0).sort((a,b)=>b.total-a.total);},[monthInc]);

// ── Compare memos ──────────────────────────────────
const prevM   = selMonth===0?11:selMonth-1;
const prevY   = selMonth===0?selYear-1:selYear;
const prevExp = expenses.filter(e=>e.month===prevM&&e.year===prevY);
const prevInc = incomes.filter(i=>i.month===prevM&&i.year===prevY);
const prevT   = prevExp.reduce((s,e)=>s+e.amount,0);
const prevBC  = useMemo(()=>{const m={};prevExp.forEach(e=>{m[e.category]=(m[e.category]||0)+e.amount});return m;},[prevExp]);
const diff    = totalExp-prevT;
const diffP   = prevT>0?((diff/prevT)*100).toFixed(1):null;

// ── Invest memos ───────────────────────────────────
const totInv   = invest.accounts.reduce((s,a)=>s+a.balance,0);
const totContr = invest.contributions.reduce((s,c)=>s+c.amount,0);
const contribByM = useMemo(()=>{
const m={};
invest.contributions.forEach(c=>{const k=`${c.year}-${String(c.month).padStart(2,"0")}`;m[k]=(m[k]||0)+c.amount;});
return Object.entries(m).sort(([a],[b])=>a.localeCompare(b)).map(([k,t])=>{const[y,mo]=k.split(”-”);return{label:`${MONTHS[parseInt(mo)]} ${y}`,total:t};});
},[invest.contributions]);
const maxC   = contribByM.reduce((m,c)=>Math.max(m,c.total),1);
const maxCat = byCat.length>0?byCat[0].total:1;
const maxType = byType.length>0?byType[0].total:1;

// ── Handlers ───────────────────────────────────────
const addExpense = async () => {
if(!ef.description||!ef.amount||parseFloat(ef.amount)<=0) return;
setSyncing(true);
const d=new Date(ef.date+“T12:00:00”);
const isCard=ef.paymentMethod!==“corrente”;
const dm=d.getMonth()+1>=12?0:d.getMonth()+1;
const dy=d.getMonth()+1>=12?d.getFullYear()+1:d.getFullYear();
await addDoc(collection(db,“expenses”),{
date:ef.date, month:d.getMonth(), year:d.getFullYear(),
description:ef.description, category:ef.category,
paymentMethod:ef.paymentMethod, person:ef.person,
amount:parseFloat(parseFloat(ef.amount).toFixed(2)),
isCard, dueDate:isCard?`${dy}-${String(dm+1).padStart(2,"0")}-10`:null,
createdAt: new Date().toISOString(),
});
setEf(f=>({…f,description:””,amount:””}));
setSyncing(false);
flash(“Gasto lançado! ✓”);
};

const addIncome = async () => {
if(!inf.description||!inf.amount||parseFloat(inf.amount)<=0) return;
setSyncing(true);
const d=new Date(inf.date+“T12:00:00”);
await addDoc(collection(db,“incomes”),{
date:inf.date, month:d.getMonth(), year:d.getFullYear(),
description:inf.description, type:inf.type, person:inf.person,
amount:parseFloat(parseFloat(inf.amount).toFixed(2)),
createdAt: new Date().toISOString(),
});
setInf(f=>({…f,description:””,amount:””}));
setSyncing(false);
flash(“Entrada registrada! ✓”);
};

const delExpense = async (id) => { await deleteDoc(doc(db,“expenses”,id)); };
const delIncome  = async (id) => { await deleteDoc(doc(db,“incomes”,id)); };

const addContrib = async () => {
if(!invForm.accountId||!invForm.amount||parseFloat(invForm.amount)<=0) return;
setSyncing(true);
await addDoc(collection(db,“investments”),{
type:“contribution”, accountId:invForm.accountId,
month:parseInt(invForm.month), year:parseInt(invForm.year),
amount:parseFloat(parseFloat(invForm.amount).toFixed(2)),
createdAt: new Date().toISOString(),
});
setInvForm(f=>({…f,amount:””}));
setSyncing(false);
flashInv(“Aporte registrado! ✓”);
};

const addAccount = async () => {
if(!newAcc.name||!newAcc.balance) return;
setSyncing(true);
const colors=[”#fbbf24”,”#a78bfa”,”#34d399”,”#60a5fa”,”#f472b6”,”#fb923c”];
await addDoc(collection(db,“investments”),{
type:“account”, name:newAcc.name, institution:newAcc.institution,
color:colors[invest.accounts.length%colors.length],
balance:parseFloat(parseFloat(newAcc.balance).toFixed(2)),
createdAt: new Date().toISOString(),
});
setNewAcc({name:””,institution:””,balance:””});
setShowAcc(false);
setSyncing(false);
flashInv(“Conta adicionada! ✓”);
};

const delInvestment = async (id) => { await deleteDoc(doc(db,“investments”,id)); };

if (loading) return (
<div style={{minHeight:“100vh”,background:”#0f0f13”,display:“flex”,flexDirection:“column”,alignItems:“center”,justifyContent:“center”,gap:16,fontFamily:”‘Georgia’,serif”}}>
<div style={{fontSize:32}}>💰</div>
<div style={{fontSize:18,fontWeight:“bold”,color:”#f0ede8”}}>Controle Financeiro</div>
<Spinner/>
</div>
);

// ══════════════════════════════════════════════════
return (
<div style={{minHeight:“100vh”,background:”#0f0f13”,color:”#f0ede8”,fontFamily:”‘Georgia’,‘Times New Roman’,serif”,maxWidth:430,margin:“0 auto”,paddingBottom:90}}>

```
  {/* sync indicator */}
  {syncing && (
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:"#7c6af7",padding:"6px",textAlign:"center",fontSize:11,color:"#fff",letterSpacing:1}}>
      ☁️ Sincronizando...
    </div>
  )}

  {/* HEADER */}
  <div style={{background:"linear-gradient(135deg,#1a1a24,#12121a)",borderBottom:"1px solid #2a2a3a",padding:`${syncing?"22px":"16px"} 16px 12px`,position:"sticky",top:0,zIndex:10,transition:"padding 0.2s"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>
        <div style={{fontSize:10,color:"#6b6b8a",letterSpacing:3,textTransform:"uppercase"}}>Família</div>
        <div style={{fontSize:19,fontWeight:"bold",letterSpacing:-0.5}}>Controle Financeiro</div>
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{fontSize:10,color:"#6b6b8a"}}>{MONTHS[selMonth]} {selYear}</div>
        <div style={{fontSize:12,color:"#4ade80"}}>↑ {fmt(totalInc)}</div>
        <div style={{fontSize:12,color:"#f87171"}}>↓ {fmt(totalExp)}</div>
        <div style={{fontSize:16,fontWeight:"bold",color:totalInc-totalExp>=0?"#4ade80":"#f87171"}}>= {fmt(totalInc-totalExp)}</div>
      </div>
    </div>

    {/* Person pills */}
    <div style={{display:"flex",gap:6,marginTop:10,alignItems:"center",flexWrap:"wrap"}}>
      {PERSONS.map(p=>(
        <div key={p.id} style={{background:p.color+"22",border:`1px solid ${p.color}55`,borderRadius:20,padding:"4px 10px",fontSize:10,color:p.color,display:"flex",alignItems:"center",gap:4}}>
          <span>{p.avatar}</span><span style={{fontWeight:"bold"}}>{names[p.id]}</span>
          <span style={{color:"#9999bb"}}>·</span>
          <span style={{color:"#4ade80"}}>↑{fmt(byPersonInc.find(x=>x.id===p.id)?.total||0)}</span>
          <span style={{color:"#f87171"}}>↓{fmt(byPersonExp.find(x=>x.id===p.id)?.total||0)}</span>
        </div>
      ))}
      <button onClick={()=>setEditNames(v=>!v)} style={{background:"transparent",border:"1px solid #2a2a3a",borderRadius:20,padding:"4px 8px",fontSize:10,color:"#6b6b8a",cursor:"pointer",fontFamily:"inherit"}}>✏️</button>
    </div>

    {editNames&&(
      <div style={{display:"flex",gap:8,marginTop:8}}>
        {PERSONS.map(p=>(
          <input key={p.id} value={names[p.id]} onChange={e=>setNames(prev=>({...prev,[p.id]:e.target.value}))} style={{...IS,padding:"7px 10px",fontSize:12,flex:1}} placeholder={p.id==="p1"?"Seu nome":"Parceiro(a)"}/>
        ))}
        <button onClick={()=>setEditNames(false)} style={{background:"#7c6af7",border:"none",borderRadius:8,color:"#fff",padding:"0 12px",cursor:"pointer",fontSize:12}}>OK</button>
      </div>
    )}

    {/* Month scroll */}
    <div style={{display:"flex",gap:5,marginTop:10,overflowX:"auto",paddingBottom:2}}>
      {MONTHS.map((m,i)=>(
        <button key={i} onClick={()=>setSelMonth(i)} style={{background:selMonth===i?"#7c6af7":"#1e1e2e",color:selMonth===i?"#fff":"#6b6b8a",border:"none",borderRadius:20,padding:"5px 11px",fontSize:11,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",fontWeight:selMonth===i?"bold":"normal",transition:"all 0.2s"}}>{m}</button>
      ))}
    </div>
  </div>

  {/* TABS */}
  <div style={{display:"flex",borderBottom:"1px solid #1e1e2e",background:"#12121a"}}>
    {[["add","➕ Lançar"],["dashboard","📊 Dash"],["history","🗂️ Lista"],["compare","📈 Meses"],["invest","💰 Invest"]].map(([id,lbl])=>(
      <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"12px 2px",border:"none",background:"transparent",color:tab===id?"#7c6af7":"#4a4a6a",fontSize:10,cursor:"pointer",fontFamily:"inherit",borderBottom:tab===id?"2px solid #7c6af7":"2px solid transparent",transition:"all 0.2s",fontWeight:tab===id?"bold":"normal"}}>{lbl}</button>
    ))}
  </div>

  <div style={{padding:"16px 14px"}}>

    {/* ══ ADD ══ */}
    {tab==="add"&&(
      <div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,background:"#1a1a24",borderRadius:12,padding:3,marginBottom:16,border:"1px solid #2a2a3a"}}>
          {[["expense","↓ Gasto","#f87171"],["income","↑ Entrada","#4ade80"]].map(([mode,lbl,col])=>(
            <button key={mode} onClick={()=>setEntryMode(mode)} style={{background:entryMode===mode?col+"22":"transparent",border:entryMode===mode?`1.5px solid ${col}`:"1.5px solid transparent",borderRadius:10,padding:"10px",color:entryMode===mode?col:"#6b6b8a",fontSize:14,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>{lbl}</button>
          ))}
        </div>

        {ok&&<div style={{background:"#14532d",color:"#4ade80",border:"1px solid #4ade80",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:14,textAlign:"center"}}>{ok}</div>}

        {entryMode==="expense"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <input placeholder="Descrição (ex: Supermercado Extra)" value={ef.description} onChange={e=>setEf(f=>({...f,description:e.target.value}))} style={IS}/>
            <div style={{display:"flex",gap:10}}>
              <div style={{position:"relative",flex:1}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#6b6b8a",fontSize:14}}>R$</span>
                <input placeholder="0,00" type="number" min="0" value={ef.amount} onChange={e=>setEf(f=>({...f,amount:e.target.value}))} style={{...IS,paddingLeft:38}}/>
              </div>
              <input type="date" value={ef.date} onChange={e=>setEf(f=>({...f,date:e.target.value}))} style={{...IS,flex:1}}/>
            </div>
            <div>
              <div style={{fontSize:11,color:"#6b6b8a",marginBottom:8,letterSpacing:1}}>QUEM GASTOU</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {PERSONS.map(p=>(
                  <button key={p.id} onClick={()=>setEf(f=>({...f,person:p.id}))} style={{background:ef.person===p.id?p.color+"33":"#1e1e2e",border:ef.person===p.id?`1.5px solid ${p.color}`:"1.5px solid #2a2a3a",borderRadius:10,padding:"11px 8px",color:ef.person===p.id?p.color:"#6b6b8a",fontSize:14,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                    <span style={{fontSize:20}}>{p.avatar}</span>
                    <span style={{fontSize:13,fontWeight:ef.person===p.id?"bold":"normal"}}>{names[p.id]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,color:"#6b6b8a",marginBottom:8,letterSpacing:1}}>CATEGORIA</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
                {CATEGORIES.map(c=>(
                  <button key={c.id} onClick={()=>setEf(f=>({...f,category:c.id}))} style={{background:ef.category===c.id?c.color+"33":"#1e1e2e",border:ef.category===c.id?`1.5px solid ${c.color}`:"1.5px solid #2a2a3a",borderRadius:10,padding:"8px 4px",fontSize:18,cursor:"pointer",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <span>{c.label.split(" ")[0]}</span>
                    <span style={{fontSize:8,color:ef.category===c.id?c.color:"#4a4a6a"}}>{c.label.split(" ").slice(1).join(" ")}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,color:"#6b6b8a",marginBottom:8,letterSpacing:1}}>FORMA DE PAGAMENTO</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {PAYMENT_METHODS.map(p=>(
                  <button key={p.id} onClick={()=>setEf(f=>({...f,paymentMethod:p.id}))} style={{background:ef.paymentMethod===p.id?"#7c6af733":"#1e1e2e",border:ef.paymentMethod===p.id?"1.5px solid #7c6af7":"1.5px solid #2a2a3a",borderRadius:10,padding:"10px 8px",color:ef.paymentMethod===p.id?"#c4b9ff":"#6b6b8a",fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",textAlign:"left"}}>{p.label}</button>
                ))}
              </div>
              {ef.paymentMethod!=="corrente"&&(
                <div style={{background:"#1e1a2e",border:"1px solid #3a2a6a",borderRadius:8,padding:"8px 12px",marginTop:8,fontSize:12,color:"#a78bfa"}}>
                  💡 Fatura de <strong>{MONTHS[(new Date(ef.date+"T12:00:00").getMonth()+1)%12]}</strong> (venc. dia 10)
                </div>
              )}
            </div>
            <button onClick={addExpense} style={{background:"linear-gradient(135deg,#c0392b,#e74c3c)",border:"none",borderRadius:12,padding:"14px",color:"#fff",fontSize:16,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 20px #f8717144",marginTop:4}}>↓ Lançar Gasto</button>
          </div>
        )}

        {entryMode==="income"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <input placeholder="Descrição (ex: Salário Maio)" value={inf.description} onChange={e=>setInf(f=>({...f,description:e.target.value}))} style={IS}/>
            <div style={{display:"flex",gap:10}}>
              <div style={{position:"relative",flex:1}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#6b6b8a",fontSize:14}}>R$</span>
                <input placeholder="0,00" type="number" min="0" value={inf.amount} onChange={e=>setInf(f=>({...f,amount:e.target.value}))} style={{...IS,paddingLeft:38}}/>
              </div>
              <input type="date" value={inf.date} onChange={e=>setInf(f=>({...f,date:e.target.value}))} style={{...IS,flex:1}}/>
            </div>
            <div>
              <div style={{fontSize:11,color:"#6b6b8a",marginBottom:8,letterSpacing:1}}>QUEM RECEBEU</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {PERSONS.map(p=>(
                  <button key={p.id} onClick={()=>setInf(f=>({...f,person:p.id}))} style={{background:inf.person===p.id?p.color+"33":"#1e1e2e",border:inf.person===p.id?`1.5px solid ${p.color}`:"1.5px solid #2a2a3a",borderRadius:10,padding:"11px 8px",color:inf.person===p.id?p.color:"#6b6b8a",fontSize:14,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                    <span style={{fontSize:20}}>{p.avatar}</span>
                    <span style={{fontSize:13,fontWeight:inf.person===p.id?"bold":"normal"}}>{names[p.id]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,color:"#6b6b8a",marginBottom:8,letterSpacing:1}}>TIPO DE ENTRADA</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                {INCOME_TYPES.map(t=>(
                  <button key={t.id} onClick={()=>setInf(f=>({...f,type:t.id}))} style={{background:inf.type===t.id?t.color+"33":"#1e1e2e",border:inf.type===t.id?`1.5px solid ${t.color}`:"1.5px solid #2a2a3a",borderRadius:10,padding:"8px 4px",fontSize:18,cursor:"pointer",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <span>{t.label.split(" ")[0]}</span>
                    <span style={{fontSize:8,color:inf.type===t.id?t.color:"#4a4a6a",textAlign:"center"}}>{t.label.split(" ").slice(1).join(" ")}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={addIncome} style={{background:"linear-gradient(135deg,#16a34a,#22c55e)",border:"none",borderRadius:12,padding:"14px",color:"#fff",fontSize:16,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 20px #4ade8044",marginTop:4}}>↑ Registrar Entrada</button>
          </div>
        )}
      </div>
    )}

    {/* ══ DASHBOARD ══ */}
    {tab==="dashboard"&&(
      <div>
        <div style={{fontSize:11,color:"#6b6b8a",marginBottom:12,letterSpacing:1}}>DASHBOARD — {MONTHS[selMonth]}</div>
        <BalancePill income={totalInc} expense={totalExp}/>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:"#6b6b8a",letterSpacing:1,marginBottom:8}}>POR PESSOA</div>
          {PERSONS.map(p=>{
            const inc=byPersonInc.find(x=>x.id===p.id)?.total||0;
            const exp=byPersonExp.find(x=>x.id===p.id)?.total||0;
            const bal=inc-exp;
            return(
              <div key={p.id} style={{background:"#1a1a24",borderRadius:12,padding:"12px 14px",marginBottom:8,borderLeft:`3px solid ${p.color}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:14,fontWeight:"bold",color:p.color}}>{names[p.id]}</span>
                  <span style={{fontSize:14,fontWeight:"bold",color:bal>=0?"#4ade80":"#f87171"}}>{fmt(bal)}</span>
                </div>
                <div style={{display:"flex",gap:16,marginTop:6,fontSize:11,color:"#6b6b8a"}}>
                  <span>↑ <span style={{color:"#4ade80"}}>{fmt(inc)}</span></span>
                  <span>↓ <span style={{color:"#f87171"}}>{fmt(exp)}</span></span>
                </div>
              </div>
            );
          })}
        </div>
        {byType.length>0&&(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:"#6b6b8a",letterSpacing:1,marginBottom:8}}>ENTRADAS POR TIPO</div>
            {byType.map(t=>(
              <div key={t.id} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13}}>{t.label}</span>
                  <span style={{fontSize:13,fontWeight:"bold",color:t.color}}>{fmt(t.total)}</span>
                </div>
                <div style={{background:"#1e1e2e",borderRadius:99,height:6,overflow:"hidden"}}>
                  <div style={{background:t.color,height:"100%",width:`${(t.total/maxType)*100}%`,borderRadius:99,transition:"width 0.5s"}}/>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div style={CS("#4ade8022","#4ade80")}>
            <div style={{fontSize:10,color:"#4ade80",letterSpacing:1}}>CONTA CORRENTE</div>
            <div style={{fontSize:17,fontWeight:"bold",marginTop:4}}>{fmt(byCard.find(p=>p.id==="corrente")?.total||0)}</div>
          </div>
          <div style={CS("#7c6af722","#7c6af7")}>
            <div style={{fontSize:10,color:"#a78bfa",letterSpacing:1}}>CARTÕES (fatura)</div>
            <div style={{fontSize:17,fontWeight:"bold",marginTop:4}}>{fmt(byCard.filter(p=>p.id!=="corrente").reduce((s,p)=>s+p.total,0))}</div>
          </div>
        </div>
        <div>
          <div style={{fontSize:11,color:"#6b6b8a",letterSpacing:1,marginBottom:10}}>GASTOS POR CATEGORIA</div>
          {byCat.length===0&&<div style={{color:"#4a4a6a",fontSize:13,textAlign:"center",padding:16}}>Sem gastos neste mês</div>}
          {byCat.map(c=>(
            <div key={c.id} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13}}>{c.label}</span>
                <span style={{fontSize:13,fontWeight:"bold",color:c.color}}>{fmt(c.total)}</span>
              </div>
              <div style={{background:"#1e1e2e",borderRadius:99,height:6,overflow:"hidden"}}>
                <div style={{background:c.color,height:"100%",width:`${(c.total/maxCat)*100}%`,borderRadius:99,transition:"width 0.5s"}}/>
              </div>
              <div style={{fontSize:10,color:"#4a4a6a",marginTop:2}}>{totalExp>0?((c.total/totalExp)*100).toFixed(1):0}% dos gastos</div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* ══ HISTORY ══ */}
    {tab==="history"&&(
      <div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,background:"#1a1a24",borderRadius:10,padding:3,marginBottom:14,border:"1px solid #2a2a3a"}}>
          {[["expense","↓ Gastos"],["income","↑ Entradas"]].map(([mode,lbl])=>(
            <button key={mode} onClick={()=>setEntryMode(mode)} style={{background:entryMode===mode?"#2a2a3a":"transparent",border:"none",borderRadius:8,padding:"9px",color:entryMode===mode?"#f0ede8":"#6b6b8a",fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>{lbl}</button>
          ))}
        </div>

        {entryMode==="expense"&&(
          <>
            <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
              <select value={fPer} onChange={e=>setFPer(e.target.value)} style={SS}><option value="all">Todos</option>{PERSONS.map(p=><option key={p.id} value={p.id}>{names[p.id]}</option>)}</select>
              <select value={fCat} onChange={e=>setFCat(e.target.value)} style={SS}><option value="all">Todas categ.</option>{CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>
              <select value={fPm}  onChange={e=>setFPm(e.target.value)}  style={SS}><option value="all">Todos pagtos</option>{PAYMENT_METHODS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select>
            </div>
            <div style={{fontSize:11,color:"#6b6b8a",marginBottom:10}}>{filteredExp.length} lançamentos · {fmt(filteredExp.reduce((s,e)=>s+e.amount,0))}</div>
            {filteredExp.length===0&&<div style={{color:"#4a4a6a",textAlign:"center",padding:30,fontSize:14}}>Nenhum gasto encontrado</div>}
            {filteredExp.map(e=>{
              const cat=CATEGORIES.find(c=>c.id===e.category);
              const pm=PAYMENT_METHODS.find(p=>p.id===e.paymentMethod);
              const person=PERSONS.find(p=>p.id===e.person);
              return(
                <div key={e.id} style={{background:"#1a1a24",borderRadius:12,padding:"12px 14px",marginBottom:8,borderLeft:`3px solid ${cat?.color||"#4a4a6a"}`,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{marginBottom:4}}><span style={{fontSize:10,background:person?.color+"33",color:person?.color,borderRadius:10,padding:"2px 8px"}}>{names[e.person]}</span></div>
                    <div style={{fontSize:14,fontWeight:"bold",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.description}</div>
                    <div style={{fontSize:11,color:"#6b6b8a",marginTop:2}}>{cat?.label} · {pm?.label} · {e.date?.split("-").reverse().join("/")}</div>
                    {e.isCard&&e.dueDate&&<div style={{fontSize:10,color:"#a78bfa",marginTop:1}}>Fatura: {e.dueDate.split("-").reverse().join("/")}</div>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    <span style={{fontSize:15,fontWeight:"bold",color:cat?.color}}>{fmt(e.amount)}</span>
                    <button onClick={()=>delExpense(e.id)} style={{background:"transparent",border:"none",color:"#4a4a6a",fontSize:16,cursor:"pointer",padding:0}}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {entryMode==="income"&&(
          <>
            <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
              <select value={fPer}  onChange={e=>setFPer(e.target.value)}  style={SS}><option value="all">Todos</option>{PERSONS.map(p=><option key={p.id} value={p.id}>{names[p.id]}</option>)}</select>
              <select value={fType} onChange={e=>setFType(e.target.value)} style={SS}><option value="all">Todos tipos</option>{INCOME_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select>
            </div>
            <div style={{fontSize:11,color:"#6b6b8a",marginBottom:10}}>{filteredInc.length} entradas · {fmt(filteredInc.reduce((s,i)=>s+i.amount,0))}</div>
            {filteredInc.length===0&&<div style={{color:"#4a4a6a",textAlign:"center",padding:30,fontSize:14}}>Nenhuma entrada encontrada</div>}
            {filteredInc.map(i=>{
              const type=INCOME_TYPES.find(t=>t.id===i.type);
              const person=PERSONS.find(p=>p.id===i.person);
              return(
                <div key={i.id} style={{background:"#1a1a24",borderRadius:12,padding:"12px 14px",marginBottom:8,borderLeft:`3px solid ${type?.color||"#4ade80"}`,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{marginBottom:4}}><span style={{fontSize:10,background:person?.color+"33",color:person?.color,borderRadius:10,padding:"2px 8px"}}>{names[i.person]}</span></div>
                    <div style={{fontSize:14,fontWeight:"bold",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{i.description}</div>
                    <div style={{fontSize:11,color:"#6b6b8a",marginTop:2}}>{type?.label} · {i.date?.split("-").reverse().join("/")}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    <span style={{fontSize:15,fontWeight:"bold",color:type?.color||"#4ade80"}}>+{fmt(i.amount)}</span>
                    <button onClick={()=>delIncome(i.id)} style={{background:"transparent",border:"none",color:"#4a4a6a",fontSize:16,cursor:"pointer",padding:0}}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    )}

    {/* ══ COMPARE ══ */}
    {tab==="compare"&&(
      <div>
        <div style={{fontSize:11,color:"#6b6b8a",marginBottom:14,letterSpacing:1}}>COMPARATIVO MENSAL</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {[{lbl:MONTHS[prevM],inc:prevInc.reduce((s,i)=>s+i.amount,0),exp:prevT},{lbl:MONTHS[selMonth],inc:totalInc,exp:totalExp}].map((col,idx)=>{
            const bal=col.inc-col.exp;
            return(
              <div key={idx} style={CS(idx===1?"#7c6af722":"#1e1e2e",idx===1?"#7c6af7":"#4a4a6a")}>
                <div style={{fontSize:11,color:idx===1?"#a78bfa":"#6b6b8a",letterSpacing:1}}>{col.lbl.toUpperCase()}</div>
                <div style={{fontSize:17,fontWeight:"bold",marginTop:4,color:bal>=0?"#4ade80":"#f87171"}}>{fmt(bal)}</div>
                <div style={{fontSize:10,color:"#6b6b8a",marginTop:4,lineHeight:1.6}}>
                  <div>↑ {fmt(col.inc)}</div><div>↓ {fmt(col.exp)}</div>
                </div>
              </div>
            );
          })}
        </div>
        {diffP&&(
          <div style={{background:diff>0?"#2d0f0f":"#0f2d1a",border:`1px solid ${diff>0?"#f87171":"#4ade80"}`,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:24}}>{diff>0?"📈":"📉"}</span>
            <div>
              <div style={{fontWeight:"bold",color:diff>0?"#f87171":"#4ade80",fontSize:15}}>{diff>0?`Gastou ${fmt(Math.abs(diff))} a mais`:`Economizou ${fmt(Math.abs(diff))}`}</div>
              <div style={{fontSize:12,color:"#6b6b8a"}}>em gastos vs. {MONTHS[prevM]} ({diff>0?"+":"-"}{Math.abs(diffP)}%)</div>
            </div>
          </div>
        )}
        <div>
          <div style={{fontSize:11,color:"#6b6b8a",letterSpacing:1,marginBottom:12}}>GASTOS POR CATEGORIA</div>
          {CATEGORIES.map(c=>{
            const curr=byCat.find(b=>b.id===c.id)?.total||0;
            const prev=prevBC[c.id]||0;
            if(curr===0&&prev===0) return null;
            const cd=curr-prev; const mb=Math.max(curr,prev,1);
            return(
              <div key={c.id} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13}}>{c.label}</span>
                  <span style={{fontSize:12,color:cd>0?"#f87171":"#4ade80"}}>{cd>0?"+":""}{fmt(cd)}</span>
                </div>
                {[{lbl:MONTHS[prevM],val:prev,col:"#4a4a6a"},{lbl:MONTHS[selMonth],val:curr,col:c.color}].map(row=>(
                  <div key={row.lbl} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                    <span style={{fontSize:10,color:"#6b6b8a",width:28}}>{row.lbl}</span>
                    <div style={{flex:1,background:"#1e1e2e",borderRadius:99,height:6,overflow:"hidden"}}>
                      <div style={{background:row.col,height:"100%",width:`${(row.val/mb)*100}%`,borderRadius:99}}/>
                    </div>
                    <span style={{fontSize:10,color:row.col,width:62,textAlign:"right"}}>{fmt(row.val)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* ══ INVEST ══ */}
    {tab==="invest"&&(
      <div>
        <div style={{fontSize:11,color:"#6b6b8a",marginBottom:14,letterSpacing:1}}>INVESTIMENTOS</div>
        {invOk&&<div style={{background:"#14532d",color:"#4ade80",border:"1px solid #4ade80",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:14,textAlign:"center"}}>{invOk}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <div style={CS("#fbbf2422","#fbbf24")}>
            <div style={{fontSize:10,color:"#fbbf24",letterSpacing:1}}>PATRIMÔNIO</div>
            <div style={{fontSize:18,fontWeight:"bold",marginTop:4}}>{fmt(totInv)}</div>
            <div style={{fontSize:10,color:"#6b6b8a",marginTop:2}}>{invest.accounts.length} contas</div>
          </div>
          <div style={CS("#34d39922","#34d399")}>
            <div style={{fontSize:10,color:"#34d399",letterSpacing:1}}>TOTAL APORTADO</div>
            <div style={{fontSize:18,fontWeight:"bold",marginTop:4}}>{fmt(totContr)}</div>
            <div style={{fontSize:10,color:"#6b6b8a",marginTop:2}}>{invest.contributions.length} aportes</div>
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:11,color:"#6b6b8a",letterSpacing:1}}>CONTAS</div>
            <button onClick={()=>setShowAcc(v=>!v)} style={{background:"#7c6af733",border:"1px solid #7c6af7",borderRadius:8,color:"#c4b9ff",fontSize:11,cursor:"pointer",padding:"4px 10px",fontFamily:"inherit"}}>+ Nova conta</button>
          </div>
          {showAcc&&(
            <div style={{background:"#1a1a24",border:"1px solid #2a2a3a",borderRadius:12,padding:14,marginBottom:12,display:"flex",flexDirection:"column",gap:8}}>
              <input placeholder="Nome (ex: Tesouro Selic)" value={newAcc.name} onChange={e=>setNewAcc(f=>({...f,name:e.target.value}))} style={IS}/>
              <input placeholder="Instituição (ex: Rico)" value={newAcc.institution} onChange={e=>setNewAcc(f=>({...f,institution:e.target.value}))} style={IS}/>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#6b6b8a",fontSize:14}}>R$</span>
                <input placeholder="Saldo atual" type="number" value={newAcc.balance} onChange={e=>setNewAcc(f=>({...f,balance:e.target.value}))} style={{...IS,paddingLeft:38}}/>
              </div>
              <button onClick={addAccount} style={{background:"linear-gradient(135deg,#fbbf24,#f59e0b)",border:"none",borderRadius:10,padding:"11px",color:"#1a1000",fontWeight:"bold",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Adicionar conta</button>
            </div>
          )}
          {invest.accounts.map(acc=>{
            const pct=totInv>0?((acc.balance/totInv)*100).toFixed(1):0;
            const ac=invest.contributions.filter(c=>c.accountId===acc.id).reduce((s,c)=>s+c.amount,0);
            return(
              <div key={acc.id} style={{background:"#1a1a24",borderRadius:12,padding:"14px",marginBottom:10,borderLeft:`3px solid ${acc.color}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:"bold"}}>{acc.name}</div>
                    <div style={{fontSize:11,color:"#6b6b8a",marginTop:2}}>{acc.institution}</div>
                  </div>
                  <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    <div style={{fontSize:16,fontWeight:"bold",color:acc.color}}>{fmt(acc.balance)}</div>
                    <div style={{fontSize:10,color:"#6b6b8a"}}>{pct}% do portfólio</div>
                    <button onClick={()=>delInvestment(acc.id)} style={{background:"transparent",border:"none",color:"#4a4a6a",fontSize:14,cursor:"pointer",padding:0}}>🗑️</button>
                  </div>
                </div>
                <div style={{background:"#12121a",borderRadius:99,height:5,overflow:"hidden",marginTop:10}}>
                  <div style={{background:acc.color,height:"100%",width:`${pct}%`,borderRadius:99}}/>
                </div>
                <div style={{fontSize:10,color:"#6b6b8a",marginTop:6}}>Aportado: <span style={{color:acc.color}}>{fmt(ac)}</span></div>
              </div>
            );
          })}
          {invest.accounts.length===0&&<div style={{color:"#4a4a6a",textAlign:"center",padding:20,fontSize:13}}>Nenhuma conta cadastrada ainda</div>}
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:"#6b6b8a",letterSpacing:1,marginBottom:10}}>REGISTRAR APORTE</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <select value={invForm.accountId} onChange={e=>setInvForm(f=>({...f,accountId:e.target.value}))} style={{...IS,padding:"12px 14px"}}>
              <option value="">Selecione a conta...</option>
              {invest.accounts.map(a=><option key={a.id} value={a.id}>{a.name} — {a.institution}</option>)}
            </select>
            <div style={{display:"flex",gap:8}}>
              <div style={{position:"relative",flex:1}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#6b6b8a",fontSize:14}}>R$</span>
                <input placeholder="Valor" type="number" value={invForm.amount} onChange={e=>setInvForm(f=>({...f,amount:e.target.value}))} style={{...IS,paddingLeft:38}}/>
              </div>
              <select value={invForm.month} onChange={e=>setInvForm(f=>({...f,month:e.target.value}))} style={SS}>
                {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <button onClick={addContrib} style={{background:"linear-gradient(135deg,#34d399,#059669)",border:"none",borderRadius:12,padding:"13px",color:"#fff",fontSize:15,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 20px #34d39933"}}>Registrar Aporte</button>
          </div>
        </div>
        {contribByM.length>0&&(
          <div>
            <div style={{fontSize:11,color:"#6b6b8a",letterSpacing:1,marginBottom:12}}>APORTES POR MÊS</div>
            {contribByM.map((c,i)=>(
              <div key={i} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,color:"#c4b9ff"}}>{c.label}</span>
                  <span style={{fontSize:12,fontWeight:"bold",color:"#34d399"}}>{fmt(c.total)}</span>
                </div>
                <div style={{background:"#1e1e2e",borderRadius:99,height:8,overflow:"hidden"}}>
                  <div style={{background:"linear-gradient(90deg,#34d399,#059669)",height:"100%",width:`${(c.total/maxC)*100}%`,borderRadius:99,transition:"width 0.5s"}}/>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
</div>
```

);
}
