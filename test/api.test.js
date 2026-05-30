import test from "node:test";
import assert from "node:assert/strict";
import { filterMembers, validateRequest, sanitize, computeStats } from "../server.js";

const members = [
  {
    name: "Mira Shah",
    neighborhood: "Green Park",
    bio: "Excel helper",
    offers: ["Excel dashboards"],
    wants: ["Guitar basics"],
    rating: 4.9,
    distance: 1
  },
  {
    name: "Arjun Mehta",
    neighborhood: "Lajpat Nagar",
    bio: "Guitar teacher",
    offers: ["Guitar lessons"],
    wants: ["Basic coding"],
    rating: 4.8,
    distance: 2
  }
];

// ---- Original 3 tests ----

test("filterMembers returns skill matches", () => {
  const results = filterMembers(members, "guitar");
  assert.equal(results.length, 2);
  assert.equal(results[0].name, "Mira Shah");
});

test("validateRequest accepts a complete swap request", () => {
  const result = validateRequest({
    name: "Priya",
    need: "Resume review",
    offer: "Hindi practice",
    area: "South Delhi"
  });

  assert.equal(result.value.status, "Open");
  assert.match(result.value.id, /^req-/);
});

test("validateRequest rejects incomplete requests", () => {
  const result = validateRequest({
    name: "Priya",
    need: "",
    offer: "Hindi practice",
    area: "South Delhi"
  });

  assert.match(result.error, /Please add/);
});

// ---- New tests ----

test("sanitize function strips HTML-significant characters", () => {
  assert.equal(sanitize("<script>alert('xss')</script>"), "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
  assert.equal(sanitize('He said "hello" & goodbye'), "He said &quot;hello&quot; &amp; goodbye");
  assert.equal(sanitize("plain text"), "plain text");
  assert.equal(sanitize(""), "");
});

test("validateRequest applies sanitization to inputs", () => {
  const result = validateRequest({
    name: "<b>Attacker</b>",
    need: "Resume & cover letter",
    offer: 'Say "hello"',
    area: "South Delhi"
  });

  assert.equal(result.value.name, "&lt;b&gt;Attacker&lt;/b&gt;");
  assert.equal(result.value.need, "Resume &amp; cover letter");
  assert.equal(result.value.offer, "Say &quot;hello&quot;");
  assert.equal(result.value.area, "South Delhi");
});

test("computeStats returns correct structure and values", () => {
  const community = {
    members: [
      { rating: 4.0, swaps: 10 },
      { rating: 5.0, swaps: 20 },
      { rating: 3.0, swaps: 5 }
    ],
    requests: [
      { status: "Open" },
      { status: "Matched" },
      { status: "Open" },
      { status: "Completed" }
    ]
  };

  const stats = computeStats(community);

  assert.equal(stats.totalMembers, 3);
  assert.equal(stats.avgRating, 4);
  assert.equal(stats.totalSwaps, 35);
  assert.equal(stats.openRequests, 2);
});

test("filterMembers with empty query returns all members", () => {
  const results = filterMembers(members, "");
  assert.equal(results.length, 2);
  results.forEach((m) => {
    assert.equal(m.matchScore, 1);
  });
});

test("filterMembers sorts by matchScore then rating", () => {
  const testMembers = [
    {
      name: "Alice",
      neighborhood: "Area A",
      bio: "teaches guitar and piano",
      offers: ["Guitar"],
      wants: [],
      rating: 4.0,
      distance: 1
    },
    {
      name: "Bob",
      neighborhood: "Area B",
      bio: "no match here",
      offers: ["Cooking"],
      wants: [],
      rating: 5.0,
      distance: 1
    },
    {
      name: "Carol",
      neighborhood: "Area C",
      bio: "guitar enthusiast",
      offers: ["Guitar lessons"],
      wants: [],
      rating: 4.5,
      distance: 1
    }
  ];

  const results = filterMembers(testMembers, "guitar");

  assert.equal(results.length, 2);
  assert.equal(results[0].name, "Carol");
  assert.equal(results[1].name, "Alice");

  assert.equal(results[0].matchScore, 2);
  assert.equal(results[1].matchScore, 2);
  assert.ok(results[0].rating >= results[1].rating);
});
