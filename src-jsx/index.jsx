
const { useState, useEffect, useMemo } = React;

function App(){
  const [cfg,setCfg]=useState(null);
  const [step,setStep]=useState("intake"); // intake | goal | env | quiz | loading | done
  const [intake,setIntake]=useState({});
  const [goal,setGoal]=useState(null);
  const [envs,setEnvs]=useState([]);
  const [answers,setAnswers]=useState({});
  const [err,setErr]=useState(null);
  const startRef = useMemo(()=>({t:Date.now()}),[]);

  useEffect(()=>{ fetch("/api/config").then(r=>r.json()).then(setCfg).catch(()=>setErr("설정 로드 실패")); },[]);
  if(!cfg) return <div className="wrap"><div className="spin"></div></div>;

  // 노출 질문 필터
  const visibleQuestions = cfg.QUESTIONS.filter(q=>{
    const trackOk = q.track==="both" || goal==="both" || q.track===goal;
    const envOk = q.envs.includes("*") || q.envs.some(e=>envs.includes(e));
    return trackOk && envOk;
  });
  const scored = visibleQuestions.filter(q=>q.type!=="text");
  const answeredScored = scored.filter(q=>answers[q.id]!=null).length;
  const progress = scored.length? Math.round(answeredScored/scored.length*100):0;

  // intake 검증
  const intakeOk = cfg.INTAKE_FIELDS.filter(f=>f.required).every(f=>intake[f.id] && String(intake[f.id]).trim());

  async function submit(){
    setStep("loading"); setErr(null);
    try{
      const res = await fetch("/api/submit",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({intake,goal,envs,answers,duration_ms:Date.now()-startRef.t})
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error||"제출 실패");
      setStep("done");
      window.scrollTo(0,0);
    }catch(e){ setErr(String(e.message||e)); setStep("quiz"); }
  }

  return (
  <div className="wrap">
    {step==="intake" && (
      <div className="hero"><h1>우리 회사 데이터, AI 쓸 준비 됐을까요?</h1>
        <p>5분이면 끝나는 자가진단으로 데이터 성숙도를 레벨로 확인하고, 맞춤 로드맵을 받아보세요.</p></div>
    )}

    {/* STEP: intake */}
    {step==="intake" && (
      <div className="card">
        <h2>시작 전 기본 정보</h2>
        <p className="muted">결과 회신과 진단 정확도를 위해 입력해 주세요. <span style={{color:"var(--pwc-orange)"}}>*</span> 필수</p>
        <div className="grid2">
          {cfg.INTAKE_FIELDS.map(f=>(
            <label className="fld" key={f.id} style={f.id==="target_process"?{gridColumn:"1 / -1"}:{}}>
              <span className="lab">{f.label}{f.required && <span className="req">*</span>}</span>
              {f.type==="select"
                ? <select value={intake[f.id]||""} onChange={e=>setIntake({...intake,[f.id]:e.target.value})}>
                    <option value="">선택</option>
                    {f.options.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                : <input type={f.type} placeholder={f.placeholder||""} value={intake[f.id]||""}
                    onChange={e=>setIntake({...intake,[f.id]:e.target.value})}/>}
            </label>
          ))}
        </div>
        <div className="btn-row"><span/>
          <button className="btn" disabled={!intakeOk} onClick={()=>{setStep("goal");window.scrollTo(0,0);}}>다음 →</button>
        </div>
      </div>
    )}

    {/* STEP: goal */}
    {step==="goal" && (
      <div className="card">
        <h2>어떤 AI를 도입하고 싶으신가요?</h2>
        <p className="muted">목적에 따라 진단 질문이 달라집니다.</p>
        {cfg.GOALS.map(g=>(
          <div key={g.id} className={"opt-card"+(goal===g.id?" sel":"")} onClick={()=>setGoal(g.id)}>
            <div className="opt-ico">{g.icon}</div>
            <div className="opt-body"><b>{g.label}</b><span>{g.desc}</span></div>
          </div>
        ))}
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={()=>setStep("intake")}>← 이전</button>
          <button className="btn" disabled={!goal} onClick={()=>{setStep("env");window.scrollTo(0,0);}}>다음 →</button>
        </div>
      </div>
    )}

    {/* STEP: env */}
    {step==="env" && (
      <div className="card">
        <h2>현재 데이터는 주로 어디에 있나요?</h2>
        <p className="muted">해당하는 환경을 모두 선택하세요. 선택한 환경에 맞는 질문만 보여드립니다.</p>
        {cfg.ENVS.map(e=>{
          const sel=envs.includes(e.id);
          return <div key={e.id} className={"opt-card"+(sel?" sel":"")}
            onClick={()=>setEnvs(sel?envs.filter(x=>x!==e.id):[...envs,e.id])}>
            <div className="opt-ico">{e.icon}</div>
            <div className="opt-body"><b>{e.label}</b><span>{e.desc}</span></div>
          </div>;
        })}
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={()=>setStep("goal")}>← 이전</button>
          <button className="btn" disabled={!envs.length} onClick={()=>{setStep("quiz");window.scrollTo(0,0);}}>진단 시작 →</button>
        </div>
      </div>
    )}

    {/* STEP: quiz */}
    {step==="quiz" && (
      <div className="card">
        <h2>진단 질문</h2>
        <div className="prog"><i style={{width:progress+"%"}}/></div>
        <div className="prog-lab">{answeredScored} / {scored.length} 문항</div>
        {err && <p style={{color:"var(--pwc-orange)",fontSize:13}}>⚠️ {err}</p>}
        {visibleQuestions.map(q=>(
          <div className="q-block" key={q.id}>
            {q.dim && <span className="q-tag">{cfg.DIMS[q.dim]?.name}</span>}
            <div className="q-text">{q.q}</div>
            {q.type==="text"
              ? <textarea placeholder={q.placeholder||""} value={answers[q.id]||""}
                  onChange={e=>setAnswers({...answers,[q.id]:e.target.value})}/>
              : <div className="scale">
                  {q.options.map(o=>{
                    const sel=Number(answers[q.id])===o.score;
                    return <div key={o.score} className={"opt"+(sel?" sel":"")}
                      onClick={()=>setAnswers({...answers,[q.id]:o.score})}>
                      <span className="dot"/>{o.label}
                    </div>;
                  })}
                </div>}
          </div>
        ))}
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={()=>setStep("env")}>← 이전</button>
          <button className="btn" disabled={answeredScored<scored.length} onClick={submit}>
            {answeredScored<scored.length? `미응답 ${scored.length-answeredScored}문항` : "결과 보기 →"}
          </button>
        </div>
      </div>
    )}

    {/* STEP: loading */}
    {step==="loading" && (
      <div className="card" style={{textAlign:"center"}}>
        <div className="spin"></div>
        <h2>AI가 결과를 분석하고 있어요</h2>
        <p className="muted">점수 계산 + 맞춤 평가 생성 중입니다. 잠시만 기다려 주세요.</p>
      </div>
    )}

    {/* STEP: done — 현업에게는 결과를 노출하지 않고 감사 안내로 종료 */}
    {step==="done" && (
      <div className="done-screen">
        <div className="done-card">
          <div className="done-check">✓</div>
          <h1>감사합니다!</h1>
          <p>자가진단이 정상적으로 제출되었습니다.<br/>
             담당 컨설턴트가 결과를 검토한 뒤 회신드리겠습니다.</p>
        </div>
      </div>
    )}

    <div className="footer">© PwC — 데이터 AI Readiness 자가진단</div>
  </div>);
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
