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

  return axios.post(webhookUrl, data);
}

module.exports = { discordWebHookPublisher };
