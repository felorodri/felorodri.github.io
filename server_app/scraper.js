const cheerio = require("cheerio");
const axios = require("axios");

async function performScraping(url) {
  var config = {
    method: "get",
    url: url,
    headers: {},
  };

  axios(config)
    .then(function (response) {
      const $ = cheerio.load(response.data);
      const resultsTable = $("#race1result > table tbody tr").toArray();
      let raceResults = [];
      resultsTable.forEach((element, i) => {
        const rowValues = $(element).find("td").toArray();
        racePositionData = {};
        rowValues.forEach((value, k) => {
          switch (k) {
            case 0:
              racePositionData["position"] = $(value).text();
              break;
            case 2:
              racePositionData["carClass"] = $(value).text();
              break;
            case 4:
              racePositionData["driverName"] = $(value).text();
              break;
            case 6:
              racePositionData["steamId"] = $(value).text();
              break;
            case 7:
              racePositionData["drivenLaps"] = $(value).text();
              break;
            case 8:
              racePositionData["LeaderLapsDifference"] = $(value).text();
              break;
            case 9:
              racePositionData["bestLap"] = $(value).text();
              break;
            case 10:
              racePositionData["consistency"] = $(value).text();
              break;
            case 11:
              racePositionData["leadLaps"] = $(value).text();
              break;
            case 12:
              racePositionData["pitStops"] = $(value).text();
              break;
            default:
              break;
          }
        });
        raceResults.push(racePositionData);
      });
      // console.log($.html(htmlElement));
      console.log(raceResults);
      return raceResults;
    })
    .catch(function (error) {
      console.log(
        "\nRace results scraping failed. More details about the error found below:\n"
      );
      console.log(error);
    });
}

module.exports = { performScraping };
