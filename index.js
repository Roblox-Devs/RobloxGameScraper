const axios = require("axios")
const fs = require("fs")
const r = 0;
const c = 3;
for (let i = 0; i < 1000; i++) {
    axios.get(`https://c${r}.rbxcdn.com/RobloxSetup_0.` + c + "." + i + ".0.exe", { timeout: 1000000 }).then((res) => {
        console.log(i + " exists")
        fs.appendFile("scraped.txt", `https://c${r}.roblox.com/S3FileHandler_Setup_0.` + c + "." + i + `.0.exe\n`, (err) => { })
    }).catch((err) => {
        console.log(err)
        console.log(`https://c${r}.rbxcdn.com//S3FileHandler_Setup_0.` + c + "." + i + ".0.exe" + " does not exist")
    })
}