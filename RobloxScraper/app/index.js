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
function clearConsole() {
    process.stdout.write("\u001b[2J\u001b[0;0H");
}
function main(print = true) {
    clearConsole()
    console.log(chalk.red(`:::::::::   ::::::::   ::::::::  
:+:    :+: :+:    :+: :+:    :+: 
+:+    +:+ +:+        +:+        
+#++:++#:  :#:        +#++:++#++              state of the art game scraper
+#+    +#+ +#+   +#+#        +#+              beats strawberrys's scraper (his isn't state of the art)
#+#    #+# #+#    #+# #+#    #+#             
###    ###  ########   ########  
`));
    console.log(`[1] Scrape games             
[2] Scrape models
[3] Set threads`)

    inquirer.question("> ", (choice) => {
        if (3 == choice) {
            clearConsole()
            setThreads("print")
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
        fs.writeFile("config/config.json", JSON.stringify({ threads: parseInt(choice) }), "utf8", (err) => {
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