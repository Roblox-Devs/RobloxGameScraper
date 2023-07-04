const readline = require("readline")
const axios = require("axios")
const fs = require("fs")
const { Worker, isMainThread, parentPort, workerData, MessageChannel } = require('worker_threads');
const { start } = require("repl");
const chalk = require("chalk")
let realEnd;
try {
    fs.mkdir("scraped_games", () => { })
    fs.mkdir("scraped_models", () => { })
} catch (error) { }

async function getName(placeid, ati) {
    return axios.get("https://economy.roblox.com/v2/developer-products/" + placeid + "/info", { headers: {} }).then(async function (response) {
        if (response.data.AssetTypeId == parseInt(ati)) {
            return response.data.Name
        }
        return null
    }).catch(async function (error) {
        return null
    })
}

async function writeFile(placeId, gameName, ati) {
    let filteredName = ""
    if (ati == 10) {
        filteredName = `${gameName} [${placeId}].rbxm`.replace(/[\\\/\:\*\?\"\<\>\|]/g, '');
    } else {
        filteredName = `${gameName} [${placeId}].rbxl`.replace(/[\\\/\:\*\?\"\<\>\|]/g, '');
    }

    try {
        const response = await axios.get("https://assetdelivery.roblox.com/v1/asset/?id=" + placeId, { responseType: "arraybuffer" });
        if (response.status === 200) {
            if (ati == 10) {
                console.log(chalk.green("[SUCCESS]") + ": (MODEL ID: " + placeId + ") Name: " + filteredName);
                fs.writeFileSync(`scraped_models/${filteredName}`, response.data);
            } else {
                console.log(chalk.green("[SUCCESS]") + ": (PLACE ID: " + placeId + ") Name: " + filteredName);
                fs.writeFileSync(`scraped_games/${filteredName}`, response.data);
            }
        }
    } catch (error) {
    }
}

async function init(startId, endId, ati) {
    for (let index = startId; index <= endId; index++) {
        let name = await getName(index, ati)
        if (name != null) {
            await writeFile(index, name)
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
async function startThreads(sid, eid, threadamount, ati) {
    console.log("Starting threads...")
    const batchSize = Math.ceil((eid - sid) / threadamount);
    let threadsWeHaveOpen = 0
    if (isMainThread) {
        for (let i = 0; i <= threadamount; i++) {
            const batchStart = sid + i * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, eid);
            if (batchStart > batchEnd) { return; }
            const worker = new Worker(__filename, { workerData: { sid: batchStart, eid: batchEnd, at: ati } });
            worker.on('message', message => { threadsWeHaveOpen -= 1; if (threadsWeHaveOpen == 0) { worker.terminate(); successScreen(sid, eid); } else { worker.terminate(); } });
            threadsWeHaveOpen += 1;
        }

    } else {
        console.log("Failed to start threads. Please report this in a GitHub issue.")
    }
}
async function a() {
    if (isMainThread) {
    } else {
        await init(workerData.sid, workerData.eid, workerData.at)
        parentPort.postMessage(true)
    }
}

function startScrape(ati) {
    const fs = require('fs')
    const json = fs.readFileSync('./config/config.json')
    const config = JSON.parse(json).threads
    const type = (ati == 10) ? "model" : "place"
    if (isMainThread) {
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
                startThreads(parseInt(startId), parseInt(endId), config, ati)
            })
        })
    }
}
a()
module.exports = { startScrape }
module.exports.successThing = false