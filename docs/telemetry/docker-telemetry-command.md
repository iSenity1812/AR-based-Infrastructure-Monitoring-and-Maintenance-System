docker ps --format '{{json .}}'
-> container id, name, image, status, ports, created time

docker inspect --format '{{json .State}}' <container_id>
docker inspect --format '{{json .NetworkSettings.Networks}}' <container_id>
docker inspect --format '{{json .Config.Labels}}' <container_id>
docker inspect --format '{{json .NetworkSettings.Ports}}' <container_id>
docker inspect --format '{{.RestartCount}}' <container_id>
docker inspect --format '{{json .HostConfig.RestartPolicy}}' <container_id>
docker inspect --format '{{json .Config.Healthcheck}}' <container_id>
docker inspect --format '{{json .State.Health}}' <container_id>
docker inspect --format '{{json .Mounts}}' <container_id>
docker inspect <container_id> | jq

se co nhung cai can la config.label; state, network

docker stats --no-stream --format '{{json .}}'
-> CPU %, memory, network I/O, block I/O, PIDs

docker logs --tail 50 <container_id>
-> logs gan nhat

docker events

docker top <container_id> -> process
