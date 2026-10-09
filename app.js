(() => {
  "use strict";

  const cfg = window.SIGNUP_CONFIG || {};
  const form = document.getElementById("signup-form");
  const statusEl = document.getElementById("form-status");
  const button = form.querySelector('button[type="submit"]');
  const success = document.getElementById("success");
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const EXPERIENCE = ["none", "beginner", "few_projects", "professional"];
  const PDF = "assets/ros2-cheatsheet.pdf";

  document.getElementById("year").textContent = new Date().getFullYear();

  const isConfigured = () =>
    /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(cfg.supabaseUrl || "") &&
    (cfg.supabaseAnonKey || "").length > 20;

  function setFieldError(id, message) {
    const input = id === "experience" ? null : document.getElementById(id);
    const err = document.getElementById(`${id}-err`);
    if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
    if (input && message) input.setAttribute("aria-describedby", `${id}-err`);
    err.textContent = message || "";
    err.hidden = !message;
  }

  function setStatus(html, isError) {
    statusEl.innerHTML = html;
    statusEl.classList.toggle("is-error", !!isError);
  }

  function validate(data) {
    let ok = true;
    if (data.name.length < 1) { setFieldError("name", "Please tell us your name."); ok = false; }
    else if (data.name.length > 100) { setFieldError("name", "That name is a little long (100 characters max)."); ok = false; }
    else setFieldError("name", "");

    if (!EMAIL_RE.test(data.email) || data.email.length > 254) { setFieldError("email", "That email doesn’t look right."); ok = false; }
    else setFieldError("email", "");

    if (!EXPERIENCE.includes(data.ros2_experience)) { setFieldError("experience", "Pick the option closest to you."); ok = false; }
    else setFieldError("experience", "");
    return ok;
  }

  function source() {
    const ref = new URLSearchParams(location.search).get("ref");
    return (ref || cfg.source || "landing").slice(0, 64);
  }

  function showSuccess(name, bootcamp) {
    const first = name.split(/\s+/)[0];
    document.getElementById("success-title").textContent = `You’re in, ${first}.`;
    document.getElementById("success-text").textContent = "Your ROS 2 cheatsheet is ready. Save it somewhere you’ll find it when you start Project 0.";
    document.getElementById("success-bootcamp").hidden = !bootcamp;
    form.hidden = true;
    success.hidden = false;
    success.focus();
  }

  async function insert(row) {
    const url = `${cfg.supabaseUrl.replace(/\/$/, "")}/rest/v1/${encodeURIComponent(cfg.table || "signups")}`;
    const headers = {
      "Content-Type": "application/json",
      apikey: cfg.supabaseAnonKey,
      // Insert-only: we never ask for the row back (anon has no SELECT).
      Prefer: "return=minimal",
    };
    // Legacy anon keys are JWTs and also go in Authorization; new publishable keys don't.
    if (cfg.supabaseAnonKey.startsWith("eyJ")) headers.Authorization = `Bearer ${cfg.supabaseAnonKey}`;

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(row) });
    // 409 = this email is already on the list. Treat it as success so we don't
    // reveal which emails exist, and the reader still gets the download.
    if (res.ok || res.status === 409) return;
    let detail = "";
    try { detail = (await res.json()).message || ""; } catch (_) { /* ignore */ }
    throw new Error(`HTTP ${res.status} ${detail}`.trim());
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");

    const fd = new FormData(form);
    const data = {
      name: String(fd.get("name") || "").trim().replace(/\s+/g, " "),
      email: String(fd.get("email") || "").trim().toLowerCase(),
      ros2_experience: String(fd.get("experience") || ""),
      bootcamp_interest: fd.get("bootcamp") === "on",
    };

    // Honeypot filled → silently pretend it worked.
    if (String(fd.get("website") || "").trim() !== "") { showSuccess(data.name || "there", false); return; }

    if (!validate(data)) {
      const firstBad = form.querySelector('[aria-invalid="true"]') || form.querySelector('input[name="experience"]');
      firstBad && firstBad.focus();
      return;
    }

    if (!isConfigured()) {
      console.warn("Signup form: Supabase is not configured. Fill in config.js.");
      setStatus(`Signups aren’t switched on yet, sorry. You can still <a href="${PDF}" download>download the cheatsheet</a>.`, true);
      return;
    }

    button.classList.add("is-loading");
    button.disabled = true;
    try {
      await insert({
        ...data,
        source: source(),
        user_agent: navigator.userAgent.slice(0, 400),
      });
      showSuccess(data.name, data.bootcamp_interest);
    } catch (err) {
      console.error("Signup failed:", err);
      setStatus(`Something went wrong saving your details. Please try again in a moment, or <a href="${PDF}" download>grab the cheatsheet here</a>.`, true);
    } finally {
      button.classList.remove("is-loading");
      button.disabled = false;
    }
  });

  // Clear a field's error as soon as the reader fixes it.
  form.addEventListener("input", (e) => {
    const t = e.target;
    if (t.name === "experience") setFieldError("experience", "");
    else if (t.id === "name" || t.id === "email") setFieldError(t.id, "");
  });
})();
