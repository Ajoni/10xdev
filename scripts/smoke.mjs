// Smoke test: proves the built app, the Cloudflare adapter and the Supabase auth flow still work together.
// Zero dependencies on purpose. Run against a live server: BASE_URL=http://localhost:4321 node scripts/smoke.mjs

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4321";
const stamp = Date.now();
const email = `smoke-${stamp}@example.com`;
const otherEmail = `smoke-other-${stamp}@example.com`;
const password = "Smoke-Test-Passw0rd!";
const jar = new Map();
const otherJar = new Map();
const soonerDeadline = "2026-10-15T15:00:00.000Z";
const laterDeadline = "2026-10-20T12:00:00.000Z";
const movedDeadline = "2026-10-10T15:00:00.000Z";
// PostgREST returns the same instants without fractional seconds.
const soonerShown = "2026-10-15T15:00:00+00:00";
const laterShown = "2026-10-20T12:00:00+00:00";
const movedShown = "2026-10-10T15:00:00+00:00";
const descriptions = ["smoke-sooner-c1-older", "smoke-sooner-c1-newer", "smoke-sooner-c3", "smoke-later-c1"];
const editedNewer = `${descriptions[1]}-edited`;
const originalOrder = [
  descriptions[0],
  soonerShown,
  descriptions[1],
  soonerShown,
  descriptions[2],
  soonerShown,
  descriptions[3],
  laterShown,
];
const remainingOrder = [descriptions[1], soonerShown, descriptions[2], soonerShown, descriptions[3], laterShown];
const movedOrder = [
  descriptions[3],
  movedShown,
  descriptions[0],
  soonerShown,
  descriptions[1],
  soonerShown,
  descriptions[2],
  soonerShown,
];
const editedOrder = [descriptions[0], editedNewer, descriptions[2], descriptions[3]];
const complexityOrder = [
  descriptions[0],
  soonerShown,
  descriptions[1],
  soonerShown,
  descriptions[2],
  "Complexity 5",
  soonerShown,
  descriptions[3],
];
const restoredOrder = [
  descriptions[0],
  soonerShown,
  descriptions[1],
  soonerShown,
  descriptions[2],
  "Complexity 3",
  soonerShown,
  descriptions[3],
  laterShown,
];
const doneActions = {};
let doneAction = "";

