const readline = require("readline")
const axios = require("axios")
const fs = require("fs")
const { Worker, isMainThread, parentPort, workerData, MessageChannel } = require('worker_threads');
const { start } = require("repl");
const chalk = require("chalk")
const xml2js = require('xml2js');
const https = require('https');
const { clear } = require("console");
const client = axios.create({
    timeout: 60000,
    httpsAgent: new https.Agent({ keepAlive: true }),
})

let realEnd;
try {
    fs.mkdir("scraped_games", () => { })
    fs.mkdir("scraped_models", () => { })
} catch (error) { }

async function getName(placeid, ati) {
    return axios.get("https://economy.roblox.com/v2/developer-products/" + placeid + "/info", { headers: {} }).then(async function (response) {
        if (ati == "anything lol" || response.data.AssetTypeId == parseInt(ati)) {
            return [response.data.Name, response.data.Creator.Name, response.data.Created, response.data.AssetTypeId]
        }
        return null
    }).catch(async function (error) {
        return null
    })
}
async function generateRequestData(startVersion, placeId) {
    return Array.from({ length: 255 }, (_, index) => ({
        assetId: placeId,
        requestId: `${startVersion + index}`,
        version: startVersion + index
    }));
}

async function sendReq(placeId, filteredGameName, filteredName, item, rets, folder) {
    let retries = rets || 0;
    let success = false;
    try {
        const res = await client.get(item.location, { responseType: "arraybuffer" });
        await fs.mkdirSync(`${folder}/${placeId} (${filteredGameName})`, { recursive: true })
        await fs.writeFileSync(`${folder}/${placeId} (${filteredGameName})/[VERSION ${item.requestId}] ${filteredName}`, res.data);
        console.log(chalk.green("[SUCCESS]") + ": (ID: " + placeId + ") Name: " + filteredName + " | Version: " + item.requestId);
        success = true;
    } catch (error) {
        if (retries == 3) {
            console.log(`Failed to retrieve ${item.location}`);

        }
        console.log(`Error in request. Retrying... `, error);
        await sendReq(placeId, filteredGameName, filteredName, item, retries + 1, folder);
    }

    if (!success) {
        console.error(`Failed to retrieve ${item.location}`);
    }
}

