const cron = require('node-cron')
const axios = require('axios')
const parse = require('parse-link-header')
require('dotenv').config()

// Testi-Kohan osoite
//const baseAddress = "https://koha-kktest.lib.helsinki.fi/api/v1"
const baseAddress = "https://app1.jyu.koha.csc.fi/api/v1"

//oltava getPatronsWithFinesin ulkopuolella, koska se suoritetaan monta kertaa
let patronsWithFines = []

const getPatronsWithFines = async (url) => {

    //hae kaikki asiakkaat, käy läpi joka sivu   

    //urlista pois x-koha-embed, joka headerin linkistä siihen tulee
    url = url.replace("&x-koha-embed=account_balance", "")
    let patrons = []
    try {
        patrons = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${process.env.BASIC}`,
                'x-koha-embed': 'account_balance',
                'User-Agent': 'Vanhentuneiden maksujen poistoskripti'
            }
        })
    } catch (error) {
        console.log(error)
    }

    for (const patron of patrons.data) {
        if (patron.account_balance > 0) {
            patronsWithFines.push({
                patron_id: patron.patron_id,
                account_balance: patron.account_balance,
                surname: patron.surname,
                firstname: patron.firstname
            })
        }
    }

    //TODO: tämä try - catchiin
    const parsed = parse(patrons.headers.link)

    //testailua varten
    if (patronsWithFines.length < 300) {
        return getPatronsWithFines(parsed.next.url)
    }

    /*if (parsed.next) {
        return getPatronsWithFines(parsed.next.url)
    }*/
    //etstitään vanhentuneet maksut
    const finesToRemove = await getExpiredFines(patronsWithFines)
    console.log("finesToRemove", finesToRemove)
    //poistetaan vanhentuneet maksut
    await removeFines(finesToRemove)
}

const removeFines = async (finesToRemove) => {
    for (patron of finesToRemove) {
        const data = {
            account_lines_ids: patron.account_lines_ids,
            amount: patron.amount,
            credit_type: "WRITEOFF",
            note: "Vanhentuneen maksun automaattipoisto"
        }
        const url = `${baseAddress}/patrons/${patron.patron_id}/account/credits`
        //TESTIOSOITE KUIVAHARJOITTELUUN
        //const url = "https://webhook.site/20b167fa-be79-4c99-ae04-90c734659b39"
        console.log("postaa datan:", data, "urliin", url)
        try {
            await axios.post(url, data, {
                headers: {
                    'Authorization': `Basic ${process.env.BASIC}`,
                    'User-Agent': 'Vanhentuneiden maksujen poistoskripti'
                }
            })
        }
        catch (error) {
            console.log(error)
        }

    }
}

const isExpired = (fineDate, now) => {
    const fineYear = fineDate.getFullYear()
    if (now.getFullYear() - fineYear >= 4) {
        return true
    }
    const fineMonth = fineDate.getMonth() + 1
    if (now.getFullYear() - fineYear === 3) {
        if (fineMonth < now.getMonth() + 1) return true
        else if (fineMonth === now.getMonth() + 1) {
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
                    'Authorization': `Basic ${process.env.BASIC}`,
                    'User-Agent': 'Vanhentuneiden maksujen poistoskripti'
                }
            })
            let patronWithExpired = {
                patron_id: patron.patron_id,
                amount: 0,
                account_lines_ids: []
            }
            for (const line of account.data.outstanding_debits.lines) {
                const fineDate = new Date(line.date)
                const now = new Date()
                const expired = isExpired(fineDate, now)
                if (expired) {
                    //kerätään asiakkaan useammat maksurivit yhteen
                    console.log(patron, expired)
                    patronWithExpired.amount = patronWithExpired.amount + line.amount_outstanding
                    patronWithExpired.account_lines_ids.push(line.account_line_id)
                }
            }
            //jos asiakkaalla on vanhentuneita maksuja, otetaan talteen
            if (patronWithExpired.amount > 0) {
                expiredFines.push(patronWithExpired)
                console.log("patronWithExpired", patronWithExpired)
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