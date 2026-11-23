import { describe, expect, it } from "vitest";
import { PARTIAL_DATE_PATTERN, type Resume, resumeSchema } from "./resume.js";

const minimalResume: Resume = {
  name: "Ada Obi",
  contact: { links: [] },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
};

const fullResume: Resume = {
  name: "Ada Obi",
  contact: {
    email: "ada@example.com",
    phone: "+234 800 000 0000",
    location: "Lagos, Nigeria",
    links: [{ label: "GitHub", url: "https://github.com/ada" }],
  },
  summary: "Backend engineer.",
  experience: [
    {
      title: "Senior Engineer",
      company: "Acme",
      location: "Remote",
      startDate: "2021-03",
      bullets: ["Built the billing service."],
    },
  ],
  education: [
    {
      school: "University of Lagos",
      qualification: "BSc",
      field: "Computer Science",
      endDate: "2018",
      details: [],
    },
  ],
  skills: [{ name: "TypeScript" }],
  projects: [
    {
      name: "Quarry",
      url: "http://quarry.example.com",
      bullets: [],
    },
  ],
  certifications: [{ name: "AWS SA", issuer: "AWS", date: "2022-11" }],
};

describe("PARTIAL_DATE_PATTERN", () => {
  it.each(["2024", "2024-01", "2024-12"])("accepts %s", (date) => {
    expect(PARTIAL_DATE_PATTERN.test(date)).toBe(true);
  });

  it.each(["24", "2024-1", "2024-13", "2024-00", "2024-01-05", "Jan 2024", ""])(
    "rejects %j",
    (date) => {
      expect(PARTIAL_DATE_PATTERN.test(date)).toBe(false);
    },
  );
});

describe("resumeSchema", () => {
  it("accepts a resume with every field filled in", () => {
    expect(resumeSchema.parse(fullResume)).toEqual(fullResume);
  });

  it("accepts a resume whose lists are all empty", () => {
    expect(resumeSchema.safeParse(minimalResume).success).toBe(true);
  });

  it.each([
    ["a blank name", { ...minimalResume, name: "  " }],
    ["a missing name", { ...minimalResume, name: undefined }],
    ["a missing list", { ...minimalResume, skills: undefined }],
    [
      "an experience without a company",
      {
        ...minimalResume,
        experience: [{ title: "Engineer", company: "", bullets: [] }],
      },
    ],
    [
      "a start date that is not a partial date",
      {
        ...minimalResume,
        experience: [
          {
            title: "Engineer",
            company: "Acme",
            startDate: "March 2021",
            bullets: [],
          },
        ],
      },
    ],
    [
      "a certification date with a day",
      {
        ...minimalResume,
        certifications: [{ name: "AWS SA", date: "2022-11-01" }],
      },
    ],
    [
      "a link that is not http(s)",
      {
        ...minimalResume,
        contact: { links: [{ label: "Me", url: "javascript:alert(1)" }] },
      },
    ],
  ])("rejects %s", (_, resume) => {
    expect(resumeSchema.safeParse(resume).success).toBe(false);
  });
});