async function getAllVersions(startVer, endVer, placeId, filteredGameName, filteredName, retries = 3, folder) {
    try {
        const requestData = await generateRequestData(startVer, placeId);
        let response;

        try {
            response = await axios.post('https://assetdelivery.roblox.com/v1/assets/batch',
                requestData,
                {
                    headers: {
                        'accept': 'application/json',
                        'Roblox-Browser-Asset-Request': '',
                        'Content-Type': 'application/json'
                    }
                }
            );
        } catch (error) {
            if (error.response && error.response.status === 429) {
                console.log(chalk.magenta("[RATELIMITED ON]") + " " + placeId + " Name: " + filteredGameName + " | Retrying until unratelimited.");
                await getAllVersions(startVer, endVer, placeId, filteredGameName, filteredName, retries, folder);
                return
            }
            if (retries > 0) {
                console.log(`Error in request, possibly because of rate limiting. Retrying... (${retries} retries left), error: ${error}`);
                await getAllVersions(startVer, endVer, placeId, filteredGameName, filteredName, retries - 1, folder);
                return;
            } else {
                console.log(chalk.red("[COULD NOT FETCH]") + " " + placeId + " Name: " + filteredGameName);
                throw error;
            }
        }
        const requests = response.data.map(async (item) => {
            if (item.location) {
                try {
                    await sendReq(placeId, filteredGameName, filteredName, item, retries, folder);
                } catch (error) {

                }
            }
        });


        await Promise.all(requests);

        if (response.data[response.data.length - 1].location) {
            if (startVer == 1) {
                console.log("Hey ROBLOX, give me more games!")
                await getAllVersions(startVer + 255, endVer + 255, placeId, filteredGameName, filteredName, undefined, folder);
            } else {
                console.log("Hey ROBLOX, give me more games!")
                await getAllVersions(endVer + 1, endVer + 255, placeId, filteredGameName, filteredName, undefined, folder);
            }
        }
    } catch (error) {
        console.log('Error, retrying (for debug info, here is the error): ', error);
        await getAllVersions(startVer + 255, endVer + 255, placeId, filteredGameName, filteredName, undefined, folder);
    }
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
async function writeFile(placeId, gameName, ati, fle, creatorName, log, created, assetTypeThatWasScraped, allVersions) {
    let filteredName = ""
    let filteredGameName = `${gameName}`.replace(/[\\\/\:\*\?\"\<\>\.|]/g, '').replace(/[^\x00-\x7F]/g, "");
    let folder = (ati === 9) ? "scraped_games" : (ati === 10) ? "scraped_models" : "scraped_custom";
    ati = ati !== "anything lol" ? parseInt(ati) : ati;
    if (ati == 10) {
        filteredName = `${gameName} [${placeId}].rbxm`.replace(/[\\\/\:\*\?\"\<\>\|]/g, '').replace(/[^\x00-\x7F]/g, "");
    }
    if (ati == 9) {
        filteredName = `${gameName} [${placeId}].rbxl`.replace(/[\\\/\:\*\?\"\<\>\|]/g, '').replace(/[^\x00-\x7F]/g, "");
    }
    if (ati != 9 && ati != 10) {
        filteredName = `${gameName} [${placeId}]${fle}`.replace(/[\\\/\:\*\?\"\<\>\|]/g, '').replace(/[^\x00-\x7F]/g, "");
    }
    if (allVersions) {
        await getAllVersions(1, 255, placeId, filteredGameName, filteredName, undefined, folder)
        return
    }
    if (log || ati == "anything lol") {
        if (ati == "anything lol") {
            folder = "scraped_everything"
        }
        if (folder == "scraped_custom" || folder == "scraped_models") {
            console.log(chalk.green("[SUCCESS]") + ": (ID: " + placeId + ") Name: " + gameName);
            fs.appendFileSync(`${folder}/log.txt`, `${gameName} | By: ${creatorName} | URL: https://roblox.com/library/${placeId}\n | Created: ${created}`, "utf8", (err) => { });
        } else if (folder == "scraped_everything") {
            console.log(chalk.green("[SUCCESS]") + ": (ID: " + placeId + ") Name: " + gameName);
            fs.appendFileSync(`${folder}/log.txt`, `${gameName} | By: ${creatorName} | URL: https://roblox.com/library/${placeId} | Created: ${created} | AssetTypeID: ${assetTypeThatWasScraped}\n`, "utf8", (err) => { });
        } else {
            console.log(chalk.green("[SUCCESS]") + ": (PlaceID: " + placeId + ") Name: " + gameName);
            fs.appendFileSync(`${folder}/log.txt`, `${gameName} | By: ${creatorName} | URL: https://roblox.com/games/${placeId} | Created: ${created} \n`, "utf8", (err) => { });
        }
    } else {
        try {
            let success = false;
            const locationToLink = await axios.get("https://assetdelivery.roblox.com/v1/assetId/" + placeId).then(function (response) {
                const data = response.data
                if (data.errors == undefined) {
                    success = true
                    return data.location
                }
            })
            if (!success) {
                console.log(chalk.red(`[FALILED]`) + " on ID: " + index)
                return
            }
            const response = await axios.get(locationToLink, { responseType: "arraybuffer" });


            const buffer = response.data;
            const uint8Array = new Uint8Array(buffer);
            const text = String.fromCharCode.apply(null, uint8Array);
            let fixed = undefined;
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

async function init(startId, endId, ati, format, log, allVersions) {
    for (let index = startId; index <= endId; index++) {
        let info = await getName(index, ati)
        if (info != null) {
            let name = info[0]
            await writeFile(index, name, ati, format, info[1], log, info[2], info[3], allVersions)
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
async function startThreads(sid, eid, threadamount, ati, format, log, allVersions) {
    console.log("Starting threads...")
    const batchSize = Math.ceil((eid - sid) / threadamount);
    let threadsWeHaveOpen = 0
    if (isMainThread) {
        for (let i = 0; i <= threadamount; i++) {
            const batchStart = sid + i * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, eid);
            if (batchStart > batchEnd) { return; }
            const worker = new Worker(__filename, { workerData: { sid: batchStart, eid: batchEnd, at: ati, format: format, log: log, allVersions: allVersions } });
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
        await init(workerData.sid, workerData.eid, workerData.at, workerData.format, workerData.log, workerData.allVersions)
        parentPort.postMessage(true)
    }
}

async function startScrape(ati, format) {
    const fs = require('fs')
    const json = fs.readFileSync('./config/config.json')
    const log = JSON.parse(json).log
    const config = JSON.parse(json).threads
    const allVersions = JSON.parse(json).allversions
    let type = (ati == 10) ? "model" : (ati == 9) ? "place" : "ATI scrape"
    if (isMainThread) {
        if (config == "NOT SET") {
            clearConsole()
            console.log("Thread amount hasn't been set in settings, press enter to go back to main menu.")
            await delay(1)
            module.exports.successThing = true
            return
        }
        if (ati == "anything lol") {
            console.log(`
            You have decided to scrape with the new experimental feature (EVERYTHING)
            Please note, this will not download assets, and that it will log all assets it finds to a text file.
            This will not follow the "Download all versions" setting.
            `)
            type = "Everything"
        }
        if (type == "Everything") {
            allVersions = false;
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
                startThreads(parseInt(startId), parseInt(endId), config, ati, format, log, allVersions)
            })
        })
    }
}
a()
module.exports = { startScrape }
module.exports.successThing = false