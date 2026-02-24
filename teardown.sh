#!/bin/bash
# Full teardown: delete K8s app -> destroy VMs (Terraform)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Config (must match 02-cluster/terraform.tfvars) ───────────────────────────
SERVER_IP="192.168.1.50"
AGENT_IPS=("192.168.1.60" "192.168.1.61")
SSH_USER="remi"
SSH_KEY="$HOME/.ssh/k3s_ed25519"
# ─────────────────────────────────────────────────────────────────────────────

step() { echo; echo "==> $*"; }

# ── 1. Remove K8s namespace (best-effort: VMs may already be gone) ───────────
step "[1/3] Deleting K8s resources on $SERVER_IP"
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
    -i "$SSH_KEY" "$SSH_USER@$SERVER_IP" \
    "sudo k3s kubectl delete namespace shop --ignore-not-found=true" 2>/dev/null \
  && echo "    Namespace 'shop' deleted." \
  || echo "    Could not reach server — skipping K8s cleanup."

# ── 2. Terraform destroy ──────────────────────────────────────────────────────
step "[2/3] Destroying VMs (Terraform)"
terraform -chdir="$SCRIPT_DIR/02-cluster" destroy -auto-approve -input=false

# ── 3. Local cleanup ──────────────────────────────────────────────────────────
step "[3/3] Cleaning up local state"
ssh-keygen -f "$HOME/.ssh/known_hosts" -R "$SERVER_IP" 2>/dev/null || true
for ip in "${AGENT_IPS[@]}"; do
  ssh-keygen -f "$HOME/.ssh/known_hosts" -R "$ip" 2>/dev/null || true
done
rm -f "$SCRIPT_DIR/ansible/inventory.ini"
rm -f /tmp/shop-app.tar

echo
echo "----------------------------------------------------------------------"
echo " Teardown complete. All VMs destroyed."
echo " To redeploy: bash deploy.sh"
echo "----------------------------------------------------------------------"
