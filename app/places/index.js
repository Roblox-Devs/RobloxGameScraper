const readline = require("readline")
const axios = require("axios")
const fs = require("fs")
const { Worker, isMainThread, parentPort, workerData, MessageChannel } = require('worker_threads');
const { start } = require("repl");
const chalk = require("chalk")
const xml2js = require('xml2js');
const { clear } = require("console");

let realEnd;
try {
    fs.mkdir("scraped_games", () => { })
    fs.mkdir("scraped_models", () => { })
} catch (error) { }

async function getName(placeid, ati) {
    return axios.get("https://economy.roblox.com/v2/developer-products/" + placeid + "/info", { headers: {} }).then(async function (response) {
        if (response.data.AssetTypeId == parseInt(ati)) {
            return [response.data.Name, response.data.Creator.Name]
        }
        return null
    }).catch(async function (error) {
        return null
    })
}
async function writeSpecialFile(url, filteredName) {
    let ur = url
    if (ur.startsWith("http://www.roblox.com/asset/")) {
        ur = ur.replace("http://www.roblox.com/asset/", "https://assetdelivery.roblox.com/v1/asset/");
    }
    if (ur.startsWith("http://roblox.com/asset")) {
        ur = ur.replace("http://roblox.com/asset/", "https://assetdelivery.roblox.com/v1/asset/");
    }
    const response = await axios.get(ur, { responseType: "arraybuffer" }).catch(function (error) {
        return null
    });
    if (response == null) { return response } else { return response.data }
}
async function writeFile(placeId, gameName, ati, fle, creatorName, log) {
    let filteredName = ""
    ati = parseInt(ati)
    if (ati == 10) {
        filteredName = `${gameName} [${placeId}].rbxm`.replace(/[\\\/\:\*\?\"\<\>\|]/g, '');
    }
    if (ati == 9) {
        filteredName = `${gameName} [${placeId}].rbxl`.replace(/[\\\/\:\*\?\"\<\>\|]/g, '');
    }
    if (ati != 9 && ati != 10) {
        filteredName = `${gameName} [${placeId}]${fle}`.replace(/[\\\/\:\*\?\"\<\>\|]/g, '');
    }
    if (log) {
        let folder = (ati === 9) ? "scraped_games" : (ati === 10) ? "scraped_models" : "scraped_custom";
        if (folder == "scraped_custom" || folder == "scraped_models") {
            fs.appendFileSync(`${folder}/log.txt`, `${gameName} | By: ${creatorName} | URL: https://roblox.com/library/${placeId}\n`, "utf8", (err) => { });
        } else {
            fs.appendFileSync(`${folder}/log.txt`, `${gameName} | By: ${creatorName} | ID: https://roblox.com/games/${placeId}\n`, "utf8", (err) => { });
        }
    } else {
        try {
            const response = await axios.get("https://assetdelivery.roblox.com/v1/asset/?id=" + placeId, { responseType: "arraybuffer" });
            const buffer = response.data;
            const uint8Array = new Uint8Array(buffer);
            const text = String.fromCharCode.apply(null, uint8Array);
            let fixed = undefined;
            if (ati != 10 && ati != 9) {
                await new Promise((resolve, reject) => {
                    xml2js.parseString(text, async (err, result) => {
                        if (!err) {
                            const url = result.roblox.Item[0].Properties[0].Content[0].url[0];
                            fixed = await writeSpecialFile(url, filteredName);
                            resolve();
                        } else {
                            resolve(err);
                        }
                    });
                });
            }

            if (response.status === 200) {
                if (ati == 10) {
                    console.log(chalk.green("[SUCCESS]") + ": (MODEL ID: " + placeId + ") Name: " + filteredName);
                    fs.writeFileSync(`scraped_models/${filteredName}`, response.data);
                }
                if (ati == 9) {
                    console.log(chalk.green("[SUCCESS]") + ": (PLACE ID: " + placeId + ") Name: " + filteredName);
                    fs.writeFileSync(`scraped_games/${filteredName}`, response.data);
                }
                if (ati != 9 && ati != 10) {
                    if (fixed == undefined) {
                        console.log(chalk.blue(`[RATELIMITED`) + " on ID: " + index)
                        return
                    }
                    console.log(chalk.green("[SUCCESS]") + ": (ID: " + placeId + ") Name: " + filteredName);
                    fs.writeFileSync(`scraped_custom/${filteredName}`, fixed);
                }
            }
        } catch (error) {
        }
    }
}

async function init(startId, endId, ati, format, log) {
    for (let index = startId; index <= endId; index++) {
        let info = await getName(index, ati)
        if (info != null) {
            let name = info[0]
            await writeFile(index, name, ati, format, info[1], log)
        } else {
            console.log(chalk.red(`[FALILED]`) + " on ID: " + index)
        }
    }
}
function clearConsole() {
    process.stdout.write("\u001b[2J\u001b[0;0H");
}
async function successScreen(s, e) {
    module.exports.successThing = true
    clearConsole()
    console.log(chalk.green("Successfully scraped range: " + s + " - " + e + ". Press enter to go back to main menu"))
}
async function startThreads(sid, eid, threadamount, ati, format, log) {
    console.log("Starting threads...")
    const batchSize = Math.ceil((eid - sid) / threadamount);
    let threadsWeHaveOpen = 0
    if (isMainThread) {
        for (let i = 0; i <= threadamount; i++) {
            const batchStart = sid + i * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, eid);
            if (batchStart > batchEnd) { return; }
            const worker = new Worker(__filename, { workerData: { sid: batchStart, eid: batchEnd, at: ati, format: format, log: log } });
            worker.on('message', message => {

                threadsWeHaveOpen -= 1;
                if (threadsWeHaveOpen == 0) {
                    worker.terminate(); successScreen(sid, eid);
                } else {
                    worker.terminate();
                }
            });
            threadsWeHaveOpen += 1;
        }

    } else {
        console.log("Failed to start threads. Please report this in a GitHub issue.")
    }
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function a() {
    if (isMainThread) {
    } else {
        await init(workerData.sid, workerData.eid, workerData.at, workerData.format, workerData.log)
        parentPort.postMessage(true)
    }
}

async function startScrape(ati, format) {
    const fs = require('fs')
    const json = fs.readFileSync('./config/config.json')
    const log = JSON.parse(json).log
    const config = JSON.parse(json).threads
    const type = (ati == 10) ? "model" : (ati == 9) ? "place" : "ATI scrape"
    if (isMainThread) {
        if (config == "NOT SET") {
            clearConsole()
            console.log("Thread amount hasn't been set in settings, press enter to go back to main menu.")
            await delay(1)
            module.exports.successThing = true
            return
        }
        inquirer = require("../index.js").inquirer
        inquirer.question("Starting (" + type + ") ID: ", (startId) => {
            inquirer.question("Ending (" + type + ") ID: ", (endId) => {
                if (endId - startId == 0) {
                    console.log("Must be a range")
                    startScrape(ati)
                    return
                }
                clearConsole()
                realEnd = endId
                startThreads(parseInt(startId), parseInt(endId), config, ati, format, log)
            })
        })
    }
}
a()
module.exports = { startScrape }
module.exports.successThing = false