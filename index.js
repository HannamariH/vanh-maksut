const cron = require('node-cron')
const axios = require('axios')
require('dotenv').config()

// Testi-Kohan osoite
//const baseAddress = "https://koha-kktest.lib.helsinki.fi/api/v1"
const baseAddress = "https://app1.jyu.koha.csc.fi/api/v1"

// 
const removeOldDebts = () => {
    console.log("taas kului minuutti")
    //hae kaikki asiakkaat https://app1.jyu.koha.csc.fi/api/v1/patrons (header ”x-koha-embed”: ”account_balance”)
    //etsi ne, joilla maksuja
    //poimi niiden patron_id:t
    //hae näiden maksutiedot https://app1.jyu.koha.csc.fi/api/v1/patrons/<patron_id>/account
    //etsi niistä vanhentuneet maksut
    //poista ne, POST /patrons/{patron_id}/account/credits (?)
}

// ajastetaan maksujen poisto joka yölle
//cron.schedule('0 2 * * *', () => removeOldDebts())   AJAA SKRIPTIN JOKA YÖ KLO 02:00
cron.schedule('* * * * *', () => removeOldDebts())
