const express = require("express");
const request = require("supertest");
const User = require("../src/models/User");
const Event = require("../src/models/Event");
const Draft = require("../src/models/PersonalPlanDraft");
const jwtService = require("../src/services/jwtService");
const {
  cleanDraft,
  parseConversation,
  freeWindow,
} = require("../src/utils/planningTools");
const route = require("../src/routes/planningTools");
const app = express();
app.use(express.json());
app.use("/api/planning-tools", route);
let owner, other, token, otherToken;
beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Event.deleteMany({}),
    Draft.deleteMany({}),
  ]);
  [owner, other] = await User.create(
    ["planone", "plantwo"].map((username) => ({
      username,
      email: `${username}@test.test`,
      password: "Password!2026",
      firstName: username,
      birthDate: "1990-01-01",
    })),
  );
  token = jwtService.generateTokenPair(owner).accessToken;
  otherToken = jwtService.generateTokenPair(other).accessToken;
});
const auth = (method, path, body, t = token) =>
  request(app)
    [method](`/api/planning-tools${path}`)
    .set("Authorization", `Bearer ${t}`)
    .send(body);
test("parser extracts only explicit labelled schedule, address and currency", () => {
  expect(
    parseConversation(
      "Título: Paseo\nFecha: 2026-11-22\nHora: 18:30\nZona horaria: America/Santo_Domingo\nDirección: Plaza Central\nPrecio: DOP 500",
    ).fields,
  ).toEqual({
    title: "Paseo",
    date: "2026-11-22",
    time: "18:30",
    timeZone: "America/Santo_Domingo",
    address: "Plaza Central",
    currency: "DOP",
    amount: 500,
  });
});
test("relative date, unlabelled time and dollar amount are not guessed", () => {
  const p = parseConversation("Nos vemos mañana a las 8 por $500");
  expect(p.fields.date).toBeUndefined();
  expect(p.fields.time).toBeUndefined();
  expect(p.fields.timeZone).toBeUndefined();
  expect(p.fields.amount).toBeUndefined();
  expect(p.warnings.length).toBeGreaterThan(3);
});
test("ambiguous dates and impossible date do not silently select a schedule", () => {
  expect(
    parseConversation("Plan\n2026-11-20 o 2026-11-21").fields.date,
  ).toBeUndefined();
  expect(parseConversation("Plan\n2026-02-30").fields.date).toBeUndefined();
});
test.each([
  { amount: NaN },
  { amount: -1 },
  { amount: 1.001 },
  { date: "2026-02-30" },
  { time: "24:00" },
  { timeZone: "Mars/Base" },
  { currency: "ABC" },
  { title: { admin: true } },
])("invalid draft fields rejected %p", (input) =>
  expect(() => cleanDraft(input)).toThrow(),
);
test("extra publication/owner fields are discarded", () =>
  expect(
    cleanDraft({ title: "Plan", owner: "another", status: "published" }),
  ).toEqual({ title: "Plan" }));
