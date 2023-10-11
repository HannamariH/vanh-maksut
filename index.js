const cron = require('node-cron')
const axios = require('axios')
const parse = require('parse-link-header')
const winston = require('winston')
require('dotenv').config()

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.prettyPrint()
    ),
    transports: [
        new winston.transports.File({
            filename: "./logs/error.log",
            level: "error"
        }),
        new winston.transports.File({
            filename: "./logs/combined.log",
            level: "info"
        })
    ]
})

const baseAddress = "https://app1.jyu.koha.csc.fi/api/v1"

const getPatronsWithFines = async (url, patronsWithFines) => {
    //get all patrons, go through every page

    //remove from url x-koha-embed, that comes from the header link
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
        logger.error({
            message: "Asiakkaiden haku epännistui: " + error.response.data.error,
            status: error.response.status,
            url: error.config.url,
        })
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

    try {
        const parsed = parse(patrons.headers.link)
        if (parsed.next) {
            return getPatronsWithFines(parsed.next.url, patronsWithFines)
        }
    }
    catch (error) {
        logger.error({
            message: "Next urlin parsiminen headerista epännistui",
        })
    }

    //search for expired fines
    const finesToRemove = await getExpiredFines(patronsWithFines)
    if (finesToRemove.length === 0) {
        logger.info({message: "Ei vanhentuneita maksuja"})
        return
    }
    //remove expired fines
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
        try {
            await axios.post(url, data, {
                headers: {
                    'Authorization': `Basic ${process.env.BASIC}`,
                    'User-Agent': 'Vanhentuneiden maksujen poistoskripti'
                }
            })
            logger.info({
                message: "Vanhentuneet maksut poistettu",
                patron: patron.patron_id,
                account_lines_ids: patron.account_lines_ids,
                amount: patron.amount
            })
        }
        catch (error) {
            logger.error({
                message: "Maksujen poisto epännistui: " + error.response.data.error,
                status: error.response.status,
                url: error.config.url,
            })
        }
    }
}

const isExpired = (fineDate, now) => {
    if (typeof fineDate !== "object" && !typeof now !== "object") return false
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
                    //combine patron's multiple fine rows
                    patronWithExpired.amount = patronWithExpired.amount + line.amount_outstanding
                    patronWithExpired.account_lines_ids.push(line.account_line_id)
                }
            }
            //if patron has expired fines, save them
            if (patronWithExpired.amount > 0) {
                expiredFines.push(patronWithExpired)
            }
        }
        catch (error) {
            logger.error({
                message: "Asiakkaan maksujen haku epännistui: " + error.response.data.error,
                status: error.response.status,
                url: error.config.url,
            })
        }
    }
    return expiredFines
}

//runs the script every night at 02:00
cron.schedule('0 2 * * *', () => getPatronsWithFines(`${baseAddress}/patrons`, []))   

module.exports = { isExpired }