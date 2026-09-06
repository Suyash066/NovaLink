const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const login = require("./commands/login");
const signup = require("./commands/signup");
const { logout, whoami } = require("./commands/session");
const projects = require("./commands/projects");
const use = require("./commands/use");
const push = require("./commands/push");
const pull = require("./commands/pull");
const pr = require("./commands/pr");

function run() {
  yargs(hideBin(process.argv))
    .scriptName("nova-link")
    .command(login)
    .command(signup)
    .command(logout)
    .command(whoami)
    .command(projects)
    .command(use)
    .command(push)
    .command(pull)
    .command(pr)
    .demandCommand(1, "Run `nova-link --help` to see available commands.")
    .strict()
    .help().argv;
}

module.exports = { run };