function cookieHeader(cookieJar) {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function storeCookies(cookieJar, response) {
  for (const raw of response.headers.getSetCookie()) {
    const [pair, ...attrs] = raw.split(";");
    const [name, ...rest] = pair.split("=");
    const expired = attrs.some((a) => /max-age=0/i.test(a.trim()));
    if (expired) cookieJar.delete(name.trim());
    else cookieJar.set(name.trim(), rest.join("="));
  }
}

async function request(path, { method = "GET", form, cookieJar = jar } = {}) {
  const response = await fetch(BASE_URL + path, {
    method,
    redirect: "manual",
    headers: {
      Cookie: cookieHeader(cookieJar),
      Origin: BASE_URL,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  storeCookies(cookieJar, response);
  const body = await response.text();
  return { status: response.status, location: response.headers.get("location") ?? "", body };
}

function postTodo(description, complexity, deadline) {
  return request("/api/todos", {
    method: "POST",
    form: { description, complexity, deadline },
  });
}

function appearsInOrder(html, parts) {
  let cursor = 0;
  for (const part of parts) {
    const index = html.indexOf(part, cursor);
    if (index === -1) return false;
    cursor = index + part.length;
  }
  return true;
}

function bodyOk(body, expected) {
  if (expected.ordered && !appearsInOrder(body, expected.ordered)) return false;
  if (expected.includes && !expected.includes.every((part) => body.includes(part))) return false;
  if (expected.excludes && !expected.excludes.every((part) => !body.includes(part))) return false;
  return true;
}

function formActionInItem(html, description) {
  const items = html.match(/<li\b[^>]*>[\s\S]*?<\/li>/g) ?? [];
  for (const item of items) {
    if (!item.includes(description)) continue;
    const actions = [...item.matchAll(/<form\b[^>]*\baction="([^"]*)"/g)].map((match) => match[1]);
    return actions.find((action) => action.endsWith("/done")) ?? "";
  }
  return "";
}

function editPath(description) {
  return (doneActions[description] ?? "").replace(/\/done$/, "/edit");
}

function postEdit(description, fields, cookieJar = jar) {
  return request(editPath(description), { method: "POST", form: fields, cookieJar });
}

function locationHas(location, text) {
  if (location.includes(text)) return true;
  try {
    return decodeURIComponent(location).includes(text);
  } catch {
    return false;
  }
}

function redirectOk(actual, expected) {
  if (expected.location === undefined) return true;
  const samePlace = expected.exact
    ? actual.location === expected.location
    : actual.location.startsWith(expected.location);
  if (!samePlace) return false;
  return expected.locationIncludes === undefined || locationHas(actual.location, expected.locationIncludes);
}

const doneActionPattern = /^\/api\/todos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/done$/i;

function actionsOk(expected) {
  if (expected.doneActionFor !== undefined && !doneActionPattern.test(doneAction)) return false;
  if (expected.doneActionsFor === undefined) return true;
  return expected.doneActionsFor.every((description) => doneActionPattern.test(doneActions[description] ?? ""));
}

const steps = [
  ["home renders", () => request("/"), { status: 200 }],
  ["dashboard redirects anonymous user", () => request("/dashboard"), { status: 302, location: "/auth/signin" }],
  [
    "unsigned todos is not found",
    () => request("/todos"),
    { status: 404, includes: ["Not found"], excludes: ["Add todo", 'id="todo-list"'] },
  ],
  [
    "signup creates account",
    () => request("/api/auth/signup", { method: "POST", form: { email, password } }),
    { status: 302, location: "/auth/confirm-email" },
  ],
  [
    "signin rejects wrong password",
    () => request("/api/auth/signin", { method: "POST", form: { email, password: "wrong" } }),
    { status: 302, location: "/auth/signin?error=" },
  ],
  [
    "signin accepts correct password",
    () => request("/api/auth/signin", { method: "POST", form: { email, password } }),
    { status: 302, location: "/todos" },
  ],
  [
    "create sooner low-complexity todo",
    () => postTodo(descriptions[0], "1", soonerDeadline),
    { status: 302, location: "/todos", exact: true },
  ],
  [
    "create second todo with the same deadline and complexity",
    () => postTodo(descriptions[1], "1", soonerDeadline),
    { status: 302, location: "/todos", exact: true },
  ],
  [
    "create same-deadline higher-complexity todo",
    () => postTodo(descriptions[2], "3", soonerDeadline),
    { status: 302, location: "/todos", exact: true },
  ],
  [
    "create later-deadline todo",
    () => postTodo(descriptions[3], "1", laterDeadline),
    { status: 302, location: "/todos", exact: true },
  ],
  [
    "todos list in deadline, complexity, and age order",
    () => request("/todos"),
    { status: 200, ordered: originalOrder },
  ],
  [
    "capture todo done actions",
    () => request("/todos"),
    { status: 200, doneActionsFor: descriptions, ordered: originalOrder },
  ],
  [
    "unsigned edit redirects",
    () =>
      request("/api/todos/00000000-0000-4000-8000-000000000000/edit", {
        method: "POST",
        cookieJar: new Map(),
      }),
    { status: 302, location: "/todos", exact: true },
  ],
  [
    "blank description edit is rejected",
    () => postEdit(descriptions[0], { description: "", complexity: "1", deadline: soonerDeadline }),
    { status: 302, location: "/todos?error=", locationIncludes: "Description is required" },
  ],
  ["blank description keeps the original order", () => request("/todos"), { status: 200, ordered: originalOrder }],
  [
    "edit later todo to an earlier deadline",
    () => postEdit(descriptions[3], { description: descriptions[3], complexity: "1", deadline: movedDeadline }),
    { status: 302, location: "/todos", exact: true },
  ],
  ["earlier deadline lists the todo first", () => request("/todos"), { status: 200, ordered: movedOrder }],
  [
    "restore later todo deadline",
    () => postEdit(descriptions[3], { description: descriptions[3], complexity: "1", deadline: laterDeadline }),
    { status: 302, location: "/todos", exact: true },
  ],
  ["restored deadline matches the original order", () => request("/todos"), { status: 200, ordered: originalOrder }],
  [
    "edit newer todo description",
    () => postEdit(descriptions[1], { description: editedNewer, complexity: "1", deadline: soonerDeadline }),
    { status: 302, location: "/todos", exact: true },
  ],
  ["edited description keeps its place", () => request("/todos"), { status: 200, ordered: editedOrder }],
  [
    "restore newer todo description",
    () => postEdit(descriptions[1], { description: descriptions[1], complexity: "1", deadline: soonerDeadline }),
    { status: 302, location: "/todos", exact: true },
  ],
  [
    "edit sooner high-complexity todo",
    () => postEdit(descriptions[2], { description: descriptions[2], complexity: "5", deadline: soonerDeadline }),
    { status: 302, location: "/todos", exact: true },
  ],
  ["submitted complexity shows on the row", () => request("/todos"), { status: 200, ordered: complexityOrder }],
  [
    "restore sooner high complexity",
    () => postEdit(descriptions[2], { description: descriptions[2], complexity: "3", deadline: soonerDeadline }),
    { status: 302, location: "/todos", exact: true },
  ],
  [
    "restored todos match the original order",
    () => request("/todos"),
    { status: 200, ordered: restoredOrder, excludes: [editedNewer, "Complexity 5"] },
  ],
  ["older sooner todo done action", () => request("/todos"), { status: 200, doneActionFor: descriptions[0] }],
  [
    "mark older sooner todo done",
    () => request(doneAction, { method: "POST" }),
    { status: 302, location: "/todos", exact: true },
  ],
  [
    "marked todo leaves the list in order",
    () => request("/todos"),
    { status: 200, excludes: [descriptions[0]], ordered: remainingOrder },
  ],
  [
    "edit done todo",
    () => postEdit(descriptions[0], { description: descriptions[0], complexity: "1", deadline: soonerDeadline }),
    { status: 302, location: "/todos", exact: true },
  ],
  [
    "edited done todo stays off the list",
    () => request("/todos"),
    { status: 200, excludes: [descriptions[0]], ordered: remainingOrder },
  ],
  [
    "marking the same todo again",
    () => request(doneAction, { method: "POST" }),
    { status: 302, location: "/todos", exact: true },
  ],
  ["second mark keeps the todo off the list", () => request("/todos"), { status: 200, excludes: [descriptions[0]] }],
  [
    "second user signs up",
    () =>
      request("/api/auth/signup", {
        method: "POST",
        form: { email: otherEmail, password },
        cookieJar: otherJar,
      }),
    { status: 302, location: "/auth/confirm-email" },
  ],
  [
    "second user signs in",
    () =>
      request("/api/auth/signin", {
        method: "POST",
        form: { email: otherEmail, password },
        cookieJar: otherJar,
      }),
    { status: 302, location: "/todos" },
  ],
  [
    "second user posts an open todo edit",
    () =>
      postEdit(descriptions[1], { description: descriptions[1], complexity: "1", deadline: soonerDeadline }, otherJar),
    { status: 302, location: "/todos", exact: true },
  ],
  [
    "first user list unchanged after other edit",
    () => request("/todos"),
    { status: 200, excludes: [descriptions[0]], ordered: remainingOrder },
  ],
  [
    "second user posts the same done action",
    () => request(doneAction, { method: "POST", cookieJar: otherJar }),
    { status: 302, location: "/todos" },
  ],
  [
    "first user still lists the remaining todos",
    () => request("/todos"),
    { status: 200, excludes: [descriptions[0]], ordered: remainingOrder },
  ],
  [
    "second user does not see the first user's todos",
    () => request("/todos", { cookieJar: otherJar }),
    { status: 200, excludes: descriptions },
  ],
  ["dashboard renders for signed-in user", () => request("/dashboard"), { status: 200 }],
  ["signout clears session", () => request("/api/auth/signout", { method: "POST" }), { status: 302, location: "/" }],
  ["dashboard redirects after signout", () => request("/dashboard"), { status: 302, location: "/auth/signin" }],
];

let failed = 0;
for (const [name, run, expected] of steps) {
  const actual = await run();
  if (expected.doneActionFor !== undefined) {
    doneAction = formActionInItem(actual.body, expected.doneActionFor);
    doneActions[expected.doneActionFor] = doneAction;
  }
  if (expected.doneActionsFor !== undefined) {
    for (const description of expected.doneActionsFor) {
      doneActions[description] = formActionInItem(actual.body, description);
    }
  }
  const locationMatches = redirectOk(actual, expected);
  const bodyMatches = bodyOk(actual.body, expected);
  const actionOk = actionsOk(expected);
  const ok = actual.status === expected.status && locationMatches && bodyMatches && actionOk;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  -> ${actual.status} ${actual.location}`);
  if (!ok) {
    failed++;
    console.log(`      expected ${expected.status} ${expected.location ?? ""}`);
    if (expected.locationIncludes !== undefined && !locationHas(actual.location, expected.locationIncludes)) {
      console.log(`      expected location to contain ${expected.locationIncludes}`);
    }
    if (!bodyMatches) console.log("      body check failed");
    if (!actionOk) {
      const found =
        expected.doneActionsFor !== undefined
          ? expected.doneActionsFor.map((description) => doneActions[description] || "(none)").join(", ")
          : doneAction || "(none)";
      console.log(`      expected /api/todos/<id>/done, found ${found}`);
    }
  }
}

console.log(failed ? `\n${failed} step(s) failed` : "\nAll smoke steps passed");
process.exit(failed ? 1 : 0);
