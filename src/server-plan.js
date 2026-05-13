export const roles = [
  { name: "Founder", color: 0x111827, hoist: true },
  { name: "Core Team", color: 0x2563eb, hoist: true },
  { name: "Engineering", color: 0x16a34a },
  { name: "Product", color: 0xf59e0b },
  { name: "Growth", color: 0xec4899 },
  { name: "Advisor", color: 0x7c3aed },
  { name: "Intern", color: 0x64748b },
  { name: "Guest", color: 0x94a3b8 }
];

export const categories = [
  {
    name: "WELCOME",
    channels: [
      { name: "start-here", topic: "Mission, rules, key links, and how this server works." },
      { name: "announcements", topic: "Founder and core team announcements." },
      { name: "team-directory", topic: "Who owns what, time zones, and responsibilities." }
    ]
  },
  {
    name: "DAILY OPS",
    channels: [
      { name: "daily-standup", topic: "Post: Yesterday / Today / Blockers." },
      { name: "daily-updates", topic: "Async progress updates throughout the day." },
      { name: "blockers", topic: "Anything stopping progress. Keep this visible." },
      { name: "wins", topic: "Shipped work, good news, customer wins, and momentum." },
      { name: "metrics", topic: "Key metrics: MRR, users, growth, and weekly KPIs." }
    ]
  },
  {
    name: "PRODUCT",
    channels: [
      { name: "product-roadmap", topic: "Roadmap, milestones, and priorities." },
      { name: "feature-ideas", topic: "Product concepts, experiments, and user requests." },
      { name: "feedback", topic: "Customer and user feedback." },
      { name: "bugs-and-issues", topic: "Bugs, regressions, and broken flows." }
    ]
  },
  {
    name: "ENGINEERING",
    channels: [
      { name: "engineering", topic: "General development discussion." },
      { name: "deployments", topic: "Release notes, deploy status, and incidents." },
      { name: "code-reviews", topic: "Pull request and review requests." },
      { name: "tech-decisions", topic: "Architecture choices and technical decisions." }
    ]
  },
  {
    name: "GROWTH / BUSINESS",
    channels: [
      { name: "sales", topic: "Leads, outreach, pipeline, and follow-ups.", privateCore: true },
      { name: "marketing", topic: "Content, campaigns, positioning, and launches." },
      { name: "partnerships", topic: "Advisors, investors, collaborators, and partners.", privateCore: true },
      { name: "customer-support", topic: "Support issues and customer follow-ups." }
    ]
  },
  {
    name: "STRATEGY",
    channels: [
      { name: "new-ideas", topic: "Raw ideas and experiments." },
      { name: "strategy", topic: "Company direction and sensitive planning.", privateCore: true },
      { name: "competitors", topic: "Market research, competitors, pricing, and screenshots." },
      { name: "meeting-notes", topic: "Meeting notes, decisions, and action items." },
      { name: "agenda", topic: "Agenda items for the next meeting." }
    ]
  },
  {
    name: "VOICE",
    voice: true,
    channels: [
      { name: "Daily Standup" },
      { name: "Founder Room", privateCore: true },
      { name: "Product Sync" },
      { name: "Deep Work" }
    ]
  }
];

export function getWelcomeCopy(serverName = "Your Startup") {
  return [
    `**Welcome to ${serverName}!**`,
    "",
    "This server is organized for startup execution: daily momentum, clear owners, fast decisions, and a place for new ideas before they become roadmap work.",
    "",
    "**Daily standup format**",
    "```",
    "Yesterday:",
    "Today:",
    "Blockers:",
    "```",
    "",
    "**Operating rules**",
    "Use `#blockers` for anything that needs help quickly, `#daily-updates` for progress, `#new-ideas` for raw thinking, and `#metrics` for KPI updates."
  ].join("\n");
}
