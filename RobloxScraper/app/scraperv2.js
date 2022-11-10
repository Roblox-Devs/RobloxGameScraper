// maybe in future, remove grabbing univese ids from place id and only use universe id

const readline = require("readline")
const axios = require("axios")
const fs = require("fs")

const inquirer = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

try {
    fs.mkdir("scraped_games", () => {})
} catch (error) {}

async function getUniverseId(placeId) {
    return new Promise((resolve, reject) => {
        axios.get(`https://api.roblox.com/Marketplace/ProductInfo?assetId=1818`).then((response) => {
            if (response.data && response.data["AssetTypeId"] == 9) {
                resolve(response.data["ProductId"])
                } else {
                    resolve("fail")
                }
            }).catch((error) => {
                resolve("fail")
            })
    })
}

async function writeFile(placeId, gameName) {
    console.log("writing game with id", placeId)
    let filteredName = `${gameName} [${placeId}].rbxl`.replace(/[\\\/\:\*\?\"\<\>\|]/g, '')
    fs.writeFileSync(`scraped_games/${filteredName}`, (await axios.get("https://assetdelivery.roblox.com/v1/asset/?id=" + placeId, {responseType: "arraybuffer"})).data)
}

async function getAssets(universeIds) { 
    axios.get(`https://games.roblox.com/v1/games?universeIds=${universeIds}`).then((response) => {
        for (let index = 0; index < response.data.data.length; index++) {
            const currentData = response.data.data[index]

            if (currentData.copyingAllowed === true) {
                writeFile(currentData.rootPlaceId, currentData.name)
            }
        }
    })
}

async function init(startId, endId) {
    console.log(`Starting to scrape. startId: ${startId} | endId: ${endId}.`)

    let [universeIds, count] = ["", 0]

    for (let index = startId; index < endId; index++) {
        let universeId = await getUniverseId(index)
        //console.log(universeId)

        if (universeId !== "fail") {
            count++
            universeIds += universeId + ","
            
            if (count % 100 === 0) {
                await getAssets(universeIds)
                universeIds = ""
            }
        }
    }
}

inquirer.question("Start id: ", (startId) => {
    inquirer.question("End id: ", (endId) => {
        init(parseInt(startId), parseInt(endId))
    })
})

process.on('uncaughtException', (error) => {}) // if request fails, doesn't crash program
