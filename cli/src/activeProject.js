const chalk = require("chalk");
const { request } = require("./api");
const { loadConfig, saveConfig } = require("./config");
const { ask } = require("./prompt");

// Shown right after login/signup, and by `nova-link use`. Lets the person
// pick which project subsequent push/pull/pr commands should target.
async function chooseActiveProject() {
  const { projects } = await request("/projects");

  if (projects.length === 0) {
    console.log(chalk.dim("You don't have any projects yet — ask a project owner to add you, then run `nova-link use <slug>`."));
    return;
  }

  console.log("\nYour projects:");
  projects.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}  ${chalk.dim(p.slug)}`));

  const answer = await ask(`\nPick a project (1-${projects.length}): `);
  const index = parseInt(answer, 10) - 1;
  const chosen = projects[index];

  if (!chosen) {
    console.log(chalk.yellow("No project selected. Run `nova-link use <slug>` any time to set one."));
    return;
  }

  const cfg = loadConfig();
  saveConfig({ ...cfg, activeProjectId: chosen._id, activeProjectSlug: chosen.slug });
  console.log(chalk.green(`Active project: ${chosen.slug}`));
}

// Every push/pull/pr command needs this — fails loudly if nothing is active
// yet, rather than silently doing nothing.
function requireActiveProject() {
  const cfg = loadConfig();
  if (!cfg?.activeProjectId) {
    throw new Error("No active project. Run `nova-link use <slug>` first (see `nova-link projects` for your options).");
  }
  return { id: cfg.activeProjectId, slug: cfg.activeProjectSlug };
}

module.exports = { chooseActiveProject, requireActiveProject };
