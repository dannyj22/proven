// The practice desk — topics, deterministic checks, memory and path scoring.
//
// Everything in this file runs on the device. The checks are deliberately
// rule-based: the same answer always gets the same verdict, and no code is
// sent anywhere to be graded. The AI agents live in ./prompts.js and ../lib.

export const AG = {
  mentor: { name: "Mentor", role: "Plans your next step", color: "#63e2b0" },
  reader: {
    name: "Curriculum reader",
    role: "Finds skills in lessons",
    color: "#7ccbff",
  },
  client: {
    name: "Client",
    role: "Brings realistic problems",
    color: "#ffc266",
  },
  reviewer: { name: "Reviewer", role: "Checks work and asks why", color: "#ff8f9c" },
  scout: { name: "Scout", role: "Suggests where to learn", color: "#b9a2ff" },
};

export const AGENT_ORDER = ["mentor", "reader", "client", "reviewer", "scout"];

export const AREA = { db: "databases", js: "web programming", net: "networking" };

export const ROLES = {
  backend: ["Backend developer", { db: 1, js: 1 }],
  front: ["Frontend developer", { js: 1 }],
  data: ["Data analyst", { db: 1 }],
  netsec: ["Network and security engineer", { net: 1 }],
};

// Practical resources per area. The student studies one, then proves it with a
// short quiz and a written note before it enters the portfolio. Study itself is
// self-reported; the quiz is checked on the device.
export const COURSES = {
  db: [
    [
      "Learn Relational Database Design",
      "YouTube, freeCodeCamp",
      "https://youtu.be/26ls5lNiijk",
      "About 6 hours",
    ],
    [
      "The Complete SQL Bootcamp",
      "Udemy, may be paid",
      "https://www.udemy.com/course/the-complete-sql-bootcamp/",
      "SQL practice",
    ],
    [
      "Queries with joins",
      "SQLBolt, interactive",
      "https://sqlbolt.com/lesson/select_queries_with_joins",
      "Short lesson",
    ],
  ],
  js: [
    [
      "Map, Filter and Reduce explained",
      "YouTube",
      "https://www.youtube.com/watch?v=8MoElay6dWU",
      "Video lesson",
    ],
    [
      "Array methods",
      "The Modern JavaScript Tutorial",
      "https://javascript.info/array-methods",
      "Reading and exercises",
    ],
  ],
  net: [
    [
      "Subnetting Mastery",
      "Practical Networking",
      "https://www.practicalnetworking.net/stand-alone/subnetting-mastery/",
      "Video series",
    ],
    [
      "IP Addressing and Subnetting From Scratch",
      "Udemy, may be paid",
      "https://www.udemy.com/course/ip-addressing-subnetting/",
      "Full course",
    ],
  ],
};

// Three questions per area: [question, options, index of the correct option].
export const ASK = {
  db: [
    [
      "What does a foreign key do?",
      ["Encrypts a column", "Links a row to a key in another table", "Sorts a table"],
      1,
    ],
    [
      "What does normalisation mainly reduce?",
      ["Repeated data", "The number of users", "Screen size"],
      0,
    ],
    [
      "Which normal form requires each field to hold a single value?",
      ["Third", "Second", "First"],
      2,
    ],
  ],
  js: [
    [
      "What does filter return?",
      ["A new array of matching items", "The first matching item", "A total"],
      0,
    ],
    [
      "In reduce((sum, x) => sum + x, 0), what is the 0?",
      ["The array length", "The starting value", "The last item"],
      1,
    ],
    ["Does filter change the original array by itself?", ["Yes", "Only for numbers", "No"], 2],
  ],
  net: [
    [
      "How many usable host addresses does a /26 subnet have?",
      ["64", "62", "30"],
      1,
    ],
    [
      "What is the network address for 192.168.1.70/26?",
      ["192.168.1.64", "192.168.1.0", "192.168.1.70"],
      0,
    ],
    ["What is the subnet mask for /24?", ["255.255.0.0", "255.255.255.240", "255.255.255.0"], 2],
  ],
};

