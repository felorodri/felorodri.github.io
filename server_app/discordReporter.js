const axios = require("axios");

function discordWebHookPublisher(
  webhookUrl,
  eventTitle,
  reportUrl,
  customDesc = null,
  username = null
) {
  const data = {
    content: null,
    embeds: [
      {
        title: "Race report: " + eventTitle,
        description: customDesc
          ? customDesc
          : "Check out the results of our most recent race event and enjoy every detail. This comprehensive report includes final positions, lap times, incidents, consistency, and many more aspects of each scheduled session: practice, qualifying, and race.",
        url: reportUrl,
        color: null,
        author: {
          name: "New Race Result Submitted",
        },
        footer: {
          text: "Race result published on",
        },
        timestamp: new Date(),
      },
    ],
    username: username ? username : "Race control",
    attachments: [],
  };

  return new Promise((resolve, reject) => {
    axios
      .post(webhookUrl, data)
      .then((res) => {
        // console.log(`Status: ${res.status}`);
        if (res.status == 204) {
          console.log("New race results published on discord!");
          Promise.resolve(1);
        }
      })
      .catch((err) => {
        console.log(
          "\nRace results discord auto-publish failed. More details about the error found below:\n"
        );
        console.log(err);
        Promise.reject(0);
      });
  });
}

module.exports = { discordWebHookPublisher };
