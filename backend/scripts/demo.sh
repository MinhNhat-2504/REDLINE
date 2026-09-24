#!/usr/bin/env bash
# Six-beat demo against a running backend (default CHAIN=mock).
# 1 publish agent → 2 create grant → 3 run scripted agent (3 ok + 1 over cap)
# → 4 revoke → 5 agent denied → 6 audit trail.
set -e
API=${API:-http://localhost:8787}
# Defaults are mock values; on Devnet export the DEMO_* lines printed by devnet-setup.
USDC=${DEMO_USDC_MINT:-EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v}
OPS=${DEMO_OPS_DESTINATION:-9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin}
OWNER=${DEMO_OWNER_WALLET:-So11111111111111111111111111111111111111112}
VAULT=${DEMO_VAULT_PDA:-}
COOLDOWN=${DEMO_COOLDOWN_MINUTES:-1}
WAIT=${DEMO_WAIT_SECONDS:-6}

j() { python -c "import sys,json; d=json.load(sys.stdin); print($1)"; }

echo "== 1. publish agent version"
AGENT=$(curl -s -X POST $API/agents -H 'content-type: application/json' -d '{
  "name":"TreasuryOps","version":"v0.1.0","strategy":"Staged rebalance to ops wallet",
  "modelRef":"openai:gpt-5.4-mini","codeRef":"git:redline-runtime@main","config":{"tranche":0.2}}')
AGENT_ID=$(echo "$AGENT" | j "d['agent']['id']")
echo "$AGENT" | j "'agent_hash=' + d['agent']['agentHash']"

echo "== 2. owner signs grant: cap 500 USDC, 5 tx, cooldown 1 min, 12h"
GRANT=$(curl -s -X POST $API/grants -H 'content-type: application/json' -d "{
  \"ownerWallet\":\"$OWNER\",\"agentVersionId\":\"$AGENT_ID\",${VAULT:+\"vaultPda\":\"$VAULT\",}
  \"policy\":{\"agentName\":\"TreasuryOps\",\"strategy\":\"Staged rebalance to ops wallet\",\"tokens\":[\"USDC\"],
    \"spendCapUsdc\":500,\"maxTransactions\":5,\"durationHours\":12,\"cooldownMinutes\":$COOLDOWN,
    \"allowedMints\":[\"$USDC\"],\"allowedDestinations\":[\"$OPS\"]}}")
GRANT_ID=$(echo "$GRANT" | j "d['grant']['id']")
echo "$GRANT" | j "'grant=' + d['grant']['id'] + '  pda=' + d['grant']['grantPda'] + '  policy_hash=' + d['policyHash']"

echo "== 3. start scripted agent (cooldown paced by MOCK_CLOCK_SPEED)"
RUN=$(curl -s -X POST $API/runs -H 'content-type: application/json' -d "{\"grantId\":\"$GRANT_ID\",\"mode\":\"scripted\"}")
sleep $WAIT
curl -s "$API/grants/$GRANT_ID/intents" | python -c "
import sys,json
for i in reversed(json.load(sys.stdin)):
    d=i['decision'] or {}; tx=d.get('chainTx')
    print(f\"  nonce={i['nonce']} amount={int(i['amountUnits'])/1e6:>6.0f} USDC  {d.get('stage','pending'):8} {'ALLOW' if d.get('allow') else 'DENY ':5} {d.get('reasonCode','-'):18} tx={tx['result'] if tx else '-'} sig={tx['signature'][:14]+'…' if tx else '-'}\")"
curl -s "$API/grants/$GRANT_ID" | j "'  on-chain counters: spent=' + str(int(d['onchain']['spentUnits'])/1e6) + ' USDC, txCount=' + str(d['onchain']['transactionCount']) + ', nextNonce=' + str(d['onchain']['nextNonce'])"

echo "== 4. owner revokes"
curl -s -X POST $API/grants/$GRANT_ID/revoke | j "'  revoke sig=' + d['signature'][:14] + '…'"

echo "== 5. agent tries again after revoke (submitted anyway)"
curl -s -X POST $API/intents -H 'content-type: application/json' -d "{\"grantId\":\"$GRANT_ID\",\"mint\":\"$USDC\",\"amountUnits\":\"1000000\",\"destination\":\"$OPS\",\"submitEvenIfDenied\":true}" \
  | j "'  precheck=' + d['precheck']['reasonCode'] + '  onchain=' + str(d['onchainReason']) + '  success=' + str(d['onchainSuccess'])"

echo "== 6. audit trail"
curl -s "$API/audit?grant=$GRANT_ID" | python -c "
import sys,json
for e in json.load(sys.stdin):
    p=e['payload']; extra=p.get('reasonCode') or p.get('status') or ''
    print(f\"  {e['createdAt'][11:23]} {e['actorType']:6} {e['eventType']:18} {extra:20} {(e['chainSignature'] or '')[:12]}\")"
