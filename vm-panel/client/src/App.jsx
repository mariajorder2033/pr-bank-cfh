import {useState,useEffect} from 'react';
async function api(p,o={}){
  const h={};const t=localStorage.getItem('t');if(t)h.Authorization='Bearer '+t;
  if(o.json){h['Content-Type']='application/json';o={...o,body:JSON.stringify(o.json)}}
  const r=await fetch('/api'+p,{...o,headers:h});const d=await r.json().catch(()=>({}));
  if(!r.ok){if(r.status===401&&t){localStorage.removeItem('t');location.reload()}throw new Error(d.error||'Request failed')}return d}
const fmt=d=>d?new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'-';
const daysLeft=u=>Math.ceil((new Date(u.exp+'T23:59:59')-new Date())/864e5);
const add=(d,n)=>new Date(new Date(d+'T00:00:00').getTime()+n*864e5).toISOString().slice(0,10);
const todayStr=()=>new Date().toISOString().slice(0,10);

function Login({done}){
  const[f,setF]=useState({username:'',password:''}),[e,setE]=useState('');
  const go=async ev=>{ev.preventDefault();setE('');try{const d=await api('/login',{method:'POST',json:f});localStorage.setItem('t',d.token);done(d.user)}catch(x){setE(x.message)}};
  return <form className="card login" onSubmit={go}><h2 style={{marginBottom:14}}>Sign in</h2>
    <label>Username</label><input value={f.username} autoComplete="username" onChange={x=>setF({...f,username:x.target.value})}/>
    <label style={{marginTop:12}}>Password</label><input type="password" autoComplete="current-password" value={f.password} onChange={x=>setF({...f,password:x.target.value})}/>
    {e&&<p className="err">{e}</p>}<button className="btn" style={{marginTop:16,width:'100%'}}>Sign in</button></form>}

function Ring({u}){
  const l=daysLeft(u),tot=Math.max(1,Math.round((new Date(u.exp)-new Date(u.start))/864e5)),R=80,C=2*Math.PI*R;
  const p=u.expired?0:Math.min(1,l/tot),col=u.expired?'var(--coral)':l<=7?'var(--amber)':'var(--teal)';
  return <div className="ring"><svg width="180" height="180" viewBox="0 0 180 180"><circle cx="90" cy="90" r={R} fill="none" stroke="var(--track)" strokeWidth="14"/>
    <circle cx="90" cy="90" r={R} fill="none" stroke={col} strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-p)}/></svg>
    <div className="c"><div className="n">{u.expired?0:l}</div><div className="mute">days left</div></div></div>}

function Customer({me}){
  const[files,setFiles]=useState({src:[],public:[]}),[err,setErr]=useState('');
  const load=async()=>{try{const[a,b]=await Promise.all([api('/files/src'),api('/files/public')]);setFiles({src:a,public:b})}catch(x){setErr(x.message)}};
  useEffect(()=>{load()},[]);
  const upload=async(d,ev)=>{const file=ev.target.files[0];ev.target.value='';if(!file)return;setErr('');
    const fd=new FormData();fd.append('file',file);try{await api('/files/'+d,{method:'POST',body:fd});load()}catch(x){setErr(x.message)}};
  const del=async(d,n)=>{setErr('');try{await api('/files/'+d+'/'+encodeURIComponent(n),{method:'DELETE'});load()}catch(x){setErr(x.message)}};
  const l=daysLeft(me),st=me.expired?<span className="pill bad">Locked</span>:l<=7?<span className="pill warn">Expiring soon</span>:<span className="pill ok">Active</span>;
  return <>
    {me.expired&&<div className="banner"><b>Your VM is locked.</b> The plan ended on {fmt(me.exp)}. Contact the admin to renew.</div>}
    <div className="card"><div className="hero"><Ring u={me}/><div><div className="row" style={{justifyContent:'flex-start'}}><h2>{me.pkg} plan</h2>{st}</div>
      <p className="mute" style={{margin:'6px 0 0'}}>Started {fmt(me.start)}<br/>{me.expired?'Ended ':'Expires '}{fmt(me.exp)}</p></div></div>
      <div className="grid3">{[['RAM',me.ram+' GB'],['vCPU',me.cpu+' cores'],['Disk',me.disk+' GB']].map(([k,v])=>
        <div className="res" key={k}><span className="mute">{k}</span><b>{v}</b><span className="lock">Set by admin · view only</span></div>)}</div></div>
    <div className="card"><h3>Connect</h3><div className="row" style={{margin:'10px 0'}}><span className="mute">External IP</span><b>{me.ip||'Not assigned yet'}</b></div>
      {me.ip&&<div className="code">ssh {me.osUser||'user'}@{me.ip}</div>}</div>
    <div className="card"><h3>Files</h3>{err&&<p className="err">{err}</p>}
      {['src','public'].map(d=><div className="folder" key={d}><div className="row"><b>{d}/</b>
        <label className="btn" style={{margin:0,opacity:me.expired?.45:1,color:'var(--on)'}}>Upload file<input type="file" hidden disabled={me.expired} onChange={e=>upload(d,e)}/></label></div>
        {files[d].length?files[d].map(f=><div className="file" key={f.name}><span>{f.name} <span className="mute">· {(f.size/1024).toFixed(1)} KB</span></span>
          <button className="btn g" disabled={me.expired} onClick={()=>del(d,f.name)}>Delete</button></div>):<div className="mute">Empty. Upload a file to see it here.</div>}</div>)}</div></>}

