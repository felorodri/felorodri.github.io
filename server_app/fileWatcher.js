const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const json5 = require("json5");
const simpleGit = require("simple-git");
simpleGit().clean(simpleGit.CleanOptions.FORCE);

// Variable initialization
dotenv.config({
  path: path.resolve(__dirname + "/.env"),
  silent: false,
});

if (
  !process.env.GITHUB_REPO_URL ||
  !process.env.GITHUB_REPO_NAME ||
  !process.env.DEDICATED_SERVER_PATH ||
  process.env.GITHUB_REPO_URL ==
    "https://github.com/YOUR_USER/YOUR_USER.github.io" ||
  !process.env.GITHUB_REPO_NAME == "YOUR_USER.github.io.git" ||
  !process.env.DEDICATED_SERVER_PATH == "YOUR_AMS2_DEDICATED_SERVER_PATH"
) {
  console.log(
    "Environment github acccount or AMS2 dedicated server path configuration missing!"
  );
  process.exit(1);
}
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
const REPO_URL = process.env.GITHUB_REPO_URL;
const DEDICATED_SERVER_PATH = process.env.DEDICATED_SERVER_PATH;
// const REMOTE = `https://${USER}:${PASS}@${REPO}`;

// Results file watcher execution
console.log("AMS2 race results watcher started...");
fs.watchFile(
  DEDICATED_SERVER_PATH + "/lua_config/sms_stats_data.json",
  {
    // Passing the options parameter
    bigint: false,
    persistent: true,
    interval: 1000,
  },
  (curr, prev) => {
    console.log("\nFile change detected:");
    console.log("File was previously modified at: ", prev.mtime);
    console.log("File has been modified at: ", curr.mtime);
    let rawData = fs.readFileSync(
      DEDICATED_SERVER_PATH + "/lua_config/sms_stats_data.json"
    );
    const loggedData = json5.parse(rawData);
    let lastSession = {};
    if (loggedData.stats.history.length >= 1) {
      const loggedHistory = loggedData.stats.history;
      lastSession = loggedHistory.slice(-1)[0];
      if (lastSession.finished == true) {
        loggedData.stats.history = [lastSession];
        let eventName = loggedData.stats.server.name
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase();
        eventName = /^[^a-zA-Z0-9]/.test(eventName)
          ? eventName.substring(1)
          : eventName;
        eventName = /[^a-zA-Z0-9]$/.test(eventName)
          ? eventName.substring(0, eventName.length - 1)
          : eventName;
        const fileName = eventName + "_" + lastSession.end_time;
        fs.writeFile(
          "../race_logs/" + fileName + ".json",
          JSON.stringify(loggedData),
          "utf8",
          (err) => {
            if (err) throw err;
            const sessionResultsReport = {
              results: [
                {
                  name: eventName,
                  log: REPO_URL + "/race_logs/" + fileName,
                },
              ],
              config: {
                logo: "",
                logo_link: "",
                league: "",
                league_link: "",
                event: eventName,
                event_link: "",
                hide_sessions: "",
                q_points: "",
                q_points_by_class: "",
                points: "",
                points_by_class: "",
                best_lap_points: "",
                led_most_points: "",
                laps_points_number: "",
                laps_points: "",
                stopgo_lose_points: "",
                drivethrough_lose_points: "",
                dnf_lose_points: "",
                dq_lose_points: "",
                dnf_no_points: "0",
                dnf_ignore_losing_points: "",
                no_indexing: "0",
                shorten_lastnames: "1",
                shorten_firstnames: "0",
                team: "0",
                hide_aids: "0",
              },
            };
            fs.writeFile(
              "../simresults_remote_report/" + fileName + ".json",
              JSON.stringify(sessionResultsReport),
              "utf8",
              (err) => {
                if (err) throw err;
                // when using a chain
                simpleGit()
                  .exec(() => console.log("Starting pull..."))
                  .pull((err, update) => {
                    if (err) throw err;
                    if (update && update.summary.changes) {
                      require("child_process").exec("npm restart");
                    }
                  })
                  .exec(() => {
                    console.log("pull done.");
                    simpleGit()
                      .add("../*")
                      .commit("Adding new race result: " + fileName)
                      // .push(["-u", "origin", "main"], () => console.log("done"));
                      .exec(() => console.log("Starting push..."))
                      .push((err) => {
                        if (err) throw err;
                        console.log("push done.");
                      })
                      .catch((err) => {
                        console.log(
                          "\nRace results auto-upload failed. You can still manually commit the results to make them visible in your repository.\nEnsure you have identified your username and name locally in order to commit. More details about the error found below:\n"
                        );
                        console.log(err);
                      })
                      .finally(() => {
                        console.log("\n\nSeeking for new results...");
                      });
                  });
                console.log("\nNew race result logged: " + fileName);
              }
            );
          }
        );
      }
    }
    console.log(lastSession);
  }
);
