
/* ============================================================
 * Standalone shims
 *
 * In Claude the page runs inside a host that supplies the model
 * connection and a storage object. On its own it has neither, so:
 *
 *   - the key lives in this browser's localStorage and is put on the
 *     request by the browser itself. It is never sent anywhere except
 *     to api.anthropic.com, and there is no server in between because
 *     there is no server at all.
 *   - window.storage is backed by localStorage with the same three
 *     methods the app already calls.
 *
 * The honest limitation, stated on the screen as well as here: a key
 * held in a browser is readable by anything that can run script on
 * this page. Use a key you can revoke, and do not put a key you care
 * about into any page you did not build.
 * ============================================================ */

const KEY_STORE = "plainer:key";

function getKey() {
  try {
    return localStorage.getItem(KEY_STORE) || "";
  } catch {
    return "";
  }
}

window.storage = {
  async get(k) {
    const v = localStorage.getItem("plainer:store:" + k);
    return v === null ? null : { key: k, value: v };
  },
  async set(k, v) {
    localStorage.setItem("plainer:store:" + k, v);
    return { key: k, value: v };
  },
  async delete(k) {
    localStorage.removeItem("plainer:store:" + k);
    return { key: k, deleted: true };
  },
};

/* Every call in the app goes through fetch to the messages endpoint.
 * Intercept it once here rather than editing each call site, so the
 * app code stays identical to the version that runs inside Claude. */
/* Guarded: a page that assumes fetch exists dies silently and without a
 * message on anything that lacks it. */
const rawFetch =
  typeof window.fetch === "function"
    ? window.fetch.bind(window)
    : function () {
        return Promise.reject(
          new Error("This browser is too old to run plainer: it has no fetch.")
        );
      };

window.fetch = function (url, opts = {}) {
  if (typeof url === "string" && url.includes("api.anthropic.com")) {
    const key = getKey();
    if (!key) {
      return Promise.reject(new Error("NO_KEY"));
    }
    opts = {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
    };
  }
  return rawFetch(url, opts);
};

function KeyGate({ onReady }) {
  const [value, setValue] = React.useState("");
  const [checking, setChecking] = React.useState(false);
  const [problem, setProblem] = React.useState("");

  const save = async () => {
    const k = value.trim();
    if (!k) return;
    setChecking(true);
    setProblem("");
    try {
      localStorage.setItem(KEY_STORE, k);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem(KEY_STORE);
        setProblem("That key was refused. Check you copied all of it.");
      } else if (!res.ok) {
        localStorage.removeItem(KEY_STORE);
        setProblem(`The API answered ${res.status}. Try again in a moment.`);
      } else {
        onReady();
      }
    } catch (e) {
      localStorage.removeItem(KEY_STORE);
      setProblem("Could not reach the API. Check your connection.");
    } finally {
      setChecking(false);
    }
  };

  const box = {
    minHeight: "100vh",
    background: "#E3E6E1",
    display: "grid",
    placeItems: "center",
    padding: 24,
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    color: "#16191A",
  };
  const card = {
    background: "#fff",
    padding: "40px 44px",
    maxWidth: 620,
    boxShadow: "0 1px 2px rgba(0,0,0,.07), 0 12px 28px rgba(0,0,0,.06)",
  };

  return (
    <div style={box}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
          <span style={{ fontFamily: "'Spectral', Georgia, serif", fontSize: 22, color: "#B03A2E" }}>
            ¶
          </span>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600 }}>plainer</h1>
        </div>
        <p style={{ fontSize: 14, color: "#6E736D", margin: "0 0 26px" }}>
          shows you what it changed, and why
        </p>

        <p style={{ fontSize: 14.5, lineHeight: 1.65, margin: "0 0 18px" }}>
          This copy runs entirely in your browser and has no server behind
          it, so it uses your own Anthropic API key. The key is stored in
          this browser and sent only to Anthropic.
        </p>

        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="sk-ant-..."
          style={{
            width: "100%",
            padding: "11px 13px",
            border: "1px solid rgba(22,25,26,.25)",
            fontFamily: "inherit",
            fontSize: 14,
            outline: "none",
          }}
        />

        <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={save}
            disabled={!value.trim() || checking}
            style={{
              background: "#16191A",
              color: "#F6F7F4",
              border: "none",
              padding: "11px 20px",
              fontSize: 14,
              fontFamily: "inherit",
              cursor: "pointer",
              opacity: value.trim() && !checking ? 1 : 0.45,
            }}
          >
            {checking ? "Checking…" : "Start"}
          </button>
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13.5, color: "#6E736D" }}
          >
            Where to get a key
          </a>
        </div>

        {problem && (
          <p style={{ marginTop: 14, fontSize: 13.5, color: "#B03A2E" }}>{problem}</p>
        )}

        <p style={{ marginTop: 30, fontSize: 12.5, color: "#6E736D", lineHeight: 1.6 }}>
          A key kept in a browser can be read by anything able to run script
          on the page. Use one you can revoke, watch your usage, and do not
          paste a key into a page you did not build or cannot read.
        </p>
      </div>
    </div>
  );
}

function Root() {
  const [ready, setReady] = React.useState(!!getKey());
  return ready ? <Plainer /> : <KeyGate onReady={() => setReady(true)} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
