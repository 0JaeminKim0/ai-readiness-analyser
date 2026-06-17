const {
  useState,
  useEffect
} = React;
function md(src) {
  if (!src) return "";
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = src.split("\n");
  let h = "";
  let ul = false;
  const c = () => {
    if (ul) {
      h += "</ul>";
      ul = false;
    }
  };
  const inl = s => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  for (let raw of lines) {
    let l = raw.trimEnd();
    if (/^### /.test(l)) {
      c();
      h += "<h3>" + inl(esc(l.slice(4))) + "</h3>";
      continue;
    }
    if (/^## /.test(l)) {
      c();
      h += "<h2>" + inl(esc(l.slice(3))) + "</h2>";
      continue;
    }
    if (/^> /.test(l)) {
      c();
      h += "<blockquote style='border-left:3px solid #EB8C00;margin:8px 0;padding:4px 12px;color:#5A6473'>" + inl(esc(l.slice(2))) + "</blockquote>";
      continue;
    }
    if (/^[-*] /.test(l)) {
      if (!ul) {
        h += "<ul>";
        ul = true;
      }
      h += "<li>" + inl(esc(l.slice(2))) + "</li>";
      continue;
    }
    if (l.trim() === "") {
      c();
      continue;
    }
    c();
    h += "<p>" + inl(esc(l)) + "</p>";
  }
  c();
  return h;
}
const KEY_LS = "pwc_admin_key";
function App() {
  const [key, setKey] = useState(localStorage.getItem(KEY_LS) || "");
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  const [toast, setToast] = useState(null);
  const [loginErr, setLoginErr] = useState(null);
  function showToast(t) {
    setToast(t);
    setTimeout(() => setToast(null), 2200);
  }
  async function api(path, opts = {}) {
    const r = await fetch(path, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        "X-Admin-Key": key,
        "Content-Type": "application/json"
      }
    });
    if (r.status === 401) {
      setAuthed(false);
      throw new Error("unauthorized");
    }
    return r.json();
  }
  async function loadList() {
    const d = await api("/api/admin/submissions");
    setItems(d.items || []);
  }
  async function login() {
    setLoginErr(null);
    try {
      const r = await fetch("/api/admin/submissions", {
        headers: {
          "X-Admin-Key": key
        }
      });
      if (r.status === 401) {
        setLoginErr("비밀번호가 올바르지 않습니다.");
        return;
      }
      const d = await r.json();
      setItems(d.items || []);
      localStorage.setItem(KEY_LS, key);
      setAuthed(true);
    } catch (e) {
      setLoginErr("연결 실패");
    }
  }
  useEffect(() => {
    if (key) {
      login();
    }
  }, []); // 자동 로그인 시도

  async function openDetail(id) {
    const d = await api("/api/admin/submissions/" + id);
    setSel(d);
  }
  if (!authed) return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Topbar, null), /*#__PURE__*/React.createElement("div", {
    className: "login card"
  }, /*#__PURE__*/React.createElement("h2", null, "\uD3C9\uAC00\uC790 \uB85C\uADF8\uC778"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    placeholder: "Admin \uBE44\uBC00\uBC88\uD638",
    value: key,
    onChange: e => setKey(e.target.value),
    onKeyDown: e => e.key === "Enter" && login()
  }), loginErr && /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--pwc-orange)",
      fontSize: 13
    }
  }, loginErr), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    style: {
      marginTop: 12,
      width: "100%"
    },
    onClick: login
  }, "\uB85C\uADF8\uC778")));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Topbar, {
    onRefresh: loadList
  }), /*#__PURE__*/React.createElement("div", {
    className: "layout"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0
    }
  }, "\uC751\uB2F5 \uBAA9\uB85D (", items.length, ")"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm ghost",
    onClick: loadList
  }, "\uC0C8\uB85C\uACE0\uCE68")), /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "\uD68C\uC0AC/\uB2F4\uB2F9"), /*#__PURE__*/React.createElement("th", null, "\uBAA9\uC801"), /*#__PURE__*/React.createElement("th", null, "Lv"), /*#__PURE__*/React.createElement("th", null, "\uC0C1\uD0DC"))), /*#__PURE__*/React.createElement("tbody", null, items.map(it => /*#__PURE__*/React.createElement("tr", {
    key: it.id,
    className: "item" + (sel && sel.item.id === it.id ? " sel" : ""),
    onClick: () => openDetail(it.id)
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, it.company || "-"), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--sub)",
      fontSize: 12
    }
  }, it.respondent, " \xB7 ", new Date(it.created_at).toLocaleDateString())), /*#__PURE__*/React.createElement("td", {
    style: {
      fontSize: 12
    }
  }, it.goal === "P" ? "예측" : it.goal === "G" ? "생성" : "둘다"), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "lvl"
  }, it.override_level || it.scores?.overall?.level || "-")), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Status, {
    s: it.status
  })))), !items.length && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "4",
    style: {
      color: "var(--sub)",
      textAlign: "center",
      padding: 24
    }
  }, "\uC544\uC9C1 \uC751\uB2F5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."))))), /*#__PURE__*/React.createElement("div", null, sel ? /*#__PURE__*/React.createElement(Detail, {
    data: sel,
    api: api,
    onSaved: () => {
      loadList();
      showToast("저장되었습니다");
    }
  }) : /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      color: "var(--sub)",
      textAlign: "center",
      padding: 50
    }
  }, "\uC67C\uCABD\uC5D0\uC11C \uC751\uB2F5\uC744 \uC120\uD0DD\uD558\uC138\uC694."))), toast && /*#__PURE__*/React.createElement("div", {
    className: "toast"
  }, toast));
}
function Topbar({
  onRefresh
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "topbar-inner"
  }, /*#__PURE__*/React.createElement("img", {
    className: "pwc-logo-img",
    src: "/pwc-logo.png",
    alt: "PwC"
  }), /*#__PURE__*/React.createElement("div", {
    className: "topbar-title"
  }, /*#__PURE__*/React.createElement("b", null, "AI Readiness \xB7 Admin"), "\uD3C9\uAC00 \uCF58\uC194")));
}
function Status({
  s
}) {
  const m = {
    submitted: ["접수", "p-submitted"],
    reviewing: ["검토중", "p-reviewing"],
    done: ["완료", "p-done"]
  };
  const [t, c] = m[s] || m.submitted;
  return /*#__PURE__*/React.createElement("span", {
    className: "pill " + c
  }, t);
}
function Detail({
  data,
  api,
  onSaved
}) {
  const it = data.item,
    sc = it.scores,
    ev = it.evaluation || {};
  const [form, setForm] = useState({
    evaluator: ev.evaluator || "",
    override_level: ev.override_level || sc?.overall?.level || "",
    recommend_track: ev.recommend_track || it.goal || "both",
    grade: ev.grade || "",
    comment: ev.comment || "",
    internal_memo: ev.internal_memo || ""
  });
  const dims = sc ? Object.values(sc.dimensions) : [];
  const textAnswers = (data.item.answers ? Object.entries(data.item.answers) : []).filter(([k, v]) => typeof v === "string" && v.trim());
  async function save() {
    await api("/api/admin/submissions/" + it.id + "/evaluation", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        override_level: form.override_level ? Number(form.override_level) : null
      })
    });
    onSaved();
  }
  async function setStatus(s) {
    await api("/api/admin/submissions/" + it.id + "/status", {
      method: "POST",
      body: JSON.stringify({
        status: s
      })
    });
    onSaved();
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0
    }
  }, it.company, " \xB7 ", it.department), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm ghost",
    onClick: () => setStatus("reviewing")
  }, "\uAC80\uD1A0\uC911"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    onClick: () => setStatus("done")
  }, "\uC644\uB8CC\uCC98\uB9AC"))), /*#__PURE__*/React.createElement("div", {
    className: "kv",
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "\uB2F4\uB2F9\uC790"), /*#__PURE__*/React.createElement("span", null, it.respondent, " (", it.role || "-", ")"), /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "\uC774\uBA54\uC77C"), /*#__PURE__*/React.createElement("span", null, it.email || "-", " ", it.phone ? " · " + it.phone : ""), /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "\uC0B0\uC5C5/\uADDC\uBAA8"), /*#__PURE__*/React.createElement("span", null, it.industry || "-", " / ", it.company_size || "-"), /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "\uB300\uC0C1 \uC5C5\uBB34"), /*#__PURE__*/React.createElement("span", null, it.target_process || "-"), /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "AI \uBAA9\uC801"), /*#__PURE__*/React.createElement("span", null, it.goal === "P" ? "예측·분석형" : it.goal === "G" ? "생성·RAG형" : "둘 다/미정"), /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "\uD658\uACBD"), /*#__PURE__*/React.createElement("span", null, (it.envs || []).join(", ") || "-"), /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "\uC81C\uCD9C\uC77C\uC2DC"), /*#__PURE__*/React.createElement("span", null, new Date(it.created_at).toLocaleString(), " ", it.duration_ms ? "· 소요 " + Math.round(it.duration_ms / 1000) + "초" : ""))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("h2", null, "\uC790\uB3D9 \uC810\uC218 (\uACB0\uC815\uB860\uC801)"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 10px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lvl"
  }, "\uB808\uBCA8 ", sc?.overall?.level), " ", /*#__PURE__*/React.createElement("b", {
    style: {
      marginLeft: 8
    }
  }, sc?.overall?.levelLabel), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--sub)",
      fontSize: 13
    }
  }, " \xB7 \uD3C9\uADE0 ", sc?.overall?.avg, "/5")), dims.map(d => /*#__PURE__*/React.createElement("div", {
    className: "dimbar",
    key: d.key
  }, /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", null, d.name), /*#__PURE__*/React.createElement("span", null, "Lv.", d.level, " (", d.avg, ")")), /*#__PURE__*/React.createElement("div", {
    className: "track"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: d.avg / 5 * 100 + "%"
    }
  }))))), textAnswers.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("h2", null, "\uD604\uC5C5 \uC790\uC720\uC11C\uC220 (\uC554\uBB35\uC9C0)"), textAnswers.map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    className: "qrow",
    key: k
  }, /*#__PURE__*/React.createElement("div", {
    className: "qa"
  }, v)))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("h2", null, "AI \uC885\uD569 \uD3C9\uAC00 ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--sub)"
    }
  }, "(", it.ai_source === "claude" ? "Claude" : "폴백", ")")), /*#__PURE__*/React.createElement("div", {
    className: "report",
    dangerouslySetInnerHTML: {
      __html: md(it.ai_report)
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("h2", null, "\uD3C9\uAC00\uC790 \uBCF4\uC815 / \uCF54\uBA58\uD2B8"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "\uD3C9\uAC00\uC790"), /*#__PURE__*/React.createElement("input", {
    value: form.evaluator,
    onChange: e => setForm({
      ...form,
      evaluator: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "\uBCF4\uC815 \uB808\uBCA8"), /*#__PURE__*/React.createElement("select", {
    value: form.override_level,
    onChange: e => setForm({
      ...form,
      override_level: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\uC790\uB3D9\uAC12 \uC720\uC9C0"), [1, 2, 3, 4, 5].map(n => /*#__PURE__*/React.createElement("option", {
    key: n,
    value: n
  }, "\uB808\uBCA8 ", n)))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "\uCD94\uCC9C \uD2B8\uB799"), /*#__PURE__*/React.createElement("select", {
    value: form.recommend_track,
    onChange: e => setForm({
      ...form,
      recommend_track: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: "both"
  }, "\uB458 \uB2E4"), /*#__PURE__*/React.createElement("option", {
    value: "P"
  }, "\uC608\uCE21\xB7\uBD84\uC11D\uD615"), /*#__PURE__*/React.createElement("option", {
    value: "G"
  }, "\uC0DD\uC131\xB7RAG\uD615")))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "\uC885\uD569 \uB4F1\uAE09"), /*#__PURE__*/React.createElement("input", {
    placeholder: "\uC608: A / B / C \uB610\uB294 \uC790\uC720 \uC785\uB825",
    value: form.grade,
    onChange: e => setForm({
      ...form,
      grade: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "\uACE0\uAC1D\uC6A9 \uCF54\uBA58\uD2B8"), /*#__PURE__*/React.createElement("textarea", {
    value: form.comment,
    onChange: e => setForm({
      ...form,
      comment: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lab"
  }, "\uB0B4\uBD80 \uBA54\uBAA8 (\uBE44\uACF5\uAC1C)"), /*#__PURE__*/React.createElement("textarea", {
    value: form.internal_memo,
    onChange: e => setForm({
      ...form,
      internal_memo: e.target.value
    })
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: save
  }, "\uD3C9\uAC00 \uC800\uC7A5")));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));