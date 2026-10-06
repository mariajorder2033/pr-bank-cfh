import express from 'express';import helmet from 'helmet';import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';import jwt from 'jsonwebtoken';import multer from 'multer';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';import {execFile} from 'child_process';
const here=path.dirname(fileURLToPath(import.meta.url));
const {JWT_SECRET,SUPER_USER='superadmin',SUPER_PASS,PORT=3000,ENABLE_OS_LOCK}=process.env;
if(!JWT_SECRET||JWT_SECRET.length<24||!SUPER_PASS||SUPER_PASS.length<10){console.error('Set JWT_SECRET (24+ chars) and SUPER_PASS (10+ chars)');process.exit(1)}
const DBF=path.join(here,'data/db.json'),ROOT=path.join(here,'data/sites'),DIST=path.join(here,'../client/dist');
fs.mkdirSync(ROOT,{recursive:true});
const db=fs.existsSync(DBF)?JSON.parse(fs.readFileSync(DBF,'utf8')):{users:[]};
const save=()=>{fs.writeFileSync(DBF+'.tmp',JSON.stringify(db,null,1));fs.renameSync(DBF+'.tmp',DBF)};
if(!db.users.some(u=>u.role==='super')){db.users.push({id:'u0',role:'super',username:SUPER_USER,hash:bcrypt.hashSync(SUPER_PASS,12)});save()}
const today=(n=0)=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);
// fails closed: a missing or unparseable expiry date counts as expired
const expired=u=>u.role==='customer'&&!(new Date(u.exp+'T23:59:59')>=new Date());
const pub=u=>{const{hash,...r}=u;return{...r,expired:expired(u)}};
const sh=(c,a)=>new Promise(res=>execFile('sudo',['-n',c,...a],e=>res(!e)));
const uid=n=>new Promise(res=>execFile('id',['-u',n],(e,o)=>res(e?-1:+o)));
async function syncLock(u){ // optional: block real SSH login on the server
  if(ENABLE_OS_LOCK!=='1'||u.role!=='customer'||!/^[a-z_][a-z0-9_-]{0,31}$/.test(u.osUser||''))return;
  // only normal login users: `pkill -u root` (or a system/panel account) would take the VM down
  const id=await uid(u.osUser);if(!(id>=1000&&id<=60000)||id===process.getuid())return;
  const want=expired(u);if(want===!!u.osLocked)return;
  if(await sh('chage',['-E',want?'0':'-1',u.osUser])){if(want)await sh('pkill',['-KILL','-u',u.osUser]);u.osLocked=want;save()}}
setInterval(()=>db.users.forEach(syncLock),36e5);db.users.forEach(syncLock);

const A=express();A.set('trust proxy',1);A.use(helmet());A.use(express.json({limit:'100kb'}));
A.post('/api/login',rateLimit({windowMs:9e5,limit:20}),(q,r)=>{
  const u=db.users.find(x=>x.username===String(q.body.username||''));
  if(!u||!bcrypt.compareSync(String(q.body.password||''),u.hash))return r.status(401).json({error:'Wrong username or password'});
  r.json({token:jwt.sign({id:u.id},JWT_SECRET,{expiresIn:'12h'}),user:pub(u)})});
const auth=(q,r,n)=>{try{const t=jwt.verify((q.headers.authorization||'').slice(7),JWT_SECRET);q.user=db.users.find(x=>x.id===t.id);if(!q.user)throw 0;n()}catch{r.status(401).json({error:'Please sign in'})}};
const need=role=>(q,r,n)=>q.user.role===role?n():r.status(403).json({error:'Not allowed'});
const live=(q,r,n)=>expired(q.user)?r.status(403).json({error:'Plan expired. Contact admin to renew.'}):n();
A.get('/api/me',auth,(q,r)=>r.json(pub(q.user)));

