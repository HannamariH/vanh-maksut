# Vanhentuneiden maksujen poistoskripti

Kohan maksut vanhenevat kolmessa vuodessa. Tällä skriptillä vanhentuneet poistetaan automaattisesti.

Oletuksena skripti ajetaan joka yö klo 02.00.

Tuotantoon tarvitaan .env-tiedosto ja basic authorization muuttujaan BASIC.

## Käyntiin
### Joko suoraan
`npm start`

### Tai Dockerissa
`docker buildx build --platform linux/amd64 -t vanh-maksut .`

`docker run -d --name vanh-maksut -p <port>:3000 vanh-maksut`