test("free-time rejects missing offset, infinity, past, reversed and excessive windows", () => {
  for (const q of [
    { from: "2026-11-20T18:00", until: "2026-11-20T20:00Z" },
    {
      from: "2026-11-20T18:00Z",
      until: "2026-11-20T20:00Z",
      travelMinutes: "Infinity",
    },
    { from: "2000-01-01T00:00Z", until: "2000-01-02T00:00Z" },
    { from: "2026-11-20T20:00Z", until: "2026-11-20T18:00Z" },
    { from: "2026-11-20T20:00Z", until: "2026-12-20T20:00Z" },
  ])
    expect(() => freeWindow(q, Date.parse("2026-10-20"))).toThrow();
});
test("travel time removes space on both ends", () => {
  const w = freeWindow(
    {
      from: "2026-11-20T18:00-04:00",
      until: "2026-11-20T22:00-04:00",
      travelMinutes: 30,
    },
    Date.parse("2026-10-20"),
  );
  expect(w.from.toISOString()).toBe("2026-11-20T22:30:00.000Z");
  expect(w.until.toISOString()).toBe("2026-11-21T01:30:00.000Z");
});
test("draft operations require authentication and ownership without publishing an event", async () => {
  expect(
    (
      await request(app)
        .post("/api/planning-tools/drafts")
        .send({ fields: { title: "Plan" } })
    ).status,
  ).toBe(401);
  const created = await auth("post", "/drafts", {
    fields: { title: "Mi borrador" },
    status: "published",
  });
  expect(created.status).toBe(201);
  const id = created.body.data._id;
  expect(
    (await auth("get", `/drafts/${id}`, undefined, otherToken)).status,
  ).toBe(404);
  expect(
    (
      await auth(
        "put",
        `/drafts/${id}`,
        { fields: { title: "Robado" } },
        otherToken,
      )
    ).status,
  ).toBe(404);
  expect(
    (await auth("delete", `/drafts/${id}`, undefined, otherToken)).status,
  ).toBe(404);
  expect(
    (await auth("get", "/drafts", undefined, otherToken)).body.data,
  ).toEqual([]);
  expect(await Event.countDocuments({})).toBe(0);
  expect(
    (await auth("put", `/drafts/${id}`, { fields: { title: "Revisado" } })).body
      .data.fields.title,
  ).toBe("Revisado");
  expect((await auth("delete", `/drafts/${id}`)).status).toBe(200);
});
test("parser requires auth and never persists pasted conversation", async () => {
  const r = await auth("post", "/parse", {
    text: "Título: Concierto\nMensaje privado original",
  });
  expect(r.status).toBe(200);
  expect(await Draft.countDocuments({})).toBe(0);
  expect(JSON.stringify(r.body)).not.toContain("Mensaje privado original");
});
test("free-time returns only public published visible complete schedules inside travel window", async () => {
  const start = Date.now() + 86400000,
    from = new Date(start).toISOString(),
    until = new Date(start + 5 * 3600000).toISOString();
  const base = {
    title: "Plan compatible",
    timeZone: "America/Santo_Domingo",
    description: "Una descripción válida para un evento",
    category: "music",
    status: "published",
    date: new Date(start + 3600000),
    endDate: new Date(start + 3 * 3600000),
    createdBy: owner._id,
    location: {
      type: "Point",
      coordinates: [-69.9, 18.4],
      address: "Santo Domingo",
      city: "Santo Domingo",
    },
  };
  await Event.create([
    base,
    { ...base, title: "Privado", isPrivate: true },
    { ...base, title: "Secreto", isSecretLocation: true },
    { ...base, title: "Sin fin", endDate: undefined },
    { ...base, title: "Borrador", status: "draft" },
    {
      ...base,
      title: "Para adultos",
      ageRestriction: { minAge: 18, isAdultOnly: true },
    },
    { ...base, title: "No cabe", endDate: new Date(start + 6 * 3600000) },
  ]);
  const r = await request(app)
    .get("/api/planning-tools/free-time")
    .query({ from, until, travelMinutes: 30, city: "Santo Domingo" });
  expect(r.status).toBe(200);
  expect(r.body.data.map((e) => e.title)).toEqual(["Plan compatible"]);
  expect(r.body.data[0].timeZone).toBe("America/Santo_Domingo");
  expect(JSON.stringify(r.body)).not.toContain("coordinates");
});

test('concurrent creates cannot exceed thirty private drafts',async()=>{
  await Draft.init();
  await Draft.create(Array.from({length:28},(_,slot)=>({owner:owner._id,slot,fields:{title:'Existing'}})));
  const results=await Promise.all(Array.from({length:6},()=>auth('post','/drafts',{fields:{title:'Concurrent'},slot:99})));
  expect(results.filter(r=>r.status===201)).toHaveLength(2);
  expect(results.filter(r=>r.status===409)).toHaveLength(4);
  expect(await Draft.countDocuments({owner:owner._id})).toBe(30);
});
