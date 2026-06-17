
const {useState,useEffect}=React;
function md(src){if(!src)return"";const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const lines=src.split("\n");let h="";let ul=false;const c=()=>{if(ul){h+="</ul>";ul=false;}};
  const inl=s=>s.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");
  for(let raw of lines){let l=raw.trimEnd();
    if(/^### /.test(l)){c();h+="<h3>"+inl(esc(l.slice(4)))+"</h3>";continue;}
    if(/^## /.test(l)){c();h+="<h2>"+inl(esc(l.slice(3)))+"</h2>";continue;}
    if(/^> /.test(l)){c();h+="<blockquote style='border-left:3px solid #EB8C00;margin:8px 0;padding:4px 12px;color:#5A6473'>"+inl(esc(l.slice(2)))+"</blockquote>";continue;}
    if(/^[-*] /.test(l)){if(!ul){h+="<ul>";ul=true;}h+="<li>"+inl(esc(l.slice(2)))+"</li>";continue;}
    if(l.trim()===""){c();continue;}c();h+="<p>"+inl(esc(l))+"</p>";}
  c();return h;}

const KEY_LS="pwc_admin_key";

function App(){
  const [key,setKey]=useState(localStorage.getItem(KEY_LS)||"");
  const [authed,setAuthed]=useState(false);
  const [items,setItems]=useState([]);
  const [sel,setSel]=useState(null);
  const [toast,setToast]=useState(null);
  const [loginErr,setLoginErr]=useState(null);

  function showToast(t){setToast(t);setTimeout(()=>setToast(null),2200);}
  async function api(path,opts={}){
    const r=await fetch(path,{...opts,headers:{...(opts.headers||{}),"X-Admin-Key":key,"Content-Type":"application/json"}});
    if(r.status===401){setAuthed(false);throw new Error("unauthorized");}
    return r.json();
  }
  async function loadList(){const d=await api("/api/admin/submissions");setItems(d.items||[]);}
  async function login(){
    setLoginErr(null);
    try{const r=await fetch("/api/admin/submissions",{headers:{"X-Admin-Key":key}});
      if(r.status===401){setLoginErr("비밀번호가 올바르지 않습니다.");return;}
      const d=await r.json();setItems(d.items||[]);localStorage.setItem(KEY_LS,key);setAuthed(true);
    }catch(e){setLoginErr("연결 실패");}
  }
  useEffect(()=>{ if(key){ login(); } },[]); // 자동 로그인 시도

  async function openDetail(id){const d=await api("/api/admin/submissions/"+id);setSel(d);}

  if(!authed) return (
    <div>
      <Topbar/>
      <div className="login card">
        <h2>평가자 로그인</h2>
        <input type="password" placeholder="Admin 비밀번호" value={key}
          onChange={e=>setKey(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/>
        {loginErr && <p style={{color:"var(--pwc-orange)",fontSize:13}}>{loginErr}</p>}
        <button className="btn" style={{marginTop:12,width:"100%"}} onClick={login}>로그인</button>
      </div>
    </div>
  );

  return (
  <div>
    <Topbar onRefresh={loadList}/>
    <div className="layout">
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{margin:0}}>응답 목록 ({items.length})</h2>
          <button className="btn btn-sm ghost" onClick={loadList}>새로고침</button>
        </div>
        <table>
          <thead><tr><th>회사/담당</th><th>목적</th><th>Lv</th><th>상태</th></tr></thead>
          <tbody>
            {items.map(it=>(
              <tr key={it.id} className={"item"+(sel&&sel.item.id===it.id?" sel":"")} onClick={()=>openDetail(it.id)}>
                <td><b>{it.company||"-"}</b><br/><span style={{color:"var(--sub)",fontSize:12}}>{it.respondent} · {new Date(it.created_at).toLocaleDateString()}</span></td>
                <td style={{fontSize:12}}>{it.goal==="P"?"예측":it.goal==="G"?"생성":"둘다"}</td>
                <td><span className="lvl">{it.override_level||it.scores?.overall?.level||"-"}</span></td>
                <td><Status s={it.status}/></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="4" style={{color:"var(--sub)",textAlign:"center",padding:24}}>아직 응답이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
      <div>{sel ? <Detail data={sel} api={api} onSaved={()=>{loadList();showToast("저장되었습니다");}}/> :
        <div className="card" style={{color:"var(--sub)",textAlign:"center",padding:50}}>왼쪽에서 응답을 선택하세요.</div>}</div>
    </div>
    {toast && <div className="toast">{toast}</div>}
  </div>);
}

function Topbar({onRefresh}){
  return <div className="topbar"><div className="topbar-inner">
    <img className="pwc-logo-img" src="/pwc-logo.png" alt="PwC" />
    <div className="topbar-title"><b>AI Readiness · Admin</b>평가 콘솔</div>
  </div></div>;
}
function Status({s}){const m={submitted:["접수","p-submitted"],reviewing:["검토중","p-reviewing"],done:["완료","p-done"]};
  const [t,c]=m[s]||m.submitted;return <span className={"pill "+c}>{t}</span>;}

function Detail({data,api,onSaved}){
  const it=data.item, sc=it.scores, ev=it.evaluation||{};
  const [form,setForm]=useState({
    evaluator:ev.evaluator||"",
    override_level:ev.override_level||sc?.overall?.level||"",
    recommend_track:ev.recommend_track||it.goal||"both",
    grade:ev.grade||"",
    comment:ev.comment||"",
    internal_memo:ev.internal_memo||"",
  });
  const dims=sc?Object.values(sc.dimensions):[];
  const textAnswers=(data.item.answers? Object.entries(data.item.answers):[]).filter(([k,v])=>typeof v==="string"&&v.trim());

  async function save(){
    await api("/api/admin/submissions/"+it.id+"/evaluation",{method:"POST",body:JSON.stringify({
      ...form, override_level:form.override_level?Number(form.override_level):null
    })});
    onSaved();
  }
  async function setStatus(s){await api("/api/admin/submissions/"+it.id+"/status",{method:"POST",body:JSON.stringify({status:s})});onSaved();}

  return (
  <div style={{display:"grid",gap:16}}>
    <div className="card">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <h2 style={{margin:0}}>{it.company} · {it.department}</h2>
        <div style={{display:"flex",gap:6}}>
          <button className="btn btn-sm ghost" onClick={()=>setStatus("reviewing")}>검토중</button>
          <button className="btn btn-sm" onClick={()=>setStatus("done")}>완료처리</button>
        </div>
      </div>
      <div className="kv" style={{marginTop:12}}>
        <span className="k">담당자</span><span>{it.respondent} ({it.role||"-"})</span>
        <span className="k">이메일</span><span>{it.email||"-"} {it.phone?(" · "+it.phone):""}</span>
        <span className="k">산업/규모</span><span>{it.industry||"-"} / {it.company_size||"-"}</span>
        <span className="k">대상 업무</span><span>{it.target_process||"-"}</span>
        <span className="k">AI 목적</span><span>{it.goal==="P"?"예측·분석형":it.goal==="G"?"생성·RAG형":"둘 다/미정"}</span>
        <span className="k">환경</span><span>{(it.envs||[]).join(", ")||"-"}</span>
        <span className="k">제출일시</span><span>{new Date(it.created_at).toLocaleString()} {it.duration_ms?("· 소요 "+Math.round(it.duration_ms/1000)+"초"):""}</span>
      </div>
    </div>

    <div className="card">
      <h2>자동 점수 (결정론적)</h2>
      <p style={{margin:"0 0 10px"}}><span className="lvl">레벨 {sc?.overall?.level}</span> <b style={{marginLeft:8}}>{sc?.overall?.levelLabel}</b> <span style={{color:"var(--sub)",fontSize:13}}> · 평균 {sc?.overall?.avg}/5</span></p>
      {dims.map(d=>(
        <div className="dimbar" key={d.key}>
          <div className="row"><span>{d.name}</span><span>Lv.{d.level} ({d.avg})</span></div>
          <div className="track"><i style={{width:(d.avg/5*100)+"%"}}/></div>
        </div>
      ))}
    </div>

    {textAnswers.length>0 && (
      <div className="card">
        <h2>현업 자유서술 (암묵지)</h2>
        {textAnswers.map(([k,v])=><div className="qrow" key={k}><div className="qa">{v}</div></div>)}
      </div>
    )}

    <div className="card">
      <h2>AI 종합 평가 <span style={{fontSize:11,color:"var(--sub)"}}>({it.ai_source==="claude"?"Claude":"폴백"})</span></h2>
      <div className="report" dangerouslySetInnerHTML={{__html:md(it.ai_report)}}/>
    </div>

    <div className="card">
      <h2>평가자 보정 / 코멘트</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        <div className="field"><span className="lab">평가자</span><input value={form.evaluator} onChange={e=>setForm({...form,evaluator:e.target.value})}/></div>
        <div className="field"><span className="lab">보정 레벨</span>
          <select value={form.override_level} onChange={e=>setForm({...form,override_level:e.target.value})}>
            <option value="">자동값 유지</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>레벨 {n}</option>)}
          </select></div>
        <div className="field"><span className="lab">추천 트랙</span>
          <select value={form.recommend_track} onChange={e=>setForm({...form,recommend_track:e.target.value})}>
            <option value="both">둘 다</option><option value="P">예측·분석형</option><option value="G">생성·RAG형</option>
          </select></div>
      </div>
      <div className="field"><span className="lab">종합 등급</span>
        <input placeholder="예: A / B / C 또는 자유 입력" value={form.grade} onChange={e=>setForm({...form,grade:e.target.value})}/></div>
      <div className="field"><span className="lab">고객용 코멘트</span>
        <textarea value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})}/></div>
      <div className="field"><span className="lab">내부 메모 (비공개)</span>
        <textarea value={form.internal_memo} onChange={e=>setForm({...form,internal_memo:e.target.value})}/></div>
      <button className="btn" onClick={save}>평가 저장</button>
    </div>
  </div>);
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
