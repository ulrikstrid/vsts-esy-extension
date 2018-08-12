import * as path from "path";

import * as tl from "vsts-task-lib/task";
import { ToolRunner } from "vsts-task-lib/toolrunner";

const cwd = tl.getPathInput("cwd", true, false);
tl.mkdirP(cwd);
tl.cd(cwd);

tl.setResourcePath(path.join(__dirname, "task.json"));

let esy = findGlobalEsy();

if (esy) {
  findEsy();
} else {
  findEsy();
}

function findEsy(): Q.Promise<void> {
  tl.debug("not found global installed esy, try to find esy locally.");

  let esyRuntime = tl.getInput("esyRuntime", true);
  esyRuntime = path.resolve(cwd, esyRuntime);

  tl.debug("check path : " + esyRuntime);
  if (tl.exist(esyRuntime)) {
    const tool = tl.tool(tl.which("node", true));
    tool.arg(esyRuntime);

    return executeEsy(tool);
  } else {
    tl.debug(
      "not found locally installed esy, trying to install esy globally."
    );

    return installEsy().then(() => executeEsy());
  }
}

function installEsy(): Q.Promise<void> {
  const tool = tl.tool(tl.which("npm", true));
  tool.arg("install");
  tool.arg("-g");
  tool.arg("esy");

  return tool.exec().then(() => {
    esy = findGlobalEsy();
    if (!esy) {
      tl.setResult(tl.TaskResult.Failed, tl.loc("NpmGlobalNotInPath"));
      throw new Error("NPM_GLOBAL_PREFIX_NOT_IN_PATH");
    }
  });
}

function executeEsy(tool?: ToolRunner): Q.Promise<void> {
  tool = tool || tl.tool(esy);
  tool.arg(tl.getDelimitedInput("arguments", " ", true));

  tool.arg("--config.interactive=false");
  tool.arg(tl.getInput("arguments", false));

  return tool
    .exec()
    .then(code => {
      tl.setResult(tl.TaskResult.Succeeded, tl.loc("EsyReturnCode", code));
    })
    .catch(err => {
      tl.debug("Esy execution failed");
      tl.setResult(tl.TaskResult.Failed, tl.loc("EsyFailed", err.message));
    });
}

function findGlobalEsy(): string {
  let esyPath = tl.which("esy", false);

  tl.debug(`checking path: ${esyPath}`);
  if (tl.exist(esyPath)) {
    return esyPath;
  }

  const globalPrefix = getNPMPrefix(),
    isWin = process.platform.indexOf("win") === 0;

  esyPath = path.join(globalPrefix, "esy" + (isWin ? ".cmd" : ""));

  tl.debug(`checking path: ${esyPath}`);
  if (tl.exist(esyPath)) {
    return esyPath;
  }
}

let npmPrefix: string | null = null;

function getNPMPrefix(): string {
  if (npmPrefix != null) {
    return npmPrefix;
  }

  const tool = tl.tool(tl.which("npm", true));
  tool.arg("prefix");
  tool.arg("-g");

  npmPrefix = tool.execSync().stdout.trim();

  return npmPrefix;
}
