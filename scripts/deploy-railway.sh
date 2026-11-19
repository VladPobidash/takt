#!/usr/bin/env bash
# Releases the latest commit of `main` to Railway and waits for the result (ADR 0011).
#
# Railway cannot deploy on push by itself until its GitHub app is given access to this
# repository, so a release is started through the Railway API.
#
#   RAILWAY_API_TOKEN   an account or workspace token. In the project's cloud environment
#                       the network proxy adds the token, so the variable is not needed.
#   RAILWAY_PROJECT     project name   (default: takt)
#   RAILWAY_SERVICE     service name   (default: web)
#   RAILWAY_ENVIRONMENT environment    (default: production)
set -euo pipefail

API="https://backboard.railway.com/graphql/v2"
PROJECT="${RAILWAY_PROJECT:-takt}"
SERVICE="${RAILWAY_SERVICE:-web}"
ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"

# gql '<query>' '<variables as JSON>' → the response body
gql() {
  local body
  body=$(node -e 'console.log(JSON.stringify({ query: process.argv[1], variables: JSON.parse(process.argv[2] || "{}") }))' "$1" "${2:-}")
  curl -sS --fail-with-body --max-time 60 "$API" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${RAILWAY_API_TOKEN:-proxy-injected}" \
    --data "$body"
}

# pick '<javascript expression over d, the response data>' → prints the value, fails on API errors
pick() {
  node -e '
    let text = "";
    process.stdin.on("data", (chunk) => (text += chunk)).on("end", () => {
      const response = JSON.parse(text);
      if (response.errors) {
        console.error(response.errors.map((error) => error.message).join("; "));
        process.exit(1);
      }
      const d = response.data;
      const value = eval(process.argv[1]);
      if (value === undefined || value === null) process.exit(2);
      console.log(value);
    });' "$1"
}

ids=$(gql 'query { projects { edges { node { name id services { edges { node { name id } } } environments { edges { node { name id } } } } } } }' |
  PROJECT="$PROJECT" SERVICE="$SERVICE" ENVIRONMENT="$ENVIRONMENT" pick '
    (() => {
      const project = d.projects.edges.map((e) => e.node).find((p) => p.name === process.env.PROJECT);
      const service = project?.services.edges.map((e) => e.node).find((s) => s.name === process.env.SERVICE);
      const environment = project?.environments.edges.map((e) => e.node).find((x) => x.name === process.env.ENVIRONMENT);
      return service && environment ? `${service.id} ${environment.id}` : null;
    })()') || {
  echo "Railway: project '$PROJECT' with service '$SERVICE' and environment '$ENVIRONMENT' was not found." >&2
  exit 1
}
read -r service_id environment_id <<<"$ids"
variables="{\"service\":\"$service_id\",\"environment\":\"$environment_id\"}"
latest='query($service: String!, $environment: String!) { deployments(first: 1, input: { serviceId: $service, environmentId: $environment }) { edges { node { id status } } } }'

before=$(gql "$latest" "$variables" | pick 'd.deployments.edges[0]?.node.id ?? "none"')
gql 'mutation($service: String!, $environment: String!) { serviceInstanceDeploy(serviceId: $service, environmentId: $environment, latestCommit: true) }' "$variables" | pick 'd.serviceInstanceDeploy' >/dev/null
echo "Railway: deploy of the latest commit started."

for _ in $(seq 1 60); do
  sleep 10
  state=$(gql "$latest" "$variables" | pick '`${d.deployments.edges[0]?.node.id} ${d.deployments.edges[0]?.node.status}`')
  read -r id status <<<"$state"
  [ "$id" = "$before" ] && continue
  case "$status" in
    SUCCESS)
      echo "Railway: released."
      exit 0
      ;;
    FAILED | CRASHED | REMOVED | SKIPPED)
      echo "Railway: the deploy ended as $status." >&2
      exit 1
      ;;
  esac
done
echo "Railway: no result after 10 minutes." >&2
exit 1
