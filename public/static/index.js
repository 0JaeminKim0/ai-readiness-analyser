const {
  useState,
  useEffect,
  useMemo
} = React;
function App() {
  const [cfg, setCfg] = useState(null);
  const [step, setStep] = useState("intake"); // intake | goal | env | quiz | loading | done
  const [intake, setIntake] = useState({});
  const [goal, setGoal] = useState(null);
  const [envs, setEnvs] = useState([]);
  const [answers, setAnswers] = useState({});
  const [err, setErr] = useState(null);
  const startRef = useMemo(() => ({
    t: Date.now()
  }), []);
  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(setCfg).catch(() => setErr("설정 로드 실패"));
  }, []);
  if (!cfg) return /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "spin"
  }));

  // 노출 질문 필터
  const visibleQuestions = cfg.QUESTIONS.filter(q => {
    const trackOk = q.track === "both" || goal === "both" || q.track === goal;
    const envOk = q.envs.includes("*") || q.envs.some(e => envs.includes(e));
    return trackOk && envOk;
  });
  const scored = visibleQuestions.filter(q => q.type !== "text");
  const answeredScored = scored.filter(q => answers[q.id] != null).length;
  const progress = scored.length ? Math.round(answeredScored / scored.length * 100) : 0;

  // intake 검증
  const intakeOk = cfg.INTAKE_FIELDS.filter(f => f.required).every(f => intake[f.id] && String(intake[f.id]).trim());
  async function submit() {
    setStep("loading");
    setErr(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          intake,
          goal,
          envs,
          answers,
          duration_ms: Date.now() - startRef.t
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "제출 실패");
      setStep("done");
      window.scrollTo(0, 0);
    } catch (e) {
      setErr(String(e.message || e));
      setStep("quiz");
    }
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, step === "intake" && /*#__PURE__*/React.createElement("div", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("h1", null, "\uC6B0\uB9AC \uD68C\uC0AC \uB370\uC774\uD130, AI \uC4F8 \uC900\uBE44 \uB410\uC744\uAE4C\uC694?"), /*#__PURE__*/React.createElement("p", null, "5\uBD84\uC774\uBA74 \uB05D\uB098\uB294 \uC790\uAC00\uC9C4\uB2E8\uC73C\uB85C \uB370\uC774\uD130 \uC131\uC219\uB3C4\uB97C \uB808\uBCA8\uB85C \uD655\uC778\uD558\uACE0, \uB9DE\uCDA4 \uB85C\uB4DC\uB9F5\uC744 \uBC1B\uC544\uBCF4\uC138\uC694.")), step === "intake" && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("h2", null, "\uC2DC\uC791 \uC804 \uAE30\uBCF8 \uC815\uBCF4"), /*#__PURE__*/React.createElement("p", {
    className: "muted"
  }, "\uACB0\uACFC \uD68C\uC2E0\uACFC \uC9C4\uB2E8 \uC815\uD655\uB3C4\uB97C \uC704\uD574 \uC785\uB825\uD574 \uC8FC\uC138\uC694. ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--pwc-orange)"
    }
  }, "*"), " \uD544\uC218"), /*#__PURE__*/React.createElement("div", {
    className: "grid2"
  }, cfg.INTAKE_FIELDS.map(f => /*#__PURE__*/React.createElement("label", {
    className: "fld",
    key: f.id,
    style: f.id === "target_process" ? {
      gridColumn: "1 / -1"
    } : {}
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, f.label, f.required && /*#__PURE__*/React.createElement("span", {
    className: "req"
  }, "*")), f.type === "select" ? /*#__PURE__*/React.createElement("select", {
    value: intake[f.id] || "",
    onChange: e => setIntake({
      ...intake,
      [f.id]: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\uC120\uD0DD"), f.options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o))) : /*#__PURE__*/React.createElement("input", {
    type: f.type,
    placeholder: f.placeholder || "",
    value: intake[f.id] || "",
    onChange: e => setIntake({
      ...intake,
      [f.id]: e.target.value
    })
  })))), /*#__PURE__*/React.createElement("div", {
    className: "btn-row"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    disabled: !intakeOk,
    onClick: () => {
      setStep("goal");
      window.scrollTo(0, 0);
    }
  }, "\uB2E4\uC74C \u2192"))), step === "goal" && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("h2", null, "\uC5B4\uB5A4 AI\uB97C \uB3C4\uC785\uD558\uACE0 \uC2F6\uC73C\uC2E0\uAC00\uC694?"), /*#__PURE__*/React.createElement("p", {
    className: "muted"
  }, "\uBAA9\uC801\uC5D0 \uB530\uB77C \uC9C4\uB2E8 \uC9C8\uBB38\uC774 \uB2EC\uB77C\uC9D1\uB2C8\uB2E4."), cfg.GOALS.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.id,
    className: "opt-card" + (goal === g.id ? " sel" : ""),
    onClick: () => setGoal(g.id)
  }, /*#__PURE__*/React.createElement("div", {
    className: "opt-ico"
  }, g.icon), /*#__PURE__*/React.createElement("div", {
    className: "opt-body"
  }, /*#__PURE__*/React.createElement("b", null, g.label), /*#__PURE__*/React.createElement("span", null, g.desc)))), /*#__PURE__*/React.createElement("div", {
    className: "btn-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setStep("intake")
  }, "\u2190 \uC774\uC804"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    disabled: !goal,
    onClick: () => {
      setStep("env");
      window.scrollTo(0, 0);
    }
  }, "\uB2E4\uC74C \u2192"))), step === "env" && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("h2", null, "\uD604\uC7AC \uB370\uC774\uD130\uB294 \uC8FC\uB85C \uC5B4\uB514\uC5D0 \uC788\uB098\uC694?"), /*#__PURE__*/React.createElement("p", {
    className: "muted"
  }, "\uD574\uB2F9\uD558\uB294 \uD658\uACBD\uC744 \uBAA8\uB450 \uC120\uD0DD\uD558\uC138\uC694. \uC120\uD0DD\uD55C \uD658\uACBD\uC5D0 \uB9DE\uB294 \uC9C8\uBB38\uB9CC \uBCF4\uC5EC\uB4DC\uB9BD\uB2C8\uB2E4."), cfg.ENVS.map(e => {
    const sel = envs.includes(e.id);
    return /*#__PURE__*/React.createElement("div", {
      key: e.id,
      className: "opt-card" + (sel ? " sel" : ""),
      onClick: () => setEnvs(sel ? envs.filter(x => x !== e.id) : [...envs, e.id])
    }, /*#__PURE__*/React.createElement("div", {
      className: "opt-ico"
    }, e.icon), /*#__PURE__*/React.createElement("div", {
      className: "opt-body"
    }, /*#__PURE__*/React.createElement("b", null, e.label), /*#__PURE__*/React.createElement("span", null, e.desc)));
  }), /*#__PURE__*/React.createElement("div", {
    className: "btn-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setStep("goal")
  }, "\u2190 \uC774\uC804"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    disabled: !envs.length,
    onClick: () => {
      setStep("quiz");
      window.scrollTo(0, 0);
    }
  }, "\uC9C4\uB2E8 \uC2DC\uC791 \u2192"))), step === "quiz" && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("h2", null, "\uC9C4\uB2E8 \uC9C8\uBB38"), /*#__PURE__*/React.createElement("div", {
    className: "prog"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: progress + "%"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "prog-lab"
  }, answeredScored, " / ", scored.length, " \uBB38\uD56D"), err && /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--pwc-orange)",
      fontSize: 13
    }
  }, "\u26A0\uFE0F ", err), visibleQuestions.map(q => /*#__PURE__*/React.createElement("div", {
    className: "q-block",
    key: q.id
  }, q.dim && /*#__PURE__*/React.createElement("span", {
    className: "q-tag"
  }, cfg.DIMS[q.dim]?.name), /*#__PURE__*/React.createElement("div", {
    className: "q-text"
  }, q.q), q.type === "text" ? /*#__PURE__*/React.createElement("textarea", {
    placeholder: q.placeholder || "",
    value: answers[q.id] || "",
    onChange: e => setAnswers({
      ...answers,
      [q.id]: e.target.value
    })
  }) : /*#__PURE__*/React.createElement("div", {
    className: "scale"
  }, q.options.map(o => {
    const sel = Number(answers[q.id]) === o.score;
    return /*#__PURE__*/React.createElement("div", {
      key: o.score,
      className: "opt" + (sel ? " sel" : ""),
      onClick: () => setAnswers({
        ...answers,
        [q.id]: o.score
      })
    }, /*#__PURE__*/React.createElement("span", {
      className: "dot"
    }), o.label);
  })))), /*#__PURE__*/React.createElement("div", {
    className: "btn-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setStep("env")
  }, "\u2190 \uC774\uC804"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    disabled: answeredScored < scored.length,
    onClick: submit
  }, answeredScored < scored.length ? `미응답 ${scored.length - answeredScored}문항` : "결과 보기 →"))), step === "loading" && /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "spin"
  }), /*#__PURE__*/React.createElement("h2", null, "AI\uAC00 \uACB0\uACFC\uB97C \uBD84\uC11D\uD558\uACE0 \uC788\uC5B4\uC694"), /*#__PURE__*/React.createElement("p", {
    className: "muted"
  }, "\uC810\uC218 \uACC4\uC0B0 + \uB9DE\uCDA4 \uD3C9\uAC00 \uC0DD\uC131 \uC911\uC785\uB2C8\uB2E4. \uC7A0\uC2DC\uB9CC \uAE30\uB2E4\uB824 \uC8FC\uC138\uC694.")), step === "done" && /*#__PURE__*/React.createElement("div", {
    className: "done-screen"
  }, /*#__PURE__*/React.createElement("div", {
    className: "done-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "done-check"
  }, "\u2713"), /*#__PURE__*/React.createElement("h1", null, "\uAC10\uC0AC\uD569\uB2C8\uB2E4!"), /*#__PURE__*/React.createElement("p", null, "\uC790\uAC00\uC9C4\uB2E8\uC774 \uC815\uC0C1\uC801\uC73C\uB85C \uC81C\uCD9C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", /*#__PURE__*/React.createElement("br", null), "\uB2F4\uB2F9 \uCEE8\uC124\uD134\uD2B8\uAC00 \uACB0\uACFC\uB97C \uAC80\uD1A0\uD55C \uB4A4 \uD68C\uC2E0\uB4DC\uB9AC\uACA0\uC2B5\uB2C8\uB2E4."))), /*#__PURE__*/React.createElement("div", {
    className: "footer"
  }, "\xA9 PwC \u2014 \uB370\uC774\uD130 AI Readiness \uC790\uAC00\uC9C4\uB2E8"));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));