const FIELDS=[['name','Customer name'],['username','Login username'],['password','Password'],['pkg','Package name'],['ram','RAM (GB)','number'],['cpu','vCPU','number'],['disk','Disk (GB)','number'],['ip','External IP'],['start','Start date','date'],['exp','Expiry date','date'],['osUser','Server username (SSH)']];
function Admin(){
  const[list,setList]=useState([]),[sel,setSel]=useState(null),[f,setF]=useState({}),[msg,setMsg]=useState('');
  const load=async()=>setList(await api('/admin/users'));
  useEffect(()=>{load()},[]);
  const pickU=u=>{setSel(u.id);setF({...u,password:''});setMsg('')};
  const fresh=()=>{setSel('new');setF({name:'',username:'',password:'',pkg:'Starter',ram:2,cpu:1,disk:20,ip:'',start:todayStr(),exp:add(todayStr(),30),osUser:''});setMsg('')};
  const save=async()=>{setMsg('');try{const body={...f};if(!body.password)delete body.password;
    const u=sel==='new'?await api('/admin/users',{method:'POST',json:body}):await api('/admin/users/'+sel,{method:'PUT',json:body});
    await load();pickU(u);setMsg('Saved. The customer now sees these values.')}catch(x){setMsg(x.message)}};
  const renew=()=>setF({...f,exp:add(f.exp>todayStr()?f.exp:todayStr(),30)});
  const del=async()=>{if(!confirm('Delete this customer and all their files?'))return;try{await api('/admin/users/'+sel,{method:'DELETE'});setSel(null);load()}catch(x){setMsg(x.message)}};
  return <>
    <div className="card"><div className="row"><h3>Customers</h3><button className="btn" onClick={fresh}>Add customer</button></div>
      <div className="scroll"><table><thead><tr><th>Name</th><th>Package</th><th>RAM</th><th>vCPU</th><th>Disk</th><th>Expires</th><th>Status</th></tr></thead><tbody>
        {list.map(u=>{const l=daysLeft(u);return <tr key={u.id} className={sel===u.id?'sel':''} style={{cursor:'pointer'}} onClick={()=>pickU(u)}>
          <td>{u.name||u.username}</td><td>{u.pkg}</td><td>{u.ram} GB</td><td>{u.cpu}</td><td>{u.disk} GB</td><td>{fmt(u.exp)}</td>
          <td>{u.expired?<span className="pill bad">Locked</span>:l<=7?<span className="pill warn">{l} days</span>:<span className="pill ok">Active</span>}</td></tr>})}
        {!list.length&&<tr><td colSpan="7" className="mute">No customers yet. Add the first one.</td></tr>}</tbody></table></div></div>
    {sel&&<div className="card"><h3>{sel==='new'?'New customer':'Edit '+(f.name||f.username)}</h3>
      <p className="mute" style={{margin:'4px 0 14px'}}>Values can be higher than the real VM. Customers see exactly what you set here.</p>
      <div className="form">{FIELDS.map(([k,l,t])=><div key={k}><label>{l}{k==='password'&&sel!=='new'?' (leave empty to keep)':''}</label>
        <input type={t||(k==='password'?'password':'text')} value={f[k]??''} disabled={k==='username'&&sel!=='new'} autoComplete="off" onChange={e=>setF({...f,[k]:e.target.value})}/></div>)}</div>
      <div className="row" style={{marginTop:14}}><span><button className="btn" onClick={save}>Save changes</button> <button className="btn g" onClick={renew}>Renew +30 days</button></span>
        {sel!=='new'&&<button className="btn g" onClick={del}>Delete customer</button>}</div>{msg&&<p className="err" style={{color:'var(--teal)'}}>{msg}</p>}</div>}</>}

export default function App(){
  const[me,setMe]=useState(null),[ready,setReady]=useState(false);
  useEffect(()=>{if(!localStorage.getItem('t'))return setReady(true);api('/me').then(setMe).catch(()=>{}).finally(()=>setReady(true))},[]);
  const out=()=>{localStorage.removeItem('t');setMe(null)};
  if(!ready)return null;if(!me)return <div className="wrap"><Login done={setMe}/></div>;
  return <div className="wrap"><div className="row" style={{marginBottom:16}}><h1>VM Panel</h1>
    <span><span className="mute">{me.role==='super'?'Super admin':me.name||me.username} </span><button className="btn g" onClick={out}>Sign out</button></span></div>
    {me.role==='super'?<Admin/>:<Customer me={me}/>}</div>}
