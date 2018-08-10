import * as path from "path";

import * as tl from "vsts-task-lib/task";
import { ToolRunner } from "vsts-task-lib/toolrunner";

const cwd = tl.getPathInput("cwd", true, false);
tl.mkdirP(cwd);
tl.cd(cwd);

tl.setResourcePath(path.join(__dirname, "task.json"));

let esyPath = tl.which("esy", false);
let localEsyPath = path.join(cwd, "node_modules", "esy", "bin", "esy");

new Promise((resolve, reject) => {
  if (tl.exist(localEsyPath)) {
    // if we have a locally installed esy we probably want that
    const esy = new ToolRunner(localEsyPath);
    resolve(esy);
  } else if (tl.exist(esyPath)) {
    // use globally installed esy if it exists
    const esy = new ToolRunner(esyPath);
    resolve(esy);
  } else {
    // install esy locally and use that
    tl.debug("not found global installed esy, try to find esy locally");

    const npm = new ToolRunner(tl.which("npm", true));
    npm.arg(["install", "esy@latest"]);

    return npm.exec().then(x => {
      esyPath = localEsyPath;

      if (!tl.exist(esyPath)) {
        tl.setResult(
          tl.TaskResult.Failed,
          tl.loc("EsyCouldNotInstall", esyPath)
        );
        return reject(new Error("Could not install esy"));
      }

      const esy = new ToolRunner(esyPath);
      resolve(esy);
    });
  }
})
  .then(
    (esy: ToolRunner): any => {
      esy.arg(tl.getDelimitedInput("arguments", " ", true));

      return esy
        .exec()
        .then(code => {
          tl.setResult(tl.TaskResult.Succeeded, tl.loc("EsyReturnCode", code));
        })
        .catch(err => {
          tl.debug("taskRunner fail");
          tl.setResult(tl.TaskResult.Failed, tl.loc("EsyFailed", err.message));
        });
    }
  )
  .catch((err: Error) => {
    tl.debug("Esy install fail");
    tl.setResult(tl.TaskResult.Failed, tl.loc("EsyNotInstalled", err.message));
  });
