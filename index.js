const cron = require('node-cron')
const axios = require('axios')
const parse = require('parse-link-header')
require('dotenv').config()

// Testi-Kohan osoite
//const baseAddress = "https://koha-kktest.lib.helsinki.fi/api/v1"
const baseAddress = "https://app1.jyu.koha.csc.fi/api/v1"

let patronsWithFines = []

//etsi ne, joilla maksuja
//poimi niiden patron_id:t
//hae näiden maksutiedot https://app1.jyu.koha.csc.fi/api/v1/patrons/<patron_id>/account
//etsi niistä vanhentuneet maksut
//poista ne, POST /patrons/{patron_id}/account/credits (?)

const getPatronsWithFines = async (url) => {
    //hae kaikki asiakkaat, käy läpi joka sivu   

    //urlista pois x-koha-embed
    url = url.replace("&x-koha-embed=account_balance", "")
    let patrons = []
    try {
        patrons = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${process.env.BASIC}`,
                'x-koha-embed': 'account_balance'
            }
        })     
    } catch (error) {
        console.log(error)
    }

    for (const patron of patrons.data) {
        if (patron.account_balance > 0) {
            //console.log(patron.patron_id, patron.account_balance, patron.surname, patron.firstname)
            patronsWithFines.push({
                patron_id: patron.patron_id, 
                account_balance: patron.account_balance, 
                surname: patron.surname, 
                firstname: patron.firstname
            })
        }
    }

    //tämä try - catchiin
    const parsed = parse(patrons.headers.link)

    /*if (patronsWithFines.length < 100) {
        return getPatronsWithFines(parsed.next.url)
    }*/

    //console.log("patronsWithFines", patronsWithFines)

    if (parsed.next) {
        return getPatronsWithFines(parsed.next.url)
    }
    getExpiredFines(patronsWithFines)
}

const isExpired = (fineDate) => {
    const now = new Date()
    const fineYear = fineDate.getFullYear()
    if (now.getFullYear()-fineYear >= 4) {
        return true
    }
    const fineMonth = fineDate.getMonth()+1
    if (now.getFullYear()-fineYear === 3) {
        if (fineMonth < now.getMonth()+1) return true
        else if (fineMonth === now.getMonth()+1) {
            const fineDay = fineDate.getDate()
            if (fineDay <= now.getDate()) return true
        }
    }
    return false
}

const getExpiredFines = async (patronList) => {

    let expiredFines = []

    for (const patron of patronList) {
        try {
            const account = await axios.get(`${baseAddress}/patrons/${patron.patron_id}/account`, {
                headers: {
                    'Authorization': `Basic ${process.env.BASIC}`
                }
            })
            //console.log(account.data)          
            //console.log(patron)
            for (const line of account.data.outstanding_debits.lines) {
                //console.log("date:", line.date)
                const fineDate = new Date(line.date)
                const now = new Date()
                const expired = isExpired(fineDate)
                if (expired) {
                    //TODO: tästä eteenpäin, ota tarvittavat jutut talteen ja etene poistamiseen
                    //otetaan ko. linen account_line_id ja amount_outstanding talteen
                    //poistetaan nämä rivit per asiakas, mukaan yhteissumma jos on monta vanhentunutta maksua
                    console.log(patron, expired)
                }
            }    
        }
        catch (error) {
            console.log(error)
        }
    }
    return expiredFines
}

// ajastetaan maksujen poisto joka yölle
//cron.schedule('0 2 * * *', () => removeOldDebts())   AJAA SKRIPTIN JOKA YÖ KLO 02:00
//minuutin välein
//cron.schedule('* * * * *', () => removeOldDebts())

getPatronsWithFines(`${baseAddress}/patrons`)