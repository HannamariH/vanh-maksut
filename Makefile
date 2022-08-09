IMAGES := $(shell docker images -f "dangling=true" -q)
CONTAINERS := $(shell docker ps -a -q -f status=exited)
VOLUME := vanh-maksut

clean:
	docker rm -f $(CONTAINERS)
	docker rmi -f $(IMAGES)

build:
	docker buildx build --platform linux/amd64 -t osc.repo.kopla.jyu.fi/hahelle/vanh-maksut:latest .

push:
	docker push osc.repo.kopla.jyu.fi/hahelle/vanh-maksut:latest

pull:
	docker pull osc.repo.kopla.jyu.fi/hahelle/vanh-maksut:latest

start:
	docker run -d --name vanh-maksut \
			-v $(VOLUME):/usr/src/app/logs \
			-p 3009:3000 osc.repo.kopla.jyu.fi/hahelle/vanh-maksut

restart:
	docker stop vanh-maksut
	docker rm vanh-maksut
	$(MAKE) start

bash:
	docker exec -it vanh-maksut bash