terraform {
  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = ">= 0.7.0"
    }
    local = {
      source = "hashicorp/local"
    }
  }
}

provider "proxmox" {
  endpoint  = var.pm_api_url
  api_token = "${var.pm_token_id}=${var.pm_token_secret}"
  insecure  = true
}

resource "proxmox_virtual_environment_vm" "k3s_server" {
  name      = "k3s-server-1"
  node_name = var.node_name
  vm_id     = 110

  clone {
    vm_id = var.template_vm_id
    full  = true
  }

  cpu {
    cores = 2
    type  = "x86-64-v2-AES"
  }

  memory {
    dedicated = 4096
  }

  disk {
    datastore_id = var.datastore_disks
    interface    = "scsi0"
    size         = 32
  }

  initialization {
    ip_config {
      ipv4 {
        address = var.server_ip
        gateway = var.gateway
      }
    }
    user_account {
      username = var.ci_user
      keys     = [trimspace(var.ssh_pubkey)]
    }
  }

  network_device {
    bridge = var.bridge
  }

  operating_system {
    type = "l26"
  }

  serial_device {}
}

resource "proxmox_virtual_environment_vm" "k3s_agent" {
  count     = length(var.agent_ips)
  name      = "k3s-agent-${count.index + 1}"
  node_name = var.node_name
  vm_id     = 120 + count.index

  clone {
    vm_id = var.template_vm_id
    full  = true
  }

  cpu {
    cores = 2
    type  = "x86-64-v2-AES"
  }

  memory {
    dedicated = 4096
  }

  disk {
    datastore_id = var.datastore_disks
    interface    = "scsi0"
    size         = 32
  }

  initialization {
    ip_config {
      ipv4 {
        address = var.agent_ips[count.index]
        gateway = var.gateway
      }
    }
    user_account {
      username = var.ci_user
      keys     = [trimspace(var.ssh_pubkey)]
    }
  }

  network_device {
    bridge = var.bridge
  }

  operating_system {
    type = "l26"
  }

  serial_device {}
}

resource "local_file" "inventory" {
  filename = "${path.module}/../ansible/inventory.ini"
  content  = <<EOT
[k3s_server]
${split("/", var.server_ip)[0]}

[k3s_agents]
%{ for ip in var.agent_ips ~}
${split("/", ip)[0]}
%{ endfor ~}
EOT
}
