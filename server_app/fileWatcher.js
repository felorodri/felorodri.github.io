const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const json5 = require("json5");
const simpleGit = require("simple-git");
simpleGit().clean(simpleGit.CleanOptions.FORCE);
const { discordWebHookPublisher } = require("./discordReporter.js");
const { performScraping } = require("./scraper.js");

// Variable initialization
dotenv.config({
  path: path.resolve(__dirname + "/.env"),
  silent: false,
});

if (
  !process.env.GITHUB_REPO_NAME ||
  !process.env.DEDICATED_SERVER_PATH ||
  !process.env.GITHUB_REPO_NAME == "YOUR_USER.github.io" ||
  !process.env.DEDICATED_SERVER_PATH == "YOUR_AMS2_DEDICATED_SERVER_PATH"
) {
  console.log(
    "Environment github acccount or AMS2 dedicated server path configuration missing!"
  );
  process.exit(1);
}
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
const DEDICATED_SERVER_PATH = process.env.DEDICATED_SERVER_PATH;
// const REMOTE = `https://${USER}:${PASS}@${REPO}`;

function main() {
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
            .replace(/[^A-Z0-9]+/gi, "_")
            .toLowerCase();
          eventName = /^[^a-zA-Z0-9]/.test(eventName)
            ? eventName.substring(1)
            : eventName;
          eventName = /[^a-zA-Z0-9]$/.test(eventName)
            ? eventName.substring(0, eventName.length - 1)
            : eventName;
          const fileName = eventName + "_" + lastSession.end_time;
          const publicResultURL =
            "https://simresults.net/remote?results=" +
            encodeURIComponent(
              "https://" +
                GITHUB_REPO_NAME +
                "/simresults_remote_report/" +
                fileName +
                ".json"
            ) +
            "&version";
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
                    log:
                      "https://" +
                      GITHUB_REPO_NAME +
                      "/race_logs/" +
                      fileName +
                      ".json",
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
                  no_indexing: "1",
                  shorten_lastnames: "0",
                  shorten_firstnames: "0",
                  show_driver_ids: "1",
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
                        .exec(() => console.log("Starting push..."))
                        .push((err) => {
                          if (err) throw err;
                          console.log("Push done.");
                          // Set 2 minutes of timeout to give time to build and publish to github pages
                          console.log(
                            "Discord share message (if apply) and results scraping tasks were scheduled for the incoming 2 minutes."
                          );
                          setTimeout(async () => {
                            // Publishing on discord
                            if (process.env.DISCORD_WEBHOOK_URL) {
                              shareResults(eventName, publicResultURL);
                            }
                            // Scraping the result
                            let scrapResult = await performScraping(
                              publicResultURL
                            );
                            console.log(scrapResult);
                          }, 90000);
                        })
                        .catch((err) => {
                          console.log(
                            "\nRace results auto-upload failed. You can still manually commit the results to make them visible in your repository.\nEnsure you have identified your username and name locally in order to commit. More details about the error found below:\n"
                          );
                          console.log(err);
                          console.log("\nSeeking for new results...");
                        });
                      // .finally(() => {
                      //   console.log("\nSeeking for new results...");
                      // });
                    });
                  console.log("\nNew race result logged: " + fileName);
                }
              );
            }
          );
        }
      }
    }
  );
}

function shareResults(eventName, publicResultURL) {
  webHooks = process.env.DISCORD_WEBHOOK_URL;
  webHooks = webHooks.replace(/\s/g, "");
  webHooks = webHooks.split(",");
  discordPromises = [];
  webHooks.forEach((webHook) => {
    discordPromises.push(
      discordWebHookPublisher(webHook, eventName, publicResultURL)
    );
  });
  Promise.all(discordPromises)
    .then((responses) => {
      responses.forEach((value, index) => {
        const i = index + 1;
        if (value.status == 204 && value.request.host == "discordapp.com") {
          console.log(
            "New race results published on discord channel " + i + "!"
          );
        } else {
          console.log(
            "Could not publish the race result on discord channel " + i + "!"
          );
        }
      });
      console.log("\nSeeking for new results...");
    })
    .catch((err) => {
      console.log(
        "\nRace results discord auto-publish failed. If the message was intended to be sent to multiple channels, some of those channels may be received the race result. More details about the error found below:\n"
      );
      console.log(err);
      console.log("\nSeeking for new results...");
    });
}

main();