// ---- customer files: locked inside own src/ and public/ folders ----
const safe=n=>{const b=path.basename(String(n||''));return b&&b!=='.'&&b!=='..'?b:null};
const dirMw=(q,r,n)=>{if(!['src','public'].includes(q.params.dir))return r.status(400).json({error:'Bad folder'});
  q.dir=path.join(ROOT,q.user.id,q.params.dir);fs.mkdirSync(q.dir,{recursive:true});n()};
const upl=multer({storage:multer.diskStorage({destination:(q,f,cb)=>cb(null,q.dir),
  filename:(q,f,cb)=>{const s=safe(f.originalname);s?cb(null,s):cb(new Error('Bad file name'))}}),limits:{fileSize:25*1024*1024}});
const cust=[auth,need('customer')];
A.get('/api/files/:dir',...cust,dirMw,(q,r)=>r.json(fs.readdirSync(q.dir,{withFileTypes:true}).filter(e=>e.isFile()).map(e=>({name:e.name,size:fs.statSync(path.join(q.dir,e.name)).size}))));
A.post('/api/files/:dir',...cust,live,dirMw,upl.single('file'),(q,r)=>r.json({ok:1}));
A.delete('/api/files/:dir/:name',...cust,live,dirMw,(q,r)=>{const s=safe(q.params.name);if(!s)return r.sendStatus(400);fs.rmSync(path.join(q.dir,s),{force:true});r.json({ok:1})});

// ---- super admin only: customers and their (display) allocations ----
const adm=[auth,need('super')],NUM=['ram','cpu','disk'],STR=['name','pkg','ip','osUser'],DT=['start','exp'];
const realDate=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s};
const pick=b=>{const o={};
  for(const k of NUM)if(b[k]!==undefined)o[k]=Math.max(0,+b[k]||0);
  for(const k of STR)if(b[k]!==undefined)o[k]=String(b[k]).slice(0,100);
  for(const k of DT)if(b[k]!==undefined&&b[k]!==''){if(!realDate(String(b[k])))throw new Error('Dates must be real calendar dates (YYYY-MM-DD)');o[k]=b[k]}return o};
A.get('/api/admin/users',...adm,(q,r)=>r.json(db.users.filter(u=>u.role==='customer').map(pub)));
A.post('/api/admin/users',...adm,(q,r)=>{const b=q.body;
  if(!/^[a-z0-9_.-]{3,32}$/i.test(b.username||'')||String(b.password||'').length<8)return r.status(400).json({error:'Username 3-32 chars (letters, numbers, . _ -), password at least 8 chars'});
  if(db.users.some(u=>u.username===b.username))return r.status(409).json({error:'Username already taken'});
  const u={id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),role:'customer',username:b.username,hash:bcrypt.hashSync(b.password,12),
    name:'',pkg:'Starter',ram:2,cpu:1,disk:20,ip:'',osUser:'',start:today(),exp:today(30),...pick(b)};
  db.users.push(u);save();syncLock(u);r.json(pub(u))});
A.put('/api/admin/users/:id',...adm,(q,r)=>{const u=db.users.find(x=>x.id===q.params.id&&x.role==='customer');if(!u)return r.sendStatus(404);
  const p=pick(q.body); // validate before changing anything
  if(q.body.password){if(String(q.body.password).length<8)return r.status(400).json({error:'Password at least 8 chars'});u.hash=bcrypt.hashSync(q.body.password,12)}
  Object.assign(u,p);save();syncLock(u);r.json(pub(u))});
A.delete('/api/admin/users/:id',...adm,(q,r)=>{const i=db.users.findIndex(x=>x.id===q.params.id&&x.role==='customer');if(i<0)return r.sendStatus(404);
  db.users.splice(i,1);save();fs.rmSync(path.join(ROOT,q.params.id),{recursive:true,force:true});r.json({ok:1})});

A.use(express.static(DIST));
A.get(/^\/(?!api\/).*/,(q,r)=>r.sendFile(path.join(DIST,'index.html')));
A.use((e,q,r,n)=>r.status(400).json({error:e.message||'Error'}));
A.listen(PORT,'127.0.0.1',()=>console.log('Panel on 127.0.0.1:'+PORT));
