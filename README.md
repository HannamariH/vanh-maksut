# Script to remove expired fines

Patron fines in Koha expire in three years. This script removes them automatically.

By default, the script is run evety night at 02:00.

For production you'll need an .env file and basic authorization in it's BASIC variable.


## To run
### Either right away
npm start

### Or in Docker
docker buildx build --platform linux/amd64 -t vanh-maksut .

`docker run -d --name vanh-maksut -p <port>:3000 vanh-maksut`

