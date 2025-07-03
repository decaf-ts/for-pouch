#!/bin/bash -e

echo "Booting clustered"

source .env

DEPLOYMENT_NAME=${COMPOSE_PROJECT_NAME}
IFS=","
COORDINATOR_NODE="0"

OUTER_PORT=$([ -z "$COORDINATOR_HOST" ] && echo "${PORT_BASE}0" || echo "5984")

COORDINATOR_HOST=$([ -z "$COORDINATOR_HOST" ] && echo "127.0.0.1" || echo "$COORDINATOR_HOST")
REPLICA1_HOST=$([ -z "$REPLICA1_HOST" ] && echo "127.0.0.1" || echo "$REPLICA1_HOST")
REPLICA2_HOST=$([ -z "$REPLICA2_HOST" ] && echo "127.0.0.1" || echo "$REPLICA2_HOST")
ADDITIONAL_NODES="1,2"
ALL_NODES="${COORDINATOR_NODE},${ADDITIONAL_NODES}"
HOSTS=("${COORDINATOR_HOST}" "${REPLICA1_HOST}" "${REPLICA2_HOST}")


# check if already running and clustered, and if so, exit
curl -s "http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@${COORDINATOR_HOST}:${OUTER_PORT}/_cluster_setup"
STATUS=$(curl -s "http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@${COORDINATOR_HOST}:${OUTER_PORT}/_cluster_setup")

if [[ "$STATUS" =~ "cluster_finished" ]]; then
  echo "Cluster already set up"
  exit 0
else
  echo "Setting up cluster"
fi

# https://docs.couchdb.org/en/stable/setup/single-node.html

for NODE_ID in $ALL_NODES
do
  PORT=$([ "$OUTER_PORT" == "5984" ] && echo "$OUTER_PORT" || echo "${PORT_BASE}${NODE_ID}")
  curl -X PUT "${COUCHDB_USER}:${COUCHDB_PASSWORD}@${HOSTS[${NODE_ID}]}:${PORT}/_users"
  curl -X PUT "http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@${HOSTS[${NODE_ID}]}:${PORT}/_replicator"
done

