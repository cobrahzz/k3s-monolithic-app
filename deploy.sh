#!/bin/bash
# Full deploy: provision VMs -> install K3s -> build & deploy app
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Config (must match 02-cluster/terraform.tfvars) ───────────────────────────
SERVER_IP="192.168.1.50"
AGENT_IPS=("192.168.1.60" "192.168.1.61")
SSH_USER="remi"
SSH_KEY="$HOME/.ssh/k3s_ed25519"
# ─────────────────────────────────────────────────────────────────────────────

step() { echo; echo "==> $*"; }

# ── 1. Terraform ──────────────────────────────────────────────────────────────
step "[1/4] Provisioning VMs (Terraform)"
terraform -chdir="$SCRIPT_DIR/02-cluster" init -input=false -upgrade
terraform -chdir="$SCRIPT_DIR/02-cluster" apply -auto-approve -input=false

# ── 2. SSH known_hosts ────────────────────────────────────────────────────────
step "[2/4] Cleaning SSH known_hosts"
ssh-keygen -f "$HOME/.ssh/known_hosts" -R "$SERVER_IP" 2>/dev/null || true
for ip in "${AGENT_IPS[@]}"; do
  ssh-keygen -f "$HOME/.ssh/known_hosts" -R "$ip" 2>/dev/null || true
done

# ── 3. Wait for SSH on all nodes ─────────────────────────────────────────────
wait_ssh() {
  local ip="$1"
  echo "    waiting for $ip..."
  for i in $(seq 1 30); do
    if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 \
           -i "$SSH_KEY" "$SSH_USER@$ip" exit 2>/dev/null; then
      echo "    $ip: SSH ready."
      return 0
    fi
    echo "    $ip: attempt $i/30 — retrying in 10s..."
    sleep 10
  done
  echo "    ERROR: $ip never became reachable." >&2
  return 1
}

step "[3/4] Waiting for SSH on all nodes"
wait_ssh "$SERVER_IP"
for ip in "${AGENT_IPS[@]}"; do
  wait_ssh "$ip"
done

# ── 4. Ansible ────────────────────────────────────────────────────────────────
step "[4/4] Running Ansible playbook"
ANSIBLE_CONFIG="$SCRIPT_DIR/ansible/ansible.cfg" \
  ansible-playbook "$SCRIPT_DIR/ansible/playbook.yml"

echo
echo "----------------------------------------------------------------------"
echo " Deploy complete."
echo " App: http://$SERVER_IP:30080"
echo "----------------------------------------------------------------------"
