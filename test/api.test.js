import test from "node:test";
import assert from "node:assert/strict";
import { filterMembers, validateRequest } from "../server.js";

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
