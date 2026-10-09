(function () {
  "use strict";
  var cfg = window.SITE_CONFIG || {};
  var url = (cfg.supabaseUrl || "").replace(/\/$/, "");
  var key = cfg.supabaseAnonKey || "";
  var configured = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url) && key.length > 20;

  // ---- links from config ----
  document.querySelectorAll("[data-link]").forEach(function (a) {
    var href = cfg.links && cfg.links[a.getAttribute("data-link")];
    if (href) { a.href = href; }
    a.target = "_blank"; a.rel = "noopener";
  });

  // ---- the form ----
  var form = document.getElementById("signup");
  var done = document.getElementById("done");
  var errorBox = document.getElementById("form-error");
  var submit = document.getElementById("submit");
  var download = document.getElementById("download");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (cfg.pdf) { download.href = cfg.pdf; }

  function showError(msg, field) {
    errorBox.textContent = msg; errorBox.hidden = false;
    form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
    if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); }
    submit.disabled = false; submit.textContent = "Get the cheat sheet";
  }

  function showDone(name, workshop, preview) {
    form.hidden = true; done.hidden = false;
    var first = (name || "").trim().split(/\s+/)[0];
    document.getElementById("done-title").textContent = first ? "Thanks, " + first + ". Here is your sheet." : "Thanks. Here is your sheet.";
    var fine = document.getElementById("done-fine");
    fine.textContent = workshop
      ? "You are on the workshop list. One email when the dates are set, nothing else."
      : "No emails will follow. Changed your mind about the workshop? Reload and send the form again.";
    if (preview) { fine.textContent += " (Preview: nothing was saved, Supabase is not connected yet.)"; }
    done.focus({ preventScroll: true });
    done.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    try { localStorage.setItem("ros2sheet", JSON.stringify({ name: first, workshop: !!workshop, at: Date.now() })); } catch (e) {}
  }

  // Returning visitors (90 days) go straight to the download.
  try {
    var prev = JSON.parse(localStorage.getItem("ros2sheet") || "null");
    if (prev && prev.at && Date.now() - prev.at < 1000 * 60 * 60 * 24 * 90) {
      form.hidden = true; done.hidden = false;
      document.getElementById("done-title").textContent = prev.name ? "Welcome back, " + prev.name + "." : "Welcome back.";
      document.getElementById("done-note").textContent = "Your details are already in. Here is the sheet again.";
      document.getElementById("done-fine").textContent = prev.workshop ? "You are on the workshop list." : "";
    }
  } catch (e) {}

  // Where did this sign-up come from? Share links as ?ref=youtube, ?ref=x and so on.
  function source() {
    var ref = new URLSearchParams(location.search).get("ref");
    return (ref ? "ref:" + ref : location.pathname).slice(0, 200);
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    errorBox.hidden = true;
    var data = new FormData(form);
    var name = (data.get("name") || "").toString().trim().replace(/\s+/g, " ");
    var email = (data.get("email") || "").toString().trim().toLowerCase();
    var experience = (data.get("experience") || "new").toString();
    var workshop = data.get("workshop") === "yes";
    var website = (data.get("website") || "").toString();

    if (name.length < 1) { return showError("Please add your name.", form.elements.name); }
    if (name.length > 80) { return showError("That name is longer than 80 characters.", form.elements.name); }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email) || email.length > 254) { return showError("That email address does not look right.", form.elements.email); }

    submit.disabled = true; submit.textContent = "One moment";

    if (!configured) {
      console.warn("Supabase is not configured in config.js; running in preview mode.");
      return setTimeout(function () { showDone(name, workshop, true); }, 500);
    }

    var headers = { "apikey": key, "Content-Type": "application/json", "Prefer": "return=minimal" };
    // Legacy anon keys are JWTs and also go in Authorization; the new publishable keys do not need it.
    if (key.indexOf("eyJ") === 0) { headers["Authorization"] = "Bearer " + key; }

    fetch(url + "/rest/v1/rpc/submit_signup", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ p_name: name, p_email: email, p_experience: experience, p_workshop: workshop, p_source: source(), p_website: website })
    }).then(function (res) {
      if (res.ok) { return showDone(name, workshop, false); }
      return res.text().then(function (t) {
        var msg = "Something went wrong saving your details. Please try again in a minute.";
        if (/rate_limited/.test(t)) { msg = "Too many sign-ups from this connection. Please try again in an hour."; }
        else if (/email/i.test(t) && /check|constraint|invalid/i.test(t)) { msg = "That email address does not look right."; }
        else if (res.status === 401 || res.status === 403) { msg = "The form is not connected properly. The site owner needs to check config.js."; }
        console.error("submit_signup failed", res.status, t);
        showError(msg);
      });
    }).catch(function (err) {
      console.error(err);
      showError("Could not reach the server. Check your connection and try again.");
    });
  });
})();