export const USED = {
  db: "Shops and clinics rely on well-designed tables so records stay consistent.",
  js: "Business apps constantly filter and total lists of records.",
  net: "IT teams divide networks so each group has enough addresses.",
};

export const blankForm = () => ({
  ans: {},
  note: "",
  link: "",
  file: "",
  result: null,
  error: "",
});

// ── helpers for the deterministic checks ────────────────────────

const count = (s, re) => (s.match(re) || []).length;

export const strip = (s) =>
  String(s || "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)(--|\/\/).*$/gm, "$1");

// IPv4 subnet parsing for the networking task.
function nets(code) {
  const out = {};
  strip(code)
    .split("\n")
    .forEach((line) => {
      const m = line.match(
        /^\s*(lab a|lab b|staff|library)\s*[:=-]\s*(\d+)\.(\d+)\.(\d+)\.(\d+)\s*\/\s*(\d+)/i
      );
      if (!m) return;
      const [a, b, c, d, p] = m.slice(2).map(Number);
      if ([a, b, c, d].some((n) => n > 255) || p < 24 || p > 30) return;
      const size = 2 ** (32 - p);
      out[m[1].toLowerCase()] = {
        p,
        start: d,
        end: d + size - 1,
        ok: a === 192 && b === 168 && c === 10 && d % size === 0,
      };
    });
  return out;
}

const fits = (code, name, need) => {
  const n = nets(code)[name];
  return !!n && n.ok && 2 ** (32 - n.p) - 2 >= need;
};

const apart = (code, names) => {
  const all = nets(code);
  if (!names.every((n) => all[n] && all[n].ok)) return false;
  return names.every((x, i) =>
    names.slice(i + 1).every((y) => all[x].end < all[y].start || all[y].end < all[x].start)
  );
};

// ── the three practice tickets ─────────────────────────────────

export const TOPICS = {
  db: {
    name: "Database normalisation",
    skill: "Database design",
    course: "Databases, week 5",
    mins: 45,
    extract: ["Splitting data into tables", "Primary and foreign keys", "Joins and summaries"],
    from: "Mrs Bello, GreenLeaf Pharmacy (fictional)",
    title: "Our sales sheet keeps breaking",
    story:
      "Every sale is typed into one spreadsheet with the customer, medicine, price and quantity. Names are repeated and prices disagree. Design proper tables and show total sales for each medicine.",
    start: "-- Write your SQL here\n",
    checks: [
      [
        "At least three tables",
        (c) => count(c, /create\s+table/gi) >= 3,
        "List the separate things in the story. Each needs its own table.",
      ],
      [
        "Each table has a primary key",
        (c) => {
          const t = count(c, /create\s+table/gi);
          return t > 0 && count(c, /primary\s+key/gi) >= t;
        },
        "Give every table one column that identifies each row.",
      ],
      [
        "Tables are linked with foreign keys",
        (c) => /references\s+\w+/i.test(c),
        "Use REFERENCES to point a sale at a medicine.",
      ],
      ["A query joins two tables", (c) => /\bjoin\b/i.test(c), "Bring medicine names and sales together with JOIN."],
      [
        "Totals are grouped per medicine",
        (c) => /sum\s*\(/i.test(c) && /group\s+by/i.test(c),
        "Combine SUM with GROUP BY.",
      ],
    ],
    change: [
      "Medicines now record an expiry date",
      (c) => /expiry\w*\s+date/i.test(c),
      "Add an expiry_date DATE column.",
    ],
    hints: [
      "Which facts are repeated on every row of the old sheet?",
      "Customers, medicines and sales are three different things.",
      "CREATE TABLE sale (\n  id INT PRIMARY KEY,\n  medicine_id INT REFERENCES medicine(id),\n  quantity INT\n);",
    ],
    sample:
      "CREATE TABLE customer (id INT PRIMARY KEY, name TEXT);\nCREATE TABLE medicine (id INT PRIMARY KEY, name TEXT, price NUMERIC);\nCREATE TABLE sale (\n  id INT PRIMARY KEY,\n  customer_id INT,\n  medicine_id INT,\n  quantity INT\n);\n",
    why: "Why did you put that data in separate tables, and what problem does it prevent?",
  },
  js: {
    name: "JavaScript arrays",
    skill: "Programming",
    course: "Web programming, week 7",
    mins: 30,
    extract: ["Filtering lists", "Reducing a list to one value", "Writing reusable functions"],
    from: "Tunde, QuickDrop Deliveries (fictional)",
    title: "Show how much we have been paid",
    story:
      "We have a list of orders. Each has an amount and a status. Write totalPaid(orders) that returns the sum of paid orders only.",
    start: "function totalPaid(orders) {\n  // your code\n}\n",
    checks: [
      [
        "A function named totalPaid",
        (c) => /function\s+totalPaid|totalPaid\s*=/.test(c),
        "Keep the name totalPaid so the app can call it.",
      ],
      [
        "Only paid orders are selected",
        (c) => /status\s*={2,3}\s*['"]paid['"]/.test(c),
        "Compare each order's status with 'paid'.",
      ],
      ["The list is filtered", (c) => /\.filter\s*\(|\bif\s*\(/.test(c), "Use filter or an if statement."],
      ["Amounts are added together", (c) => /\.reduce\s*\(|\+=/.test(c), "Use reduce or a running total."],
      [
        "The result is returned",
        (c) => /\breturn\b|totalPaid\s*=\s*\(?\s*\w+\s*\)?\s*=>\s*[^{\s]/.test(c),
        "Return the total from the function.",
      ],
    ],
    change: [
      "Also add countPending(orders)",
      (c) => /countPending/.test(c) && /pending/.test(c.replace(/countPending/g, "")),
      "Write countPending and match the 'pending' status.",
    ],
    hints: [
      "What should happen to an unpaid order?",
      "First narrow the list, then add the amounts.",
      "const paid = orders.filter(o => o.status === 'paid');",
    ],
    sample:
      "function totalPaid(orders) {\n  const paid = orders.filter(o => o.status === 'paid');\n}\n",
    why: "How does your function treat an empty list or an unpaid order?",
  },
  net: {
    name: "IP subnetting",
    skill: "Networking",
    course: "Computer networks, week 9",
    mins: 40,
    extract: ["Subnet sizes", "Network addresses", "Avoiding overlaps"],
    from: "Ngozi, school ICT office (fictional)",
    title: "Split the school network",
    story:
      'Divide 192.168.10.0/24 into separate subnets: Lab A needs 50 devices, Lab B needs 50 and the staff room needs 25. Write one per line, for example "Name: address/prefix".',
    start: "Lab A: \nLab B: \nStaff: \n",
    checks: [
      [
        "Lab A holds 50 devices",
        (c) => fits(c, "lab a", 50),
        "Find the smallest block with at least 50 usable addresses.",
      ],
      [
        "Lab B holds 50 devices",
        (c) => fits(c, "lab b", 50),
        "Lab B needs the same block size, starting elsewhere.",
      ],
      [
        "Staff room holds 25 devices",
        (c) => fits(c, "staff", 25),
        "A smaller block is enough here.",
      ],
      [
        "No subnets overlap",
        (c) => apart(c, ["lab a", "lab b", "staff"]),
        "Start each block where an earlier one has ended.",
      ],
    ],
    change: [
      "The library needs 20 devices",
      (c) => fits(c, "library", 20) && apart(c, ["lab a", "lab b", "staff", "library"]),
      'Add a "Library:" line using unused addresses.',
    ],
    hints: [
      "How many addresses does each prefix give you?",
      "/26 gives 62 usable addresses and /27 gives 30.",
      "Lab A: 192.168.10.0/26\nThe next block starts at .64",
    ],
    sample:
      "Lab A: 192.168.10.0/26\nLab B: 192.168.10.32/26\nStaff: 192.168.10.128/27\n",
    why: "How did you choose each subnet size?",
  },
};

export const QUIZ = [
  {
    k: "db",
    q: "What does a primary key do?",
    o: ["Identifies each row", "Encrypts a table", "Sorts the database"],
    a: 0,
  },
  {
    k: "js",
    q: "Which array method keeps only matching items?",
    o: ["push", "filter", "join"],
    a: 1,
  },
  {
    k: "net",
    q: "In 192.168.1.0/24, how many bits are the network part?",
    o: ["8", "16", "24"],
    a: 2,
  },
];

// ── state + memory ─────────────────────────────────────────────

export const freshDesk = () => ({
  v: 1,
  ready: false,
  step: 1,
  name: "",
  level: "Some knowledge",
  goal: "none",
  hours: 6,
  exam: false,
  quiz: {},
  known: {},
  view: "chat",
  pane: "chat",
  theme: "light",
  course: null,
  forms: {},
  learned: {},
  msgs: [],
  chips: [],
  mem: [],
  paused: false,
  work: {},
  cur: null,
  busy: null,
  await: null,
  lessons: [],
  runs: [],
});

export function freshWork(k) {
  return {
    code: TOPICS[k].start,
    hints: 0,
    tries: 0,
    result: null,
    change: false,
    done: false,
    why: "",
  };
}

export function checksFor(k, w) {
  const t = TOPICS[k];
  return w && w.change ? [...t.checks, t.change] : t.checks;
}

export const has = (mem, kind, k) => mem.find((m) => m.kind === kind && m.k === k);

export function standing(mem) {
  return Object.entries(ROLES)
    .map(([id, [name, targets]]) => {
      const keys = Object.keys(targets);
      const interest =
        keys.reduce(
          (n, k) => n + (has(mem, "like", k) ? 1 : has(mem, "dislike", k) ? -1 : 0),
          0
        ) / keys.length;
      const proof = keys.filter((k) => has(mem, "proof", k)).length / keys.length;
      return { id, name, interest, proof, score: interest + proof };
    })
    .sort((a, b) => b.score - a.score);
}

export function verdict(mem) {
  const proofs = mem.filter((m) => m.kind === "proof").length;
  const rated = mem.filter((m) => m.group === "feel").length;
  const [a, b] = standing(mem);
  if (!proofs || !rated)
    return ["Too early to say", "Complete a ticket and tell me how it felt. There is no rush."];
  if (proofs < 2 || rated < 2)
    return ["First signals only", "Try a second area before reading much into this."];
  if (a.score <= 0) return ["Still exploring", "Nothing has clearly clicked yet. That is useful to know."];
  if (a.score - b.score < 0.25)
    return [
      `Between ${a.name.toLowerCase()} and ${b.name.toLowerCase()}`,
      "One more kind of task will help separate them.",
    ];
  return [
    `Leaning towards ${a.name.toLowerCase()}`,
    "Based on what you completed and what you said you liked. This can change.",
  ];
}

export const topicChips = () =>
  Object.keys(TOPICS).map((k) => ({
    label: `This week: ${TOPICS[k].name.toLowerCase()}`,
    action: "start",
    value: k,
  }));

export const feelChips = (k) => [
  { label: "I enjoyed it", action: "feel", value: `like:${k}` },
  { label: "It was okay", action: "feel", value: `okay:${k}` },
  { label: "Not for me", action: "feel", value: `dislike:${k}` },
];

export const paceChips = (k) => [
  { label: "Too easy", action: "pace", value: `easy:${k}` },
  { label: "About right", action: "pace", value: `right:${k}` },
  { label: "Too hard", action: "pace", value: `hard:${k}` },
];

export const workChips = (k) => [
  { label: "Give me a hint", action: "hint", value: k },
  { label: "Check my work", action: "check", value: k },
  { label: "Recommend a course", action: "learn", value: k },
];

export const ECHO_ACTIONS = ["goal", "start", "feel", "pace", "hint", "learn", "pause"];
