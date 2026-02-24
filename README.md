# K3s Monolithic App

A fully automated lab project that provisions a K3s Kubernetes cluster on Proxmox VMs using Terraform and Ansible, then deploys a monolithic Amazon-like shop application.

## Architecture

```
Proxmox VE
├── k3s-server-1  (192.168.1.50) — control-plane + app pod
├── k3s-agent-1   (192.168.1.60) — worker
└── k3s-agent-2   (192.168.1.61) — worker

App stack
├── Node.js + Express  (backend + static files)
├── better-sqlite3     (embedded DB, persisted on PVC)
└── Vanilla JS         (frontend, no framework)

Kubernetes resources (namespace: shop)
├── Deployment         (replicas: 1, imagePullPolicy: Never)
├── PersistentVolumeClaim (1Gi, local-path)
└── Service            (NodePort 30080)
```

## Prerequisites

| Tool        | Version tested |
|-------------|---------------|
| Proxmox VE  | 8.4           |
| Terraform   | >= 1.5        |
| Ansible     | >= 2.14       |
| Docker      | >= 24         |
| WSL / Linux | —             |

SSH key for the VMs must exist at `~/.ssh/k3s_ed25519`.

## Quick start

```bash
# 1. Copy and fill in your values
cp 01-template/terraform.tfvars.example 01-template/terraform.tfvars
cp 02-cluster/terraform.tfvars.example  02-cluster/terraform.tfvars

# 2. Create the VM template (once)
cd 01-template && terraform init && terraform apply && cd ..

# 3. Deploy everything
bash deploy.sh
```

The script will:
1. `terraform apply` — provision 3 VMs on Proxmox
2. Wait for SSH on all nodes
3. `ansible-playbook` — install K3s, join agents, build image, deploy app

App is then available at **http://192.168.1.50:30080**

## Teardown

```bash
bash teardown.sh
```

Deletes the K8s namespace, destroys all VMs with Terraform, cleans up local state.

## Project structure

```
.
├── 01-template/          # Terraform: download Debian cloud image + create VM template
│   ├── main.tf
│   ├── variables.tf
│   └── terraform.tfvars.example
├── 02-cluster/           # Terraform: clone template into 3 VMs + generate inventory.ini
│   ├── main.tf
│   ├── variables.tf
│   └── terraform.tfvars.example
├── app/                  # Node.js application
│   ├── server.js         # Express API + static file serving
│   ├── db.js             # SQLite schema, seed data, queries
│   ├── package.json
│   ├── Dockerfile
│   └── public/           # Vanilla JS frontend
│       ├── index.html
│       ├── app.js
│       └── style.css
├── ansible/
│   ├── ansible.cfg
│   ├── playbook.yml      # 3 plays: k3s_server → k3s_agent → app_deploy
│   ├── roles/
│   │   ├── k3s_server/   # Install K3s server, expose node token
│   │   ├── k3s_agent/    # Join agents to the cluster
│   │   └── app_deploy/   # Build image, copy tar, import, kubectl apply
│   └── manifests/        # Kubernetes YAML (namespace, pvc, deployment, service)
├── deploy.sh             # Full deploy from scratch
├── teardown.sh           # Full teardown
├── .gitattributes        # Force LF line endings (important for WSL)
└── .gitignore
```

## Manual step-by-step

```bash
cd ansible

# Install K3s on the server
ANSIBLE_CONFIG=$(pwd)/ansible.cfg ansible-playbook playbook.yml --tags k3s_server

# Join the agents
ANSIBLE_CONFIG=$(pwd)/ansible.cfg ansible-playbook playbook.yml --tags k3s_agent

# Build and deploy the app
ANSIBLE_CONFIG=$(pwd)/ansible.cfg ansible-playbook playbook.yml --tags app
```

## App features

- Product grid with 10 items, emoji tiles with gradient backgrounds
- Per-user basket stored server-side in SQLite
- User switcher in the header (Alice / Bob / Charlie / Diana + custom)
- Flying emoji animation on "Add to cart"
- Pay Now clears the basket

## SSH access

```bash
ssh -i ~/.ssh/k3s_ed25519 remi@192.168.1.50   # server
ssh -i ~/.ssh/k3s_ed25519 remi@192.168.1.60   # agent-1
ssh -i ~/.ssh/k3s_ed25519 remi@192.168.1.61   # agent-2
```

Or add the aliases to `~/.ssh/config` and use `ssh k3s-server` etc.

## Useful commands

```bash
# Cluster status
ssh k3s-server "sudo k3s kubectl get nodes"
ssh k3s-server "sudo k3s kubectl get pods -n shop"

# App logs
ssh k3s-server "sudo k3s kubectl logs -n shop deploy/shop-app"

# Redeploy app only (after code changes)
ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook ansible/playbook.yml --tags app

# Proxmox provider requires username/password auth (not API token)
# for the 01-template module (query-url-metadata endpoint restriction)
```

## Known constraints

- `replicas: 1` — SQLite is a single-writer database; horizontal scaling requires migrating to PostgreSQL/MySQL
- `imagePullPolicy: Never` — image is imported directly into K3s containerd; no registry needed for a lab
- Pod is pinned to `k3s-server-1` via `nodeSelector` to co-locate with the PVC and the locally-imported image
