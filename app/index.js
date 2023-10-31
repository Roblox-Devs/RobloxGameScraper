const chalk = require('chalk');
const { clear } = require('console');
const readline = require('readline')
const inquirer = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})
const placeScraper = require('./places/index.js')
const fs = require('fs')
let setThreadsMenu = false;
let quotes = [
    "",
    "This program is TECH!!!",
    "The future of scraping is RGS.",
    "Remember, STATE OF THE ART.",
    "Billions must scrape!",
    "undefined, wait, why is this quote undefined?",
]
function mathRand(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function clearConsole() {
    console.clear()

}

function settingsMenu() {
    const config = JSON.parse(fs.readFileSync("config/config.json"))
    console.log(`Settings:\n[1] Threads (${config.threads})\n[2] Experimental Mode (${config.experimental})\n[3] Log in text file instead of downloading (${config.log})`)
    if (config.experimental) {
        console.log(`[4] Scrape all versions of assets (${config.allversions})`)
        console.log("[5] Exit")
    } else {
        console.log("[4] Exit")
    }
    inquirer.question("> ", (choice) => {
        if (1 == choice) {
            clearConsole()
            setThreads("print")
            return
        }
        if (2 == choice) {
            config.experimental = !config.experimental
            if (!fs.existsSync("scraped_custom")) {
                fs.mkdirSync("scraped_custom")
            }
            fs.writeFileSync("config/config.json", JSON.stringify(config), "utf8", (err) => { })
            clearConsole()
            settingsMenu()
            return
        }
        if (3 == choice) {
            if (!config.log && config.allversions) {
                clearConsole()
                console.log(chalk.red("[ERROR]") + " Cannot log and scrape all versions at the same time, please turn off logging.")
                settingsMenu()
                return
            }
            config.log = !config.log
            fs.writeFileSync("config/config.json", JSON.stringify(config), "utf8", (err) => { })
            clearConsole()
            settingsMenu()
            return
        }
        if (4 == choice && config.experimental) {
            if (config.log && !config.allversions) {
                clearConsole()
                console.log(chalk.red("[ERROR]") + " Cannot log and scrape all versions at the same time, please turn off logging.")
                settingsMenu()
                return
            }
            config.allversions = !config.allversions
            fs.writeFileSync("config/config.json", JSON.stringify(config), "utf8", (err) => { })
            clearConsole()
            if (config.allversions) {
                console.log(chalk.yellow("[WARNING]") + " Scraping all versions of assets is significantly slower than just downloading the first version.")
            }
            settingsMenu()
            return
        }
        if (5 == choice && config.experimental) {
            main(false)
            return
        }
        if (4 == choice) {
            main(false)
            return
        } else {
            clearConsole()
            settingsMenu()
        }
    })
}
function scrViaAVI() {
    inquirer.question("AssetTypeId: ", (at) => {
        if (isNaN(parseInt(at)) == true) {
            console.log("Enter a valid number")
            scrViaAVI()
            return
        }
        inquirer.question("File extension (.png, .rbxm, etc): ", (fle) => {
            placeScraper.startScrape(at, fle)
        })
    })
}
async function main(print = true) {
    if (!fs.existsSync("config")) { fs.mkdirSync("config"); fs.writeFileSync("config/config.json", `{"threads": "NOT SET", "experimental":false, "log":false, "allversions":false}`, (err) => { }) }
    if (!fs.existsSync("scraped_games")) { fs.mkdirSync("scraped_games"); }
    if (!fs.existsSync("scraped_models")) { fs.mkdirSync("scraped_models"); }
    if (!fs.existsSync("scraped_custom")) { fs.mkdirSync("scraped_custom"); }
    if (!fs.existsSync("scraped_everything")) { fs.mkdirSync("scraped_everything"); }


    const config = JSON.parse(fs.readFileSync("config/config.json"))
    clearConsole()
    console.log(chalk.red(`:::::::::   ::::::::   ::::::::  
:+:    :+: :+:    :+: :+:    :+: 
+:+    +:+ +:+        +:+        
+#++:++#:  :#:        +#++:++#++              state of the art game scraper
+#+    +#+ +#+   +#+#        +#+              beats strawberrys's scraper (his isn't state of the art)
#+#    #+# #+#    #+# #+#    #+#              ` + quotes[mathRand(1, 5)] + `
###    ###  ########   ########  
`));
    console.log(`[1] Scrape games             
[2] Scrape models`)
    if (config.experimental) {
        console.log("[3] Scrape via AssetTypeID")
        console.log("[4] Scrape all assets")
        console.log("[5] Settings")
    } else {
        console.log("[3] Settings")
    }
    inquirer.question("> ", (choice) => {
        if (3 == choice && !config.experimental) {
            clearConsole()
            settingsMenu()
            return
        }
        if (4 == choice && config.experimental) {
            placeScraper.startScrape("anything lol")
            return
        }
        if (5 == choice && config.experimental) {
            clearConsole()
            settingsMenu()
            return
        }
        if (3 == choice && config.experimental) {
            scrViaAVI()
            return
        }
        if (1 == choice) {

            placeScraper.startScrape(9)
            return
        }
        if (2 == choice) {
            placeScraper.startScrape(10)
            return
        } else {
            main(false)
        }
    })
}

clearConsole()
function setThreads(t) {
    if (t == "print") { console.log("What would you like to set the amount of threads to?") }
    inquirer.question("> ", (choice) => {
        if (isNaN(parseInt(choice)) == true) {
            console.log("Enter a valid number")
            setThreads()
            return
        }
        var json = JSON.parse(fs.readFileSync('config/config.json'))
        if (json.threads) {
            json.threads = parseInt(choice)
        }

        fs.writeFile("config/config.json", JSON.stringify(json), "utf8", (err) => {
            if (err) {
                main("Failed to set threads to " + choice + ", report this on GitHub with a screenshot of this:\n " + err)
            } else {
                setThreadsMenu = true
                clearConsole()
                console.log(chalk.green("Successfully set threads to " + choice + ", press enter to go back to main menu"))
            }
        })
    })
}
process.stdin.on('keypress', function (letter, key) {
    if (key && setThreadsMenu && key.name === 'enter' || (setThreadsMenu || placeScraper.successThing) && key && key.name === 'return') {
        if (placeScraper.successThing == true) {
            placeScraper.successThing = false
            main()
        } else {
            main()
            setThreadsMenu = false
        }
    }
})
main()
module.exports.inquirer = inquirer